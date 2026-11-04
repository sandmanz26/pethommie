import { ApiError } from "./http.js";

/** What supabase-js hands back when Postgres or PostgREST refuses something. */
export type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null };

/**
 * Postgres' refusals as HTTP answers. The rules live in the database (see backend/supabase/migrations), so the API
 * doesn't repeat them; it only says which one was hit.
 */
export function dbError(e: DbError): ApiError {
  const code = e.code ?? "";
  const text = `${e.message ?? ""} ${e.details ?? ""}`;
  switch (code) {
    case "23P01": // exclusion_violation: the capacity trigger, or one pet in two places
      if (text.includes("bookings_pet_in_one_place")) {
        return new ApiError(409, "pet_already_booked", "This pet already has a stay on some of these nights.");
      }
      return new ApiError(409, "double_booking", "That unit is full on some of these nights.");
    case "23514": // check_violation
      if (text.includes("bookings_archived_unit")) return new ApiError(409, "unit_archived", "That unit is archived and takes no new stays.");
      return new ApiError(422, "invalid", "The database refused a value: " + (e.message ?? "check failed") + ".");
    case "23505":
      return new ApiError(409, "conflict", "That record already exists.");
    case "23503":
      return new ApiError(422, "unknown_reference", "A record this one points at doesn't exist in your hotel.");
    case "23502":
    case "22P02":
    case "22007":
    case "22008":
    case "22003":
      return new ApiError(422, "invalid", "The database refused a value: " + (e.message ?? "invalid input") + ".");
    case "42501":
      return new ApiError(403, "forbidden", "Your account may not do this.");
    case "PGRST301":
    case "PGRST302":
      return new ApiError(401, "invalid_token", "The access token is invalid or has expired. Sign in again and use the new token.");
    default:
      console.error("database error", e);
      return new ApiError(502, "database_error", "The database could not answer this request. Try again in a moment.");
  }
}
