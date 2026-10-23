import { describe, expect, it } from "vitest";
import { cageIssues, hasIssues, hotelIssues, roomIssues } from "./onboardingRules";

const spec = (S: [number, number], M: [number, number] = [0, 75_000], L: [number, number] = [0, 120_000]) => ({
  S: { count: S[0], price: S[1] },
  M: { count: M[0], price: M[1] },
  L: { count: L[0], price: L[1] },
});

describe("setup rules", () => {
  it("needs a hotel name of 2 to 80 characters; city and WhatsApp are optional but checked when given", () => {
    expect(hotelIssues({ name: "  ", city: "", whatsapp: "" })).toEqual({ name: "required" });
    expect(hotelIssues({ name: "A", city: "", whatsapp: "" })).toEqual({ name: "short" });
    expect(hotelIssues({ name: "x".repeat(81), city: "", whatsapp: "" })).toEqual({ name: "long" });
    expect(hotelIssues({ name: "Rumah Meong", city: "y".repeat(61), whatsapp: "123" })).toEqual({ city: "long", whatsapp: "invalid" });
    expect(hotelIssues({ name: "Rumah Meong", city: "Bintaro", whatsapp: "0812 3456 7890" })).toEqual({});
  });

  it("needs at least one cage, and a believable price for each size in use", () => {
    expect(cageIssues(spec([0, 50_000]))).toEqual({ none: true });
    expect(cageIssues(spec([4, 0], [2, 500]))).toEqual({ price: { S: "low", M: "low" } });
    expect(cageIssues(spec([4, 50_000_000]))).toEqual({ price: { S: "high" } });
    // a size with no cages is not checked, whatever its price says
    expect(cageIssues(spec([4, 50_000], [0, 0]))).toEqual({});
  });

  it("needs every shared room named, named differently, with 2 to 50 places and a price", () => {
    const ok = { name: "Cat room", places: 8, price: 60_000 };
    expect(hasIssues(roomIssues([ok]))).toBe(false);
    expect(roomIssues([])).toMatchObject({ none: true });
    expect(roomIssues([ok, { ...ok, name: " cat ROOM " }]).rooms[1]).toEqual({ name: "duplicate" });
    expect(roomIssues([{ name: "", places: 1, price: 0 }]).rooms[0]).toEqual({ name: "required", places: "range", price: "low" });
    expect(roomIssues([{ ...ok, places: 51 }]).rooms[0]).toEqual({ places: "range" });
  });
});
