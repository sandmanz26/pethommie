import { addDays, formatDate, holdsCage, nights, placesUsed, totalPlaces } from "./logic";
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
 * column and stops before the check-out day. Cancelled stays aren't shown, nor requests: they hold no place yet.
 */
export function calendarBars(data: HotelData, cageId: string, from: ISODate, days: number): CalendarBar[] {
  const end = addDays(from, days);
  return data.bookings
    .filter((b) => b.cageId === cageId && b.status !== "cancelled" && b.hold !== "request" && b.checkIn < end && b.checkOut > from)
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

/** The calendar shows a week (Monday to Sunday) or a whole month. */
export type CalendarView = "week" | "month";

/** The Monday on or before a day. */
export function startOfWeek(date: ISODate): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
  return addDays(date, -weekday);
}

/** The days the calendar shows for a view around a day: that day's week, or that day's month. */
export function calendarRange(view: CalendarView, anchor: ISODate): { from: ISODate; days: number } {
  if (view === "week") return { from: startOfWeek(anchor), days: 7 };
  const [y, m] = anchor.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  return { from, days: new Date(y, m, 0).getDate() };
}

/** The day to show after moving one week or one month back (-1) or forward (+1). */
export function shiftAnchor(view: CalendarView, anchor: ISODate, step: -1 | 1): ISODate {
  if (view === "week") return addDays(startOfWeek(anchor), 7 * step);
  const [y, m] = anchor.split("-").map(Number);
  const first = new Date(y, m - 1 + step, 1);
  return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Who is around on one day, in one unit (or the whole hotel when cageId is null): arriving, staying over, leaving. */
export type DayStays = { arriving: Booking[]; staying: Booking[]; leaving: Booking[] };

export function dayStays(data: HotelData, cageId: string | null, date: ISODate): DayStays {
  const here = data.bookings.filter((b) => (cageId === null || b.cageId === cageId) && b.status !== "cancelled" && b.hold !== "request");
  const byIn = (a: Booking, b: Booking) => a.checkIn.localeCompare(b.checkIn);
  return {
    arriving: here.filter((b) => b.checkIn === date).sort(byIn),
    staying: here.filter((b) => b.checkIn < date && date < b.checkOut).sort(byIn),
    leaving: here.filter((b) => b.checkOut === date).sort(byIn),
  };
}

/** The title of the range on screen: "19–25 Oct 2026", "28 Sep – 4 Oct 2026", or "October 2026". */
export function rangeTitle(view: CalendarView, from: ISODate, days: number, locale: string): string {
  if (view === "month") return formatDate(from, locale, { month: "long", year: "numeric" });
  const to = addDays(from, days - 1);
  const full = formatDate(to, locale);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${formatDate(from, locale, { day: "numeric" })}–${full}`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${formatDate(from, locale, { day: "numeric", month: "short" })} – ${full}`;
  return `${formatDate(from, locale)} – ${full}`;
}
