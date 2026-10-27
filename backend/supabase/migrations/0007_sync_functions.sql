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
