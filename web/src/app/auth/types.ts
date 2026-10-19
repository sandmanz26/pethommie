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
};

export type StoredAccount = Account & { password: PasswordHash };

/** A new account, already cleaned up by `parseRegistration`. */
export type Registration = {
  name: string;
  hotelName: string;
  email: string;
  whatsapp: string;
  password: string;
};

export type AuthError = "invalid_credentials" | "email_taken";
export type AuthResult = { ok: true; account: Account } | { ok: false; error: AuthError };
