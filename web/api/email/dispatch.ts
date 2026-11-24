// /api/email/dispatch: see docs/backend/email-setup.md. The work is in _lib/handlers/dispatch.ts (tested in
// _tests/). Hit by Vercel Cron (see vercel.json) and, best-effort, right after a visitor's request is inserted.
import { defaultEmailDeps } from "../_lib/deps.js";
import { postDispatch } from "../_lib/handlers/dispatch.js";
import { route } from "../_lib/route.js";

// Vercel Cron sends GET; a manual/owner-triggered retry can use POST. Same handler either way: it only reads the
// secret header, never the body or method.
export const GET = route(postDispatch, defaultEmailDeps);
export const POST = route(postDispatch, defaultEmailDeps);
