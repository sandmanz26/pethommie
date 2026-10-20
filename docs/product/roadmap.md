# Prioritas dan roadmap

## Cara memprioritaskan

Dua pertanyaan: (1) apakah operator bisa menjalankan satu hari kerja di aplikasi ini tanpa kembali ke buku dan chat? (2) apakah ini membuat pemilik hewan merasa tenang, yang membuat mereka booking lagi? Fitur yang menjawab keduanya dan tidak butuh server dikerjakan dulu.

| # | Epik | Dampak | Usaha | Butuh server | Status |
|---|---|---|---|---|---|
| A | Halaman booking: lihat, ubah tanggal/kandang, batalkan | Tinggi | Rendah | Tidak | ✅ |
| B | Pembayaran: DP, pelunasan, status, peringatan saat check-out | Tinggi | Rendah | Tidak | ✅ |
| C | Catatan check-in | Sedang | Rendah | Tidak | ✅ |
| D | Log perawatan harian | Tinggi | Sedang | Tidak | ✅ |
| E | Rapor dan pesan WhatsApp | Tinggi | Sedang | Tidak | ✅ |
| F | Kalender kandang | Tinggi | Sedang | Tidak | ✅ |
| G | Offline (PWA) | Tinggi untuk Android dan sinyal buruk | Sedang | Tidak | ✅ |
| H | Daftar "Mulai di sini" untuk pengguna baru | Sedang | Rendah | Tidak | ✅ |
| H2 | Mode Sederhana / Lengkap | Tinggi (operator sibuk vs yang ingin kontrol) | Sedang | Tidak | ✅ |
| H3 | Halaman Pelanggan, Tagihan, Laporan, Bantuan; pulihkan cadangan | Tinggi | Sedang | Tidak | ✅ |
| H4 | Landing lebih meyakinkan: tur produk dengan layar asli, FAQ, legal, footer | Tinggi | Sedang | Tidak | ✅ |
| H5 | Persiapan backend: skema, pemetaan, sinkron, server tiruan, rencana | Tinggi | Sedang | Tidak | ✅ (belum tersambung) |
| I | Link booking publik dengan DP | Tinggi (janji utama landing) | Tinggi | **Ya** | Berikutnya |
| J | Foto di rapor dan kartu vaksin | Tinggi | Sedang | **Ya** (penyimpanan file) | Setelah I |
| K | Akun asli, banyak perangkat, staf | Tinggi | Tinggi | **Ya** | Bersama I |
| L | Pembayaran online (Xendit/DOKU) | Sedang | Tinggi | **Ya** | Setelah K |
| M | Pesan WhatsApp otomatis (API resmi) | Sedang | Tinggi | **Ya** | Ditunda |

### Mengapa I, J, K ditunda

Semuanya butuh server: halaman publik yang dibuka pemilik hewan, penyimpanan foto, dan akun. Mengerjakannya setengah-setengah di browser akan menghasilkan fitur yang terlihat bekerja tetapi tidak bisa dipercaya (mis. link booking yang hanya hidup di satu HP). Keputusan arsitektur ada di `docs/ARCHITECTURE.md` bagian 3. Sampai saat itu, landing menandai link booking sebagai **Segera hadir**.

### Mengapa pembayaran online (L) tidak dulu

PAWSI sudah punya pembayaran online di paket tertingginya, jadi ini bukan pembeda. Yang menjadi pembeda adalah rapor dan kerja tanpa sinyal. Pencatatan pembayaran manual sudah menutup kebutuhan sehari-hari.

## Kriteria penerimaan (dan di mana diuji)

**A. Halaman booking**
- Dari Hari Ini, daftar booking, dan kalender, nama hewan membuka halaman booking. *(stay.test, kalender)*
- Ubah kandang atau tanggal hanya ke kandang kosong; menolak tabrakan dengan alasan; tanggal masuk terkunci setelah check-in; booking selesai/batal tidak bisa diubah. *(bookingRules.test, actions.test, stay.test)*

**B. Pembayaran**
- Mencatat jumlah bulat > 0; menolak 0, negatif, desimal, NaN. *(payments.test, actions.test)*
- Status Belum bayar / Sebagian / Lunas dan sisa tagihan benar; tombol "Isi sesuai sisa". *(payments.test, stay.test)*
- Check-out dengan sisa tagihan meminta konfirmasi, baik dari halaman booking maupun daftar; lunas langsung keluar. *(stay.test)*
- Deposit lama (v1) tidak hilang: berubah menjadi satu pembayaran. *(storage.test)*

**C. Catatan check-in**
- Berat salah ketik ditolak; bisa lewati catatan; catatan tampil setelahnya; hanya booking berstatus "dipesan" yang bisa check-in. *(stay.test, actions.test)*

**D. Log harian**
- Satu ketukan untuk makan/minum/main/BAB/mood; obat, catatan, kejadian wajib ada kata; hanya hewan yang sedang menginap; hari lalu hanya bisa dibaca. *(careLog.test, stay.test)*

**E. Rapor dan pesan**
- Rapor memakai nama depan pemilik, jam, dan selalu berbahasa Indonesia; kejadian tidak ditutup dengan "semua aman". *(messages.test)*
- Tautan membuka nomor pemilik dengan teks terisi, `target=_blank` dan `noopener`; teks yang diedit operator yang terkirim; menekan kirim menandai rapor terkirim hari itu. *(stay.test, e2e)*
- Tanpa nomor: ada peringatan, operator memilih kontak sendiri di WhatsApp. *(stay.test)*

**F. Kalender**
- Bar menutupi malam yang benar, terpotong di tepi jendela; hari kosong membuka booking baru dengan kandang dan tanggal terisi; malam terisi tidak punya tautan booking. *(calendar.test, stay.test, e2e)*

**G. Offline**
- Setelah satu kunjungan, `/app/*` terbuka tanpa jaringan, landing tidak dikontrol service worker, versi baru ditawarkan lewat spanduk (tidak memuat ulang paksa saat ada isian). *(e2e)*

## Yang sengaja tidak dibuat

- **Pembayaran yang dikonfirmasi sistem.** Tidak ada koneksi ke bank; layar mengatakannya terus terang.
- **Pesan WhatsApp otomatis.** Tidak ada API berbayar; semua lewat tombol kirim operator.
- **Foto di rapor.** Tautan `wa.me` tidak bisa melampirkan; operator menambahkan foto di WhatsApp. Foto di dalam aplikasi menunggu penyimpanan.
- **Sinkron antar HP.** Satu hotel = satu browser sampai ada backend.

## Mode Sederhana dan Lengkap

Dua kebiasaan hidup berdampingan di operator: yang sibuk dan ingin sesedikit mungkin isian, dan yang ingin gambaran utuh. Daripada memilih salah satu, ada dua mode. Mode hanya mengubah **apa yang ditampilkan**, bukan data atau aturan, jadi boleh ganti kapan saja. Dipilih per akun; awalnya Sederhana.

| | Sederhana | Lengkap |
|---|---|---|
| Menu | Hari ini, Booking, Kalender, Anabul, Kandang, Pengaturan, Bantuan | + Pelanggan, Tagihan, Laporan |
| Check-in | dua centang dan berat | catatan lengkap: bawaan, makanan, catatan, atau lewati |
| Pembayaran | satu ketukan "Tandai lunas" | jumlah sebagian, catatan |
| Log harian | ketukan saja; kata-kata hanya untuk catatan/obat/kejadian | + jam bisa diubah, keterangan |
| Pesan WhatsApp | hanya rapor | + konfirmasi, kedatangan, penjemputan, vaksin |
| Booking baru | tanpa filter ukuran | dengan filter ukuran |

Kriteria penerimaan (diuji): mode awal Sederhana; menu sesuai mode; pilihan tersimpan per akun; bilah tab HP berisi empat halaman harian + Lainnya; check-in sederhana tetap menyimpan catatan yang diminta; "Tandai lunas" mencatat seluruh sisa; log harian sederhana tidak menampilkan jam/keterangan kecuali perlu; rapor tetap ada. *(modes.test.tsx, e2e)*

Yang belum diketahui: berapa banyak operator yang akan pindah ke mode Lengkap, dan fitur mana yang memicunya. Ini masuk eksperimen pertama di `metrik.md`.
