"use client";

import { useMemo, useState } from "react";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, selectClass, type Column, type TableFilter } from "@/components/ui/data-table";
import { useUsage } from "@/hooks/use-admin";
import type { AdminUsageRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function UsagePage() {
  const { t, tOr } = useI18n();
  const [days, setDays] = useState(30);
  const usage = useUsage(days || undefined);

  const columns = useMemo<Column<AdminUsageRow>[]>(
    () => [
      {
        id: "organization",
        header: t("usage.org"),
        sortValue: (row) => row.organization_name,
        cell: (row) => <span className="font-medium">{row.organization_name}</span>,
      },
      {
        id: "plan",
        header: t("usage.plan"),
        sortValue: (row) => row.plan,
        cell: (row) => (
          <span className="text-[12px] text-muted-foreground">
            {row.kind === "organization" ? t("orgs.team") : t("orgs.personal")}
            {" · "}
            {tOr(`orgs.${row.plan}`, row.plan)}
          </span>
        ),
      },
      {
        id: "runs",
        header: t("usage.runs"),
        align: "right",
        className: "w-[140px]",
        sortValue: (row) => row.runs,
        cell: (row) => <span className="font-mono">{row.runs.toLocaleString()}</span>,
      },
      {
        id: "tools",
        header: t("usage.tools"),
        align: "right",
        className: "w-[140px]",
        sortValue: (row) => row.tool_calls,
        cell: (row) => <span className="font-mono">{row.tool_calls.toLocaleString()}</span>,
      },
    ],
    [t, tOr]
  );

  const filters = useMemo<TableFilter<AdminUsageRow>[]>(
    () => [
      {
        id: "kind",
        label: t("usage.allKinds"),
        options: [
          { value: "personal", label: t("orgs.personal") },
          { value: "organization", label: t("orgs.team") },
        ],
        matches: (row, value) => (row.kind ?? "personal") === value,
      },
    ],
    [t]
  );

  return (
    <QueryGate isPending={usage.isPending && !usage.data} isError={usage.isError && !usage.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("usage.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("usage.subtitle")}</p>

        <div className={`mt-8 ${usage.isPlaceholderData ? "opacity-60" : ""}`}>
          <DataTable
            rows={usage.data ?? []}
            columns={columns}
            rowKey={(row) => row.organization_id}
            rowHref={(row) => `/orgs/${row.organization_id}`}
            searchText={(row) => row.organization_name}
            searchPlaceholder={t("usage.search")}
            filters={filters}
            initialSort={{ id: "runs", direction: "desc" }}
            empty={t("usage.empty")}
            toolbar={
              <select
                aria-label={t("usage.range")}
                value={String(days)}
                onChange={(event) => setDays(Number(event.target.value))}
                className={selectClass}
              >
                <option value="7">{t("usage.last7")}</option>
                <option value="30">{t("usage.last30")}</option>
                <option value="90">{t("usage.last90")}</option>
                <option value="0">{t("usage.allTime")}</option>
              </select>
            }
          />
        </div>
      </div>
    </QueryGate>
  );
}
