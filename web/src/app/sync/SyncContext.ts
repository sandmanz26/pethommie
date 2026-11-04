import { createContext, useContext, useSyncExternalStore } from "react";
import type { Arrival, SyncStatus, SyncedRepository } from "./syncedRepository";

/** The synced hotel of a Supabase account; null for a hotel kept only in this browser (nothing to show). */
export const SyncContext = createContext<SyncedRepository | null>(null);

const noRepo = { subscribe: () => () => undefined, read: () => null };

/** Where the hotel stands with the server, or null when it isn't synced at all. */
export function useSync(): { status: SyncStatus | null; retry: () => void } {
  const repo = useContext(SyncContext);
  const status = useSyncExternalStore(repo ? repo.onStatus : noRepo.subscribe, repo ? repo.status : noRepo.read);
  return { status, retry: () => void repo?.sync() };
}

/** Whether a synced hotel is on this device yet (see `Arrival`); null when the hotel isn't synced, so it is always here. */
export function useArrival(): Arrival | null {
  const repo = useContext(SyncContext);
  return useSyncExternalStore(repo ? repo.onArrival : noRepo.subscribe, repo ? repo.arrival : noRepo.read);
}

/** The synced repository itself, for the few places that act on it (Settings' delete); null when not synced. */
export function useSyncedRepository(): SyncedRepository | null {
  return useContext(SyncContext);
}
