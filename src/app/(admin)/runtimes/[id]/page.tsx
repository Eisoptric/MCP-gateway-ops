"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useRuntimes } from "@/hooks/use-admin";
import { formatHeartbeat } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function RuntimeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const { t, locale } = useI18n();
  const runtimes = useRuntimes();
  const runtime = (runtimes.data ?? []).find((item) => item.id === id);

  return (
    <QueryGate isPending={runtimes.isPending && !runtimes.data} isError={runtimes.isError && !runtimes.data}>
      <div className="px-10 py-10">
        <Link href="/runtimes" className="text-[12px] text-muted-foreground hover:text-foreground">
          {t("runtimes.back")}
        </Link>
        {!runtime ? (
          <p className="mt-6 text-[13px] text-muted-foreground">{t("runtimes.empty")}</p>
        ) : (
          <>
            <h1 className="mt-4 text-[22px] font-medium tracking-tight">
              {runtime.id}
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">{runtime.organization_name}</p>
            <div className="mt-8 grid grid-cols-4 gap-8 border-y border-border py-6">
              <div>
                <SectionLabel>{t("runtimes.activeRuns")}</SectionLabel>
                <div className="mt-3 font-mono text-[22px] tracking-tight">{runtime.active_runs}</div>
              </div>
              <div>
                <SectionLabel>{t("runtimes.agents")}</SectionLabel>
                <div className="mt-3 font-mono text-[22px] tracking-tight">{runtime.agent_count}</div>
              </div>
              <div>
                <SectionLabel>{t("runtimes.heartbeat")}</SectionLabel>
                <div className="mt-3 text-[13px] text-muted-foreground">
                  {formatHeartbeat(runtime.last_heartbeat_at, locale)}
                </div>
              </div>
              <div>
                <SectionLabel>{t("runtimes.lastError")}</SectionLabel>
                <div className="mt-3 text-[13px] text-muted-foreground">
                  {runtime.last_error || t("runtimes.none")}
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-[13px]">
              <Row label={t("runtimes.region")} value={runtime.region} />
              <Row label={t("runtimes.version")} value={runtime.version} />
              <Row
                label={t("runtimes.deployment")}
                value={
                  t(`runtimes.${runtime.deployment_mode}`) === `runtimes.${runtime.deployment_mode}`
                    ? runtime.deployment_mode
                    : t(`runtimes.${runtime.deployment_mode}`)
                }
              />
              <div className="flex items-center justify-between max-w-sm">
                <span className="text-muted-foreground">status</span>
                <StatusLabel tone={runtime.status === "healthy" ? "active" : "disconnected"}>
                  {runtime.status}
                </StatusLabel>
              </div>
            </div>
          </>
        )}
      </div>
    </QueryGate>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex max-w-sm items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
