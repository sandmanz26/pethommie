import { addDays, holdsCage, nights } from "./logic";
import type { Booking, HotelData, ISODate } from "./types";

/** The cage calendar: for a window of days, where each stay sits on each cage's row. */

export type CalendarBar = {
  booking: Booking;
  /** First column (0 = the window's first day) and how many nights it covers inside the window. */
  start: number;
  span: number;
  /** The stay began before / ends after the window, so the bar runs off that edge. */
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Stays on one cage inside [from, from + days). A stay covers its nights, so it starts in the check-in
 * column and stops before the check-out day. Cancelled stays aren't shown.
 */
export function calendarBars(data: HotelData, cageId: string, from: ISODate, days: number): CalendarBar[] {
  const end = addDays(from, days);
  return data.bookings
    .filter((b) => b.cageId === cageId && b.status !== "cancelled" && b.checkIn < end && b.checkOut > from)
    .map((booking) => {
      const first = booking.checkIn < from ? from : booking.checkIn;
      const last = booking.checkOut > end ? end : booking.checkOut;
      return {
        booking,
        start: nights(from, first),
        span: nights(first, last),
        continuesBefore: booking.checkIn < from,
        continuesAfter: booking.checkOut > end,
      };
    })
    .sort((a, b) => a.start - b.start);
}

/** Cages that are free the whole of a night, for "how full are we" counts along the top of the calendar. */
export function occupiedCount(data: HotelData, night: ISODate): number {
  return data.cages.filter((c) => data.bookings.some((b) => b.cageId === c.id && holdsCage(b) && b.checkIn <= night && night < b.checkOut)).length;
}
