"use client";

import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useOverview } from "@/hooks/use-admin";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { StatusTone } from "@/components/ui/status-dot";

function serviceTone(status: string): StatusTone {
  if (status === "operational" || status === "connected" || status === "healthy") return "operational";
  if (status === "degraded") return "degraded";
  return "down";
}

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const overview = useOverview();
  const stats = overview.data?.stats;
  const services = overview.data?.services ?? [];
  const events = overview.data?.events ?? [];

  return (
    <QueryGate isPending={overview.isPending && !overview.data} isError={overview.isError && !overview.data}>
      <div className="flex min-h-full">
        <div className="min-w-0 flex-1 px-10 py-10">
          <h1 className="text-[28px] font-medium tracking-tight">{t("overview.title")}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{t("overview.subtitle")}</p>

          <div className="mt-12 grid grid-cols-4 gap-8 border-y border-border py-7">
            <Stat label={t("overview.orgs")} value={String(stats?.organizations ?? 0)} />
            <Stat label={t("overview.users")} value={String(stats?.users ?? 0)} />
            <Stat label={t("overview.agents")} value={String(stats?.agents ?? 0)} />
            <Stat label={t("overview.connections")} value={String(stats?.connections ?? 0)} />
          </div>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("overview.events")}</SectionLabel>
            {events.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("overview.noEvents")}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {events.map((event) => (
                  <li key={event.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 py-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">
                        {event.organization_name || t("audit.system")}
                      </div>
                      <div className="mt-1 truncate text-[13px] text-muted-foreground">
                        {event.event.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {relativeTime(event.created_at, locale)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="w-[280px] shrink-0 border-l border-border px-6 py-10">
          <SectionLabel>{t("overview.system")}</SectionLabel>
          <ul className="mt-5 space-y-3">
            {services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span>{service.name}</span>
                <StatusLabel tone={serviceTone(service.status)}>
                  {t(`overview.${service.status}`) === `overview.${service.status}`
                    ? service.status
                    : t(`overview.${service.status}`)}
                </StatusLabel>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </QueryGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 font-mono text-[28px] leading-none tracking-tight">{value}</div>
    </div>
  );
}
