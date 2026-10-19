import { describe, expect, it, vi } from "vitest";
import { emptyData } from "@/app/domain/types";
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
  ])("flags %s as corrupt, and returns empty data", (_label, raw) => {
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "corrupt" });
  });

  it("flags data from a newer version of the app, without trying to read it", () => {
    const raw = JSON.stringify({ ...aSmallHotel(), version: 2, somethingNew: true });
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "newer" });
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
