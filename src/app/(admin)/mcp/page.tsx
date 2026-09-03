"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useMcp } from "@/hooks/use-admin";
import { useI18n } from "@/lib/i18n";

export default function McpPage() {
  const { t } = useI18n();
  const mcp = useMcp();
  const data = mcp.data;

  return (
    <QueryGate isPending={mcp.isPending && !data} isError={mcp.isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("mcp.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("mcp.subtitle")}</p>

        <div className="mt-10 grid grid-cols-4 gap-8 border-y border-border py-7">
          <Stat label={t("mcp.servers")} value={String(data?.servers ?? 0)} />
          <Stat label={t("mcp.tools")} value={String(data?.tools ?? 0)} />
          <Stat label={t("mcp.healthy")} value={String(data?.healthy ?? 0)} />
          <Stat label={t("mcp.errors")} value={String(data?.errors ?? 0)} />
        </div>

        {(data?.items ?? []).length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("mcp.empty")}</p>
        ) : (
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {(data?.items ?? []).map((item) => (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_160px_100px] items-center gap-4 py-4">
                <div>
                  <div className="text-[13px] font-medium">{item.name}</div>
                  <Link
                    href={`/orgs/${item.organization_id}`}
                    className="mt-1 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    {item.organization_name}
                  </Link>
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {item.tools} {t("mcp.tools")}
                </span>
                <StatusLabel tone={item.status === "connected" ? "active" : "error"}>
                  {item.status === "connected" ? t("mcp.connected") : t("mcp.error")}
                </StatusLabel>
              </li>
            ))}
          </ul>
        )}
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
