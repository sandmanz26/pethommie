import { DEMO_MODE } from "@/app/config";
import { getSupabase } from "@/app/supabase/client";
import { demoAccounts } from "./demoAccounts";
import { createLocalAuthService } from "./localAuthService";
import { createSupabaseAuthService } from "./supabaseAuthService";

const local = createLocalAuthService({ demo: DEMO_MODE ? demoAccounts : [] });
const supabase = getSupabase();

/**
 * The service the app uses. With a Supabase project configured: real accounts through Google, and "Try now" still
 * local. Without one: everything in this browser (the mock), as before.
 */
export const authService = supabase
  ? createSupabaseAuthService({
      client: supabase,
      local,
      callbackUrl: (next) => `${window.location.origin}/app/auth/callback?next=${encodeURIComponent(next)}`,
    })
  : local;
