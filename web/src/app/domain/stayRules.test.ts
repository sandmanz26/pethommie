import { describe, expect, it } from "vitest";
import { billableDays, lateFee, minutesOf, pickUpDeadline, stayRulesIssues } from "./stayRules";
import { bookingTotal } from "./logic";
import { defaultStayRules, type StayRules } from "./types";
import { aCage } from "@/app/testing/fixtures";

const rules = (over: Partial<StayRules> = {}): StayRules => ({ ...defaultStayRules(true), ...over });
const at = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
};
const iso = (date: string, time: string) => at(date, time).toISOString();

describe("billableDays", () => {
  it("per night: the check-out day is free (Mon → Wed is 2)", () => {
    expect(billableDays("2026-10-05", "2026-10-07", "nights")).toBe(2);
    expect(billableDays("2026-10-05", "2026-10-06", "nights")).toBe(1);
  });

  it("per calendar day: every day present counts, the arrival day included (Mon → Wed is 3)", () => {
    expect(billableDays("2026-10-05", "2026-10-07", "calendar_days")).toBe(3);
    expect(billableDays("2026-10-05", "2026-10-06", "calendar_days")).toBe(2);
  });

  it("per 24 hours: one day per full 24 hours from drop-off, at least one", () => {
    expect(billableDays("2026-10-05", "2026-10-07", "hours24")).toBe(2);
    expect(billableDays("2026-10-05", "2026-10-06", "hours24")).toBe(1);
  });

  it("same day: nothing per night, one day otherwise", () => {
    expect(billableDays("2026-10-05", "2026-10-05", "nights")).toBe(0);
    expect(billableDays("2026-10-05", "2026-10-05", "calendar_days")).toBe(1);
    expect(billableDays("2026-10-05", "2026-10-05", "hours24")).toBe(1);
  });

  it("crosses months and leap days", () => {
    expect(billableDays("2028-02-28", "2028-03-01", "nights")).toBe(2);
    expect(billableDays("2026-10-31", "2026-11-02", "calendar_days")).toBe(3);
  });
});

describe("bookingTotal by counting", () => {
  const cage = aCage("m1", "M", 75_000);
  const stay = { checkIn: "2026-10-05", checkOut: "2026-10-07", charges: [{ amount: 20_000 }] };

  it("prices the hotel's days, nights by default (so old totals are unchanged)", () => {
    expect(bookingTotal(stay, cage)).toBe(2 * 75_000 + 20_000);
    expect(bookingTotal(stay, cage, "nights")).toBe(2 * 75_000 + 20_000);
    expect(bookingTotal(stay, cage, "calendar_days")).toBe(3 * 75_000 + 20_000);
    expect(bookingTotal(stay, cage, "hours24")).toBe(2 * 75_000 + 20_000);
  });
});

describe("pickUpDeadline", () => {
  it("is the pick-up time on the last day", () => {
    expect(pickUpDeadline({ checkOut: "2026-10-07" }, rules({ pickUpUntil: "12:00" }))).toEqual(at("2026-10-07", "12:00"));
  });

  it("for 24-hour counting, is the drop-off time on the last day; the pick-up time when arrival isn't known", () => {
    const r = rules({ counting: "hours24", pickUpUntil: "12:00" });
    expect(pickUpDeadline({ checkOut: "2026-10-07", arrivalAt: iso("2026-10-05", "09:40") }, r)).toEqual(at("2026-10-07", "09:40"));
    expect(pickUpDeadline({ checkOut: "2026-10-07", arrivalAt: null }, r)).toEqual(at("2026-10-07", "12:00"));
  });
});

describe("lateFee", () => {
  const stay = { checkOut: "2026-10-07" };
  const perHour = rules({ pickUpUntil: "12:00", graceMinutes: 30, late: { mode: "per_hour", perHour: 10_000 } });

  it("is free exactly at the limit and within the grace period", () => {
    expect(lateFee(stay, at("2026-10-07", "12:00"), 100_000, perHour)).toMatchObject({ minutesLate: 0, late: false, amount: 0 });
    expect(lateFee(stay, at("2026-10-07", "12:30"), 100_000, perHour)).toMatchObject({ minutesLate: 30, late: false, amount: 0 });
    expect(lateFee(stay, at("2026-10-07", "09:00"), 100_000, perHour)).toMatchObject({ minutesLate: 0, late: false, amount: 0 });
  });

  it("past the grace period, charges every started hour from the limit", () => {
    expect(lateFee(stay, at("2026-10-07", "12:31"), 100_000, perHour)).toMatchObject({ late: true, hours: 1, amount: 10_000 });
    expect(lateFee(stay, at("2026-10-07", "14:00"), 100_000, perHour)).toMatchObject({ late: true, hours: 2, amount: 20_000 });
    expect(lateFee(stay, at("2026-10-07", "14:01"), 100_000, perHour)).toMatchObject({ hours: 3, amount: 30_000 });
  });

  it("never charges more per hour than a full day", () => {
    expect(lateFee(stay, at("2026-10-07", "23:00"), 50_000, perHour).amount).toBe(50_000);
  });

  it("with no grace, a minute late is late", () => {
    expect(lateFee(stay, at("2026-10-07", "12:01"), 100_000, { ...perHour, graceMinutes: 0 })).toMatchObject({ late: true, amount: 10_000 });
  });

  it("half a day (rounded up) or a full day's rate", () => {
    const late = at("2026-10-07", "15:00");
    expect(lateFee(stay, late, 75_001, rules({ late: { mode: "half_day", perHour: 0 } })).amount).toBe(37_501);
    expect(lateFee(stay, late, 75_000, rules({ late: { mode: "full_day", perHour: 0 } })).amount).toBe(75_000);
  });

  it("no fee: says it was late, charges nothing", () => {
    expect(lateFee(stay, at("2026-10-07", "18:00"), 75_000, rules())).toMatchObject({ late: true, amount: 0 });
  });

  it("24 hours: late counts from the drop-off time", () => {
    const r = rules({ counting: "hours24", graceMinutes: 0, late: { mode: "full_day", perHour: 0 } });
    const s = { checkOut: "2026-10-07", arrivalAt: iso("2026-10-05", "10:00") };
    expect(lateFee(s, at("2026-10-07", "10:00"), 75_000, r).amount).toBe(0);
    expect(lateFee(s, at("2026-10-07", "10:05"), 75_000, r).amount).toBe(75_000);
  });
});

describe("stayRulesIssues", () => {
  it("accepts the defaults", () => {
    expect(stayRulesIssues(rules())).toEqual([]);
    expect(minutesOf("08:30")).toBe(510);
  });

  it("refuses bad times, drop-off out of order, grace out of 0–240, and a bad hourly fee", () => {
    expect(stayRulesIssues(rules({ dropOffFrom: "8:00" }))).toContain("dropOffFrom");
    expect(stayRulesIssues(rules({ dropOffUntil: "24:00" }))).toContain("dropOffUntil");
    expect(stayRulesIssues(rules({ dropOffFrom: "20:00", dropOffUntil: "20:00" }))).toEqual(["dropOffOrder"]);
    expect(stayRulesIssues(rules({ pickUpUntil: "" }))).toEqual(["pickUpUntil"]);
    expect(stayRulesIssues(rules({ graceMinutes: 241 }))).toEqual(["grace"]);
    expect(stayRulesIssues(rules({ graceMinutes: 240 }))).toEqual([]);
    expect(stayRulesIssues(rules({ graceMinutes: -1 }))).toEqual(["grace"]);
    expect(stayRulesIssues(rules({ graceMinutes: 1.5 }))).toEqual(["grace"]);
    expect(stayRulesIssues(rules({ late: { mode: "per_hour", perHour: 0 } }))).toEqual(["lateAmount"]);
    expect(stayRulesIssues(rules({ late: { mode: "per_hour", perHour: 100_000_001 } }))).toEqual(["lateAmount"]);
    expect(stayRulesIssues(rules({ late: { mode: "per_hour", perHour: 100_000_000 } }))).toEqual([]);
    // the hourly fee only matters when it is used
    expect(stayRulesIssues(rules({ late: { mode: "none", perHour: 0 } }))).toEqual([]);
  });
});
