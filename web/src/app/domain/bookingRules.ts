import { cageIsFree, holdsCage } from "./logic";
import type { Booking, BookingStatus, HotelData, ISODate } from "./types";

/**
 * Business rules about bookings and cages. Pure functions over HotelData, so the UI forms, the
 * store and (later) a backend all apply the same rules.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Problems with where and when a stay happens. */
export type ScheduleIssue = "dates" | "cage" | "cage_taken";
/** Everything that can be wrong with a whole booking. */
export type BookingIssue = ScheduleIssue | "pet" | "locked";

export type Schedule = { id?: string; cageId: string; checkIn: ISODate; checkOut: ISODate };

/** Dates must be real calendar days with check-out after check-in; the cage must exist and be free. */
export function scheduleIssues(data: HotelData, s: Schedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const datesOk = ISO_DATE.test(s.checkIn) && ISO_DATE.test(s.checkOut) && s.checkOut > s.checkIn;
  if (!datesOk) issues.push("dates");
  if (!data.cages.some((c) => c.id === s.cageId)) issues.push("cage");
  else if (datesOk && !cageIsFree(data, s.cageId, s.checkIn, s.checkOut, s.id)) issues.push("cage_taken");
  return issues;
}

/** A booking also needs a pet that exists. A cancelled or finished stay no longer holds its cage. */
export function bookingIssues(data: HotelData, b: Booking): BookingIssue[] {
  const issues: BookingIssue[] = scheduleIssues(data, b);
  const result = holdsCage(b) ? issues : issues.filter((i) => i !== "cage_taken");
  if (!data.pets.some((p) => p.id === b.petId)) result.push("pet");
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

export type BookingPatch = Partial<Pick<Booking, "checkIn" | "checkOut" | "cageId" | "notes">>;

/**
 * Can this change be made to a stay that already exists? Not once it is finished or cancelled, and not
 * the check-in day once the pet is in. Whatever is left must still pass the usual booking rules.
 */
export function editIssues(data: HotelData, booking: Booking, patch: BookingPatch): BookingIssue[] {
  if (booking.status === "checked_out" || booking.status === "cancelled") return ["locked"];
  if (booking.status === "checked_in" && patch.checkIn !== undefined && patch.checkIn !== booking.checkIn) return ["locked"];
  return bookingIssues(data, { ...booking, ...patch });
}
