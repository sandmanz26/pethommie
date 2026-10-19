import { describe, expect, it } from "vitest";
import { landingAfterLogin } from "./landing";

describe("landingAfterLogin", () => {
  it("returns to the page that was asked for, query included", () => {
    expect(landingAfterLogin("/app/bookings")).toBe("/app/bookings");
    expect(landingAfterLogin("/app/bookings/new?pet=p1")).toBe("/app/bookings/new?pet=p1");
    expect(landingAfterLogin("/app")).toBe("/app");
  });

  it("falls back to the app's home when there is nowhere sensible to go back to", () => {
    expect(landingAfterLogin(undefined)).toBe("/app");
    expect(landingAfterLogin(42)).toBe("/app");
    expect(landingAfterLogin("/app/login")).toBe("/app");
    expect(landingAfterLogin("/app/register")).toBe("/app");
  });

  it.each(["https://evil.example", "//evil.example/app", "/", "/pricing", "/applesauce", "javascript:alert(1)", "\\\\evil.example"])(
    "never leaves the app: %s",
    (target) => {
      expect(landingAfterLogin(target)).toBe("/app");
    },
  );
});
