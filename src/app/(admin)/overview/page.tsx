"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useOverview } from "@/hooks/use-admin";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const PLAN_ORDER = ["free", "pro", "team", "enterprise"];

function serviceTone(status: string): StatusTone {
  if (status === "operational" || status === "connected" || status === "healthy") return "operational";
  if (status === "degraded") return "degraded";
  return "down";
}

export default function OverviewPage() {
  const { t, tOr, locale } = useI18n();
  const overview = useOverview();
  const stats = overview.data?.stats;
  const services = overview.data?.services ?? [];
  const events = overview.data?.events ?? [];
  const plans = stats?.plans ?? {};

  return (
    <QueryGate isPending={overview.isPending && !overview.data} isError={overview.isError && !overview.data}>
      <div className="flex min-h-full flex-col lg:flex-row">
        <div className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
          <h1 className="text-[24px] font-medium tracking-tight md:text-[28px]">{t("overview.title")}</h1>
          <p className="mt-2 text-[14px] text-muted-foreground md:text-[15px]">{t("overview.subtitle")}</p>

          <SectionLabel className="mt-10 mb-3">{t("overview.accounts")}</SectionLabel>
          <div className="grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-4">
            {PLAN_ORDER.map((plan) => (
              <Stat key={plan} label={tOr(`orgs.${plan}`, plan)} value={plans[plan] ?? 0} href="/orgs" />
            ))}
          </div>

          <SectionLabel className="mt-10 mb-3">{t("overview.last24h")}</SectionLabel>
          <div className="grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-4">
            <Stat label={t("overview.toolCalls")} value={stats?.tool_calls_24h ?? 0} href="/activity" />
            <Stat
              label={t("overview.approvalsPending")}
              value={stats?.approvals_pending ?? 0}
              href="/activity"
              warn={(stats?.approvals_pending ?? 0) > 0}
            />
            <Stat
              label={t("overview.webhookFailures")}
              value={stats?.webhook_failures_24h ?? 0}
              href="/activity"
              warn={(stats?.webhook_failures_24h ?? 0) > 0}
            />
            <Stat
              label={t("overview.mcpErrors")}
              value={stats?.mcp_errors ?? 0}
              href="/mcp"
              warn={(stats?.mcp_errors ?? 0) > 0}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label={t("overview.users")} value={stats?.users ?? 0} href="/users" small />
            <Stat label={t("overview.agents")} value={stats?.agents ?? 0} small />
            <Stat label={t("overview.mcpServers")} value={stats?.connections ?? 0} href="/mcp" small />
            <Stat label={t("overview.orgs")} value={stats?.organizations ?? 0} href="/orgs" small />
          </div>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("overview.events")}</SectionLabel>
            {events.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("overview.noEvents")}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {events.map((event) => (
                  <li key={event.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">
                        {event.organization_name || t("audit.system")}
                      </div>
                      <div className="mt-1 truncate text-[13px] text-muted-foreground">
                        {tOr(`events.${event.event}`, event.event.replaceAll("_", " "))}
                      </div>
                    </div>
                    <div className="text-[12px] text-muted-foreground">{relativeTime(event.created_at, locale)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="shrink-0 border-t border-border px-4 py-6 md:px-10 lg:w-[300px] lg:border-l lg:border-t-0 lg:px-6 lg:py-10">
          <SectionLabel>{t("overview.system")}</SectionLabel>
          <ul className="mt-5 space-y-4">
            {services.map((service) => (
              <li key={service.id} className="text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span>{service.name}</span>
                  <StatusLabel tone={serviceTone(service.status)}>
                    {tOr(`overview.${service.status}`, service.status)}
                  </StatusLabel>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {service.uptime_30d === null
                    ? t("overview.noSamples")
                    : t("overview.uptime", { value: service.uptime_30d.toFixed(service.uptime_30d === 100 ? 0 : 2) })}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </QueryGate>
  );
}

function Stat({
  label,
  value,
  href,
  warn,
  small,
}: {
  label: string;
  value: number;
  href?: string;
  warn?: boolean;
  small?: boolean;
}) {
  const body = (
    <>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={`mt-3 font-mono leading-none tracking-tight ${small ? "text-[20px]" : "text-[28px]"} ${
          warn ? "text-warning" : ""
        }`}
      >
        {value.toLocaleString()}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-md hover:opacity-80">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
