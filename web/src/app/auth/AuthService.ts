import type { Account, AuthResult, Offer, Registration } from "./types";

/**
 * Everything the app needs from "the server" about who you are. Async on purpose: the local mock
 * answers immediately, but a real backend won't, and callers must already cope with that.
 * Replace `localAuthService` with an API-backed one; the pages don't change.
 */
export type AuthService = {
  /** The signed-in account, if a session exists. */
  restore(): Promise<Account | null>;
  /** Creates the account and signs it in; an offer claimed in the demo goes with it. */
  register(input: Registration, offer?: Offer): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  /** Opens one of the demo hotels ("Try now"). Demo accounts have no password and never mix with real ones. */
  tryDemo(accountId: string): Promise<AuthResult>;
  logout(): Promise<void>;
};
