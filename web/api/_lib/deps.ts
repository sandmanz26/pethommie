import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readEmailEnv, readEnv, type Env, type EmailEnv, type RawEnv } from "./env.js";

/** What a handler needs from the outside world; tests pass fakes. */
export type Deps = {
  env: Partial<Env>;
  /** A client that acts as the person whose access token it carries, or as an anonymous visitor (no token). */
  supabase: (env: Env, accessToken?: string) => SupabaseClient;
  fetch: typeof fetch;
  now: () => Date;
  newId: () => string;
};

/** What /api/email/dispatch needs on top of Deps: a client past row level security, for notification_outbox alone. */
export type EmailDeps = Deps & {
  env: Partial<EmailEnv>;
  supabaseService: (env: EmailEnv) => SupabaseClient;
};

export function realSupabase(env: Env, accessToken?: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

/** Past row level security entirely. Only ever used for notification_outbox: see migration 0008 and env.ts. */
export function realSupabaseService(env: EmailEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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

export function defaultEmailDeps(raw: RawEnv = process.env): EmailDeps {
  return {
    env: readEmailEnv(raw),
    supabase: realSupabase,
    supabaseService: realSupabaseService,
    fetch: (...args) => fetch(...args),
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
  };
}
