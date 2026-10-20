import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { customerOf, customers, matchesCustomer } from "./customers";
import type { Payment } from "./types";

const pay = (amount: number): Payment => ({ id: String(amount), at: "2026-10-01T08:00:00.000Z", amount, method: "cash", note: "" });
// S1 = Rp 50.000 a night
const data = aSmallHotel({
  owners: [anOwner("o1", "6281234567890"), anOwner("o2", "6285711223344"), anOwner("o3")],
  pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o1", { name: "Boba", species: "cat" }), aPet("p3", "o2", { name: "Kopi" }), aPet("p4", "o3", { name: "Nala" })],
  cages: [aCage("s1")],
  bookings: [
    aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-01", checkOut: "2026-10-04", status: "checked_out", payments: [pay(100_000)] }), // owes 50.000
    aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-10", checkOut: "2026-10-12", status: "checked_out", payments: [pay(100_000)] }), // paid
    aBooking("b3", { petId: "p1", cageId: "s1", checkIn: "2026-10-20", checkOut: "2026-10-22" }), // upcoming, nothing paid: not "owed" yet
    aBooking("b4", { petId: "p3", cageId: "s1", checkIn: "2026-10-05", checkOut: "2026-10-06", status: "cancelled", payments: [pay(10_000)] }),
  ],
});

describe("customerOf", () => {
  const c = customerOf(data, data.owners[0]);

  it("adds up an owner's pets and stays across all of them", () => {
    expect(c.pets.map((p) => p.name)).toEqual(["Mochi", "Boba"]);
    expect(c.stays).toBe(3);
    expect(c.nights).toBe(3 + 2 + 2);
    expect(c.lastCheckOut).toBe("2026-10-22");
  });

  it("counts what they paid, and owes only for stays that have started", () => {
    expect(c.paid).toBe(200_000);
    expect(c.owed).toBe(50_000);
  });

  it("leaves cancelled stays out of everything but nobody's records are lost", () => {
    const kopi = customerOf(data, data.owners[1]);
    expect(kopi).toMatchObject({ stays: 0, nights: 0, lastCheckOut: null, paid: 0, owed: 0 });
  });
});

describe("customers", () => {
  it("lists the most recent guests first, then by name", () => {
    expect(customers(data).map((c) => c.owner.id)).toEqual(["o1", "o2", "o3"]);
  });
});

describe("matchesCustomer", () => {
  const c = customerOf(data, data.owners[0]);

  it("finds by owner name, pet name or number in either form", () => {
    expect(matchesCustomer(c, "owner o1")).toBe(true);
    expect(matchesCustomer(c, "BOBA")).toBe(true);
    expect(matchesCustomer(c, "0812 3456")).toBe(true);
    expect(matchesCustomer(c, "6281234")).toBe(true);
  });

  it("does not find what isn't there, and shows everyone for an empty search", () => {
    expect(matchesCustomer(c, "kopi")).toBe(false);
    expect(matchesCustomer(c, "0857")).toBe(false);
    expect(matchesCustomer(c, "  ")).toBe(true);
  });
});
