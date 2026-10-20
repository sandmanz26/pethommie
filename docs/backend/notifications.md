# Rencana notifikasi: email dan notifikasi browser

Status: **rencana, belum dibuat.** Keduanya butuh server (lihat `README.md`). Tidak ada yang di sini yang berjalan di aplikasi hari ini, dan landing/Bantuan tidak boleh menjanjikannya sampai ada.

## 0. Prinsip

- **WhatsApp tetap saluran utama ke pemilik hewan.** Email dan push adalah pelengkap: email untuk yang tidak memakai WhatsApp, untuk dokumen (invoice), dan untuk operator; push untuk operator yang sedang jauh dari layar.
- Sebuah notifikasi hanya dikirim jika **ada yang bisa dilakukan penerimanya** ("3 hewan check-out hari ini, 1 belum lunas"), bukan untuk menarik pengguna kembali.
- Semua pengiriman lewat satu **antrean di database**, bukan dipanggil langsung dari layar. Satu tempat untuk percobaan ulang, pembatasan, dan jejak audit.
- Isi dua bahasa, mengikuti bahasa penerima (`owner.language` untuk pemilik hewan, bahasa akun untuk operator).

## 1. Kejadian yang memicu notifikasi

| Kejadian | Penerima | Email | Push | Catatan |
|---|---|---|---|---|
| Verifikasi email, atur ulang kata sandi, undangan staf | Pengguna | **Ya** | - | Disediakan Supabase Auth; hanya perlu SMTP sendiri. |
| Permintaan booking baru dari link publik | Operator | Ya | Ya | Bergantung pada roadmap I. |
| Booking dikonfirmasi / ditolak | Pemilik hewan | Ya (jika punya email) | - | |
| Pengingat check-in besok / check-out hari ini | Operator | - | Ya | Ringkasan pagi, satu notifikasi. |
| Sisa tagihan saat hewan sudah pulang | Operator | - | Ya | Dari data pembayaran yang sama dengan halaman Tagihan. |
| Invoice diterbitkan | Pemilik hewan | Ya (tautan, bukan lampiran besar) | - | Tautan ke halaman invoice yang bisa dicetak; PDF menyusul. |
| Vaksin akan kedaluwarsa | Operator (dan pemilik: ditunda) | Opsional | Ya | 30 hari sebelum, hanya untuk hewan yang akan datang. |
| Log perawatan belum diisi sore hari | Operator | - | Ya | Jam dapat diatur. |
| Ringkasan invoice bulanan siap | Operator | Ya | - | Tanggal 1, berisi jumlah, DPP, PPN, total, dan tautan ekspor. |
| Pengingat setor PPh final | Operator | Ya | Ya | Hanya jika pajak diatur ke PPh final; tanggal 10 dan 14 untuk tenggat tanggal 15 (dicek ulang ke Coretax; lihat `pajak.md`). |
| Omzet mendekati Rp4,8 miliar | Operator | Ya | - | Sekali per ambang (80%, 100%). |

Tidak ada pemasaran lewat saluran ini. Email non-transaksi (ringkasan) bisa dimatikan satu per satu dan punya tautan berhenti berlangganan.

## 2. Email

**Penyedia.** Yang dicari: pengiriman transaksional, DKIM/SPF/DMARC dengan domain sendiri, webhook untuk bounce dan komplain, harga masuk akal pada volume kecil. Kandidat yang akan dibandingkan sebelum memilih (harga dan batas gratis belum diperiksa; periksa di situs masing-masing): Resend, Postmark, Brevo, Amazon SES. Supabase Auth dihubungkan ke SMTP yang sama supaya email verifikasi tidak datang dari alamat bersama dengan batas rendah.

**Domain.** Kirim dari subdomain khusus (mis. `mail.<domain>`) dengan SPF, DKIM, dan DMARC `p=none` lalu naik ke `quarantine` setelah laporan bersih. Alamat balas: kotak yang dibaca orang. Butuh keputusan pemilik produk: domain yang akan dipakai (saat ini baru `pethommie-web.vercel.app`).

**Alur.**
1. Aksi di aplikasi menulis baris ke `notification_outbox` (jenis, penerima, bahasa, data JSON, `dedupe_key`, `send_after`, status).
2. Fungsi terjadwal (Edge Function dipicu `pg_cron`, tiap menit) mengambil baris `pending` dengan `for update skip locked`, membuat isi dari templat, mengirim, dan menandai `sent` atau `failed` dengan jumlah percobaan. Percobaan ulang bertahap (1 menit, 10 menit, 1 jam, lalu menyerah).
3. `dedupe_key` unik (mis. `invoice:<id>`, `daily:<hotel>:<tanggal>`) agar kejadian yang terulang tidak mengirim dua kali.
4. Webhook penyedia mencatat bounce dan komplain; alamat yang memantul keras ditandai dan tidak dikirimi lagi.

**Templat.** Dibuat sebagai fungsi murni `(data, bahasa) → {subjek, teks, html}` di `domain/`, diuji seperti pesan WhatsApp (`messages.ts`), dengan versi teks polos selalu ada. Tidak ada gambar yang dimuat dari luar; tautan menuju domain sendiri.

**Privasi.** Data minimal di isi email (nama hewan, tanggal, jumlah). Jangan menaruh data kesehatan di subjek. Pemilik hewan yang emailnya dimasukkan operator: operator yang menjamin izinnya; ada tautan berhenti di setiap email non-vital. Ini perlu masuk ke Kebijakan Privasi dan ditinjau ahli hukum (lihat keputusan terbuka di `README.md`).

## 3. Notifikasi browser (Web Push)

**Yang tidak bisa dilakukan tanpa server.** Browser tidak punya cara andal menjadwalkan notifikasi lokal saat aplikasi tertutup (usulan "notification triggers" tidak diteruskan). Jadi yang ada tanpa server hanya notifikasi saat aplikasi terbuka, yang nilainya kecil. Pengingat yang berguna (pagi hari, sore hari) harus dikirim server lewat **Web Push** dengan kunci VAPID ke service worker yang sudah dimiliki PWA (`/app`).

**Dukungan.** Chrome dan Edge di Android dan desktop: ya. Safari/iOS: hanya jika aplikasi dipasang ke layar utama (iOS 16.4 ke atas); tidak bisa dari tab Safari biasa. Karena itu layar pengaturan harus menjelaskan langkah "Tambahkan ke layar utama" untuk pengguna iPhone, dan **belum pernah dicoba di perangkat nyata**: uji di Android dan iPhone sebelum mengumumkan.

**Alur izin.**
1. Pengaturan > Notifikasi, tombol "Nyalakan notifikasi di perangkat ini". Izin diminta **hanya setelah ketukan pengguna**, tidak saat aplikasi dibuka.
2. Jika ditolak, tampilkan cara membukanya kembali di pengaturan browser; jangan meminta lagi.
3. Langganan (`endpoint`, kunci) disimpan di `push_subscriptions` per pengguna dan perangkat. Satu pengguna bisa punya beberapa perangkat; mematikan di satu perangkat menghapus langganannya.
4. Pengaturan per pengguna: jenis yang diinginkan, jam tenang, jam ringkasan pagi, dan **sembunyikan nama hewan di layar kunci** (isi umum seperti "3 check-out hari ini").

**Pengiriman.** Pekerja yang sama dengan email membaca `notification_outbox` untuk kanal `push`, mengirim dengan pustaka `web-push` dari Edge Function. Respons 404/410 berarti langganan mati dan dihapus. `tag` memakai `dedupe_key` supaya notifikasi baru mengganti yang lama. Klik membuka halaman yang relevan (mis. `/app/payments`). Zona waktu per hotel (WIB, WITA, WIT) menentukan jam kirim; ini perlu kolom `timezone` di hotel.

**Perubahan di klien (nanti).** Service worker saat ini hanya melayani offline (generateSW). Menambah handler `push` dan `notificationclick` berarti pindah ke `injectManifest` dengan service worker sendiri. Itu perubahan yang harus diuji ulang (lingkup `/app`, pembaruan, e2e offline).

## 4. Skema tambahan (rencana, migrasi `0003`)

```
notification_prefs   (user_id, hotel_id, kind, email bool, push bool, quiet_from, quiet_to, morning_at)
push_subscriptions   (id, user_id, endpoint unique, p256dh, auth, user_agent, created_at, last_ok_at)
notification_outbox  (id, hotel_id, kind, channel 'email'|'push', to_user_id null, to_address null,
                      language, payload jsonb, dedupe_key unique, send_after, status, attempts, last_error, sent_at)
hotels.timezone      text default 'Asia/Jakarta'
```
RLS: pengguna hanya membaca/menulis langganan dan preferensi miliknya; `notification_outbox` hanya ditulis oleh fungsi server (peran layanan) dan dibaca anggota hotel untuk jejak audit. Diuji dengan PGlite seperti migrasi lain.

## 5. Urutan pengerjaan

1. Setelah akun server (roadmap K): SMTP untuk Supabase Auth + email verifikasi dan atur ulang kata sandi.
2. Tabel antrean dan pekerja email; email invoice dan ringkasan bulanan (data sudah ada di v3).
3. Preferensi dan Pengaturan > Notifikasi.
4. Web Push: service worker `injectManifest`, langganan, ringkasan pagi, tagihan tertunda, pengingat pajak. Uji di perangkat nyata.
5. Pengingat vaksin ke pemilik hewan (butuh persetujuan jelas dari pemilik).

## 6. Keputusan yang dibutuhkan

- Domain dan alamat pengirim email.
- Penyedia email (setelah harga dibandingkan pada volume nyata).
- Apakah email ke pemilik hewan ditawarkan di versi pertama, atau hanya ke operator.
- Jam bawaan ringkasan pagi dan sore.
