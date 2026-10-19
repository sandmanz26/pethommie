import { describe, expect, it } from "vitest";
import { aBooking, aCage, aCareEntry, aHotel, aSmallHotel, anOwner, aPet } from "@/app/testing/fixtures";
import { changeBookingStatus, checkInBooking, editBooking, markReportSent, recordCare, recordPayment, removeCage, removeCare, removePayment, removePet, upsertBooking, upsertOwner, upsertPet } from "./actions";

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
    const out = upsertBooking(state, { ...stay, checkOut: "2026-10-20", notes: "extra night" });
    expect(out.result).toEqual([]);
    expect(out.state.bookings).toHaveLength(1);
    expect(out.state.bookings[0]).toMatchObject({ checkOut: "2026-10-20", notes: "extra night" });
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

describe("editBooking", () => {
  const state = aSmallHotel({ bookings: [stay] });

  it("changes the dates and cage and leaves the rest of the stay alone", () => {
    const withPayment = aSmallHotel({ bookings: [{ ...stay, payments: [{ id: "x", at: "", amount: 5, method: "cash", note: "" }] }] });
    const out = editBooking(withPayment, "b1", { cageId: "m1", checkOut: "2026-10-19" });
    expect(out.result).toEqual([]);
    expect(out.state.bookings[0]).toMatchObject({ cageId: "m1", checkOut: "2026-10-19", checkIn: "2026-10-14", status: "booked" });
    expect(out.state.bookings[0].payments).toHaveLength(1);
  });

  it("refuses and changes nothing when a rule is broken", () => {
    const clash = aBooking("b2", { petId: "p2", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-18" });
    const s = aSmallHotel({ bookings: [stay, clash] });
    const out = editBooking(s, "b1", { cageId: "s2" });
    expect(out.result).toEqual(["cage_taken"]);
    expect(out.state).toBe(s);
  });

  it("refuses a stay that is over or doesn't exist", () => {
    expect(editBooking(aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] }), "b1", { notes: "x" }).result).toEqual(["locked"]);
    expect(editBooking(state, "ghost", { notes: "x" }).result).toEqual(["locked"]);
  });
});

describe("checkInBooking", () => {
  const arrival = { at: "2026-10-14T09:00:00.000Z", healthy: true, fleaFree: true, weightKg: 4.2, belongings: "bag", food: "", notes: "" };
  const state = aSmallHotel({ bookings: [stay] });

  it("checks in and keeps the arrival record", () => {
    const out = checkInBooking(state, "b1", arrival);
    expect(out.result).toBe(true);
    expect(out.state.bookings[0]).toMatchObject({ status: "checked_in", arrival });
  });

  it("can check in without a record", () => {
    expect(checkInBooking(state, "b1", null).state.bookings[0]).toMatchObject({ status: "checked_in", arrival: null });
  });

  it("only moves a booked stay in, once", () => {
    const once = checkInBooking(state, "b1", arrival).state;
    expect(checkInBooking(once, "b1", null)).toEqual({ state: once, result: false });
    expect(checkInBooking(state, "ghost", null).result).toBe(false);
    const cancelled = aSmallHotel({ bookings: [{ ...stay, status: "cancelled" }] });
    expect(checkInBooking(cancelled, "b1", null).result).toBe(false);
  });
});

describe("payments", () => {
  const state = aSmallHotel({ bookings: [stay] });
  const payment = { at: "2026-10-14T09:00:00.000Z", amount: 50_000, method: "qris" as const, note: "" };

  it("records money against the stay", () => {
    const out = recordPayment(state, "b1", payment);
    expect(out.result).toEqual([]);
    expect(out.state.bookings[0].payments).toEqual([expect.objectContaining({ amount: 50_000, method: "qris", id: expect.any(String) })]);
  });

  it("gives every payment its own id", () => {
    const a = recordPayment(recordPayment(state, "b1", payment).state, "b1", payment).state;
    expect(new Set(a.bookings[0].payments.map((p) => p.id)).size).toBe(2);
  });

  it.each([0, -1, 12.5, Number.NaN])("refuses the amount %s", (amount) => {
    const out = recordPayment(state, "b1", { ...payment, amount });
    expect(out.result).toEqual(["amount"]);
    expect(out.state).toBe(state);
  });

  it("refuses a stay that doesn't exist or was cancelled", () => {
    expect(recordPayment(state, "ghost", payment).result).toEqual(["booking"]);
    expect(recordPayment(aSmallHotel({ bookings: [{ ...stay, status: "cancelled" }] }), "b1", payment).result).toEqual(["cancelled"]);
  });

  it("takes back one payment and leaves the others", () => {
    const two = recordPayment(recordPayment(state, "b1", payment).state, "b1", { ...payment, amount: 10_000 }).state;
    const [first] = two.bookings[0].payments;
    expect(removePayment(two, "b1", first.id).bookings[0].payments.map((p) => p.amount)).toEqual([10_000]);
  });
});

describe("care log", () => {
  const staying = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18", status: "checked_in" });
  const state = aSmallHotel({ bookings: [staying] });
  const meal = { bookingId: "b1", at: new Date(2026, 9, 15, 8, 0).toISOString(), kind: "meal" as const, preset: "all", note: "" };

  it("adds an entry with its own id and trimmed note", () => {
    const out = recordCare(state, { ...meal, note: "  fast  " });
    expect(out.result).toEqual([]);
    expect(out.state.careLog).toEqual([expect.objectContaining({ id: expect.any(String), note: "fast", preset: "all" })]);
  });

  it("refuses an entry that breaks a rule and changes nothing", () => {
    const out = recordCare(aSmallHotel({ bookings: [{ ...staying, status: "booked" }] }), meal);
    expect(out.result).toEqual(["not_staying"]);
    expect(out.state.careLog).toEqual([]);
  });

  it("removes one entry", () => {
    const withLog = aSmallHotel({ bookings: [staying], careLog: [aCareEntry("c1", "b1"), aCareEntry("c2", "b1")] });
    expect(removeCare(withLog, "c1").careLog.map((e) => e.id)).toEqual(["c2"]);
  });

  it("removes a pet's log and report marks along with the pet", () => {
    const withLog = aSmallHotel({ bookings: [staying], careLog: [aCareEntry("c1", "b1")], reportsSent: [{ bookingId: "b1", date: "2026-10-15", at: "" }] });
    const next = removePet(withLog, "p1");
    expect(next.careLog).toEqual([]);
    expect(next.reportsSent).toEqual([]);
  });
});

describe("markReportSent", () => {
  it("notes the report once per stay and day; sending again updates the time", () => {
    const state = aSmallHotel();
    const once = markReportSent(state, "b1", "2026-10-15", "2026-10-15T10:00:00.000Z");
    const twice = markReportSent(once, "b1", "2026-10-15", "2026-10-15T11:00:00.000Z");
    expect(twice.reportsSent).toEqual([{ bookingId: "b1", date: "2026-10-15", at: "2026-10-15T11:00:00.000Z" }]);
    const nextDay = markReportSent(twice, "b1", "2026-10-16", "2026-10-16T10:00:00.000Z");
    expect(nextDay.reportsSent).toHaveLength(2);
  });
});
