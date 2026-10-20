-- 0003: shared rooms, payment kinds and references, and where a booking came from.
--
--   * A unit (cage) has a capacity. A cage holds 1; a shared room or play area in a cage-free hotel holds more.
--     The exclusion constraint that kept a cage to one stay at a time becomes a trigger that keeps a unit to its
--     capacity: no night may have more live stays in it than it has places. (The app also counts each pet of a
--     stay in a shared room; here a stay counts once, so the database guarantee is the weaker, safe one.)
--   * A payment says what it is (deposit, payment, refund) and carries a bank or QRIS reference. A refund is a
--     positive amount that counts against the stay. Two more methods: e-wallet and card.
--   * A booking says where it came from (WhatsApp, Instagram, the booking link…), for the reports.

alter table public.cages add column capacity integer not null default 1 check (capacity between 1 and 500);

alter table public.bookings add column source text not null default 'other'
  check (source in ('walk_in', 'whatsapp', 'instagram', 'link', 'referral', 'other'));

alter table public.payments add column kind text not null default 'payment' check (kind in ('deposit', 'payment', 'refund'));
alter table public.payments add column reference text not null default '' check (length(reference) <= 120);
alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('cash', 'qris', 'transfer', 'ewallet', 'card'));

alter table public.bookings drop constraint bookings_no_double_booking;

create or replace function public.keep_unit_within_capacity() returns trigger language plpgsql as $$
declare
  places integer;
  busiest integer;
begin
  if new.deleted_at is not null or new.status not in ('booked', 'checked_in') then
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
     and b.check_in <= night::date and night::date < b.check_out
    group by night
  ) per_night;
  if busiest + 1 > places then
    raise exception 'bookings_no_double_booking: the unit is full on these nights' using errcode = 'exclusion_violation';
  end if;
  return new;
end $$;

create trigger bookings_unit_capacity before insert or update on public.bookings
  for each row execute function public.keep_unit_within_capacity();
