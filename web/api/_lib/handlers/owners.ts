import type { Deps } from "../deps.js";
import { requireHotel, requireUser } from "../auth.js";
import { dbError } from "../db.js";
import { json, readBody } from "../http.js";
import { Fields } from "../validate.js";

const COLUMNS = "id, name, whatsapp, language, created_at, updated_at";

type OwnerRow = { id: string; name: string; whatsapp: string; language: string; created_at: string; updated_at: string };

export const toOwner = (r: OwnerRow) => ({ id: r.id, name: r.name, whatsapp: r.whatsapp, language: r.language, createdAt: r.created_at, updatedAt: r.updated_at });

/** GET /api/owners — the hotel's pet owners (customers), by name. */
export async function getOwners(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const hotelId = await requireHotel(session);
  const { data, error } = await session.db.from("owners").select(COLUMNS).eq("hotel_id", hotelId).is("deleted_at", null).order("name").limit(2000);
  if (error) throw dbError(error);
  return json({ owners: ((data ?? []) as OwnerRow[]).map(toOwner) });
}

/** POST /api/owners — adds a pet owner. */
export async function postOwner(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(await readBody(req));
  const input = {
    name: f.text("name", { required: true, max: 80 }),
    whatsapp: f.whatsapp("whatsapp") ?? "",
    language: f.oneOf("language", ["id", "en"] as const) ?? "id",
  };
  f.done();
  const hotelId = await requireHotel(session);
  const { data, error } = await session.db
    .from("owners")
    .insert({ id: deps.newId(), hotel_id: hotelId, ...input })
    .select(COLUMNS)
    .single();
  if (error) throw dbError(error);
  return json({ owner: toOwner(data as OwnerRow) }, 201);
}
