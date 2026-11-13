"use client";

import { useMemo } from "react";
import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useConnections } from "@/hooks/use-admin";
import type { AdminConnectionChannel } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface ChannelRow extends AdminConnectionChannel {
  key: string;
  organization_id: string;
  organization_name: string;
}

function tone(status: string): StatusTone {
  if (["connected", "healthy", "active"].includes(status)) return "active";
  if (status === "degraded") return "degraded";
  if (status === "none") return "paused";
  return "disconnected";
}

function uniqueOptions(values: string[]) {
  return [...new Set(values)].sort().map((value) => ({ value, label: value }));
}

export default function ConnectionsPage() {
  const { t } = useI18n();
  const connections = useConnections();

  const rows = useMemo<ChannelRow[]>(
    () =>
      (connections.data ?? []).flatMap((org) =>
        org.channels.map((channel) => ({
          ...channel,
          key: `${org.organization_id}:${channel.id}`,
          organization_id: org.organization_id,
          organization_name: org.organization_name,
        }))
      ),
    [connections.data]
  );

  const columns = useMemo<Column<ChannelRow>[]>(
    () => [
      {
        id: "organization",
        header: t("connections.organization"),
        sortValue: (row) => row.organization_name,
        cell: (row) => (
          <Link href={`/orgs/${row.organization_id}`} className="font-medium hover:underline">
            {row.organization_name}
          </Link>
        ),
      },
      {
        id: "channel",
        header: t("connections.channel"),
        sortValue: (row) => row.name,
        cell: (row) => row.name,
      },
      {
        id: "status",
        header: t("connections.status"),
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusLabel tone={tone(row.status)}>
            {row.status}
            {row.detail ? ` · ${row.detail}` : ""}
          </StatusLabel>
        ),
      },
    ],
    [t]
  );

  const filters = useMemo<TableFilter<ChannelRow>[]>(
    () => [
      {
        id: "status",
        label: t("connections.allStatuses"),
        options: uniqueOptions(rows.map((row) => row.status)),
        matches: (row, value) => row.status === value,
      },
    ],
    [rows, t]
  );

  return (
    <QueryGate
      isPending={connections.isPending && !connections.data}
      isError={connections.isError && !connections.data}
    >
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("connections.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("connections.subtitle")}</p>

        <div className="mt-8">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.key}
            searchText={(row) => row.organization_name}
            searchPlaceholder={t("connections.search")}
            filters={filters}
            initialSort={{ id: "organization", direction: "asc" }}
            empty={t("connections.empty")}
          />
        </div>
      </div>
    </QueryGate>
  );
}
