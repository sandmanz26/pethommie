// /api/bookings: see docs/backend/api.md. The work is in _lib/handlers/bookings.ts (tested in _tests/).
import { getBookings, postBooking } from "./_lib/handlers/bookings.js";
import { route } from "./_lib/route.js";

export const GET = route(getBookings);
export const POST = route(postBooking);
