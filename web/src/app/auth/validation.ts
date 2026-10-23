import { normaliseWhatsapp } from "@/shared/lib/phone";
import type { Registration } from "./types";

/**
 * Rules for the sign-up and login forms, as pure functions. The same rules should run on the server
 * later; the browser only uses them to explain problems early.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
/** Shortest and longest a name may be, once trimmed. */
export const NAME_LIMITS = { name: [2, 60], hotelName: [2, 80] } as const;
export const EMAIL_MAX = 254;

export type Issue = "required" | "invalid" | "too_short" | "too_long" | "too_weak";
export type RegistrationInput = Record<keyof Registration, string>;
export type RegistrationIssues = Partial<Record<keyof Registration, Issue>>;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/** At least 8 characters, with a letter and a digit. Length matters more than symbols, so none are required. */
export function passwordIssue(password: string): Issue | null {
  if (!password) return "required";
  if (password.length < PASSWORD_MIN) return "too_short";
  if (password.length > PASSWORD_MAX) return "too_long";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "too_weak";
  return null;
}

export function parseRegistration(
  input: RegistrationInput,
): { ok: true; value: Registration } | { ok: false; issues: RegistrationIssues } {
  const issues: RegistrationIssues = {};
  const name = input.name.trim();
  const hotelName = input.hotelName.trim();
  const email = normaliseEmail(input.email);
  const whatsapp = normaliseWhatsapp(input.whatsapp);

  const nameIssue = (value: string, [min, max]: readonly [number, number]): Issue | undefined =>
    !value ? "required" : value.length < min ? "too_short" : value.length > max ? "too_long" : undefined;
  const n = nameIssue(name, NAME_LIMITS.name);
  if (n) issues.name = n;
  const h = nameIssue(hotelName, NAME_LIMITS.hotelName);
  if (h) issues.hotelName = h;
  if (!email) issues.email = "required";
  else if (email.length > EMAIL_MAX) issues.email = "too_long";
  else if (!isEmail(email)) issues.email = "invalid";
  if (!input.whatsapp.trim()) issues.whatsapp = "required";
  else if (!whatsapp) issues.whatsapp = "invalid";
  const pw = passwordIssue(input.password);
  if (pw) issues.password = pw;

  if (Object.keys(issues).length || !whatsapp) return { ok: false, issues };
  return { ok: true, value: { name, hotelName, email, whatsapp, password: input.password } };
}

/** Login only checks that something was typed; whether it is right is the service's call. */
export function loginIssues(email: string, password: string): Partial<Record<"email" | "password", Issue>> {
  const issues: Partial<Record<"email" | "password", Issue>> = {};
  if (!email.trim()) issues.email = "required";
  else if (!isEmail(normaliseEmail(email))) issues.email = "invalid";
  if (!password) issues.password = "required";
  return issues;
}
