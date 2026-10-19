import { emptyData, type HotelData } from "@/app/domain/types";

/**
 * Where one hotel's data lives. Today: this browser's localStorage, one document per account.
 * When a backend exists, implement this with API calls and hand it to AppStoreProvider.
 */
export type HotelRepository = {
  load(): HotelData;
  /** False if the data could not be stored (storage full or blocked), so the app can warn the user. */
  save(data: HotelData): boolean;
  clear(): void;
};

/** One document per account, so a second account in the same browser never sees the first one's hotel. */
export const dataKeyFor = (accountId: string) => `pethommie.app.v1.${accountId}`;
/** Bump when HotelData changes shape, and add a step that upgrades the previous version in `parseStored`. */
const CURRENT_VERSION = 1;

export type StoredProblem = "corrupt" | "newer";
export type Parsed = { data: HotelData; problem: StoredProblem | null };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const hasIds = (x: unknown) => Array.isArray(x) && x.every((r) => isObject(r) && typeof r.id === "string");

function isHotelData(x: Record<string, unknown>): boolean {
  const hotel = x.hotel;
  const hotelOk = hotel === null || (isObject(hotel) && typeof hotel.name === "string");
  return hotelOk && ["cages", "owners", "pets", "bookings"].every((k) => hasIds(x[k]));
}

/**
 * Reads what was stored. Never throws: anything unreadable comes back as empty data plus the reason,
 * so the caller can keep the original before it is overwritten.
 */
export function parseStored(raw: string | null): Parsed {
  if (!raw) return { data: emptyData(), problem: null };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { data: emptyData(), problem: "corrupt" };
  }
  if (!isObject(value) || typeof value.version !== "number") return { data: emptyData(), problem: "corrupt" };
  if (value.version > CURRENT_VERSION) return { data: emptyData(), problem: "newer" };
  if (value.version !== CURRENT_VERSION || !isHotelData(value)) return { data: emptyData(), problem: "corrupt" };
  return { data: value as unknown as HotelData, problem: null };
}

/**
 * Hotel data in this browser's localStorage, under `key`. `initial` is what a brand-new document
 * starts as (empty, or the sample hotel for a demo account).
 */
export function createLocalRepository(key: string, initial: () => HotelData = emptyData): HotelRepository {
  const backupKey = `${key}.backup`;
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return initial();
        const { data, problem } = parseStored(raw);
        // Unreadable data would be replaced by the first autosave. Keep a copy first.
        if (problem) localStorage.setItem(backupKey, raw);
        return data;
      } catch {
        return emptyData();
      }
    },
    save(data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        // nothing to clear
      }
    },
  };
}
