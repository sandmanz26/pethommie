import { describe, expect, it } from "vitest";
import { demoAccounts } from "./demoAccounts";
import { hashPassword } from "./password";
import { ACCOUNTS_KEY, createLocalAuthService, SESSION_KEY } from "./localAuthService";
import type { Registration } from "./types";

const FAST = { iterations: 1000 };
const rina: Registration = { name: "Rina Kusuma", hotelName: "Rumah Meong", email: "rina@example.com", whatsapp: "6281234567890", password: "abc12345" };

describe("register", () => {
  it("creates the account and signs it in", async () => {
    const auth = createLocalAuthService(FAST);
    const out = await auth.register(rina);
    expect(out.ok && out.account).toMatchObject({ name: "Rina Kusuma", email: "rina@example.com", hotelName: "Rumah Meong" });
    expect(await auth.restore()).toMatchObject({ email: "rina@example.com" });
  });

  it("never stores or returns the password as typed", async () => {
    const auth = createLocalAuthService(FAST);
    const out = await auth.register(rina);
    expect(JSON.stringify(out)).not.toContain("abc12345");
    expect(out.ok && "password" in out.account).toBe(false);
    expect(localStorage.getItem(ACCOUNTS_KEY)).not.toContain("abc12345");
  });

  it("refuses a second account with the same email, whatever its case", async () => {
    const auth = createLocalAuthService(FAST);
    await auth.register(rina);
    expect(await auth.register({ ...rina, email: "RINA@Example.com", name: "Someone else" })).toEqual({ ok: false, error: "email_taken" });
  });

  it("gives every account its own id", async () => {
    const auth = createLocalAuthService(FAST);
    const a = await auth.register(rina);
    const b = await auth.register({ ...rina, email: "other@example.com" });
    expect(a.ok && b.ok && a.account.id !== b.account.id).toBe(true);
  });
});

describe("login", () => {
  it("lets the right email and password in, ignoring the email's case and padding", async () => {
    const auth = createLocalAuthService(FAST);
    await auth.register(rina);
    await auth.logout();
    const out = await auth.login("  RINA@example.com ", "abc12345");
    expect(out.ok).toBe(true);
    expect(await auth.restore()).toMatchObject({ email: "rina@example.com" });
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const auth = createLocalAuthService(FAST);
    await auth.register(rina);
    const wrongPassword = await auth.login("rina@example.com", "wrong-password-1");
    const unknownEmail = await auth.login("nobody@example.com", "abc12345");
    expect(wrongPassword).toEqual({ ok: false, error: "invalid_credentials" });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it("does not sign anyone in on a failed attempt", async () => {
    const auth = createLocalAuthService(FAST);
    await auth.register(rina);
    await auth.logout();
    await auth.login("rina@example.com", "nope-nope-1");
    expect(await auth.restore()).toBeNull();
  });
});

describe("session", () => {
  it("survives a new service instance (a page reload) and ends on logout", async () => {
    await createLocalAuthService(FAST).register(rina);
    const reloaded = createLocalAuthService(FAST);
    expect(await reloaded.restore()).toMatchObject({ email: "rina@example.com" });
    await reloaded.logout();
    expect(await createLocalAuthService(FAST).restore()).toBeNull();
  });

  it("is dropped if the account it points to is gone", async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accountId: "ghost" }));
    expect(await createLocalAuthService(FAST).restore()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("is dropped if it is unreadable", async () => {
    localStorage.setItem(SESSION_KEY, "{broken");
    expect(await createLocalAuthService(FAST).restore()).toBeNull();
  });
});

describe("stored accounts", () => {
  it("keeps unreadable data aside instead of overwriting it, and starts fresh", async () => {
    localStorage.setItem(ACCOUNTS_KEY, "{corrupt");
    const auth = createLocalAuthService(FAST);
    expect((await auth.register(rina)).ok).toBe(true);
    expect(localStorage.getItem(`${ACCOUNTS_KEY}.backup`)).toBe("{corrupt");
  });

  it("rejects an account record without a proper password hash", async () => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ version: 1, accounts: [{ id: "x", email: "x@y.co", name: "X", password: "plaintext" }] }));
    const auth = createLocalAuthService(FAST);
    expect(await auth.login("x@y.co", "plaintext")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(localStorage.getItem(`${ACCOUNTS_KEY}.backup`)).not.toBeNull();
  });
});

describe("demo hotels (Try now)", () => {
  const demo = demoAccounts;

  it("opens a demo hotel without a password, flagged as the demo, and keeps it open on the next visit", async () => {
    const auth = createLocalAuthService({ ...FAST, demo });
    const out = await auth.tryDemo("demo-rina");
    expect(out.ok && out.account).toMatchObject({ id: "demo-rina", hotelName: "Rumah Meong Bintaro", demo: true, startsWithSampleData: true });
    expect(await createLocalAuthService({ ...FAST, demo }).restore()).toMatchObject({ id: "demo-rina", demo: true });
  });

  it("never stores the demo hotels with the real accounts, and the login form can't open them", async () => {
    const auth = createLocalAuthService({ ...FAST, demo });
    await auth.tryDemo("demo-pro");
    expect(await auth.login("pro@pethommie.id", "Demo1234")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(JSON.parse(localStorage.getItem(ACCOUNTS_KEY)!).accounts).toEqual([]);
  });

  it("does not let a demo session pass as a real account with the same id", async () => {
    await createLocalAuthService(FAST).register(rina);
    const realId = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)!).accounts[0].id;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accountId: realId, demo: true }));
    expect(await createLocalAuthService({ ...FAST, demo }).restore()).toBeNull();
  });

  it("takes out the demo accounts older versions stored with a password, and leaves real ones alone", async () => {
    const password = await hashPassword("Demo1234", 1000);
    const old = { id: "demo-rina", name: "Rina", email: "demo@pethommie.id", whatsapp: "", hotelName: "Rumah Meong Bintaro", createdAt: "2026-01-01", password };
    const real = { ...old, id: "acct-1", email: "owner@example.com" };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ version: 1, accounts: [old, real] }));
    const auth = createLocalAuthService({ ...FAST, demo });
    expect(await auth.login("demo@pethommie.id", "Demo1234")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(await auth.login("owner@example.com", "Demo1234")).toMatchObject({ ok: true });
    expect(JSON.parse(localStorage.getItem(ACCOUNTS_KEY)!).accounts.map((a: { id: string }) => a.id)).toEqual(["acct-1"]);
  });

  it("refuses an unknown hotel, and has none at all for a launch without the demo", async () => {
    expect(await createLocalAuthService({ ...FAST, demo }).tryDemo("demo-nope")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(await createLocalAuthService(FAST).tryDemo("demo-rina")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("keeps a running demo discount with a new account, and drops one that has ended", async () => {
    const auth = createLocalAuthService(FAST);
    const offer = { code: "DEMO50", percentOff: 50, expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
    const kept = await auth.register(rina, offer);
    expect(kept.ok && kept.account.offer).toEqual(offer);
    const late = await auth.register({ ...rina, email: "late@example.com" }, { ...offer, expiresAt: new Date(Date.now() - 1).toISOString() });
    expect(late.ok && late.account.offer).toBeUndefined();
  });
});
