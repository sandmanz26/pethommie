import { describe, expect, it } from "vitest";
import { aBooking, aCage, aCareEntry, aHotel, aSmallHotel, anOwner, aPet } from "@/app/testing/fixtures";
import { addCharge, changeBookingStatus, checkInBooking, issueInvoice, removeCharge, saveSettings, voidInvoice, editBooking, markReportSent, recordCare, recordPayment, removeCage, removeCare, removePayment, removePet, upsertBooking, cancelBooking, checkOutBooking, restoreCage, upsertOwner, upsertPet, saveExpense, addExpenses, removeExpense } from "./actions";

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
    expect(state.owners).toEqual([{ id: "o1", name: "Renamed", whatsapp: "6281234567890", language: "id" }]);
  });
});

describe("an owner's language", () => {
  it("starts as Indonesian, is kept when the owner is saved again, and changes only when asked", () => {
    const state = aSmallHotel();
    const english = upsertOwner(state, { id: "o1", name: "Owner o1", whatsapp: "6281234567890", language: "en" }).state;
    expect(english.owners[0].language).toBe("en");
    const renamed = upsertOwner(english, { id: "o1", name: "Renamed", whatsapp: "6281234567890" }).state;
    expect(renamed.owners[0].language).toBe("en");
    expect(upsertOwner(state, { name: "New", whatsapp: "6285711223344" }).state.owners[1].language).toBe("id");
  });
});

describe("removePet", () => {
  it("removes a pet with nothing but unpaid bookings, and only its stays", () => {
    const other = aBooking("b2", { petId: "p2", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-16" });
    const { state: next, result } = removePet(aSmallHotel({ bookings: [stay, other] }), "p1");
    expect(result).toBe(true);
    expect(next.pets.map((p) => p.id)).toEqual(["p2"]);
    expect(next.bookings.map((b) => b.id)).toEqual(["b2"]);
  });

  it("refuses a pet whose stays the books depend on: started, paid for, or invoiced", () => {
    const paid = { ...stay, payments: [{ id: "x", at: "", amount: 1, method: "cash" as const, kind: "deposit" as const, reference: "", note: "" }] };
    for (const b of [{ ...stay, status: "checked_in" as const }, { ...stay, status: "checked_out" as const }, paid]) {
      const state = aSmallHotel({ bookings: [b] });
      expect(removePet(state, "p1")).toEqual({ state, result: false });
    }
    const invoiced = aSmallHotel({ bookings: [stay], invoices: [{ bookingId: "b1", id: "i1" } as never] });
    expect(removePet(invoiced, "p1").result).toBe(false);
    // a pet that only shared a paid stay is part of that history too
    expect(removePet(aSmallHotel({ bookings: [{ ...paid, companionIds: ["p2"] }] }), "p2").result).toBe(false);
  });
});

describe("removeCage", () => {
  it("refuses while a stay holds the cage, and leaves the data untouched", () => {
    const state = aSmallHotel({ bookings: [stay] });
    const out = removeCage(state, "s1");
    expect(out.result).toBe("busy");
    expect(out.state).toBe(state);
  });

  it("removes a cage that never had a stay, and archives one with history so its stays keep their unit", () => {
    expect(removeCage(aSmallHotel(), "s2")).toMatchObject({ result: "removed", state: { cages: [{ id: "s1" }, { id: "m1" }] } });
    const finished = aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] });
    const out = removeCage(finished, "s1");
    expect(out.result).toBe("archived");
    expect(out.state.cages.find((c) => c.id === "s1")?.archived).toBe(true);
    expect(out.state.bookings[0].cageId).toBe("s1");
    // archived: takes no new stay, until it is restored
    const next = aBooking("b9", { petId: "p2", cageId: "s1", checkIn: "2099-01-01", checkOut: "2099-01-02" });
    expect(upsertBooking(out.state, next).result).toContain("cage");
    expect(upsertBooking(restoreCage(out.state, "s1"), next).result).toEqual([]);
  });

  it("does nothing for an unknown cage", () => {
    const state = aSmallHotel();
    expect(removeCage(state, "nope")).toEqual({ state, result: "unknown" });
  });
});

describe("cancelBooking", () => {
  const deposit = { id: "d", at: "2026-10-01T08:00:00.000Z", amount: 100_000, method: "transfer" as const, kind: "deposit" as const, reference: "", note: "" };
  const req = { reason: "owner" as const, refund: 0, method: "transfer" as const, on: "2026-10-12", at: "2026-10-12T09:00:00.000Z" };

  it("keeps the deposit as a cancellation fee, says why, and voids the invoice", () => {
    const made = issueInvoice(aSmallHotel({ bookings: [{ ...stay, payments: [deposit] }] }), "b1", { issuedOn: "2026-10-10" }).state;
    const { state, result } = cancelBooking(made, "b1", { ...req, reason: "no_show" });
    expect(result).toEqual([]);
    expect(state.bookings[0]).toMatchObject({ status: "cancelled", cancelReason: "no_show", payments: [deposit] });
    expect(state.invoices[0]).toMatchObject({ status: "void", voidedOn: "2026-10-12" });
  });

  it("gives money back, never more than was paid", () => {
    const s = aSmallHotel({ bookings: [{ ...stay, payments: [deposit] }] });
    const { state } = cancelBooking(s, "b1", { ...req, refund: 60_000 });
    expect(state.bookings[0].payments.at(-1)).toMatchObject({ kind: "refund", amount: 60_000, method: "transfer" });
    expect(cancelBooking(s, "b1", { ...req, refund: 100_001 })).toEqual({ state: s, result: ["refund"] });
  });

  it("only cancels a booked stay, and nothing else can cancel it", () => {
    const s = aSmallHotel({ bookings: [{ ...stay, status: "checked_in" }] });
    expect(cancelBooking(s, "b1", req).result).toEqual(["status"]);
    expect(changeBookingStatus(aSmallHotel({ bookings: [stay] }), "b1", "cancelled").result).toBe(false);
  });

  it("still takes a refund after cancelling, but no other money", () => {
    const cancelled = aSmallHotel({ bookings: [{ ...stay, status: "cancelled", cancelReason: "owner", payments: [deposit] }] });
    expect(recordPayment(cancelled, "b1", { ...deposit, kind: "refund", amount: 50_000 }).result).toEqual([]);
    expect(recordPayment(cancelled, "b1", { ...deposit, kind: "payment", amount: 50_000 }).result).toEqual(["cancelled"]);
  });
});

describe("checkOutBooking", () => {
  const inHouse = { ...stay, status: "checked_in" as const }; // 14 -> 18 Oct in s1

  it("keeps the booked dates, or ends the stay the day the pet really left", () => {
    expect(checkOutBooking(aSmallHotel({ bookings: [inHouse] }), "b1").state.bookings[0]).toMatchObject({ status: "checked_out", checkOut: "2026-10-18" });
    expect(checkOutBooking(aSmallHotel({ bookings: [inHouse] }), "b1", "2026-10-16").state.bookings[0].checkOut).toBe("2026-10-16");
    // picked up the day it came: still one night
    expect(checkOutBooking(aSmallHotel({ bookings: [inHouse] }), "b1", "2026-10-14").state.bookings[0].checkOut).toBe("2026-10-15");
  });

  it("adds the nights of a late pickup when the unit is free for them, and refuses when it isn't", () => {
    expect(checkOutBooking(aSmallHotel({ bookings: [inHouse] }), "b1", "2026-10-20").state.bookings[0].checkOut).toBe("2026-10-20");
    const next = aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-19", checkOut: "2026-10-21" });
    const s = aSmallHotel({ bookings: [inHouse, next] });
    expect(checkOutBooking(s, "b1", "2026-10-20")).toEqual({ state: s, result: ["cage_taken"] });
  });

  it("only checks out a pet that is in", () => {
    expect(checkOutBooking(aSmallHotel({ bookings: [stay] }), "b1").result).toEqual(["status"]);
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
    const cancelled = cancelBooking(state, "b1", { reason: "owner", refund: 0, method: "cash", on: "2026-10-12", at: "2026-10-12T08:00:00.000Z" }).state;
    expect(cancelled.bookings[0].status).toBe("cancelled");
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
    const withPayment = aSmallHotel({ bookings: [{ ...stay, payments: [{ id: "x", at: "", amount: 5, method: "cash", kind: "payment" as const, reference: "", note: "" }] }] });
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
  const payment = { at: "2026-10-14T09:00:00.000Z", amount: 50_000, method: "qris" as const, kind: "payment" as const, reference: "", note: "" };

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

  it("keeps a staying pet's log and report marks: such a pet can't be removed", () => {
    const withLog = aSmallHotel({ bookings: [staying], careLog: [aCareEntry("c1", "b1")], reportsSent: [{ bookingId: "b1", date: "2026-10-15", at: "" }] });
    const { state, result } = removePet(withLog, "p1");
    expect(result).toBe(false);
    expect(state.careLog).toHaveLength(1);
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

describe("charges", () => {
  const state = aSmallHotel({ bookings: [stay] });

  it("adds an add-on or a discount with its own id and a trimmed label", () => {
    const out = addCharge(state, "b1", { label: "  Grooming ", amount: 75_000 });
    expect(out.result).toEqual([]);
    expect(out.state.bookings[0].charges).toEqual([{ id: expect.any(String), label: "Grooming", amount: 75_000 }]);
    expect(addCharge(out.state, "b1", { label: "Diskon", amount: -5_000 }).state.bookings[0].charges).toHaveLength(2);
  });

  it("refuses an empty label, a zero amount, an unknown stay and a cancelled one, and changes nothing", () => {
    expect(addCharge(state, "b1", { label: " ", amount: 5 })).toEqual({ state, result: ["label"] });
    expect(addCharge(state, "b1", { label: "x", amount: 0 }).result).toEqual(["amount"]);
    expect(addCharge(state, "ghost", { label: "x", amount: 5 }).result).toEqual(["booking"]);
    const cancelled = aSmallHotel({ bookings: [{ ...stay, status: "cancelled" }] });
    expect(addCharge(cancelled, "b1", { label: "x", amount: 5 }).result).toEqual(["locked"]);
  });

  it("can still be added after check-out, such as a late pickup fee", () => {
    const out = aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] });
    expect(addCharge(out, "b1", { label: "Late pickup", amount: 20_000 }).result).toEqual([]);
  });

  it("takes one away and leaves the others", () => {
    const two = addCharge(addCharge(state, "b1", { label: "A", amount: 1 }).state, "b1", { label: "B", amount: 2 }).state;
    const [a] = two.bookings[0].charges;
    expect(removeCharge(two, "b1", a.id).bookings[0].charges.map((c) => c.label)).toEqual(["B"]);
  });
});

describe("a pet sharing a cage when it is removed", () => {
  it("leaves the stay, which carries on for the pet it was booked for", () => {
    const shared = aSmallHotel({ bookings: [{ ...stay, companionIds: ["p2"] }] });
    const next = removePet(shared, "p2").state;
    expect(next.bookings).toHaveLength(1);
    expect(next.bookings[0].companionIds).toEqual([]);
    expect(removePet(shared, "p1").state.bookings).toEqual([]);
  });
});

describe("settings", () => {
  const state = aSmallHotel();
  const good = { ...state.settings, legalName: "  CV Meong ", invoicePrefix: "rm-1", npwp: " 12.345 " };

  it("saves them cleaned: names trimmed, the prefix in capitals with no punctuation", () => {
    const out = saveSettings(state, good);
    expect(out.result).toEqual([]);
    expect(out.state.settings).toMatchObject({ legalName: "CV Meong", invoicePrefix: "RM1", npwp: "12.345" });
  });

  it("refuses a tax rate that isn't one and a prefix with nothing in it", () => {
    for (const ppnPercent of [-1, 101, Number.NaN]) expect(saveSettings(state, { ...good, tax: { ...good.tax, ppnPercent } }).result).toEqual(["ppn"]);
    expect(saveSettings(state, { ...good, invoicePrefix: "!!" })).toEqual({ state, result: ["prefix"] });
  });
});

describe("invoices", () => {
  const state = aSmallHotel({ bookings: [{ ...stay, status: "checked_out" }] });

  it("issues one, keeps it, and numbers the next one on", () => {
    const first = issueInvoice(state, "b1", { issuedOn: "2026-10-18" });
    expect(first.result).toEqual([]);
    expect(first.state.invoices).toHaveLength(1);
    expect(first.state.invoices[0]).toMatchObject({ number: "INV-2026-0001", bookingId: "b1", status: "issued", total: 200_000 });
  });

  it("refuses a second live invoice for the same stay, and a stay that isn't there", () => {
    const once = issueInvoice(state, "b1", { issuedOn: "2026-10-18" }).state;
    expect(issueInvoice(once, "b1", { issuedOn: "2026-10-19" })).toEqual({ state: once, result: ["exists"] });
    expect(issueInvoice(state, "ghost", { issuedOn: "2026-10-19" }).result).toEqual(["booking"]);
  });

  it("voids one, keeps its number used, and lets the stay be invoiced again under a new number", () => {
    const once = issueInvoice(state, "b1", { issuedOn: "2026-10-18" }).state;
    const voided = voidInvoice(once, once.invoices[0].id, "2026-10-19");
    expect(voided.result).toBe(true);
    expect(voided.state.invoices[0]).toMatchObject({ status: "void", voidedOn: "2026-10-19", number: "INV-2026-0001" });
    const again = issueInvoice(voided.state, "b1", { issuedOn: "2026-10-19" }).state;
    expect(again.invoices.map((i) => [i.number, i.status])).toEqual([["INV-2026-0001", "void"], ["INV-2026-0002", "issued"]]);
  });

  it("voids only an issued invoice, once", () => {
    const once = issueInvoice(state, "b1", { issuedOn: "2026-10-18" }).state;
    const voided = voidInvoice(once, once.invoices[0].id, "2026-10-19").state;
    expect(voidInvoice(voided, voided.invoices[0].id, "2026-10-20")).toEqual({ state: voided, result: false });
    expect(voidInvoice(once, "ghost", "2026-10-19").result).toBe(false);
  });

  it("is a copy: changing the stay or the owner afterwards doesn't change the invoice", () => {
    const once = issueInvoice(state, "b1", { issuedOn: "2026-10-18" }).state;
    const later = { ...once, bookings: [{ ...once.bookings[0], charges: [{ id: "c", label: "Extra", amount: 99_000 }] }], owners: [{ ...once.owners[0], name: "Renamed" }] };
    expect(later.invoices[0].total).toBe(200_000);
    expect(later.invoices[0].customer.name).toBe("Owner o1");
  });

  it("keeps the pet and its stay once the stay is invoiced", () => {
    const once = issueInvoice(state, "b1", { issuedOn: "2026-10-18" }).state;
    const { state: kept, result } = removePet(once, "p1");
    expect(result).toBe(false);
    expect(kept.bookings).toHaveLength(1);
    expect(kept.invoices).toHaveLength(1);
  });
});

describe("refunds", () => {
  it("can't give back more than the stay has kept", () => {
    const s = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-01", checkOut: "2026-10-03", payments: [{ id: "x", at: "2026-10-01T08:00:00.000Z", amount: 50_000, method: "cash", kind: "deposit", reference: "", note: "" }] })] });
    const refund = (amount: number) => recordPayment(s, "b1", { at: "2026-10-02T08:00:00.000Z", amount, method: "transfer", kind: "refund", reference: "", note: "" });
    expect(refund(60_000).result).toEqual(["refund"]);
    expect(refund(50_000).result).toEqual([]);
  });
});

describe("a stay's rate when it moves", () => {
  it("keeps its agreed rate on new dates, and takes the new unit's price when it moves unit", () => {
    const s = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2099-10-01", checkOut: "2099-10-03", rate: 45_000 })] });
    const later = editBooking(s, "b1", { checkOut: "2099-10-04" }).state;
    expect(later.bookings[0].rate).toBe(45_000);
    const moved = editBooking(s, "b1", { cageId: "m1" }).state;
    expect(moved.bookings[0].rate).toBe(75_000);
  });
});

describe("expenses", () => {
  const e = { id: "e1", date: "2026-10-01", category: "food" as const, amount: 250_000, method: "cash" as const, vendor: " Toko ", note: "", recurring: false };

  it("saves one, edits it in place, and removes it", () => {
    const one = saveExpense(aSmallHotel(), e);
    expect(one.result).toEqual([]);
    expect(one.state.expenses).toEqual([{ ...e, vendor: "Toko" }]);
    const edited = saveExpense(one.state, { ...e, amount: 300_000 }).state;
    expect(edited.expenses.map((x) => x.amount)).toEqual([300_000]);
    expect(removeExpense(edited, "e1").expenses).toEqual([]);
  });

  it("refuses a wrong amount or date and changes nothing", () => {
    const s = aSmallHotel();
    expect(saveExpense(s, { ...e, amount: -5 })).toEqual({ state: s, result: ["amount"] });
    expect(saveExpense(s, { ...e, date: "kemarin" }).result).toEqual(["date"]);
  });

  it("adds several at once, leaving out any that is wrong", () => {
    const { id: _id, ...draft } = e;
    const out = addExpenses(aSmallHotel(), [draft, { ...draft, amount: 0 }]);
    expect(out.result).toBe(1);
    expect(out.state.expenses).toHaveLength(1);
  });
});

describe("stay rules in the store", () => {
  const staying = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", status: "checked_in" });

  it("checks out with the agreed late fee as a charge, in one step", () => {
    const { state, result } = checkOutBooking(aSmallHotel({ bookings: [staying] }), "b1", undefined, { label: " Late pick-up fee ", amount: 20_000 });
    expect(result).toEqual([]);
    expect(state.bookings[0]).toMatchObject({ status: "checked_out", charges: [{ label: "Late pick-up fee", amount: 20_000 }] });
  });

  it("refuses a late fee that isn't a positive whole amount, and changes nothing", () => {
    const start = aSmallHotel({ bookings: [staying] });
    for (const amount of [0, -5_000, 1.5]) {
      const { state, result } = checkOutBooking(start, "b1", undefined, { label: "Late", amount });
      expect(result).toEqual(["charge"]);
      expect(state).toBe(start);
    }
  });

  it("refuses settings with broken stay rules", () => {
    const start = aSmallHotel();
    const { state, result } = saveSettings(start, { ...start.settings, stayRules: { ...start.settings.stayRules, dropOffFrom: "21:00", dropOffUntil: "20:00" } });
    expect(result).toEqual(["stayRules"]);
    expect(state).toBe(start);
  });

  it("asks a deposit of the hotel's own total: calendar days count the arrival day", () => {
    const start = aSmallHotel();
    const hotel = { ...start, settings: { ...start.settings, payPolicy: { mode: "deposit_first" as const, depositPercent: 50 }, stayRules: { ...start.settings.stayRules, counting: "calendar_days" as const } } };
    // s1 is Rp50.000 a day; 2 nights is 3 calendar days = Rp150.000, so Rp75.000 is the deposit, and Rp50.000 isn't enough.
    const paid = (amount: number) => [{ id: "p", at: "2026-10-01T00:00:00.000Z", amount, method: "cash" as const, kind: "deposit" as const, reference: "", note: "" }];
    const booking = (amount: number) => aBooking("b2", { petId: "p1", cageId: "s1", checkIn: "2026-10-20", checkOut: "2026-10-22", payments: paid(amount) });
    expect(upsertBooking(hotel, booking(50_000)).state.bookings[0].hold).toBe("deposit");
    expect(upsertBooking(hotel, booking(75_000)).state.bookings[0].hold).toBeUndefined();
  });
});
