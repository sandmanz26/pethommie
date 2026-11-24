import type { EmailDeps } from "../deps.js";
import { isConfigured, isEmailConfigured } from "../env.js";
import { dbError } from "../db.js";
import { dispatchOutbox } from "../email/outbox.js";
import { ApiError, json, readBody } from "../http.js";
import { clientIp, RateLimiter } from "../rateLimit.js";
import { Fields } from "../validate.js";

/** Ten requests per address per ten minutes: generous for a real visitor, slow for a script. */
export const requestsLimiter = new RateLimiter(10, 10 * 60_000);
/** A field people never see; bots fill every field they find (same trick as /api/join). */
export const HONEYPOT = "website";

/**
 * POST /api/requests — a visitor's request from a synced hotel's public booking link (web/src/site/pages/BookPage.tsx,
 * only sent when the link carries a hotel id). Stored in booking_requests (insertable by anyone, readable only by
 * the hotel's own members), which queues one email to the owner via a database trigger (migration 0008). This
 * endpoint then makes a best-effort attempt to send that email immediately, so it usually goes out within the same
 * second; if that fails (or email isn't configured for this project yet), the row stays queued for
 * /api/email/dispatch to retry later. Either way the visitor gets the same answer: the request is durably saved.
 */
export async function postRequests(req: Request, deps: EmailDeps, limiter: RateLimiter = requestsLimiter): Promise<Response> {
  if (!isConfigured(deps.env)) {
    throw new ApiError(503, "not_configured", "The API is not connected to Supabase yet: set SUPABASE_URL and SUPABASE_ANON_KEY on Vercel, then redeploy.");
  }
  const env = deps.env as typeof deps.env & { supabaseUrl: string; anonKey: string };
  const wait = limiter.hit(clientIp(req), deps.now().getTime());
  if (wait > 0) {
    throw new ApiError(429, "too_many_requests", "Too many requests from this address. Try again in a few minutes.", { headers: { "retry-after": String(wait) } });
  }
  const body = await readBody(req);
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT].trim() !== "") return json({ ok: true }, 201);

  const f = new Fields(body);
  const row = {
    hotel_id: f.uuid("hotelId", { required: true }),
    owner_name: f.text("ownerName", { required: true, max: 60 }),
    owner_wa: f.whatsapp("ownerWa", { required: true }),
    pet_name: f.text("petName", { required: true, max: 40 }),
    species: f.oneOf("species", ["cat", "dog", "rabbit", "other"] as const, { required: true }),
    breed: f.text("breed", { max: 40 }) ?? "",
    check_in: f.date("checkIn", { required: true }),
    check_out: f.date("checkOut", { required: true }),
    preference: f.text("preference", { max: 60 }) ?? "",
    notes: f.text("notes", { max: 500 }) ?? "",
    locale: f.oneOf("locale", ["id", "en"] as const) ?? "id",
  };
  if (row.check_in && row.check_out && row.check_out <= row.check_in) f.problem("checkOut", "must be after check-in");
  f.done();

  const { data, error } = await deps.supabase(env).from("booking_requests").insert(row).select("hotel_id").single();
  if (error) throw dbError(error);

  if (isEmailConfigured(deps.env)) {
    try {
      await dispatchOutbox(deps, deps.env, { hotelId: (data as { hotel_id: string }).hotel_id, limit: 1 });
    } catch (e) {
      console.error("best-effort dispatch after a booking request", e);
    }
  }
  return json({ ok: true }, 201);
}
