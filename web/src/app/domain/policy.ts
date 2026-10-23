import type { BookingHold, PayPolicy } from "./types";

/**
 * How a hotel takes bookings and deposits (see PayPolicy). Pure, so the store, the forms and the pages agree.
 */

/** The deposit (DP) a stay of `total` needs: `percent` of it, rounded up to the next Rp1.000. 0 when nothing is asked. */
export function requiredDeposit(total: number, percent: number): number {
  if (!(percent > 0) || !(total > 0)) return 0;
  return Math.ceil((total * percent) / 100 / 1000) * 1000;
}

/** A deposit percent the hotel can set: a whole number from 0 to 100. */
export const isValidDepositPercent = (percent: number) => Number.isInteger(percent) && percent >= 0 && percent <= 100;

/** What a new booking waits for, given what was paid with it. undefined: nothing, it is confirmed. */
export function holdForNew(policy: PayPolicy, paid: number, total: number): BookingHold | undefined {
  if (policy.mode === "check_first") return "request";
  if (policy.mode === "deposit_first") return paid >= requiredDeposit(total, policy.depositPercent) ? undefined : "deposit";
  return undefined;
}

/** After the slot is confirmed or money comes in: still waiting for the deposit, or confirmed. */
export function holdAfterConfirm(policy: PayPolicy, paid: number, total: number): BookingHold | undefined {
  if (policy.mode === "flexible") return undefined;
  return paid >= requiredDeposit(total, policy.depositPercent) ? undefined : "deposit";
}
