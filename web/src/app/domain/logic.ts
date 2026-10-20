import type { Booking, Cage, CageSize, Charge, HotelData, ISODate, Pet } from "./types";

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

/** A booking holds its cage from check-in night up to (not including) check-out day. */
export function holdsCage(b: Booking) {
  return b.status === "booked" || b.status === "checked_in";
}

export function overlaps(aIn: ISODate, aOut: ISODate, bIn: ISODate, bOut: ISODate) {
  return aIn < bOut && bIn < aOut;
}

export function cageIsFree(
  data: HotelData,
  cageId: string,
  checkIn: ISODate,
  checkOut: ISODate,
  ignoreBookingId?: string,
) {
  return !data.bookings.some(
    (b) =>
      b.cageId === cageId &&
      b.id !== ignoreBookingId &&
      holdsCage(b) &&
      overlaps(checkIn, checkOut, b.checkIn, b.checkOut),
  );
}

export function freeCages(data: HotelData, checkIn: ISODate, checkOut: ISODate, size?: CageSize) {
  return data.cages.filter(
    (c) => (!size || c.size === size) && cageIsFree(data, c.id, checkIn, checkOut),
  );
}

/** The booking occupying a cage on a given night, if any. */
export function occupantOn(data: HotelData, cageId: string, night: ISODate) {
  return data.bookings.find(
    (b) => b.cageId === cageId && holdsCage(b) && b.checkIn <= night && night < b.checkOut,
  );
}

// ---------- money ----------

/** The price of a stay: the nights at the cage's rate, plus add-ons and minus discounts. Never below zero. */
export function bookingTotal(booking: Pick<Booking, "checkIn" | "checkOut"> & { charges?: Pick<Charge, "amount">[] }, cage: Cage | undefined) {
  if (!cage) return 0;
  const base = Math.max(0, nights(booking.checkIn, booking.checkOut)) * cage.pricePerNight;
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
  const live = data.bookings.filter(holdsCage);
  return {
    arriving: live.filter((b) => b.status === "booked" && b.checkIn === today),
    lateArrivals: live.filter((b) => b.status === "booked" && b.checkIn < today),
    leaving: live.filter((b) => b.status === "checked_in" && b.checkOut <= today),
    inHouse: live.filter((b) => b.status === "checked_in"),
    freeTonight: data.cages.filter((c) => !occupantOn(data, c.id, today)).length,
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
    })),
  );
}
