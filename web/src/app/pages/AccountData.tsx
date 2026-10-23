import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useAccount } from "@/app/auth/AuthProvider";
import { emptyData } from "@/app/domain/types";
import { sampleData } from "@/app/store/sampleData";
import { ModeProvider } from "@/app/mode/ModeProvider";
import { AppStoreProvider } from "@/app/store/AppStore";
import { createLocalRepository, dataKeyFor, demoDataKeyFor } from "@/app/store/storage";
import { DemoChrome } from "@/app/demo/DemoChrome";

/**
 * The signed-in account's hotel. Keyed by account, so signing out and into another account starts
 * from that account's own data and nothing of the previous one stays in memory. A demo hotel keeps its data under
 * a key of its own, so nothing done in "Try now" can land in a real account's hotel, and gets the demo strip and offer.
 */
export function AccountData() {
  const account = useAccount();
  const repo = useMemo(
    () =>
      createLocalRepository(
        account.demo ? demoDataKeyFor(account.id) : dataKeyFor(account.id),
        account.startsWithSampleData ? () => sampleData(account.sampleKind) : emptyData,
      ),
    [account.id, account.demo, account.startsWithSampleData, account.sampleKind],
  );
  return (
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
  );
}
