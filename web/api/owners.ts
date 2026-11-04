// /api/owners: see docs/backend/api.md. The work is in _lib/handlers/owners.ts (tested in _tests/).
import { getOwners, postOwner } from "./_lib/handlers/owners.js";
import { route } from "./_lib/route.js";

export const GET = route(getOwners);
export const POST = route(postOwner);
