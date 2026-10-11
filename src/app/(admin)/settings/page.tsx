"use client";

import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { useSettings } from "@/hooks/use-admin";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const settings = useSettings();
  const data = settings.data;

  return (
    <QueryGate isPending={settings.isPending && !data} isError={settings.isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("settings.subtitle")}</p>

        <section className="mt-10 max-w-lg">
          <SectionLabel className="mb-4">{t("settings.platform")}</SectionLabel>
          <Rows
            items={[
              [t("settings.version"), String(data?.platform.version ?? "")],
              ["org", String(data?.platform.default_org_id ?? "")],
              [t("settings.sessionTtl"), String(data?.platform.session_ttl_days ?? "")],
            ]}
          />
        </section>

        <section className="mt-10 max-w-lg">
          <SectionLabel className="mb-4">{t("settings.security")}</SectionLabel>
          <Rows
            items={[
              [t("settings.authentication"), String(data?.security.authentication ?? "")],
              [t("settings.audit"), String(data?.security.audit ?? "")],
              [t("settings.admins"), String(data?.security.admin_count ?? "")],
            ]}
          />
        </section>

        <section className="mt-10 max-w-lg">
          <SectionLabel className="mb-4">{t("settings.infrastructure")}</SectionLabel>
          <Rows
            items={[
              [t("settings.runtime"), String(data?.infrastructure.runtime ?? "")],
              [t("settings.mcp"), String(data?.infrastructure.mcp ?? "")],
            ]}
          />
        </section>

        <section className="mt-10 max-w-lg">
          <SectionLabel className="mb-4">{t("settings.secrets")}</SectionLabel>
          <ul className="divide-y divide-border border-y border-border">
            {(data?.infrastructure.secrets ?? []).map((secret) => (
              <li key={secret.id} className="flex items-center justify-between py-3 text-[13px]">
                <span className="font-mono">{secret.id}</span>
                <span className="text-muted-foreground">
                  {secret.kind} · {t("settings.configured")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 max-w-lg">
          <SectionLabel className="mb-4">{t("settings.admins")}</SectionLabel>
          <ul className="divide-y divide-border border-y border-border">
            {(data?.admins ?? []).map((admin) => (
              <li key={admin.id} className="py-3">
                <div className="text-[13px] font-medium">{admin.name}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{admin.email}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </QueryGate>
  );
}

function Rows({ items }: { items: [string, string][] }) {
  return (
    <div className="space-y-3 text-[13px]">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{value}</span>
        </div>
      ))}
    </div>
  );
}
