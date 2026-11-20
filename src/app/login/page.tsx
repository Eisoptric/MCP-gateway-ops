"use client";

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  startTotpEnrollment,
  TotpEnrollmentForm,
  type TotpEnrollment,
} from "@/components/account/totp-enrollment";
import { Button } from "@/components/ui/button";
import { isSignedOut, sessionQueryKey, useSession } from "@/hooks/use-session";
import {
  addPasskey,
  ApiError,
  apiErrorDetail,
  isReauthRequired,
  login,
  logout,
  verifyLogin,
  verifyLoginWithPasskey,
  type AuthUserResponse,
  type LoginStep,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { passkeyDismissed, passkeysSupported } from "@/lib/webauthn";

const inputClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";
const labelClass = "block text-[11px] uppercase tracking-[0.08em] text-muted-foreground";

interface Challenge {
  challenge: string;
  method: "totp" | "email" | null;
  passkey: boolean;
  email: string;
}

/** Only a path inside this console: `next` comes from the URL and must not lead elsewhere. */
function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/overview";
  }
  return next;
}

function detailOf(error: unknown): unknown {
  if (!(error instanceof ApiError)) return undefined;
  try {
    return (JSON.parse(error.message) as { detail?: unknown }).detail;
  } catch {
    return error.message;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginFlow />
    </Suspense>
  );
}

function LoginFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useSession();
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const user = isSignedOut(session.error) ? undefined : session.data;
  const target = safeNext(searchParams.get("next"));
  const ready = Boolean(user?.is_platform_admin && !user.mfa_setup_required);

  useEffect(() => {
    if (ready) router.replace(target);
  }, [ready, target, router]);

  function advance(step: LoginStep, email: string) {
    if (step.step === "code") {
      setChallenge({ challenge: step.challenge, method: step.method, passkey: step.passkey, email });
      return;
    }
    setChallenge(null);
    queryClient.setQueryData(sessionQueryKey, step.user);
  }

  async function signOut() {
    await logout().catch(() => undefined);
    setChallenge(null);
    await queryClient.resetQueries({ queryKey: sessionQueryKey });
  }

  if (ready || (session.isPending && !challenge)) {
    return <div className="min-h-screen bg-background" />;
  }

  if (user && !user.is_platform_admin) {
    return (
      <Shell>
        <NotOperator onSignOut={signOut} />
      </Shell>
    );
  }

  if (user) {
    return (
      <Shell>
        <SetupStep
          onSignOut={signOut}
          onDone={() =>
            queryClient.setQueryData<AuthUserResponse>(sessionQueryKey, { ...user, mfa_setup_required: false })
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {challenge ? (
        <CodeStep
          // An emailed code can leave a passkey or authenticator still to prove: start that step clean.
          key={`${challenge.method}:${challenge.passkey}`}
          challenge={challenge}
          onStep={advance}
          onBack={() => setChallenge(null)}
        />
      ) : (
        <PasswordStep onStep={advance} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <div className="text-[13px] font-medium tracking-[0.18em]">EISOPTRIC</div>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={locale === "en" ? "text-foreground" : "text-muted-foreground"}
          >
            EN
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "text-foreground" : "text-muted-foreground"}
          >
            中文
          </button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <h1 className="text-[22px] font-medium tracking-tight">{title}</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{lead}</p>
    </>
  );
}

function ErrorText({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-3 text-[12px] text-destructive">
      {children}
    </p>
  );
}

function PasswordStep({ onStep }: { onStep: (step: LoginStep, email: string) => void }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      onStep(await login(email, password, locale === "zh" ? "zh-Hant" : "en-US"), email.trim());
    } catch (caught) {
      const detail = detailOf(caught);
      if (!(caught instanceof ApiError)) {
        setError(t("login.failed"));
      } else if (caught.status === 403 && caught.message === "not_admin") {
        setError(t("login.notAdmin"));
      } else if (caught.status === 400 && caught.message === "mfa_unsupported") {
        setError(t("login.mfaUnsupported"));
      } else if (caught.status === 401) {
        const reset = typeof detail === "object" && detail !== null && "migration" in detail;
        setError(t(reset ? "login.resetRequired" : "login.invalid"));
      } else if (caught.status === 429) {
        setError(t("login.tooMany"));
      } else {
        setError(t("common.apiError"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Heading title={t("login.title")} lead={t("login.subtitle")} />
      <label className={`mt-8 ${labelClass}`}>
        {t("login.email")}
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          required
        />
      </label>
      <label className={`mt-4 ${labelClass}`}>
        {t("login.password")}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          required
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="mt-6 w-full" disabled={pending}>
        {pending ? t("login.signingIn") : t("login.submit")}
      </Button>
    </form>
  );
}

function CodeStep({
  challenge,
  onStep,
  onBack,
}: {
  challenge: Challenge;
  onStep: (step: LoginStep, email: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const canUsePasskey = challenge.passkey && passkeysSupported();
  const method = challenge.method;

  async function finish(verify: () => Promise<LoginStep>, refused: string) {
    setError("");
    setPending(true);
    try {
      onStep(await verify(), challenge.email);
    } catch (caught) {
      if (passkeyDismissed(caught)) {
        setError(t("passkeys.dismissed"));
      } else if (caught instanceof ApiError && caught.status === 403 && caught.message === "not_admin") {
        setError(t("login.notAdmin"));
      } else if (caught instanceof ApiError && caught.status === 429) {
        setError(t("login.tooMany"));
      } else if (caught instanceof ApiError && caught.status < 500) {
        setError(refused);
      } else {
        setError(t("common.apiError"));
      }
    } finally {
      setPending(false);
    }
  }

  const passkeyButton = (
    <Button
      variant={method ? "outline" : "default"}
      className="w-full"
      disabled={pending}
      onClick={() => finish(() => verifyLoginWithPasskey(challenge.challenge), t("login.passkeyRefused"))}
    >
      {t("login.usePasskey")}
    </Button>
  );
  const back = (
    <Button variant="ghost" className="mt-2 w-full text-muted-foreground" disabled={pending} onClick={onBack}>
      {t("login.back")}
    </Button>
  );

  if (!method) {
    return (
      <div>
        <Heading
          title={t("login.codeTitle")}
          lead={canUsePasskey ? t("login.passkeyLead") : t("login.mfaUnsupported")}
        />
        <ErrorText>{error}</ErrorText>
        {canUsePasskey ? <div className="mt-6">{passkeyButton}</div> : null}
        {back}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void finish(() => verifyLogin(method, challenge.challenge, code), t("login.codeInvalid"));
      }}
    >
      <Heading
        title={t("login.codeTitle")}
        lead={method === "totp" ? t("login.totpLead") : t("login.emailLead", { email: challenge.email })}
      />
      <label className={`mt-8 ${labelClass}`}>
        {t("login.code")}
        <input
          value={code}
          autoComplete="one-time-code"
          autoFocus
          onChange={(event) => setCode(event.target.value)}
          className={`${inputClass} font-mono tracking-[0.12em]`}
          required
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="mt-6 w-full" disabled={pending}>
        {pending ? t("login.verifying") : t("login.verify")}
      </Button>
      {canUsePasskey ? (
        <>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("login.or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          {passkeyButton}
        </>
      ) : null}
      {back}
    </form>
  );
}

function SetupStep({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => Promise<void> }) {
  const { t } = useI18n();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  // Setup needs a sign-in from the last few minutes. An older session has to sign in again.
  const [stale, setStale] = useState(false);

  async function begin(factor: () => Promise<void>) {
    setError("");
    setPending(true);
    try {
      await factor();
    } catch (caught) {
      if (isReauthRequired(caught)) setStale(true);
      else if (passkeyDismissed(caught)) setError(t("passkeys.dismissed"));
      else setError(apiErrorDetail(caught, t("common.apiError")));
    } finally {
      setPending(false);
    }
  }

  if (stale) {
    return (
      <div>
        <Heading title={t("login.setupTitle")} lead={t("login.setupReauth")} />
        <Button className="mt-6 w-full" onClick={onSignOut}>
          {t("login.signInAgain")}
        </Button>
      </div>
    );
  }

  if (enrollment) {
    return (
      <div>
        <Heading title={t("login.setupTotpTitle")} lead={t("login.setupScan")} />
        <div className="mt-6">
          <TotpEnrollmentForm
            enrollment={enrollment}
            onDone={onDone}
            onReauth={() => setStale(true)}
            onRestart={(reason) => {
              setEnrollment(null);
              setError(reason);
            }}
          />
        </div>
      </div>
    );
  }

  const canUsePasskey = passkeysSupported();
  return (
    <div>
      <Heading title={t("login.setupTitle")} lead={t("login.setupLead")} />
      <ErrorText>{error}</ErrorText>
      {canUsePasskey ? (
        <Button
          className="mt-6 w-full"
          disabled={pending}
          onClick={() =>
            begin(async () => {
              await addPasskey();
              onDone();
            })
          }
        >
          {t("passkeys.add")}
        </Button>
      ) : null}
      <Button
        variant={canUsePasskey ? "outline" : "default"}
        className={canUsePasskey ? "mt-2 w-full" : "mt-6 w-full"}
        disabled={pending}
        onClick={() => begin(async () => setEnrollment(await startTotpEnrollment()))}
      >
        {t("login.setupStart")}
      </Button>
      <Button variant="ghost" className="mt-2 w-full text-muted-foreground" disabled={pending} onClick={onSignOut}>
        {t("login.signOut")}
      </Button>
    </div>
  );
}

function NotOperator({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <div>
      <Heading title={t("login.title")} lead={t("login.notAdmin")} />
      <Button className="mt-6 w-full" onClick={onSignOut}>
        {t("login.signOut")}
      </Button>
    </div>
  );
}
