import { dateIssue, intIssue, isValidTime, MAX_RUPIAH, moneyIssue, textIssue } from "@/shared/lib/validate";
import { formatRupiah } from "@/app/domain/logic";
import type { AppMessages } from "@/app/i18n/en";

/** Turns the shared input rules into the operator app's words. Each returns the error to show, or undefined. */
type V = AppMessages["validation"];
type Locale = "id" | "en";

export function textError(v: V, value: string, rules: { required?: boolean | string; min?: number; max?: number }) {
  const issue = textIssue(value, { ...rules, required: !!rules.required });
  if (issue === "required") return typeof rules.required === "string" ? rules.required : v.required;
  if (issue === "tooShort") return v.tooShort(rules.min!);
  if (issue === "tooLong") return v.tooLong(rules.max!);
  return undefined;
}

/** `zero` overrides the message for an empty or zero amount, so a form can keep its own wording for that case. */
export function moneyError(v: V, locale: Locale, text: string, rules: { required?: boolean; allowZero?: boolean; max?: number; zero?: string } = {}) {
  const max = rules.max ?? MAX_RUPIAH;
  const issue = moneyIssue(text, { ...rules, max });
  if (issue === "required") return rules.zero ?? v.amountRequired;
  if (issue === "zero") return rules.zero ?? v.amountZero;
  if (issue === "invalid") return v.amountInvalid;
  if (issue === "tooLarge") return v.amountTooLarge(formatRupiah(max, locale));
  return undefined;
}

export function intError(v: V, text: string, min: number, max: number) {
  return intIssue(text, min, max) ? v.intRange(min, max) : undefined;
}

export function dateError(v: V, iso: string, required = true) {
  const issue = dateIssue(iso, { required });
  return issue === "required" ? v.dateRequired : issue === "invalid" ? v.dateInvalid : undefined;
}

export function timeError(v: V, time: string | null) {
  return time && !isValidTime(time) ? v.timeInvalid : undefined;
}

/** Only the keys that hold an error. */
export function compact<T extends Record<string, string | undefined>>(err: T): Partial<Record<keyof T, string>> {
  return Object.fromEntries(Object.entries(err).filter(([, m]) => m)) as Partial<Record<keyof T, string>>;
}

/** The same errors without one key: for clearing a field's error while it is being fixed. */
export function without<T extends object>(obj: T, key: keyof T): T {
  const next = { ...obj };
  delete next[key];
  return next;
}
