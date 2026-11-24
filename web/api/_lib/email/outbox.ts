import type { EmailDeps } from "../deps.js";
import type { EmailEnv } from "../env.js";
import { bookingRequestEmail, type BookingRequestPayload } from "./templates.js";
import { sendEmail } from "./resend.js";

/** Minutes after the 1st, 2nd and 3rd failed attempts; a 4th failure gives up (status: 'failed'). */
const BACKOFF_MINUTES = [1, 10, 60];

type OutboxRow = {
  id: string;
  hotel_id: string;
  kind: "booking_request";
  payload: BookingRequestPayload;
  attempts: number;
};

export type DispatchResult = { processed: number; sent: number; failed: number };

/**
 * Sends every notification_outbox row that is due, oldest first. Used two ways: /api/requests calls it with
 * `hotelId` set, best-effort, right after a visitor's request is inserted, so the email usually goes out within the
 * same second; /api/email/dispatch (a Vercel Cron hit) calls it with no filter, to catch anything that failed that
 * first time, up to its backoff schedule.
 */
export async function dispatchOutbox(deps: EmailDeps, env: EmailEnv, opts: { hotelId?: string; limit?: number } = {}): Promise<DispatchResult> {
  const db = deps.supabaseService(env);
  let q = db.from("notification_outbox").select("id, hotel_id, kind, payload, attempts").eq("status", "pending").lte("next_attempt_at", deps.now().toISOString()).order("next_attempt_at").limit(opts.limit ?? 25);
  if (opts.hotelId) q = q.eq("hotel_id", opts.hotelId);
  const { data, error } = await q;
  if (error) throw new Error(`reading notification_outbox: ${error.message}`);
  const rows = (data ?? []) as OutboxRow[];

  const result: DispatchResult = { processed: rows.length, sent: 0, failed: 0 };
  for (const row of rows) {
    try {
      await sendOne(deps, env, row);
      await db.from("notification_outbox").update({ status: "sent", sent_at: deps.now().toISOString() }).eq("id", row.id);
      result.sent += 1;
    } catch (e) {
      const attempts = row.attempts + 1;
      const giveUp = attempts > BACKOFF_MINUTES.length;
      const message = e instanceof Error ? e.message : String(e);
      await db.from("notification_outbox").update({
        attempts,
        status: giveUp ? "failed" : "pending",
        last_error: message.slice(0, 500),
        next_attempt_at: giveUp ? deps.now().toISOString() : new Date(deps.now().getTime() + BACKOFF_MINUTES[attempts - 1] * 60_000).toISOString(),
      }).eq("id", row.id);
      result.failed += 1;
    }
  }
  return result;
}

async function sendOne(deps: EmailDeps, env: EmailEnv, row: OutboxRow): Promise<void> {
  const db = deps.supabaseService(env);
  if (row.kind !== "booking_request") throw new Error(`unknown outbox kind: ${row.kind}`);
  const { data: hotel, error: hotelError } = await db.from("hotels").select("name, created_by").eq("id", row.hotel_id).single();
  if (hotelError || !hotel) throw new Error(`hotel ${row.hotel_id} not found: ${hotelError?.message ?? ""}`);
  const { data: owner, error: ownerError } = await db.auth.admin.getUserById((hotel as { created_by: string }).created_by);
  const email = owner?.user?.email;
  if (ownerError || !email) throw new Error(`owner email not found: ${ownerError?.message ?? "no email on the account"}`);
  const msg = bookingRequestEmail((hotel as { name: string }).name, row.payload, env.appUrl);
  await sendEmail(deps.fetch, env, { to: email, ...msg });
}
