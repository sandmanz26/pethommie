// /api/health: see docs/backend/api.md. The work is in _lib/handlers/health.ts (tested in _tests/).
import { getHealth } from "./_lib/handlers/health.js";
import { route } from "./_lib/route.js";

export const GET = route(getHealth);
