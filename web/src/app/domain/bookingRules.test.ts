import { describe, expect, it } from "vitest";
import { aBooking, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { bookingIssues, canTransition, cageCanBeRemoved, editIssues, scheduleIssues } from "./bookingRules";
import type { BookingStatus } from "./types";

const stay = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" });
const data = aSmallHotel({ bookings: [stay] });

describe("scheduleIssues", () => {
  it("accepts a free cage and sensible dates", () => {
    expect(scheduleIssues(data, { cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-16" })).toEqual([]);
  });

  it("rejects check-out on or before check-in", () => {
    expect(scheduleIssues(data, { cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-14" })).toEqual(["dates"]);
    expect(scheduleIssues(data, { cageId: "s2", checkIn: "2026-10-16", checkOut: "2026-10-14" })).toEqual(["dates"]);
  });

  it("rejects dates that aren't YYYY-MM-DD", () => {
    expect(scheduleIssues(data, { cageId: "s2", checkIn: "14/10/2026", checkOut: "2026-10-16" })).toEqual(["dates"]);
    expect(scheduleIssues(data, { cageId: "s2", checkIn: "", checkOut: "" })).toEqual(["dates"]);
  });

  it("rejects an unknown cage", () => {
    expect(scheduleIssues(data, { cageId: "nope", checkIn: "2026-10-14", checkOut: "2026-10-16" })).toEqual(["cage"]);
    expect(scheduleIssues(data, { cageId: "", checkIn: "2026-10-14", checkOut: "2026-10-16" })).toEqual(["cage"]);
  });

  it("rejects a cage that is taken, but not for the booking's own dates when editing", () => {
    expect(scheduleIssues(data, { cageId: "s1", checkIn: "2026-10-16", checkOut: "2026-10-20" })).toEqual(["cage_taken"]);
    expect(scheduleIssues(data, { id: "b1", cageId: "s1", checkIn: "2026-10-16", checkOut: "2026-10-20" })).toEqual([]);
  });
});

describe("bookingIssues", () => {
  const next = aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-16", checkOut: "2026-10-20" });

  it("catches a double booking", () => {
    expect(bookingIssues(data, next)).toEqual(["cage_taken"]);
  });

  it("requires the pet to exist", () => {
    expect(bookingIssues(data, { ...next, cageId: "s2", petId: "ghost" })).toEqual(["pet"]);
  });

  it("reports every problem at once", () => {
    expect(bookingIssues(data, { ...next, cageId: "nope", petId: "ghost", checkOut: "2026-10-16" })).toEqual(["dates", "cage", "pet"]);
  });

  it("lets a cancelled or finished stay sit on a cage someone else holds", () => {
    expect(bookingIssues(data, { ...next, status: "cancelled" })).toEqual([]);
    expect(bookingIssues(data, { ...next, status: "checked_out" })).toEqual([]);
  });
});

describe("canTransition", () => {
  const all: BookingStatus[] = ["booked", "checked_in", "checked_out", "cancelled"];
  const allowed = new Set(["booked>checked_in", "booked>cancelled", "checked_in>checked_out"]);

  it("allows only the forward steps", () => {
    for (const from of all) for (const to of all) expect(canTransition(from, to), `${from} → ${to}`).toBe(allowed.has(`${from}>${to}`));
  });
});

describe("cageCanBeRemoved", () => {
  it("is blocked by a pending or current stay", () => {
    expect(cageCanBeRemoved(data, "s1")).toBe(false);
    expect(cageCanBeRemoved(aSmallHotel({ bookings: [{ ...stay, status: "checked_in" }] }), "s1")).toBe(false);
  });

  it("is allowed with no stays, or only finished ones", () => {
    expect(cageCanBeRemoved(data, "s2")).toBe(true);
    expect(cageCanBeRemoved(aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] }), "s1")).toBe(true);
    expect(cageCanBeRemoved(aSmallHotel({ bookings: [{ ...stay, status: "cancelled" }] }), "s1")).toBe(true);
  });
});

describe("editIssues", () => {
  const booked = aBooking("e1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" });
  const other = aBooking("e2", { petId: "p2", cageId: "s2", checkIn: "2026-10-20", checkOut: "2026-10-22" });
  const world = aSmallHotel({ bookings: [booked, other] });

  it("lets a booked stay move to a free cage or other dates, and does not clash with itself", () => {
    expect(editIssues(world, booked, { cageId: "m1" })).toEqual([]);
    expect(editIssues(world, booked, { checkOut: "2026-10-19" })).toEqual([]);
  });

  it("still refuses what a new booking would refuse", () => {
    expect(editIssues(world, booked, { cageId: "s2", checkOut: "2026-10-21" })).toEqual(["cage_taken"]);
    expect(editIssues(world, booked, { checkOut: "2026-10-14" })).toEqual(["dates"]);
    expect(editIssues(world, booked, { cageId: "ghost" })).toEqual(["cage"]);
  });

  it("lets a stay that has started change its end and cage, but not its first day", () => {
    const staying = { ...booked, status: "checked_in" as const };
    expect(editIssues(world, staying, { checkOut: "2026-10-20" })).toEqual([]);
    expect(editIssues(world, staying, { checkIn: "2026-10-13" })).toEqual(["locked"]);
    expect(editIssues(world, staying, { checkIn: "2026-10-14" })).toEqual([]);
  });

  it("locks stays that are over", () => {
    for (const status of ["checked_out", "cancelled"] as const) {
      expect(editIssues(world, { ...booked, status }, { notes: "late edit" })).toEqual(["locked"]);
    }
  });
});

describe("companions and pets in two places", () => {
  const world = aSmallHotel({
    owners: [anOwner("o1"), anOwner("o2")],
    pets: [aPet("p1", "o1"), aPet("p2", "o1"), aPet("p3", "o2")],
    bookings: [aBooking("b1", { petId: "p1", companionIds: ["p2"], cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" })],
  });
  const stay = (over: object) => aBooking("new", { petId: "p3", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-18", ...over });

  it("lets pets of one owner share a cage", () => {
    expect(bookingIssues(world, stay({ petId: "p1", companionIds: ["p2"], cageId: "m1", checkIn: "2026-10-20", checkOut: "2026-10-22" }))).toEqual([]);
  });

  it("refuses a companion of another owner, the pet itself, or one listed twice", () => {
    expect(bookingIssues(world, stay({ petId: "p1", companionIds: ["p3"], cageId: "m1", checkIn: "2026-10-20", checkOut: "2026-10-22" }))).toContain("companion");
    expect(bookingIssues(world, stay({ petId: "p1", companionIds: ["p1"], cageId: "m1", checkIn: "2026-10-20", checkOut: "2026-10-22" }))).toContain("companion");
    expect(bookingIssues(world, stay({ petId: "p1", companionIds: ["p2", "p2"], cageId: "m1", checkIn: "2026-10-20", checkOut: "2026-10-22" }))).toContain("companion");
    expect(bookingIssues(world, stay({ petId: "p1", companionIds: ["ghost"], cageId: "m1", checkIn: "2026-10-20", checkOut: "2026-10-22" }))).toContain("companion");
  });

  it("won't book a pet that is already in another stay on those nights, as the main pet or as a companion", () => {
    expect(bookingIssues(world, stay({ petId: "p1", cageId: "m1", checkIn: "2026-10-16", checkOut: "2026-10-19" }))).toEqual(["pet_busy"]);
    expect(bookingIssues(world, stay({ petId: "p2", cageId: "m1", checkIn: "2026-10-16", checkOut: "2026-10-19" }))).toEqual(["pet_busy"]);
    expect(bookingIssues(world, stay({ petId: "p3", companionIds: [], cageId: "m1" }))).toEqual([]);
  });

  it("lets a pet come back the day it left, and ignores stays that are over or cancelled", () => {
    expect(bookingIssues(world, stay({ petId: "p1", cageId: "m1", checkIn: "2026-10-18", checkOut: "2026-10-20" }))).toEqual([]);
    const done = aSmallHotel({ ...world, bookings: [{ ...world.bookings[0], status: "checked_out" }] });
    expect(bookingIssues(done, stay({ petId: "p1", cageId: "m1", checkIn: "2026-10-16", checkOut: "2026-10-19" }))).toEqual([]);
  });

  it("doesn't count a stay against itself when it is edited", () => {
    expect(editIssues(world, world.bookings[0], { checkOut: "2026-10-19" })).toEqual([]);
    expect(editIssues(world, world.bookings[0], { companionIds: [] })).toEqual([]);
  });
});
