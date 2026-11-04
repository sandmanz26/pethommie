import type { Deps } from "../deps.js";
import { requireHotel, requireUser } from "../auth.js";
import { dbError } from "../db.js";
import { ApiError, json, readBody } from "../http.js";
import { addDays, Fields, todayInJakarta } from "../validate.js";

const COLUMNS = "id, pet_id, cage_id, check_in, check_out, status, hold, source, rate, cancel_reason, notes, created_at, updated_at";
export const STATUSES = ["booked", "checked_in", "checked_out", "cancelled"] as const;
export const SOURCES = ["walk_in", "whatsapp", "instagram", "link", "referral", "other"] as const;
/** The longest window one GET may ask for. */
const MAX_RANGE_DAYS = 366;

type BookingRow = {
  id: string;
  pet_id: string;
  cage_id: string;
  check_in: string;
  check_out: string;
  status: string;
  hold: string | null;
  source: string;
  rate: number;
  cancel_reason: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

const toBooking = (r: BookingRow) => ({
  id: r.id,
  petId: r.pet_id,
  cageId: r.cage_id,
  checkIn: r.check_in,
  checkOut: r.check_out,
  status: r.status,
  hold: r.hold,
  source: r.source,
  rate: r.rate,
  cancelReason: r.cancel_reason,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * GET /api/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD[&status=booked] — stays that overlap [from, to): they check in before
 * `to` and check out after `from`. Defaults: from = today (WIB), to = from + 31 days. At most 366 days at a time.
 */
export async function getBookings(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(Object.fromEntries(new URL(req.url).searchParams));
  const from = f.date("from") ?? todayInJakarta(deps.now());
  const to = f.date("to") ?? addDays(from, 31);
  const status = f.oneOf("status", STATUSES);
  if (to <= from) f.problem("to", "must be after from");
  else if (to > addDays(from, MAX_RANGE_DAYS)) f.problem("to", `must be at most ${MAX_RANGE_DAYS} days after from`);
  f.done();

  const hotelId = await requireHotel(session);
  let query = session.db.from("bookings").select(COLUMNS).eq("hotel_id", hotelId).is("deleted_at", null).lt("check_in", to).gt("check_out", from);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("check_in").order("id").limit(5000);
  if (error) throw dbError(error);
  return json({ from, to, bookings: ((data ?? []) as BookingRow[]).map(toBooking) });
}

/**
 * POST /api/bookings — books a stay. The database keeps the rules: a unit never takes more stays a night than it has
 * places (409 double_booking), a pet is in one place at a time (409 pet_already_booked), an archived unit takes no
 * new stays (409 unit_archived). Without `rate`, the stay keeps the unit's price per night today.
 */
export async function postBooking(req: Request, deps: Deps): Promise<Response> {
  const session = await requireUser(req, deps);
  const f = new Fields(await readBody(req));
  const input = {
    pet_id: f.uuid("petId", { required: true }),
    cage_id: f.uuid("cageId", { required: true }),
    check_in: f.date("checkIn", { required: true }),
    check_out: f.date("checkOut", { required: true }),
    status: f.oneOf("status", ["booked", "checked_in"] as const) ?? "booked",
    hold: f.oneOf("hold", ["request", "deposit"] as const) ?? null,
    source: f.oneOf("source", SOURCES) ?? "other",
    rate: f.integer("rate", { min: 0, max: 100_000_000 }),
    notes: f.text("notes", { max: 1000 }) ?? "",
  };
  if (input.check_in && input.check_out && input.check_out <= input.check_in) f.problem("checkOut", "must be after checkIn");
  if (input.check_in && input.check_out && input.check_out > addDays(input.check_in, MAX_RANGE_DAYS)) f.problem("checkOut", `must be at most ${MAX_RANGE_DAYS} days after checkIn`);
  if (input.hold && input.status !== "booked") f.problem("hold", "is only for a stay with status booked");
  f.done();
  const hotelId = await requireHotel(session);

  const [cage, pet] = await Promise.all([
    session.db.from("cages").select("id, price_per_night, archived").eq("id", input.cage_id!).eq("hotel_id", hotelId).is("deleted_at", null).maybeSingle(),
    session.db.from("pets").select("id").eq("id", input.pet_id!).eq("hotel_id", hotelId).is("deleted_at", null).maybeSingle(),
  ]);
  if (cage.error) throw dbError(cage.error);
  if (pet.error) throw dbError(pet.error);
  if (!cage.data) f.problem("cageId", "is not a unit of your hotel");
  if (!pet.data) f.problem("petId", "is not a pet of your hotel");
  f.done();
  if (cage.data!.archived) throw new ApiError(409, "unit_archived", "That unit is archived and takes no new stays.");

  const { data, error } = await session.db
    .from("bookings")
    .insert({ id: deps.newId(), hotel_id: hotelId, ...input, rate: input.rate ?? (cage.data!.price_per_night as number), cancel_reason: null })
    .select(COLUMNS)
    .single();
  if (error) throw dbError(error);
  return json({ booking: toBooking(data as BookingRow) }, 201);
}
