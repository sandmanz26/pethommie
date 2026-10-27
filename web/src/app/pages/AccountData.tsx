import { useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useAccount } from "@/app/auth/AuthProvider";
import { emptyData } from "@/app/domain/types";
import { sampleData } from "@/app/store/sampleData";
import { ModeProvider } from "@/app/mode/ModeProvider";
import { AppStoreProvider } from "@/app/store/AppStore";
import { createLocalRepository, dataKeyFor, demoDataKeyFor } from "@/app/store/storage";
import { DemoChrome } from "@/app/demo/DemoChrome";
import { getSupabase } from "@/app/supabase/client";
import { createSupabaseGateway } from "@/app/sync/supabaseGateway";
import { createSyncedRepository } from "@/app/sync/syncedRepository";
import { SyncContext } from "@/app/sync/SyncContext";

/**
 * The signed-in account's hotel. Keyed by account, so signing out and into another account starts
 * from that account's own data and nothing of the previous one stays in memory. A demo hotel keeps its data under
 * a key of its own, so nothing done in "Try now" can land in a real account's hotel, and gets the demo strip and offer.
 *
 * A Supabase account (Google sign-in) keeps the same local copy and also syncs it with the server: its hotel is
 * found, or made from the local one once onboarding has saved it, and what is here is uploaded. Every other account
 * stays in this browser only, as before.
 */
export function AccountData() {
  const account = useAccount();
  const supabase = account.provider === "supabase" && !account.demo ? getSupabase() : null;
  const { repo, synced } = useMemo(() => {
    const key = account.demo ? demoDataKeyFor(account.id) : dataKeyFor(account.id);
    const initial = account.startsWithSampleData ? () => sampleData(account.sampleKind) : emptyData;
    if (!supabase) return { repo: createLocalRepository(key, initial), synced: null };
    const s = createSyncedRepository({ key, gateway: createSupabaseGateway(supabase), initial });
    return { repo: s, synced: s };
  }, [account.id, account.demo, account.startsWithSampleData, account.sampleKind, supabase]);
  useEffect(() => synced?.start(), [synced]);
  return (
    <SyncContext.Provider value={synced}>
      <ModeProvider key={account.id} accountId={account.id} initial={account.sampleKind === "advanced" ? "advanced" : undefined}>
        <AppStoreProvider repo={repo}>
          {account.demo ? (
            <DemoChrome account={account}>
              <Outlet />
            </DemoChrome>
          ) : (
            <Outlet />
          )}
        </AppStoreProvider>
      </ModeProvider>
    </SyncContext.Provider>
  );
}
