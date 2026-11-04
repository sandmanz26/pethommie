import { ApiError } from "./http.js";

/**
 * Reads fields from a request body (or query), collecting every problem before answering, so a form can show them
 * all at once: 422 { error: { code: "invalid", fields: { name: "...", ... } } }.
 */
export class Fields {
  readonly problems: Record<string, string> = {};
  private readonly source: Record<string, unknown>;

  constructor(source: Record<string, unknown>) {
    this.source = source;
  }

  private raw(key: string) {
    const v = this.source[key];
    return v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;
  }

  private fail<T>(key: string, why: string): T | undefined {
    this.problems[key] ??= why;
    return undefined;
  }

  text(key: string, opts: { required?: boolean; max: number }): string | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    if (typeof v !== "string") return this.fail(key, "must be text");
    const t = v.trim();
    if (t.length > opts.max) return this.fail(key, `must be at most ${opts.max} characters`);
    return t;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], opts: { required?: boolean } = {}): T | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    if (typeof v !== "string" || !allowed.includes(v as T)) return this.fail(key, `must be one of: ${allowed.join(", ")}`);
    return v as T;
  }

  uuid(key: string, opts: { required?: boolean } = {}): string | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    if (typeof v !== "string" || !UUID.test(v)) return this.fail(key, "must be an id (UUID)");
    return v.toLowerCase();
  }

  date(key: string, opts: { required?: boolean } = {}): string | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    if (typeof v !== "string" || !isDate(v)) return this.fail(key, "must be a date like 2026-12-24");
    return v;
  }

  integer(key: string, opts: { required?: boolean; min: number; max: number }): number | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isInteger(n) || n < opts.min || n > opts.max) {
      return this.fail(key, `must be a whole number from ${opts.min} to ${opts.max}`);
    }
    return n;
  }

  /** An Indonesian WhatsApp number, stored as 62xxxxxxxxxx (as the app does). */
  whatsapp(key: string, opts: { required?: boolean } = {}): string | undefined {
    const v = this.raw(key);
    if (v === undefined) return opts.required ? this.fail(key, "is required") : undefined;
    const n = typeof v === "string" ? normaliseWhatsapp(v) : null;
    return n ?? this.fail(key, "must be an Indonesian mobile number, e.g. 0812 3456 7890");
  }

  problem(key: string, why: string) {
    this.fail(key, why);
  }

  /** Throws 422 with every problem found, if there is any. */
  done() {
    if (Object.keys(this.problems).length > 0) {
      throw new ApiError(422, "invalid", "Some fields are missing or invalid.", { fields: this.problems });
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in Indonesia (WIB, UTC+7), where the hotels are. */
export function todayInJakarta(now: Date): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Same rule as web/src/shared/lib/phone.ts: 0812…, 812…, +62 812… → 62812…; null if it isn't a mobile number. */
export function normaliseWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return /^628\d{7,11}$/.test(digits) ? digits : null;
}
