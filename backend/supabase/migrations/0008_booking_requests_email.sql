-- Siomofu, step 8: booking requests from the public link, and the email notifications they queue.
--
-- A synced hotel's booking link embeds its id (web/src/shared/lib/bookingLink.ts, `hid`). A visitor's request on
-- /book then becomes a row here, alongside the WhatsApp message the page already sends. The owner sees new requests
-- in the app and gets an email for each one; the email side is worked by /api/email/dispatch (service role),
-- documented in docs/backend/email-setup.md. A local-only hotel has no `hid` in its link, so its visitors only get
-- the WhatsApp message, exactly as before this migration.

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  owner_name text not null check (length(btrim(owner_name)) between 1 and 60),
  owner_wa text not null check (owner_wa ~ '^62[0-9]{7,13}$'),
  pet_name text not null check (length(btrim(pet_name)) between 1 and 40),
  species text not null check (species in ('cat', 'dog', 'rabbit', 'other')),
  breed text not null default '' check (length(breed) <= 40),
  check_in date not null,
  check_out date not null check (check_out > check_in),
  preference text not null default '' check (length(preference) <= 60),
  notes text not null default '' check (length(notes) <= 500),
  locale text not null default 'id' check (locale in ('id', 'en')),
  -- new: nobody has looked at it yet. claimed: an owner is handling it (no place is held by this alone).
  -- dismissed: the owner hid it (a duplicate, a prank, already handled over WhatsApp).
  status text not null default 'new' check (status in ('new', 'claimed', 'dismissed')),
  claimed_by uuid references auth.users (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index booking_requests_hotel_idx on public.booking_requests (hotel_id, created_at desc);

alter table public.booking_requests enable row level security;
-- Anyone with the link may add a request (same shape as join_requests); only the hotel's own members may read or
-- update one (mark it claimed/dismissed is a plain update, no RPC: it's an ordinary hotel record like any other).
create policy booking_requests_insert on public.booking_requests for insert to anon, authenticated with check (true);
create policy booking_requests_select on public.booking_requests for select to authenticated using (public.is_member(hotel_id));
create policy booking_requests_update on public.booking_requests for update to authenticated using (public.is_member(hotel_id)) with check (public.is_member(hotel_id));

revoke all on public.booking_requests from authenticated;
grant select, update on public.booking_requests to authenticated;
grant insert on public.booking_requests to anon, authenticated;

-- ---------------------------------------------------------------- notifications
-- A to-do list of emails to send. Only /api/email/dispatch (service role key, bypasses row level security) ever
-- reads or writes this table: it is not reachable through the anon/authenticated PostgREST roles at all, which is
-- why it has no policies of its own rather than row level security plus a deny-all policy.

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  kind text not null check (kind in ('booking_request')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_outbox_due_idx on public.notification_outbox (status, next_attempt_at);

-- Row level security on, with no policies at all: anon/authenticated get nothing, whatever privileges they're
-- granted elsewhere. Only the service role (which row level security never restricts) can see this table.
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;

-- A new request queues its own notification. security definer: anon (who made the request) has no access to
-- notification_outbox at all; this trigger is the one and only way a row gets in.
create or replace function public.enqueue_booking_request_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_outbox (hotel_id, kind, payload) values (
    new.hotel_id, 'booking_request',
    jsonb_build_object(
      'request_id', new.id, 'owner_name', new.owner_name, 'owner_wa', new.owner_wa, 'pet_name', new.pet_name,
      'species', new.species, 'breed', new.breed, 'check_in', new.check_in, 'check_out', new.check_out,
      'preference', new.preference, 'notes', new.notes, 'locale', new.locale
    )
  );
  return new;
end $$;
create trigger booking_requests_enqueue_email after insert on public.booking_requests
  for each row execute function public.enqueue_booking_request_email();
