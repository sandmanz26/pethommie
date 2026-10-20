import { toCsv } from "./csv";
import { invoicePayment, petNames } from "./invoices";
import { dayOf, nights } from "./logic";
import { paidAmount, signedAmount } from "./payments";
import type { Period } from "./reports";
import type { Booking, HotelData, ISODate, Invoice, Owner, Payment, PaymentKind, PaymentMethod } from "./types";

/** Every payment as a line in a cash book: when, who, how, and a receipt number to quote. */

export type Transaction = { booking: Booking; payment: Payment; owner: Owner | undefined; pets: string; receipt: string };

const valid = (p: Payment) => !Number.isNaN(Date.parse(p.at));

/**
 * KW-20261020-03: the day it was received, and its place among that day's payments (by time, then id). The same
 * payment keeps its number as long as no earlier one is added to that day afterwards.
 */
export function receiptNumbers(data: HotelData): Map<string, string> {
  const byDay = new Map<string, Payment[]>();
  for (const p of data.bookings.flatMap((b) => b.payments)) {
    if (!valid(p)) continue;
    const day = dayOf(p.at);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  const numbers = new Map<string, string>();
  for (const [day, list] of byDay) {
    list.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)).forEach((p, i) => numbers.set(p.id, `KW-${day.replace(/-/g, "")}-${String(i + 1).padStart(2, "0")}`));
  }
  return numbers;
}

export type LedgerFilter = { q: string; method: PaymentMethod | "all"; kind: PaymentKind | "all" };
export const NO_LEDGER_FILTER: LedgerFilter = { q: "", method: "all", kind: "all" };

/** The payments received (or refunded) in a period, newest first. */
export function ledger(data: HotelData, period: Period, f: LedgerFilter = NO_LEDGER_FILTER): Transaction[] {
  const numbers = receiptNumbers(data);
  const needle = f.q.trim().toLowerCase();
  const rows: Transaction[] = [];
  for (const booking of data.bookings) {
    const pet = data.pets.find((p) => p.id === booking.petId);
    const owner = data.owners.find((o) => o.id === pet?.ownerId);
    const pets = petNames(data, booking);
    for (const payment of booking.payments) {
      if (!valid(payment)) continue;
      const day = dayOf(payment.at);
      if (day < period.from || day >= period.to) continue;
      if (f.method !== "all" && payment.method !== f.method) continue;
      if (f.kind !== "all" && payment.kind !== f.kind) continue;
      const receipt = numbers.get(payment.id) ?? "";
      if (needle && ![pets, owner?.name, owner?.whatsapp, payment.reference, payment.note, receipt].some((s) => s?.toLowerCase().includes(needle))) continue;
      rows.push({ booking, payment, owner, pets, receipt });
    }
  }
  return rows.sort((a, b) => b.payment.at.localeCompare(a.payment.at));
}

export type LedgerTotals = { moneyIn: number; refunds: number; net: number; byMethod: Record<PaymentMethod, number>; count: number };

export function ledgerTotals(rows: Transaction[]): LedgerTotals {
  const byMethod: Record<PaymentMethod, number> = { cash: 0, qris: 0, transfer: 0, ewallet: 0, card: 0 };
  let moneyIn = 0;
  let refunds = 0;
  for (const { payment } of rows) {
    byMethod[payment.method] += signedAmount(payment);
    if (payment.kind === "refund") refunds += payment.amount;
    else moneyIn += payment.amount;
  }
  return { moneyIn, refunds, net: moneyIn - refunds, byMethod, count: rows.length };
}

/** One row per payment, for the accountant. Refunds are negative. */
export function ledgerCsv(rows: Transaction[]): string {
  const header = ["receipt", "date", "time", "kind", "method", "amount", "reference", "pets", "owner", "whatsapp", "check_in", "check_out", "note"];
  return toCsv([
    header,
    ...rows.map(({ payment, booking, owner, pets, receipt }) => [
      receipt,
      dayOf(payment.at),
      new Date(payment.at).toTimeString().slice(0, 5),
      payment.kind,
      payment.method,
      String(signedAmount(payment)),
      payment.reference,
      pets,
      owner?.name ?? "",
      owner?.whatsapp ?? "",
      booking.checkIn,
      booking.checkOut,
      payment.note,
    ]),
  ]);
}

// ---------- invoices ----------

/** Where an invoice stands today. overdue: past its due date with money still owed. */
export type InvoiceState = "void" | "paid" | "partial" | "unpaid" | "overdue" | "unknown";

export function invoiceState(data: HotelData, invoice: Invoice, today: ISODate): InvoiceState {
  if (invoice.status === "void") return "void";
  const pay = invoicePayment(data, invoice);
  if (pay === "paid" || pay === "unknown") return pay;
  return invoice.dueOn !== null && invoice.dueOn < today ? "overdue" : pay;
}

/** What is still to be paid on an invoice; nothing on a void one or one whose stay is gone. */
export function invoiceBalance(data: HotelData, invoice: Invoice): number {
  if (invoice.status === "void") return 0;
  const booking = data.bookings.find((b) => b.id === invoice.bookingId);
  return booking ? Math.max(0, invoice.total - paidAmount(booking)) : 0;
}

/** Days an overdue invoice is late; 0 when it isn't. */
export const daysLate = (invoice: Invoice, today: ISODate) => (invoice.dueOn && invoice.dueOn < today ? nights(invoice.dueOn, today) : 0);
