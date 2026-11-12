"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isSignedOut, useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";

/** Renders the console only for a signed-in platform operator whose authenticator is set up. */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const signedOut = isSignedOut(session.error);
  const user = signedOut ? undefined : session.data;
  // The sign-in page also runs authenticator setup, so an operator without one goes there.
  const needsSignIn = signedOut || Boolean(user?.is_platform_admin && user.mfa_setup_required);

  useEffect(() => {
    if (!needsSignIn) return;
    const next = signedOut && pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [needsSignIn, signedOut, pathname, router]);

  if (needsSignIn || session.isPending) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-[13px] text-muted-foreground">
        {t("common.apiError")}
        <Button variant="outline" disabled={session.isFetching} onClick={() => session.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!user.is_platform_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-[13px] text-muted-foreground">
        {t("common.forbidden")}
      </div>
    );
  }

  return <>{children}</>;
}
