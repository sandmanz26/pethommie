-- ====================================================================================================================
-- PETHOMMIE: SETUP DATABASE SUPABASE (sekali jalan, di project yang masih kosong)
--
-- Cara pakai: Supabase -> SQL Editor -> New query -> tempel SELURUH isi file ini -> Run.
-- Hasil yang benar: tabel "pemeriksaan" kecil di bawah layar, setiap baris status = OK.
-- Panduan lengkap (bahasa Indonesia): docs/backend/setup-supabase.md
--
-- Aman dijalankan ulang: semuanya dalam satu transaksi (gagal di tengah = tidak ada yang tersimpan), dan kalau
-- Pethommie sudah terpasang, file ini berhenti di awal dengan pesan "PETHOMMIE SUDAH TERPASANG" tanpa mengubah apa pun.
--
-- Isi: 0001_init.sql, 0002_charges_companions_invoices.sql, 0003_shared_rooms_payment_kinds_sources.sql, 0004_rates_cancellations_archive_expenses.sql, 0005_booking_holds.sql, 0006_stay_rules.sql, 0007_sync_functions.sql, lalu verify.sql.
-- File ini DIBUAT OTOMATIS dari backend/supabase/migrations/ oleh `cd web && npm run build:setup-sql`.
-- Jangan diedit langsung: ubah / tambah file migrasi, lalu jalankan perintah itu lagi.
-- ====================================================================================================================

begin;

-- Sudah terpasang? Berhenti di sini, tanpa mengubah apa pun.
do $$
begin
  if to_regclass('public.hotels') is not null then
    raise exception 'PETHOMMIE SUDAH TERPASANG: tabel public.hotels sudah ada, jadi setup.sql tidak dijalankan lagi. Tidak ada yang diubah.'
      using hint = 'Untuk memeriksa: jalankan backend/supabase/verify.sql. Untuk migrasi baru: jalankan file migrasi yang baru saja, satu per satu.';
  end if;
end $$;

-- ====================================================================================================================
-- MIGRASI 0001_init.sql
-- ====================================================================================================================

-- Pethommie: the hotel's data on a server.
--
-- Target: Postgres 15+ on Supabase (it provides the `auth` schema, `auth.uid()` and the `anon` / `authenticated`
-- roles). Nothing here is applied by the app yet: see docs/backend/. The shape mirrors web/src/app/domain/types.ts
-- and is checked against it by web/src/app/sync/schema.test.ts, which runs this file on a real Postgres (PGlite).
--
-- Rules that live in the database, so no client can break them:
--   * a pet or a booking can only refer to records of the same hotel (composite foreign keys),
--   * a cage can't be double-booked (exclusion constraint on booked / checked-in stays),
--   * every row is visible only to the members of its hotel (row level security).
-- Rows are never deleted by the app: `deleted_at` marks them, so devices that were offline learn about it when they sync.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- helpers

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- hotels and who works in them

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  city text not null default '',
  -- Normalised like the app does: 62 + digits, or empty.
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^62[0-9]{7,13}$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hotel_members (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (hotel_id, user_id)
);
create index hotel_members_user_idx on public.hotel_members (user_id);

-- security definer: the policies below ask "is this person in the hotel?" without being blocked by their own rules.
create or replace function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hotel_members m where m.hotel_id = h and m.user_id = auth.uid())
$$;

create or replace function public.is_owner(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hotel_members m where m.hotel_id = h and m.user_id = auth.uid() and m.role = 'owner')
$$;

-- Whoever creates a hotel is its owner.
create or replace function public.add_creator_as_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.hotel_members (hotel_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;
create trigger hotels_creator_is_owner after insert on public.hotels for each row execute function public.add_creator_as_owner();
create trigger hotels_touch before update on public.hotels for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- the hotel's records
-- Each table: id, hotel_id, and the sync columns (created_at, updated_at, deleted_at).
-- (id, hotel_id) is unique so that children can point at a parent *of the same hotel*.

create table public.cages (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  size text not null check (size in ('S', 'M', 'L')),
  price_per_night integer not null check (price_per_night >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id)
);

create table public.owners (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^62[0-9]{7,13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id)
);

create table public.pets (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  owner_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  species text not null check (species in ('cat', 'dog', 'rabbit', 'other')),
  breed text not null default '',
  vaccine_expiry date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id),
  foreign key (owner_id, hotel_id) references public.owners (id, hotel_id)
);
create index pets_owner_idx on public.pets (owner_id);

create table public.bookings (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  pet_id uuid not null,
  cage_id uuid not null,
  check_in date not null,
  check_out date not null,
  status text not null check (status in ('booked', 'checked_in', 'checked_out', 'cancelled')),
  -- How the pet looked on arrival: { at, healthy, fleaFree, weightKg, belongings, food, notes }, or null.
  arrival jsonb check (arrival is null or jsonb_typeof(arrival) = 'object'),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id),
  foreign key (pet_id, hotel_id) references public.pets (id, hotel_id),
  foreign key (cage_id, hotel_id) references public.cages (id, hotel_id),
  check (check_out > check_in),
  -- A stay holds its cage from the check-in night up to, not including, the check-out day.
  constraint bookings_no_double_booking exclude using gist (cage_id with =, daterange(check_in, check_out) with &&)
    where (status in ('booked', 'checked_in') and deleted_at is null)
);
create index bookings_hotel_dates_idx on public.bookings (hotel_id, check_in);
create index bookings_pet_idx on public.bookings (pet_id);

create table public.payments (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  paid_at timestamptz not null,
  amount integer not null check (amount > 0),
  method text not null check (method in ('cash', 'qris', 'transfer')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id),
  foreign key (booking_id, hotel_id) references public.bookings (id, hotel_id)
);
create index payments_booking_idx on public.payments (booking_id);
create index payments_hotel_paid_idx on public.payments (hotel_id, paid_at);

create table public.care_entries (
  id uuid primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  at timestamptz not null,
  kind text not null check (kind in ('meal', 'drink', 'play', 'toilet', 'medicine', 'mood', 'note', 'incident')),
  preset text check (preset is null or length(preset) > 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, hotel_id),
  foreign key (booking_id, hotel_id) references public.bookings (id, hotel_id)
);
create index care_entries_booking_idx on public.care_entries (booking_id, at);

-- "The day's report for this stay went to the owner."
create table public.reports_sent (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_id uuid not null,
  report_date date not null,
  sent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (booking_id, report_date),
  foreign key (booking_id, hotel_id) references public.bookings (id, hotel_id)
);

-- Sign-ups from the landing page. Anyone may add one; nobody reads them through the API (the service role does).
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_name text not null check (length(btrim(hotel_name)) between 1 and 120),
  city text not null check (length(btrim(city)) between 1 and 80),
  cages text not null check (length(cages) <= 40),
  whatsapp text not null check (whatsapp ~ '^62[0-9]{7,13}$'),
  locale text not null default 'id' check (locale in ('id', 'en')),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['cages', 'owners', 'pets', 'bookings', 'payments', 'care_entries', 'reports_sent'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    -- What a device asks on sync: "what changed in my hotel since ...".
    execute format('create index %I on public.%I (hotel_id, updated_at)', t || '_sync_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- row level security

alter table public.hotels enable row level security;
alter table public.hotel_members enable row level security;
alter table public.cages enable row level security;
alter table public.owners enable row level security;
alter table public.pets enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.care_entries enable row level security;
alter table public.reports_sent enable row level security;
alter table public.join_requests enable row level security;

-- `created_by` as well: right after an insert, the new row is read back before the membership row is visible.
create policy hotels_select on public.hotels for select to authenticated using (public.is_member(id) or created_by = auth.uid());
create policy hotels_insert on public.hotels for insert to authenticated with check (created_by = auth.uid());
create policy hotels_update on public.hotels for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy hotels_delete on public.hotels for delete to authenticated using (public.is_owner(id));

create policy members_select on public.hotel_members for select to authenticated using (public.is_member(hotel_id));
create policy members_insert on public.hotel_members for insert to authenticated with check (public.is_owner(hotel_id));
create policy members_update on public.hotel_members for update to authenticated using (public.is_owner(hotel_id)) with check (public.is_owner(hotel_id));
create policy members_delete on public.hotel_members for delete to authenticated using (public.is_owner(hotel_id));

do $$
declare t text;
begin
  foreach t in array array['cages', 'owners', 'pets', 'bookings', 'payments', 'care_entries', 'reports_sent'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id))', t || '_members', t);
  end loop;
end $$;

create policy join_requests_insert on public.join_requests for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------- privileges
-- Explicit, rather than relying on the platform's defaults.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.join_requests from authenticated;
grant insert on public.join_requests to anon, authenticated;
grant execute on function public.is_member(uuid), public.is_owner(uuid) to authenticated;

-- ====================================================================================================================
-- MIGRASI 0002_charges_companions_invoices.sql
-- ====================================================================================================================

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

-- ====================================================================================================================
-- MIGRASI 0003_shared_rooms_payment_kinds_sources.sql
-- ====================================================================================================================

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

-- ====================================================================================================================
-- MIGRASI 0004_rates_cancellations_archive_expenses.sql
-- ====================================================================================================================

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

-- ====================================================================================================================
-- MIGRASI 0005_booking_holds.sql
-- ====================================================================================================================

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

-- ====================================================================================================================
-- MIGRASI 0006_stay_rules.sql
-- ====================================================================================================================

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

-- ====================================================================================================================
-- MIGRASI 0007_sync_functions.sql
-- ====================================================================================================================

-- Pethommie, step 7: what a device calls to sync (Phase 1 of docs/backend/README.md).
--
--   * create_hotel(...)       a signed-in person makes their hotel; the 0001 trigger makes them its owner.
--   * my_hotel()              the hotel the signed-in person belongs to (owner first), or null.
--   * pull_changes(h, since)  every row of the hotel changed after `since` (all of them for null), tombstones as
--                             removals, the hotel's own row, and the cursor to ask from next time.
--   * push_changes(h, c, cur) upserts and soft-deletes a device's changes in one transaction: all or nothing.
--                             Answers {ok:true} or {ok:false, reason}: 'double_booking' (the unit is full on those
--                             nights, or the pet is already elsewhere), 'forbidden' (not a member) or 'invalid'.
--
-- All four are SECURITY INVOKER: they run as the caller, so row level security decides what they may read and write,
-- exactly as for a plain query. Checked by web/src/app/sync/schema.test.ts.

-- The capacity trigger again (as in 0005), now naming the stay it refused in DETAIL, so the app can show which one.
create or replace function public.keep_unit_within_capacity() returns trigger language plpgsql as $$
declare
  places integer;
  busiest integer;
begin
  if new.deleted_at is not null or new.status not in ('booked', 'checked_in') or new.hold is not distinct from 'request' then
    return new;
  end if;
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
    raise exception 'bookings_no_double_booking: the unit is full on these nights'
      using errcode = 'exclusion_violation', detail = new.id::text;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- the tables a device syncs
-- Name, key columns and the columns a device writes (everything but hotel_id and the server's timestamps; a stay
-- keeps the moment it was made). Parents before children. Invoices are never deleted, so they have no tombstone.

create or replace function public.sync_tables() returns table (name text, keys text[], cols text[], soft_delete boolean)
language sql immutable as $$
  values
    ('cages',        array['id'], array['id', 'name', 'size', 'price_per_night', 'capacity', 'archived'], true),
    ('owners',       array['id'], array['id', 'name', 'whatsapp', 'language'], true),
    ('pets',         array['id'], array['id', 'owner_id', 'name', 'species', 'breed', 'vaccine_expiry', 'notes'], true),
    ('bookings',     array['id'], array['id', 'pet_id', 'cage_id', 'check_in', 'check_out', 'rate', 'status', 'cancel_reason', 'hold', 'source', 'arrival', 'notes', 'created_at'], true),
    ('booking_pets', array['booking_id', 'pet_id'], array['booking_id', 'pet_id', 'position'], true),
    ('payments',     array['id'], array['id', 'booking_id', 'paid_at', 'amount', 'method', 'kind', 'reference', 'note'], true),
    ('charges',      array['id'], array['id', 'booking_id', 'position', 'label', 'amount'], true),
    ('care_entries', array['id'], array['id', 'booking_id', 'at', 'kind', 'preset', 'note'], true),
    ('reports_sent', array['booking_id', 'report_date'], array['booking_id', 'report_date', 'sent_at'], true),
    ('invoices',     array['id'], array['id', 'booking_id', 'number', 'issued_on', 'due_on', 'language', 'status', 'voided_on', 'seller', 'customer', 'pet_names', 'stay', 'lines', 'subtotal', 'tax_percent', 'tax_amount', 'total', 'prices_include_tax'], false),
    ('expenses',     array['id'], array['id', 'spent_on', 'category', 'amount', 'method', 'vendor', 'note', 'recurring'], true)
$$;

-- ---------------------------------------------------------------- a hotel of one's own

create or replace function public.create_hotel(p_id uuid, p_name text, p_city text default '', p_whatsapp text default '', p_settings jsonb default '{}'::jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
begin
  -- Asking twice (the answer was lost on the way) is harmless.
  insert into public.hotels (id, name, city, whatsapp, settings, created_by)
  values (p_id, p_name, coalesce(p_city, ''), coalesce(p_whatsapp, ''), coalesce(p_settings, '{}'::jsonb), auth.uid())
  on conflict (id) do nothing;
  -- ...but an id that is someone else's hotel is not one's own.
  if not public.is_member(p_id) then
    raise exception 'that hotel belongs to someone else' using errcode = 'insufficient_privilege';
  end if;
  return p_id;
end $$;

create or replace function public.my_hotel() returns uuid language sql stable security invoker set search_path = public as $$
  select m.hotel_id from public.hotel_members m
  where m.user_id = auth.uid()
  order by (m.role = 'owner') desc, m.created_at
  limit 1
$$;

-- ---------------------------------------------------------------- pull

create or replace function public.pull_changes(p_hotel uuid, p_since timestamptz default null)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  t record;
  part jsonb;
  changes jsonb := '{}'::jsonb;
  hotel jsonb;
  -- Rows can commit slightly out of order: ask a little further back. Reading a row twice is harmless.
  since timestamptz := p_since - interval '5 seconds';
begin
  if not public.is_member(p_hotel) then
    raise exception 'not a member of this hotel' using errcode = 'insufficient_privilege';
  end if;
  select jsonb_build_object('id', h.id, 'name', h.name, 'city', h.city, 'whatsapp', h.whatsapp, 'settings', h.settings, 'created_at', h.created_at)
    into hotel from public.hotels h where h.id = p_hotel;

  for t in select * from public.sync_tables() loop
    execute format(
      $q$
      select jsonb_build_object(
        'upsert', coalesce(jsonb_agg(to_jsonb(x) - %L::text[]) filter (where to_jsonb(x)->>'deleted_at' is null), '[]'::jsonb),
        'remove', coalesce(jsonb_agg((select jsonb_object_agg(k, to_jsonb(x)->>k) from unnest(%L::text[]) k)) filter (where to_jsonb(x)->>'deleted_at' is not null), '[]'::jsonb))
      from public.%I x
      where x.hotel_id = $1 and ($2::timestamptz is null or x.updated_at > $2)
      $q$,
      case when 'created_at' = any (t.cols) then array['updated_at', 'deleted_at'] else array['created_at', 'updated_at', 'deleted_at'] end,
      t.keys,
      t.name)
      into part using p_hotel, since;
    changes := changes || jsonb_build_object(t.name, part);
  end loop;

  return jsonb_build_object('hotel', hotel, 'changes', changes, 'cursor', now());
end $$;

-- ---------------------------------------------------------------- push

create or replace function public.push_changes(p_hotel uuid, p_changes jsonb, p_cursor timestamptz default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  t record;
  batch jsonb;
  set_list text;
  differs text;
  key_match text;
  msg text;
  detail text;
begin
  if not public.is_member(p_hotel) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  begin
    -- The hotel's own row (name, city, WhatsApp, settings), when it changed.
    if jsonb_typeof(p_changes->'hotel') = 'object' then
      update public.hotels h set
        name = coalesce(p_changes->'hotel'->>'name', h.name),
        city = coalesce(p_changes->'hotel'->>'city', h.city),
        whatsapp = coalesce(p_changes->'hotel'->>'whatsapp', h.whatsapp),
        settings = coalesce(p_changes->'hotel'->'settings', h.settings)
      where h.id = p_hotel;
    end if;

    -- Removals first, so a stay taken off frees its unit for one added in the same push. Soft: devices that were
    -- offline hear about it on their next pull.
    for t in select * from public.sync_tables() where soft_delete loop
      batch := p_changes->t.name->'remove';
      continue when batch is null or jsonb_array_length(batch) = 0;
      select string_agg(format('x.%1$I::text = r->>%1$L', k), ' and ') into key_match from unnest(t.keys) k;
      execute format('update public.%I x set deleted_at = now() from jsonb_array_elements($1) r where x.hotel_id = $2 and x.deleted_at is null and %s', t.name, key_match)
        using batch, p_hotel;
    end loop;

    -- Then writes, parents first. Every column comes from the device; hotel_id is always this hotel. A row that is
    -- already exactly so is left alone (no new updated_at), so pushing the same change twice changes nothing.
    for t in select * from public.sync_tables() loop
      batch := p_changes->t.name->'upsert';
      continue when batch is null or jsonb_array_length(batch) = 0;
      select string_agg(format('%1$I = excluded.%1$I', c), ', ') into set_list from unnest(t.cols) c where c <> all (t.keys) and c <> 'created_at';
      select format('(%s) is distinct from (%s)', string_agg(format('x.%I', c), ', '), string_agg(format('excluded.%I', c), ', ')) into differs
        from unnest(t.cols) c where c <> all (t.keys) and c <> 'created_at';
      execute format(
        'insert into public.%1$I as x (hotel_id, %2$s) select $2, %3$s from jsonb_populate_recordset(null::public.%1$I, $1) r
         on conflict (%4$s) do update set %5$s where %6$s',
        t.name,
        (select string_agg(format('%I', c), ', ') from unnest(t.cols) c),
        (select string_agg(format('r.%I', c), ', ') from unnest(t.cols) c),
        (select string_agg(format('%I', k), ', ') from unnest(t.keys) k),
        set_list || case when t.soft_delete then ', deleted_at = null' else '' end,
        differs || case when t.soft_delete then ' or x.deleted_at is not null' else '' end)
        using batch, p_hotel;
    end loop;
  exception
    when exclusion_violation then
      get stacked diagnostics msg = message_text, detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'reason', 'double_booking', 'message', msg,
        'booking', case when detail ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then detail end);
    when insufficient_privilege then
      return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', sqlerrm);
    when others then
      return jsonb_build_object('ok', false, 'reason', 'invalid', 'message', sqlerrm);
  end;

  -- The device's own cursor back: its changes are in, but what others wrote since it last pulled is not yet with it.
  return jsonb_build_object('ok', true, 'cursor', coalesce(p_cursor, 'epoch'::timestamptz));
end $$;

-- ---------------------------------------------------------------- who may call them

revoke all on function public.sync_tables(), public.create_hotel(uuid, text, text, text, jsonb), public.my_hotel(),
  public.pull_changes(uuid, timestamptz), public.push_changes(uuid, jsonb, timestamptz) from public;
grant execute on function public.sync_tables(), public.create_hotel(uuid, text, text, text, jsonb), public.my_hotel(),
  public.pull_changes(uuid, timestamptz), public.push_changes(uuid, jsonb, timestamptz) to authenticated;

commit;

-- ====================================================================================================================
-- PEMERIKSAAN (verify.sql): setiap baris harus status = OK
-- ====================================================================================================================

-- Pethommie: pemeriksaan setelah setup (verify).
--
-- Jalankan di Supabase -> SQL Editor kapan saja (aman, hanya membaca). Hasilnya satu tabel kecil:
-- setiap baris harus berstatus OK. Kalau ada yang "CEK", lihat kolom "hasil" dan docs/backend/setup-supabase.md.
-- File ini juga ikut di bagian paling bawah setup.sql. Diuji di web/src/app/sync/setup.test.ts.

with
expected_tables(name) as (
  values ('hotels'), ('hotel_members'), ('cages'), ('owners'), ('pets'), ('bookings'), ('payments'), ('care_entries'),
         ('reports_sent'), ('join_requests'), ('booking_pets'), ('charges'), ('invoices'), ('expenses')
),
expected_functions(name) as (
  values ('create_hotel'), ('my_hotel'), ('pull_changes'), ('push_changes'), ('sync_tables'), ('is_member'), ('is_owner'),
         ('touch_updated_at'), ('add_creator_as_owner'), ('keep_unit_within_capacity'), ('refuse_archived_unit'), ('protect_invoice')
),
expected_triggers(name) as (
  values ('hotels_creator_is_owner'), ('bookings_unit_capacity'), ('bookings_not_in_archived_unit'), ('invoices_protect')
),
public_tables as (
  select c.relname as name, c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
public_functions as (
  select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
public_triggers as (
  select t.tgname as name
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
checks(no, pemeriksaan, diharapkan, hasil) as (
  select 1, 'Tabel Pethommie ada', '14 dari 14',
    (select count(*) from expected_tables e where e.name in (select name from public_tables)) || ' dari 14'
    || coalesce(' (kurang: ' || (select string_agg(e.name, ', ') from expected_tables e where e.name not in (select name from public_tables)) || ')', '')
  union all
  select 2, 'Row Level Security (RLS) menyala di semua tabel', '14 dari 14',
    (select count(*) from public_tables t where t.rls and t.name in (select name from expected_tables)) || ' dari 14'
    || coalesce(' (mati: ' || (select string_agg(t.name, ', ') from public_tables t where not t.rls and t.name in (select name from expected_tables)) || ')', '')
  union all
  select 3, 'Aturan akses (policies)', '20',
    (select count(*) from pg_policies where schemaname = 'public')::text
  union all
  select 4, 'Fungsi (create_hotel, my_hotel, pull_changes, push_changes, ...)', '12 dari 12',
    (select count(*) from expected_functions e where e.name in (select name from public_functions)) || ' dari 12'
    || coalesce(' (kurang: ' || (select string_agg(e.name, ', ') from expected_functions e where e.name not in (select name from public_functions)) || ')', '')
  union all
  select 5, 'Trigger penting (pemilik hotel, kapasitas kandang, unit diarsip, invoice)', '4 dari 4',
    (select count(*) from expected_triggers e where e.name in (select name from public_triggers)) || ' dari 4'
  union all
  select 6, 'Ekstensi btree_gist terpasang', 'ya',
    case when exists (select 1 from pg_extension where extname = 'btree_gist') then 'ya' else 'tidak' end
  union all
  select 7, 'Satu hewan tidak bisa di dua tempat (constraint)', 'ya',
    case when exists (select 1 from pg_constraint where conname = 'bookings_pet_in_one_place') then 'ya' else 'tidak' end
  union all
  select 8, 'Formulir daftar: pengunjung (anon) boleh mengirim', 'ya',
    case when to_regclass('public.join_requests') is null then 'tidak'
         when has_table_privilege('anon', 'public.join_requests', 'insert') then 'ya' else 'tidak' end
  union all
  select 9, 'Formulir daftar: tidak ada yang bisa membacanya lewat API', 'ya',
    case when (select rls from public_tables where name = 'join_requests')
          and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'join_requests' and cmd in ('SELECT', 'ALL'))
         then 'ya' else 'tidak' end
  union all
  select 10, 'Pengguna login boleh memanggil push_changes', 'ya',
    case when to_regprocedure('public.push_changes(uuid, jsonb, timestamptz)') is null then 'tidak'
         when has_function_privilege('authenticated', 'public.push_changes(uuid, jsonb, timestamptz)', 'execute') then 'ya' else 'tidak' end
  union all
  select 11, 'Fungsi sinkron berjalan sebagai pemanggil (RLS tetap berlaku)', '4 dari 4',
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('create_hotel', 'my_hotel', 'pull_changes', 'push_changes') and not p.prosecdef) || ' dari 4'
)
select no, pemeriksaan, diharapkan, hasil, case when hasil = diharapkan then 'OK' else 'CEK' end as status
from checks
order by no;
