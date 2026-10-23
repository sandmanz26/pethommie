import { toCsv } from "./csv";
import { addDays, bookingTotal, countingOf, dayOf, nights, totalPlaces } from "./logic";
import { paidAmount, signedAmount } from "./payments";
import { nextMonthStart, reportFor } from "./reports";
import { taxFor } from "./tax";
import type { Booking, Expense, ExpenseCategory, HotelData, ISODate } from "./types";

/**
 * The money side of running the hotel: what it costs (expenses), what it earned, and what is left (profit and loss),
 * month by month. Pure, like the rest of the domain. An estimate for the owner, not a set of accounts.
 */

/** "2026-10" */
export type Month = string;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["food", "supplies", "vet", "grooming", "staff", "rent", "utilities", "cleaning", "marketing", "maintenance", "equipment", "fees", "other"];
/** Costs that grow with the guests. The rest are there whether the hotel is full or empty. */
export const DIRECT_COSTS: ExpenseCategory[] = ["food", "supplies", "vet", "grooming"];
export const isDirect = (c: ExpenseCategory) => DIRECT_COSTS.includes(c);

const monthOf = (day: ISODate): Month => day.slice(0, 7);
const firstDay = (m: Month): ISODate => `${m}-01`;
export const nextMonth = (m: Month): Month => nextMonthStart(firstDay(m)).slice(0, 7);
export const previousMonth = (m: Month): Month => addDays(firstDay(m), -1).slice(0, 7);
export const daysIn = (m: Month) => nights(firstDay(m), firstDay(nextMonth(m)));

/** The months from `from` to `to`, both included, oldest first. */
export function monthsBetween(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to && out.length < 240; m = nextMonth(m)) out.push(m);
  return out;
}

export type FinancePeriod = "thisMonth" | "lastMonth" | "last3" | "thisYear" | "last12";
export const FINANCE_PERIODS: FinancePeriod[] = ["thisMonth", "lastMonth", "last3", "thisYear", "last12"];

export function financeMonths(kind: FinancePeriod, today: ISODate): Month[] {
  const now = monthOf(today);
  const back = (n: number) => {
    let m = now;
    for (let i = 0; i < n; i++) m = previousMonth(m);
    return m;
  };
  switch (kind) {
    case "thisMonth":
      return [now];
    case "lastMonth":
      return [back(1)];
    case "last3":
      return monthsBetween(back(2), now);
    case "thisYear":
      return monthsBetween(`${now.slice(0, 4)}-01`, now);
    default:
      return monthsBetween(back(11), now);
  }
}

// ---------- expenses ----------

export type ExpenseIssue = "amount" | "date" | "category";

export function expenseIssues(e: Pick<Expense, "amount" | "date" | "category">): ExpenseIssue[] {
  const issues: ExpenseIssue[] = [];
  if (!Number.isInteger(e.amount) || e.amount <= 0) issues.push("amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date))) issues.push("date");
  if (!EXPENSE_CATEGORIES.includes(e.category)) issues.push("category");
  return issues;
}

export type ExpenseFilter = { q: string; category: ExpenseCategory | "all" };
export const NO_EXPENSE_FILTER: ExpenseFilter = { q: "", category: "all" };

/** A month's expenses, newest first. */
export function expensesIn(data: Pick<HotelData, "expenses">, month: Month, f: ExpenseFilter = NO_EXPENSE_FILTER): Expense[] {
  const needle = f.q.trim().toLowerCase();
  return data.expenses
    .filter((e) => monthOf(e.date) === month && (f.category === "all" || e.category === f.category))
    .filter((e) => !needle || [e.vendor, e.note].some((s) => s.toLowerCase().includes(needle)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
}

export const sumOf = (list: Pick<Expense, "amount">[]) => list.reduce((s, e) => s + e.amount, 0);

/** Totals per category, every category present (0 when none). */
export function byCategory(list: Expense[]): Record<ExpenseCategory, number> {
  const out = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
  for (const e of list) out[e.category] += e.amount;
  return out;
}

/**
 * Last month's recurring costs that aren't in this month yet (matched by category, who it was paid to and the
 * amount), as new expenses on the same day of this month: rent and salaries in one tap.
 */
export function recurringToCopy(data: Pick<HotelData, "expenses">, month: Month): Omit<Expense, "id">[] {
  const prev = previousMonth(month);
  const here = data.expenses.filter((e) => monthOf(e.date) === month);
  const lastDay = daysIn(month);
  return data.expenses
    .filter((e) => e.recurring && monthOf(e.date) === prev)
    .filter((e) => !here.some((h) => h.category === e.category && h.vendor.trim().toLowerCase() === e.vendor.trim().toLowerCase() && h.amount === e.amount))
    .map(({ id: _id, ...e }) => ({ ...e, date: `${month}-${String(Math.min(Number(e.date.slice(8, 10)), lastDay)).padStart(2, "0")}` }));
}

/** One row per expense, for a spreadsheet. */
export function expensesCsv(list: Expense[]): string {
  return toCsv([
    ["date", "category", "kind", "amount", "method", "paid_to", "note", "recurring"],
    ...list.map((e) => [e.date, e.category, isDirect(e.category) ? "direct" : "operating", String(e.amount), e.method, e.vendor, e.note, e.recurring ? "yes" : "no"]),
  ]);
}

// ---------- profit and loss ----------

/** cash: money received in the month. accrual: stays that ended in the month, at their price. */
export type Basis = "cash" | "accrual";

export type Revenue = {
  /** Accrual: the nights of stays that ended in the month. */
  boarding: number;
  addOns: number;
  /** Given as a positive number. */
  discounts: number;
  /** Money kept from stays that were cancelled (that began in the month). */
  cancellationFees: number;
  /** Cash: money received in the month, less refunds. */
  received: number;
  total: number;
};

const cageOf = (data: HotelData, b: Booking) => data.cages.find((c) => c.id === b.cageId);

function revenueFor(data: HotelData, month: Month, basis: Basis): Revenue {
  if (basis === "cash") {
    const received = data.bookings
      .flatMap((b) => b.payments)
      .filter((p) => !Number.isNaN(Date.parse(p.at)) && monthOf(dayOf(p.at)) === month)
      .reduce((s, p) => s + signedAmount(p), 0);
    return { boarding: 0, addOns: 0, discounts: 0, cancellationFees: 0, received, total: received };
  }
  let boarding = 0;
  let addOns = 0;
  let discounts = 0;
  for (const b of data.bookings) {
    if (b.status !== "checked_out" || monthOf(b.checkOut) !== month) continue;
    boarding += bookingTotal({ ...b, charges: [] }, cageOf(data, b), countingOf(data));
    for (const c of b.charges) {
      if (c.amount > 0) addOns += c.amount;
      else discounts -= c.amount;
    }
  }
  const cancellationFees = data.bookings.filter((b) => b.status === "cancelled" && monthOf(b.checkIn) === month).reduce((s, b) => s + Math.max(0, paidAmount(b)), 0);
  return { boarding, addOns, discounts, cancellationFees, received: 0, total: Math.max(0, boarding + addOns - discounts) + cancellationFees };
}

export type MonthResult = { month: Month; revenue: number; direct: number; operating: number; expenses: number; profit: number };

export type ProfitLoss = {
  months: MonthResult[];
  basis: Basis;
  revenue: Revenue;
  byCategory: Record<ExpenseCategory, number>;
  direct: number;
  operating: number;
  expenses: number;
  /** Revenue less direct costs. */
  grossProfit: number;
  /** Gross profit less operating costs. */
  netProfit: number;
  /** Net profit as a share of revenue; null without revenue. */
  margin: number | null;
  /** The PPh final estimate for these months (0 unless the hotel is on the final scheme), and what is left after it. */
  taxEstimate: number;
  afterTax: number;
  /** Place-nights sold in these months, and money and costs per place-night. */
  occupiedNights: number;
  revenuePerNight: number | null;
  costPerNight: number | null;
  directPerNight: number | null;
  /**
   * How many place-nights a month cover all the costs: the month's operating costs over what each night leaves after
   * its direct costs; and that as a share of the places there are. null when a night doesn't cover its own costs.
   */
  breakEven: { nightsPerMonth: number; occupancy: number | null } | null;
  /** Place-nights actually sold per month, to set beside it. */
  nightsPerMonth: number;
};

export function profitLoss(data: HotelData, months: Month[], basis: Basis): ProfitLoss {
  const revs = months.map((m) => revenueFor(data, m, basis));
  const sum = (k: keyof Revenue) => revs.reduce((s, r) => s + r[k], 0);
  const revenue: Revenue = { boarding: sum("boarding"), addOns: sum("addOns"), discounts: sum("discounts"), cancellationFees: sum("cancellationFees"), received: sum("received"), total: sum("total") };
  const spent = data.expenses.filter((e) => months.includes(monthOf(e.date)));
  const cats = byCategory(spent);
  const direct = DIRECT_COSTS.reduce((s, c) => s + cats[c], 0);
  const expenses = sumOf(spent);
  const operating = expenses - direct;

  const monthly: MonthResult[] = months.map((m, i) => {
    const of = spent.filter((e) => monthOf(e.date) === m);
    const d = sumOf(of.filter((e) => isDirect(e.category)));
    const all = sumOf(of);
    return { month: m, revenue: revs[i].total, direct: d, operating: all - d, expenses: all, profit: revs[i].total - all };
  });

  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
  const tax = years.map((y) => taxFor(data, y));
  const taxEstimate = months.reduce((s, m) => s + (tax.find((t) => t.year === Number(m.slice(0, 4)))?.months[Number(m.slice(5, 7)) - 1].pph ?? 0), 0);

  const occupiedNights = months.length ? reportFor(data, { from: firstDay(months[0]), to: firstDay(nextMonth(months[months.length - 1])) }).occupiedNights : 0;
  const per = (x: number) => (occupiedNights ? x / occupiedNights : null);
  const revenuePerNight = per(revenue.total);
  const directPerNight = per(direct);
  const contribution = revenuePerNight !== null && directPerNight !== null ? revenuePerNight - directPerNight : 0;
  const fixedPerMonth = months.length ? operating / months.length : 0;
  const nightsNeeded = contribution > 0 ? fixedPerMonth / contribution : null;
  const placeNightsPerMonth = totalPlaces(data) * (months.length ? months.reduce((s, m) => s + daysIn(m), 0) / months.length : 30);

  const grossProfit = revenue.total - direct;
  const netProfit = grossProfit - operating;
  return {
    months: monthly,
    basis,
    revenue,
    byCategory: cats,
    direct,
    operating,
    expenses,
    grossProfit,
    netProfit,
    margin: revenue.total > 0 ? netProfit / revenue.total : null,
    taxEstimate,
    afterTax: netProfit - taxEstimate,
    occupiedNights,
    revenuePerNight,
    costPerNight: per(expenses),
    directPerNight,
    breakEven: nightsNeeded === null ? null : { nightsPerMonth: nightsNeeded, occupancy: placeNightsPerMonth ? nightsNeeded / placeNightsPerMonth : null },
    nightsPerMonth: months.length ? occupiedNights / months.length : 0,
  };
}

/** The profit and loss as a spreadsheet: the summary, each category, and month by month. */
export function profitLossCsv(pl: ProfitLoss): string {
  const n = (x: number) => String(Math.round(x));
  const rows: string[][] = [
    ["line", "amount"],
    ["basis", pl.basis],
    ...(pl.basis === "cash"
      ? [["revenue_received", n(pl.revenue.received)]]
      : [
          ["revenue_boarding", n(pl.revenue.boarding)],
          ["revenue_add_ons", n(pl.revenue.addOns)],
          ["revenue_discounts", n(-pl.revenue.discounts)],
          ["revenue_cancellation_fees", n(pl.revenue.cancellationFees)],
        ]),
    ["revenue_total", n(pl.revenue.total)],
    ...DIRECT_COSTS.map((c) => [`direct_${c}`, n(-pl.byCategory[c])]),
    ["gross_profit", n(pl.grossProfit)],
    ...EXPENSE_CATEGORIES.filter((c) => !isDirect(c)).map((c) => [`operating_${c}`, n(-pl.byCategory[c])]),
    ["net_profit", n(pl.netProfit)],
    ["pph_final_estimate", n(-pl.taxEstimate)],
    ["after_tax", n(pl.afterTax)],
    [],
    ["month", "revenue", "direct_costs", "operating_costs", "profit"],
    ...pl.months.map((m) => [m.month, n(m.revenue), n(m.direct), n(m.operating), n(m.profit)]),
  ];
  return toCsv(rows);
}
