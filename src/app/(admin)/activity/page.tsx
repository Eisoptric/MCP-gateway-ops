"use client";

import { useMemo, useState } from "react";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, selectClass, type Column, type TableFilter } from "@/components/ui/data-table";
import { SectionLabel } from "@/components/ui/section-label";
import { useActivity } from "@/hooks/use-admin";
import type { AdminActivityRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function count(value: number) {
  return <span className="font-mono">{value.toLocaleString()}</span>;
}

export default function ActivityPage() {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const activity = useActivity(days);
  const rows = useMemo(() => activity.data?.rows ?? [], [activity.data]);
  const daily = useMemo(() => activity.data?.daily ?? [], [activity.data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          tool_calls: sum.tool_calls + row.tool_calls,
          approval_required: sum.approval_required + row.approval_required,
          denied: sum.denied + row.denied,
          webhooks_failed: sum.webhooks_failed + row.webhooks_failed,
        }),
        { tool_calls: 0, approval_required: 0, denied: 0, webhooks_failed: 0 }
      ),
    [rows]
  );
  const peak = Math.max(1, ...daily.map((day) => day.tool_calls));

  const columns = useMemo<Column<AdminActivityRow>[]>(
    () => [
      {
        id: "organization",
        header: t("activity.org"),
        sortValue: (row) => row.organization_name,
        cell: (row) => (
          <div className="min-w-0">
            <div className="font-medium">{row.organization_name}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {row.kind === "organization" ? t("orgs.team") : t("orgs.personal")}
            </div>
          </div>
        ),
      },
      { id: "calls", header: t("activity.toolCalls"), align: "right", sortValue: (row) => row.tool_calls, cell: (row) => count(row.tool_calls) },
      { id: "allowed", header: t("activity.allowed"), align: "right", sortValue: (row) => row.allowed, cell: (row) => count(row.allowed) },
      {
        id: "approval",
        header: t("activity.approvalRequired"),
        align: "right",
        sortValue: (row) => row.approval_required,
        cell: (row) => count(row.approval_required),
      },
      { id: "denied", header: t("activity.denied"), align: "right", sortValue: (row) => row.denied, cell: (row) => count(row.denied) },
      {
        id: "approvals",
        header: t("activity.approvals"),
        align: "right",
        sortValue: (row) => row.approvals_approved + row.approvals_rejected + row.approvals_expired,
        cell: (row) => (
          <span className="font-mono text-[12px]" title={t("activity.approvalsHint")}>
            {row.approvals_approved} / {row.approvals_rejected} / {row.approvals_expired}
          </span>
        ),
      },
      {
        id: "webhooks",
        header: t("activity.webhooks"),
        align: "right",
        sortValue: (row) => row.webhooks_failed,
        cell: (row) => (
          <span className={`font-mono text-[12px] ${row.webhooks_failed ? "text-destructive" : ""}`}>
            {row.webhooks_delivered} / {row.webhooks_failed}
          </span>
        ),
      },
    ],
    [t]
  );

  const filters = useMemo<TableFilter<AdminActivityRow>[]>(
    () => [
      {
        id: "active",
        label: t("activity.allAccounts"),
        options: [{ value: "active", label: t("activity.onlyActive") }],
        matches: (row) => row.tool_calls > 0 || row.webhooks_delivered + row.webhooks_failed > 0,
      },
      {
        id: "kind",
        label: t("activity.allKinds"),
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
    <QueryGate isPending={activity.isPending && !activity.data} isError={activity.isError && !activity.data}>
      <div className={`px-4 py-6 md:px-10 md:py-10 ${activity.isPlaceholderData ? "opacity-60" : ""}`}>
        <h1 className="text-[22px] font-medium tracking-tight">{t("activity.title")}</h1>
        <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{t("activity.subtitle")}</p>

        <div className="mt-8 grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-4">
          <Total label={t("activity.toolCalls")} value={totals.tool_calls} />
          <Total label={t("activity.approvalRequired")} value={totals.approval_required} />
          <Total label={t("activity.denied")} value={totals.denied} />
          <Total label={t("activity.webhookFailures")} value={totals.webhooks_failed} warn={totals.webhooks_failed > 0} />
        </div>

        <section className="mt-8">
          <SectionLabel className="mb-3">{t("activity.perDay")}</SectionLabel>
          {daily.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("activity.noCalls")}</p>
          ) : (
            <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={t("activity.perDay")}>
              {daily.map((day) => (
                <div
                  key={day.day}
                  className="flex h-full min-w-[4px] flex-1 flex-col justify-end"
                  title={t("activity.dayHint", {
                    day: day.day,
                    calls: day.tool_calls,
                    approval: day.approval_required,
                    denied: day.denied,
                  })}
                >
                  <div className="bg-destructive/70" style={{ height: `${(day.denied / peak) * 100}%` }} />
                  <div className="bg-warning/70" style={{ height: `${(day.approval_required / peak) * 100}%` }} />
                  <div
                    className="bg-foreground/25"
                    style={{ height: `${((day.tool_calls - day.denied - day.approval_required) / peak) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.organization_id}
            rowHref={(row) => `/orgs/${row.organization_id}`}
            searchText={(row) => row.organization_name}
            searchPlaceholder={t("activity.search")}
            filters={filters}
            initialSort={{ id: "calls", direction: "desc" }}
            empty={t("activity.empty")}
            toolbar={
              <select
                aria-label={t("activity.range")}
                value={String(days)}
                onChange={(event) => setDays(Number(event.target.value))}
                className={selectClass}
              >
                <option value="7">{t("activity.last7")}</option>
                <option value="30">{t("activity.last30")}</option>
                <option value="90">{t("activity.last90")}</option>
                <option value="365">{t("activity.last365")}</option>
              </select>
            }
          />
        </div>
      </div>
    </QueryGate>
  );
}

function Total({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className={`mt-3 font-mono text-[24px] leading-none tracking-tight ${warn ? "text-destructive" : ""}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
