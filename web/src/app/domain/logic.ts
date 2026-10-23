import { billableDays } from "./stayRules";
import type { Booking, Cage, CageSize, Charge, HotelData, ISODate, Pet, StayCounting } from "./types";

// ---------- dates (local calendar days, no time zones) ----------

export function todayISO(now = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

/** The local calendar day an ISO date-time falls on. */
export function dayOf(iso: string): ISODate {
  return todayISO(new Date(iso));
}

/** Local clock time of an ISO date-time, as HH.mm (Indonesian style) or HH:mm. */
export function timeOf(iso: string, locale: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}${locale === "id" ? "." : ":"}${mm}`;
}

/** Which day of the stay a date is: the check-in day is day 1. */
export function stayDay(checkIn: ISODate, date: ISODate): number {
  return nights(checkIn, date) + 1;
}

/** Whole nights between two dates (checkOut - checkIn). */
export function nights(checkIn: ISODate, checkOut: ISODate): number {
  const [a, b] = [checkIn, checkOut].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

// ---------- availability ----------

/** A stay that is still on: booked (confirmed or not yet) or staying. */
export function isLive(b: Pick<Booking, "status">) {
  return b.status === "booked" || b.status === "checked_in";
}

/**
 * A booking holds its cage from check-in night up to (not including) check-out day. A request (hold "request") holds
 * nothing until the hotel confirms the slot; one waiting for its deposit does hold it.
 */
export function holdsCage(b: Pick<Booking, "status" | "hold">) {
  return isLive(b) && b.hold !== "request";
}

export function overlaps(aIn: ISODate, aOut: ISODate, bIn: ISODate, bOut: ISODate) {
  return aIn < bOut && bIn < aOut;
}

/** A place that takes more than one stay at a time: a shared room or play area. */
export const isShared = (cage: Pick<Cage, "capacity"> | undefined) => (cage?.capacity ?? 1) > 1;

/** Places a stay takes in a unit: a cage is taken whole (its pets share it); in a shared room each pet takes one. */
export function placesFor(b: Pick<Booking, "petId" | "companionIds">, cage: Pick<Cage, "capacity"> | undefined) {
  return isShared(cage) ? stayPetIds(b).length : 1;
}

/** Places in use in a unit on a night, by stays that hold their place. */
export function placesUsed(data: HotelData, cageId: string, night: ISODate, ignoreBookingId?: string) {
  const cage = data.cages.find((c) => c.id === cageId);
  return data.bookings
    .filter((b) => b.cageId === cageId && b.id !== ignoreBookingId && holdsCage(b) && b.checkIn <= night && night < b.checkOut)
    .reduce((n, b) => n + placesFor(b, cage), 0);
}

/**
 * True if a unit has room for `places` more on every night of [checkIn, checkOut). A cage (capacity 1) is free only
 * when nobody holds it; a shared room while its pets stay within capacity.
 */
export function cageIsFree(data: HotelData, cageId: string, checkIn: ISODate, checkOut: ISODate, ignoreBookingId?: string, places = 1) {
  const cage = data.cages.find((c) => c.id === cageId);
  // An archived unit takes no stays.
  if (cage?.archived) return false;
  const capacity = cage?.capacity ?? 1;
  const overlapping = data.bookings.filter((b) => b.cageId === cageId && b.id !== ignoreBookingId && holdsCage(b) && overlaps(checkIn, checkOut, b.checkIn, b.checkOut));
  if (!overlapping.length) return places <= capacity;
  if (capacity <= 1) return false;
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) {
    const used = overlapping.filter((b) => b.checkIn <= night && night < b.checkOut).reduce((n, b) => n + placesFor(b, cage), 0);
    if (used + places > capacity) return false;
  }
  return true;
}

export function freeCages(data: HotelData, checkIn: ISODate, checkOut: ISODate, size?: CageSize, places = 1) {
  return data.cages.filter((c) => (!size || c.size === size) && cageIsFree(data, c.id, checkIn, checkOut, undefined, places));
}

/** The booking occupying a cage on a given night, if any (for a shared room: one of them). */
export function occupantOn(data: HotelData, cageId: string, night: ISODate) {
  return data.bookings.find(
    (b) => b.cageId === cageId && holdsCage(b) && b.checkIn <= night && night < b.checkOut,
  );
}

/** Places the hotel has: one per cage, `capacity` per shared room. */
/** The units in use: archived ones keep their history but take no stays and are not places. */
export const activeCages = (data: Pick<HotelData, "cages">) => data.cages.filter((c) => !c.archived);

export const totalPlaces = (data: Pick<HotelData, "cages">) => activeCages(data).reduce((n, c) => n + Math.max(1, c.capacity), 0);

// ---------- hotels without cages or rooms ----------

/** The hotel has no units on screen: just a total capacity (see UnitTerm "none"). */
export const hasNoUnits = (data: Pick<HotelData, "settings">) => data.settings.unitTerm === "none";

/** A no-unit hotel's one hidden unit, holding its capacity and price per pet. */
export const poolUnit = (data: Pick<HotelData, "cages">): Cage | undefined => activeCages(data)[0];

/** A unit's name for screens and messages: empty for a hotel without units, where it means nothing to anyone. */
export const unitLabel = (data: Pick<HotelData, "settings">, cage: Pick<Cage, "name"> | undefined) => (hasNoUnits(data) ? "" : (cage?.name ?? "—"));

/** Places still free in a unit on every night of [checkIn, checkOut): its capacity less the fullest night. */
export function freePlaces(data: HotelData, cageId: string, checkIn: ISODate, checkOut: ISODate, ignoreBookingId?: string) {
  const cage = data.cages.find((c) => c.id === cageId);
  if (!cage || cage.archived) return 0;
  let fullest = 0;
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) fullest = Math.max(fullest, placesUsed(data, cageId, night, ignoreBookingId));
  return Math.max(0, Math.max(1, cage.capacity) - fullest);
}

/**
 * Whether the hotel can drop its cages and rooms: only when what it has fits one hidden unit, that is no unit in use
 * yet, or a single shared room (its stays then simply stop showing a unit).
 */
export function canGoUnitless(data: Pick<HotelData, "cages">) {
  const active = activeCages(data);
  return active.length === 0 || (active.length === 1 && isShared(active[0]));
}

/** The most places a unit has taken on any night from `from` on, by stays that hold their place. */
export function busiestNight(data: HotelData, cageId: string, from: ISODate) {
  const nightsAhead = data.bookings
    .filter((b) => b.cageId === cageId && holdsCage(b) && b.checkOut > from)
    .flatMap((b) => Array.from({ length: Math.max(0, nights(b.checkIn < from ? from : b.checkIn, b.checkOut)) }, (_, i) => addDays(b.checkIn < from ? from : b.checkIn, i)));
  return [...new Set(nightsAhead)].reduce((most, night) => Math.max(most, placesUsed(data, cageId, night)), 0);
}

/** The hidden unit a no-unit hotel is set up with. Shared (capacity at least 2), so each pet pays and takes a place. */
export function poolCage(capacity: number, pricePerPet: number, name: string, id = newId()): Cage {
  return { id, name, size: "M", pricePerNight: pricePerPet, capacity: Math.max(2, Math.round(capacity)), archived: false };
}

// ---------- money ----------

/** The rate a stay pays per night (per pet in a shared room): the one agreed when it was booked, or the unit's price. */
export const nightlyRate = (booking: { rate?: number }, cage: Pick<Cage, "pricePerNight"> | undefined) => (booking.rate && booking.rate > 0 ? booking.rate : (cage?.pricePerNight ?? 0));

/** How the hotel counts its days (settings.stayRules.counting). */
export const countingOf = (data: Pick<HotelData, "settings">): StayCounting => data.settings.stayRules?.counting ?? "nights";

/** The days a stay is charged for, the hotel's way (see stayRules.billableDays). */
export const stayDays = (b: Pick<Booking, "checkIn" | "checkOut">, counting: StayCounting = "nights") => billableDays(b.checkIn, b.checkOut, counting);

/**
 * The price of a stay: its days, counted the hotel's way (nights by default), at the unit's rate (for each pet in a
 * shared room), plus add-ons and minus discounts. Never below zero.
 */
export function bookingTotal(
  booking: Pick<Booking, "checkIn" | "checkOut"> & { charges?: Pick<Charge, "amount">[]; petId?: string; companionIds?: string[]; rate?: number },
  cage: Cage | undefined,
  counting: StayCounting = "nights",
) {
  if (!cage) return 0;
  const pets = isShared(cage) ? 1 + (booking.companionIds?.length ?? 0) : 1;
  const base = billableDays(booking.checkIn, booking.checkOut, counting) * nightlyRate(booking, cage) * pets;
  const extras = (booking.charges ?? []).reduce((sum, c) => sum + c.amount, 0);
  return Math.max(0, base + extras);
}

/** Every pet in a stay: the one it was booked for, then those sharing the cage. */
export const stayPetIds = (b: Pick<Booking, "petId" | "companionIds">): string[] => [b.petId, ...b.companionIds];

export const involvesPet = (b: Pick<Booking, "petId" | "companionIds">, petId: string) => b.petId === petId || b.companionIds.includes(petId);

export function formatRupiah(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: ISODate, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", opts);
}

// ---------- vaccines ----------

export type VaccineState = "ok" | "soon" | "expired" | "unknown";

/** "soon" means it expires within 30 days of the given date. */
export function vaccineState(pet: Pet, on: ISODate): VaccineState {
  if (!pet.vaccineExpiry) return "unknown";
  if (pet.vaccineExpiry < on) return "expired";
  if (pet.vaccineExpiry < addDays(on, 30)) return "soon";
  return "ok";
}

// ---------- today board ----------

export function todayBoard(data: HotelData, today: ISODate) {
  // Requests and stays waiting for a deposit still arrive on the board (with their badge), though a request holds no place.
  const live = data.bookings.filter(isLive);
  return {
    arriving: live.filter((b) => b.status === "booked" && b.checkIn === today),
    lateArrivals: live.filter((b) => b.status === "booked" && b.checkIn < today),
    leaving: live.filter((b) => b.status === "checked_in" && b.checkOut <= today),
    inHouse: live.filter((b) => b.status === "checked_in"),
    /** Places free tonight, out of `totalPlaces`: a free cage counts one, a shared room its spare places. */
    freeTonight: activeCages(data).reduce((n, c) => n + Math.max(0, Math.max(1, c.capacity) - placesUsed(data, c.id, today)), 0),
  };
}

// ---------- ids ----------

/** A random UUID (v4). Always a UUID, even where `crypto.randomUUID` is missing, because the server's ids are UUIDs. */
export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = "89ab"[Math.floor(Math.random() * 4)];
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- cage generation for onboarding ----------

export const SIZE_ORDER: CageSize[] = ["S", "M", "L"];

export function generateCages(spec: Record<CageSize, { count: number; price: number }>): Cage[] {
  return SIZE_ORDER.flatMap((size) =>
    Array.from({ length: spec[size].count }, (_, i) => ({
      id: newId(),
      name: `${size}-${String(i + 1).padStart(2, "0")}`,
      size,
      pricePerNight: spec[size].price,
      archived: false,
      capacity: 1,
    })),
  );
}
