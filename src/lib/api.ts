import { loginVerifiers } from "@/lib/login-verifier";
import {
  createPasskey,
  getPasskey,
  type PasskeyCreationOptions,
  type PasskeyRequestOptions,
} from "@/lib/webauthn";

const API_BASE = "/gateway-api";

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
  /** The account has no authenticator app yet. The API refuses an operator everything until it does. */
  mfa_setup_required: boolean;
}

interface LoginResponse {
  user: AuthUserResponse | null;
  mfa_required: boolean;
  challenge: string | null;
  methods: string[];
}

/** Where a sign-in stands: finished, or waiting for the second factor. */
export type LoginStep =
  | { step: "done"; user: AuthUserResponse }
  | {
      step: "code";
      challenge: string;
      /** The code this account can type, if any. */
      method: "totp" | "email" | null;
      /** The account has a passkey it can use instead. */
      passkey: boolean;
    };

export interface Passkey {
  id: string;
  created_at: string;
}

export interface TotpSetup {
  secret: string;
  otpauth_url: string;
  backup_codes: string[];
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
  detail: string | null;
}

export interface AdminOrgConnections {
  organization_id: string;
  organization_name: string;
  channels: AdminConnectionChannel[];
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
}

export interface AdminSettings {
  platform: Record<string, string | number>;
  security: Record<string, string | number>;
  infrastructure: {
    runtime: string;
    mcp: string;
    secrets: { id: string; kind: string; configured: boolean }[];
  };
  admins: AdminUser[];
}

// The session is an HttpOnly cookie the API sets at sign-in. The browser sends it with every
// same-origin request, so nothing here stores or attaches a token.
async function send(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }

  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function get<T>(path: string) {
  return request<T>(path);
}

const PAGE_LIMIT = 500;

/** Reads a paged list endpoint to the end, so a long list is never silently cut short. */
async function getAll<T>(path: string) {
  const rows: T[] = [];
  for (;;) {
    const page = await get<T[]>(`${path}?limit=${PAGE_LIMIT}&offset=${rows.length}`);
    rows.push(...page);
    if (page.length < PAGE_LIMIT) return rows;
  }
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

async function loginStep(result: LoginResponse): Promise<LoginStep> {
  if (result.mfa_required && result.challenge) {
    const method = (["totp", "email"] as const).find((item) => result.methods.includes(item)) ?? null;
    const passkey = result.methods.includes("passkey");
    if (!method && !passkey) throw new ApiError(400, "mfa_unsupported");
    return { step: "code", challenge: result.challenge, method, passkey };
  }
  if (!result.user) throw new ApiError(401, "Invalid email or password");
  if (!result.user.is_platform_admin) {
    await logout();
    throw new ApiError(403, "not_admin");
  }
  return { step: "done", user: result.user };
}

function migrationHint(error: ApiError) {
  try {
    const detail = (JSON.parse(error.message) as { detail?: { migration?: unknown } }).detail;
    return typeof detail === "object" && detail !== null ? detail.migration : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Signs in with the password hashed here (v2), so the API never receives anything cheap to
 * guess from. An account stored under an older form has to prove that form once, and the API
 * then moves it to v2:
 *
 * - The API asks a PBKDF2 account for v1, then for the password itself.
 * - It cannot tell that an Argon2 hash covers v1 (the seeded operator's does), so a plain
 *   refusal is retried once with v1. A wrong password therefore counts as two failed attempts.
 */
export async function login(email: string, password: string, locale: string): Promise<LoginStep> {
  const normalized = email.trim().toLowerCase();
  const { v1, v2 } = await loginVerifiers(normalized, password);
  const proof: { legacy_v1?: string; legacy_password?: string } = {};
  for (;;) {
    try {
      return await loginStep(
        await post<LoginResponse>("/auth/login", { email: normalized, password: v2, locale, ...proof })
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const hint = migrationHint(error);
      if (hint === "password" && !proof.legacy_password) proof.legacy_password = password;
      else if (hint !== "reset" && !proof.legacy_v1) proof.legacy_v1 = v1;
      else throw error;
    }
  }
}

/** Finishes a sign-in with the authenticator (or backup) code, or the emailed code. */
export async function verifyLogin(method: "totp" | "email", challenge: string, code: string) {
  return loginStep(await post<LoginResponse>(`/auth/login/${method}`, { challenge, code: code.trim() }));
}

/** Finishes a sign-in with a passkey on this device. Throws a DOMException if the prompt is dismissed. */
export async function verifyLoginWithPasskey(challenge: string) {
  const options = await post<PasskeyRequestOptions>("/auth/login/passkey/options", { challenge });
  const credential = await getPasskey(options);
  return loginStep(await post<LoginResponse>("/auth/login/passkey", { challenge, credential }));
}

/** The API wants a sign-in from the last few minutes before it changes how the account signs in. */
export function isReauthRequired(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  return apiErrorDetail(error, "") === "Reauthentication required";
}

/** Proves the password again, which makes this session count as freshly signed in. */
export async function reauthenticate(email: string, password: string) {
  const { v2 } = await loginVerifiers(email.trim().toLowerCase(), password);
  return post<void>("/auth/reauth", { password: v2 });
}

/** The signed-in account's second steps. `totp` is true once an authenticator app is confirmed. */
export const fetchMfa = () => get<{ totp?: boolean; passkeys: Passkey[] }>("/auth/mfa");

/** Makes a passkey on this device and saves it to the account. It works only on this address. */
export async function addPasskey() {
  const options = await post<PasskeyCreationOptions>("/auth/passkeys/options");
  const credential = await createPasskey(options);
  return post<Passkey>("/auth/passkeys", { credential });
}

export const deletePasskey = (id: string) => request<void>(`/auth/passkeys/${id}`, { method: "DELETE" });

export const logout = () => post<void>("/auth/logout");
export const fetchMe = () => get<AuthUserResponse>("/auth/me");
/** Starts authenticator setup. Each call makes a new key and new backup codes. */
export const beginTotpSetup = () => post<TotpSetup>("/auth/totp/setup");
export const confirmTotpSetup = (code: string) => post<void>("/auth/totp/confirm", { code: code.trim() });

export const fetchOverview = () => get<AdminOverview>("/admin/overview");
export const fetchStats = () => get<AdminStats>("/admin/stats");
export const fetchOrgs = () => getAll<AdminOrg>("/admin/orgs");
export const fetchOrg = (id: string) => get<AdminOrgDetail>(`/admin/orgs/${id}`);
export const fetchUsers = () => getAll<AdminUser>("/admin/users");
export const fetchConnections = () => get<AdminOrgConnections[]>("/admin/connections");
export const fetchMcp = () => get<AdminMcp>("/admin/mcp");
export const fetchUsage = (days?: number) =>
  get<AdminUsageRow[]>(days ? `/admin/usage?days=${days}` : "/admin/usage");
export const fetchAuditEvents = () => get<string[]>("/admin/audit/events");

export interface AuditQuery {
  limit: number;
  offset: number;
  organizationId?: string;
  event?: string;
  since?: string;
}

export async function fetchAudit(query: AuditQuery) {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
  if (query.organizationId) params.set("organization_id", query.organizationId);
  if (query.event) params.set("event", query.event);
  if (query.since) params.set("since", query.since);
  const response = await send(`/admin/audit?${params}`);
  const items = (await response.json()) as AdminEvent[];
  const total = Number(response.headers.get("X-Total-Count"));
  return { items, total: Number.isFinite(total) ? Math.max(total, items.length) : items.length };
}
export const fetchSettings = () => get<AdminSettings>("/admin/settings");

/**
 * The API uses an operator-chosen password only in local development. In production it ignores
 * one: the new user is emailed a one-time code and chooses their own. So the forms offer the
 * field only in a development build.
 */
export const LOCAL_PASSWORDS = process.env.NODE_ENV !== "production";

export function onboardOrg(body: {
  name: string;
  admin_email: string;
  admin_name: string;
  admin_password?: string;
  admin_title?: string;
  plan?: string;
  kind?: string;
}) {
  return post<AdminOrgDetail>("/admin/orgs", body);
}

/** The plans each kind of account can be on. */
export const PLANS: Record<string, string[]> = {
  personal: ["free", "pro"],
  organization: ["team", "enterprise"],
};

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
    password?: string;
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

/** Signs the member out everywhere and emails them a one-time code to choose a new password. */
export function resetOrgMemberPassword(orgId: string, employeeId: string) {
  return post<AdminMember>(`/admin/orgs/${orgId}/members/${employeeId}/password`);
}
