import { bookingTotal, countingOf } from "./logic";
import type { Booking, Cage, HotelData, Payment, StayCounting } from "./types";

/** Money for a stay: what was received, what is still owed, and whether it is settled. */

export type PaymentStatus = "unpaid" | "partial" | "paid";

/** A payment as it counts towards the stay: money in is positive, a refund negative. */
export const signedAmount = (p: Pick<Payment, "amount" | "kind">) => (p.kind === "refund" ? -p.amount : p.amount);

/** Money kept for the stay: everything received, less refunds. */
export const paidAmount = (b: Pick<Booking, "payments">) => b.payments.reduce((sum, p) => sum + signedAmount(p), 0);

type Priced = Pick<Booking, "checkIn" | "checkOut" | "payments" | "charges"> & Partial<Pick<Booking, "petId" | "companionIds">>;

export function balanceDue(b: Priced, cage: Cage | undefined, counting: StayCounting = "nights") {
  return Math.max(0, bookingTotal(b, cage, counting) - paidAmount(b));
}

/** Paid in full, or more. A stay with nothing to pay (no cage on record) counts as paid, not as a debt. */
export function paymentStatus(b: Priced, cage: Cage | undefined, counting: StayCounting = "nights"): PaymentStatus {
  const total = bookingTotal(b, cage, counting);
  const paid = paidAmount(b);
  if (paid >= total) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

/** refund: more given back than the stay has kept. */
export type PaymentIssue = "booking" | "cancelled" | "amount" | "refund";

/** An amount is a whole number of rupiah above zero. */
export const isValidAmount = (amount: number) => Number.isInteger(amount) && amount > 0;

/** Where a stay's unpaid balance stands. `left` is the one to chase: the pet has gone home and money is owed. */
export type Receivable = {
  booking: Booking;
  group: "left" | "staying" | "upcoming";
  total: number;
  paid: number;
  balance: number;
};

const GROUPS: Receivable["group"][] = ["left", "staying", "upcoming"];

/** Every stay with something left to pay, the pets that have gone home first, then those staying, then those still to come. */
export function receivables(data: HotelData): Receivable[] {
  const rows: Receivable[] = [];
  for (const booking of data.bookings) {
    const group = booking.status === "checked_out" ? "left" : booking.status === "checked_in" ? "staying" : booking.status === "booked" ? "upcoming" : null;
    if (!group) continue;
    const cage = data.cages.find((c) => c.id === booking.cageId);
    const balance = balanceDue(booking, cage, countingOf(data));
    if (balance > 0) rows.push({ booking, group, total: bookingTotal(booking, cage, countingOf(data)), paid: paidAmount(booking), balance });
  }
  return rows.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.booking.checkOut.localeCompare(b.booking.checkOut));
}

/** The most recent payments across all stays, newest first. */
export function recentPayments(data: HotelData, limit = 10): { booking: Booking; payment: Payment }[] {
  return data.bookings
    .flatMap((booking) => booking.payments.map((payment) => ({ booking, payment })))
    .filter(({ payment }) => !Number.isNaN(Date.parse(payment.at)))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at))
    .slice(0, limit);
}

