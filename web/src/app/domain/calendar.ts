import { addDays, holdsCage, nights, placesUsed, totalPlaces } from "./logic";
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

/** Places taken on a night across the hotel (a cage counts one), for "how full are we" along the top of the calendar. */
export function occupiedCount(data: HotelData, night: ISODate): number {
  return data.cages.filter((c) => !c.archived).reduce((n, c) => n + Math.min(Math.max(1, c.capacity), placesUsed(data, c.id, night)), 0);
}

/** One day of a hotel without cages or rooms: how many of its places are taken, and by which stays. */
export type PoolDay = { date: ISODate; used: number; total: number; stays: Booking[] };

/**
 * The calendar of a hotel without units: for each day in [from, from + days), the places taken that night against
 * the total capacity, and the stays (booked or staying) holding them.
 */
export function poolDays(data: HotelData, from: ISODate, days: number): PoolDay[] {
  const total = totalPlaces(data);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const stays = data.bookings.filter((b) => holdsCage(b) && b.checkIn <= date && date < b.checkOut);
    return { date, used: occupiedCount(data, date), total, stays };
  });
}
