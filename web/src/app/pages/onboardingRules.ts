import type { CageSize } from "@/app/domain/types";
import { SIZE_ORDER } from "@/app/domain/logic";
import { normaliseWhatsapp } from "@/shared/lib/phone";

/** What setup accepts, as pure rules: the page shows the problems, these decide them. */
export const SETUP_LIMITS = {
  hotelName: [2, 80],
  city: 60,
  roomName: [2, 40],
  places: [2, 50],
  /** Pets at once for a hotel without cages or rooms: 2 makes it shared (each pet pays), 500 is surely a typo. */
  capacity: [2, 500],
  /** Rupiah per night: below this is surely a typo (a missing "000"), above it too. */
  price: [1_000, 10_000_000],
} as const;

export type LengthIssue = "required" | "short" | "long";
export type PriceIssue = "low" | "high";

function length(value: string, [min, max]: readonly [number, number], required = true): LengthIssue | undefined {
  const v = value.trim();
  if (!v) return required ? "required" : undefined;
  if (v.length < min) return "short";
  if (v.length > max) return "long";
  return undefined;
}

export function priceIssue(price: number): PriceIssue | undefined {
  const [min, max] = SETUP_LIMITS.price;
  if (!(price >= min)) return "low";
  if (price > max) return "high";
  return undefined;
}

export type HotelIssues = { name?: LengthIssue; city?: "long"; whatsapp?: "invalid" };

export function hotelIssues({ name, city, whatsapp }: { name: string; city: string; whatsapp: string }): HotelIssues {
  const issues: HotelIssues = {};
  const n = length(name, SETUP_LIMITS.hotelName);
  if (n) issues.name = n;
  if (city.trim().length > SETUP_LIMITS.city) issues.city = "long";
  if (whatsapp.trim() && !normaliseWhatsapp(whatsapp)) issues.whatsapp = "invalid";
  return issues;
}

export type CageSpec = Record<CageSize, { count: number; price: number }>;
export type CageIssues = { none?: true; price?: Partial<Record<CageSize, PriceIssue>> };

/** At least one cage, and a believable price for every size that has any. Sizes with none are not checked. */
export function cageIssues(spec: CageSpec): CageIssues {
  const issues: CageIssues = {};
  if (SIZE_ORDER.every((s) => spec[s].count === 0)) issues.none = true;
  for (const s of SIZE_ORDER) {
    const p = spec[s].count > 0 ? priceIssue(spec[s].price) : undefined;
    if (p) issues.price = { ...issues.price, [s]: p };
  }
  return issues;
}

export type RoomDraft = { name: string; places: number; price: number };
export type RoomIssue = { name?: LengthIssue | "duplicate"; places?: "range"; price?: PriceIssue };

/** Every room named (and named differently), with 2 to 50 places and a believable price per pet. */
export function roomIssues(rooms: RoomDraft[]): { none?: true; rooms: RoomIssue[] } {
  const names = rooms.map((r) => r.name.trim().toLowerCase());
  const list = rooms.map((r, i) => {
    const issue: RoomIssue = {};
    const n = length(r.name, SETUP_LIMITS.roomName);
    if (n) issue.name = n;
    else if (names.indexOf(names[i]) !== i) issue.name = "duplicate";
    const [min, max] = SETUP_LIMITS.places;
    if (!(r.places >= min && r.places <= max)) issue.places = "range";
    const p = priceIssue(r.price);
    if (p) issue.price = p;
    return issue;
  });
  return { ...(rooms.length ? {} : { none: true as const }), rooms: list };
}

export type PoolDraft = { capacity: number; price: number };
export type PoolIssues = { capacity?: "range" | "booked"; price?: PriceIssue };

/**
 * A hotel without cages or rooms: a believable number of pets at once and price per pet. `booked` is the most pets
 * already booked on one night from today; the capacity can't go below it, or those stays would no longer fit.
 */
export function poolIssues({ capacity, price }: PoolDraft, booked = 0): PoolIssues {
  const issues: PoolIssues = {};
  const [min, max] = SETUP_LIMITS.capacity;
  if (!(Number.isInteger(capacity) && capacity >= min && capacity <= max)) issues.capacity = "range";
  else if (capacity < booked) issues.capacity = "booked";
  const p = priceIssue(price);
  if (p) issues.price = p;
  return issues;
}

export const hasIssues = (x: object): boolean =>
  Object.values(x).some((v) => (Array.isArray(v) ? v.some((r) => hasIssues(r)) : typeof v === "object" && v !== null ? hasIssues(v) : v !== undefined));
