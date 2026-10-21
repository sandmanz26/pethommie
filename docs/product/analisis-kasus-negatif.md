# Analisis kasus negatif dan kebutuhan yang belum tertangani

Ditinjau 21 Oktober 2026, dari dua sudut: analis bisnis (apakah angka dan catatan bisa dipercaya) dan pemilik pet hotel (apa yang benar-benar terjadi di meja depan). Setiap temuan dicek di kode, bukan diduga.

## Yang sudah diperbaiki

| # | Kasus | Risiko sebelumnya | Sekarang | Diuji di |
|---|---|---|---|---|
| 1 | Harga unit dinaikkan | Total menginap lama ikut berubah: pemasukan, tagihan, dan pajak masa lalu bergeser | Tarif per malam disimpan di booking (`rate`); pindah unit memakai harga unit baru | `logic.test.ts`, `actions.test.ts`, migrasi v4→v5 |
| 2 | Unit (kandang/kamar) dihapus padahal punya riwayat | Menginap lama kehilangan unitnya, nilainya jadi 0, laporan berubah | Unit dengan riwayat **diarsipkan**, bisa dipulihkan; tidak menerima booking baru dan tidak dihitung sebagai tempat | `actions.test.ts`, `safety.test.tsx`, trigger di 0004 |
| 3 | Anabul dihapus | Semua menginap beserta pembayaran ikut terhapus: pemasukan dan pajak hilang | Anabul yang menginapnya sudah mulai, dibayar, atau punya invoice tidak bisa dihapus; alasannya ditampilkan | `actions.test.ts`, `safety.test.tsx` |
| 4 | Booking dibatalkan padahal sudah ada DP | Tidak ada pilihan: DP tidak bisa dikembalikan (pembayaran ditolak untuk booking batal) | Dialog batal: alasan (pemilik / tidak datang / hotel), DP disimpan sebagai biaya pembatalan, dikembalikan semua, atau sebagian | `actions.test.ts`, `stay.test.tsx` |
| 5 | Booking dibatalkan padahal invoice sudah terbit | Invoice tetap "terbit" dan ikut dihitung di register dan PPN | Invoice otomatis dibatalkan (void) saat booking dibatalkan | `actions.test.ts` |
| 6 | Tamu tidak datang (no-show) | Hanya tercatat "belum datang" selamanya, unit tertahan | Tombol **Tidak datang** di papan Hari ini; alasan tercatat; jumlahnya tampil di Laporan | `stay.test.tsx` |
| 7 | Dijemput lebih awal | Ditagih penuh dan hunian ke depan masih terhitung terisi | Saat check-out: "selesaikan hari ini" (malam disesuaikan) atau "tetap sesuai booking" | `stay.test.tsx`, `actions.test.ts` |
| 8 | Dijemput terlambat | Malam tambahan tidak tertagih | Malam tambahan ditambahkan kalau unit kosong; kalau terisi orang lain, ditolak dengan saran biaya tambahan | sama |
| 9 | Kelebihan bayar | Tidak terlihat | Peringatan "dibayar Rp X lebih", satu ketuk untuk refund | `safety.test.tsx` |
| 10 | Vaksin habis saat check-in | Hanya peringatan, mudah terlewat | Aturan opsional di Pengaturan: check-in menunggu konfirmasi kartu vaksin dilihat, tercatat di catatan check-in | `safety.test.tsx` |
| 11 | Data hanya di satu browser | HP hilang = semua catatan hilang tanpa peringatan | Pengingat unduh cadangan di Hari ini (belum pernah, atau lebih dari 7 hari) | `safety.test.tsx` |
| 12 | Kejadian (muntah, luka) saat menginap | Tersimpan di log tapi tidak terlihat pemilik usaha | Daftar "Kejadian minggu ini" di Dashboard | `safety.test.tsx` |
| 13 | Pengeluaran tidak tercatat | Laporan hanya pemasukan; pemilik tidak tahu untung atau rugi | Modul **Beban** dan laporan **Keuangan** (laba rugi, titik impas) | `finance.test.ts`, `finance.test.tsx` |

## Keuangan yang ditambahkan

- **Beban**: 13 kategori, dibagi *biaya langsung* (pakan, pasir, dokter, grooming: naik-turun mengikuti tamu) dan *biaya operasional* (gaji, sewa, listrik, promosi, perbaikan, peralatan, biaya bank, dll.). Biaya rutin (sewa, gaji) bisa ditandai dan disalin ke bulan berikutnya dengan satu ketuk.
- **Laporan keuangan**:
  - Pendapatan bisa dihitung dua cara: *uang yang diterima*, atau *menginap yang selesai* (penitipan, layanan tambahan, diskon, DP yang tersimpan dari pembatalan).
  - Isinya: laba kotor, laba bersih, margin, dan sisa setelah perkiraan PPh final.
  - Ada grafik pendapatan vs pengeluaran per bulan dan grafik laba/rugi per bulan.
  - Juga ditampilkan rincian ke mana uangnya pergi, serta pendapatan dan biaya per malam terjual.
  - **Titik impas** dihitung sebagai jumlah malam-tempat per bulan yang menutup semua biaya, beserta setara hunian berapa persen.
  - Bisa diekspor ke CSV, dicetak, atau disimpan sebagai PDF.
- Bulan yang masih berjalan tidak dibandingkan dengan bulan penuh, karena perbandingannya akan menyesatkan.

## Yang masih belum tertangani (dicatat jujur)

| Kasus | Dampak | Kenapa belum |
|---|---|---|
| Beberapa staf / beberapa HP | Shift malam dan pagi tidak bisa memakai data yang sama | Perlu akun di server dan sinkronisasi (skema sudah siap, belum tersambung) |
| DP atau pembayaran online lewat link booking | Pemilik masih transfer manual | Perlu server dan payment gateway |
| Saldo/kredit pemilik | Kelebihan bayar hanya diberi tahu, belum bisa dipakai otomatis untuk menginap berikutnya | Perlu konsep saldo per pemilik |
| Campur kucing dan anjing di ruang bersama | Aplikasi tidak melarang anjing masuk ruang kucing | Perlu aturan jenis hewan per ruang |
| Jadwal obat per anabul | Obat dicatat setelah diberikan, belum ada pengingat jam minum obat | Perlu jadwal dan notifikasi |
| Orang yang boleh menjemput, kontak darurat, dokter langganan | Hanya bisa ditulis di catatan bebas | Perlu kolom khusus di profil |
| Harga musim ramai (Lebaran, Natal) | Kenaikan harga harus lewat biaya tambahan manual | Perlu aturan harga per tanggal |
| Daftar tunggu saat penuh | Permintaan saat penuh tidak tersimpan | Perlu antrean per tanggal |
| Penitipan per jam (daycare harian) | Hanya per malam | Model harga berbeda |
| Penyusutan peralatan | Beli kandang dicatat sebagai beban sekaligus di bulan itu | Disengaja agar sederhana; akuntan bisa menyesuaikan |
