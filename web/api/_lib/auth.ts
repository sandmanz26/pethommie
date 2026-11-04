import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Deps } from "./deps.js";
import { isConfigured, type Env } from "./env.js";
import { ApiError } from "./http.js";
import { dbError } from "./db.js";

export function requireEnv(deps: Deps): Env {
  if (!isConfigured(deps.env)) {
    throw new ApiError(503, "not_configured", "The API is not connected to Supabase yet: set SUPABASE_URL and SUPABASE_ANON_KEY on Vercel, then redeploy.");
  }
  return deps.env;
}

/** The access token from `Authorization: Bearer <token>`, or null. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

export type Session = { user: User; db: SupabaseClient };

/**
 * The signed-in person, checked with Supabase, and a client that acts as them: every query goes through row level
 * security exactly as it does from the app.
 */
export async function requireUser(req: Request, deps: Deps): Promise<Session> {
  const env = requireEnv(deps);
  const token = bearerToken(req);
  if (!token) throw new ApiError(401, "missing_token", "Sign in first: send the header Authorization: Bearer <access token>.");
  const db = deps.supabase(env, token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new ApiError(401, "invalid_token", "The access token is invalid or has expired. Sign in again and use the new token.");
  return { user: data.user, db };
}

/** The hotel the signed-in person belongs to (as the app picks it: owner first). */
export async function requireHotel(session: Session): Promise<string> {
  const { data, error } = await session.db.rpc("my_hotel");
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, "no_hotel", "This account has no hotel yet. Create one with POST /api/hotel, or finish setup in the app.");
  return data as string;
}
