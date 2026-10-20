import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { customerOf } from "./customers";
import { filterBookings, filterPets, inSegment, NO_BOOKING_FILTER, NO_PET_FILTER, petStay, sortCustomers } from "./filters";

const today = "2026-10-20";
const data = aSmallHotel({
  cages: [aCage("s1"), aCage("s2")],
  owners: [anOwner("o1", "6281234567890"), anOwner("o2")],
  pets: [aPet("p1", "o1", { name: "Mochi", species: "cat", vaccineExpiry: "2027-01-01" }), aPet("p2", "o1", { name: "Boba", species: "cat" }), aPet("p3", "o2", { name: "Kopi", species: "dog", vaccineExpiry: "2027-06-01" })],
  bookings: [
    aBooking("in", { petId: "p1", companionIds: ["p2"], cageId: "s1", checkIn: "2026-10-18", checkOut: "2026-10-22", status: "checked_in", source: "instagram" }),
    aBooking("soon", { petId: "p3", cageId: "s2", checkIn: "2026-10-25", checkOut: "2026-10-27", source: "whatsapp", payments: [{ id: "x", at: "2026-10-10T08:00:00.000Z", amount: 10_000, method: "cash", kind: "deposit", reference: "", note: "" }] }),
    aBooking("old", { petId: "p3", cageId: "s2", checkIn: "2026-06-01", checkOut: "2026-06-03", status: "checked_out" }),
  ],
});

describe("where a pet is", () => {
  it("is staying when a checked-in stay includes it, also as a companion", () => {
    expect(petStay(data, "p1", today)).toMatchObject({ kind: "staying", booking: { id: "in" } });
    expect(petStay(data, "p2", today)).toMatchObject({ kind: "staying", booking: { id: "in" } });
  });

  it("is arriving within a week, and nothing beyond that", () => {
    expect(petStay(data, "p3", today)).toMatchObject({ kind: "arriving", booking: { id: "soon" } });
    expect(petStay(data, "p3", "2026-10-10").kind).toBe("none");
  });
});

describe("pet filters", () => {
  const names = (f: Partial<typeof NO_PET_FILTER>) => filterPets(data, data.pets, { ...NO_PET_FILTER, ...f }, today).map((p) => p.name);
  it("narrow by stay, species, vaccine and words", () => {
    expect(names({ stay: "staying" })).toEqual(["Mochi", "Boba"]);
    expect(names({ stay: "arriving" })).toEqual(["Kopi"]);
    expect(names({ species: "dog" })).toEqual(["Kopi"]);
    expect(names({ vaccine: "attention" })).toEqual(["Boba"]);
    expect(names({ q: "owner o2" })).toEqual(["Kopi"]);
    expect(names({ stay: "staying", species: "dog" })).toEqual([]);
  });
});

describe("booking filters", () => {
  const ids = (f: Partial<typeof NO_BOOKING_FILTER>) => filterBookings(data, data.bookings, { ...NO_BOOKING_FILTER, ...f }).map((b) => b.id);
  it("narrow by payment, unit, source, species and words, including companions' names", () => {
    expect(ids({ payment: "partial" })).toEqual(["soon"]);
    expect(ids({ unitId: "s2" })).toEqual(["soon", "old"]);
    expect(ids({ source: "instagram" })).toEqual(["in"]);
    expect(ids({ species: "cat" })).toEqual(["in"]);
    expect(ids({ q: "boba" })).toEqual(["in"]);
  });
});

describe("customer segments", () => {
  const o1 = customerOf(data, data.owners[0]);
  const o2 = customerOf(data, data.owners[1]);
  it("tell new customers from regulars and the ones who owe", () => {
    expect(inSegment(o1, "new", today)).toBe(true);
    expect(inSegment(o2, "new", today)).toBe(false);
    expect(inSegment(o2, "owes", today)).toBe(true);
    expect(inSegment(o1, "regular", today)).toBe(false);
    expect(inSegment(o2, "inactive", "2026-12-01")).toBe(false);
    expect(o1.owed).toBeGreaterThan(o2.owed);
    expect(sortCustomers([o2, o1], "owed")[0]).toBe(o1);
  });
});
