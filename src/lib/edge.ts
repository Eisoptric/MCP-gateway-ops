import { createHash, timingSafeEqual } from "node:crypto";

// Pure helpers for src/proxy.ts, kept free of next/server. The same check as the customer
// console's src/lib/edge.ts in MCP-gateway-frontend.

export const ORIGIN_HEADER = "x-eisoptric-origin-auth";

type Env = Record<string, string | undefined>;
type HeaderGetter = (name: string) => string | null;

function secretMatches(presented: string, accepted: string[]): boolean {
  const digest = createHash("sha256").update(presented).digest();
  return accepted
    .filter(Boolean)
    .map((value) => timingSafeEqual(digest, createHash("sha256").update(value).digest()))
    .some(Boolean);
}

/**
 * Whether a request came through Cloudflare, which adds the origin header to every request for
 * ops.eisoptric.com. Without this check the service's run.app address would serve the console to
 * anyone and skip Cloudflare Access.
 */
export function originAllowed(header: HeaderGetter, env: Env): boolean {
  const expected = env.ORIGIN_AUTH_SECRET || "";
  // Local runs leave the secret unset. Cloud Run (K_SERVICE is set there) must fail closed.
  if (!expected) return !env.K_SERVICE;
  const name = (env.ORIGIN_AUTH_HEADER || ORIGIN_HEADER).toLowerCase();
  // During a rotation the previous secret is still accepted, matching the API.
  return secretMatches(header(name) || "", [expected, env.ORIGIN_AUTH_SECRET_PREVIOUS || ""]);
}
