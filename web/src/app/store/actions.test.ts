import { describe, expect, it } from "vitest";
import { aBooking, aCage, aHotel, aSmallHotel, anOwner, aPet } from "@/app/testing/fixtures";
import { changeBookingStatus, removeCage, removePet, upsertBooking, upsertOwner, upsertPet } from "./actions";

const stay = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" });

describe("upsertOwner", () => {
  it("reuses an owner with the same WhatsApp number", () => {
    const state = aSmallHotel();
    const { state: next, result } = upsertOwner(state, { name: "Someone else", whatsapp: "6281234567890" });
    expect(result).toBe("o1");
    expect(next.owners).toHaveLength(1);
  });

  it("creates a new owner for a new number, or when no number is given", () => {
    const state = aSmallHotel();
    const a = upsertOwner(state, { name: "New", whatsapp: "6285711223344" });
    expect(a.state.owners).toHaveLength(2);
    const b = upsertOwner(a.state, { name: "No number", whatsapp: "" });
    const c = upsertOwner(b.state, { name: "No number either", whatsapp: "" });
    expect(c.state.owners).toHaveLength(4);
    expect(new Set(c.state.owners.map((o) => o.id)).size).toBe(4);
  });

  it("updates in place when given an id", () => {
    const { state, result } = upsertOwner(aSmallHotel(), { id: "o1", name: "Renamed", whatsapp: "6281234567890" });
    expect(result).toBe("o1");
    expect(state.owners).toEqual([{ id: "o1", name: "Renamed", whatsapp: "6281234567890" }]);
  });
});

describe("removePet", () => {
  it("removes the pet and only its stays", () => {
    const other = aBooking("b2", { petId: "p2", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-16" });
    const next = removePet(aSmallHotel({ bookings: [stay, other] }), "p1");
    expect(next.pets.map((p) => p.id)).toEqual(["p2"]);
    expect(next.bookings.map((b) => b.id)).toEqual(["b2"]);
  });
});

describe("removeCage", () => {
  it("refuses while a stay holds the cage, and leaves the data untouched", () => {
    const state = aSmallHotel({ bookings: [stay] });
    const out = removeCage(state, "s1");
    expect(out.result).toBe(false);
    expect(out.state).toBe(state);
  });

  it("removes a free cage, and one that only has finished stays", () => {
    expect(removeCage(aSmallHotel(), "s2").state.cages.map((c) => c.id)).toEqual(["s1", "m1"]);
    const finished = aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] });
    expect(removeCage(finished, "s1").result).toBe(true);
  });

  it("does nothing for an unknown cage", () => {
    const state = aSmallHotel();
    expect(removeCage(state, "nope")).toEqual({ state, result: false });
  });
});

describe("upsertBooking", () => {
  it("saves a valid booking", () => {
    const out = upsertBooking(aSmallHotel(), stay);
    expect(out.result).toEqual([]);
    expect(out.state.bookings).toEqual([stay]);
  });

  it("refuses a double booking and says why", () => {
    const state = aSmallHotel({ bookings: [stay] });
    const clash = aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-17", checkOut: "2026-10-19" });
    const out = upsertBooking(state, clash);
    expect(out.result).toEqual(["cage_taken"]);
    expect(out.state).toBe(state);
  });

  it("lets a booking be edited without clashing with itself", () => {
    const state = aSmallHotel({ bookings: [stay] });
    const out = upsertBooking(state, { ...stay, checkOut: "2026-10-20", deposit: 100_000 });
    expect(out.result).toEqual([]);
    expect(out.state.bookings).toHaveLength(1);
    expect(out.state.bookings[0]).toMatchObject({ checkOut: "2026-10-20", deposit: 100_000 });
  });

  it("refuses a booking for a pet that doesn't exist", () => {
    expect(upsertBooking(aSmallHotel(), { ...stay, petId: "ghost" }).result).toEqual(["pet"]);
  });
});

describe("changeBookingStatus", () => {
  const state = aSmallHotel({ bookings: [stay] });

  it("walks a stay through its life cycle", () => {
    const checkedIn = changeBookingStatus(state, "b1", "checked_in");
    expect(checkedIn.result).toBe(true);
    const checkedOut = changeBookingStatus(checkedIn.state, "b1", "checked_out");
    expect(checkedOut.result).toBe(true);
    expect(checkedOut.state.bookings[0].status).toBe("checked_out");
  });

  it("refuses jumps and anything after the end", () => {
    expect(changeBookingStatus(state, "b1", "checked_out").result).toBe(false);
    const done = changeBookingStatus(changeBookingStatus(state, "b1", "checked_in").state, "b1", "checked_out").state;
    expect(changeBookingStatus(done, "b1", "booked")).toEqual({ state: done, result: false });
    const cancelled = changeBookingStatus(state, "b1", "cancelled").state;
    expect(changeBookingStatus(cancelled, "b1", "checked_in").result).toBe(false);
  });

  it("does nothing for an unknown booking", () => {
    expect(changeBookingStatus(state, "nope", "checked_in")).toEqual({ state, result: false });
  });
});

describe("immutability", () => {
  it("never changes the state it was given", () => {
    const state = aHotel({ cages: [aCage("s1")], owners: [anOwner("o1")], pets: [aPet("p1", "o1")], bookings: [stay] });
    const frozen = JSON.stringify(state);
    upsertPet(state, aPet("p1", "o1", { name: "Renamed" }));
    removePet(state, "p1");
    removeCage(state, "s1");
    changeBookingStatus(state, "b1", "checked_in");
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
