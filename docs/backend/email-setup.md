# Pasang email untuk permintaan booking (langkah demi langkah)

Panduan ini untuk pemilik produk, bukan developer. Hasil akhirnya: setiap kali ada yang mengisi formulir di link
booking publikmu, **kamu dapat email** selain pesan WhatsApp yang sudah otomatis terkirim — dan permintaannya juga
muncul di menu **Permintaan** di aplikasi (Siomofu → sidebar → Hotel setup → Permintaan), supaya tidak hilang kalau
HP-mu ganti atau chat-nya ketimbun.

Ini **tambahan**, bukan pengganti: link booking tetap mengirim pesan WhatsApp seperti biasa, berfungsi tanpa langkah
ini sama sekali. Kalau kamu belum siap pasang email, lewati saja panduan ini — tidak ada yang rusak.

Yang kamu perlukan: akun Supabase yang sudah dipasang ([setup-supabase.md](setup-supabase.md)), akses ke project
Vercel **pethommie-web**, dan sebuah **domain** (boleh `siomofu.xyz` yang sudah kamu punya, atau domain lain).
Waktu: sekitar **20–30 menit**, sebagian besar menunggu DNS.

---

## Langkah 1 — Tambahkan migrasi 0008 di Supabase

Ini **satu-satunya** file SQL baru yang perlu kamu tempel — jangan tempel ulang `setup.sql`, migrasi 0001–0007 sudah
terpasang.

1. Di repo, buka **`backend/supabase/migrations/0008_booking_requests_email.sql`**.
   - Di GitHub: buka file → klik **Raw** → **Ctrl+A** (Mac: **Cmd+A**) → **Ctrl+C** (**Cmd+C**).
2. Supabase dashboard → menu kiri → **SQL Editor** → **+ New query**.
3. Tempel isinya, lalu klik **Run** (atau **Ctrl+Enter**).
4. Mungkin muncul peringatan "destructive operation" atau soal RLS — sama seperti saat memasang `setup.sql`
   pertama kali, aman untuk di-**Run** (lihat [setup-supabase.md](setup-supabase.md) langkah 2).

**Cara cek migrasi 0008 berhasil:** SQL Editor → query baru → jalankan:
```sql
select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('booking_requests', 'notification_outbox');
```
Hasilnya harus **2**.

## Langkah 2 — Buat akun Resend dan verifikasi domain

[Resend](https://resend.com) adalah layanan pengirim email yang dipakai Siomofu untuk mengirim notifikasi ini.

1. Buka https://resend.com → **Sign up** (bisa pakai akun Google).
2. Menu kiri → **Domains** → **Add Domain**.
3. Isi nama domainmu (mis. `siomofu.xyz`) lalu **Add**. Resend akan memberi 3–4 baris **DNS record** (tipe
   `MX`, `TXT`, dan `CNAME` — nama persisnya tampil di layar Resend, salin apa adanya).
4. Buka **Vercel** → project `pethommie-web` → **Settings** → **Domains** → klik domainmu → **DNS Records**
   (atau, kalau domainmu didaftarkan lewat penyedia lain, buka panel DNS penyedia itu).
5. Tambahkan setiap baris yang diberi Resend: **Type**, **Name**, **Value** disalin persis dari layar Resend
   ke kolom yang sama di Vercel. Simpan satu per satu.
6. Kembali ke Resend → **Domains** → klik domainmu → **Verify DNS Records**. Bisa butuh beberapa menit sampai
   1 jam untuk DNS menyebar; ulangi **Verify** sampai semua baris bertanda ✅.
7. Menu kiri Resend → **API Keys** → **Create API Key** → beri nama `siomofu-production` → **Full access** cukup
   → **Add**. **Salin kuncinya sekarang** (dimulai `re_...`) — tidak ditampilkan lagi setelah ini.

## Langkah 3 — Ambil Service Role Key dari Supabase

Beda dari kunci "anon" yang sudah kamu pasang: kunci ini bisa melewati semua aturan keamanan, jadi **hanya** dipakai
di satu tempat (pengirim email, di server), **tidak pernah** di browser.

1. Supabase dashboard → **Project Settings** (ikon gerigi) → **API**.
2. Di bagian **Project API keys**, salin yang berlabel **`service_role`** (bukan `anon`/`public`).
3. **Jangan** tempel kunci ini di tempat lain selain langkah 4 di bawah.

## Langkah 4 — Isi Environment Variables di Vercel

Vercel → project **pethommie-web** → **Settings** → **Environment Variables**. Tambahkan lima variabel ini
(centang **Production** untuk semua; centang **Preview** juga kalau mau mencoba di deploy preview):

| Nama | Isi |
|---|---|
| `RESEND_API_KEY` | Kunci dari Langkah 2.7 (`re_...`) |
| `EMAIL_FROM` | `Siomofu <notifikasi@mail.siomofu.xyz>` (ganti domain sesuai punyamu; harus di subdomain yang diverifikasi di Resend, bukan domain polos) |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci dari Langkah 3.2 |
| `EMAIL_DISPATCH_SECRET` | String acak panjang buatanmu sendiri — bukan dari Resend/Supabase. Cara gampang: buka pengelola kata sandi (1Password, Google Password Manager, dll.), buat kata sandi acak 32+ karakter, tempel di sini. Simpan juga untuk Langkah 5. |
| `APP_URL` | `https://siomofu.xyz` (atau `https://pethommie-web.vercel.app` kalau domainmu belum aktif) |

Klik **Save**, lalu buka tab **Deployments** → titik tiga pada deploy teratas → **Redeploy** (env var baru hanya
terbaca setelah redeploy).

## Langkah 5 — (Opsional tapi disarankan) jadwalkan percobaan ulang

Begini cara kerjanya tanpa langkah ini: tiap ada yang mengisi formulir di link booking-mu, Siomofu **langsung**
mencoba mengirim emailnya saat itu juga — jadi di hampir semua kasus kamu tidak perlu langkah ini sama sekali.
Langkah 5 ini hanya jaring pengaman untuk kasus langka: Resend sempat bermasalah sesaat tepat waktu formulir itu
dikirim. Tanpa langkah ini, permintaan itu tetap tersimpan dan tetap muncul di menu **Permintaan** — hanya emailnya
yang tertunda.

Kalau mau tetap pasang jaring pengamannya: perlu sesuatu yang memanggil alamat ini sekali sehari (atau lebih sering):
```
POST https://siomofu.xyz/api/email/dispatch
Header: x-dispatch-secret: <isi EMAIL_DISPATCH_SECRET dari Langkah 4>
```
Cara paling gampang **tanpa install apa pun**: situs gratis seperti https://cron-job.org — daftar, buat "cronjob"
baru, isi URL di atas, pilih method **POST**, tambahkan header `x-dispatch-secret` dengan nilainya, atur jadwal
(mis. tiap jam). *(Vercel juga punya fitur Cron bawaan, tapi tidak bisa mengirim header rahasia seperti ini — maka
disarankan memakai layanan luar seperti di atas.)*

## Langkah 6 — Coba

1. Buka `/app/link` di aplikasi (akun yang sudah login Google, bukan **Coba gratis**) → salin link booking-mu.
2. Buka link itu di tab baru (atau HP lain) → isi formulir → kirim.
3. WhatsApp-mu harus tetap terbuka seperti biasa (tidak berubah).
4. Buka email yang terdaftar di akun Google-mu — **Permintaan booking baru** harus masuk dalam beberapa detik.
5. Buka `/app/requests` di aplikasi — permintaan yang sama harus muncul di daftar, dengan tombol
   **Tandai sudah ditangani** dan **Sembunyikan**.

### Cara cek semua terpasang benar

| Yang dicek | Cara | Hasil yang benar |
|---|---|---|
| Migrasi 0008 terpasang | Query di Langkah 1 | `2` |
| Domain Resend terverifikasi | Resend → Domains → domainmu | Semua baris ✅ |
| Env vars kebaca | Vercel → Deployments → deploy terbaru → Functions → `api/email/dispatch` → buka log, atau coba Langkah 6 | Email masuk |
| Formulir publik tersambung | Langkah 6 | Email + muncul di `/app/requests` |

## Kalau ada masalah

| Yang terlihat | Artinya | Yang dilakukan |
|---|---|---|
| Email tidak masuk, tapi muncul di `/app/requests` | Pengiriman gagal, tapi datanya tetap tersimpan (ini memang desainnya) | Cek domain Resend sudah ✅ semua, cek `RESEND_API_KEY` dan `EMAIL_FROM` di Vercel benar, lalu Redeploy. |
| Formulir publik sukses tapi `/app/requests` kosong | Link booking-mu dibuat **sebelum** kamu login dengan akun Google (link lama hanya kirim WhatsApp) | Buka `/app/link` lagi untuk menyalin link **yang baru**, lalu bagikan ulang. |
| `/app/requests` tidak ada di sidebar | Hotelmu belum tersambung ke server (akun **Coba gratis**, atau belum login Google) | Daftar/login dengan Google (lihat [google-login.md](google-login.md)). |
| Resend menolak domain ("not verified") | DNS belum menyebar atau salah salin | Tunggu lebih lama, cek ulang tiap baris DNS persis seperti yang diberikan Resend (tanpa spasi tambahan). |
| `503 not_configured` saat mencoba kirim | Salah satu dari lima env var di Langkah 4 belum terisi/salah nama | Cek ejaan nama variabelnya persis (huruf besar/kecil berpengaruh), lalu Redeploy. |
| `401 invalid_secret` saat memanggil `/api/email/dispatch` sendiri | Header `x-dispatch-secret` tidak cocok dengan `EMAIL_DISPATCH_SECRET` | Pastikan nilai yang dipakai di Langkah 5 sama persis dengan di Vercel. |
| Banyak email terlihat dobel | Jaring pengaman (Langkah 5) terjadwal terlalu sering, mengirim ulang yang sebenarnya sudah terkirim | Ini seharusnya tidak terjadi (baris yang sudah `sent` tidak dikirim ulang); kalau terjadi, kirim detailnya ke developer. |

## Untuk developer

- Skema: `backend/supabase/migrations/0008_booking_requests_email.sql` — `booking_requests` (anon boleh insert,
  anggota hotel boleh baca/update lewat RLS biasa, tanpa RPC khusus untuk "claim") dan `notification_outbox` (RLS
  menyala tanpa policy sama sekali — hanya service role yang bisa menyentuhnya).
- API: `web/api/_lib/email/{resend,templates,outbox}.ts` (fetch polos ke Resend, tanpa SDK), `web/api/requests.ts`
  (POST publik, rate-limited, honeypot — mengenkripsi+insert lalu langsung mencoba kirim), `web/api/email/dispatch.ts`
  (GET/POST dengan header `x-dispatch-secret`, memproses semua baris `notification_outbox` yang jatuh tempo).
- Backoff percobaan ulang: 1 menit, 10 menit, 1 jam, lalu `status: 'failed'` (menyerah) — lihat `BACKOFF_MINUTES` di
  `outbox.ts`.
- Frontend: `web/src/shared/lib/bookingLink.ts` (`LinkCard.hid`, `postBookingRequest`),
  `web/src/app/pages/RequestsPanel.tsx`, `web/src/app/design-system/organisms/navItems.ts` (`syncedOnly` flag).
- Belum ada: toggle "matikan email ini" di Settings (didesain tanpa toggle dulu — selalu kirim; lihat CLAUDE.md untuk
  status), uji otomatis untuk jalur `RequestsPanel` yang benar-benar tersambung Supabase (baru diuji manual).
