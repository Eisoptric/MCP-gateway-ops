"use client";

import { useMemo } from "react";
import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useRuntimes } from "@/hooks/use-admin";
import type { AdminRuntime } from "@/lib/api";
import { formatHeartbeat } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function tone(status: string): StatusTone {
  return status === "healthy" ? "active" : "disconnected";
}

export default function RuntimesPage() {
  const { t, tOr, locale } = useI18n();
  const runtimes = useRuntimes();
  const rows = useMemo(() => runtimes.data ?? [], [runtimes.data]);

  const columns = useMemo<Column<AdminRuntime>[]>(
    () => [
      {
        id: "runtime",
        header: t("runtimes.runtime"),
        sortValue: (runtime) => runtime.id,
        cell: (runtime) => (
          <Link href={`/runtimes/${runtime.id}`} className="font-mono text-[12px] font-medium hover:underline">
            {runtime.id}
          </Link>
        ),
      },
      {
        id: "organization",
        header: t("runtimes.organization"),
        sortValue: (runtime) => runtime.organization_name,
        cell: (runtime) => <span className="text-muted-foreground">{runtime.organization_name}</span>,
      },
      {
        id: "status",
        header: t("runtimes.status"),
        sortValue: (runtime) => runtime.status,
        cell: (runtime) => (
          <StatusLabel tone={tone(runtime.status)}>{tOr(`runtimes.${runtime.status}`, runtime.status)}</StatusLabel>
        ),
      },
      {
        id: "activeRuns",
        header: t("runtimes.activeRuns"),
        align: "right",
        sortValue: (runtime) => runtime.active_runs,
        cell: (runtime) => <span className="font-mono">{runtime.active_runs}</span>,
      },
      {
        id: "region",
        header: t("runtimes.region"),
        sortValue: (runtime) => runtime.region,
        cell: (runtime) => <span className="text-[12px] text-muted-foreground">{runtime.region}</span>,
      },
      {
        id: "version",
        header: t("runtimes.version"),
        sortValue: (runtime) => runtime.version,
        cell: (runtime) => <span className="font-mono text-[12px] text-muted-foreground">{runtime.version}</span>,
      },
      {
        id: "heartbeat",
        header: t("runtimes.heartbeat"),
        align: "right",
        sortValue: (runtime) => runtime.last_heartbeat_at,
        cell: (runtime) => (
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
            {formatHeartbeat(runtime.last_heartbeat_at, locale)}
          </span>
        ),
      },
    ],
    [t, tOr, locale]
  );

  const filters = useMemo<TableFilter<AdminRuntime>[]>(
    () => [
      {
        id: "status",
        label: t("runtimes.allStatuses"),
        options: [...new Set(rows.map((runtime) => runtime.status))].sort().map((status) => ({
          value: status,
          label: tOr(`runtimes.${status}`, status),
        })),
        matches: (runtime, value) => runtime.status === value,
      },
    ],
    [rows, t, tOr]
  );

  return (
    <QueryGate isPending={runtimes.isPending && !runtimes.data} isError={runtimes.isError && !runtimes.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("runtimes.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("runtimes.subtitle")}</p>

        <div className="mt-8">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(runtime) => runtime.id}
            rowHref={(runtime) => `/runtimes/${runtime.id}`}
            searchText={(runtime) => `${runtime.id} ${runtime.organization_name}`}
            searchPlaceholder={t("runtimes.search")}
            filters={filters}
            empty={t("runtimes.empty")}
          />
        </div>
      </div>
    </QueryGate>
  );
}
