import { bookingTotal } from "./logic";
import type { Booking, Cage } from "./types";

/** Money for a stay: what was received, what is still owed, and whether it is settled. */

export type PaymentStatus = "unpaid" | "partial" | "paid";

export const paidAmount = (b: Pick<Booking, "payments">) => b.payments.reduce((sum, p) => sum + p.amount, 0);

export function balanceDue(b: Pick<Booking, "checkIn" | "checkOut" | "payments">, cage: Cage | undefined) {
  return Math.max(0, bookingTotal(b, cage) - paidAmount(b));
}

/** Paid in full, or more. A stay with nothing to pay (no cage on record) counts as paid, not as a debt. */
export function paymentStatus(b: Pick<Booking, "checkIn" | "checkOut" | "payments">, cage: Cage | undefined): PaymentStatus {
  const total = bookingTotal(b, cage);
  const paid = paidAmount(b);
  if (paid >= total) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

export type PaymentIssue = "booking" | "cancelled" | "amount";

/** An amount is a whole number of rupiah above zero. */
export const isValidAmount = (amount: number) => Number.isInteger(amount) && amount > 0;
