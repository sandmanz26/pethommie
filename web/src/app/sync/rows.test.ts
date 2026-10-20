import { describe, expect, it } from "vitest";
import { aBooking, aCage, aCareEntry, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { sampleData } from "@/app/store/sampleData";
import type { HotelData } from "@/app/domain/types";
import { uuidFor } from "./ids";
import { fromRows, iso, toRows } from "./rows";

const HOTEL = "7d1f6c0e-5a3b-4d1c-9a55-0c1f2e3d4b5a";

/** What a round trip should give back: payments listed in the order the server returns them. */
const settled = (d: HotelData): HotelData => ({
  ...d,
  bookings: d.bookings.map((b) => ({ ...b, payments: [...b.payments].sort((a, c) => a.at.localeCompare(c.at) || a.id.localeCompare(c.id)) })),
});

describe("toRows / fromRows", () => {
  it("gives back what it was given, for the whole sample hotel", () => {
    const data = sampleData();
    const { hotel, rows } = toRows(data, HOTEL);
    expect(fromRows(hotel, rows)).toEqual(settled(data));
  });

  it("carries the add-ons, shared cages and invoices of the sample hotel, so the round trip above is not empty", () => {
    const { rows } = toRows(sampleData(), HOTEL);
    expect(rows.charges.length).toBeGreaterThan(0);
    expect(rows.booking_pets.length).toBeGreaterThan(0);
    expect(rows.invoices.length).toBeGreaterThan(0);
  });

  it("puts every row in its hotel, and every payment under its stay", () => {
    const data = sampleData();
    const { rows } = toRows(data, HOTEL);
    for (const table of Object.values(rows)) for (const row of table) expect(row.hotel_id).toBe(HOTEL);
    const stays = new Set(rows.bookings.map((b) => b.id));
    for (const p of rows.payments) expect(stays.has(p.booking_id)).toBe(true);
    expect(rows.payments.length).toBe(data.bookings.reduce((n, b) => n + b.payments.length, 0));
  });

  it("uses the server's names and nulls: no vaccine date is null, not an empty string", () => {
    const data = aSmallHotel({ pets: [aPet("p1", "o1", { vaccineExpiry: "" }), aPet("p2", "o1", { vaccineExpiry: "2027-01-02" })] });
    const { rows } = toRows(data, HOTEL);
    expect(rows.pets.map((p) => p.vaccine_expiry)).toEqual([null, "2027-01-02"]);
    expect(rows.cages[0]).toMatchObject({ size: "S", price_per_night: 50_000 });
  });

  it("gives old, hand-made ids fixed UUIDs, and every reference follows", () => {
    const data = aSmallHotel({
      bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", payments: [{ id: "pay1", at: "2026-10-14T08:00:00.000Z", amount: 5, method: "cash", kind: "payment" as const, reference: "", note: "" }] })],
      careLog: [aCareEntry("c1", "b1")],
      reportsSent: [{ bookingId: "b1", date: "2026-10-15", at: "2026-10-15T08:00:00.000Z" }],
    });
    const { rows } = toRows(data, HOTEL);
    expect(rows.bookings[0].id).toBe(uuidFor("b1", HOTEL));
    expect(rows.bookings[0].pet_id).toBe(rows.pets[0].id);
    expect(rows.bookings[0].cage_id).toBe(rows.cages[0].id);
    expect(rows.pets[0].owner_id).toBe(rows.owners[0].id);
    expect(rows.payments[0].booking_id).toBe(rows.bookings[0].id);
    expect(rows.care_entries[0].booking_id).toBe(rows.bookings[0].id);
    expect(rows.reports_sent[0].booking_id).toBe(rows.bookings[0].id);
  });

  it("does the same thing twice: converting again changes nothing", () => {
    const data = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })] });
    const first = toRows(data, HOTEL);
    const again = toRows(fromRows(first.hotel, first.rows), HOTEL);
    expect(again).toEqual(first);
  });

  it("dates a payment or entry with no usable time instead of failing the upload", () => {
    const data = aSmallHotel({
      bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", createdAt: "2026-10-10T00:00:00.000Z", payments: [{ id: "x", at: "", amount: 5, method: "cash", kind: "payment" as const, reference: "", note: "" }] })],
      careLog: [aCareEntry("c1", "b1", { at: "garbage" })],
    });
    const { rows } = toRows(data, HOTEL);
    expect(rows.payments[0].paid_at).toBe("2026-10-10T00:00:00.000Z");
    expect(Number.isNaN(Date.parse(rows.care_entries[0].at))).toBe(false);
  });

  it("keeps the arrival record whole, or null", () => {
    const arrival = { at: "2026-10-14T09:00:00.000Z", healthy: true, fleaFree: false, weightKg: 4.2, belongings: "bag", food: "", notes: "scratch" };
    const data = aSmallHotel({ bookings: [aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", arrival }), aBooking("b", { petId: "p2", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-16" })] });
    const { rows } = toRows(data, HOTEL);
    expect(rows.bookings.map((b) => b.arrival)).toEqual([arrival, null]);
  });
});

describe("iso", () => {
  it("writes any form of the same instant the one way, and falls back on nonsense", () => {
    expect(iso("2026-10-14T09:00:00+00:00", "x")).toBe("2026-10-14T09:00:00.000Z");
    expect(iso("2026-10-14T16:00:00+07:00", "x")).toBe("2026-10-14T09:00:00.000Z");
    expect(iso(new Date(Date.UTC(2026, 9, 14, 9)), "x")).toBe("2026-10-14T09:00:00.000Z");
    expect(iso("nope", "fallback")).toBe("fallback");
  });
});

describe("the fixtures used elsewhere", () => {
  it("convert without losing a record", () => {
    const data = aSmallHotel({ cages: [aCage("s1")], owners: [anOwner("o1", "6281234567890")] });
    const { hotel, rows } = toRows(data, HOTEL);
    expect(fromRows(hotel, rows).owners).toEqual([{ id: uuidFor("o1", HOTEL), name: "Owner o1", whatsapp: "6281234567890", language: "id" }]);
  });
});
