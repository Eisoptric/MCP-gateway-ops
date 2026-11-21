"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { logout } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

export function Header({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userName = useSession().data?.name;

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center border-b border-border bg-background px-3 md:relative md:px-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label={t(menuOpen ? "nav.close" : "nav.menu")}
        aria-expanded={menuOpen}
        className="relative z-10 mr-2 flex size-9 items-center justify-center rounded-md text-foreground hover:bg-foreground/[0.04] md:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
          {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div className="relative z-10 text-[13px] font-medium tracking-[0.18em] text-foreground">
        EISOPTRIC
      </div>
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
        <div className="text-[13px] font-medium tracking-[0.12em] text-foreground">
          {t("nav.panel")}
        </div>
      </div>
      <div className="relative z-10 ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              locale === "en" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={cn(
              locale === "zh" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            中文
          </button>
        </div>
        <div className="flex items-center gap-2 text-[12px] tracking-[0.06em] text-muted-foreground">
          <StatusDot tone="operational" />
          <span className="hidden sm:inline">{userName}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              // Signing out locally must not depend on the API answering.
              await logout().catch(() => undefined);
              queryClient.clear();
              router.replace("/login");
            }}
          >
            {t("login.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
