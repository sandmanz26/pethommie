import type { Deps } from "../deps.js";
import { requireHotel, requireUser } from "../auth.js";
import { dbError } from "../db.js";
import { json, readBody } from "../http.js";
import { Fields } from "../validate.js";

const COLUMNS = "id, owner_id, name, species, breed, vaccine_expiry, notes, created_at, updated_at";
export const SPECIES = ["cat", "dog", "rabbit", "other"] as const;

type PetRow = { id: string; owner_id: string; name: string; species: string; breed: string; vaccine_expiry: string | null; notes: string; created_at: string; updated_at: string };

const toPet = (r: PetRow) => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  species: r.species,
  breed: r.breed,
  vaccineExpiry: r.vaccine_expiry,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** GET /api/pets[?ownerId=…] — the hotel's pets, by name; only one owner's with ?ownerId. */
export async function getPets(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(Object.fromEntries(new URL(req.url).searchParams));
  const ownerId = f.uuid("ownerId");
  f.done();
  const hotelId = await requireHotel(session);
  let query = session.db.from("pets").select(COLUMNS).eq("hotel_id", hotelId).is("deleted_at", null);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query.order("name").limit(2000);
  if (error) throw dbError(error);
  return json({ pets: ((data ?? []) as PetRow[]).map(toPet) });
}

/** POST /api/pets — adds a pet to one of the hotel's owners. */
export async function postPet(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(await readBody(req));
  const input = {
    owner_id: f.uuid("ownerId", { required: true }),
    name: f.text("name", { required: true, max: 80 }),
    species: f.oneOf("species", SPECIES, { required: true }),
    breed: f.text("breed", { max: 80 }) ?? "",
    vaccine_expiry: f.date("vaccineExpiry") ?? null,
    notes: f.text("notes", { max: 1000 }) ?? "",
  };
  f.done();
  const hotelId = await requireHotel(session);

  const owner = await session.db.from("owners").select("id").eq("id", input.owner_id!).eq("hotel_id", hotelId).is("deleted_at", null).maybeSingle();
  if (owner.error) throw dbError(owner.error);
  if (!owner.data) {
    f.problem("ownerId", "is not an owner of your hotel");
    f.done();
  }

  const { data, error } = await session.db
    .from("pets")
    .insert({ id: deps.newId(), hotel_id: hotelId, ...input })
    .select(COLUMNS)
    .single();
  if (error) throw dbError(error);
  return json({ pet: toPet(data as PetRow) }, 201);
}
