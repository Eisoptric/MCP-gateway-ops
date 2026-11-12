"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { sessionQueryKey, useSession } from "@/hooks/use-session";
import {
  addPasskey,
  ApiError,
  apiErrorDetail,
  deletePasskey,
  fetchPasskeys,
  isReauthRequired,
  reauthenticate,
  type Passkey,
} from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { passkeyDismissed, passkeysSupported } from "@/lib/webauthn";
import { toast } from "@/stores/toast-store";

const passkeysQueryKey = ["auth-passkeys"] as const;

/** The signed-in operator's own passkeys for this console: list, add, remove. */
export function PasskeySection() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const email = useSession().data?.email ?? "";
  const passkeys = useQuery({ queryKey: passkeysQueryKey, queryFn: fetchPasskeys });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Passkey | null>(null);
  // A change the API held back until the password is given again.
  const [held, setHeld] = useState<(() => Promise<void>) | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: passkeysQueryKey });

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

  return (
    <section className="mt-10 max-w-lg">
      <SectionLabel className="mb-2">{t("passkeys.title")}</SectionLabel>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{t("passkeys.lead")}</p>

      {(passkeys.data ?? []).length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {passkeys.isError ? t("common.actionFailed") : passkeys.isPending ? t("common.loading") : t("passkeys.none")}
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {(passkeys.data ?? []).map((passkey) => (
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
        <Button
          className="mt-4"
          disabled={adding}
          onClick={async () => {
            setAdding(true);
            try {
              await run(add);
            } catch (caught) {
              report(caught);
            } finally {
              setAdding(false);
            }
          }}
        >
          {adding ? t("common.working") : t("passkeys.add")}
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
