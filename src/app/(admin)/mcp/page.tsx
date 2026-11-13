"use client";

import { useMemo } from "react";
import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useMcp } from "@/hooks/use-admin";
import type { AdminMcp } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type McpServer = AdminMcp["items"][number];

function isConnected(server: McpServer) {
  return server.status === "connected";
}

export default function McpPage() {
  const { t } = useI18n();
  const mcp = useMcp();
  const data = mcp.data;

  const columns = useMemo<Column<McpServer>[]>(
    () => [
      {
        id: "server",
        header: t("mcp.server"),
        sortValue: (server) => server.name,
        cell: (server) => (
          <div className="min-w-0">
            <div className="font-medium">{server.name}</div>
            {server.error ? (
              <div className="mt-0.5 max-w-[520px] truncate text-[12px] text-destructive" title={server.error}>
                {server.error}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "organization",
        header: t("mcp.organization"),
        sortValue: (server) => server.organization_name,
        cell: (server) => (
          <Link
            href={`/orgs/${server.organization_id}`}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {server.organization_name}
          </Link>
        ),
      },
      {
        id: "tools",
        header: t("mcp.tools"),
        align: "right",
        className: "w-[120px]",
        sortValue: (server) => server.tools,
        cell: (server) => <span className="font-mono">{server.tools}</span>,
      },
      {
        id: "status",
        header: t("mcp.status"),
        className: "w-[140px]",
        sortValue: (server) => (isConnected(server) ? 1 : 0),
        cell: (server) => (
          <StatusLabel tone={isConnected(server) ? "active" : "error"}>
            {isConnected(server) ? t("mcp.connected") : t("mcp.error")}
          </StatusLabel>
        ),
      },
    ],
    [t]
  );

  const filters = useMemo<TableFilter<McpServer>[]>(
    () => [
      {
        id: "status",
        label: t("mcp.allStatuses"),
        options: [
          { value: "connected", label: t("mcp.connected") },
          { value: "error", label: t("mcp.error") },
        ],
        matches: (server, value) => isConnected(server) === (value === "connected"),
      },
    ],
    [t]
  );

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

        <div className="mt-8">
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            rowKey={(server) => server.id}
            searchText={(server) => `${server.name} ${server.organization_name}`}
            searchPlaceholder={t("mcp.search")}
            filters={filters}
            empty={t("mcp.empty")}
          />
        </div>
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
