"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, selectClass, type Column } from "@/components/ui/data-table";
import { useAudit, useAuditEvents, useOrgs } from "@/hooks/use-admin";
import type { AdminEvent } from "@/lib/api";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 50;
const NO_FILTERS = { organizationId: "", event: "", days: 0 };

function eventLabel(event: string) {
  return event.replaceAll("_", " ");
}

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(0);
  const audit = useAudit({ ...filters, page, pageSize: PAGE_SIZE });
  const orgs = useOrgs();
  const eventNames = useAuditEvents();

  function update(next: Partial<typeof NO_FILTERS>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(0);
  }

  const columns = useMemo<Column<AdminEvent>[]>(
    () => [
      {
        id: "time",
        header: t("audit.time"),
        className: "w-[120px]",
        cell: (event) => (
          <span
            title={formatDateTime(event.created_at, locale)}
            className="whitespace-nowrap font-mono text-[12px] text-muted-foreground"
          >
            {relativeTime(event.created_at, locale)}
          </span>
        ),
      },
      {
        id: "event",
        header: t("audit.event"),
        cell: (event) => <span className="font-medium">{eventLabel(event.event)}</span>,
      },
      {
        id: "actor",
        header: t("audit.actor"),
        cell: (event) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {event.actor_type === "user" && event.actor_id ? event.actor_id : t("audit.system")}
          </span>
        ),
      },
      {
        id: "result",
        header: t("audit.result"),
        cell: (event) => <span className="text-muted-foreground">{event.result || "—"}</span>,
      },
      {
        id: "organization",
        header: t("audit.organization"),
        align: "right",
        cell: (event) =>
          event.organization_id ? (
            <Link
              href={`/orgs/${event.organization_id}`}
              className="text-[12px] text-muted-foreground hover:text-foreground hover:underline"
            >
              {event.organization_name}
            </Link>
          ) : (
            <span className="text-[12px] text-muted-foreground">{t("audit.system")}</span>
          ),
      },
    ],
    [t, locale]
  );

  const filtered = Boolean(filters.organizationId || filters.event || filters.days);

  return (
    <QueryGate isPending={audit.isPending && !audit.data} isError={audit.isError && !audit.data}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("audit.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("audit.subtitle")}</p>

        <div className="mt-8">
          <DataTable
            rows={audit.data?.items ?? []}
            columns={columns}
            rowKey={(event) => event.id}
            pageSize={PAGE_SIZE}
            empty={t("audit.empty")}
            server={{
              total: audit.data?.total ?? 0,
              page,
              onPageChange: setPage,
              loading: audit.isPlaceholderData,
              filtered,
              onClearFilters: () => update(NO_FILTERS),
            }}
            toolbar={
              <>
                <select
                  aria-label={t("audit.organization")}
                  value={filters.organizationId}
                  onChange={(event) => update({ organizationId: event.target.value })}
                  className={`${selectClass} max-w-[220px]`}
                >
                  <option value="">{t("audit.allOrgs")}</option>
                  {(orgs.data ?? []).map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("audit.event")}
                  value={filters.event}
                  onChange={(event) => update({ event: event.target.value })}
                  className={selectClass}
                >
                  <option value="">{t("audit.allEvents")}</option>
                  {(eventNames.data ?? []).map((name) => (
                    <option key={name} value={name}>
                      {eventLabel(name)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("audit.range")}
                  value={String(filters.days)}
                  onChange={(event) => update({ days: Number(event.target.value) })}
                  className={selectClass}
                >
                  <option value="0">{t("audit.allTime")}</option>
                  <option value="1">{t("audit.last24h")}</option>
                  <option value="7">{t("audit.last7")}</option>
                  <option value="30">{t("audit.last30")}</option>
                </select>
              </>
            }
          />
        </div>
      </div>
    </QueryGate>
  );
}
