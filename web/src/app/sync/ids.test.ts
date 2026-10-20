import { describe, expect, it } from "vitest";
import { isUuid, uuidFor } from "./ids";

describe("uuidFor", () => {
  it("leaves a UUID alone, in lower case", () => {
    expect(uuidFor("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  it("turns any other id into a valid v4 UUID", () => {
    for (const id of ["b1", "s-01", "", "a b", "12345", "ünï"]) expect(uuidFor(id)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("gives the same one every time, and different ones for different ids", () => {
    expect(uuidFor("b1")).toBe(uuidFor("b1"));
    const many = new Set(Array.from({ length: 5000 }, (_, i) => uuidFor(`id-${i}`)));
    expect(many.size).toBe(5000);
    expect(uuidFor("b1")).not.toBe(uuidFor("b2"));
  });

  it("keeps two hotels that both have a \"b1\" apart, and a UUID is the same in every hotel", () => {
    expect(uuidFor("b1", "hotel-a")).not.toBe(uuidFor("b1", "hotel-b"));
    expect(uuidFor("b1", "hotel-a")).toBe(uuidFor("b1", "hotel-a"));
    expect(uuidFor("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "hotel-a")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  it("knows what a UUID is", () => {
    expect(isUuid(uuidFor("x"))).toBe(true);
    expect(isUuid("b1")).toBe(false);
  });
});
