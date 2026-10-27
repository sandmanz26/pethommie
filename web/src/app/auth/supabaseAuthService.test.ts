import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { demoAccounts } from "./demoAccounts";
import { createLocalAuthService } from "./localAuthService";
import { accountFromUser, createSupabaseAuthService, PENDING_OFFER_KEY, type AuthClient } from "./supabaseAuthService";

const user = (over: Partial<User> = {}): User =>
  ({
    id: "8c1f-user",
    email: "Rina@Gmail.com",
    created_at: "2026-10-27T01:00:00Z",
    app_metadata: { provider: "google" },
    user_metadata: { full_name: "Rina Kusuma", avatar_url: "https://lh3.googleusercontent.com/a/x" },
    aud: "authenticated",
    ...over,
  }) as User;

function fakeClient(signedIn: User | null = null) {
  let current = signedIn;
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: current ? { user: current } : null }, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => {
      current = null;
      return { error: null };
    }),
    updateUser: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      current = current && ({ ...current, user_metadata: { ...current.user_metadata, ...data } } as User);
      return { data: { user: current }, error: null };
    }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
  return { auth } as unknown as AuthClient & { auth: typeof auth };
}

const service = (client: ReturnType<typeof fakeClient>) =>
  createSupabaseAuthService({
    client,
    local: createLocalAuthService({ demo: demoAccounts, iterations: 1000 }),
    callbackUrl: (next) => `https://pethommie.test/app/auth/callback?next=${encodeURIComponent(next)}`,
  });

describe("accounts through Supabase and Google", () => {
  it("reads the Google profile into an account, with no hotel details yet", () => {
    expect(accountFromUser(user())).toEqual({
      id: "8c1f-user",
      provider: "supabase",
      name: "Rina Kusuma",
      email: "rina@gmail.com",
      whatsapp: "",
      hotelName: "",
      avatarUrl: "https://lh3.googleusercontent.com/a/x",
      createdAt: "2026-10-27T01:00:00Z",
    });
    expect(accountFromUser(user({ user_metadata: {} })).name).toBe("Rina");
  });

  it("signs in with Google only, coming back to the callback with where to go next", async () => {
    const client = fakeClient();
    const auth = service(client);
    expect(auth.methods).toEqual({ password: false, google: true });
    expect(await auth.signInWithGoogle("/app/bookings/new")).toEqual({ ok: true });
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://pethommie.test/app/auth/callback?next=%2Fapp%2Fbookings%2Fnew", queryParams: { prompt: "select_account" } },
    });
    expect(await auth.login("rina@gmail.com", "x")).toEqual({ ok: false, error: "unsupported" });
    expect(await auth.register({ name: "R", hotelName: "H", email: "r@x.co", whatsapp: "62812", password: "abc12345" })).toEqual({ ok: false, error: "unsupported" });
  });

  it("restores the Supabase session, and nothing when signed out", async () => {
    expect(await service(fakeClient()).restore()).toBeNull();
    expect(await service(fakeClient(user())).restore()).toMatchObject({ id: "8c1f-user", provider: "supabase" });
  });

  it("keeps Try now local: a demo session wins, and logging out ends both", async () => {
    const client = fakeClient(user());
    const auth = service(client);
    await auth.tryDemo("demo-rina");
    expect(await auth.restore()).toMatchObject({ id: "demo-rina", demo: true });
    await auth.logout();
    expect(client.auth.signOut).toHaveBeenCalled();
    expect(await auth.restore()).toBeNull();
  });

  it("puts a demo offer claimed before the Google trip onto the account, once", async () => {
    const offer = { code: "DEMO50", percentOff: 50, expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
    localStorage.setItem(PENDING_OFFER_KEY, JSON.stringify(offer));
    const client = fakeClient(user());
    const account = await service(client).restore();
    expect(account?.offer).toEqual(offer);
    expect(client.auth.updateUser).toHaveBeenCalledWith({ data: { offer } });
    expect(localStorage.getItem(PENDING_OFFER_KEY)).toBeNull();
  });

  it("says so when Google sign-in can't start", async () => {
    const client = fakeClient();
    client.auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: new Error("offline") } as never);
    expect(await service(client).signInWithGoogle()).toEqual({ ok: false, error: "network" });
  });
});
