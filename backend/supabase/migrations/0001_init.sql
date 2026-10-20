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
