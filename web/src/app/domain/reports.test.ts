import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { change, customPeriod, previousPeriod, periodRange, reportFor } from "./reports";
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

  it("covers the last 90 days and the whole of this year", () => {
    expect(periodRange("last90", "2026-10-20")).toEqual({ from: "2026-07-23", to: "2026-10-21" });
    expect(periodRange("thisYear", "2026-10-20")).toEqual({ from: "2026-01-01", to: "2027-01-01" });
  });

  it("finds the stretch just before, of the same length", () => {
    expect(previousPeriod({ from: "2026-10-01", to: "2026-11-01" })).toEqual({ from: "2026-08-31", to: "2026-10-01" });
  });

  it("takes a typed range in either order, the last day included, at most two years", () => {
    expect(customPeriod("2026-10-05", "2026-10-11")).toEqual({ from: "2026-10-05", to: "2026-10-12" });
    expect(customPeriod("2026-10-11", "2026-10-05")).toEqual({ from: "2026-10-05", to: "2026-10-12" });
    expect(customPeriod("2020-01-01", "2026-10-11").from).toBe("2024-10-11");
  });

  it("says how much something changed, and nothing when there was nothing before", () => {
    expect(change(150, 100)).toBeCloseTo(0.5);
    expect(change(50, 100)).toBeCloseTo(-0.5);
    expect(change(50, 0)).toBeNull();
  });
});

const pay = (amount: number, at: string): Payment => ({ id: at + amount, at, amount, method: "cash", kind: "payment" as const, reference: "", note: "" });
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

describe("reportFor, deeper", () => {
  const room = aCage("room", "M", 60_000, 4);
  const data = aSmallHotel({
    cages: [aCage("s1", "S", 50_000), room],
    owners: [anOwner("o1"), anOwner("o2")],
    pets: [aPet("d1", "o1"), aPet("c1", "o1", { species: "cat" }), aPet("c2", "o2", { species: "cat" })],
    bookings: [
      // two cats sharing the room: 2 places for 4 nights, 2 x 4 x 60k = 480k, + 50k grooming - 30k discount
      aBooking("cats", {
        petId: "c1", companionIds: ["c2"], cageId: "room", checkIn: "2026-10-05", checkOut: "2026-10-09", source: "instagram", createdAt: "2026-09-25T09:00:00.000Z",
        charges: [{ id: "g", label: "Grooming", amount: 50_000 }, { id: "d", label: "Promo", amount: -30_000 }],
        payments: [
          { id: "1", at: new Date(2026, 9, 1, 9).toISOString(), amount: 200_000, method: "transfer", kind: "deposit", reference: "", note: "" },
          { id: "2", at: new Date(2026, 9, 9, 9).toISOString(), amount: 300_000, method: "qris", kind: "payment", reference: "", note: "" },
          { id: "3", at: new Date(2026, 9, 10, 9).toISOString(), amount: 20_000, method: "cash", kind: "refund", reference: "", note: "" },
        ],
      }),
      // a dog in the cage: 1 place for 2 nights, 100k
      aBooking("dog", { petId: "d1", cageId: "s1", checkIn: "2026-10-06", checkOut: "2026-10-08", source: "whatsapp", createdAt: "2026-10-06T08:00:00.000Z" }),
    ],
  });
  const p = { from: "2026-10-01", to: "2026-10-15" }; // 14 days x 5 places = 70
  const r = reportFor(data, p);

  it("counts a shared room by its places, a cage as one", () => {
    expect(r.places).toBe(5);
    expect(r.availableNights).toBe(70);
    expect(r.occupiedNights).toBe(2 * 4 + 2);
    expect(r.daily.find((d) => d.date === "2026-10-06")?.occupied).toBe(3);
    expect(r.byUnit.map((u) => [u.cage.id, u.occupiedNights, u.availableNights])).toEqual([["s1", 2, 14], ["room", 8, 56]]);
  });

  it("splits the money by kind and by method, refunds taken off", () => {
    expect(r.byKind).toEqual({ deposit: 200_000, payment: 300_000, refund: 20_000 });
    expect(r.received).toBe(480_000);
    expect(r.byMethod).toMatchObject({ transfer: 200_000, qris: 300_000, cash: -20_000 });
  });

  it("knows the nightly rate earned, add-ons and discounts", () => {
    expect(r.value).toBe(480_000 + 20_000 + 100_000);
    expect(r.boarding).toBe(480_000 + 100_000);
    expect(r.soldNights).toBe(10);
    expect(r.averageRate).toBe(58_000);
    expect(r.addOns).toBe(50_000);
    expect(r.discounts).toBe(30_000);
  });

  it("knows how far ahead people book", () => {
    expect(r.leadDays).toBe((10 + 0) / 2);
  });

  it("breaks the stays down by source, species and owner", () => {
    expect(r.bySource).toEqual([{ source: "instagram", stays: 1, value: 500_000 }, { source: "whatsapp", stays: 1, value: 100_000 }]);
    expect(r.bySpecies).toEqual([{ species: "cat", pets: 2, value: 500_000 }, { species: "dog", pets: 1, value: 100_000 }]);
    expect(r.topCustomers.map((c) => [c.owner.id, c.stays, c.value])).toEqual([["o1", 2, 600_000]]);
  });

  it("narrows everything to one unit or one species", () => {
    const cage = reportFor(data, p, { unitId: "s1", species: "all" });
    expect([cage.places, cage.occupiedNights, cage.stays, cage.received]).toEqual([1, 2, 1, 0]);
    const cats = reportFor(data, p, { unitId: "all", species: "cat" });
    expect([cats.places, cats.occupiedNights, cats.stays, cats.received]).toEqual([5, 8, 1, 480_000]);
  });

  it("averages occupancy per weekday, and leaves out weekdays the period doesn't have", () => {
    // 2026-10-06 is a Tuesday: 3 of 5 places.
    const tuesday = reportFor(data, { from: "2026-10-06", to: "2026-10-07" });
    expect(tuesday.weekdays).toEqual([null, 0.6, null, null, null, null, null]);
  });

  it("never counts more places than a room has", () => {
    const crowded = { ...data, cages: [aCage("s1"), aCage("room", "M", 60_000, 1)] };
    expect(reportFor(crowded, p).daily.find((d) => d.date === "2026-10-06")?.occupied).toBe(2);
  });
});
