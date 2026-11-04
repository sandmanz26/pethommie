-- Siomofu: pemeriksaan setelah setup (verify).
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
  select 1, 'Tabel Siomofu ada', '14 dari 14',
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
