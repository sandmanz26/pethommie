/**
 * Server-side settings, read from the Vercel project's Environment Variables at request time.
 * SUPABASE_URL / SUPABASE_ANON_KEY, falling back to the VITE_ ones the web app already uses (same values).
 * The anon key is public; row level security decides what it may touch.
 *
 * The service-role key and the email settings are used by exactly one endpoint, /api/email/dispatch (see
 * docs/backend/email-setup.md): it reads/writes notification_outbox, which row level security hides from everyone
 * else on purpose (see migration 0008), and calls Resend with a secret the browser never sees.
 */
export type Env = {
  supabaseUrl: string;
  anonKey: string;
};

export type EmailEnv = Env & {
  serviceRoleKey: string;
  resendApiKey: string;
  emailFrom: string;
  dispatchSecret: string;
  appUrl: string;
};

export type RawEnv = Record<string, string | undefined>;

export function readEnv(raw: RawEnv = process.env): Partial<Env> {
  const pick = (...names: string[]) => names.map((n) => raw[n]?.trim()).find((v) => v) ?? undefined;
  return {
    supabaseUrl: pick("SUPABASE_URL", "VITE_SUPABASE_URL")?.replace(/\/+$/, ""),
    anonKey: pick("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
  };
}

export function readEmailEnv(raw: RawEnv = process.env): Partial<EmailEnv> {
  const base = readEnv(raw);
  return {
    ...base,
    serviceRoleKey: raw.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    resendApiKey: raw.RESEND_API_KEY?.trim() || undefined,
    emailFrom: raw.EMAIL_FROM?.trim() || undefined,
    dispatchSecret: raw.EMAIL_DISPATCH_SECRET?.trim() || undefined,
    appUrl: raw.APP_URL?.trim()?.replace(/\/+$/, "") || undefined,
  };
}

export const isConfigured = (env: Partial<Env>): env is Env => Boolean(env.supabaseUrl && env.anonKey);

export const isEmailConfigured = (env: Partial<EmailEnv>): env is EmailEnv =>
  Boolean(env.supabaseUrl && env.anonKey && env.serviceRoleKey && env.resendApiKey && env.emailFrom && env.dispatchSecret && env.appUrl);
