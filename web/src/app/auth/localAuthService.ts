import { newId } from "@/app/domain/logic";
import type { AuthService } from "./AuthService";
import type { DemoAccount } from "./demoAccounts";
import { hashPassword, verifyPassword } from "./password";
import { normaliseEmail } from "./validation";
import type { Account, Offer, PasswordHash, StoredAccount } from "./types";

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
  /** The hotels behind "Try now". Never stored with real accounts; empty for a launch without a demo. */
  demo?: DemoAccount[];
  /** Lower in tests, so they are fast. */
  iterations?: number;
};

export function createLocalAuthService({ storage = localStorage, demo = [], iterations }: Options = {}): AuthService {
  /** Reads the accounts; unreadable data is kept aside rather than overwritten, then we start fresh. */
  async function load(): Promise<AccountsDoc> {
    const raw = storage.getItem(ACCOUNTS_KEY);
    if (raw !== null) {
      try {
        const doc = JSON.parse(raw) as unknown;
        if (isObject(doc) && doc.version === 1 && Array.isArray(doc.accounts) && doc.accounts.every(isStoredAccount)) {
          // Demo hotels used to be stored as accounts with a shared password. They live apart now: drop them from
          // the real accounts, so the login form can't open them and a real sign-up can take those emails.
          const known = doc as AccountsDoc;
          const real = known.accounts.filter((a) => !a.id.startsWith("demo-"));
          if (real.length !== known.accounts.length) save({ ...known, accounts: real });
          return { ...known, accounts: real };
        }
      } catch {
        // fall through
      }
      storage.setItem(`${ACCOUNTS_KEY}.backup`, raw);
    }
    const fresh: AccountsDoc = { version: 1, accounts: [] };
    save(fresh);
    return fresh;
  }

  function save(doc: AccountsDoc) {
    storage.setItem(ACCOUNTS_KEY, JSON.stringify(doc));
  }

  const signIn = (account: StoredAccount) => storage.setItem(SESSION_KEY, JSON.stringify({ accountId: account.id }));
  /** A demo hotel as the app sees it: flagged, so it gets the demo banner and its own data. */
  const demoAccount = (d: DemoAccount): Account => ({ ...d, createdAt: "2026-01-01T00:00:00.000Z", demo: true });

  return {
    methods: { password: true, google: false },
    async signInWithGoogle() {
      return { ok: false, error: "unsupported" };
    },
    async restore() {
      const doc = await load();
      try {
        const session = JSON.parse(storage.getItem(SESSION_KEY) ?? "null") as { accountId?: string; demo?: boolean } | null;
        if (session?.demo) {
          const d = demo.find((a) => a.id === session.accountId);
          if (d) return demoAccount(d);
        }
        const found = session?.demo ? undefined : doc.accounts.find((a) => a.id === session?.accountId);
        if (found) return publicAccount(found);
      } catch {
        // unreadable session: treat as signed out
      }
      storage.removeItem(SESSION_KEY);
      return null;
    },

    async register(input, offer?: Offer) {
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
        ...(offer && Date.parse(offer.expiresAt) > Date.now() ? { offer } : {}),
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

    async tryDemo(accountId) {
      const d = demo.find((a) => a.id === accountId);
      if (!d) return { ok: false, error: "invalid_credentials" };
      storage.setItem(SESSION_KEY, JSON.stringify({ accountId: d.id, demo: true }));
      return { ok: true, account: demoAccount(d) };
    },

    async logout() {
      storage.removeItem(SESSION_KEY);
    },
  };
}
