import type { Deps } from "../deps.js";
import { isConfigured } from "../env.js";
import { json } from "../http.js";

/**
 * GET /api/health — no sign-in. Says whether the API has its settings and can reach Supabase. Never shows a value,
 * only whether it is set.
 */
export async function getHealth(_req: Request, deps: Deps): Promise<Response> {
  const env = { SUPABASE_URL: Boolean(deps.env.supabaseUrl), SUPABASE_ANON_KEY: Boolean(deps.env.anonKey) };
  if (!isConfigured(deps.env)) {
    return json({ ok: false, env, supabase: { reachable: false, reason: "not_configured" } }, 503);
  }
  const started = deps.now().getTime();
  let supabase: { reachable: boolean; status?: number; ms?: number; reason?: string };
  try {
    const res = await deps.fetch(`${deps.env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: deps.env.anonKey },
      signal: AbortSignal.timeout(5000),
    });
    supabase = { reachable: res.ok, status: res.status, ms: deps.now().getTime() - started };
    if (!res.ok) supabase.reason = res.status === 401 ? "anon_key_rejected" : "unexpected_status";
  } catch {
    supabase = { reachable: false, reason: "network_error" };
  }
  return json({ ok: supabase.reachable, env, supabase }, supabase.reachable ? 200 : 503);
}
