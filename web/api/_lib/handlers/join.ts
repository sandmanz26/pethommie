import type { Deps } from "../deps.js";
import { requireEnv } from "../auth.js";
import { dbError } from "../db.js";
import { ApiError, json, readBody } from "../http.js";
import { clientIp, RateLimiter } from "../rateLimit.js";
import { Fields } from "../validate.js";

/** Five sign-ups per address per ten minutes, per running copy of the function. */
export const joinLimiter = new RateLimiter(5, 10 * 60_000);
/** A field people never see (hidden with CSS); bots fill every field they find. */
export const HONEYPOT = "website";

/**
 * POST /api/join — public sign-up / waitlist form from the landing page. No sign-in. Stored in join_requests, which
 * visitors may add to but nobody can read through the API (read it in the Supabase dashboard: Table Editor).
 */
export async function postJoin(req: Request, deps: Deps, limiter: RateLimiter = joinLimiter): Promise<Response> {
  const env = requireEnv(deps);
  const wait = limiter.hit(clientIp(req), deps.now().getTime());
  if (wait > 0) {
    throw new ApiError(429, "too_many_requests", "Too many sign-ups from this address. Try again in a few minutes.", { headers: { "retry-after": String(wait) } });
  }
  const body = await readBody(req);
  // A bot: answer as if it worked, keep nothing.
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT].trim() !== "") return json({ ok: true }, 201);

  const f = new Fields(body);
  const row = {
    hotel_name: f.text("hotelName", { required: true, max: 120 }),
    city: f.text("city", { required: true, max: 80 }),
    cages: f.text("cages", { required: true, max: 40 }),
    whatsapp: f.whatsapp("whatsapp", { required: true }),
    locale: f.oneOf("locale", ["id", "en"] as const) ?? "id",
  };
  f.done();

  // As an anonymous visitor: the table's policy lets anyone add a row. No `.select()`: nobody may read it back.
  const { error } = await deps.supabase(env).from("join_requests").insert(row);
  if (error) throw dbError(error);
  return json({ ok: true }, 201);
}
