"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrgMember,
  fetchActivity,
  fetchAudit,
  fetchAuditEvents,
  fetchMcp,
  fetchOrg,
  fetchOrgs,
  fetchOverview,
  fetchPlatform,
  fetchUsers,
  onboardOrg,
  resetOrgMemberPassword,
  updateOrg,
  updateOrgMember,
} from "@/lib/api";

export const overviewQueryKey = ["admin-overview"] as const;
export const orgsQueryKey = ["admin-orgs"] as const;
export const orgQueryKey = (id: string) => ["admin-org", id] as const;
export const usersQueryKey = ["admin-users"] as const;

export function useOverview() {
  return useQuery({ queryKey: overviewQueryKey, queryFn: fetchOverview });
}

export function useOrgs() {
  return useQuery({ queryKey: orgsQueryKey, queryFn: fetchOrgs });
}

export function useOrg(id: string) {
  return useQuery({
    queryKey: orgQueryKey(id),
    queryFn: () => fetchOrg(id),
    enabled: Boolean(id),
  });
}

export function useMcp() {
  return useQuery({ queryKey: ["admin-mcp"], queryFn: fetchMcp });
}

export function useUsers() {
  return useQuery({ queryKey: usersQueryKey, queryFn: fetchUsers });
}

/** Tool calls, policy decisions, approvals and webhooks over the last `days` days. */
export function useActivity(days: number) {
  return useQuery({
    queryKey: ["admin-activity", days],
    queryFn: () => fetchActivity(days),
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
    placeholderData: keepPreviousData,
  });
}

export function useAuditEvents() {
  return useQuery({ queryKey: ["admin-audit-events"], queryFn: fetchAuditEvents });
}

export function usePlatform() {
  return useQuery({ queryKey: ["admin-platform"], queryFn: fetchPlatform });
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
