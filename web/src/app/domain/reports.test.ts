import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { periodRange, reportFor } from "./reports";
import type { Payment } from "./types";

describe("periodRange", () => {
  it("covers this month and last month, across a year end and in a short February", () => {
    expect(periodRange("thisMonth", "2026-10-19")).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(periodRange("lastMonth", "2026-10-19")).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(periodRange("thisMonth", "2026-12-31")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(periodRange("lastMonth", "2027-01-05")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(periodRange("thisMonth", "2027-02-10")).toEqual({ from: "2027-02-01", to: "2027-03-01" });
    expect(periodRange("thisMonth", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-03-01" });
  });

  it("covers the last 30 days up to and including today", () => {
    expect(periodRange("last30", "2026-10-30")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
});

const pay = (amount: number, at: string): Payment => ({ id: at + amount, at, amount, method: "cash", note: "" });
const owner = anOwner("o1");
const week = { from: "2026-10-05", to: "2026-10-12" }; // 7 days; 3 cages -> 21 cage-nights

describe("reportFor", () => {
  const data = aSmallHotel({
    cages: [aCage("s1"), aCage("s2"), aCage("m1", "M", 75_000)],
    owners: [owner, anOwner("o2")],
    pets: [aPet("p1", "o1"), aPet("p2", "o2")],
    bookings: [
      // 5 nights inside the week (7 -> 12), starts inside
      aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-07", checkOut: "2026-10-12", status: "checked_out", payments: [pay(100_000, new Date(2026, 9, 7, 10).toISOString())] }),
      // starts before the week, 2 nights inside (5 -> 7), a repeat of 'a'? no: it is earlier
      aBooking("early", { petId: "p1", cageId: "s2", checkIn: "2026-10-02", checkOut: "2026-10-07", status: "checked_out" }),
      // cancelled: no nights, counted as cancelled
      aBooking("x", { petId: "p2", cageId: "m1", checkIn: "2026-10-08", checkOut: "2026-10-10", status: "cancelled" }),
      // starts after the week
      aBooking("later", { petId: "p2", cageId: "m1", checkIn: "2026-10-12", checkOut: "2026-10-14" }),
    ],
  });
  const r = reportFor(data, week);

  it("counts the days and the cage-nights there were", () => {
    expect(r.days).toBe(7);
    expect(r.availableNights).toBe(21);
  });

  it("counts nights with a pet in them, only inside the period and not for cancelled stays", () => {
    // 'a': 7,8,9,10,11 = 5 nights.  'early': 5,6 = 2 nights inside.
    expect(r.occupiedNights).toBe(7);
    expect(r.occupancy).toBeCloseTo(7 / 21);
    expect(r.daily.map((d) => d.occupied)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("counts money by the day it was received", () => {
    expect(r.received).toBe(100_000);
    expect(reportFor(data, { from: "2026-10-08", to: "2026-10-12" }).received).toBe(0);
  });

  it("describes the stays that began in the period", () => {
    expect(r.stays).toBe(1);
    expect(r.value).toBe(5 * 50_000);
    expect(r.averageNights).toBe(5);
    expect(r.cancelled).toBe(1);
  });

  it("knows which of those are by a returning owner", () => {
    expect(r.repeatStays).toBe(1); // 'a' is p1's second stay after 'early'
    expect(reportFor(data, { from: "2026-10-01", to: "2026-10-04" }).repeatStays).toBe(0);
  });

  it("does not divide by zero with no cages or no days", () => {
    expect(reportFor(aSmallHotel({ cages: [] }), week).occupancy).toBe(0);
    expect(reportFor(data, { from: "2026-10-05", to: "2026-10-05" })).toMatchObject({ days: 0, occupancy: 0, averageNights: 0 });
  });
});
