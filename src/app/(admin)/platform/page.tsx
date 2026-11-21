"use client";

import type { ReactNode } from "react";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { usePlatform } from "@/hooks/use-admin";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function PlatformPage() {
  const { t, tOr, locale } = useI18n();
  const platform = usePlatform();
  const data = platform.data;

  const set = (value: boolean) => (
    <StatusLabel tone={value ? "active" : "paused"}>{t(value ? "platform.set" : "platform.notSet")}</StatusLabel>
  );

  return (
    <QueryGate isPending={platform.isPending && !data} isError={platform.isError && !data}>
      {data ? (
        <div className="px-4 py-6 md:px-10 md:py-10">
          <h1 className="text-[22px] font-medium tracking-tight">{t("platform.title")}</h1>
          <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{t("platform.subtitle")}</p>

          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <Section title={t("platform.deployment")}>
              <Row label={t("platform.service")} value={<Mono>{data.service}</Mono>} />
              <Row label={t("platform.revision")} value={<Mono>{data.revision}</Mono>} />
              <Row label={t("platform.sessionTtl")} value={t("platform.days", { n: data.session_ttl_days })} />
            </Section>

            <Section title={t("platform.signIn")}>
              <Row label={t("platform.origins")} value={<Mono>{data.cors_origins.join("\n")}</Mono>} />
              <Row label={t("platform.rpId")} value={<Mono>{data.webauthn_rp_id}</Mono>} />
              <Row label="Google" value={set(data.sign_in.google)} />
              <Row label="GitHub" value={set(data.sign_in.github)} />
              <Row label={t("platform.seedEmail")} value={set(data.sign_in.seed_email)} />
            </Section>

            <Section title={t("platform.policyModel")}>
              <Row label={t("platform.status")} value={set(data.policy_model.configured)} />
              <Row label={t("platform.provider")} value={<Mono>{data.policy_model.host || "—"}</Mono>} />
              <Row label={t("platform.model")} value={<Mono>{data.policy_model.model || "—"}</Mono>} />
            </Section>

            <Section title={t("platform.email")}>
              <Row label={t("platform.status")} value={set(data.email.configured)} />
              <Row label={t("platform.fromDomain")} value={<Mono>{data.email.from_domain || "—"}</Mono>} />
            </Section>

            <Section title={t("platform.secrets")}>
              <p className="mb-3 text-[12px] text-muted-foreground">{t("platform.secretsHint")}</p>
              {Object.entries(data.secrets).map(([key, value]) => (
                <Row key={key} label={tOr(`platform.secret_${key}`, key)} value={set(value)} />
              ))}
            </Section>

            <Section title={t("platform.operators")}>
              <p className="mb-3 text-[12px] text-muted-foreground">{t("platform.operatorsHint")}</p>
              {data.admins.map((admin) => (
                <div key={admin.id} className="border-b border-border py-3 text-[13px] last:border-0">
                  <div className="font-medium">{admin.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{admin.email}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {[
                      admin.passkeys ? t("users.passkeyCount", { n: admin.passkeys }) : null,
                      admin.totp_enabled ? t("users.totp") : null,
                      admin.email_mfa ? t("users.emailCode") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("users.noSecondFactor")}
                    {admin.last_sign_in_at ? ` · ${relativeTime(admin.last_sign_in_at, locale)}` : ""}
                  </div>
                </div>
              ))}
            </Section>
          </div>
        </div>
      ) : null}
    </QueryGate>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionLabel className="mb-3">{title}</SectionLabel>
      <div className="border-t border-border">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-[13px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="whitespace-pre-wrap break-all font-mono text-[12px]">{children}</span>;
}
