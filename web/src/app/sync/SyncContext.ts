import { createContext, useContext, useSyncExternalStore } from "react";
import type { SyncStatus, SyncedRepository } from "./syncedRepository";

/** The synced hotel of a Supabase account; null for a hotel kept only in this browser (nothing to show). */
export const SyncContext = createContext<SyncedRepository | null>(null);

const noRepo = { subscribe: () => () => undefined, read: () => null };

/** Where the hotel stands with the server, or null when it isn't synced at all. */
export function useSync(): { status: SyncStatus | null; retry: () => void } {
  const repo = useContext(SyncContext);
  const status = useSyncExternalStore(repo ? repo.onStatus : noRepo.subscribe, repo ? repo.status : noRepo.read);
  return { status, retry: () => void repo?.sync() };
}
