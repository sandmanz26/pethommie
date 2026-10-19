import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

const FAST = 1000;

describe("passwords", () => {
  it("accepts the right password and rejects any other", async () => {
    const stored = await hashPassword("Correct horse 7", FAST);
    expect(await verifyPassword("Correct horse 7", stored)).toBe(true);
    expect(await verifyPassword("Correct horse 8", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("gives the same password a different hash each time", async () => {
    const a = await hashPassword("same-password-1", FAST);
    const b = await hashPassword("same-password-1", FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("is not the password in disguise", async () => {
    const stored = await hashPassword("hunter2hunter2", FAST);
    expect(JSON.stringify(stored)).not.toContain("hunter2");
    expect(stored).toMatchObject({ algo: "pbkdf2-sha256", iterations: FAST });
  });

  it("verifies with the iteration count it was saved with", async () => {
    const stored = await hashPassword("abc12345", 2000);
    expect(await verifyPassword("abc12345", { ...stored })).toBe(true);
    expect(await verifyPassword("abc12345", { ...stored, iterations: 1999 })).toBe(false);
  });
});
