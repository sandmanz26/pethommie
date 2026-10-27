import { defaultSettings, defaultStayRules, emptyData, type HotelData } from "@/app/domain/types";

/**
 * Where one hotel's data lives. Today: this browser's localStorage, one document per account.
 * When a backend exists, implement this with API calls and hand it to AppStoreProvider.
 */
export type HotelRepository = {
  load(): HotelData;
  /** False if the data could not be stored (storage full or blocked), so the app can warn the user. */
  save(data: HotelData): boolean;
  clear(): void;
  /** Changes that arrive from elsewhere (a synced hotel's server), as the whole new hotel. Returns the unsubscribe. */
  subscribe?(listener: (data: HotelData) => void): () => void;
};

/** One document per account, so a second account in the same browser never sees the first one's hotel. */
export const dataKeyFor = (accountId: string) => `pethommie.app.v1.${accountId}`;
/** "Try now" hotels: a namespace of their own, apart from every real account's data. */
export const demoDataKeyFor = (demoId: string) => `pethommie.demo.v1.${demoId}`;
/**
 * Bump when HotelData changes shape: add a step to `migrate` that turns the previous version into the new
 * one, and a test with an old document. Older documents are upgraded on load, never discarded.
 */
const CURRENT_VERSION = 7;

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

/** The shape version 2 had: payments, a care log and reports, but no charges, invoices or settings. */
function isV2(x: Record<string, unknown>): boolean {
  return (
    isBasicShape(x) &&
    hasIds(x.careLog) &&
    Array.isArray(x.reportsSent) &&
    (x.bookings as Record<string, unknown>[]).every((b) => Array.isArray(b.payments))
  );
}

/** The shape version 3 had: no capacity on cages, no kinds on payments, no source on bookings. */
function isV3(x: Record<string, unknown>): boolean {
  return (
    isV2(x) &&
    isObject(x.settings) &&
    isObject(x.settings.tax) &&
    hasIds(x.invoices) &&
    (x.bookings as Record<string, unknown>[]).every((b) => Array.isArray(b.charges) && Array.isArray(b.companionIds)) &&
    (x.owners as Record<string, unknown>[]).every((o) => o.language === "id" || o.language === "en")
  );
}

/** The shape version 4 had: no rate or cancel reason on stays, no archived units, no expenses. */
function isV4(x: Record<string, unknown>): boolean {
  const bookings = x.bookings as Record<string, unknown>[];
  return (
    isV3(x) &&
    isObject(x.settings) &&
    typeof x.settings.unitTerm === "string" &&
    (x.cages as Record<string, unknown>[]).every((c) => typeof c.capacity === "number" && c.capacity >= 1) &&
    bookings.every((b) => typeof b.source === "string" && (b.payments as Record<string, unknown>[]).every((p) => typeof p.kind === "string" && typeof p.reference === "string"))
  );
}

/** The shape version 5 had: no booking and payment rules (payPolicy), no holds on bookings. */
function isV5(x: Record<string, unknown>): boolean {
  return (
    isV4(x) &&
    isObject(x.settings) &&
    typeof x.settings.requireVaccine === "boolean" &&
    (x.cages as Record<string, unknown>[]).every((c) => typeof c.archived === "boolean") &&
    (x.bookings as Record<string, unknown>[]).every((b) => typeof b.rate === "number" && (b.cancelReason === null || typeof b.cancelReason === "string")) &&
    hasIds(x.expenses) &&
    (x.expenses as Record<string, unknown>[]).every((e) => typeof e.amount === "number" && typeof e.date === "string" && typeof e.category === "string")
  );
}

const HOLDS = ["request", "deposit"];

/** The shape version 6 had: booking and payment rules, but no stay rules (how days are counted). */
function isV6(x: Record<string, unknown>): boolean {
  if (!isV5(x) || !isObject(x.settings)) return false;
  const policy = x.settings.payPolicy;
  return (
    isObject(policy) &&
    ["flexible", "deposit_first", "check_first"].includes(policy.mode as string) &&
    typeof policy.depositPercent === "number" &&
    (x.bookings as Record<string, unknown>[]).every((b) => b.hold === undefined || HOLDS.includes(b.hold as string))
  );
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isHotelData(x: Record<string, unknown>): boolean {
  if (!isV6(x) || !isObject(x.settings)) return false;
  const r = x.settings.stayRules;
  return (
    isObject(r) &&
    typeof r.configured === "boolean" &&
    ["nights", "calendar_days", "hours24"].includes(r.counting as string) &&
    [r.dropOffFrom, r.dropOffUntil, r.pickUpUntil].every((t) => typeof t === "string" && TIME.test(t)) &&
    typeof r.graceMinutes === "number" &&
    isObject(r.late) &&
    ["none", "per_hour", "half_day", "full_day"].includes(r.late.mode as string) &&
    typeof r.late.perHour === "number"
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

/** v3 adds charges and companions to stays, a language to owners, the hotel's settings, and invoices. Nothing is lost or changed. */
function migrateV2(doc: Record<string, unknown>): Record<string, unknown> {
  const bookings = (doc.bookings as Record<string, unknown>[]).map((b) => ({ ...b, charges: [], companionIds: [] }));
  const owners = (doc.owners as Record<string, unknown>[]).map((o) => ({ ...o, language: "id" }));
  return { ...doc, version: 3, bookings, owners, settings: defaultSettings(), invoices: [] };
}

/**
 * v4 lets a unit hold more than one stay (a shared room), says what kind of money a payment is, and where a booking
 * came from. Every cage holds one, every payment is a plain payment, every source unknown: nothing changes meaning.
 */
function migrateV3(doc: Record<string, unknown>): Record<string, unknown> {
  const cages = (doc.cages as Record<string, unknown>[]).map((c) => ({ ...c, capacity: 1 }));
  const bookings = (doc.bookings as Record<string, unknown>[]).map((b) => ({
    ...b,
    source: "other",
    payments: (b.payments as Record<string, unknown>[]).map((p) => ({ ...p, kind: "payment", reference: "" })),
  }));
  return { ...doc, version: 4, cages, bookings, settings: { ...(doc.settings as Record<string, unknown>), unitTerm: "cage" } };
}

/**
 * v5 keeps each stay's nightly rate on the stay (taken from its unit's price today, which is what it was costing),
 * a reason on cancelled stays (unknown), archived units, the vaccine rule (off) and the hotel's expenses (none).
 */
function migrateV4(doc: Record<string, unknown>): Record<string, unknown> {
  const cagesIn = doc.cages as Record<string, unknown>[];
  const price = (id: unknown) => {
    const p = cagesIn.find((c) => c.id === id)?.pricePerNight;
    return typeof p === "number" ? p : 0;
  };
  const bookings = (doc.bookings as Record<string, unknown>[]).map((b) => ({ ...b, rate: price(b.cageId), cancelReason: b.status === "cancelled" ? "owner" : null }));
  const cages = cagesIn.map((c) => ({ ...c, archived: false }));
  return { ...doc, version: 5, cages, bookings, expenses: [], settings: { ...(doc.settings as Record<string, unknown>), requireVaccine: false } };
}

/**
 * v6 adds how the hotel takes bookings and deposits. Every hotel starts flexible (book now, pay whenever), which is
 * how it worked before, so every stay stays confirmed.
 */
function migrateV5(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, version: 6, settings: { ...(doc.settings as Record<string, unknown>), payPolicy: { mode: "flexible", depositPercent: 30 } } };
}

/**
 * v7 adds how the hotel counts days and charges a late pick-up. A hotel that is already set up keeps counting per
 * night with no late fee, so every total stays as it was, and counts as configured so it can keep booking. A
 * document without a hotel yet sets its rules after onboarding.
 */
function migrateV6(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, version: 7, settings: { ...(doc.settings as Record<string, unknown>), stayRules: defaultStayRules(doc.hotel !== null) } };
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
  if (doc.version === 2 && isV2(doc)) {
    doc = migrateV2(doc);
    migratedFrom ??= 2;
  }
  if (doc.version === 3 && isV3(doc)) {
    doc = migrateV3(doc);
    migratedFrom ??= 3;
  }
  if (doc.version === 4 && isV4(doc)) {
    doc = migrateV4(doc);
    migratedFrom ??= 4;
  }
  if (doc.version === 5 && isV5(doc)) {
    doc = migrateV5(doc);
    migratedFrom ??= 5;
  }
  if (doc.version === 6 && isV6(doc)) {
    doc = migrateV6(doc);
    migratedFrom ??= 6;
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
