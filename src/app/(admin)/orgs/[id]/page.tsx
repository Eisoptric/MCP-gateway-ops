"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type Column, type TableFilter } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, SelectField } from "@/components/ui/field";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useCreateMember, useOrg, useResetMemberPassword, useUpdateMember, useUpdateOrg } from "@/hooks/use-admin";
import {
  apiErrorDetail,
  LOCAL_PASSWORDS,
  PLANS,
  type AdminAgent,
  type AdminMcpServer,
  type AdminMember,
  type AdminPolicy,
  type AdminUser,
} from "@/lib/api";
import { formatDay, relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/stores/toast-store";

/** The change waiting for the operator to confirm. */
type PendingChange =
  | { kind: "status" }
  | { kind: "plan"; plan: string }
  | { kind: "disable"; member: AdminMember }
  | { kind: "reset"; member: AdminMember };

function tone(status: string): StatusTone {
  if (["active", "connected", "ok", "healthy"].includes(status)) return "active";
  if (["trial", "degraded", "missing"].includes(status)) return "pending";
  if (status === "none") return "paused";
  return "disconnected";
}

function isOrgAdmin(member: AdminMember) {
  return member.permissions?.team === "write";
}

export default function OrgDetailPage() {
  const params = useParams<{ id: string }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const { t, tOr, locale } = useI18n();
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
  const [pending, setPending] = useState<PendingChange | null>(null);
  const data = org.data;
  const security = useMemo(() => new Map((data?.users ?? []).map((user) => [user.id, user])), [data?.users]);
  const activeAdminCount = data?.members.filter((member) => member.status === "active" && isOrgAdmin(member)).length ?? 0;
  const { mutate: setMemberStatus, isPending: memberUpdating } = updateMember;

  const memberColumns = useMemo<Column<AdminMember>[]>(
    () => [
      {
        id: "name",
        header: t("orgs.userName"),
        sortValue: (member) => member.name,
        cell: (member) => (
          <div className="min-w-0">
            <div className="font-medium">{member.name}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{member.email}</div>
          </div>
        ),
      },
      {
        id: "role",
        header: t("orgs.role"),
        sortValue: (member) => member.role,
        cell: (member) => (
          <span className="text-muted-foreground">{tOr(`orgs.${member.role}`, member.role)}</span>
        ),
      },
      {
        id: "status",
        header: t("orgs.status"),
        sortValue: (member) => member.status,
        cell: (member) => (
          <StatusLabel tone={member.status === "active" ? "active" : "paused"}>
            {t(`orgs.${member.status === "active" ? "active" : "disabled"}`)}
          </StatusLabel>
        ),
      },
      {
        id: "signIn",
        header: t("users.signIn"),
        sortValue: (member) => security.get(member.user_id)?.last_sign_in_at ?? "",
        cell: (member) => <SignIn user={security.get(member.user_id)} />,
      },
      {
        id: "actions",
        header: t("orgs.actions"),
        align: "right",
        cell: (member) => {
          const lastAdmin = member.status === "active" && isOrgAdmin(member) && activeAdminCount <= 1;
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={memberUpdating || lastAdmin}
                title={lastAdmin ? t("orgs.lastAdmin") : undefined}
                onClick={() => {
                  if (member.status === "active") {
                    setPending({ kind: "disable", member });
                    return;
                  }
                  setMemberStatus(
                    { id: member.id, body: { status: "active" } },
                    {
                      onSuccess: () => toast.success(t("orgs.toastUserEnabled", { name: member.name })),
                      onError: (error) => toast.error(apiErrorDetail(error, t("common.actionFailed"))),
                    }
                  );
                }}
              >
                {member.status === "active" ? t("orgs.disableUser") : t("orgs.enableUser")}
              </Button>
              <Button variant="outline" onClick={() => setPending({ kind: "reset", member })}>
                {t("orgs.resetPassword")}
              </Button>
            </div>
          );
        },
      },
    ],
    [t, tOr, activeAdminCount, memberUpdating, setMemberStatus, security]
  );

  const memberFilters = useMemo<TableFilter<AdminMember>[]>(
    () => [
      {
        id: "role",
        label: t("orgs.allRoles"),
        options: ["admin", "operator", "viewer"].map((role) => ({ value: role, label: t(`orgs.${role}`) })),
        matches: (member, value) => member.role === value,
      },
      {
        id: "status",
        label: t("orgs.allStatuses"),
        options: ["active", "disabled"].map((status) => ({ value: status, label: t(`orgs.${status}`) })),
        matches: (member, value) => (member.status === "active" ? "active" : "disabled") === value,
      },
    ],
    [t]
  );

  const agentColumns = useMemo<Column<AdminAgent>[]>(
    () => [
      {
        id: "name",
        header: t("orgs.agent"),
        sortValue: (agent) => agent.name,
        cell: (agent) => (
          <div className="min-w-0">
            <div className="font-medium">{agent.name}</div>
            {agent.registered_user_email ? (
              <div className="mt-0.5 text-[12px] text-muted-foreground">{agent.registered_user_email}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "client",
        header: t("orgs.client"),
        sortValue: (agent) => agent.origin ?? "",
        cell: (agent) => (
          <span className="text-[12px] text-muted-foreground">
            {agent.origin === "gateway_mcp" ? t("orgs.viaGateway") : agent.origin ?? "—"}
          </span>
        ),
      },
      {
        id: "seen",
        header: t("orgs.lastSeen"),
        align: "right",
        sortValue: (agent) => agent.last_seen_at ?? "",
        cell: (agent) => (
          <StatusLabel tone={agent.connected ? "active" : "paused"}>
            {agent.last_seen_at ? relativeTime(agent.last_seen_at, locale) : t("orgs.never")}
          </StatusLabel>
        ),
      },
    ],
    [t, locale]
  );

  const serverColumns = useMemo<Column<AdminMcpServer>[]>(
    () => [
      {
        id: "name",
        header: t("mcp.server"),
        sortValue: (server) => server.name,
        cell: (server) => (
          <div className="min-w-0">
            <div className="font-medium">{server.name}</div>
            {server.endpoint ? (
              <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{server.endpoint}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "tools",
        header: t("mcp.tools"),
        align: "right",
        sortValue: (server) => server.tools.length,
        cell: (server) => <span className="font-mono">{server.tools.length}</span>,
      },
      {
        id: "status",
        header: t("mcp.status"),
        align: "right",
        sortValue: (server) => server.status,
        cell: (server) => <StatusLabel tone={tone(server.status)}>{tOr(`mcp.${server.status}`, server.status)}</StatusLabel>,
      },
    ],
    [t, tOr]
  );

  const policyColumns = useMemo<Column<AdminPolicy>[]>(
    () => [
      { id: "name", header: t("orgs.policy"), sortValue: (policy) => policy.name, cell: (policy) => <span className="font-medium">{policy.name}</span> },
      {
        id: "version",
        header: t("orgs.version"),
        align: "right",
        sortValue: (policy) => policy.version,
        cell: (policy) => <span className="font-mono">v{policy.version}</span>,
      },
      {
        id: "rules",
        header: t("orgs.rules"),
        align: "right",
        sortValue: (policy) => policy.rule_count,
        cell: (policy) => <span className="font-mono">{policy.rule_count}</span>,
      },
      {
        id: "status",
        header: t("orgs.status"),
        align: "right",
        sortValue: (policy) => policy.status,
        cell: (policy) => <StatusLabel tone={policy.status === "active" ? "active" : "paused"}>{tOr(`orgs.policy_${policy.status}`, policy.status)}</StatusLabel>,
      },
    ],
    [t, tOr]
  );

  const planName = (plan: string) => tOr(`orgs.${plan}`, plan);

  function confirmation(change: PendingChange, name: string, status: string, plan: string) {
    switch (change.kind) {
      case "status": {
        const suspending = status !== "suspended";
        return {
          title: t(suspending ? "orgs.suspendTitle" : "orgs.activateTitle", { name }),
          description: t(suspending ? "orgs.suspendBody" : "orgs.activateBody"),
          confirmLabel: t(suspending ? "orgs.suspend" : "orgs.activate"),
          danger: suspending,
          confirmText: suspending ? name : undefined,
          run: async () => {
            await update.mutateAsync({ status: suspending ? "suspended" : "active" });
            toast.success(t(suspending ? "orgs.toastSuspended" : "orgs.toastActivated", { name }));
          },
        };
      }
      case "plan":
        return {
          title: t("orgs.planTitle", { name }),
          description: t("orgs.planBody", { from: planName(plan), to: planName(change.plan) }),
          confirmLabel: t("orgs.planConfirm"),
          run: async () => {
            await update.mutateAsync({ plan: change.plan });
            toast.success(t("orgs.toastPlan", { name, plan: planName(change.plan) }));
          },
        };
      case "disable":
        return {
          title: t("orgs.disableTitle", { name: change.member.name }),
          description: t("orgs.disableBody", { email: change.member.email }),
          confirmLabel: t("orgs.disableUser"),
          danger: true,
          run: async () => {
            await updateMember.mutateAsync({ id: change.member.id, body: { status: "disabled" } });
            toast.success(t("orgs.toastUserDisabled", { name: change.member.name }));
          },
        };
      case "reset":
        return {
          title: t("orgs.resetTitle", { name: change.member.name }),
          description: t("orgs.resetBody", { email: change.member.email }),
          confirmLabel: t("orgs.resetConfirm"),
          danger: true,
          run: async () => {
            await resetPassword.mutateAsync(change.member.id);
            toast.success(t("orgs.toastReset", { email: change.member.email }));
          },
        };
    }
  }

  const confirm = pending && data ? confirmation(pending, data.name, data.status, data.plan) : null;

  return (
    <QueryGate isPending={org.isPending && !data} isError={org.isError && !data}>
      {!data ? (
        <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-10">{t("orgs.notFound")}</div>
      ) : (
        <div className="px-4 py-6 md:px-10 md:py-10">
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

          <div className="mt-8 grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label={t("orgs.kind")} value={data.kind === "organization" ? t("orgs.team") : t("orgs.personal")} />
            <Metric label={t("orgs.plan")} value={planName(data.plan)} />
            <Metric label={t("orgs.users")} value={String(data.user_count)} mono />
            <Metric label={t("orgs.agents")} value={String(data.agent_count)} mono />
            <Metric
              label={t("orgs.mcpServers")}
              value={data.mcp_error_count ? `${data.connection_count} (${data.mcp_error_count}!)` : String(data.connection_count)}
              mono
            />
            <Metric label={t("orgs.toolCalls30d")} value={data.tool_calls_30d.toLocaleString()} mono />
          </div>

          <section className="mt-10 max-w-[520px]">
            <SectionLabel className="mb-3">{t("orgs.health")}</SectionLabel>
            <div className="font-mono text-[28px] tracking-tight">{data.health.score}%</div>
            <div className="mt-4 space-y-2 text-[13px]">
              {(["mcp", "agents", "policies", "database"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t(`orgs.health_${key}`)}</span>
                  <StatusLabel tone={tone(data.health[key])}>{tOr(`orgs.check_${data.health[key]}`, data.health[key])}</StatusLabel>
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
              onChange={(plan) => {
                if (plan !== data.plan) setPending({ kind: "plan", plan });
              }}
            >
              {[...new Set([...(PLANS[data.kind ?? "personal"] ?? []), data.plan])].map((plan) => (
                <option key={plan} value={plan}>
                  {planName(plan)}
                </option>
              ))}
            </SelectField>
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={() => setPending({ kind: "status" })}
            >
              {data.status === "suspended" ? t("orgs.activate") : t("orgs.suspend")}
            </Button>
            <span className="pb-2 text-[12px] text-muted-foreground">
              {t("orgs.created")} {formatDay(data.created_at, locale)}
            </span>
          </div>

          {data.kind === "personal" ? (
            <p className="mt-10 max-w-xl border-t border-border pt-8 text-[13px] text-muted-foreground">
              {t("orgs.personalMembers")}
            </p>
          ) : (
          <form
            className="mt-10 max-w-[640px] border-t border-border pt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              // A refusal is shown under the form through createMember.error.
              try {
                const added = await createMember.mutateAsync({
                  email: userForm.email.trim(),
                  name: userForm.name.trim(),
                  password: (LOCAL_PASSWORDS && userForm.password) || undefined,
                  title: userForm.title.trim() || "Operator",
                  role: userForm.role,
                });
                toast.success(t("orgs.toastUserAdded", { name: added.name }));
                setUserForm({
                  email: "",
                  name: "",
                  password: "",
                  title: "Operator",
                  role: "operator",
                });
              } catch {
                return;
              }
            }}
          >
            <SectionLabel>{t("orgs.addUser")}</SectionLabel>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              {LOCAL_PASSWORDS ? (
                <Field
                  label={t("orgs.password")}
                  type="password"
                  autoComplete="new-password"
                  required={false}
                  minLength={8}
                  value={userForm.password}
                  onChange={(value) => setUserForm((current) => ({ ...current, password: value }))}
                />
              ) : null}
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
          )}

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.members")}</SectionLabel>
            <DataTable
              rows={data.members}
              columns={memberColumns}
              rowKey={(member) => member.id}
              searchText={(member) => `${member.name} ${member.email}`}
              searchPlaceholder={t("orgs.searchMembers")}
              filters={memberFilters}
              empty={t("orgs.noMembers")}
            />
            {activeAdminCount <= 1 && data.members.some((member) => member.status === "active") ? (
              <p className="mt-3 text-[12px] text-muted-foreground">{t("orgs.lastAdmin")}</p>
            ) : null}
          </section>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.agentList")}</SectionLabel>
            <p className="mb-4 max-w-xl text-[13px] text-muted-foreground">{t("orgs.readOnlyAgents")}</p>
            <DataTable
              rows={data.agents}
              columns={agentColumns}
              rowKey={(agent) => agent.id}
              empty={t("orgs.noAgents")}
            />
          </section>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.mcpServers")}</SectionLabel>
            <DataTable rows={data.mcp_servers} columns={serverColumns} rowKey={(server) => server.id} empty={t("orgs.noServers")} />
            {data.allowed_hosts.length > 0 ? (
              <div className="mt-4 text-[12px] text-muted-foreground">
                {t("orgs.ownHosts")}{" "}
                {data.allowed_hosts.map((host) => (
                  <span key={host.host} className="mr-2 font-mono text-foreground">
                    {host.host}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("orgs.policies")}</SectionLabel>
            <p className="mb-4 text-[12px] text-muted-foreground">{t("orgs.toolSets", { n: data.tool_set_count })}</p>
            <DataTable rows={data.policies} columns={policyColumns} rowKey={(policy) => policy.id} empty={t("orgs.noPolicies")} />
          </section>

          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            <section>
              <SectionLabel className="mb-3">{t("orgs.approvals")}</SectionLabel>
              <Line label={t("orgs.pendingNow")} value={data.approvals.pending} warn={data.approvals.pending > 0} />
              <Line label={t("orgs.approved30d")} value={data.approvals.approved_30d} />
              <Line label={t("orgs.rejected30d")} value={data.approvals.rejected_30d} />
              <Line label={t("orgs.expired30d")} value={data.approvals.expired_30d} warn={data.approvals.expired_30d > 0} />
            </section>
            <section>
              <SectionLabel className="mb-3">{t("orgs.webhooks")}</SectionLabel>
              <Line label={t("orgs.endpoints")} value={`${data.webhooks.enabled} / ${data.webhooks.endpoints}`} />
              <Line label={t("orgs.delivered30d")} value={data.webhooks.delivered_30d} />
              <Line label={t("orgs.failed30d")} value={data.webhooks.failed_30d} warn={data.webhooks.failed_30d > 0} />
              {data.webhooks.last_failure_at ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {t("orgs.lastFailure", { when: relativeTime(data.webhooks.last_failure_at, locale) })}
                  {data.webhooks.last_error ? <span className="block truncate font-mono text-destructive">{data.webhooks.last_error}</span> : null}
                </p>
              ) : null}
            </section>
            <section>
              <SectionLabel className="mb-3">{t("orgs.subscription")}</SectionLabel>
              {data.subscription ? (
                <>
                  <Line label={t("orgs.plan")} value={planName(String(data.subscription.plan ?? data.plan))} />
                  <Line label={t("orgs.billingStatus")} value={tOr(`orgs.billing_${data.subscription.status}`, String(data.subscription.status))} />
                  <Line label={t("orgs.invoices")} value={data.subscription.invoices?.length ?? 0} />
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">—</p>
              )}
            </section>
          </div>

          <ConfirmDialog
            open={Boolean(confirm)}
            onClose={() => setPending(null)}
            onConfirm={confirm?.run ?? (async () => undefined)}
            title={confirm?.title ?? ""}
            description={confirm?.description}
            confirmLabel={confirm?.confirmLabel ?? ""}
            danger={confirm?.danger}
            confirmText={confirm?.confirmText}
          />
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

function Line({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${warn ? "text-warning" : ""}`}>{typeof value === "number" ? value.toLocaleString() : value}</span>
    </div>
  );
}

/** How a person signs in: their second factors, and when they last did. */
function SignIn({ user }: { user: AdminUser | undefined }) {
  const { t, locale } = useI18n();
  if (!user) return <span className="text-muted-foreground">—</span>;
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
}
