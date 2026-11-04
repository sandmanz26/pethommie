/**
 * A small fixed-window limit per visitor (IP address), kept in the function's memory. Vercel may run several copies
 * of a function and restarts them, so this slows down a script hammering the form; it is not a hard guarantee.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Counts one hit. Returns 0 when allowed, or the seconds to wait. */
  hit(key: string, now: number): number {
    if (this.hits.size > 10_000) this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return 0;
    }
    entry.count += 1;
    return entry.count > this.limit ? Math.ceil((entry.resetAt - now) / 1000) : 0;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

/** The visitor's address as Vercel passes it on. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}
