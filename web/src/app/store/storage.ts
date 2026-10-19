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
/**
 * Bump when HotelData changes shape: add a step to `migrate` that turns the previous version into the new
 * one, and a test with an old document. Older documents are upgraded on load, never discarded.
 */
const CURRENT_VERSION = 2;

export type StoredProblem = "corrupt" | "newer";
export type Parsed = { data: HotelData; problem: StoredProblem | null; migratedFrom?: number };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const hasIds = (x: unknown) => Array.isArray(x) && x.every((r) => isObject(r) && typeof r.id === "string");

function hotelOk(x: Record<string, unknown>) {
  const hotel = x.hotel;
  return hotel === null || (isObject(hotel) && typeof hotel.name === "string");
}

/** The shape every version shares. */
function isBasicShape(x: Record<string, unknown>): boolean {
  return hotelOk(x) && ["cages", "owners", "pets", "bookings"].every((k) => hasIds(x[k]));
}

function isHotelData(x: Record<string, unknown>): boolean {
  return (
    isBasicShape(x) &&
    hasIds(x.careLog) &&
    Array.isArray(x.reportsSent) &&
    (x.bookings as Record<string, unknown>[]).every((b) => Array.isArray(b.payments))
  );
}

/** v1 kept a single `deposit` number on a booking; v2 keeps a list of payments, and a care log. */
function migrateV1(doc: Record<string, unknown>): Record<string, unknown> {
  const bookings = (doc.bookings as Record<string, unknown>[]).map(({ deposit, ...booking }) => ({
    ...booking,
    payments:
      typeof deposit === "number" && deposit > 0
        ? [{ id: `${String(booking.id)}-deposit`, at: typeof booking.createdAt === "string" ? booking.createdAt : `${String(booking.checkIn)}T00:00:00.000Z`, amount: deposit, method: "cash", note: "" }]
        : [],
    arrival: null,
  }));
  return { ...doc, version: 2, bookings, careLog: [], reportsSent: [] };
}

/**
 * Reads what was stored. Never throws: anything unreadable comes back as empty data plus the reason,
 * so the caller can keep the original before it is overwritten. Older versions are upgraded.
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

  let doc = value;
  let migratedFrom: number | undefined;
  if (doc.version === 1 && isBasicShape(doc)) {
    doc = migrateV1(doc);
    migratedFrom = 1;
  }
  if (doc.version !== CURRENT_VERSION || !isHotelData(doc)) return { data: emptyData(), problem: "corrupt" };
  return { data: doc as unknown as HotelData, problem: null, migratedFrom };
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
        const { data, problem, migratedFrom } = parseStored(raw);
        // Unreadable data would be replaced by the first autosave, and an upgraded document replaces the old
        // shape. Keep a copy of the original first.
        if (problem) localStorage.setItem(backupKey, raw);
        else if (migratedFrom && localStorage.getItem(`${key}.v${migratedFrom}.backup`) === null) localStorage.setItem(`${key}.v${migratedFrom}.backup`, raw);
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
