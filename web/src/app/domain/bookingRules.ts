import { cageIsFree, holdsCage, involvesPet, overlaps, placesFor, stayPetIds } from "./logic";
import type { Booking, BookingStatus, HotelData, ISODate } from "./types";

/**
 * Business rules about bookings and cages. Pure functions over HotelData, so the UI forms, the
 * store and (later) a backend all apply the same rules.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Problems with where and when a stay happens. */
export type ScheduleIssue = "dates" | "cage" | "cage_taken";
/** Everything that can be wrong with a whole booking. */
export type BookingIssue = ScheduleIssue | "pet" | "companion" | "pet_busy" | "locked";

/** `places`: how many places the stay takes in the unit (see placesFor); 1 if not given. */
export type Schedule = { id?: string; cageId: string; checkIn: ISODate; checkOut: ISODate; places?: number };

/** Dates must be real calendar days with check-out after check-in; the cage must exist and be free. */
export function scheduleIssues(data: HotelData, s: Schedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const datesOk = ISO_DATE.test(s.checkIn) && ISO_DATE.test(s.checkOut) && s.checkOut > s.checkIn;
  if (!datesOk) issues.push("dates");
  if (!data.cages.some((c) => c.id === s.cageId && !c.archived)) issues.push("cage");
  else if (datesOk && !cageIsFree(data, s.cageId, s.checkIn, s.checkOut, s.id, s.places ?? 1)) issues.push("cage_taken");
  return issues;
}

const datesAreReal = (b: Pick<Booking, "checkIn" | "checkOut">) => ISO_DATE.test(b.checkIn) && ISO_DATE.test(b.checkOut) && b.checkOut > b.checkIn;

/** A booking also needs a pet that exists. A cancelled or finished stay no longer holds its cage. */
export function bookingIssues(data: HotelData, b: Booking): BookingIssue[] {
  const issues: BookingIssue[] = scheduleIssues(data, { ...b, places: placesFor(b, data.cages.find((c) => c.id === b.cageId)) });
  const result = holdsCage(b) ? issues : issues.filter((i) => i !== "cage_taken");
  const primary = data.pets.find((p) => p.id === b.petId);
  if (!primary) result.push("pet");
  // Companions share the cage: other pets of the same owner, each listed once.
  const bad = b.companionIds.some((id, i) => id === b.petId || b.companionIds.indexOf(id) !== i || data.pets.find((p) => p.id === id)?.ownerId !== primary?.ownerId);
  if (bad) result.push("companion");
  // A pet can't be in two places: none of the pets may already be in another live stay on those nights.
  if (holdsCage(b) && datesAreReal(b) && data.bookings.some((o) => o.id !== b.id && holdsCage(o) && overlaps(b.checkIn, b.checkOut, o.checkIn, o.checkOut) && stayPetIds(b).some((id) => involvesPet(o, id)))) {
    result.push("pet_busy");
  }
  return result;
}

const NEXT: Record<BookingStatus, readonly BookingStatus[]> = {
  booked: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
};

/** A stay only moves forward: booked → checked in → checked out, or booked → cancelled. */
export function canTransition(from: BookingStatus, to: BookingStatus) {
  return NEXT[from].includes(to);
}

/** A cage with a pending or current stay can't be removed; finished stays don't block it. */
export function cageCanBeRemoved(data: HotelData, cageId: string) {
  return !data.bookings.some((b) => b.cageId === cageId && holdsCage(b));
}

export type BookingPatch = Partial<Pick<Booking, "checkIn" | "checkOut" | "cageId" | "notes" | "companionIds">>;

/**
 * Can this change be made to a stay that already exists? Not once it is finished or cancelled, and not
 * the check-in day once the pet is in. Whatever is left must still pass the usual booking rules.
 */
export function editIssues(data: HotelData, booking: Booking, patch: BookingPatch): BookingIssue[] {
  if (booking.status === "checked_out" || booking.status === "cancelled") return ["locked"];
  if (booking.status === "checked_in" && patch.checkIn !== undefined && patch.checkIn !== booking.checkIn) return ["locked"];
  return bookingIssues(data, { ...booking, ...patch });
}

/**
 * Whether a pet has a history the books depend on: a stay that has started, money on any of its stays, or an
 * invoice. Such a pet can't be removed, or past revenue, receipts and tax would change with it.
 */
export function petHasHistory(s: HotelData, petId: string): boolean {
  const stays = s.bookings.filter((b) => involvesPet(b, petId));
  return stays.some((b) => b.status === "checked_in" || b.status === "checked_out" || b.payments.length > 0) || s.invoices.some((i) => stays.some((b) => b.id === i.bookingId));
}
