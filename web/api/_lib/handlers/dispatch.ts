import type { EmailDeps } from "../deps.js";
import { isEmailConfigured } from "../env.js";
import { dispatchOutbox } from "../email/outbox.js";
import { ApiError, json } from "../http.js";

/**
 * POST /api/email/dispatch — the retry path: sends every due notification_outbox row across every hotel, up to its
 * backoff schedule (see api/_lib/email/outbox.ts). Meant to be hit by a Vercel Cron job (daily, on the Hobby plan;
 * see docs/backend/email-setup.md) so nothing a visitor's request failed to send the first time is lost. Requires
 * the header `x-dispatch-secret` to equal EMAIL_DISPATCH_SECRET: there is no other access control on this endpoint,
 * since it isn't tied to any one hotel's sign-in.
 */
export async function postDispatch(req: Request, deps: EmailDeps): Promise<Response> {
  if (!isEmailConfigured(deps.env)) {
    throw new ApiError(503, "not_configured", "Email isn't set up yet: see docs/backend/email-setup.md for the environment variables this needs.");
  }
  const given = req.headers.get("x-dispatch-secret") ?? "";
  if (given !== deps.env.dispatchSecret) {
    throw new ApiError(401, "invalid_secret", "The x-dispatch-secret header is missing or wrong.");
  }
  const result = await dispatchOutbox(deps, deps.env);
  return json({ ok: true, ...result });
}
