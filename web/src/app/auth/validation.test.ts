import { describe, expect, it } from "vitest";
import { isEmail, loginIssues, normaliseEmail, parseRegistration, passwordIssue } from "./validation";

const good = { name: " Rina Kusuma ", hotelName: " Rumah Meong ", email: " Rina@Example.COM ", whatsapp: "0812 3456 7890", password: "abc12345" };

describe("parseRegistration", () => {
  it("cleans up a valid sign-up", () => {
    expect(parseRegistration(good)).toEqual({
      ok: true,
      value: { name: "Rina Kusuma", hotelName: "Rumah Meong", email: "rina@example.com", whatsapp: "6281234567890", password: "abc12345" },
    });
  });

  it("asks for every missing field at once", () => {
    const out = parseRegistration({ name: "", hotelName: " ", email: "", whatsapp: "", password: "" });
    expect(out).toEqual({ ok: false, issues: { name: "required", hotelName: "required", email: "required", whatsapp: "required", password: "required" } });
  });

  it("rejects a bad email, a number that isn't Indonesian mobile, and a weak password", () => {
    const out = parseRegistration({ ...good, email: "rina@", whatsapp: "021 555 1234", password: "short" });
    expect(out).toEqual({ ok: false, issues: { email: "invalid", whatsapp: "invalid", password: "too_short" } });
  });

  it("never trims the password", () => {
    const out = parseRegistration({ ...good, password: " abc12345 " });
    expect(out.ok && out.value.password).toBe(" abc12345 ");
  });
});

describe("passwordIssue", () => {
  it.each([
    ["", "required"],
    ["abc123", "too_short"],
    ["abcdefgh", "too_weak"],
    ["12345678", "too_weak"],
    ["abcd1234", null],
    ["a long passphrase 7", null],
  ])("%j -> %s", (password, expected) => {
    expect(passwordIssue(password)).toBe(expected);
  });
});

describe("email", () => {
  it("is compared in lower case without padding", () => {
    expect(normaliseEmail("  Dewi@Example.com ")).toBe("dewi@example.com");
  });

  it.each([["a@b.co", true], ["dewi.lestari.482@example.com", true], ["a@b", false], ["a b@c.com", false], ["@c.com", false], ["", false]])(
    "%j is valid: %s",
    (value, expected) => expect(isEmail(value)).toBe(expected),
  );
});

describe("loginIssues", () => {
  it("only asks that something sensible was typed", () => {
    expect(loginIssues("", "")).toEqual({ email: "required", password: "required" });
    expect(loginIssues("nope", "x")).toEqual({ email: "invalid" });
    expect(loginIssues("a@b.co", "x")).toEqual({});
  });
});
