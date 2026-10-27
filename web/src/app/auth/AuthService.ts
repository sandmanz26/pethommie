import type { Account, AuthError, AuthResult, Offer, Registration } from "./types";

/**
 * Everything the app needs from "the server" about who you are. Async on purpose: the local mock
 * answers immediately, but a real backend won't, and callers must already cope with that.
 * Replace `localAuthService` with an API-backed one; the pages don't change.
 */
/** How people can sign in with this service. */
export type AuthMethods = { password: boolean; google: boolean };

export type AuthService = {
  methods: AuthMethods;
  /**
   * Leaves for Google's sign-in page; the visitor comes back to /app/auth/callback, signed in. Registering and logging
   * in are the same step: a new Google account becomes a new Pethommie account. `next` is where to go afterwards.
   */
  signInWithGoogle(next?: string): Promise<{ ok: false; error: AuthError } | { ok: true }>;
  /** Called with the account whenever the session changes outside the app's own calls (a token refresh, another tab). */
  onChange?(listener: (account: Account | null) => void): () => void;
  /** The signed-in account, if a session exists. */
  restore(): Promise<Account | null>;
  /** Creates the account and signs it in; an offer claimed in the demo goes with it. */
  register(input: Registration, offer?: Offer): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  /** Opens one of the demo hotels ("Try now"). Demo accounts have no password and never mix with real ones. */
  tryDemo(accountId: string): Promise<AuthResult>;
  logout(): Promise<void>;
};
