import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useAccount } from "@/app/auth/AuthProvider";
import { emptyData } from "@/app/domain/types";
import { sampleData } from "@/app/store/sampleData";
import { AppStoreProvider } from "@/app/store/AppStore";
import { createLocalRepository, dataKeyFor } from "@/app/store/storage";

/**
 * The signed-in account's hotel. Keyed by account, so signing out and into another account starts
 * from that account's own data and nothing of the previous one stays in memory.
 */
export function AccountData() {
  const account = useAccount();
  const repo = useMemo(
    () => createLocalRepository(dataKeyFor(account.id), account.startsWithSampleData ? sampleData : emptyData),
    [account.id, account.startsWithSampleData],
  );
  return (
    <AppStoreProvider key={account.id} repo={repo}>
      <Outlet />
    </AppStoreProvider>
  );
}
