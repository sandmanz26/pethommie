# Metrik dan eksperimen

Belum ada data pengguna nyata. Semua angka di bawah adalah **hipotesis untuk diuji**, bukan hasil.

## Metrik utama

**Hari kerja penuh di aplikasi** (north star): jumlah operator yang dalam satu hari mencatat setidaknya satu check-in, satu entri log, dan satu rapor terkirim. Satu hari dengan ketiganya berarti aplikasi sudah menggantikan buku dan chat.

Metrik pendukung:
| Metrik | Cara menghitung | Mengapa |
|---|---|---|
| Aktivasi | Operator yang menyelesaikan 4 langkah "Mulai di sini" dalam 7 hari | Apakah alurnya terpahami |
| Rapor per menginap | Rapor terkirim ÷ hari menginap | Seberapa sering janji utama dipakai |
| Check-in dengan catatan | Check-in yang punya catatan ÷ semua check-in | Apakah catatan check-in dianggap berguna atau dilewati |
| Check-out dengan sisa tagihan | Peringatan tampil ÷ check-out | Ukuran masalah uang tertinggal |
| Pemakaian kalender untuk booking | Booking dari hari kosong kalender ÷ semua booking | Apakah kalender dipakai untuk bekerja |
| Pemasangan | Operator yang memasang ke layar utama | Seberapa penting offline |

## Pengukuran

Saat ini **tidak ada pelacakan apa pun** (tidak ada server, tidak ada analitik). Menambahkannya harus lewat keputusan terpisah: data apa, persetujuan, dan tempat menyimpannya. Sampai itu ada, pengukuran dilakukan lewat sesi dengan operator dan melihat data yang tersimpan di perangkat mereka bersama mereka.

## Eksperimen pertama (5 operator, 1 minggu)

1. **Rapor.** Operator memakai log dan rapor selama 3 hari penuh. Tanyakan: bagian mana dari rapor yang diubah sebelum dikirim? Apakah pemilik membalas? Hipotesis: operator mengubah kurang dari sepertiga rapor.
2. **Catatan check-in.** Apakah operator mengisi catatan atau memilih "tanpa catatan"? Hipotesis: lebih dari separuh mengisi, bila waktu isi di bawah satu menit.
3. **Offline.** Pasang di HP Android sungguhan di tempat dengan sinyal buruk; catat apa yang gagal. Ini juga menguji hal yang belum diuji (lihat riset §6).
4. **Panjang tautan WhatsApp.** Kirim rapor penuh satu hari dari 3 merek HP berbeda; catat apakah teks terpotong.

Hasil yang memutuskan: bila operator tidak memakai rapor, janji utama landing perlu dipikirkan ulang sebelum membangun link booking.
