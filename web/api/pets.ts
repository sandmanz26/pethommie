// /api/pets: see docs/backend/api.md. The work is in _lib/handlers/pets.ts (tested in _tests/).
import { getPets, postPet } from "./_lib/handlers/pets.js";
import { route } from "./_lib/route.js";

export const GET = route(getPets);
export const POST = route(postPet);
