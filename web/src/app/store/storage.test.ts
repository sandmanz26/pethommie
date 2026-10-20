import { describe, expect, it, vi } from "vitest";
import { defaultSettings, emptyData } from "@/app/domain/types";
import { aSmallHotel } from "@/app/testing/fixtures";
import { createLocalRepository, dataKeyFor, parseStored } from "./storage";

describe("parseStored", () => {
  it("treats nothing stored as a fresh start, not a problem", () => {
    expect(parseStored(null)).toEqual({ data: emptyData(), problem: null });
  });

  it("reads back what was saved", () => {
    const data = aSmallHotel();
    expect(parseStored(JSON.stringify(data))).toEqual({ data, problem: null });
  });

  it.each([
    ["not JSON", "{oops"],
    ["a number", "42"],
    ["an array", "[]"],
    ["no version", JSON.stringify({ hotel: null, cages: [], owners: [], pets: [], bookings: [] })],
    ["a list that isn't a list", JSON.stringify({ ...aSmallHotel(), cages: null })],
    ["a record without an id", JSON.stringify({ ...aSmallHotel(), pets: [{ name: "x" }] })],
    ["a hotel without a name", JSON.stringify({ ...aSmallHotel(), hotel: { city: "x" } })],
    ["an impossible version", JSON.stringify({ ...aSmallHotel(), version: 0 })],
    ["a v2 document without its care log", JSON.stringify({ ...aSmallHotel(), careLog: undefined })],
    ["a booking without payments", JSON.stringify({ ...aSmallHotel({ bookings: [{ id: "b", petId: "p1", cageId: "s1", checkIn: "2026-10-01", checkOut: "2026-10-02", status: "booked", arrival: null, notes: "", createdAt: "" }] as never }) })],
  ])("flags %s as corrupt, and returns empty data", (_label, raw) => {
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "corrupt" });
  });

  it("flags data from a newer version of the app, without trying to read it", () => {
    const raw = JSON.stringify({ ...aSmallHotel(), version: 4, somethingNew: true });
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "newer" });
  });
});

describe("upgrading a version 1 document", () => {
  const v1 = (bookings: unknown[]) =>
    JSON.stringify({ version: 1, hotel: aSmallHotel().hotel, cages: aSmallHotel().cages, owners: aSmallHotel().owners, pets: aSmallHotel().pets, bookings });
  const old = { id: "b1", petId: "p1", cageId: "s1", checkIn: "2026-10-01", checkOut: "2026-10-03", status: "booked", notes: "x", createdAt: "2026-09-30T10:00:00.000Z" };

  it("turns a deposit into a payment, so no money is lost", () => {
    const { data, problem, migratedFrom } = parseStored(v1([{ ...old, deposit: 100_000 }]));
    expect(problem).toBeNull();
    expect(migratedFrom).toBe(1);
    expect(data.version).toBe(3);
    expect(data.bookings[0]).not.toHaveProperty("deposit");
    expect(data.bookings[0].payments).toEqual([expect.objectContaining({ amount: 100_000, at: "2026-09-30T10:00:00.000Z" })]);
    expect(data.bookings[0]).toMatchObject({ arrival: null, notes: "x" });
    expect(data.careLog).toEqual([]);
    expect(data.reportsSent).toEqual([]);
  });

  it("gives a booking with no deposit no payments", () => {
    expect(parseStored(v1([{ ...old, deposit: 0 }])).data.bookings[0].payments).toEqual([]);
    expect(parseStored(v1([old])).data.bookings[0].payments).toEqual([]);
  });

  it("still refuses a version 1 document that is broken", () => {
    expect(parseStored(JSON.stringify({ version: 1, hotel: null, cages: null }))).toEqual({ data: emptyData(), problem: "corrupt" });
  });
});

describe("upgrading a version 2 document", () => {
  const v2 = () => {
    const { settings: _s, invoices: _i, ...rest } = aSmallHotel({
      bookings: [{ id: "b1", petId: "p1", cageId: "s1", checkIn: "2026-10-01", checkOut: "2026-10-03", status: "checked_in", payments: [{ id: "pay", at: "2026-10-01T08:00:00.000Z", amount: 5, method: "cash", note: "" }], arrival: null, notes: "keep", createdAt: "2026-09-30T10:00:00.000Z" }] as never,
      careLog: [{ id: "c", bookingId: "b1", at: "2026-10-02T08:00:00.000Z", kind: "meal", preset: "all", note: "" }],
    });
    return { ...rest, version: 2, owners: rest.owners.map(({ language: _l, ...o }) => o) };
  };

  it("adds what is new and changes nothing else", () => {
    const { data, problem, migratedFrom } = parseStored(JSON.stringify(v2()));
    expect(problem).toBeNull();
    expect(migratedFrom).toBe(2);
    expect(data.version).toBe(3);
    expect(data.bookings[0]).toMatchObject({ id: "b1", status: "checked_in", notes: "keep", charges: [], companionIds: [], payments: [expect.objectContaining({ amount: 5 })] });
    expect(data.owners.every((o) => o.language === "id")).toBe(true);
    expect(data.invoices).toEqual([]);
    expect(data.settings).toEqual(defaultSettings());
    expect(data.careLog).toHaveLength(1);
    expect(data.hotel?.name).toBe("Rumah Meong");
  });

  it("does not take a version 2 document that is broken", () => {
    expect(parseStored(JSON.stringify({ ...v2(), careLog: null }))).toEqual({ data: emptyData(), problem: "corrupt" });
  });

  it("does not take a version 3 document without its settings, invoices or owner languages", () => {
    const ok = JSON.parse(JSON.stringify(aSmallHotel()));
    expect(parseStored(JSON.stringify(ok)).problem).toBeNull();
    for (const bad of [{ ...ok, settings: undefined }, { ...ok, invoices: undefined }, { ...ok, owners: [{ id: "o", name: "x", whatsapp: "" }] }]) {
      expect(parseStored(JSON.stringify(bad)).problem).toBe("corrupt");
    }
  });
});

describe("createLocalRepository", () => {
  const KEY = dataKeyFor("acct-1");
  const BACKUP = `${KEY}.backup`;
  const repo = createLocalRepository(KEY);

  it("round-trips data through localStorage", () => {
    const data = aSmallHotel();
    expect(repo.save(data)).toBe(true);
    expect(repo.load()).toEqual(data);
  });

  it("keeps each account's hotel apart", () => {
    const other = createLocalRepository(dataKeyFor("acct-2"));
    repo.save(aSmallHotel());
    expect(other.load()).toEqual(emptyData());
    other.save(aSmallHotel({ hotel: { name: "Someone else", city: "", whatsapp: "", createdAt: "" } }));
    expect(repo.load().hotel?.name).toBe("Rumah Meong");
  });

  it("loads empty data on a first visit and writes no backup", () => {
    expect(repo.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP)).toBeNull();
  });

  it("starts a new document from the given initial data, and never again once something is saved", () => {
    const withSample = createLocalRepository(KEY, () => aSmallHotel());
    expect(withSample.load().cages).toHaveLength(3);
    withSample.save(emptyData());
    expect(withSample.load()).toEqual(emptyData());
  });

  it("keeps a copy of unreadable data before anything can overwrite it", () => {
    localStorage.setItem(KEY, "{corrupt");
    expect(repo.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP)).toBe("{corrupt");
  });

  it("keeps newer-version data safe in the backup too", () => {
    const raw = JSON.stringify({ ...aSmallHotel(), version: 7 });
    localStorage.setItem(KEY, raw);
    expect(repo.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP)).toBe(raw);
  });

  it("keeps the original of an upgraded document, once", () => {
    const raw = JSON.stringify({ version: 1, hotel: null, cages: [], owners: [], pets: [], bookings: [] });
    localStorage.setItem(KEY, raw);
    expect(repo.load().version).toBe(3);
    expect(localStorage.getItem(`${KEY}.v1.backup`)).toBe(raw);
    localStorage.setItem(`${KEY}.v1.backup`, "kept");
    repo.load();
    expect(localStorage.getItem(`${KEY}.v1.backup`)).toBe("kept");
  });

  it("reports a failed save instead of pretending it worked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(repo.save(aSmallHotel())).toBe(false);
  });

  it("survives storage being blocked entirely", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(repo.load()).toEqual(emptyData());
  });

  it("clears", () => {
    repo.save(aSmallHotel());
    repo.clear();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
