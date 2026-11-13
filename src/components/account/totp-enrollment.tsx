"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ApiError, beginTotpSetup, confirmTotpSetup, isReauthRequired, type TotpSetup } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const labelClass = "block text-[11px] uppercase tracking-[0.08em] text-muted-foreground";

export interface TotpEnrollment {
  data: TotpSetup;
  qr: string;
}

/** Starts authenticator setup. Each call makes a new key and new backup codes. */
export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  const data = await beginTotpSetup();
  // Drawn in the browser: the key is never sent to another service.
  const qr = await QRCode.toDataURL(data.otpauth_url, { margin: 1, width: 352 });
  return { data, qr };
}

/**
 * The QR code, key and backup codes of a setup in progress, and the code that confirms it.
 * The backup codes are shown only here, so they must be marked as saved before confirming.
 */
export function TotpEnrollmentForm({
  enrollment,
  onDone,
  onRestart,
  onReauth,
}: {
  enrollment: TotpEnrollment;
  onDone: () => void;
  /** The API dropped this setup; it has to be started again. `reason` says why. */
  onRestart: (reason: string) => void;
  /** The sign-in is too old for the API to accept the change. */
  onReauth: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await confirmTotpSetup(code);
      onDone();
    } catch (caught) {
      if (isReauthRequired(caught)) onReauth();
      // After too many wrong codes the API discards the key, so setup starts over.
      else if (caught instanceof ApiError && caught.status === 429) onRestart(t("login.tooMany"));
      else if (caught instanceof ApiError && caught.status === 409) onRestart(t("login.setupRestart"));
      else if (caught instanceof ApiError && caught.status === 400) setError(t("login.codeInvalid"));
      else setError(t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={confirm}>
      <Image
        src={enrollment.qr}
        alt={t("login.setupQr")}
        width={176}
        height={176}
        unoptimized
        className="rounded-md border border-border bg-white"
      />
      <div className={`mt-4 ${labelClass}`}>{t("login.setupKey")}</div>
      <code className="mt-2 block break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-[12px]">
        {enrollment.data.secret}
      </code>

      <div className={`mt-6 ${labelClass}`}>{t("login.setupBackup")}</div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{t("login.setupBackupLead")}</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-[12px]">
        {enrollment.data.backup_codes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
        {t("login.setupSaved")}
      </label>

      <label className={`mt-6 ${labelClass}`}>
        {t("login.setupCode")}
        <input
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          onChange={(event) => setCode(event.target.value)}
          className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-[13px] tracking-[0.12em] text-foreground outline-none focus:border-ring"
          required
        />
      </label>
      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-6 w-full" disabled={pending || !saved}>
        {pending ? t("common.working") : t("login.setupConfirm")}
      </Button>
    </form>
  );
}
