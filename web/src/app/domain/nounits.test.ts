import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { scheduleIssues } from "./bookingRules";
import { poolDays } from "./calendar";
import { buildInvoice } from "./invoices";
import { priceList, cardFor, defaultLinkOptions } from "./linkCard";
import { busiestNight, canGoUnitless, freePlaces, poolCage, todayBoard, totalPlaces, unitLabel } from "./logic";
import { bookingConfirmation } from "./messages";
import { saveSettings } from "@/app/store/actions";
import { parseStored } from "@/app/store/storage";
import { defaultSettings, type HotelData } from "./types";

const pool = (capacity: number, bookings: HotelData["bookings"] = []) =>
  aSmallHotel({
    settings: { ...defaultSettings(), unitTerm: "none" },
    cages: [poolCage(capacity, 60_000, "Shared area", "pool")],
    owners: [anOwner("o1"), anOwner("o2"), anOwner("o3")],
    pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o2", { name: "Kopi" }), aPet("p3", "o3", { name: "Nala" }), aPet("p4", "o1", { name: "Kiko" })],
    bookings,
  });
const stay = (id: string, petId: string, checkIn: string, checkOut: string, companionIds: string[] = []) => aBooking(id, { petId, companionIds, cageId: "pool", checkIn, checkOut });

describe("a hotel without cages or rooms", () => {
  it("keeps one shared hidden unit, so each pet takes a place and pays", () => {
    expect(poolCage(1, 60_000, "x")).toMatchObject({ capacity: 2, archived: false });
    const data = pool(3, [stay("b1", "p1", "2026-11-01", "2026-11-03", ["p4"])]);
    expect(totalPlaces(data)).toBe(3);
    expect(freePlaces(data, "pool", "2026-11-01", "2026-11-03")).toBe(1);
    expect(freePlaces(data, "pool", "2026-11-02", "2026-11-05")).toBe(1);
    expect(freePlaces(data, "pool", "2026-11-03", "2026-11-05")).toBe(3);
    expect(busiestNight(data, "pool", "2026-11-02")).toBe(2);
    expect(busiestNight(data, "pool", "2026-11-03")).toBe(0);
    expect(todayBoard(data, "2026-11-01").freeTonight).toBe(1);
  });

  it("refuses a stay when the hotel is full on any night of it", () => {
    const data = pool(2, [stay("b1", "p1", "2026-11-01", "2026-11-03"), stay("b2", "p2", "2026-11-02", "2026-11-04")]);
    expect(scheduleIssues(data, { cageId: "pool", checkIn: "2026-11-01", checkOut: "2026-11-02", places: 1 })).toEqual([]);
    expect(scheduleIssues(data, { cageId: "pool", checkIn: "2026-11-01", checkOut: "2026-11-03", places: 1 })).toEqual(["cage_taken"]);
    expect(scheduleIssues(data, { cageId: "pool", checkIn: "2026-11-04", checkOut: "2026-11-05", places: 2 })).toEqual([]);
    expect(scheduleIssues(data, { cageId: "pool", checkIn: "2026-11-04", checkOut: "2026-11-05", places: 3 })).toEqual(["cage_taken"]);
  });

  it("counts each day's places against the total capacity, with who is staying", () => {
    const data = pool(3, [stay("b1", "p1", "2026-11-01", "2026-11-03", ["p4"]), { ...stay("b2", "p2", "2026-11-01", "2026-11-02"), status: "cancelled" }]);
    const days = poolDays(data, "2026-11-01", 3);
    expect(days.map((d) => [d.date, d.used, d.total, d.stays.map((b) => b.id)])).toEqual([
      ["2026-11-01", 2, 3, ["b1"]],
      ["2026-11-02", 2, 3, ["b1"]],
      ["2026-11-03", 0, 3, []],
    ]);
  });

  it("leaves the unit out of invoices, WhatsApp messages and the booking link", () => {
    const data = pool(3, [stay("b1", "p1", "2026-11-01", "2026-11-03")]);
    expect(unitLabel(data, data.cages[0])).toBe("");
    const made = buildInvoice(data, "b1", { id: "i1", issuedOn: "2026-11-03", language: "en" });
    if (!("invoice" in made)) throw new Error("no invoice");
    expect(made.invoice.lines[0].label).toBe("Boarding Mochi");
    expect(made.invoice.stay.cageName).toBe("");
    const text = bookingConfirmation({ hotelName: "H", ownerName: "O", petName: "Mochi", language: "en", checkIn: "2026-11-01", checkOut: "2026-11-03", cageName: "", total: 120_000, paid: 0 });
    expect(text).not.toMatch(/Cage/);
    expect(priceList(data, "en")).toEqual([{ label: "Per pet per night", price: 60_000 }]);
    expect(cardFor(data, defaultLinkOptions(data))?.units).toBe("space");
  });

  it("can only be switched to from a hotel with no units in use or a single shared room", () => {
    expect(canGoUnitless({ cages: [] })).toBe(true);
    expect(canGoUnitless({ cages: [aCage("room", "M", 60_000, 6)] })).toBe(true);
    expect(canGoUnitless({ cages: [aCage("s1")] })).toBe(false);
    expect(canGoUnitless({ cages: [aCage("r1", "M", 1, 4), aCage("r2", "M", 1, 4)] })).toBe(false);
    expect(canGoUnitless({ cages: [aCage("r1", "M", 1, 4), { ...aCage("s1"), archived: true }] })).toBe(true);
    const caged = aSmallHotel();
    expect(saveSettings(caged, { ...caged.settings, unitTerm: "none" }).result).toEqual(["layout"]);
    const oneRoom = aSmallHotel({ cages: [aCage("room", "M", 60_000, 6)] });
    expect(saveSettings(oneRoom, { ...oneRoom.settings, unitTerm: "none" }).state.settings.unitTerm).toBe("none");
  });

  it("is stored in the same document shape, so no migration is needed", () => {
    const data = pool(3, [stay("b1", "p1", "2026-11-01", "2026-11-03")]);
    const parsed = parseStored(JSON.stringify(data));
    expect(parsed.problem).toBeNull();
    expect(parsed.data.settings.unitTerm).toBe("none");
    expect(parsed.data.cages).toEqual(data.cages);
  });
});
