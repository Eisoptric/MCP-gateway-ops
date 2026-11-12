"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const items = [
  { href: "/overview", key: "nav.overview" },
  { href: "/orgs", key: "nav.orgs" },
  { href: "/users", key: "nav.users" },
  { href: "/connections", key: "nav.connections" },
  { href: "/runtimes", key: "nav.runtimes" },
  { href: "/mcp", key: "nav.mcp" },
  { href: "/usage", key: "nav.usage" },
  { href: "/audit", key: "nav.audit" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/overview") return pathname === "/overview";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="flex w-[196px] shrink-0 flex-col border-r border-border bg-background">
      <nav className="flex flex-1 flex-col px-3 py-5">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 items-center rounded-md px-2 text-[13px] transition-colors",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto border-t border-border pt-3">
          <Link
            href="/settings"
            className={cn(
              "flex h-8 items-center rounded-md px-2 text-[13px] transition-colors",
              isActive(pathname, "/settings")
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            {t("nav.settings")}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
