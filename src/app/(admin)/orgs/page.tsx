"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { Field, SelectField } from "@/components/ui/field";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useOnboardOrg, useOrgs } from "@/hooks/use-admin";
import { apiErrorDetail, type AdminOrg } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/stores/toast-store";

function statusTone(status: string): StatusTone {
  if (status === "active" || status === "connected" || status === "healthy") return "active";
  if (status === "trial") return "pending";
  return "paused";
}

export default function OrgsPage() {
  const { t, tOr, locale } = useI18n();
  const orgs = useOrgs();
  const onboard = useOnboardOrg();
  const [form, setForm] = useState({
    name: "",
    admin_email: "",
    admin_name: "",
    admin_password: "",
    admin_title: "Admin",
    plan: "enterprise",
    kind: "organization",
  });

  const columns = useMemo<Column<AdminOrg>[]>(
    () => [
      {
        id: "name",
        header: t("orgs.organization"),
        sortValue: (org) => org.name,
        cell: (org) => (
          <Link href={`/orgs/${org.id}`} className="font-medium hover:underline">
            {org.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: t("orgs.status"),
        sortValue: (org) => org.status,
        cell: (org) => (
          <StatusLabel tone={statusTone(org.status)}>{tOr(`orgs.${org.status}`, org.status)}</StatusLabel>
        ),
      },
      {
        id: "plan",
        header: t("orgs.plan"),
        sortValue: (org) => `${org.kind} ${org.plan}`,
        cell: (org) => (
          <span className="text-[12px] text-muted-foreground">
            {org.kind === "organization" ? t("orgs.team") : t("orgs.personal")}
            {" · "}
            {tOr(`orgs.${org.plan}`, org.plan)}
          </span>
        ),
      },
      {
        id: "users",
        header: t("orgs.users"),
        align: "right",
        sortValue: (org) => org.user_count,
        cell: (org) => <span className="font-mono">{org.user_count}</span>,
      },
      {
        id: "agents",
        header: t("orgs.agents"),
        align: "right",
        sortValue: (org) => org.agent_count,
        cell: (org) => <span className="font-mono">{org.agent_count}</span>,
      },
      {
        id: "tools",
        header: t("orgs.tools"),
        align: "right",
        sortValue: (org) => org.tool_count,
        cell: (org) => <span className="font-mono">{org.tool_count}</span>,
      },
      {
        id: "created",
        header: t("orgs.created"),
        align: "right",
        sortValue: (org) => org.created_at,
        cell: (org) => (
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
            {formatDay(org.created_at, locale)}
          </span>
        ),
      },
    ],
    [t, tOr, locale]
  );

  const filters = useMemo<TableFilter<AdminOrg>[]>(
    () => [
      {
        id: "kind",
        label: t("orgs.allKinds"),
        options: [
          { value: "personal", label: t("orgs.personal") },
          { value: "organization", label: t("orgs.team") },
        ],
        matches: (org, value) => (org.kind ?? "personal") === value,
      },
      {
        id: "status",
        label: t("orgs.allStatuses"),
        options: ["active", "trial", "suspended"].map((status) => ({
          value: status,
          label: t(`orgs.${status}`),
        })),
        matches: (org, value) => org.status === value,
      },
    ],
    [t]
  );

  return (
    <QueryGate isPending={orgs.isPending && !orgs.data} isError={orgs.isError && !orgs.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("orgs.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("orgs.subtitle")}</p>

        <form
          className="mt-10 max-w-[640px] border-t border-border pt-8"
          onSubmit={async (event) => {
            event.preventDefault();
            const created = await onboard.mutateAsync({
              name: form.name.trim(),
              admin_email: form.admin_email.trim(),
              admin_name: form.admin_name.trim(),
              admin_password: form.admin_password,
              admin_title: form.admin_title.trim() || "Admin",
              plan: form.kind === "organization" ? "enterprise" : form.plan,
              kind: form.kind,
            });
            toast.success(t("orgs.toastCreated", { name: created.name }));
            setForm({
              name: "",
              admin_email: "",
              admin_name: "",
              admin_password: "",
              admin_title: "Admin",
              plan: "enterprise",
              kind: "organization",
            });
          }}
        >
          <SectionLabel>{t("orgs.onboard")}</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field
              label={t("orgs.name")}
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            />
            <SelectField
              label={t("orgs.kind")}
              value={form.kind}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  kind: value,
                  plan: value === "organization" ? "enterprise" : current.plan === "enterprise" ? "free" : current.plan,
                }))
              }
            >
              <option value="personal">{t("orgs.personal")}</option>
              <option value="organization">{t("orgs.team")}</option>
            </SelectField>
            <SelectField
              label={t("orgs.plan")}
              value={form.kind === "organization" ? "enterprise" : form.plan}
              onChange={(value) => setForm((current) => ({ ...current, plan: value }))}
            >
              {form.kind === "organization" ? (
                <option value="enterprise">{t("orgs.enterprise")}</option>
              ) : (
                <>
                  <option value="free">{t("orgs.free")}</option>
                  <option value="pro">{t("orgs.pro")}</option>
                </>
              )}
            </SelectField>
            <Field
              label={t("orgs.adminName")}
              value={form.admin_name}
              onChange={(value) => setForm((current) => ({ ...current, admin_name: value }))}
            />
            <Field
              label={t("orgs.adminEmail")}
              type="email"
              value={form.admin_email}
              onChange={(value) => setForm((current) => ({ ...current, admin_email: value }))}
            />
            <Field
              label={t("orgs.adminPassword")}
              type="password"
              autoComplete="new-password"
              value={form.admin_password}
              onChange={(value) => setForm((current) => ({ ...current, admin_password: value }))}
            />
          </div>
          {onboard.isError ? (
            <p className="mt-3 text-[12px] text-destructive">
              {apiErrorDetail(onboard.error, t("common.apiError"))}
            </p>
          ) : null}
          <Button type="submit" className="mt-4" disabled={onboard.isPending}>
            {onboard.isPending ? t("orgs.creating") : t("orgs.create")}
          </Button>
        </form>

        <section className="mt-10">
          <DataTable
            rows={orgs.data ?? []}
            columns={columns}
            rowKey={(org) => org.id}
            rowHref={(org) => `/orgs/${org.id}`}
            searchText={(org) => `${org.name} ${org.id}`}
            searchPlaceholder={t("orgs.search")}
            filters={filters}
            initialSort={{ id: "created", direction: "desc" }}
            empty={t("orgs.empty")}
          />
        </section>
      </div>
    </QueryGate>
  );
}
