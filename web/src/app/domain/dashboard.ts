import { addDays, dayOf, holdsCage, stayPetIds, todayBoard, totalPlaces, vaccineState } from "./logic";
import { invoicePayment } from "./invoices";
import { receivables, signedAmount } from "./payments";
import { nextMonthStart, periodRange, reportFor, type Report } from "./reports";
import { taxFor } from "./tax";
import type { Booking, CareEntry, HotelData, ISODate, Invoice, Pet } from "./types";

/** Everything the owner wants at a glance: tonight, this month against last, what's owed, what's coming, what needs doing. */

export const FORECAST_DAYS = 14;
export const MONTHS_SHOWN = 6;

export type MonthMoney = { month: string; received: number };

export type Dashboard = {
  tonight: { occupied: number; places: number };
  arrivingToday: number;
  leavingToday: number;
  inHouse: number;
  lateArrivals: number;
  /** This month so far, and last month up to the same day, so the two can be compared fairly. */
  monthToDate: { received: number; stays: number };
  lastMonthToDate: { received: number; stays: number };
  month: Report;
  /** Money in per month, oldest first, this month last. */
  months: MonthMoney[];
  /** Places booked for each of the next nights, tonight first. */
  forecast: { date: ISODate; occupied: number }[];
  places: number;
  owed: { total: number; stays: number; left: number };
  /** Stays starting within a week (today included), soonest first. */
  arrivingSoon: Booking[];
  /** Pets here or arriving within a week whose vaccination has run out, runs out soon, or isn't on record. */
  vaccineAlerts: Pet[];
  /** Invoices past their due date and not paid in full. */
  overdueInvoices: Invoice[];
  /** Incidents written in the care log in the last 7 days, newest first. */
  incidents: CareEntry[];
  /** This month's tax estimate, or null when the hotel hasn't set up how it is taxed. */
  taxThisMonth: { pph: number; ppn: number; dueOn: ISODate } | null;
};

/** Money received between two days [from, to), less refunds. */
function receivedBetween(data: HotelData, from: ISODate, to: ISODate) {
  return data.bookings
    .flatMap((b) => b.payments)
    .filter((x) => !Number.isNaN(Date.parse(x.at)) && dayOf(x.at) >= from && dayOf(x.at) < to)
    .reduce((s, x) => s + signedAmount(x), 0);
}

const staysBetween = (data: HotelData, from: ISODate, to: ISODate) => data.bookings.filter((b) => b.status !== "cancelled" && b.checkIn >= from && b.checkIn < to).length;

export function dashboardFor(data: HotelData, today: ISODate): Dashboard {
  const board = todayBoard(data, today);
  const places = totalPlaces(data);
  const thisMonth = periodRange("thisMonth", today);
  const lastMonth = periodRange("lastMonth", today);
  const dayOfMonth = Number(today.slice(8, 10));
  // Last month up to the same day, or its end in a short month.
  const lastCut = [addDays(lastMonth.from, dayOfMonth), lastMonth.to].sort()[0];

  const months: MonthMoney[] = [];
  let start = periodRange("thisMonth", today).from;
  for (let i = 0; i < MONTHS_SHOWN; i++) {
    const end = nextMonthStart(start);
    months.unshift({ month: start.slice(0, 7), received: receivedBetween(data, start, end) });
    start = `${addDays(start, -1).slice(0, 7)}-01`;
  }

  const owedRows = receivables(data);
  const soon = addDays(today, 7);
  const arrivingSoon = data.bookings
    .filter((b) => holdsCage(b) && b.status === "booked" && b.checkIn >= today && b.checkIn < soon)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const watched = [...board.inHouse, ...board.lateArrivals, ...arrivingSoon];
  const petIds = [...new Set(watched.flatMap(stayPetIds))];
  const vaccineAlerts = petIds
    .map((id) => data.pets.find((p) => p.id === id))
    .filter((p): p is Pet => p !== undefined && vaccineState(p, today) !== "ok")
    .sort((a, b) => (a.vaccineExpiry || "0").localeCompare(b.vaccineExpiry || "0"));

  const overdueInvoices = data.invoices
    .filter((i) => i.status === "issued" && i.dueOn !== null && i.dueOn < today && ["unpaid", "partial"].includes(invoicePayment(data, i)))
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));

  const tax = data.settings.tax;
  const monthTax = tax.regime === "none" && !tax.pkp ? null : taxFor(data, Number(today.slice(0, 4))).months[Number(today.slice(5, 7)) - 1];

  return {
    tonight: { occupied: places - board.freeTonight, places },
    arrivingToday: board.arriving.length,
    leavingToday: board.leaving.length,
    inHouse: board.inHouse.length,
    lateArrivals: board.lateArrivals.length,
    monthToDate: { received: receivedBetween(data, thisMonth.from, addDays(today, 1)), stays: staysBetween(data, thisMonth.from, addDays(today, 1)) },
    lastMonthToDate: { received: receivedBetween(data, lastMonth.from, lastCut), stays: staysBetween(data, lastMonth.from, lastCut) },
    month: reportFor(data, thisMonth),
    months,
    // Stays that have ended early no longer hold their place.
    forecast: reportFor({ ...data, bookings: data.bookings.filter(holdsCage) }, { from: today, to: addDays(today, FORECAST_DAYS) }).daily,
    places,
    owed: { total: owedRows.reduce((s, r) => s + r.balance, 0), stays: owedRows.length, left: owedRows.filter((r) => r.group === "left").length },
    arrivingSoon,
    vaccineAlerts,
    overdueInvoices,
    incidents: data.careLog.filter((e) => e.kind === "incident" && dayOf(e.at) > addDays(today, -7) && dayOf(e.at) <= today).sort((a, b) => b.at.localeCompare(a.at)),
    taxThisMonth: monthTax ? { pph: monthTax.pph, ppn: monthTax.ppn, dueOn: monthTax.dueOn } : null,
  };
}
