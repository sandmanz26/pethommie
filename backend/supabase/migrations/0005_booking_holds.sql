-- 0005: how a hotel takes bookings and deposits.
--
--   * The hotel's rule lives in hotels.settings (payPolicy: flexible, deposit_first or check_first, and the minimum
--     deposit percent); settings is one jsonb document the app validates, so nothing changes for it here.
--   * A booked stay that isn't confirmed yet says what it waits for: 'request' (the hotel still has to check the
--     slot; it holds no place) or 'deposit' (the place is held, the deposit isn't paid). Null: confirmed.
--     Only a booked stay can wait for anything.
--   * A request holds no place, so the capacity trigger leaves it out, both as the stay being saved and as one
--     already there.
-- Mirrors web/src/app/domain/types.ts (data version 6); checked by web/src/app/sync/schema.test.ts.

alter table public.bookings add column hold text check (hold in ('request', 'deposit'));
alter table public.bookings add constraint bookings_hold_only_when_booked check (hold is null or status = 'booked');

create or replace function public.keep_unit_within_capacity() returns trigger language plpgsql as $$
declare
  places integer;
  busiest integer;
begin
  if new.deleted_at is not null or new.status not in ('booked', 'checked_in') or new.hold is not distinct from 'request' then
    return new;
  end if;
  -- One booking at a time per unit, so two devices can't both take its last place.
  perform pg_advisory_xact_lock(hashtext(new.cage_id::text));
  select capacity into places from public.cages where id = new.cage_id;
  select coalesce(max(taken), 0) into busiest
  from (
    select count(*) as taken
    from generate_series(new.check_in, new.check_out - 1, interval '1 day') as night
    join public.bookings b
      on b.cage_id = new.cage_id and b.id <> new.id and b.deleted_at is null and b.status in ('booked', 'checked_in')
     and b.hold is distinct from 'request'
     and b.check_in <= night::date and night::date < b.check_out
    group by night
  ) per_night;
  if busiest + 1 > places then
    raise exception 'bookings_no_double_booking: the unit is full on these nights' using errcode = 'exclusion_violation';
  end if;
  return new;
end $$;
