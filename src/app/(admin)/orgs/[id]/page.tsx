"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useCreateMember, useOrg, useResetMemberPassword, useUpdateMember, useUpdateOrg } from "@/hooks/use-admin";
import { apiErrorDetail, type AdminMember } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function tone(status: string): StatusTone {
  if (["active", "connected", "ok", "healthy"].includes(status)) return "active";
  if (["trial", "degraded", "missing"].includes(status)) return "pending";
  return "paused";
}

function isOrgAdmin(member: AdminMember) {
  return member.permissions?.team === "write";
}

export default function OrgDetailPage() {
  const params = useParams<{ id: string }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const { t, locale } = useI18n();
  const org = useOrg(id);
  const update = useUpdateOrg(id);
  const createMember = useCreateMember(id);
  const updateMember = useUpdateMember(id);
  const resetPassword = useResetMemberPassword(id);
  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    password: "",
    title: "Operator",
    role: "operator",
  });
  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetDoneId, setResetDoneId] = useState<string | null>(null);
  const data = org.data;
  const activeAdminCount = data?.members.filter((member) => member.status === "active" && isOrgAdmin(member)).length ?? 0;

  return (
    <QueryGate isPending={org.isPending && !data} isError={org.isError && !data}>
      {!data ? (
        <div className="px-10 py-10 text-[13px] text-muted-foreground">{t("orgs.notFound")}</div>
      ) : (
        <div className="px-10 py-10">
          <Link href="/orgs" className="text-[12px] text-muted-foreground hover:text-foreground">
            {t("orgs.back")}
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <h1 className="text-[22px] font-medium tracking-tight">{data.name}</h1>
            <StatusLabel tone={tone(data.status)}>
              {t(`orgs.${data.status}`) === `orgs.${data.status}` ? data.status : t(`orgs.${data.status}`)}
            </StatusLabel>
          </div>
          <p className="mt-2 font-mono text-[12px] text-muted-foreground">{data.id}</p>

          <div className="mt-8 grid grid-cols-5 gap-6 border-y border-border py-6">
            <Metric label={t("orgs.plan")} value={t(`orgs.${data.plan}`) === `orgs.${data.plan}` ? data.plan : t(`orgs.${data.plan}`)} />
            <Metric label={t("orgs.users")} value={String(data.user_count)} mono />
            <Metric label={t("orgs.agents")} value={String(data.agent_count)} mono />
            <Metric label={t("orgs.connections")} value={String(data.connection_count)} mono />
            <Metric
              label={t("orgs.runtime")}
              value={data.runtime_status}
              status={data.runtime_status}
            />
          </div>

          <section className="mt-10 max-w-[520px]">
            <SectionLabel className="mb-3">{t("orgs.health")}</SectionLabel>
            <div className="font-mono text-[28px] tracking-tight">{data.health.score}%</div>
            <div className="mt-4 space-y-2 text-[13px]">
              {(["runtime", "mcp", "agents", "policies", "database"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{key}</span>
                  <StatusLabel tone={tone(data.health[key])}>{data.health[key]}</StatusLabel>
                </div>
              ))}
            </div>
            {data.health.issues.length > 0 ? (
              <ul className="mt-4 space-y-1 text-[13px] text-muted-foreground">
                {data.health.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="mt-8 flex flex-wrap items-end gap-3">
            <SelectField
              label={t("orgs.changePlan")}
              value={data.plan}
              onChange={(plan) => update.mutate({ plan })}
            >
              <option value="trial">{t("orgs.trial")}</option>
              <option value="starter">{t("orgs.starter")}</option>
              <option value="enterprise">{t("orgs.enterprise")}</option>
            </SelectField>
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  status: data.status === "suspended" ? "active" : "suspended",
                })
              }
            >
              {data.status === "suspended" ? t("orgs.activate") : t("orgs.suspend")}
            </Button>
            <span className="pb-2 text-[12px] text-muted-foreground">
              {t("orgs.created")} {formatDay(data.created_at, locale)}
            </span>
          </div>

          <form
            className="mt-10 max-w-[640px] border-t border-border pt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              await createMember.mutateAsync({
                email: userForm.email.trim(),
                name: userForm.name.trim(),
                password: userForm.password,
                title: userForm.title.trim() || "Operator",
                role: userForm.role,
              });
              setUserForm({
                email: "",
                name: "",
                password: "",
                title: "Operator",
                role: "operator",
              });
            }}
          >
            <SectionLabel>{t("orgs.addUser")}</SectionLabel>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field
                label={t("orgs.userName")}
                value={userForm.name}
                onChange={(value) => setUserForm((current) => ({ ...current, name: value }))}
              />
              <Field
                label={t("orgs.email")}
                type="email"
                value={userForm.email}
                onChange={(value) => setUserForm((current) => ({ ...current, email: value }))}
              />
              <Field
                label={t("orgs.password")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={userForm.password}
                onChange={(value) => setUserForm((current) => ({ ...current, password: value }))}
              />
              <SelectField
                label={t("orgs.role")}
                value={userForm.role}
                onChange={(value) => setUserForm((current) => ({ ...current, role: value }))}
              >
                <option value="admin">{t("orgs.admin")}</option>
                <option value="operator">{t("orgs.operator")}</option>
                <option value="viewer">{t("orgs.viewer")}</option>
              </SelectField>
            </div>
            {createMember.isError ? (
              <p className="mt-3 text-[12px] text-destructive">
                {apiErrorDetail(createMember.error, t("common.apiError"))}
              </p>
            ) : null}
            <Button type="submit" className="mt-4" disabled={createMember.isPending}>
              {createMember.isPending ? t("orgs.adding") : t("orgs.addUser")}
            </Button>
          </form>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.members")}</SectionLabel>
            {data.members.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("orgs.noMembers")}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {data.members.map((member) => {
                  const lastAdmin =
                    member.status === "active" && isOrgAdmin(member) && activeAdminCount <= 1;
                  const resetting = resetMemberId === member.id;
                  return (
                    <li key={member.id} className="py-4">
                      <div className="grid grid-cols-[180px_1fr_120px_100px_auto] items-center gap-4">
                        <span className="text-[13px] font-medium">{member.name}</span>
                        <span className="truncate text-[13px] text-muted-foreground">{member.email}</span>
                        <span className="text-[12px] text-muted-foreground">{t(`orgs.${member.role}`)}</span>
                        <StatusLabel tone={member.status === "active" ? "active" : "paused"}>
                          {t(`orgs.${member.status === "active" ? "active" : "disabled"}`)}
                        </StatusLabel>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={updateMember.isPending || lastAdmin}
                            title={lastAdmin ? t("orgs.lastAdmin") : undefined}
                            onClick={() =>
                              updateMember.mutate({
                                id: member.id,
                                body: {
                                  status: member.status === "active" ? "disabled" : "active",
                                },
                              })
                            }
                          >
                            {member.status === "active" ? t("orgs.disableUser") : t("orgs.enableUser")}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={resetPassword.isPending}
                            onClick={() => {
                              resetPassword.reset();
                              setResetDoneId(null);
                              setNewPassword("");
                              setResetMemberId(resetting ? null : member.id);
                            }}
                          >
                            {resetting ? t("orgs.cancel") : t("orgs.resetPassword")}
                          </Button>
                        </div>
                      </div>
                      {resetting ? (
                        <form
                          className="mt-3 flex max-w-[420px] items-end gap-3"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (newPassword.length < 8) return;
                            try {
                              await resetPassword.mutateAsync({ id: member.id, password: newPassword });
                              setResetMemberId(null);
                              setNewPassword("");
                              setResetDoneId(member.id);
                            } catch {
                              // Error is shown via resetPassword.isError
                            }
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <Field
                              label={t("orgs.newPassword")}
                              type="password"
                              autoComplete="new-password"
                              minLength={8}
                              value={newPassword}
                              onChange={setNewPassword}
                            />
                          </div>
                          <Button type="submit" disabled={resetPassword.isPending}>
                            {resetPassword.isPending ? t("orgs.resettingPassword") : t("orgs.save")}
                          </Button>
                        </form>
                      ) : null}
                      {resetDoneId === member.id ? (
                        <p className="mt-3 text-[12px] text-muted-foreground">{t("orgs.passwordReset")}</p>
                      ) : null}
                      {resetting && resetPassword.isError ? (
                        <p className="mt-3 text-[12px] text-destructive">
                          {apiErrorDetail(resetPassword.error, t("orgs.passwordTooShort"))}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {activeAdminCount <= 1 && data.members.some((member) => member.status === "active") ? (
              <p className="mt-3 text-[12px] text-muted-foreground">{t("orgs.lastAdmin")}</p>
            ) : null}
            {updateMember.isError ? (
              <p className="mt-3 text-[12px] text-destructive">
                {apiErrorDetail(updateMember.error, t("orgs.lastAdmin"))}
              </p>
            ) : null}
          </section>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.agentList")}</SectionLabel>
            <p className="mb-4 max-w-xl text-[13px] text-muted-foreground">{t("orgs.readOnlyAgents")}</p>
            {data.agents.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("orgs.noAgents")}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {data.agents.map((agent) => (
                  <li key={agent.id} className="flex items-center justify-between py-4">
                    <div>
                      <div className="text-[13px] font-medium">{agent.name}</div>
                      <div className="mt-1 font-mono text-[12px] text-muted-foreground">{agent.model}</div>
                    </div>
                    <StatusLabel tone={agent.status === "active" ? "active" : "paused"}>
                      {agent.status}
                    </StatusLabel>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </QueryGate>
  );
}

function Metric({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: string;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {status ? (
        <div className="mt-3">
          <StatusLabel tone={tone(status)}>{value}</StatusLabel>
        </div>
      ) : (
        <div className={`mt-3 text-[22px] tracking-tight ${mono ? "font-mono" : ""}`}>{value}</div>
      )}
    </div>
  );
}
