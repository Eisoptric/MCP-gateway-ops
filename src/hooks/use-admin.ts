"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrgMember,
  fetchAudit,
  fetchConnections,
  fetchMcp,
  fetchOrg,
  fetchOrgs,
  fetchOverview,
  fetchRuntimes,
  fetchSettings,
  fetchUsage,
  onboardOrg,
  resetOrgMemberPassword,
  updateOrg,
  updateOrgMember,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const overviewQueryKey = ["admin-overview"] as const;
export const orgsQueryKey = ["admin-orgs"] as const;
export const orgQueryKey = (id: string) => ["admin-org", id] as const;

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

export function useRuntimes() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-runtimes"], queryFn: fetchRuntimes, enabled: Boolean(token) });
}

export function useMcp() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-mcp"], queryFn: fetchMcp, enabled: Boolean(token) });
}

export function useUsage() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-usage"], queryFn: fetchUsage, enabled: Boolean(token) });
}

export function useAudit() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: ["admin-audit"], queryFn: fetchAudit, enabled: Boolean(token) });
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
    },
  });
}

export function useResetMemberPassword(orgId: string) {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetOrgMemberPassword(orgId, id, password),
  });
}
