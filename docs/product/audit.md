# Audit produk

Tanggal: 19 Okt 2026. Cakupan: landing page, aplikasi operator di `/app`, kode, dan uji.

## 1. Janji vs. kenyataan

Landing page berjanji beberapa hal. Tabel ini mencatat mana yang benar-benar bisa dilakukan operator hari ini.

| Janji di landing | Sebelum audit | Sekarang | Catatan |
|---|---|---|---|
| Kalender kandang | ◐ hanya papan hari ini dan ubin kandang | ✅ kalender 14 hari, hari kosong bisa diketuk untuk booking | Slot terisi tidak bisa dobel (aturan di domain, bukan hanya di form) |
| Link booking dengan DP QRIS | ✗ | ✗ → ditandai **Segera hadir** di landing | Butuh backend dan halaman publik. Lihat roadmap |
| Cek vaksin | ◐ | ◐ tanggal vaksin ditandai di papan dan saat booking | Unggah foto kartu vaksin oleh pemilik belum ada (butuh penyimpanan file). Teks landing diubah agar tidak menjanjikan "otomatis" |
| Log harian dan insiden | ✗ | ✅ 8 jenis catatan, jawaban satu ketukan, jam bisa diubah, insiden ditandai | |
| Rapor ke WhatsApp pemilik | ✗ | ✅ lewat tautan `wa.me` dari nomor operator sendiri | Tidak otomatis dan tidak bisa melampirkan foto (batasan tautan). Operator menekan kirim sendiri |
| Tetap jalan saat sinyal hilang | ✗ | ✅ bisa dipasang di HP dan dibuka tanpa sinyal setelah kunjungan pertama | Data tersimpan di HP itu saja; "tersinkron saat sinyal kembali" **tidak** benar karena belum ada server. Teks landing sudah dikoreksi |
| Paket Lebaran | ✗ | ✗ | Bagian ini adalah penawaran, bukan fitur. Isinya bergantung pada link booking |

Narasi film di landing (bab-bab bergulir) masih menyebut link booking dan tagihan QRIS. Itu keputusan pemilik produk: tetap sebagai visi, atau diubah mengikuti kenyataan.

## 2. Celah yang ditemukan di aplikasi

1. Booking tidak bisa dibuka atau diubah setelah dibuat. → Halaman booking, ubah tanggal dan kandang.
2. DP hanya satu angka; tidak ada pelunasan atau riwayat bayar. → Daftar pembayaran, status Belum bayar / Sebagian / Lunas.
3. Check-out mengabaikan sisa tagihan. → Peringatan sebelum check-out kalau masih ada sisa.
4. Check-in hanya mengganti status; tidak ada catatan kondisi saat tiba (bukti kalau ada sengketa). → Catatan check-in.
5. Tidak ada catatan selama menginap, jadi tidak ada bahan untuk rapor. → Log harian.
6. Operator mengetik pesan WhatsApp yang sama berulang. → Pesan siap pakai: konfirmasi, kedatangan, penjemputan, pengingat vaksin.
7. Pengguna baru tidak tahu harus mulai dari mana setelah onboarding. → Daftar "Mulai di sini" 4 langkah di Hari Ini.

## 3. Aksesibilitas (axe-core, WCAG 2 A/AA + best practice)

Dipindai di desktop dan HP, setiap layar operator, login, daftar, dan landing.

Temuan dan perbaikan:
- Kontras teks pudar tidak cukup → `--ink-faint` digelapkan.
- Tautan merek di bilah atas tanpa nama yang sesuai → nama terlihat disamakan dengan label.
- Pengalih film bukan landmark → dibungkus `<aside aria-label>`.

Setelah perbaikan dan setelah fitur baru: **0 pelanggaran** di semua layar, di desktop (EN) dan HP (ID), dan tidak ada gulir horizontal. Pemindaian ini sekarang menjadi uji end-to-end di CI (`web/e2e/product.e2e.ts`), jadi tidak hanya sekali jalan.

## 4. Risiko yang masih terbuka

- **Data hanya di satu browser.** Membersihkan data situs menghapus semuanya; dua tab bisa saling menimpa. Ada ekspor JSON di Pengaturan, tetapi operator harus ingat melakukannya. Ini risiko terbesar untuk dipercaya sebagai alat bisnis.
- **Akun masih tiruan.** Tidak ada server, jadi tidak ada reset sandi atau multi-perangkat.
- **Waitlist dari landing tidak terlihat oleh pemilik produk** (disimpan di browser pengunjung).
- Lihat juga `docs/ARCHITECTURE.md` bagian "Known gaps".
