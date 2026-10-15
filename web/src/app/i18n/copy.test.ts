import { describe, expect, it } from "vitest";
import { shapeOf } from "@/test/shape";
import { appEn } from "./en";
import { appId } from "./id";

describe("app copy", () => {
  it("has the same structure in every language", () => {
    expect(shapeOf(appId)).toEqual(shapeOf(appEn));
  });

  it("answers function-valued copy with text in both languages", () => {
    expect(appEn.common.nights(1)).toBe("1 night");
    expect(appEn.common.nights(3)).toBe("3 nights");
    expect(typeof appId.common.nights(3)).toBe("string");
    expect(appId.onboarding.done.summary(6, "Rp 50.000")).toContain("6 kandang");
  });
});
