-- Pethommie, step 2: what a stay can carry beyond its nights.
--   * charges (add-ons and discounts) and companions (pets sharing the cage),
--   * numbered invoices that can't be altered once made,
--   * the owner's language and the hotel's business and tax settings.
-- Mirrors web/src/app/domain/types.ts (data version 3); checked by web/src/app/sync/schema.test.ts.

alter table public.owners add column language text not null default 'id' check (language in ('id', 'en'));

-- Legal name, address, NPWP, invoice prefix, payment instructions, invoice language, tax profile. One document,
-- because it changes together and is read whole; the app validates its parts.
alter table public.hotels add column settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object');

-- A pet is in one place at a time: it can't have two live stays that overlap (the same rule the app enforces).
alter table public.bookings add constraint bookings_pet_in_one_place
  exclude using gist (pet_id with =, daterange(check_in, check_out) with &&)
  where (status in ('booked', 'checked_in') and deleted_at is null);

-- ---------------------------------------------------------------- companions and charges

-- Other pets of the same owner sharing the stay's cage, besides the one it was booked for.
create table public.booking_pets (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  pet_id uuid not null,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (booking_id, pet_id),
  foreign key (booking_id, hotel_id) references public.bookings (id, hotel_id),
  foreign key (pet_id, hotel_id) references public.pets (id, hotel_id)
);
create index booking_pets_pet_idx on public.booking_pets (pet_id);

-- Add-ons (above zero) and discounts (below zero) on a stay.
create table public.charges (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  position smallint not null default 0 check (position >= 0),
  label text not null check (length(btrim(label)) between 1 and 80),
  amount integer not null check (amount <> 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id),
  foreign key (booking_id, hotel_id) references public.bookings (id, hotel_id)
);
create index charges_booking_idx on public.charges (booking_id);

-- ---------------------------------------------------------------- invoices

-- An invoice as it was on the day it was made: seller, customer, stay and lines are copied in. There is no
-- foreign key to the stay, so the invoice outlives the stay's record. Never deleted; a mistake is voided.
create table public.invoices (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  number text not null check (number ~ '^[A-Z0-9]+-[0-9]{4}-[0-9]{4,}$'),
  issued_on date not null,
  due_on date,
  language text not null check (language in ('id', 'en')),
  status text not null check (status in ('issued', 'void')),
  voided_on date,
  seller jsonb not null check (jsonb_typeof(seller) = 'object'),
  customer jsonb not null check (jsonb_typeof(customer) = 'object'),
  pet_names text not null default '',
  stay jsonb not null check (jsonb_typeof(stay) = 'object'),
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  subtotal integer not null check (subtotal >= 0),
  tax_percent numeric(5, 2) not null check (tax_percent >= 0 and tax_percent <= 100),
  tax_amount integer not null check (tax_amount >= 0),
  total integer not null check (total >= 0),
  prices_include_tax boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Numbers are never reused, voided ones included, so there are no gaps to explain.
  unique (hotel_id, number),
  unique (id, hotel_id),
  check ((status = 'void') = (voided_on is not null)),
  check (total = subtotal + tax_amount)
);
create index invoices_hotel_issued_idx on public.invoices (hotel_id, issued_on);
create index invoices_booking_idx on public.invoices (booking_id);

-- The only change an invoice allows is issued -> void (with its date). Everything else, and deleting, is refused.
create or replace function public.protect_invoice() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'invoices are never deleted: void it instead' using errcode = 'restrict_violation';
  end if;
  if old.status = 'void' then
    raise exception 'a voided invoice can not be changed' using errcode = 'restrict_violation';
  end if;
  if (to_jsonb(new) - 'status' - 'voided_on' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'voided_on' - 'updated_at') then
    raise exception 'an issued invoice can only be voided, not edited' using errcode = 'restrict_violation';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger invoices_protect before update or delete on public.invoices for each row execute function public.protect_invoice();

do $$
declare t text;
begin
  foreach t in array array['booking_pets', 'charges'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('create index %I on public.%I (hotel_id, updated_at)', t || '_sync_idx', t);
  end loop;
end $$;
create index invoices_sync_idx on public.invoices (hotel_id, updated_at);

-- ---------------------------------------------------------------- row level security

alter table public.booking_pets enable row level security;
alter table public.charges enable row level security;
alter table public.invoices enable row level security;

create policy booking_pets_members on public.booking_pets for all to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id));
create policy charges_members on public.charges for all to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id));
create policy invoices_members on public.invoices for all to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id));

grant select, insert, update, delete on public.booking_pets, public.charges, public.invoices to authenticated;
