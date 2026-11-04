// /api/cages: see docs/backend/api.md. The work is in _lib/handlers/cages.ts (tested in _tests/).
import { getCages } from "./_lib/handlers/cages.js";
import { route } from "./_lib/route.js";

export const GET = route(getCages);
