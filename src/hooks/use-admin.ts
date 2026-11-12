"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrgMember,
  fetchAudit,
  fetchAuditEvents,
  fetchConnections,
  fetchMcp,
  fetchOrg,
  fetchOrgs,
  fetchOverview,
  fetchSettings,
  fetchUsage,
  fetchUsers,
  onboardOrg,
  resetOrgMemberPassword,
  updateOrg,
  updateOrgMember,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const overviewQueryKey = ["admin-overview"] as const;
export const orgsQueryKey = ["admin-orgs"] as const;
export const orgQueryKey = (id: string) => ["admin-org", id] as const;
export const usersQueryKey = ["admin-users"] as const;

export function useOverview() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: overviewQueryKey, queryFn: fetchOverview, enabled: Boolean(token) });
}

export function useOrgs() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: orgsQueryKey, queryFn: fetchOrgs, enabled: Boolean(token) });
}

export function useOrg(id: string) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: orgQueryKey(id),
    queryFn: () => fetchOrg(id),
    enabled: Boolean(token && id),
  });
}

export function useConnections() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-connections"], queryFn: fetchConnections, enabled: Boolean(token) });
}

export function useMcp() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-mcp"], queryFn: fetchMcp, enabled: Boolean(token) });
}

export function useUsers() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: usersQueryKey, queryFn: fetchUsers, enabled: Boolean(token) });
}

/** `days` limits usage to the last N days; omit it for all time. */
export function useUsage(days?: number) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["admin-usage", days ?? "all"],
    queryFn: () => fetchUsage(days),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export interface AuditFilters {
  page: number;
  pageSize: number;
  organizationId: string;
  event: string;
  /** Only events from the last N days; 0 means all time. */
  days: number;
}

export function useAudit(filters: AuditFilters) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["admin-audit", filters],
    queryFn: () =>
      fetchAudit({
        limit: filters.pageSize,
        offset: filters.page * filters.pageSize,
        organizationId: filters.organizationId || undefined,
        event: filters.event || undefined,
        since: filters.days
          ? new Date(Date.now() - filters.days * 86_400_000).toISOString()
          : undefined,
      }),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAuditEvents() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-audit-events"], queryFn: fetchAuditEvents, enabled: Boolean(token) });
}

export function useSettings() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettings, enabled: Boolean(token) });
}

export function useOnboardOrg() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: onboardOrg,
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });
}

export function useUpdateOrg(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof updateOrg>[1]) => updateOrg(id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgsQueryKey });
      await client.invalidateQueries({ queryKey: orgQueryKey(id) });
      await client.invalidateQueries({ queryKey: overviewQueryKey });
    },
  });
}

export function useCreateMember(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createOrgMember>[1]) => createOrgMember(orgId, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgQueryKey(orgId) });
      await client.invalidateQueries({ queryKey: orgsQueryKey });
      await client.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}

export function useUpdateMember(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateOrgMember>[2] }) =>
      updateOrgMember(orgId, id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgQueryKey(orgId) });
      await client.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}

export function useResetMemberPassword(orgId: string) {
  return useMutation({
    mutationFn: (id: string) => resetOrgMemberPassword(orgId, id),
  });
}
