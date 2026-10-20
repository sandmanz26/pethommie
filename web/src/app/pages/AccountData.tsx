import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useAccount } from "@/app/auth/AuthProvider";
import { emptyData } from "@/app/domain/types";
import { sampleData } from "@/app/store/sampleData";
import { ModeProvider } from "@/app/mode/ModeProvider";
import { AppStoreProvider } from "@/app/store/AppStore";
import { createLocalRepository, dataKeyFor } from "@/app/store/storage";

/**
 * The signed-in account's hotel. Keyed by account, so signing out and into another account starts
 * from that account's own data and nothing of the previous one stays in memory.
 */
export function AccountData() {
  const account = useAccount();
  const repo = useMemo(
    () => createLocalRepository(dataKeyFor(account.id), account.startsWithSampleData ? () => sampleData(account.sampleKind) : emptyData),
    [account.id, account.startsWithSampleData, account.sampleKind],
  );
  return (
    <ModeProvider key={account.id} accountId={account.id} initial={account.sampleKind === "advanced" ? "advanced" : undefined}>
      <AppStoreProvider repo={repo}>
        <Outlet />
      </AppStoreProvider>
    </ModeProvider>
  );
}
