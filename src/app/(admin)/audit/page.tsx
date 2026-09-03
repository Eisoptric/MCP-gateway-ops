"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { useAudit } from "@/hooks/use-admin";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function AuditPage() {
  const { t, locale } = useI18n();
  const audit = useAudit();

  return (
    <QueryGate isPending={audit.isPending && !audit.data} isError={audit.isError && !audit.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("audit.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("audit.subtitle")}</p>

        {(audit.data ?? []).length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("audit.empty")}</p>
        ) : (
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {(audit.data ?? []).map((event) => (
              <li key={event.id} className="grid grid-cols-[88px_minmax(0,1fr)_160px] gap-4 py-4">
                <span className="font-mono text-[12px] text-muted-foreground">
                  {relativeTime(event.created_at, locale)}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{event.event.replaceAll("_", " ")}</div>
                  <div className="mt-1 truncate text-[12px] text-muted-foreground">
                    {event.actor_type === "user" ? event.actor_id : t("audit.system")}
                    {event.result ? ` · ${event.result}` : ""}
                  </div>
                </div>
                {event.organization_id ? (
                  <Link
                    href={`/orgs/${event.organization_id}`}
                    className="justify-self-end text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    {event.organization_name}
                  </Link>
                ) : (
                  <span className="justify-self-end text-[12px] text-muted-foreground">
                    {t("audit.system")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </QueryGate>
  );
}
