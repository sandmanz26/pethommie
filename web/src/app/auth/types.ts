/** Who can sign in, and what comes back from the auth service. Nothing here knows where accounts are stored. */

export type PasswordHash = {
  algo: "pbkdf2-sha256";
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  hash: string;
};

/** What the app sees about the person signed in. Never includes the password. */
export type Account = {
  id: string;
  name: string;
  /** Lower-case; this is the login. */
  email: string;
  /** Normalised 62xxxxxxxxxx. */
  whatsapp: string;
  hotelName: string;
  createdAt: string;
  /** Mock accounts only: open with the sample hotel already filled in. Goes away with the mock service. */
  startsWithSampleData?: boolean;
  /** Mock accounts only: which sample hotel ("advanced" opens the busy one, in advanced mode). */
  sampleKind?: "simple" | "advanced";
  /** Where the account lives: this browser (the mock) or Supabase (Google sign-in). */
  provider?: "local" | "supabase";
  /** Profile picture from Google, when there is one. */
  avatarUrl?: string;
  /** A "Try now" session: one of the demo hotels, kept apart from real accounts and their data. */
  demo?: true;
  /** A discount claimed from the demo, kept with the account until paid plans open. */
  offer?: Offer;
};

/** A discount offered in the demo: a share off the first paid plan, valid until a moment in time. */
export type Offer = { code: string; percentOff: number; expiresAt: string };

export type StoredAccount = Account & { password: PasswordHash };

/** A new account, already cleaned up by `parseRegistration`. */
export type Registration = {
  name: string;
  hotelName: string;
  email: string;
  whatsapp: string;
  password: string;
};

export type AuthError = "invalid_credentials" | "email_taken" | "unsupported" | "network";
export type AuthResult = { ok: true; account: Account } | { ok: false; error: AuthError };
