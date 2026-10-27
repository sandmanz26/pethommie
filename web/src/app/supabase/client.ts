import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The one Supabase client, made on first use. Null when the project isn't configured (VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY unset): the app then runs fully local, as it always has.
 * Only the anon key belongs here; row level security decides what it can touch.
 */
let client: SupabaseClient | null | undefined;

export const supabaseConfigured = () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = supabaseConfigured()
    ? createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
        // PKCE: Google sends back a one-time code that the client trades for a session on /app/auth/callback.
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  return client;
}
