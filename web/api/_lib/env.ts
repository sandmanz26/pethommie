/**
 * Server-side settings, read from the Vercel project's Environment Variables at request time.
 * SUPABASE_URL / SUPABASE_ANON_KEY, falling back to the VITE_ ones the web app already uses (same values).
 * The anon key is public; row level security decides what it may touch. The service-role key is not used by any
 * endpoint: nothing here needs to see past row level security.
 */
export type Env = {
  supabaseUrl: string;
  anonKey: string;
};

export type RawEnv = Record<string, string | undefined>;

export function readEnv(raw: RawEnv = process.env): Partial<Env> {
  const pick = (...names: string[]) => names.map((n) => raw[n]?.trim()).find((v) => v) ?? undefined;
  return {
    supabaseUrl: pick("SUPABASE_URL", "VITE_SUPABASE_URL")?.replace(/\/+$/, ""),
    anonKey: pick("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
  };
}

export const isConfigured = (env: Partial<Env>): env is Env => Boolean(env.supabaseUrl && env.anonKey);
