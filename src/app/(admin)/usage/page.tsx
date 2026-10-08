"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { useUsage } from "@/hooks/use-admin";
import { useI18n } from "@/lib/i18n";

export default function UsagePage() {
  const { t } = useI18n();
  const usage = useUsage();

  return (
    <QueryGate isPending={usage.isPending && !usage.data} isError={usage.isError && !usage.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("usage.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("usage.subtitle")}</p>

        {(usage.data ?? []).length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("usage.empty")}</p>
        ) : (
          <div className="mt-10">
            <div className="grid grid-cols-[minmax(0,1fr)_100px_80px_100px_100px_100px] gap-4 border-b border-border pb-2">
              <SectionLabel>{t("usage.org")}</SectionLabel>
              <SectionLabel>{t("usage.plan")}</SectionLabel>
              <SectionLabel>{t("usage.runs")}</SectionLabel>
              <SectionLabel>{t("usage.tools")}</SectionLabel>
              <SectionLabel>{t("usage.payments")}</SectionLabel>
              <SectionLabel>{t("usage.volume")}</SectionLabel>
            </div>
            <ul className="divide-y divide-border">
              {(usage.data ?? []).map((row) => (
                <li key={row.organization_id}>
                  <Link
                    href={`/orgs/${row.organization_id}`}
                    className="grid grid-cols-[minmax(0,1fr)_100px_80px_100px_100px_100px] items-center gap-4 py-4 hover:bg-muted/40"
                  >
                    <span className="text-[13px] font-medium">{row.organization_name}</span>
                    <span className="text-[12px] text-muted-foreground">
                      {row.kind === "organization" ? t("orgs.team") : t("orgs.personal")}
                      {" · "}
                      {t(`orgs.${row.plan}`) === `orgs.${row.plan}` ? row.plan : t(`orgs.${row.plan}`)}
                    </span>
                    <span className="font-mono text-[13px]">{row.runs}</span>
                    <span className="font-mono text-[13px]">{row.tool_calls}</span>
                    <span className="font-mono text-[13px]">{row.payments}</span>
                    <span className="font-mono text-[13px] text-muted-foreground">{row.payment_volume}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </QueryGate>
  );
}
