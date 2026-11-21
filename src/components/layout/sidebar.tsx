"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const items = [
  { href: "/overview", key: "nav.overview" },
  { href: "/orgs", key: "nav.orgs" },
  { href: "/users", key: "nav.users" },
  { href: "/mcp", key: "nav.mcp" },
  { href: "/activity", key: "nav.activity" },
  { href: "/audit", key: "nav.audit" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/overview") return pathname === "/overview";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive(pathname, href) ? "page" : undefined}
      className={cn(
        "flex h-10 items-center rounded-md px-2 text-[14px] transition-colors md:h-8 md:text-[13px]",
        isActive(pathname, href)
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

/** On a desktop the sidebar is always there; on a phone it opens over the page from the header's menu. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("nav.close")}
          onClick={onClose}
          className="fixed inset-0 top-12 z-30 bg-foreground/20 md:hidden"
        />
      ) : null}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-12 z-40 flex w-[240px] flex-col border-r border-border bg-background transition-transform md:static md:w-[196px] md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav aria-label={t("nav.panel")} className="flex flex-1 flex-col px-3 py-5">
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} label={t(item.key)} onNavigate={onClose} />
            ))}
          </div>
          <div className="mt-auto border-t border-border pt-3">
            <NavLink href="/platform" label={t("nav.platform")} onNavigate={onClose} />
          </div>
        </nav>
      </aside>
    </>
  );
}
