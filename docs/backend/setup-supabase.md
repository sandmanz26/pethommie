# Pasang Supabase untuk Pethommie (langkah demi langkah)

Panduan ini untuk pemilik produk, bukan untuk developer. Ikuti dari atas ke bawah, klik demi klik. Kira-kira **30–45
menit**. Hasil akhirnya:

- database Pethommie di Supabase (semua tabel, aturan keamanan, dan fungsi sinkron),
- login Google di aplikasi,
- API kecil di Vercel (`/api/...`) yang bisa dicoba dengan `curl` atau dari browser.

Yang Anda perlukan: akun Supabase (gratis), akun Google, akses ke project Vercel **pethommie-web**, dan file
`backend/supabase/setup.sql` dari repo ini.

> Istilah singkat
> - **Project ref**: kode acak project Supabase Anda, misalnya `abcdxyzqwerty`. Terlihat di alamat
>   `https://abcdxyzqwerty.supabase.co`. Di panduan ini ditulis `<project-ref>`: ganti dengan milik Anda.
> - **Anon key / Publishable key**: kunci *publik*. Aman ada di browser; keamanan data dijaga oleh aturan di database (RLS).
> - **Service role key / Secret key**: kunci *rahasia* yang bisa melewati semua aturan. **Tidak dipakai** oleh Pethommie
>   saat ini. Jangan disalin ke mana pun.

---

## Langkah 1 — Buat project Supabase

1. Buka https://supabase.com/dashboard dan login.
2. Klik **New project**.
3. Isi:
   - **Organization**: organisasi Anda (buat baru kalau belum ada).
   - **Project name**: `pethommie`.
   - **Database Password**: klik **Generate a password**, lalu **simpan di password manager**. Aplikasi tidak memakainya,
     tetapi Anda butuh kalau suatu saat ada masalah.
   - **Region**: **Southeast Asia (Singapore)** (paling dekat ke Indonesia; baca catatan lokasi data di
     [README.md §6](README.md)).
4. Klik **Create new project**. Tunggu 1–2 menit sampai statusnya siap (tidak ada lagi tulisan "Setting up project").

## Langkah 2 — Jalankan `setup.sql` (sekali saja)

`setup.sql` berisi semua migrasi `0001` sampai `0007` dalam satu file, ditambah pemeriksaan otomatis di bagian bawah.

1. Di repo, buka file **`backend/supabase/setup.sql`**.
   - Di GitHub: buka file itu → klik tombol **Raw** → tekan **Ctrl+A** (Mac: **Cmd+A**) lalu **Ctrl+C** (**Cmd+C**).
   - Atau di komputer: buka dengan editor teks apa pun, pilih semua, salin.
2. Di Supabase, menu kiri → **SQL Editor** (ikon `>_`).
3. Klik **+ New query** (atau **New SQL snippet**).
4. Klik di area tulisan, tempel (**Ctrl+V** / **Cmd+V**). Pastikan baris pertama dimulai dengan
   `-- ====` dan baris terakhir adalah `order by no;`.
5. Klik **Run** (kanan bawah), atau tekan **Ctrl+Enter** (**Cmd+Enter**).
6. Mungkin muncul jendela peringatan:
   - **"Potential issue detected… destructive operation"**: ini karena satu migrasi mengganti sebuah aturan lama
     (`drop constraint`). Aman di project baru. Klik **Run this query**.
   - Peringatan tentang **RLS / Row Level Security**: file ini sendiri menyalakan RLS di semua tabel. Pilih
     **Run and enable RLS** kalau ada, atau **Run this query**. Keduanya menghasilkan hal yang sama.
7. Tunggu beberapa detik. Di bawah muncul tabel hasil **pemeriksaan** dengan 11 baris.

Ukuran file sekitar 47 KB. SQL Editor bisa menjalankannya sekaligus; tidak perlu dipecah.

## Langkah 3 — Periksa hasilnya

Tabel hasil harus seperti ini (kolom **status** = **OK** di semua baris):

| no | pemeriksaan | diharapkan | status |
|---|---|---|---|
| 1 | Tabel Pethommie ada | 14 dari 14 | OK |
| 2 | Row Level Security (RLS) menyala di semua tabel | 14 dari 14 | OK |
| 3 | Aturan akses (policies) | 20 | OK |
| 4 | Fungsi (create_hotel, my_hotel, pull_changes, push_changes, ...) | 12 dari 12 | OK |
| 5 | Trigger penting (pemilik hotel, kapasitas kandang, unit diarsip, invoice) | 4 dari 4 | OK |
| 6 | Ekstensi btree_gist terpasang | ya | OK |
| 7 | Satu hewan tidak bisa di dua tempat (constraint) | ya | OK |
| 8 | Formulir daftar: pengunjung (anon) boleh mengirim | ya | OK |
| 9 | Formulir daftar: tidak ada yang bisa membacanya lewat API | ya | OK |
| 10 | Pengguna login boleh memanggil push_changes | ya | OK |
| 11 | Fungsi sinkron berjalan sebagai pemanggil (RLS tetap berlaku) | 4 dari 4 | OK |

Cek tambahan (opsional): menu kiri → **Table Editor**: ada 14 tabel, antara lain `hotels`, `bookings`, `pets`,
`owners`, `join_requests`.

Mau memeriksa lagi nanti? Buka query baru, tempel isi **`backend/supabase/verify.sql`**, klik **Run**. File itu hanya
membaca, tidak mengubah apa pun.

> **Jangan jalankan `setup.sql` dua kali.** Kalau tidak sengaja, tidak apa-apa: file itu langsung berhenti dengan pesan
> `PETHOMMIE SUDAH TERPASANG` dan tidak mengubah apa pun. Semua isi `setup.sql` berjalan dalam satu transaksi: kalau
> gagal di tengah, tidak ada yang tersimpan, jadi Anda bisa memperbaiki penyebabnya lalu menjalankannya lagi.
>
> Nanti kalau developer menambah migrasi baru (misalnya `0008_...sql`), **jangan** jalankan ulang `setup.sql`:
> jalankan **file migrasi yang baru itu saja**, dengan cara yang sama (New query → tempel → Run).

## Langkah 4 — Salin URL dan kunci publik

1. Menu kiri → **Project Settings** (ikon roda gigi) → **Data API** (atau **API**).
   - Salin **Project URL**: `https://<project-ref>.supabase.co`.
2. **Project Settings → API Keys**.
   - Salin **anon public** key (di tab **Legacy API keys**: teks panjang yang diawali `eyJ...`), **atau** di project
     baru, **Publishable key** (diawali `sb_publishable_...`). Keduanya bisa dipakai; pilih satu dan pakai yang sama
     di semua tempat di bawah.
   - **Jangan** salin `service_role` / **Secret key**.

Simpan dua nilai ini sementara di catatan; dipakai di langkah 6.

## Langkah 5 — Login Google

Ikuti [google-login.md](google-login.md) **bagian 2 dan 3** (membuat OAuth client di Google Cloud, lalu menyalakan
Google di Supabase dan mengisi **Site URL** serta **Redirect URLs**). Bagian 1 di sana (membuat project dan menjalankan
migrasi) sudah Anda kerjakan di langkah 1–3 panduan ini.

## Langkah 6 — Isi Environment Variables di Vercel

1. Buka https://vercel.com → pilih project **pethommie-web**.
2. Tab **Settings** → menu kiri **Environment Variables**.
3. Tambahkan variabel berikut satu per satu. Untuk setiap variabel: isi **Key**, isi **Value**, centang
   **Production** dan **Preview**, klik **Save**.

| Key | Value | Untuk apa |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | aplikasi di browser |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key | aplikasi di browser |
| `SUPABASE_URL` | sama dengan `VITE_SUPABASE_URL` | API `/api/...` di server |
| `SUPABASE_ANON_KEY` | sama dengan `VITE_SUPABASE_ANON_KEY` | API `/api/...` di server |

- `SUPABASE_URL` dan `SUPABASE_ANON_KEY` disarankan diisi. Kalau lupa, API memakai nilai `VITE_...` yang sama.
- `SUPABASE_SERVICE_ROLE_KEY`: **tidak perlu, biarkan kosong.** Tidak ada endpoint yang memakainya. Kalau suatu hari
  developer membutuhkannya, kunci itu **hanya** boleh dengan nama tanpa awalan `VITE_` (yang berawalan `VITE_` ikut
  terkirim ke browser semua orang) dan hanya dicentang untuk Production.
- Jangan pernah menaruh kunci rahasia di file repo.

## Langkah 7 — Deploy ulang

Variabel `VITE_...` dibaca saat build, jadi aplikasi harus dibangun ulang.

1. Vercel → project **pethommie-web** → tab **Deployments**.
2. Di deployment paling atas (Production), klik **⋯** (tiga titik) → **Redeploy** → **Redeploy**.
3. Tunggu sampai status **Ready** (beberapa menit).

Cek pengaturan sekali saja: **Settings → Build and Deployment → Root Directory** harus `web` (folder yang berisi
`package.json` dan folder `api/`). Vercel otomatis menjadikan setiap file di `web/api/` sebuah endpoint.

## Langkah 8 — Coba aplikasinya

1. Buka https://pethommie-web.vercel.app/app/register → **Lanjut dengan Google** → pilih akun.
2. Isi setup hotel (nama, WhatsApp, kandang). Hotel dibuat di server, Anda menjadi pemiliknya.
3. Supabase → **Authentication → Users**: akun Anda ada, provider `google`.
4. Supabase → **Table Editor → hotels**: hotel Anda ada.

## Langkah 9 — Coba API

Daftar lengkap endpoint ada di [api.md](api.md). Di sini cara mencobanya.

### 9a. Tanpa login: health

Buka di browser: https://pethommie-web.vercel.app/api/health

Hasil yang benar:

```json
{"ok":true,"env":{"SUPABASE_URL":true,"SUPABASE_ANON_KEY":true},"supabase":{"reachable":true,"status":200,"ms":120}}
```

Atau di Terminal (Mac: buka aplikasi **Terminal**):

```bash
curl -s https://pethommie-web.vercel.app/api/health
```

### 9b. Ambil access token (untuk endpoint yang perlu login)

Endpoint lain butuh tanda bahwa Anda sudah login: **access token**. Cara mengambilnya dari browser:

1. Buka https://pethommie-web.vercel.app/app dan login dengan Google (Chrome disarankan).
2. Tekan **F12** (Mac: **Cmd+Option+J**) → tab **Console**.
3. Kalau Chrome menulis "Don't paste code…", ketik `allow pasting` lalu Enter.
4. Tempel baris ini, tekan Enter:

   ```js
   copy(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")))).access_token)
   ```

   Token (teks panjang diawali `eyJ`) sekarang ada di clipboard. Kalau muncul error `null`, Anda belum login di
   tab itu: login dulu, lalu ulangi.

Token berlaku **±1 jam**. Kalau API menjawab `invalid_token`, muat ulang halaman aplikasi dan ambil token lagi.
**Token ini seperti kunci rumah**: jangan dikirim ke orang lain atau ditempel di chat.

### 9c. Coba dengan curl (Terminal)

Simpan token di Terminal dulu (tempel token Anda di antara tanda kutip):

```bash
export TOKEN="eyJ...token-anda..."
export API="https://pethommie-web.vercel.app/api"
```

Lalu coba satu per satu:

```bash
# Hotel saya
curl -s "$API/hotel" -H "Authorization: Bearer $TOKEN"

# Unit / kandang (untuk mendapatkan cageId)
curl -s "$API/cages" -H "Authorization: Bearer $TOKEN"

# Tambah pemilik hewan
curl -s -X POST "$API/owners" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Sari","whatsapp":"0812 3456 7890"}'

# Daftar pemilik (salin "id" milik Sari untuk langkah berikut)
curl -s "$API/owners" -H "Authorization: Bearer $TOKEN"

# Tambah hewan (ganti OWNER_ID)
curl -s -X POST "$API/pets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ownerId":"OWNER_ID","name":"Mochi","species":"cat"}'

# Daftar hewan
curl -s "$API/pets" -H "Authorization: Bearer $TOKEN"

# Buat booking (ganti PET_ID dan CAGE_ID)
curl -s -X POST "$API/bookings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"petId":"PET_ID","cageId":"CAGE_ID","checkIn":"2026-12-20","checkOut":"2026-12-23","source":"whatsapp"}'

# Booking yang bersinggungan dengan Desember 2026
curl -s "$API/bookings?from=2026-12-01&to=2027-01-01" -H "Authorization: Bearer $TOKEN"

# Formulir daftar (tanpa login)
curl -s -X POST "$API/join" -H "Content-Type: application/json" \
  -d '{"hotelName":"Rumah Meong","city":"Bandung","cages":"10-20","whatsapp":"0812 3456 7890"}'
```

Coba juga yang **harus ditolak**: kirim perintah booking yang sama dua kali untuk kandang dengan kapasitas 1. Jawaban
kedua: status **409** dengan `"code":"double_booking"` (kandang penuh) atau `"pet_already_booked"` (hewan yang sama
sudah punya booking di malam itu). Itu tanda aturan database bekerja.

Data yang dibuat lewat API muncul di aplikasi pada sinkron berikutnya (buka ulang aplikasi atau pindah tab lalu
kembali).

Windows: di **PowerShell** tulis `curl.exe` (bukan `curl`), dan `$env:TOKEN="eyJ..."` untuk menyimpan token, lalu
pakai `$env:TOKEN` di header. Lebih mudah: pakai cara 9d.

### 9d. Tanpa Terminal: dari Console browser

Di tab aplikasi yang sudah login (langkah 9b, Console), tempel:

```js
const token = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")))).access_token;
const api = (path, body) => fetch("/api/" + path, {
  method: body ? "POST" : "GET",
  headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => console.log(r.status, await r.json()));

await api("hotel");
await api("owners", { name: "Sari", whatsapp: "0812 3456 7890" });
await api("owners");
```

## Kalau ada masalah

| Yang terlihat | Artinya | Yang dilakukan |
|---|---|---|
| `PETHOMMIE SUDAH TERPASANG` saat Run `setup.sql` | Database sudah terpasang sebelumnya | Tidak ada yang berubah. Jalankan `verify.sql` untuk memeriksa. |
| `relation "auth.users" does not exist` | SQL dijalankan bukan di project Supabase | Jalankan di **SQL Editor** project Supabase Anda. |
| Error lain saat Run `setup.sql` | Ada yang gagal; tidak ada yang tersimpan (satu transaksi) | Salin pesan error-nya ke developer. Setelah diperbaiki, jalankan lagi. |
| Ada baris **CEK** di pemeriksaan | Sebagian tidak terpasang | Lihat kolom `hasil` (misalnya "kurang: ..."), kirim tangkapan layar ke developer. |
| `/api/health` → `"SUPABASE_URL": false` | Variabel belum terbaca | Cek nama variabel (huruf besar, tanpa spasi), centang Production, lalu **Redeploy**. |
| `/api/health` → `"reason":"anon_key_rejected"` | Kunci salah | Salin ulang anon / publishable key (langkah 4), simpan, Redeploy. |
| `/api/health` → `"reason":"network_error"` | URL salah atau project sedang dijeda | Cek `SUPABASE_URL` (harus `https://<project-ref>.supabase.co`; ada atau tidak ada `/` di akhir sama saja). Project gratis yang lama tidak dipakai bisa **Paused**: buka dashboard → **Restore project**. |
| `/api/...` menampilkan halaman aplikasi (HTML), bukan JSON | Deploy lama, sebelum ada folder `api/` | Pastikan deploy terbaru dari branch yang berisi `web/api/` dan Root Directory = `web`. |
| `401` `missing_token` | Header `Authorization` tidak terkirim | Pastikan ada `-H "Authorization: Bearer $TOKEN"` dan `$TOKEN` terisi (`echo $TOKEN`). |
| `401` `invalid_token` | Token kedaluwarsa (±1 jam) atau salah salin | Ambil token baru (langkah 9b). |
| `404` `no_hotel` | Akun ini belum punya hotel | Selesaikan setup di aplikasi, atau `POST /api/hotel`. |
| `409` `double_booking` | Kandang penuh di malam itu | Benar, aturan bekerja. Pilih kandang atau tanggal lain. |
| `409` `pet_already_booked` | Hewan itu sudah punya booking yang bertabrakan | Benar, aturan bekerja. |
| `409` `unit_archived` | Kandang sudah diarsip | Pilih kandang lain. |
| `422` `invalid` | Isian kurang / salah format | Lihat `fields` di jawaban: setiap isian yang salah dan alasannya. |
| `429` `too_many_requests` di `/api/join` | Terlalu banyak kiriman dari satu alamat | Tunggu beberapa menit. |
| `503` `not_configured` | API belum punya URL / kunci Supabase | Isi variabel di langkah 6, lalu Redeploy. |
| Login Google gagal / kembali ke halaman login | Pengaturan Google atau Redirect URL | Lihat [google-login.md](google-login.md) bagian 2–3. |
| Pendaftaran dari formulir tidak terlihat | Memang tidak bisa dibaca lewat API | Supabase → **Table Editor → join_requests**. |

## Untuk developer

- `backend/supabase/setup.sql` **dibuat otomatis**: `cd web && npm run build:setup-sql` (cek saja:
  `npm run build:setup-sql -- --check`). Jangan diedit langsung; ubah atau tambah migrasi lalu jalankan perintah itu.
- `web/src/app/sync/setup.test.ts` membuktikan di PGlite: file itu terbaru, berisi semua migrasi secara utuh dan
  berurutan, menghasilkan database yang sama persis (tabel, kolom, constraint, index, policy, fungsi, trigger, grant)
  dengan menjalankan migrasi satu per satu, semua pemeriksaan OK (juga dengan default grant Supabase), dan menjalankan
  ulang tidak mengubah apa pun.
- Belum pernah dijalankan di project Supabase sungguhan dari repo ini: langkah 3 di atas adalah pemeriksaan nyata pertama.
