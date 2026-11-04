/**
 * Whether this deployment keeps accounts and hotel data on a server (Supabase): both its variables are set.
 * The legal pages say different things depending on it, so they are always true for the build that shows them.
 */
export const usesServer = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
