// /api/hotel: see docs/backend/api.md. The work is in _lib/handlers/hotel.ts (tested in _tests/).
import { getHotel, postHotel } from "./_lib/handlers/hotel.js";
import { route } from "./_lib/route.js";

export const GET = route(getHotel);
export const POST = route(postHotel);
