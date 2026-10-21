import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { emptyData, type HotelData } from "@/app/domain/types";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import { AppStoreProvider, useStore } from "./AppStore";
import type { HotelRepository } from "./storage";

/** An in-memory repository, so tests don't touch localStorage. */
function memoryRepo(initial: HotelData = emptyData(), saves: HotelData[] = [], ok = true): HotelRepository {
  return {
    load: () => initial,
    save: (d) => (saves.push(d), ok),
    clear: () => undefined,
  };
}
const wrap = (repo: HotelRepository) => ({ children }: { children: ReactNode }) => <AppStoreProvider repo={repo}>{children}</AppStoreProvider>;

describe("AppStore", () => {
  it("loads from the repository and saves every change", () => {
    const saves: HotelData[] = [];
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel(), saves)) });
    expect(result.current.data.pets).toHaveLength(2);
    act(() => result.current.deletePet("p1"));
    expect(result.current.data.pets).toHaveLength(1);
    expect(saves.at(-1)?.pets).toHaveLength(1);
  });

  it("lets several actions in one event build on each other (new owner, pet, then booking)", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel())) });
    let issues: unknown;
    act(() => {
      const ownerId = result.current.saveOwner({ name: "New Owner", whatsapp: "6285711223344" });
      result.current.savePet({ id: "p9", name: "Newbie", species: "cat", breed: "", ownerId, vaccineExpiry: "", notes: "" });
      issues = result.current.saveBooking(aBooking("b9", { petId: "p9", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" }));
    });
    expect(issues).toEqual([]);
    expect(result.current.data.bookings.map((b) => b.id)).toEqual(["b9"]);
    expect(result.current.data.pets.map((p) => p.id)).toContain("p9");
  });

  it("refuses a double booking made in the same event as the first", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel())) });
    const issues: unknown[] = [];
    act(() => {
      issues.push(result.current.saveBooking(aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })));
      issues.push(result.current.saveBooking(aBooking("b", { petId: "p2", cageId: "s1", checkIn: "2026-10-15", checkOut: "2026-10-17" })));
    });
    expect(issues).toEqual([[], ["cage_taken"]]);
    expect(result.current.data.bookings.map((b) => b.id)).toEqual(["a"]);
  });

  it("reports when a cage can't be deleted or a status can't change", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel({ bookings: [aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })] }))) });
    let deleted = "";
    let moved = true;
    act(() => {
      deleted = result.current.deleteCage("s1");
      moved = result.current.setBookingStatus("a", "checked_out");
    });
    expect(deleted).toBe("busy");
    expect(moved).toBe(false);
    expect(result.current.data.cages).toHaveLength(3);
  });

  it("flags a save that didn't stick", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(emptyData(), [], false)) });
    expect(result.current.saveFailed).toBe(true);
  });

  it("starts over on reset", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel())) });
    act(() => result.current.reset());
    expect(result.current.data).toEqual(emptyData());
  });

  it("fills in sample data on request", () => {
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo()) });
    act(() => result.current.loadSample());
    expect(result.current.data.hotel).not.toBeNull();
    expect(result.current.data.bookings.length).toBeGreaterThan(0);
  });

  it("takes a stay through check-in, a payment, a care entry and a report, each seeing the one before", () => {
    const booked = aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" });
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel({ bookings: [booked] }))) });
    const out: unknown[] = [];
    act(() => {
      out.push(result.current.recordCare({ bookingId: "a", at: new Date().toISOString(), kind: "meal", preset: "all", note: "" })); // not in yet
      out.push(result.current.checkIn("a", null));
      out.push(result.current.recordCare({ bookingId: "a", at: new Date().toISOString(), kind: "meal", preset: "all", note: "" }));
      out.push(result.current.recordPayment("a", { at: new Date().toISOString(), amount: 20_000, method: "cash", kind: "payment" as const, reference: "", note: "" }));
      result.current.markReportSent("a", "2026-10-15", new Date().toISOString());
    });
    expect(out).toEqual([["not_staying"], true, [], []]);
    expect(result.current.data.careLog).toHaveLength(1);
    expect(result.current.data.bookings[0].payments).toHaveLength(1);
    expect(result.current.data.reportsSent).toHaveLength(1);
  });

  it("edits a stay's cage and refuses an edit that would double-book", () => {
    const a = aBooking("a", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" });
    const b = aBooking("b", { petId: "p2", cageId: "s2", checkIn: "2026-10-14", checkOut: "2026-10-16" });
    const { result } = renderHook(() => useStore(), { wrapper: wrap(memoryRepo(aSmallHotel({ bookings: [a, b] }))) });
    const issues: unknown[] = [];
    act(() => {
      issues.push(result.current.editBooking("a", { cageId: "s2" }));
      issues.push(result.current.editBooking("a", { cageId: "m1" }));
    });
    expect(issues).toEqual([["cage_taken"], []]);
    expect(result.current.data.bookings[0].cageId).toBe("m1");
  });
});
