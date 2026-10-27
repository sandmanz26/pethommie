import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { AuthService } from "./AuthService";
import type { Account, Offer } from "./types";

/**
 * Real accounts, kept by Supabase and signed in with Google. Registering and logging in are one step: the first
 * Google sign-in creates the account. The hotel's name and WhatsApp come later, in setup.
 *
 * "Try now" stays local: its demo hotels are not Supabase users, so `local` (the browser's mock service) keeps
 * opening them, and its session wins while one is open.
 */

/** Only the part of the client used here, so tests can hand in a fake. */
export type AuthClient = Pick<SupabaseClient, "auth">;

/** An offer claimed in the demo waits here until the Google round trip is over, then goes onto the account. */
export const PENDING_OFFER_KEY = "pethommie.auth.pendingOffer";

export function accountFromUser(user: User): Account {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const offer = meta.offer as Offer | undefined;
  return {
    id: user.id,
    provider: "supabase",
    name: text(meta.full_name) || text(meta.name) || (user.email ?? "").split("@")[0],
    email: (user.email ?? "").toLowerCase(),
    whatsapp: text(meta.whatsapp),
    hotelName: text(meta.hotel_name),
    avatarUrl: text(meta.avatar_url) || text(meta.picture) || undefined,
    createdAt: user.created_at,
    ...(offer && typeof offer.expiresAt === "string" ? { offer } : {}),
  };
}

type Options = {
  client: AuthClient;
  /** The local service, for the demo hotels only. */
  local: AuthService;
  /** Where Google sends people back: this site's /app/auth/callback. */
  callbackUrl: (next: string) => string;
  storage?: Storage;
};

export function createSupabaseAuthService({ client, local, callbackUrl, storage = localStorage }: Options): AuthService {
  /** Puts a demo offer claimed before signing in onto the account, once. */
  async function keepPendingOffer(session: Session | null): Promise<Account | null> {
    if (!session) return null;
    let account = accountFromUser(session.user);
    try {
      const raw = storage.getItem(PENDING_OFFER_KEY);
      if (raw && !account.offer) {
        const offer = JSON.parse(raw) as Offer;
        if (Date.parse(offer.expiresAt) > Date.now()) {
          const { data } = await client.auth.updateUser({ data: { offer } });
          if (data.user) account = accountFromUser(data.user);
        }
      }
      if (raw) storage.removeItem(PENDING_OFFER_KEY);
    } catch {
      // the offer is a bonus: never block signing in over it
    }
    return account;
  }

  return {
    methods: { password: false, google: true },

    async restore() {
      const demo = await local.restore();
      if (demo?.demo) return demo;
      const { data } = await client.auth.getSession();
      return keepPendingOffer(data.session);
    },

    async signInWithGoogle(next = "/app") {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(next), queryParams: { prompt: "select_account" } },
      });
      return error ? { ok: false, error: "network" } : { ok: true };
    },

    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // A demo session is local and isn't Supabase's to end.
        void local.restore().then((demo) => {
          if (!demo?.demo) void keepPendingOffer(session).then(listener);
        });
      });
      return () => data.subscription.unsubscribe();
    },

    // Real accounts sign in with Google only.
    async register() {
      return { ok: false, error: "unsupported" };
    },
    async login() {
      return { ok: false, error: "unsupported" };
    },

    tryDemo: (id) => local.tryDemo(id),

    async logout() {
      await local.logout();
      await client.auth.signOut();
    },
  };
}
