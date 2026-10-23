/** Pure input rules shared by every form. They return an issue code (or null); each form turns it into words. */

/** Upper bound for any single amount of money typed by hand: catches an extra zero or two. */
export const MAX_RUPIAH = 100_000_000;

/** Length limits used across the forms. */
export const LIMITS = {
  personName: { min: 2, max: 60 },
  hotelName: { min: 2, max: 80 },
  petName: { min: 1, max: 40 },
  unitName: { min: 1, max: 30 },
  city: { min: 2, max: 60 },
  short: 80,
  line: 200,
  notes: 500,
} as const;

export type TextIssue = "required" | "tooShort" | "tooLong";

/** Trimmed text: required (when asked), at least `min` and at most `max` characters. Empty optional text is fine. */
export function textIssue(value: string, rules: { required?: boolean; min?: number; max?: number }): TextIssue | null {
  const v = value.trim();
  if (!v) return rules.required ? "required" : null;
  if (rules.min !== undefined && v.length < rules.min) return "tooShort";
  if (rules.max !== undefined && v.length > rules.max) return "tooLong";
  return null;
}

/**
 * Reads a rupiah amount typed by hand: "75000", "75.000", "Rp 75.000", "75,000". Null when empty, NaN when it holds
 * anything other than digits and thousands separators (letters, a minus sign, decimals like "75.5").
 */
export function parseRupiah(text: string): number | null {
  const s = text.trim().replace(/^rp\.?\s*/i, "");
  if (!s) return null;
  if (!/^\d{1,3}([.,\s]\d{3})*$|^\d+$/.test(s)) return NaN;
  return parseInt(s.replace(/\D/g, ""), 10);
}

export type MoneyIssue = "required" | "invalid" | "zero" | "tooLarge";

/** A whole number of rupiah; above zero unless `allowZero`; at most `max`. Empty is fine only when not required. */
export function moneyIssue(text: string, rules: { required?: boolean; allowZero?: boolean; max?: number } = {}): MoneyIssue | null {
  const n = parseRupiah(text);
  if (n === null) return rules.required ? "required" : null;
  if (Number.isNaN(n)) return "invalid";
  if (n === 0 && !rules.allowZero) return "zero";
  if (n > (rules.max ?? MAX_RUPIAH)) return "tooLarge";
  return null;
}

export type IntIssue = "required" | "invalid" | "range";

/** A whole number from `min` to `max`. */
export function intIssue(text: string, min: number, max: number, required = true): IntIssue | null {
  const s = text.trim();
  if (!s) return required ? "required" : null;
  if (!/^\d+$/.test(s)) return "invalid";
  const n = parseInt(s, 10);
  return n < min || n > max ? "range" : null;
}

/** A real calendar day written YYYY-MM-DD, in a sensible year. */
export function isValidISODate(iso: string, minYear = 2000, maxYear = 2100): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < minYear || y > maxYear) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export type DateIssue = "required" | "invalid";

export function dateIssue(iso: string, rules: { required?: boolean; minYear?: number; maxYear?: number } = {}): DateIssue | null {
  if (!iso.trim()) return rules.required === false ? null : "required";
  return isValidISODate(iso, rules.minYear, rules.maxYear) ? null : "invalid";
}

/** "08:30" style time of day. */
export const isValidTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Indonesian NPWP: 15 digits (old) or 16 (NIK-based), punctuation allowed. */
export const isValidNpwp = (s: string) => /^(\d{15}|\d{16})$/.test(s.replace(/[\s.-]/g, ""));

/** A plain email check: something@something.tld, no spaces. */
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
