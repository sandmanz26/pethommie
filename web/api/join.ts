// /api/join: see docs/backend/api.md. The work is in _lib/handlers/join.ts (tested in _tests/).
import { postJoin } from "./_lib/handlers/join.js";
import { route } from "./_lib/route.js";

export const POST = route((req, deps) => postJoin(req, deps));
