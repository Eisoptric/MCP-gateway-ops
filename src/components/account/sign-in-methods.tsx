"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  startTotpEnrollment,
  TotpEnrollmentForm,
  type TotpEnrollment,
} from "@/components/account/totp-enrollment";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { sessionQueryKey, useSession } from "@/hooks/use-session";
import {
  addPasskey,
  ApiError,
  apiErrorDetail,
  deletePasskey,
  fetchMfa,
  isReauthRequired,
  reauthenticate,
  type Passkey,
} from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { passkeyDismissed, passkeysSupported } from "@/lib/webauthn";
import { toast } from "@/stores/toast-store";

const mfaQueryKey = ["auth-mfa"] as const;

/**
 * How the signed-in operator proves the second step on this console: an authenticator app,
 * passkeys, or both. The API wants a recent sign-in for every change here, so a change on an
 * older session asks for the password and then carries on.
 */
export function SignInMethods() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const email = useSession().data?.email ?? "";
  const mfa = useQuery({ queryKey: mfaQueryKey, queryFn: fetchMfa });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Passkey | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  // A change the API held back until the password is given again.
  const [held, setHeld] = useState<(() => Promise<void>) | null>(null);

  const passkeys = mfa.data?.passkeys ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: mfaQueryKey });

  async function add() {
    await addPasskey();
    await refresh();
    toast.success(t("passkeys.added"));
  }

  async function remove(passkey: Passkey) {
    await deletePasskey(passkey.id);
    await refresh();
    toast.success(t("passkeys.removed"));
    // If that was the account's only second step, the API now asks for a new one: re-read the
    // session so the console goes to setup instead of failing on every request.
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  }

  async function startTotp() {
    setEnrollment(await startTotpEnrollment());
  }

  /** Runs a change. If the API wants the password first, asks for it and then runs it again. */
  async function run(change: () => Promise<void>) {
    try {
      await change();
    } catch (caught) {
      if (!isReauthRequired(caught)) throw caught;
      setHeld(() => change);
    }
  }

  function report(caught: unknown) {
    toast.error(
      passkeyDismissed(caught) ? t("passkeys.dismissed") : apiErrorDetail(caught, t("common.actionFailed"))
    );
  }

  /** For a button: runs the change with the buttons disabled, and reports a failure. */
  async function press(change: () => Promise<void>) {
    setBusy(true);
    try {
      await run(change);
    } catch (caught) {
      report(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 max-w-lg">
      <SectionLabel className="mb-2">{t("signIn.title")}</SectionLabel>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{t("signIn.lead")}</p>

      <div className="flex items-center justify-between gap-4 border-y border-border py-3 text-[13px]">
        <div className="min-w-0">
          <div className="font-medium">{t("signIn.totp")}</div>
          <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("signIn.totpLead")}</div>
        </div>
        {mfa.data?.totp ? (
          <StatusLabel tone="active" className="shrink-0">
            {t("signIn.totpOn")}
          </StatusLabel>
        ) : (
          <Button
            variant="outline"
            className="shrink-0"
            disabled={busy || !mfa.data}
            onClick={() => press(startTotp)}
          >
            {t("signIn.totpSetup")}
          </Button>
        )}
      </div>

      <div className="mt-6 text-[13px] font-medium">{t("passkeys.title")}</div>
      <p className="mb-3 mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("passkeys.lead")}</p>
      {passkeys.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {mfa.isError ? t("common.actionFailed") : mfa.isPending ? t("common.loading") : t("passkeys.none")}
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center justify-between gap-4 py-3 text-[13px]">
              <span>{t("passkeys.item", { date: formatDay(passkey.created_at, locale) })}</span>
              <Button variant="outline" onClick={() => setRemoving(passkey)}>
                {t("passkeys.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {passkeysSupported() ? (
        <Button className="mt-4" disabled={busy} onClick={() => press(add)}>
          {t("passkeys.add")}
        </Button>
      ) : (
        <p className="mt-4 text-[12px] text-muted-foreground">{t("passkeys.unsupported")}</p>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => (removing ? run(() => remove(removing)) : Promise.resolve())}
        title={t("passkeys.removeTitle")}
        description={t("passkeys.removeBody")}
        confirmLabel={t("passkeys.remove")}
        danger
      />

      <Dialog
        open={Boolean(enrollment)}
        onClose={() => setEnrollment(null)}
        title={t("login.setupTotpTitle")}
        description={t("login.setupScan")}
      >
        {enrollment ? (
          <TotpEnrollmentForm
            enrollment={enrollment}
            onDone={async () => {
              setEnrollment(null);
              await refresh();
              toast.success(t("signIn.totpAdded"));
            }}
            onRestart={(reason) => {
              setEnrollment(null);
              toast.error(reason);
            }}
            onReauth={() => {
              // The key on screen is only confirmed with a recent sign-in; after the password,
              // start again with a new one.
              setEnrollment(null);
              setHeld(() => startTotp);
            }}
          />
        ) : null}
      </Dialog>

      <PasswordDialog
        open={Boolean(held)}
        email={email}
        onClose={() => setHeld(null)}
        onConfirmed={async () => {
          const change = held;
          setHeld(null);
          try {
            await change?.();
          } catch (caught) {
            report(caught);
          }
        }}
      />
    </section>
  );
}

function PasswordDialog({
  open,
  email,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function close() {
    if (pending) return;
    setPassword("");
    setError("");
    onClose();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await reauthenticate(email, password);
    } catch (caught) {
      setPending(false);
      if (caught instanceof ApiError && caught.status === 401) setError(t("passkeys.wrongPassword"));
      else if (caught instanceof ApiError && caught.status === 429) setError(t("login.tooMany"));
      else setError(t("common.actionFailed"));
      return;
    }
    setPending(false);
    setPassword("");
    await onConfirmed();
  }

  return (
    <Dialog open={open} onClose={close} title={t("passkeys.reauthTitle")} description={t("passkeys.reauthBody")}>
      <form onSubmit={onSubmit}>
        <label className="block text-[12px] text-muted-foreground">
          {t("login.password")}
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.working") : t("passkeys.continue")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
