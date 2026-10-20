# Fleksibilitas: apakah satu model data cukup untuk banyak jenis pet hotel?

Diperiksa 20 Okt 2026 terhadap kode versi data 3. Tujuannya jujur: mana yang sudah bisa, mana yang bisa tapi canggung, mana yang belum, dan apa yang dikerjakan lebih dulu.

## Model yang dipakai sekarang

Hotel punya **kandang** (nama bebas, ukuran S/M/L, harga per malam). **Booking** = satu hewan utama di satu kandang untuk rentang tanggal (check-out harus setelah check-in, jadi minimal satu malam), boleh membawa **hewan teman** satu pemilik di kandang yang sama. Biaya = malam × harga kandang + **biaya tambahan** (bebas: grooming, antar-jemput, diskon bernilai negatif). Pembayaran bisa dicicil. **Invoice** adalah salinan tetap. Pemilik punya bahasa (Indonesia/Inggris). Pengaturan usaha dan pajak per hotel.

## Per model usaha

| Model usaha | Status | Catatan |
|---|---|---|
| Rumahan, 3 sampai 10 kandang, kucing dan anjing | **Bisa** | Kasus utama. Mode Sederhana cukup. |
| Hotel menengah, banyak ukuran, banyak pelanggan | **Bisa** | Kalender, pelanggan, pembayaran, laporan, invoice di mode Lengkap. |
| Kucing satu keluarga di satu kandang (2 sampai 3 ekor) | **Bisa (baru)** | Hewan teman di booking; aturan "satu hewan tidak boleh di dua tempat" dijaga di aplikasi dan di database. |
| Layanan tambahan: grooming, antar-jemput, obat, makanan khusus | **Bisa (baru)** | Biaya tambahan bebas dengan saran; tidak ada katalog layanan dengan harga baku. |
| Diskon, promo, harga khusus pelanggan | **Bisa (baru), manual** | Diskon sebagai baris negatif. Belum ada kode promo atau diskon otomatis. |
| Pemilik berbahasa Inggris (ekspat) | **Bisa (baru)** | Bahasa per pemilik: pesan WhatsApp dan invoice. Antarmuka operator tetap mengikuti pilihan operator. |
| Usaha berbadan (CV/PT) atau orang pribadi, pajak berbeda | **Sebagian (baru)** | Pengaturan pajak ada; hitungan hanya PPh final 0,5%. "PPh umum" baru menampilkan omzet saja. Lihat `pajak.md`. |
| Hewan selain kucing, anjing, kelinci | **Canggung** | Pilihan "Lainnya" ada. Tidak ada burung, reptil, hamster, ikan sendiri. Murah ditambah (daftar spesies), tetapi kebutuhan perawatannya (suhu, jenis pakan) tidak dimodelkan. |
| Sebutan "kandang" | **Canggung** | Hotel yang menyebutnya kamar, suite, atau kennel tetap melihat kata "kandang". Bisa lewat satu pengaturan label. |
| Penitipan harian (daycare), per jam, tanpa menginap | **Belum** | Booking minimal satu malam. Perlu jenis layanan "harian" dengan harga per hari dan tanggal masuk sama dengan keluar. |
| Harga musiman (Lebaran, Natal, akhir tahun) | **Belum otomatis** | Harga satu kandang tetap. Sementara dipakai biaya tambahan manual. Perlu tabel harga per rentang tanggal. |
| Paket (10 malam), langganan, kredit | **Belum** | Perlu saldo kredit per pelanggan. |
| Kapasitas bukan kandang (ruang bermain bersama, 15 ekor di satu area) | **Belum** | Model sekarang satu kandang satu booking pada satu waktu (dijaga oleh batasan database). Perlu "unit dengan kapasitas N". |
| Banyak cabang | **Belum** | Satu akun satu hotel. Skema server sudah punya hotel sebagai batas data, jadi cabang = beberapa hotel dalam satu akun, tetapi belum ada pemilihnya. |
| Staf dengan peran (kasir tidak melihat laporan) | **Belum** | Skema server punya keanggotaan hotel dan peran; antarmukanya belum. |
| Antar-jemput dengan jadwal sopir | **Belum** | Hanya sebagai biaya. |
| Layanan dokter hewan, rekam medis | **Di luar cakupan** | Hanya tanggal vaksin dan catatan. Rekam medis punya aturan sendiri. |

## Urutan yang disarankan

1. **Label unit** (kandang / kamar / suite) dan **daftar spesies** yang bisa diatur: kecil, risiko rendah, langsung terasa untuk hotel di luar kasus utama.
2. **Harga musiman**: paling sering ditanyakan operator saat musim libur. Perlu keputusan produk dulu: harga per rentang tanggal untuk semua kandang, atau per kelompok.
3. **Daycare / harian**: jenis layanan dengan aturan tanggal berbeda. Menyentuh bookingRules, invoice (satuan "hari"), dan laporan.
4. **Staf dan cabang**: bersamaan dengan akun asli di server (roadmap K).
5. **Kapasitas**, **paket/kredit**: tunggu sampai ada operator nyata yang meminta.

Jangan membangun 2 sampai 5 sebelum ada satu operator yang membutuhkannya; model sekarang sengaja sederhana. Yang dijaga: setiap fitur baru lewat `domain/` murni dan diuji, dan data lama tidak pernah hilang (migrasi bertingkat dengan cadangan).

## Yang ditanyakan ke operator nyata

- Apakah ada musim ramai dengan harga berbeda? Berapa kali setahun?
- Apakah ada yang menerima penitipan harian tanpa menginap?
- Berapa banyak yang menempatkan lebih dari satu hewan dalam satu kandang, dan apakah dihitung per ekor atau per kandang? (Sekarang per kandang, ekor tambahan sebagai biaya.)
- Apakah kasir dan pemilik berbeda orang?
