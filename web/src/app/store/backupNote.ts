import { nights, todayISO } from "@/app/domain/logic";
import type { ISODate } from "@/app/domain/types";

/** When this account last downloaded a backup, kept in this browser. The data lives only here, so it matters. */
const keyFor = (accountId: string) => `pethommie.backupAt.${accountId}`;

export const BACKUP_EVERY_DAYS = 7;

export function lastBackup(accountId: string): ISODate | null {
  try {
    return localStorage.getItem(keyFor(accountId));
  } catch {
    return null;
  }
}

export function markBackedUp(accountId: string, on: ISODate = todayISO()) {
  try {
    localStorage.setItem(keyFor(accountId), on);
  } catch {
    // not remembered; the reminder shows again
  }
}

/** Days since the last backup, or null when there has never been one. */
export const daysSinceBackup = (accountId: string, today: ISODate = todayISO()) => {
  const at = lastBackup(accountId);
  return at ? nights(at, today) : null;
};
