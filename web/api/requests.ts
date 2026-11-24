// /api/requests: see docs/backend/api.md and docs/backend/email-setup.md. The work is in _lib/handlers/requests.ts
// (tested in _tests/).
import { defaultEmailDeps } from "./_lib/deps.js";
import { postRequests } from "./_lib/handlers/requests.js";
import { route } from "./_lib/route.js";

export const POST = route(postRequests, defaultEmailDeps);
