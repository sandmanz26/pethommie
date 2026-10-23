import { addDays, bookingTotal, countingOf, dayOf } from "./logic";
import { toCsv } from "./csv";
import type { HotelData, ISODate, TaxProfile } from "./types";

/**
 * Tax figures for the hotel: turnover by month, the estimated PPh final (0.5% scheme for small businesses), and
 * the VAT on invoices for a hotel that is a VAT payer (PKP). All of it is an ESTIMATE to hand to an accountant;
 * none of it is a filing. The rules are those found on `TAX_RULES_AS_OF` (see docs/product/pajak.md): PP 55/2022
 * as changed by PP 20/2026.
 */

export const TAX_RULES_AS_OF: ISODate = "2026-10-20";
/** Gross turnover per year above which the 0.5% scheme no longer applies. */
export const FINAL_SCHEME_CEILING = 4_800_000_000;
/** The first part of a year's turnover an individual does not pay PPh on under the scheme. */
export const INDIVIDUAL_EXEMPT_TURNOVER = 500_000_000;
export const FINAL_RATE = 0.005;
/** Where the page starts to warn that the ceiling is near. */
export const NEAR_CEILING = 0.8;

export type MonthTax = {
  /** 1 to 12 */
  month: number;
  /** Money received in the month, without VAT. */
  turnoverCash: number;
  /** Stays finished in the month, at their price, without VAT. */
  turnoverAccrual: number;
  /** Whichever of the two the hotel's settings call its turnover. */
  turnover: number;
  /** Turnover since January, this month included. */
  cumulative: number;
  /** The part of this month's turnover that PPh is worked out on. */
  taxable: number;
  /** Estimated PPh final for the month; 0 unless the final scheme is chosen. */
  pph: number;
  /** The date to pay it by: the 15th of the next month. */
  dueOn: ISODate;
  /** VAT, from the invoices issued in the month. */
  ppnBase: number;
  ppn: number;
  invoices: number;
};

export type YearTax = {
  year: number;
  months: MonthTax[];
  turnover: number;
  pph: number;
  ppnBase: number;
  ppn: number;
  /** Share of the Rp4.8 billion ceiling used by the year's turnover, 0 to beyond 1. */
  ceilingUsed: number;
  ceiling: "ok" | "near" | "over";
};

/** What a price or payment is without VAT, for a hotel that charges it. */
const withoutTax = (amount: number, tax: TaxProfile) => (tax.pkp && tax.ppnPercent > 0 ? amount / (1 + tax.ppnPercent / 100) : amount);

const monthOf = (iso: string, year: number): number | null => {
  if (Number.isNaN(Date.parse(iso))) return null;
  const day = iso.length === 10 ? iso : dayOf(iso);
  return Number(day.slice(0, 4)) === year ? Number(day.slice(5, 7)) : null;
};

export const dueDateFor = (year: number, month: number): ISODate => addDays(`${year}-${String(month).padStart(2, "0")}-28`, 4).slice(0, 7) + "-15";

export function taxFor(data: HotelData, year: number): YearTax {
  const tax = data.settings.tax;
  const cash = Array<number>(12).fill(0);
  const accrual = Array<number>(12).fill(0);
  const base = Array<number>(12).fill(0);
  const ppn = Array<number>(12).fill(0);
  const count = Array<number>(12).fill(0);

  for (const b of data.bookings) {
    for (const p of b.payments) {
      const m = monthOf(p.at, year);
      if (m) cash[m - 1] += withoutTax(p.kind === "refund" ? -p.amount : p.amount, tax);
    }
    if (b.status === "checked_out") {
      const m = monthOf(b.checkOut, year);
      if (m) accrual[m - 1] += tax.pricesIncludeTax ? withoutTax(bookingTotal(b, data.cages.find((c) => c.id === b.cageId), countingOf(data)), tax) : bookingTotal(b, data.cages.find((c) => c.id === b.cageId), countingOf(data));
    }
  }
  for (const i of data.invoices) {
    if (i.status !== "issued") continue;
    const m = monthOf(i.issuedOn, year);
    if (!m) continue;
    base[m - 1] += i.subtotal;
    ppn[m - 1] += i.taxAmount;
    count[m - 1] += 1;
  }

  const exempt = tax.regime === "final_umkm" && tax.taxpayer === "individual" ? INDIVIDUAL_EXEMPT_TURNOVER : 0;
  let cumulative = 0;
  const months: MonthTax[] = Array.from({ length: 12 }, (_, i) => {
    const turnoverCash = Math.round(cash[i]);
    const turnoverAccrual = Math.round(accrual[i]);
    const turnover = tax.basis === "cash" ? turnoverCash : turnoverAccrual;
    const before = cumulative;
    cumulative += turnover;
    const taxable = Math.max(0, cumulative - exempt) - Math.max(0, before - exempt);
    return {
      month: i + 1,
      turnoverCash,
      turnoverAccrual,
      turnover,
      cumulative,
      taxable,
      pph: tax.regime === "final_umkm" ? Math.round(taxable * FINAL_RATE) : 0,
      dueOn: dueDateFor(year, i + 1),
      ppnBase: base[i],
      ppn: ppn[i],
      invoices: count[i],
    };
  });

  const ceilingUsed = cumulative / FINAL_SCHEME_CEILING;
  return {
    year,
    months,
    turnover: cumulative,
    pph: months.reduce((s, m) => s + m.pph, 0),
    ppnBase: months.reduce((s, m) => s + m.ppnBase, 0),
    ppn: months.reduce((s, m) => s + m.ppn, 0),
    ceilingUsed,
    ceiling: ceilingUsed >= 1 ? "over" : ceilingUsed >= NEAR_CEILING ? "near" : "ok",
  };
}

/** One row per month, for an accountant's spreadsheet. */
export function taxCsv(year: YearTax, tax: TaxProfile): string {
  const header = ["month", "turnover_cash", "turnover_accrual", "turnover_used", "cumulative", "taxable_for_pph", "pph_final_estimate", "pay_by", "ppn_base", "ppn", "invoices", "basis", "regime"];
  const rows = year.months.map((m) => [
    `${year.year}-${String(m.month).padStart(2, "0")}`,
    String(m.turnoverCash),
    String(m.turnoverAccrual),
    String(m.turnover),
    String(m.cumulative),
    String(m.taxable),
    String(m.pph),
    m.dueOn,
    String(m.ppnBase),
    String(m.ppn),
    String(m.invoices),
    tax.basis,
    tax.regime,
  ]);
  return toCsv([header, ...rows]);
}
