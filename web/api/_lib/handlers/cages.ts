import type { Deps } from "../deps.js";
import { requireHotel, requireUser } from "../auth.js";
import { dbError } from "../db.js";
import { json } from "../http.js";

const COLUMNS = "id, name, size, price_per_night, capacity, archived";

type CageRow = { id: string; name: string; size: string; price_per_night: number; capacity: number; archived: boolean };

/** GET /api/cages — the hotel's units (cages, rooms), so a booking can name one. Archived ones say so. */
export async function getCages(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const hotelId = await requireHotel(session);
  const { data, error } = await session.db.from("cages").select(COLUMNS).eq("hotel_id", hotelId).is("deleted_at", null).order("name").limit(2000);
  if (error) throw dbError(error);
  return json({
    cages: ((data ?? []) as CageRow[]).map((r) => ({ id: r.id, name: r.name, size: r.size, pricePerNight: r.price_per_night, capacity: r.capacity, archived: r.archived })),
  });
}
