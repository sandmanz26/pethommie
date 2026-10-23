-- 0006: how a hotel counts a stay's days and charges a late pick-up.
--
--   * The rule lives in hotels.settings.stayRules (counting: nights, calendar_days or hours24; drop-off and pick-up
--     hours; a grace period; the late pick-up fee). settings is one jsonb document the app validates, so no column
--     changes here.
--   * Hotels that exist already keep counting per night with no late fee, so no stay's price changes, and are marked
--     configured so they can keep taking bookings. (The app does the same when it reads a hotel without the rule.)
--   * A late pick-up fee is added to the stay as an ordinary charge, so charges need nothing new either.
-- Mirrors web/src/app/domain/types.ts (data version 7).

update public.hotels
set settings = settings || jsonb_build_object('stayRules', jsonb_build_object(
  'configured', true,
  'counting', 'nights',
  'dropOffFrom', '08:00',
  'dropOffUntil', '20:00',
  'pickUpUntil', '12:00',
  'graceMinutes', 60,
  'late', jsonb_build_object('mode', 'none', 'perHour', 10000)
))
where not (settings ? 'stayRules');
