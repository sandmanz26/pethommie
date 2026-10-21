-- 0004: a stay keeps its price, cancellations say why, units retire instead of disappearing, and expenses.
--
--   * A booking keeps the nightly rate agreed when it was made (per pet in a shared room), so a later price change
--     never changes what an old stay cost. Existing stays take their unit's price today.
--   * A cancelled booking says why: the owner called it off, the pet never came (no-show), or the hotel had to.
--   * A unit with history is archived, not deleted: it stops taking bookings and counting as a place, and its old
--     stays keep pointing at it.
--   * Expenses: what running the hotel costs, by category, for the profit and loss report.
-- Mirrors web/src/app/domain/types.ts (data version 5); checked by web/src/app/sync/schema.test.ts.

alter table public.bookings add column rate integer not null default 0 check (rate >= 0);
update public.bookings b set rate = c.price_per_night from public.cages c where c.id = b.cage_id;

alter table public.bookings add column cancel_reason text check (cancel_reason in ('owner', 'no_show', 'hotel'));
update public.bookings set cancel_reason = 'owner' where status = 'cancelled';
alter table public.bookings add constraint bookings_cancel_reason_when_cancelled
  check ((status = 'cancelled') = (cancel_reason is not null));

alter table public.cages add column archived boolean not null default false;

-- An archived unit takes no new or moved stays.
create or replace function public.refuse_archived_unit() returns trigger language plpgsql as $$
begin
  if new.status in ('booked', 'checked_in') and new.deleted_at is null
     and (tg_op = 'INSERT' or new.cage_id is distinct from old.cage_id)
     and exists (select 1 from public.cages where id = new.cage_id and archived) then
    raise exception 'bookings_archived_unit: that unit is archived' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger bookings_not_in_archived_unit before insert or update on public.bookings
  for each row execute function public.refuse_archived_unit();

-- ---------------------------------------------------------------- expenses

create table public.expenses (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  spent_on date not null,
  category text not null check (category in (
    'food', 'supplies', 'vet', 'grooming', 'staff', 'rent', 'utilities', 'cleaning', 'marketing', 'maintenance', 'equipment', 'fees', 'other'
  )),
  amount integer not null check (amount > 0),
  method text not null check (method in ('cash', 'qris', 'transfer', 'ewallet', 'card')),
  vendor text not null default '' check (length(vendor) <= 120),
  note text not null default '' check (length(note) <= 500),
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id)
);
create index expenses_hotel_day_idx on public.expenses (hotel_id, spent_on);
create index expenses_sync_idx on public.expenses (hotel_id, updated_at);

create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();

alter table public.expenses enable row level security;
create policy expenses_members on public.expenses for all to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id));
grant select, insert, update, delete on public.expenses to authenticated;
