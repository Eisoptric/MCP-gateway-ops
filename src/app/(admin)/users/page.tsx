"use client";

import { useMemo } from "react";
import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { StatusLabel } from "@/components/ui/status-dot";
import { useUsers } from "@/hooks/use-admin";
import type { AdminUser } from "@/lib/api";
import { formatDay, relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function UsersPage() {
  const { t, tOr, locale } = useI18n();
  const users = useUsers();

  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      {
        id: "name",
        header: t("users.name"),
        sortValue: (user) => user.name,
        cell: (user) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.name}</span>
              {user.is_platform_admin ? (
                <span className="rounded border border-border px-1.5 py-px text-[11px] text-muted-foreground">
                  {t("users.platformAdmin")}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{user.email}</div>
          </div>
        ),
      },
      {
        id: "organization",
        header: t("users.organization"),
        sortValue: (user) => user.organization_name,
        cell: (user) => (
          <Link href={`/orgs/${user.organization_id}`} className="text-muted-foreground hover:text-foreground hover:underline">
            {user.organization_name}
          </Link>
        ),
      },
      {
        id: "role",
        header: t("users.role"),
        sortValue: (user) => user.role,
        cell: (user) => (
          <span className="text-muted-foreground">
            {user.role ? tOr(`orgs.${user.role}`, user.role) : t("users.noRole")}
          </span>
        ),
      },
      {
        id: "status",
        header: t("users.status"),
        sortValue: (user) => user.status,
        cell: (user) => (
          <StatusLabel tone={user.status === "active" ? "active" : "paused"}>
            {tOr(`orgs.${user.status}`, user.status)}
          </StatusLabel>
        ),
      },
      {
        id: "signIn",
        header: t("users.signIn"),
        sortValue: (user) => user.last_sign_in_at ?? "",
        cell: (user) => {
          const factors = [
            user.passkeys ? t("users.passkeyCount", { n: user.passkeys }) : null,
            user.totp_enabled ? t("users.totp") : null,
            user.email_mfa ? t("users.emailCode") : null,
          ].filter(Boolean);
          return (
            <div className="text-[12px]">
              <div className={factors.length ? "" : "text-warning"}>{factors.join(" · ") || t("users.noSecondFactor")}</div>
              <div className="mt-0.5 text-muted-foreground">
                {user.last_sign_in_at ? relativeTime(user.last_sign_in_at, locale) : t("orgs.never")}
              </div>
            </div>
          );
        },
      },
      {
        id: "created",
        header: t("users.created"),
        align: "right",
        sortValue: (user) => user.created_at,
        cell: (user) => (
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
            {formatDay(user.created_at, locale)}
          </span>
        ),
      },
    ],
    [t, tOr, locale]
  );

  const filters = useMemo<TableFilter<AdminUser>[]>(
    () => [
      {
        id: "role",
        label: t("users.allRoles"),
        options: ["admin", "operator", "viewer"].map((role) => ({ value: role, label: t(`orgs.${role}`) })),
        matches: (user, value) => user.role === value,
      },
      {
        id: "status",
        label: t("users.allStatuses"),
        options: ["active", "disabled"].map((status) => ({ value: status, label: t(`orgs.${status}`) })),
        matches: (user, value) => user.status === value,
      },
      {
        id: "factor",
        label: t("users.allFactors"),
        options: [
          { value: "none", label: t("users.noSecondFactor") },
          { value: "passkey", label: t("users.passkey") },
          { value: "operator", label: t("users.operatorsOnly") },
        ],
        matches: (user, value) =>
          value === "none"
            ? !user.passkeys && !user.totp_enabled && !user.email_mfa
            : value === "passkey"
              ? user.passkeys > 0
              : user.is_platform_admin,
      },
    ],
    [t]
  );

  return (
    <QueryGate isPending={users.isPending && !users.data} isError={users.isError && !users.data}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("users.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("users.subtitle")}</p>

        <div className="mt-8">
          <DataTable
            rows={users.data ?? []}
            columns={columns}
            rowKey={(user) => user.id}
            rowHref={(user) => `/orgs/${user.organization_id}`}
            searchText={(user) => `${user.name} ${user.email} ${user.organization_name}`}
            searchPlaceholder={t("users.search")}
            filters={filters}
            initialSort={{ id: "created", direction: "desc" }}
            empty={t("users.empty")}
          />
        </div>
      </div>
    </QueryGate>
  );
}
