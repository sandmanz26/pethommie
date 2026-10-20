import { addDays, holdsCage, involvesPet, stayPetIds, vaccineState } from "./logic";
import { paymentStatus, type PaymentStatus } from "./payments";
import type { Customer } from "./customers";
import type { Booking, BookingSource, HotelData, ISODate, Pet, Species } from "./types";

/** The ways the lists can be narrowed down. Pure, so the pages and their tests share them. */

// ---------- pets ----------

/** Where a pet is with the hotel today: in (and since/until when), coming soon, or neither. */
export type PetStay = { kind: "staying"; booking: Booking } | { kind: "arriving"; booking: Booking } | { kind: "none" };

/** How many days ahead counts as "arriving soon". */
export const ARRIVING_DAYS = 7;

export function petStay(data: HotelData, petId: string, today: ISODate): PetStay {
  const live = data.bookings.filter((b) => holdsCage(b) && involvesPet(b, petId));
  const staying = live.find((b) => b.status === "checked_in");
  if (staying) return { kind: "staying", booking: staying };
  const next = live
    .filter((b) => b.status === "booked" && b.checkOut > today && b.checkIn <= addDays(today, ARRIVING_DAYS))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  return next ? { kind: "arriving", booking: next } : { kind: "none" };
}

export type PetFilter = {
  q: string;
  stay: "all" | "staying" | "arriving" | "none";
  species: Species | "all";
  /** "attention": the vaccine has expired, expires within 30 days, or has no date. */
  vaccine: "all" | "attention";
};

export const NO_PET_FILTER: PetFilter = { q: "", stay: "all", species: "all", vaccine: "all" };

export function filterPets(data: HotelData, pets: Pet[], f: PetFilter, today: ISODate): Pet[] {
  const needle = f.q.trim().toLowerCase();
  return pets.filter((p) => {
    if (f.species !== "all" && p.species !== f.species) return false;
    if (f.vaccine === "attention" && vaccineState(p, today) === "ok") return false;
    if (f.stay !== "all" && petStay(data, p.id, today).kind !== f.stay) return false;
    if (!needle) return true;
    const owner = data.owners.find((o) => o.id === p.ownerId);
    return [p.name, p.breed, owner?.name, owner?.whatsapp].some((s) => s?.toLowerCase().includes(needle));
  });
}

// ---------- bookings ----------

export type BookingFilter = {
  q: string;
  payment: PaymentStatus | "all";
  unitId: string | "all";
  source: BookingSource | "all";
  species: Species | "all";
};

export const NO_BOOKING_FILTER: BookingFilter = { q: "", payment: "all", unitId: "all", source: "all", species: "all" };

export function filterBookings(data: HotelData, bookings: Booking[], f: BookingFilter): Booking[] {
  const needle = f.q.trim().toLowerCase();
  return bookings.filter((b) => {
    if (f.unitId !== "all" && b.cageId !== f.unitId) return false;
    if (f.source !== "all" && b.source !== f.source) return false;
    if (f.payment !== "all" && paymentStatus(b, data.cages.find((c) => c.id === b.cageId)) !== f.payment) return false;
    const pets = stayPetIds(b).map((id) => data.pets.find((p) => p.id === id)).filter((p): p is Pet => Boolean(p));
    if (f.species !== "all" && !pets.some((p) => p.species === f.species)) return false;
    if (!needle) return true;
    const owner = data.owners.find((o) => o.id === pets[0]?.ownerId);
    return [...pets.map((p) => p.name), owner?.name, owner?.whatsapp, b.notes].some((s) => s?.toLowerCase().includes(needle));
  });
}

// ---------- customers ----------

/** owes: money outstanding. regular: 3 stays or more. new: first stay in the last 30 days. inactive: none in 90 days. */
export type CustomerSegment = "all" | "owes" | "regular" | "new" | "inactive";

export function inSegment(c: Customer, segment: CustomerSegment, today: ISODate): boolean {
  switch (segment) {
    case "owes":
      return c.owed > 0;
    case "regular":
      return c.stays >= 3;
    case "new":
      return c.firstCheckIn !== null && c.firstCheckIn >= addDays(today, -30);
    case "inactive":
      return c.lastCheckOut !== null && c.lastCheckOut < addDays(today, -90);
    default:
      return true;
  }
}

export type CustomerSort = "recent" | "spent" | "name" | "owed";

export function sortCustomers(list: Customer[], by: CustomerSort): Customer[] {
  const sorted = [...list];
  if (by === "name") return sorted.sort((a, b) => a.owner.name.localeCompare(b.owner.name));
  if (by === "spent") return sorted.sort((a, b) => b.paid - a.paid || a.owner.name.localeCompare(b.owner.name));
  if (by === "owed") return sorted.sort((a, b) => b.owed - a.owed || a.owner.name.localeCompare(b.owner.name));
  return sorted;
}
