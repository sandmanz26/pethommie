import { ACCOUNTS_KEY, SESSION_KEY } from "@/app/auth/localAuthService";
import { hashPassword } from "@/app/auth/password";
import type { Account, StoredAccount } from "@/app/auth/types";
import type { HotelData } from "@/app/domain/types";
import { dataKeyFor } from "@/app/store/storage";

export const TEST_PASSWORD = "Test1234pw";

/**
 * Puts the browser in the state "this person is signed in", the way a real visit would leave it:
 * an account, a session, and (optionally) that account's hotel. Returns the account.
 */
export async function signedInAs(opts: { data?: HotelData; account?: Partial<Account> } = {}): Promise<Account> {
  const account: StoredAccount = {
    id: "acct-test",
    name: "Rina Kusuma",
    email: "rina@example.com",
    whatsapp: "6281234567890",
    hotelName: "Rumah Meong",
    createdAt: "2026-10-01T00:00:00.000Z",
    password: await hashPassword(TEST_PASSWORD, 1000),
    ...opts.account,
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ version: 1, accounts: [account] }));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accountId: account.id }));
  if (opts.data) localStorage.setItem(dataKeyFor(account.id), JSON.stringify(opts.data));
  const { password, ...visible } = account;
  return visible;
}
