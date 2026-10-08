import { useAuthStore } from "@/lib/auth";

const API_BASE = "/saturn-api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorDetail(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail) return parsed.detail;
  } catch {
    if (error.message && error.message !== "not_admin") return error.message;
  }
  return fallback;
}

export interface AccessPermissions {
  agents: "none" | "read" | "write";
  policies: "none" | "read" | "write";
  approvals: "none" | "read" | "write";
  team: "none" | "read" | "write";
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  is_platform_admin: boolean;
  role: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUserResponse;
}

export interface AdminStats {
  organizations: number;
  users: number;
  agents: number;
  connections: number;
  personal?: number;
  teams?: number;
}

export interface AdminService {
  id: string;
  name: string;
  status: string;
}

export interface AdminEvent {
  id: string;
  event: string;
  actor_type: string;
  actor_id: string | null;
  organization_id: string | null;
  organization_name: string | null;
  result: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminOverview {
  stats: AdminStats;
  services: AdminService[];
  events: AdminEvent[];
}

export interface AdminOrg {
  id: string;
  name: string;
  status: string;
  plan: string;
  kind?: string;
  deployment_mode: string;
  runtime_region: string;
  runtime_version: string;
  created_at: string;
  user_count: number;
  agent_count: number;
  tool_count: number;
  connection_count: number;
  runtime_status: string;
  mcp_status: string;
  last_heartbeat_at: string | null;
}

export interface AdminMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  title: string;
  role: string;
  status: string;
  permissions: AccessPermissions;
  agent_ids: string[];
  mcp_server_ids: string[];
  created_at: string;
}

export interface AdminAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: string;
}

export interface AdminHealth {
  runtime: string;
  mcp: string;
  agents: string;
  policies: string;
  database: string;
  score: number;
  issues: string[];
}

export interface AdminOrgDetail extends AdminOrg {
  members: AdminMember[];
  agents: AdminAgent[];
  health: AdminHealth;
  mcp_servers: { id: string; name: string; status: string; tools: string[] }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: string;
  is_platform_admin: boolean;
  organization_id: string;
  organization_name: string;
  employee_id: string | null;
  title: string | null;
  role: string | null;
  created_at: string;
}

export interface AdminConnectionChannel {
  id: string;
  name: string;
  status: string;
  last_heartbeat_at: string | null;
  version: string | null;
  detail: string | null;
}

export interface AdminOrgConnections {
  organization_id: string;
  organization_name: string;
  channels: AdminConnectionChannel[];
}

export interface AdminRuntime {
  id: string;
  organization_id: string;
  organization_name: string;
  status: string;
  region: string;
  version: string;
  deployment_mode: string;
  active_runs: number;
  agent_count: number;
  last_heartbeat_at: string | null;
  last_error: string | null;
}

export interface AdminMcp {
  servers: number;
  tools: number;
  healthy: number;
  errors: number;
  items: {
    id: string;
    name: string;
    organization_id: string;
    organization_name: string;
    status: string;
    tools: number;
    endpoint: string;
    error: string | null;
  }[];
}

export interface AdminUsageRow {
  organization_id: string;
  organization_name: string;
  plan: string;
  kind?: string;
  runs: number;
  tool_calls: number;
  payments: number;
  payment_volume: string;
}

export interface AdminSettings {
  platform: Record<string, string | number>;
  security: Record<string, string | number>;
  infrastructure: {
    runtime: string;
    mcp: string;
    x402_network: string;
    secrets: { id: string; kind: string; configured: boolean }[];
  };
  admins: AdminUser[];
}

function toSession(token: string, user: AuthUserResponse) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      isPlatformAdmin: user.is_platform_admin,
      role: user.role ?? undefined,
    },
  };
}

async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = useAuthStore.getState().token;
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && auth && path !== "/auth/login") {
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown, auth = true) {
  return request<T>(
    path,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    auth
  );
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function login(email: string, password: string) {
  const result = await post<LoginResponse>("/auth/login", { email, password }, false);
  if (!result.user.is_platform_admin) {
    await request<void>(
      "/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${result.token}` },
      },
      false
    );
    throw new ApiError(403, "not_admin");
  }
  useAuthStore.getState().setSession(toSession(result.token, result.user));
  return result;
}

export async function logout() {
  try {
    await post<void>("/auth/logout");
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function fetchMe() {
  const user = await get<AuthUserResponse>("/auth/me");
  if (!user.is_platform_admin) {
    useAuthStore.getState().clear();
    throw new ApiError(403, "not_admin");
  }
  const token = useAuthStore.getState().token;
  if (token) {
    useAuthStore.getState().setSession(toSession(token, user));
  }
  return user;
}

export const fetchOverview = () => get<AdminOverview>("/admin/overview");
export const fetchStats = () => get<AdminStats>("/admin/stats");
export const fetchOrgs = () => get<AdminOrg[]>("/admin/orgs");
export const fetchOrg = (id: string) => get<AdminOrgDetail>(`/admin/orgs/${id}`);
export const fetchUsers = () => get<AdminUser[]>("/admin/users");
export const fetchConnections = () => get<AdminOrgConnections[]>("/admin/connections");
export const fetchRuntimes = () => get<AdminRuntime[]>("/admin/runtimes");
export const fetchMcp = () => get<AdminMcp>("/admin/mcp");
export const fetchUsage = () => get<AdminUsageRow[]>("/admin/usage");
export const fetchAudit = () => get<AdminEvent[]>("/admin/audit");
export const fetchSettings = () => get<AdminSettings>("/admin/settings");

export function onboardOrg(body: {
  name: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  admin_title?: string;
  plan?: string;
  kind?: string;
}) {
  return post<AdminOrgDetail>("/admin/orgs", body);
}

export function updateOrg(
  id: string,
  body: Partial<{ name: string; status: string; plan: string; deployment_mode: string }>
) {
  return patch<AdminOrg>(`/admin/orgs/${id}`, body);
}

export function createOrgMember(
  orgId: string,
  body: {
    email: string;
    name: string;
    password: string;
    title?: string;
    role?: string;
    status?: string;
  }
) {
  return post<AdminMember>(`/admin/orgs/${orgId}/members`, body);
}

export function updateOrgMember(
  orgId: string,
  employeeId: string,
  body: Partial<{ name: string; title: string; role: string; status: string }>
) {
  return patch<AdminMember>(`/admin/orgs/${orgId}/members/${employeeId}`, body);
}

export function resetOrgMemberPassword(orgId: string, employeeId: string, password: string) {
  return post<AdminMember>(`/admin/orgs/${orgId}/members/${employeeId}/password`, { password });
}
