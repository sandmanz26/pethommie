# API Siomofu (`/api/...` di Vercel)

API REST kecil di atas Supabase, untuk hal-hal di luar sinkron aplikasi: alat lain, otomasi, formulir di landing page,
dan untuk mencoba database. Aplikasi sendiri **tidak** memakai API ini; aplikasi menyinkron langsung ke Supabase
(`create_hotel`, `my_hotel`, `pull_changes`, `push_changes`).

Cara memasang dan mencobanya dari nol: [setup-supabase.md](setup-supabase.md).

- Alamat: `https://pethommie-web.vercel.app/api/...` (deploy preview: alamat preview + `/api/...`).
- Kode: `web/api/*.ts` (satu file = satu endpoint), isinya di `web/api/_lib/handlers/`, tes di `web/api/_tests/`.

## Dasar

### Login

Endpoint bertanda **Login: ya** butuh header:

```
Authorization: Bearer <access token Supabase>
```

Access token adalah token sesi Supabase milik orang yang login (Google). Cara mengambilnya dari browser:
[setup-supabase.md, langkah 9b](setup-supabase.md#9b-ambil-access-token-untuk-endpoint-yang-perlu-login). Berlaku ±1 jam.

API memeriksa token ke Supabase, lalu menjalankan setiap query **sebagai orang itu**, dengan kunci publik (anon).
Jadi aturan Row Level Security di database tetap berlaku persis seperti di aplikasi: seseorang hanya bisa melihat dan
mengubah data hotelnya sendiri. Kunci service-role tidak dipakai oleh endpoint mana pun.

"Hotel saya" = hotel tempat akun itu menjadi anggota (pemilik lebih dulu), sama seperti aplikasi.

### Format

- Kirim JSON dengan `Content-Type: application/json` (khusus `/api/join`: formulir HTML biasa juga boleh). Maksimal 32 KB.
- Jawaban selalu JSON, tidak pernah di-cache (`Cache-Control: no-store`).
- Nama field memakai camelCase (`checkIn`, `petId`). Tanggal `YYYY-MM-DD`. Uang dalam rupiah bulat.
- Id adalah UUID. Id baru dibuat oleh server.
- Nomor WhatsApp boleh ditulis `0812 3456 7890`, `+62 812-3456-7890` atau `81234567890`; disimpan sebagai
  `6281234567890`. Selain nomor HP Indonesia ditolak.
- Data yang dihapus di aplikasi (soft delete) tidak ikut ditampilkan.
- Data yang dibuat lewat API ikut tersinkron ke aplikasi pada sinkron berikutnya.

### Error

Semua error berbentuk sama:

```json
{ "error": { "code": "invalid", "message": "Some fields are missing or invalid.", "fields": { "checkOut": "must be after checkIn" } } }
```

`code` tetap (aman untuk dipakai di kode), `message` untuk dibaca orang, `fields` hanya untuk isian yang salah.

| Status | `code` | Artinya |
|---|---|---|
| 400 | `bad_json` | Body bukan JSON / bukan objek |
| 401 | `missing_token` | Tidak ada `Authorization: Bearer ...` |
| 401 | `invalid_token` | Token salah atau kedaluwarsa |
| 403 | `forbidden` | Akun ini tidak boleh melakukannya (RLS) |
| 404 | `no_hotel` | Akun ini belum punya hotel |
| 409 | `hotel_exists` | Akun ini sudah punya hotel |
| 409 | `double_booking` | Unit penuh di sebagian malam itu |
| 409 | `pet_already_booked` | Hewan itu sudah punya booking aktif yang bertabrakan |
| 409 | `unit_archived` | Unit sudah diarsip, tidak menerima booking baru |
| 409 | `conflict` | Data itu sudah ada |
| 413 | `too_large` | Body lebih dari 32 KB |
| 415 | `unsupported_media_type` | Lupa `Content-Type: application/json` |
| 422 | `invalid` | Isian kurang / salah; lihat `fields` |
| 422 | `unknown_reference` | Menunjuk data yang tidak ada di hotel ini |
| 429 | `too_many_requests` | Terlalu sering (`/api/join`); lihat header `Retry-After` (detik) |
| 500 | `internal` | Kesalahan tak terduga (detailnya hanya di Vercel → Logs) |
| 502 | `database_error` | Database tidak bisa menjawab |
| 503 | `not_configured` | `SUPABASE_URL` / `SUPABASE_ANON_KEY` belum diisi di Vercel |

Contoh di bawah memakai:

```bash
export API="https://pethommie-web.vercel.app/api"
export TOKEN="eyJ..."   # access token
```

dan, di Console browser pada tab aplikasi yang sudah login:

```js
const token = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")))).access_token;
const auth = { Authorization: "Bearer " + token };
```

---

## GET /api/health

Login: tidak. Apakah API punya pengaturannya dan bisa menghubungi Supabase. Tidak pernah menampilkan nilai kunci.

- **200** `{"ok":true,"env":{"SUPABASE_URL":true,"SUPABASE_ANON_KEY":true},"supabase":{"reachable":true,"status":200,"ms":120}}`
- **503** `ok:false`, dengan `supabase.reason`: `not_configured`, `anon_key_rejected`, `unexpected_status` atau `network_error`.

```bash
curl -s "$API/health"
```

```js
await fetch("/api/health").then((r) => r.json());
```

## GET /api/hotel

Login: ya. Hotel saya dan peran saya (`owner` / `staff`).

- **200**
  ```json
  { "hotel": { "id": "…", "name": "Rumah Meong", "city": "Bandung", "whatsapp": "6281234567890", "settings": { }, "createdAt": "2026-11-01T02:00:00+00:00" }, "role": "owner" }
  ```
- **404** `no_hotel`

```bash
curl -s "$API/hotel" -H "Authorization: Bearer $TOKEN"
```

```js
await fetch("/api/hotel", { headers: auth }).then((r) => r.json());
```

## POST /api/hotel

Login: ya. Membuat hotel untuk akun ini (lewat fungsi `create_hotel`); pembuatnya menjadi pemilik. Satu hotel per
akun. Biasanya hotel dibuat lewat setup di aplikasi (yang juga mengisi aturan menginap, kandang, dll.); endpoint ini
untuk alat lain dan uji coba.

| Field | Wajib | Aturan |
|---|---|---|
| `name` | ya | teks, maks. 120 |
| `city` | | teks, maks. 80 |
| `whatsapp` | | nomor HP Indonesia |
| `id` | | UUID; kalau kosong dibuat server |

- **201** sama dengan `GET /api/hotel`
- **409** `hotel_exists`, **422** `invalid`, **403** `forbidden` (id itu milik hotel orang lain)

```bash
curl -s -X POST "$API/hotel" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Rumah Meong","city":"Bandung","whatsapp":"0812 3456 7890"}'
```

```js
await fetch("/api/hotel", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Rumah Meong", city: "Bandung" }) }).then((r) => r.json());
```

## GET /api/cages

Login: ya. Unit (kandang / kamar) hotel saya, urut nama; untuk mendapatkan `cageId` saat membuat booking.

- **200** `{"cages":[{"id":"…","name":"A1","size":"M","pricePerNight":75000,"capacity":1,"archived":false}]}`

```bash
curl -s "$API/cages" -H "Authorization: Bearer $TOKEN"
```

## GET /api/owners

Login: ya. Pemilik hewan (pelanggan) hotel saya, urut nama.

- **200** `{"owners":[{"id":"…","name":"Sari","whatsapp":"6281234567890","language":"id","createdAt":"…","updatedAt":"…"}]}`

```bash
curl -s "$API/owners" -H "Authorization: Bearer $TOKEN"
```

```js
await fetch("/api/owners", { headers: auth }).then((r) => r.json());
```

## POST /api/owners

Login: ya. Menambah pemilik hewan.

| Field | Wajib | Aturan |
|---|---|---|
| `name` | ya | teks, maks. 80 |
| `whatsapp` | | nomor HP Indonesia |
| `language` | | `id` (bawaan) atau `en`: bahasa laporan untuk pemilik ini |

- **201** `{"owner":{…}}` (bentuk sama dengan GET)
- **422** `invalid`

```bash
curl -s -X POST "$API/owners" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Sari","whatsapp":"0812 3456 7890"}'
```

```js
await fetch("/api/owners", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Sari", whatsapp: "0812 3456 7890" }) }).then((r) => r.json());
```

## GET /api/pets

Login: ya. Hewan di hotel saya, urut nama. `?ownerId=<uuid>`: hanya milik satu pemilik.

- **200** `{"pets":[{"id":"…","ownerId":"…","name":"Mochi","species":"cat","breed":"","vaccineExpiry":null,"notes":"","createdAt":"…","updatedAt":"…"}]}`
- **422** `ownerId` bukan UUID

```bash
curl -s "$API/pets?ownerId=OWNER_ID" -H "Authorization: Bearer $TOKEN"
```

## POST /api/pets

Login: ya. Menambah hewan untuk salah satu pemilik di hotel saya.

| Field | Wajib | Aturan |
|---|---|---|
| `ownerId` | ya | UUID pemilik di hotel ini |
| `name` | ya | teks, maks. 80 |
| `species` | ya | `cat`, `dog`, `rabbit`, `other` |
| `breed` | | teks, maks. 80 |
| `vaccineExpiry` | | tanggal `YYYY-MM-DD` |
| `notes` | | teks, maks. 1000 |

- **201** `{"pet":{…}}`
- **422** `invalid` (termasuk `fields.ownerId = "is not an owner of your hotel"`)

```bash
curl -s -X POST "$API/pets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ownerId":"OWNER_ID","name":"Mochi","species":"cat","vaccineExpiry":"2027-03-01"}'
```

```js
await fetch("/api/pets", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: "OWNER_ID", name: "Mochi", species: "cat" }) }).then((r) => r.json());
```

## GET /api/bookings

Login: ya. Booking yang **bersinggungan** dengan rentang `[from, to)`: check-in sebelum `to` dan check-out setelah
`from`. Urut tanggal check-in.

| Query | Bawaan | Aturan |
|---|---|---|
| `from` | hari ini (WIB) | `YYYY-MM-DD` |
| `to` | `from` + 31 hari | setelah `from`, maks. 366 hari setelahnya |
| `status` | semua | `booked`, `checked_in`, `checked_out`, `cancelled` |

- **200**
  ```json
  { "from": "2026-12-01", "to": "2027-01-01", "bookings": [
    { "id": "…", "petId": "…", "cageId": "…", "checkIn": "2026-12-20", "checkOut": "2026-12-23", "status": "booked",
      "hold": null, "source": "whatsapp", "rate": 75000, "cancelReason": null, "notes": "", "createdAt": "…", "updatedAt": "…" } ] }
  ```
- **422** `invalid`

```bash
curl -s "$API/bookings?from=2026-12-01&to=2027-01-01" -H "Authorization: Bearer $TOKEN"
```

```js
await fetch("/api/bookings?from=2026-12-01&to=2027-01-01", { headers: auth }).then((r) => r.json());
```

## POST /api/bookings

Login: ya. Membuat booking. Aturannya dijaga oleh database, jadi juga berlaku kalau dua orang memesan di detik yang sama:

- unit tidak pernah menampung lebih banyak booking per malam daripada kapasitasnya → **409** `double_booking`,
- satu hewan hanya di satu tempat pada satu waktu → **409** `pet_already_booked`,
- unit yang diarsip tidak menerima booking baru → **409** `unit_archived`.

Malam dihitung dari check-in sampai **sebelum** check-out (check-out 23 Des = malam 20, 21, 22).

| Field | Wajib | Aturan |
|---|---|---|
| `petId` | ya | UUID hewan di hotel ini |
| `cageId` | ya | UUID unit di hotel ini |
| `checkIn` | ya | `YYYY-MM-DD` |
| `checkOut` | ya | setelah `checkIn`, maks. 366 hari |
| `status` | | `booked` (bawaan) atau `checked_in` |
| `hold` | | `request` (permintaan, belum memegang tempat) atau `deposit` (tempat dipegang, menunggu DP); hanya untuk `booked` |
| `source` | | `walk_in`, `whatsapp`, `instagram`, `link`, `referral`, `other` (bawaan) |
| `rate` | | harga per malam, rupiah bulat; kalau kosong = harga unit saat ini |
| `notes` | | teks, maks. 1000 |

- **201** `{"booking":{…}}` (bentuk sama dengan GET)
- **409** `double_booking` / `pet_already_booked` / `unit_archived`
- **422** `invalid` (termasuk `fields.cageId` / `fields.petId` kalau bukan milik hotel ini)

```bash
curl -s -X POST "$API/bookings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"petId":"PET_ID","cageId":"CAGE_ID","checkIn":"2026-12-20","checkOut":"2026-12-23","source":"whatsapp"}'
```

```js
const res = await fetch("/api/bookings", {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ petId: "PET_ID", cageId: "CAGE_ID", checkIn: "2026-12-20", checkOut: "2026-12-23" }),
});
if (res.status === 409) console.log("Penuh / bentrok:", (await res.json()).error.code);
else console.log(res.status, await res.json());
```

## POST /api/join

Login: tidak. Formulir daftar / waitlist dari landing page. Disimpan di tabel `join_requests`: siapa pun boleh
mengirim, **tidak ada yang bisa membacanya lewat API**. Membacanya: Supabase → **Table Editor → join_requests**.

| Field | Wajib | Aturan |
|---|---|---|
| `hotelName` | ya | teks, maks. 120 |
| `city` | ya | teks, maks. 80 |
| `cages` | ya | teks, maks. 40 (misalnya `10-20`) |
| `whatsapp` | ya | nomor HP Indonesia |
| `locale` | | `id` (bawaan) atau `en` |
| `website` | | **honeypot**: isian yang disembunyikan dari orang (CSS). Bot mengisinya; kalau terisi, jawaban tetap 201 tetapi tidak ada yang disimpan. |

Batas: 5 kiriman per alamat IP per 10 menit (per salinan fungsi yang berjalan; memperlambat bot, bukan jaminan mutlak;
untuk perlindungan lebih kuat tambahkan captcha, misalnya Cloudflare Turnstile).

- **201** `{"ok":true}`
- **422** `invalid`, **429** `too_many_requests`

```bash
curl -s -X POST "$API/join" -H "Content-Type: application/json" \
  -d '{"hotelName":"Rumah Meong","city":"Bandung","cages":"10-20","whatsapp":"0812 3456 7890"}'
```

```js
await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hotelName: "Rumah Meong", city: "Bandung", cages: "10-20", whatsapp: "0812 3456 7890", website: "" }) }).then((r) => r.json());
```

Sebagai formulir HTML biasa:

```html
<form method="post" action="/api/join">
  <input name="hotelName" required> <input name="city" required> <input name="cages" required> <input name="whatsapp" required>
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
  <button>Daftar</button>
</form>
```

(Jawabannya JSON; untuk halaman "terima kasih", kirim dengan `fetch` seperti contoh di atas.)

---

## Untuk developer

- Setiap file `web/api/<nama>.ts` mengekspor `GET` / `POST` dengan bentuk Web standar (`(req: Request) => Promise<Response>`),
  yang dijalankan Vercel di runtime Node.js. File dan folder yang diawali `_` (`_lib`, `_tests`) bukan endpoint.
- Import relatif di `api/` **wajib** berakhiran `.js` (ES modules di Node); `tsconfig.api.json` (NodeNext) menolak yang lupa.
- `web/vercel.json`: rewrite SPA `/((?!api/).*)` tidak menelan `/api/*`; `/api/*` mendapat `Cache-Control: no-store`.
- Error database dipetakan di `api/_lib/db.ts` (kode Postgres → status HTTP). Validasi di `api/_lib/validate.ts`.
- Tes: `npx vitest run api` (client Supabase palsu di `api/_tests/fakeSupabase.ts`). Tidak ada tes terhadap project
  Supabase sungguhan; percobaan nyata pertama adalah langkah 9 di [setup-supabase.md](setup-supabase.md).
- Lokal: `npx vercel dev` di `web/` menjalankan aplikasi dan `/api` bersama (butuh `vercel login` dan `vercel link`);
  `npm run dev` (Vite) **tidak** menjalankan `/api`.
- Tidak ada CORS: API dipanggil dari domain yang sama (aplikasi, landing page) atau dari server/curl.
