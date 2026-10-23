import type { ISODate, LateMode, StayCounting, StayRules } from "./types";

/**
 * How a hotel counts a stay's days and what a late pick-up costs (see StayRules). Pure, so the store, the forms and
 * the check-out flow agree. Dates are local calendar days; times are local "HH:MM".
 */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes since midnight of a valid "HH:MM", or null. */
export function minutesOf(time: string): number | null {
  const m = TIME.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function dayDiff(from: ISODate, to: ISODate) {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

/**
 * The days a stay is charged for, from its dates:
 * nights: the nights between (the check-out day is free); calendar_days: every day present, arrival day included;
 * hours24: one day per 24 hours from drop-off, at least one (time past the last full day is a late pick-up).
 */
export function billableDays(checkIn: ISODate, checkOut: ISODate, counting: StayCounting = "nights"): number {
  const n = Math.max(0, dayDiff(checkIn, checkOut));
  if (counting === "calendar_days") return n + 1;
  if (counting === "hours24") return Math.max(1, n);
  return n;
}

/** The latest pick-up on the last day without a fee, before the grace period: a local Date. */
export function pickUpDeadline(stay: { checkOut: ISODate; arrivalAt?: string | null }, rules: Pick<StayRules, "counting" | "pickUpUntil">): Date {
  const [y, m, d] = stay.checkOut.split("-").map(Number);
  let minutes = minutesOf(rules.pickUpUntil) ?? 12 * 60;
  // 24-hour days end at the time the pet was dropped off.
  if (rules.counting === "hours24" && stay.arrivalAt && !Number.isNaN(Date.parse(stay.arrivalAt))) {
    const at = new Date(stay.arrivalAt);
    minutes = at.getHours() * 60 + at.getMinutes();
  }
  return new Date(y, m - 1, d, 0, minutes);
}

export type LateFee = {
  /** Whole minutes past the limit (0 when on time). */
  minutesLate: number;
  /** Past the limit and the grace period. */
  late: boolean;
  /** Started hours counted for a per-hour fee. */
  hours: number;
  mode: LateMode;
  /** Rupiah to propose as a charge; 0 when on time or the hotel charges nothing. */
  amount: number;
};

/**
 * What picking the pet up at `pickedUpAt` costs on top of the stay. Within `graceMinutes` of the limit is free.
 * Beyond it: per started hour from the limit (never more than a full day's rate when the rate is known), half a day's
 * rate (rounded up), or a full day's rate. `dayRate` is what one day of this stay costs (all its pets).
 */
export function lateFee(stay: { checkOut: ISODate; arrivalAt?: string | null }, pickedUpAt: Date, dayRate: number, rules: StayRules): LateFee {
  const deadline = pickUpDeadline(stay, rules);
  const minutesLate = Math.max(0, Math.floor((pickedUpAt.getTime() - deadline.getTime()) / 60_000));
  const late = minutesLate > rules.graceMinutes;
  const hours = late ? Math.ceil(minutesLate / 60) : 0;
  const mode = rules.late.mode;
  let amount = 0;
  if (late) {
    if (mode === "per_hour") amount = dayRate > 0 ? Math.min(hours * rules.late.perHour, dayRate) : hours * rules.late.perHour;
    else if (mode === "half_day") amount = Math.ceil(dayRate / 2);
    else if (mode === "full_day") amount = dayRate;
  }
  return { minutesLate, late, hours, mode, amount: Math.max(0, Math.round(amount)) };
}

/** What can be wrong with a hotel's stay rules. */
export type StayRulesIssue = "dropOffFrom" | "dropOffUntil" | "dropOffOrder" | "pickUpUntil" | "grace" | "lateAmount";

export const MAX_LATE_FEE = 100_000_000;

export function stayRulesIssues(r: StayRules): StayRulesIssue[] {
  const issues: StayRulesIssue[] = [];
  const from = minutesOf(r.dropOffFrom);
  const until = minutesOf(r.dropOffUntil);
  if (from === null) issues.push("dropOffFrom");
  if (until === null) issues.push("dropOffUntil");
  if (from !== null && until !== null && from >= until) issues.push("dropOffOrder");
  if (minutesOf(r.pickUpUntil) === null) issues.push("pickUpUntil");
  if (!Number.isInteger(r.graceMinutes) || r.graceMinutes < 0 || r.graceMinutes > 240) issues.push("grace");
  if (r.late.mode === "per_hour" && (!Number.isInteger(r.late.perHour) || r.late.perHour <= 0 || r.late.perHour > MAX_LATE_FEE)) issues.push("lateAmount");
  return issues;
}
