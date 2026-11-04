// Builds backend/supabase/setup.sql: every migration, in order, in one file the owner can paste into Supabase's SQL
// Editor and run once on a fresh project, followed by the checks in verify.sql.
//
//   npm run build:setup-sql            write the file
//   npm run build:setup-sql -- --check exit 1 if the committed file is out of date
//
// Never edit setup.sql by hand: change or add a migration, then run this. web/src/app/sync/setup.test.ts fails while
// setup.sql is out of date, and proves it builds the same database as the migrations do.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const supabaseDir = fileURLToPath(new URL('../../backend/supabase/', import.meta.url))
const migrationsDir = `${supabaseDir}migrations/`
const target = `${supabaseDir}setup.sql`

const line = (char) => `-- ${char.repeat(116)}`

export function buildSetupSql() {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  const verify = readFileSync(`${supabaseDir}verify.sql`, 'utf8')
  const parts = [
    line('='),
    '-- PETHOMMIE: SETUP DATABASE SUPABASE (sekali jalan, di project yang masih kosong)',
    '--',
    '-- Cara pakai: Supabase -> SQL Editor -> New query -> tempel SELURUH isi file ini -> Run.',
    '-- Hasil yang benar: tabel "pemeriksaan" kecil di bawah layar, setiap baris status = OK.',
    '-- Panduan lengkap (bahasa Indonesia): docs/backend/setup-supabase.md',
    '--',
    '-- Aman dijalankan ulang: semuanya dalam satu transaksi (gagal di tengah = tidak ada yang tersimpan), dan kalau',
    '-- Pethommie sudah terpasang, file ini berhenti di awal dengan pesan "PETHOMMIE SUDAH TERPASANG" tanpa mengubah apa pun.',
    '--',
    `-- Isi: ${files.join(', ')}, lalu verify.sql.`,
    '-- File ini DIBUAT OTOMATIS dari backend/supabase/migrations/ oleh `cd web && npm run build:setup-sql`.',
    '-- Jangan diedit langsung: ubah / tambah file migrasi, lalu jalankan perintah itu lagi.',
    line('='),
    '',
    'begin;',
    '',
    '-- Sudah terpasang? Berhenti di sini, tanpa mengubah apa pun.',
    'do $$',
    'begin',
    "  if to_regclass('public.hotels') is not null then",
    "    raise exception 'PETHOMMIE SUDAH TERPASANG: tabel public.hotels sudah ada, jadi setup.sql tidak dijalankan lagi. Tidak ada yang diubah.'",
    "      using hint = 'Untuk memeriksa: jalankan backend/supabase/verify.sql. Untuk migrasi baru: jalankan file migrasi yang baru saja, satu per satu.';",
    '  end if;',
    'end $$;',
    '',
  ]
  for (const f of files) {
    const sql = readFileSync(`${migrationsDir}${f}`, 'utf8')
    parts.push(line('='), `-- MIGRASI ${f}`, line('='), '', sql.trimEnd(), '')
  }
  parts.push('commit;', '', line('='), '-- PEMERIKSAAN (verify.sql): setiap baris harus status = OK', line('='), '', verify.trimEnd(), '')
  return parts.join('\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sql = buildSetupSql()
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readFileSync(target, 'utf8')
    } catch {
      // missing counts as out of date
    }
    if (current !== sql) {
      console.error('backend/supabase/setup.sql is out of date: run `npm run build:setup-sql` in web/.')
      process.exit(1)
    }
    console.log('backend/supabase/setup.sql is up to date.')
  } else {
    writeFileSync(target, sql)
    console.log(`Wrote backend/supabase/setup.sql (${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB).`)
  }
}
