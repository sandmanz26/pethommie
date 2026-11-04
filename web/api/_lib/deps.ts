import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readEnv, type Env, type RawEnv } from "./env.js";

/** What a handler needs from the outside world; tests pass fakes. */
export type Deps = {
  env: Partial<Env>;
  /** A client that acts as the person whose access token it carries, or as an anonymous visitor (no token). */
  supabase: (env: Env, accessToken?: string) => SupabaseClient;
  fetch: typeof fetch;
  now: () => Date;
  newId: () => string;
};

export function realSupabase(env: Env, accessToken?: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

export function defaultDeps(raw: RawEnv = process.env): Deps {
  return {
    env: readEnv(raw),
    supabase: realSupabase,
    fetch: (...args) => fetch(...args),
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
  };
}
