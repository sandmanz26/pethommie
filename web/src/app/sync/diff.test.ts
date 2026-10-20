import { describe, expect, it } from "vitest";
import { sampleData } from "@/app/store/sampleData";
import { checkInBooking, markReportSent, recordCare, recordPayment, removePayment, removePet, upsertBooking, upsertCage, upsertOwner, upsertPet } from "@/app/store/actions";
import { aBooking, aCage, aPet, aSmallHotel } from "@/app/testing/fixtures";
import type { HotelData } from "@/app/domain/types";
import { applyChanges, applyToData, diffData, diffRows, emptyChanges, isEmpty, mergeChanges } from "./diff";
import { createMemoryGateway } from "./gateway";
import { emptyRows, fromRows, toRows, type Rows } from "./rows";

const HOTEL = "7d1f6c0e-5a3b-4d1c-9a55-0c1f2e3d4b5a";
const stay = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" });
const sorted = (rows: Rows) => JSON.parse(JSON.stringify(rows, (_k, v) => (Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v)));

describe("diffData", () => {
  it("is empty when nothing changed", () => {
    const d = sampleData();
    expect(isEmpty(diffData(d, structuredClone(d), HOTEL))).toBe(true);
  });

  it("is exactly the one record that changed", () => {
    const before = aSmallHotel({ bookings: [stay] });
    const after = recordPayment(before, "b1", { at: "2026-10-14T08:00:00.000Z", amount: 50_000, method: "qris", note: "" }).state;
    const c = diffData(before, after, HOTEL);
    expect(c.payments.upsert).toHaveLength(1);
    expect(c.payments.upsert[0]).toMatchObject({ amount: 50_000, method: "qris" });
    expect(Object.entries(c).filter(([t, v]) => t !== "payments" && (v.upsert.length || v.remove.length))).toEqual([]);
  });

  it("notes a removal by key, including a report mark's two-part key", () => {
    const before = markReportSent(aSmallHotel({ bookings: [stay] }), "b1", "2026-10-15", "2026-10-15T08:00:00.000Z");
    const after = { ...before, reportsSent: [] };
    expect(diffData(before, after, HOTEL).reports_sent.remove).toEqual([{ booking_id: expect.any(String), report_date: "2026-10-15" }]);
  });

  it("follows a cascade: removing a pet removes its stays, payments and log", () => {
    const withAll = recordCare(
      recordPayment(aSmallHotel({ bookings: [{ ...stay, status: "checked_in" }] }), "b1", { at: "2026-10-14T08:00:00.000Z", amount: 5, method: "cash", note: "" }).state,
      { bookingId: "b1", at: new Date(2026, 9, 15, 9).toISOString(), kind: "meal", preset: "all", note: "" },
    ).state;
    const c = diffData(withAll, removePet(withAll, "p1"), HOTEL);
    expect([c.pets.remove.length, c.bookings.remove.length, c.payments.remove.length, c.care_entries.remove.length]).toEqual([1, 1, 1, 1]);
  });
});

describe("applying changes", () => {
  // A realistic evening of edits, one action after another: each step's diff, applied to the previous rows, must give the next rows.
  it("reproduces every step of a day's work", () => {
    let data: HotelData = aSmallHotel();
    const steps: ((d: HotelData) => HotelData)[] = [
      (d) => upsertCage(d, aCage("l1", "L", 120_000)),
      (d) => upsertOwner(d, { id: "o9", name: "New Owner", whatsapp: "6285711223344" }).state,
      (d) => upsertPet(d, aPet("p9", "o9", { name: "Newbie" })),
      (d) => upsertBooking(d, aBooking("b9", { petId: "p9", cageId: "l1", checkIn: "2026-10-14", checkOut: "2026-10-17" })).state,
      (d) => checkInBooking(d, "b9", { at: "2026-10-14T09:00:00.000Z", healthy: true, fleaFree: true, weightKg: 9, belongings: "", food: "", notes: "" }).state,
      (d) => recordPayment(d, "b9", { at: "2026-10-14T09:05:00.000Z", amount: 100_000, method: "transfer", note: "DP" }).state,
      (d) => recordCare(d, { bookingId: "b9", at: new Date(2026, 9, 15, 8).toISOString(), kind: "meal", preset: "most", note: "" }).state,
      (d) => markReportSent(d, "b9", "2026-10-15", "2026-10-15T18:00:00.000Z"),
      (d) => ({ ...d, bookings: d.bookings.map((b) => (b.payments.length ? removePayment(d, b.id, b.payments[0].id).bookings.find((x) => x.id === b.id)! : b)) }),
      (d) => removePet(d, "p9"),
    ];
    let rows = toRows(data, HOTEL).rows;
    for (const step of steps) {
      const next = step(data);
      const changes = diffData(data, next, HOTEL);
      rows = applyChanges(rows, changes);
      expect(sorted(rows)).toEqual(sorted(toRows(next, HOTEL).rows));
      data = next;
    }
  });

  it("brings another device up to date: apply the changes to its data and get the same hotel", () => {
    const a = sampleData();
    const { hotel } = toRows(a, HOTEL);
    const b = removePet(a, a.pets[0].id);
    const there = applyToData(a, hotel, diffData(a, b, HOTEL));
    expect(sorted(toRows(there, HOTEL).rows)).toEqual(sorted(toRows(b, HOTEL).rows));
  });

  it("ignores key order inside a row", () => {
    const rows = toRows(aSmallHotel(), HOTEL).rows;
    const reordered: Rows = { ...rows, cages: rows.cages.map((c) => Object.fromEntries(Object.entries(c).reverse()) as typeof c) };
    expect(isEmpty(diffRows(rows, reordered))).toBe(true);
  });
});

describe("mergeChanges", () => {
  const rowsOf = (d: HotelData) => toRows(d, HOTEL).rows;

  it("keeps the later write, and a removal cancels an earlier write", () => {
    const a = aSmallHotel();
    const b = upsertCage(a, aCage("n1"));
    const c = upsertCage(b, aCage("n1", "L", 99_000));
    const d = { ...c, cages: c.cages.filter((x) => x.id !== "n1") };
    const ab = diffRows(rowsOf(a), rowsOf(b));
    const bc = diffRows(rowsOf(b), rowsOf(c));
    const cd = diffRows(rowsOf(c), rowsOf(d));
    expect(mergeChanges(ab, bc).cages.upsert).toMatchObject([{ size: "L", price_per_night: 99_000 }]);
    const gone = mergeChanges(mergeChanges(ab, bc), cd);
    expect(gone.cages.upsert).toEqual([]);
    expect(gone.cages.remove).toHaveLength(1);
  });

  it("is a no-op with nothing", () => {
    const x = diffRows(rowsOf(aSmallHotel()), rowsOf(upsertCage(aSmallHotel(), aCage("z"))));
    expect(mergeChanges(emptyChanges(), x)).toEqual(x);
  });
});

describe("the in-memory gateway", () => {
  const start = () => {
    const a = aSmallHotel({ bookings: [stay] });
    const { hotel, rows } = toRows(a, HOTEL);
    return { a, hotel, gateway: createMemoryGateway(hotel), first: diffRows(emptyRows(), rows) };
  };

  it("takes a push and hands the same hotel to a second device that pulls", async () => {
    const { a, hotel, gateway, first } = start();
    expect(await gateway.push(HOTEL, first, null)).toEqual({ ok: true, cursor: "1" });
    const pulled = await gateway.pull(HOTEL, null);
    const device2 = fromRows(hotel, applyChanges(emptyRows(), pulled.changes));
    expect(sorted(toRows(device2, HOTEL).rows)).toEqual(sorted(toRows(a, HOTEL).rows));
    expect(pulled.cursor).toBe("1");
  });

  it("tells a device that is behind to pull first", async () => {
    const { gateway, first, a } = start();
    await gateway.push(HOTEL, first, null);
    const more = diffData(a, upsertCage(a, aCage("extra")), HOTEL);
    expect(await gateway.push(HOTEL, more, null)).toEqual({ ok: false, reason: "stale" });
    expect(await gateway.push(HOTEL, more, "1")).toEqual({ ok: true, cursor: "2" });
  });

  it("hands over only what changed since the cursor the device holds", async () => {
    const { gateway, first, a } = start();
    await gateway.push(HOTEL, first, null);
    await gateway.push(HOTEL, diffData(a, upsertCage(a, aCage("extra")), HOTEL), "1");
    const since = await gateway.pull(HOTEL, "1");
    expect(since.changes.cages.upsert).toHaveLength(1);
    expect(since.changes.bookings.upsert).toHaveLength(0);
    expect(since.cursor).toBe("2");
  });

  it("refuses a double booking made on another device, like the database would", async () => {
    const { gateway, first, a } = start();
    await gateway.push(HOTEL, first, null);
    const clash = aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-16", checkOut: "2026-10-19" });
    const changes = diffData(a, { ...a, bookings: [...a.bookings, clash] }, HOTEL);
    expect(await gateway.push(HOTEL, changes, "1")).toEqual({ ok: false, reason: "double_booking" });
    expect(gateway.version()).toBe(1);
  });
});
