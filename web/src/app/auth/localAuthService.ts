import { newId } from "@/app/domain/logic";
import type { AuthService } from "./AuthService";
import type { SeedAccount } from "./demoAccounts";
import { hashPassword, verifyPassword } from "./password";
import { normaliseEmail } from "./validation";
import type { Account, PasswordHash, StoredAccount } from "./types";

/**
 * A stand-in for a real backend: accounts live in this browser's localStorage. Passwords are hashed,
 * but anyone with access to the browser can read or edit this data, so this is for the demo only. It
 * is NOT security. Real sign-in needs a server (see docs/ARCHITECTURE.md).
 */

export const ACCOUNTS_KEY = "pethommie.auth.accounts.v1";
export const SESSION_KEY = "pethommie.auth.session.v1";

type AccountsDoc = { version: 1; accounts: StoredAccount[] };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function isPasswordHash(x: unknown): x is PasswordHash {
  return (
    isObject(x) &&
    x.algo === "pbkdf2-sha256" &&
    typeof x.iterations === "number" &&
    typeof x.salt === "string" &&
    typeof x.hash === "string"
  );
}

function isStoredAccount(x: unknown): x is StoredAccount {
  return (
    isObject(x) &&
    typeof x.id === "string" &&
    typeof x.email === "string" &&
    typeof x.name === "string" &&
    isPasswordHash(x.password)
  );
}

export const publicAccount = ({ password, ...account }: StoredAccount): Account => account;

type Options = {
  storage?: Storage;
  /** Accounts to create when nothing is stored yet. */
  seed?: SeedAccount[];
  /** Lower in tests, so they are fast. */
  iterations?: number;
};

export function createLocalAuthService({ storage = localStorage, seed = [], iterations }: Options = {}): AuthService {
  /** Reads the accounts; unreadable data is kept aside rather than overwritten, then we start fresh. */
  async function load(): Promise<AccountsDoc> {
    const raw = storage.getItem(ACCOUNTS_KEY);
    if (raw !== null) {
      try {
        const doc = JSON.parse(raw) as unknown;
        if (isObject(doc) && doc.version === 1 && Array.isArray(doc.accounts) && doc.accounts.every(isStoredAccount)) {
          // A demo account added after this browser was seeded joins the others. Only where the demo accounts are
          // already in use: someone who started without them doesn't get them later, and nothing is overwritten.
          const known = doc as AccountsDoc;
          const seeded = seed.some((s) => known.accounts.some((a) => a.id === s.id));
          const missing = seed.filter((s) => !known.accounts.some((a) => a.id === s.id || a.email === s.email));
          if (!seeded || !missing.length) return known;
          const createdAt = new Date().toISOString();
          for (const { password, ...account } of missing) known.accounts.push({ ...account, createdAt, password: await hashPassword(password, iterations) });
          save(known);
          return known;
        }
      } catch {
        // fall through
      }
      storage.setItem(`${ACCOUNTS_KEY}.backup`, raw);
    }
    const fresh: AccountsDoc = { version: 1, accounts: [] };
    const createdAt = new Date().toISOString();
    for (const { password, ...account } of seed) {
      fresh.accounts.push({ ...account, createdAt, password: await hashPassword(password, iterations) });
    }
    save(fresh);
    return fresh;
  }

  function save(doc: AccountsDoc) {
    storage.setItem(ACCOUNTS_KEY, JSON.stringify(doc));
  }

  const signIn = (account: StoredAccount) => storage.setItem(SESSION_KEY, JSON.stringify({ accountId: account.id }));

  return {
    async restore() {
      const doc = await load();
      try {
        const session = JSON.parse(storage.getItem(SESSION_KEY) ?? "null") as { accountId?: string } | null;
        const found = doc.accounts.find((a) => a.id === session?.accountId);
        if (found) return publicAccount(found);
      } catch {
        // unreadable session: treat as signed out
      }
      storage.removeItem(SESSION_KEY);
      return null;
    },

    async register(input) {
      const doc = await load();
      const email = normaliseEmail(input.email);
      if (doc.accounts.some((a) => a.email === email)) return { ok: false, error: "email_taken" };
      const account: StoredAccount = {
        id: newId(),
        name: input.name,
        email,
        whatsapp: input.whatsapp,
        hotelName: input.hotelName,
        createdAt: new Date().toISOString(),
        password: await hashPassword(input.password, iterations),
      };
      save({ ...doc, accounts: [...doc.accounts, account] });
      signIn(account);
      return { ok: true, account: publicAccount(account) };
    },

    async login(email, password) {
      const doc = await load();
      const account = doc.accounts.find((a) => a.email === normaliseEmail(email));
      // The same answer whether the email is unknown or the password is wrong.
      if (!account || !(await verifyPassword(password, account.password))) return { ok: false, error: "invalid_credentials" };
      signIn(account);
      return { ok: true, account: publicAccount(account) };
    },

    async logout() {
      storage.removeItem(SESSION_KEY);
    },
  };
}
