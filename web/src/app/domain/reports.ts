import { addDays, bookingTotal, dayOf, nights } from "./logic";
import type { Booking, HotelData, ISODate } from "./types";

/** Numbers for a stretch of days: how full the hotel was, what came in, how the guests behave. */

export type PeriodKind = "thisMonth" | "lastMonth" | "last30";

/** [from, to): `to` is the first day after the period. */
export type Period = { from: ISODate; to: ISODate };

const monthStart = (date: ISODate) => `${date.slice(0, 7)}-01`;
const nextMonthStart = (date: ISODate) => addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";

export function periodRange(kind: PeriodKind, today: ISODate): Period {
  if (kind === "last30") return { from: addDays(today, -29), to: addDays(today, 1) };
  const thisStart = monthStart(today);
  if (kind === "thisMonth") return { from: thisStart, to: nextMonthStart(thisStart) };
  return { from: monthStart(addDays(thisStart, -1)), to: thisStart };
}

export type Report = {
  days: number;
  /** Cage-nights that had a pet in them (a stay that is not cancelled counts for each night inside the period). */
  occupiedNights: number;
  /** Cage-nights there were: cages x days. */
  availableNights: number;
  /** 0 to 1; 0 when there are no cages. */
  occupancy: number;
  /** Cages in use each day of the period, for a chart. */
  daily: { date: ISODate; occupied: number }[];
  /** Money received in the period, by the day it was recorded. */
  received: number;
  /** Stays that began in the period, and the price of them. */
  stays: number;
  value: number;
  averageNights: number;
  /** Stays that began in the period and were cancelled. */
  cancelled: number;
  /** Of the stays that began in the period, those by an owner who had stayed (or booked) before. */
  repeatStays: number;
};

const live = (b: Booking) => b.status !== "cancelled";

export function reportFor(data: HotelData, p: Period): Report {
  const days = Math.max(0, nights(p.from, p.to));
  const stays = data.bookings.filter((b) => live(b) && b.checkIn >= p.from && b.checkIn < p.to);
  const ownerOf = (b: Booking) => data.pets.find((x) => x.id === b.petId)?.ownerId;

  const daily = Array.from({ length: days }, (_, i) => {
    const date = addDays(p.from, i);
    return { date, occupied: data.cages.filter((c) => data.bookings.some((b) => b.cageId === c.id && live(b) && b.checkIn <= date && date < b.checkOut)).length };
  });
  const occupiedNights = daily.reduce((n, d) => n + d.occupied, 0);
  const availableNights = data.cages.length * days;

  const received = data.bookings
    .flatMap((b) => b.payments)
    .filter((x) => !Number.isNaN(Date.parse(x.at)) && dayOf(x.at) >= p.from && dayOf(x.at) < p.to)
    .reduce((sum, x) => sum + x.amount, 0);

  const repeatStays = stays.filter((b) => {
    const owner = ownerOf(b);
    return owner !== undefined && data.bookings.some((o) => o.id !== b.id && live(o) && ownerOf(o) === owner && (o.checkIn < b.checkIn || (o.checkIn === b.checkIn && o.createdAt < b.createdAt)));
  }).length;

  return {
    days,
    occupiedNights,
    availableNights,
    occupancy: availableNights ? occupiedNights / availableNights : 0,
    daily,
    received,
    stays: stays.length,
    value: stays.reduce((sum, b) => sum + bookingTotal(b, data.cages.find((c) => c.id === b.cageId)), 0),
    averageNights: stays.length ? stays.reduce((n, b) => n + nights(b.checkIn, b.checkOut), 0) / stays.length : 0,
    cancelled: data.bookings.filter((b) => b.status === "cancelled" && b.checkIn >= p.from && b.checkIn < p.to).length,
    repeatStays,
  };
}

