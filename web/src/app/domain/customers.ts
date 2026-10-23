import { bookingTotal, countingOf, nights } from "./logic";
import { balanceDue, paidAmount } from "./payments";
import type { Booking, HotelData, ISODate, Owner, Pet } from "./types";

/** Who comes to the hotel: each owner with their pets and what they have done and owe. */
export type Customer = {
  owner: Owner;
  pets: Pet[];
  /** Stays that were not cancelled. */
  stays: number;
  nights: number;
  lastCheckOut: ISODate | null;
  /** The first stay's check-in: when they became a customer. */
  firstCheckIn: ISODate | null;
  /** Everything they have paid. */
  paid: number;
  /** Still owed on stays that are not cancelled and have already started. */
  owed: number;
};

const counts = (b: Booking) => b.status !== "cancelled";

export function customerOf(data: HotelData, owner: Owner): Customer {
  const pets = data.pets.filter((p) => p.ownerId === owner.id);
  const ids = new Set(pets.map((p) => p.id));
  const bookings = data.bookings.filter((b) => ids.has(b.petId) && counts(b));
  const cage = (b: Booking) => data.cages.find((c) => c.id === b.cageId);
  return {
    owner,
    pets,
    stays: bookings.length,
    nights: bookings.reduce((n, b) => n + nights(b.checkIn, b.checkOut), 0),
    lastCheckOut: bookings.reduce<ISODate | null>((last, b) => (last === null || b.checkOut > last ? b.checkOut : last), null),
    firstCheckIn: bookings.reduce<ISODate | null>((first, b) => (first === null || b.checkIn < first ? b.checkIn : first), null),
    paid: bookings.reduce((sum, b) => sum + paidAmount(b), 0),
    owed: bookings.filter((b) => b.status !== "booked").reduce((sum, b) => sum + balanceDue(b, cage(b), countingOf(data)), 0),
  };
}

/** Everyone, most recent guests first, then alphabetically. */
export function customers(data: HotelData): Customer[] {
  return data.owners
    .map((o) => customerOf(data, o))
    .sort((a, b) => (b.lastCheckOut ?? "").localeCompare(a.lastCheckOut ?? "") || a.owner.name.localeCompare(b.owner.name));
}

/** Case- and punctuation-insensitive match on the owner's name, WhatsApp number or any pet's name. */
export function matchesCustomer(c: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    c.owner.name.toLowerCase().includes(q) ||
    (digits.length > 2 && c.owner.whatsapp.includes(digits.replace(/^0/, "62"))) ||
    c.pets.some((p) => p.name.toLowerCase().includes(q))
  );
}

/** A stay's total, for lists that show it beside what was paid. */
export const stayTotal = (data: HotelData, b: Booking) => bookingTotal(b, data.cages.find((c) => c.id === b.cageId), countingOf(data));
