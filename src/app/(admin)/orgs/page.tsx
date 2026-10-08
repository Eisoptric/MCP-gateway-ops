"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useOnboardOrg, useOrgs } from "@/hooks/use-admin";
import { apiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function statusTone(status: string): StatusTone {
  if (status === "active" || status === "connected" || status === "healthy") return "active";
  if (status === "trial") return "pending";
  return "paused";
}

export default function OrgsPage() {
  const { t } = useI18n();
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

  return (
    <QueryGate isPending={orgs.isPending && !orgs.data} isError={orgs.isError && !orgs.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("orgs.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("orgs.subtitle")}</p>

        <form
          className="mt-10 max-w-[640px] border-t border-border pt-8"
          onSubmit={async (event) => {
            event.preventDefault();
            await onboard.mutateAsync({
              name: form.name.trim(),
              admin_email: form.admin_email.trim(),
              admin_name: form.admin_name.trim(),
              admin_password: form.admin_password,
              admin_title: form.admin_title.trim() || "Admin",
              plan: form.kind === "organization" ? "enterprise" : form.plan,
              kind: form.kind,
            });
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
          <SectionLabel className="mb-3">{t("orgs.title")}</SectionLabel>
          {(orgs.data ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("orgs.empty")}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(orgs.data ?? []).map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/orgs/${org.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_88px_88px_88px] items-center gap-4 py-4 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium">{org.name}</span>
                        <StatusLabel tone={statusTone(org.status)}>
                          {t(`orgs.${org.status}`) === `orgs.${org.status}`
                            ? org.status
                            : t(`orgs.${org.status}`)}
                        </StatusLabel>
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {org.kind === "organization" ? t("orgs.team") : t("orgs.personal")}
                        {" · "}
                        {t(`orgs.${org.plan}`) === `orgs.${org.plan}` ? org.plan : t(`orgs.${org.plan}`)}
                      </div>
                    </div>
                    <span className="text-right font-mono text-[13px] text-muted-foreground">
                      {org.user_count} {t("orgs.users")}
                    </span>
                    <span className="text-right font-mono text-[13px] text-muted-foreground">
                      {org.agent_count} {t("orgs.agents")}
                    </span>
                    <span className="text-right font-mono text-[13px] text-muted-foreground">
                      {org.tool_count} {t("orgs.tools")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </QueryGate>
  );
}
