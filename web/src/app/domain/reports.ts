import { addDays, bookingTotal, countingOf, dayOf, nights, placesFor, stayPetIds } from "./logic";
import { signedAmount } from "./payments";
import type { Booking, BookingSource, Cage, HotelData, ISODate, Owner, PaymentKind, PaymentMethod, Species } from "./types";

/** Numbers for a stretch of days: how full the hotel was, what came in, where it came from, how the guests behave. */

export type PeriodKind = "thisMonth" | "lastMonth" | "last30" | "last90" | "thisYear";
export const PERIOD_KINDS: PeriodKind[] = ["thisMonth", "lastMonth", "last30", "last90", "thisYear"];

/** [from, to): `to` is the first day after the period. */
export type Period = { from: ISODate; to: ISODate };

const monthStart = (date: ISODate) => `${date.slice(0, 7)}-01`;
export const nextMonthStart = (date: ISODate) => addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";

export function periodRange(kind: PeriodKind, today: ISODate): Period {
  if (kind === "last30") return { from: addDays(today, -29), to: addDays(today, 1) };
  if (kind === "last90") return { from: addDays(today, -89), to: addDays(today, 1) };
  if (kind === "thisYear") return { from: `${today.slice(0, 4)}-01-01`, to: `${Number(today.slice(0, 4)) + 1}-01-01` };
  const thisStart = monthStart(today);
  if (kind === "thisMonth") return { from: thisStart, to: nextMonthStart(thisStart) };
  return { from: monthStart(addDays(thisStart, -1)), to: thisStart };
}

/** The same number of days just before, to compare against. */
export function previousPeriod(p: Period): Period {
  const days = Math.max(0, nights(p.from, p.to));
  return { from: addDays(p.from, -days), to: p.from };
}

/** A from/to typed by hand, made safe: dates in order, at most two years, `to` inclusive on screen. */
export function customPeriod(from: ISODate, toInclusive: ISODate): Period {
  const [a, b] = from <= toInclusive ? [from, toInclusive] : [toInclusive, from];
  const to = addDays(b, 1);
  return { from: nights(a, to) > 731 ? addDays(to, -731) : a, to };
}

/** Narrow every number to one unit, or to stays with a pet of one species. */
export type ReportFilter = { unitId: string | "all"; species: Species | "all" };
export const NO_REPORT_FILTER: ReportFilter = { unitId: "all", species: "all" };

export type UnitRow = { cage: Cage; occupiedNights: number; availableNights: number; occupancy: number; stays: number; value: number };
export type SourceRow = { source: BookingSource; stays: number; value: number };
export type SpeciesRow = { species: Species; pets: number; value: number };
export type CustomerRow = { owner: Owner; stays: number; value: number };

export type Report = {
  days: number;
  /** Places with a pet in them, night by night (a cage counts one, a pet in a shared room one). */
  occupiedNights: number;
  /** Place-nights there were: places x days. */
  availableNights: number;
  /** 0 to 1; 0 when there are no places. */
  occupancy: number;
  /** Places in use each day of the period, out of `places`, for a chart. */
  daily: { date: ISODate; occupied: number }[];
  places: number;
  /** Average share of places in use on each weekday, Monday first. null for a weekday not in the period. */
  weekdays: (number | null)[];
  /** Money received in the period, by the day it was recorded, less refunds. */
  received: number;
  byKind: Record<PaymentKind, number>;
  /** Net money in by how it was paid. */
  byMethod: Record<PaymentMethod, number>;
  /** Stays that began in the period, and the price of them. */
  stays: number;
  value: number;
  /** The nights part of that price, and the place-nights it bought: their ratio is the average nightly rate. */
  boarding: number;
  soldNights: number;
  averageRate: number;
  addOns: number;
  /** Discounts given, as a positive number. */
  discounts: number;
  averageNights: number;
  /** Days between a booking being made and the stay starting, on average. null when no stay says when it was made. */
  leadDays: number | null;
  /** Stays that began in the period and were cancelled; how many of those the pet simply never came to. */
  cancelled: number;
  noShows: number;
  /** Of the stays that began in the period, those by an owner who had stayed (or booked) before. */
  repeatStays: number;
  bySource: SourceRow[];
  bySpecies: SpeciesRow[];
  byUnit: UnitRow[];
  /** The five owners whose stays in the period were worth the most. */
  topCustomers: CustomerRow[];
};

const live = (b: Booking) => b.status !== "cancelled";
const METHODS: PaymentMethod[] = ["cash", "qris", "transfer", "ewallet", "card"];
const SOURCES: BookingSource[] = ["walk_in", "whatsapp", "instagram", "link", "referral", "other"];
const SPECIES: Species[] = ["cat", "dog", "rabbit", "other"];

const startsIn = (b: Booking, p: Period) => b.checkIn >= p.from && b.checkIn < p.to;

/** Whether a stay is one the filter keeps. */
export function matchesFilter(data: HotelData, b: Booking, f: ReportFilter): boolean {
  if (f.unitId !== "all" && b.cageId !== f.unitId) return false;
  if (f.species === "all") return true;
  return stayPetIds(b).some((id) => data.pets.find((p) => p.id === id)?.species === f.species);
}

/** Monday 0 … Sunday 6. */
const weekday = (date: ISODate) => {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
};

export function reportFor(data: HotelData, p: Period, filter: ReportFilter = NO_REPORT_FILTER): Report {
  const days = Math.max(0, nights(p.from, p.to));
  // Units in use, and archived ones that still had stays in the period.
  const inPeriod = (id: string) => data.bookings.some((b) => b.cageId === id && b.status !== "cancelled" && b.checkIn < p.to && p.from < b.checkOut);
  const known = data.cages.filter((c) => !c.archived || inPeriod(c.id));
  const cages = filter.unitId === "all" ? known : known.filter((c) => c.id === filter.unitId);
  const cageOf = (b: Booking) => data.cages.find((c) => c.id === b.cageId);
  const kept = data.bookings.filter((b) => matchesFilter(data, b, filter));
  const liveKept = kept.filter(live);
  const stays = liveKept.filter((b) => startsIn(b, p));
  const ownerOf = (b: Booking) => data.pets.find((x) => x.id === b.petId)?.ownerId;

  // ----- occupancy, place by place -----
  const capacityOf = (c: Cage) => Math.max(1, c.capacity);
  const places = cages.reduce((n, c) => n + capacityOf(c), 0);
  const usedBy = new Map(cages.map((c) => [c.id, Array<number>(days).fill(0)]));
  for (const b of liveKept) {
    const row = usedBy.get(b.cageId);
    if (!row) continue;
    const n = placesFor(b, cageOf(b));
    const first = Math.max(0, nights(p.from, b.checkIn));
    const last = Math.min(days, nights(p.from, b.checkOut));
    for (let i = first; i < last; i++) row[i] += n;
  }
  // A room can't hold more than its places, whatever the records say.
  for (const c of cages) usedBy.set(c.id, usedBy.get(c.id)!.map((n) => Math.min(n, capacityOf(c))));
  const daily = Array.from({ length: days }, (_, i) => ({ date: addDays(p.from, i), occupied: cages.reduce((n, c) => n + usedBy.get(c.id)![i], 0) }));
  const occupiedNights = daily.reduce((n, d) => n + d.occupied, 0);
  const availableNights = places * days;

  const wdSum = Array<number>(7).fill(0);
  const wdCount = Array<number>(7).fill(0);
  for (const d of daily) {
    const w = weekday(d.date);
    wdSum[w] += places ? d.occupied / places : 0;
    wdCount[w] += 1;
  }

  // ----- money in -----
  const byKind: Record<PaymentKind, number> = { deposit: 0, payment: 0, refund: 0 };
  const byMethod = Object.fromEntries(METHODS.map((m) => [m, 0])) as Record<PaymentMethod, number>;
  for (const x of kept.flatMap((b) => b.payments)) {
    if (Number.isNaN(Date.parse(x.at))) continue;
    const day = dayOf(x.at);
    if (day < p.from || day >= p.to) continue;
    byKind[x.kind] += x.amount;
    byMethod[x.method] += signedAmount(x);
  }

  // ----- the stays that began -----
  const valueOf = (b: Booking) => bookingTotal(b, cageOf(b), countingOf(data));
  const value = stays.reduce((sum, b) => sum + valueOf(b), 0);
  const charges = stays.flatMap((b) => b.charges);
  const addOns = charges.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0);
  const discounts = -charges.filter((c) => c.amount < 0).reduce((s, c) => s + c.amount, 0);
  const boarding = stays.reduce((sum, b) => sum + bookingTotal({ ...b, charges: [] }, cageOf(b), countingOf(data)), 0);
  const soldNights = stays.reduce((n, b) => n + Math.max(0, nights(b.checkIn, b.checkOut)) * placesFor(b, cageOf(b)), 0);

  const leads = stays.filter((b) => !Number.isNaN(Date.parse(b.createdAt))).map((b) => Math.max(0, nights(dayOf(b.createdAt), b.checkIn)));

  const repeatStays = stays.filter((b) => {
    const owner = ownerOf(b);
    return owner !== undefined && data.bookings.some((o) => o.id !== b.id && live(o) && ownerOf(o) === owner && (o.checkIn < b.checkIn || (o.checkIn === b.checkIn && o.createdAt < b.createdAt)));
  }).length;

  const bySource = SOURCES.map((source) => {
    const of = stays.filter((b) => b.source === source);
    return { source, stays: of.length, value: of.reduce((s, b) => s + valueOf(b), 0) };
  }).filter((r) => r.stays > 0);

  const bySpecies = SPECIES.map((species) => {
    let pets = 0;
    let worth = 0;
    for (const b of stays) {
      const ids = stayPetIds(b);
      const mine = ids.filter((id) => data.pets.find((x) => x.id === id)?.species === species).length;
      pets += mine;
      worth += ids.length ? (valueOf(b) * mine) / ids.length : 0;
    }
    return { species, pets, value: Math.round(worth) };
  }).filter((r) => r.pets > 0);

  const byUnit = cages.map((cage) => {
    const used = usedBy.get(cage.id)!.reduce((a, n) => a + n, 0);
    const avail = capacityOf(cage) * days;
    const of = stays.filter((b) => b.cageId === cage.id);
    return { cage, occupiedNights: used, availableNights: avail, occupancy: avail ? used / avail : 0, stays: of.length, value: of.reduce((s, b) => s + valueOf(b), 0) };
  });

  const perOwner = new Map<string, CustomerRow>();
  for (const b of stays) {
    const owner = data.owners.find((o) => o.id === ownerOf(b));
    if (!owner) continue;
    const row = perOwner.get(owner.id) ?? { owner, stays: 0, value: 0 };
    row.stays += 1;
    row.value += valueOf(b);
    perOwner.set(owner.id, row);
  }

  return {
    days,
    occupiedNights,
    availableNights,
    occupancy: availableNights ? occupiedNights / availableNights : 0,
    daily,
    places,
    weekdays: wdSum.map((s, i) => (wdCount[i] ? s / wdCount[i] : null)),
    received: byKind.deposit + byKind.payment - byKind.refund,
    byKind,
    byMethod,
    stays: stays.length,
    value,
    boarding,
    soldNights,
    averageRate: soldNights ? boarding / soldNights : 0,
    addOns,
    discounts,
    averageNights: stays.length ? stays.reduce((n, b) => n + nights(b.checkIn, b.checkOut), 0) / stays.length : 0,
    leadDays: leads.length ? leads.reduce((a, n) => a + n, 0) / leads.length : null,
    cancelled: kept.filter((b) => b.status === "cancelled" && startsIn(b, p)).length,
    noShows: kept.filter((b) => b.status === "cancelled" && b.cancelReason === "no_show" && startsIn(b, p)).length,
    repeatStays,
    bySource: bySource.sort((a, b) => b.stays - a.stays || b.value - a.value),
    bySpecies: bySpecies.sort((a, b) => b.pets - a.pets),
    byUnit,
    topCustomers: [...perOwner.values()].sort((a, b) => b.value - a.value || b.stays - a.stays || a.owner.name.localeCompare(b.owner.name)).slice(0, 5),
  };
}

/** Change against a previous value, as a fraction; null when there is nothing to compare to. */
export const change = (now: number, before: number): number | null => (before > 0 ? (now - before) / before : null);
