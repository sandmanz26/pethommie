import type { Deps } from "../deps.js";
import { requireHotel, requireUser, type Session } from "../auth.js";
import { dbError } from "../db.js";
import { ApiError, json, readBody } from "../http.js";
import { Fields } from "../validate.js";

const COLUMNS = "id, name, city, whatsapp, settings, created_at";

type HotelRow = { id: string; name: string; city: string; whatsapp: string; settings: Record<string, unknown>; created_at: string };

const toHotel = (r: HotelRow) => ({ id: r.id, name: r.name, city: r.city, whatsapp: r.whatsapp, settings: r.settings, createdAt: r.created_at });

async function loadHotel(session: Session, id: string) {
  const { data, error } = await session.db.from("hotels").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, "no_hotel", "This account has no hotel yet.");
  const member = await session.db.from("hotel_members").select("role").eq("hotel_id", id).eq("user_id", session.user.id).maybeSingle();
  if (member.error) throw dbError(member.error);
  return { hotel: toHotel(data as HotelRow), role: (member.data?.role as string | undefined) ?? null };
}

/** GET /api/hotel — the signed-in person's hotel and their role in it. */
export async function getHotel(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const id = await requireHotel(session);
  return json(await loadHotel(session, id));
}

/** POST /api/hotel — makes the signed-in person's hotel (they become its owner). One hotel per account. */
export async function postHotel(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(await readBody(req));
  const input = {
    id: f.uuid("id"),
    name: f.text("name", { required: true, max: 120 }),
    city: f.text("city", { max: 80 }) ?? "",
    whatsapp: f.whatsapp("whatsapp") ?? "",
  };
  f.done();

  const existing = await session.db.rpc("my_hotel");
  if (existing.error) throw dbError(existing.error);
  if (existing.data) throw new ApiError(409, "hotel_exists", "This account already has a hotel: GET /api/hotel shows it.");

  const id = input.id ?? deps.newId();
  const created = await session.db.rpc("create_hotel", { p_id: id, p_name: input.name, p_city: input.city, p_whatsapp: input.whatsapp, p_settings: {} });
  if (created.error) throw dbError(created.error);
  return json(await loadHotel(session, id), 201);
}
