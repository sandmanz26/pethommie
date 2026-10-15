import { newId } from "@/app/domain/logic";
import { bookingIssues, canTransition, cageCanBeRemoved, type BookingIssue } from "@/app/domain/bookingRules";
import type { Booking, BookingStatus, Cage, Hotel, HotelData, Owner, Pet } from "@/app/domain/types";

/**
 * Every change to the hotel's data, as a pure function: (state, input) → new state.
 * Rules are enforced here, not only in the forms, so nothing can put the data in a bad state.
 * Functions that can refuse return `{ state, result }` and hand back the same `state` when they do.
 */
export type Outcome<R> = { state: HotelData; result: R };

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export const setHotel = (s: HotelData, hotel: Hotel): HotelData => ({ ...s, hotel });

export const setCages = (s: HotelData, cages: Cage[]): HotelData => ({ ...s, cages });

export const upsertCage = (s: HotelData, cage: Cage): HotelData => ({ ...s, cages: upsert(s.cages, cage) });

/** Refuses (result false) while the cage has a pending or current stay. */
export function removeCage(s: HotelData, id: string): Outcome<boolean> {
  if (!s.cages.some((c) => c.id === id) || !cageCanBeRemoved(s, id)) return { state: s, result: false };
  return { state: { ...s, cages: s.cages.filter((c) => c.id !== id) }, result: true };
}

/** Saves an owner, reusing an existing one with the same WhatsApp number. Returns the owner's id. */
export function upsertOwner(s: HotelData, owner: Omit<Owner, "id"> & { id?: string }): Outcome<string> {
  const existing = owner.whatsapp ? s.owners.find((o) => o.whatsapp === owner.whatsapp && o.id !== owner.id) : undefined;
  const id = owner.id ?? existing?.id ?? newId();
  return { state: { ...s, owners: upsert(s.owners, { ...owner, id }) }, result: id };
}

export const upsertPet = (s: HotelData, pet: Pet): HotelData => ({ ...s, pets: upsert(s.pets, pet) });

/** Removes the pet and its stays. */
export const removePet = (s: HotelData, id: string): HotelData => ({
  ...s,
  pets: s.pets.filter((p) => p.id !== id),
  bookings: s.bookings.filter((b) => b.petId !== id),
});

/** Saves the booking unless it breaks a rule; the issues come back so the caller can say why. */
export function upsertBooking(s: HotelData, booking: Booking): Outcome<BookingIssue[]> {
  const issues = bookingIssues(s, booking);
  if (issues.length) return { state: s, result: issues };
  return { state: { ...s, bookings: upsert(s.bookings, booking) }, result: [] };
}

/** Moves a stay along its life cycle; refuses (result false) any other jump. */
export function changeBookingStatus(s: HotelData, id: string, status: BookingStatus): Outcome<boolean> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || !canTransition(current.status, status)) return { state: s, result: false };
  return { state: { ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }, result: true };
}
