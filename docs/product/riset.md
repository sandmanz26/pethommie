# Riset tambahan

Riset ini menjawab pertanyaan perancangan fitur, bukan menilai pasar (itu sudah di `docs/research`). Setiap temuan diberi tingkat keyakinan. Yang tidak bisa dipastikan ditulis sebagai tidak diketahui.

## 1. Apa yang sudah dilakukan pesaing lokal

Sumber: halaman produk PAWSI (`pawsi.id/en`) dan Enimalbiz (`enimalbiz.com`), dibaca 19 Okt 2026. Yang dinilai hanya apa yang **tertulis** di halaman.

| Kemampuan | PAWSI | Enimalbiz |
|---|---|---|
| Kamar/kandang dan tanggal menginap | Ya (suite, nomor kamar, tanggal) | Ya (status terisi/kosong/perlu dibersihkan) |
| DP dan pembayaran sebagian | **Ya**, status tertunda/sebagian/lunas, pembayaran terpisah (tunai + QRIS) | Menyebut tunai, debit, QRIS |
| Pembayaran online | Ya, di paket Pro Plus (Xendit, DOKU) | Tidak disebut |
| Pesan WhatsApp ke pemilik hewan | Tidak disebut | Tidak (WhatsApp hanya kontak demo) |
| Foto dibagikan ke pemilik | Tidak disebut | Tidak disebut |
| Log perawatan harian | Tidak disebut untuk penitipan | Tidak disebut |
| Mode offline | Tidak disebut (berbasis web) | Tidak disebut; "selama terhubung internet" |
| Harga | Rp388.000–888.000 / cabang / bulan | Pro Plus Rp250.000 / outlet / bulan |

**Keyakinan: sedang.** "Tidak disebut" bukan "tidak ada": mereka bisa punya fitur yang tidak tertulis. Yang bisa disimpulkan dengan aman: pembayaran dan DP **bukan pembeda** (PAWSI sudah punya, dan lebih lengkap dengan pembayaran online). Pembeda yang lebih masuk akal: rapor harian ke pemilik, log perawatan, dan kerja tanpa sinyal, karena tidak tertulis di keduanya.

## 2. Isi rapor harian

Sumber: ringkasan pencarian tentang aplikasi rapor penitipan (AppMaster, Kennel Connection, RaftLabs) dan artikel lokal tentang pet hotel (Orami, Detik).

- Pemilik ingin tahu: sudah makan dan minum, kapan obat diberikan, mood, kejadian tidak biasa, cukup main.
- Kennel Connection membagi kartu rapor menjadi perilaku, makan, buang air, dan main, dengan templat yang bisa diubah.
- Pet hotel lokal yang disebut (Savvy Pet Hotel, Nowi) mengirim foto atau video dan "daily report".
- **Dipakai di Pethommie:** delapan jenis catatan (makan, minum, main, BAB/BAK, obat, mood, catatan, kejadian), jawaban satu ketukan untuk yang berulang, dan kejadian selalu dituliskan dengan kata-kata.

**Keyakinan: sedang.** Sumber lokal adalah artikel gaya hidup, bukan standar. Isi rapor sebaiknya divalidasi dengan 5 operator (lihat metrik).

## 3. Syarat penitipan → isi catatan check-in

Sumber: artikel Orami dan Hellosehat tentang pet hotel di Jabodetabek.

- Kucing: usia minimal tiga bulan, sudah vaksin pertama, sehat tanpa flu, batuk, atau mata berair, tidak hamil/menyusui, makanan dibawa sendiri (Arnamir Cat Hotel & Spa).
- Anjing: sehat, bebas kutu, vaksin lengkap (Malibu Pet Hotel).
- Beberapa hanya menerima kucing yang tidak agresif dan terbiasa dititipkan.
- **Tidak ditemukan:** daftar syarat lengkap F3/F4 untuk kucing atau DHPP untuk anjing dari pet hotel Indonesia. Jangan menuliskan daftar vaksin wajib sebagai fakta.
- **Dipakai di Pethommie:** catatan check-in berisi sehat (tanpa flu, batuk, mata berair), bebas kutu/caplak, berat, barang bawaan, makanan dari pemilik, dan catatan bebas. Vaksin sengaja hanya berupa tanggal kedaluwarsa, bukan daftar jenis.

**Keyakinan: sedang untuk isi checklist, rendah untuk syarat vaksin.**

## 4. WhatsApp: cara mengirim tanpa API berbayar

Sumber: dokumentasi pihak ketiga tentang tautan klik-untuk-chat (Dotdigital, Bird, Unipile).

- Format: `https://wa.me/<nomor internasional>?text=<teks ter-encode>`. Teks sebaiknya di-encode dengan `encodeURIComponent` (spasi, baris baru, `&`, emoji). Hindari encode ganda.
- Batas 140 karakter yang disebut Bird berlaku untuk **tautan pendek buatan Meta** (`wa.me/message/<kode>`), bukan jelas untuk tautan `?text=` buatan sendiri. **Tidak ada batas panjang `?text=` yang terdokumentasi** dari sumber yang kami temukan.
- WhatsApp Business API (resmi, otomatis) berbayar per pesan dan butuh penyedia; tidak dipakai di tahap ini.
- **Keputusan:** tautan `wa.me` dari nomor operator sendiri. Gratis, tidak butuh server, operator menekan kirim sendiri. Ada tombol salin teks sebagai cadangan, dan uji memastikan rapor penuh satu hari tetap di bawah 4.000 karakter URL.
- **Tidak diketahui:** batas praktis di semua perangkat. Perlu diuji di beberapa HP Android sungguhan (belum dilakukan).

**Keyakinan: tinggi untuk format, rendah untuk batas panjang.**

## 5. QRIS: statis atau dinamis

Sumber: jurnal dan artikel (JTIIK UB, UKM Indonesia, Era Space).

- QRIS statis: kode tetap, pembeli mengetik nominal sendiri, ada risiko salah ketik. Cocok untuk usaha mikro dan kecil.
- QRIS dinamis: dibuat per transaksi dengan nominal terisi; lebih cocok untuk volume besar.
- Tidak ditemukan sumber tentang konfirmasi manual lewat tangkapan layar atau uang muka.
- **Keputusan:** Pethommie **tidak** memproses pembayaran. Operator mencatat pembayaran yang sudah diterima (tunai, QRIS, transfer), dengan pengingat untuk mengecek aplikasi bank sendiri. Pembayaran online butuh penyedia (Xendit/DOKU) dan akun merchant, dan ditunda.

**Keyakinan: sedang.**

## 6. PWA untuk Android

Sumber: dokumentasi dan panduan vite-plugin-pwa.

- Pra-simpan hanya js, css, html secara bawaan; font, gambar, dan ikon harus ditambahkan lewat `globPatterns`.
- Opsi nama `navigateFallback` dan `navigateFallbackAllowlist` berbeda antar sumber, jadi diverifikasi langsung pada versi yang terpasang (v2.0.0) dan diuji di browser.
- **Terverifikasi di browser sungguhan (Chromium):** setelah satu kunjungan, `/app/calendar` dan `/app/bookings` terbuka saat offline, font termuat, dan service worker hanya mengontrol `/app` (landing tidak tersentuh).
- **Belum diuji:** pemasangan ke layar utama di HP Android, Safari iOS, dan pembaruan versi saat ada tab lama terbuka di perangkat nyata.

**Keyakinan: tinggi di Chromium, belum diketahui di perangkat lain.**

## 7. Yang belum diriset

- Berapa operator yang benar-benar mau membayar, dan berapa. Belum ada wawancara.
- Apakah operator mau memakai aplikasi selama bekerja, atau mencatat nanti di akhir shift.
- Persyaratan perlindungan data pribadi pemilik hewan (nama dan nomor WhatsApp) begitu ada server. Perlu ditinjau sebelum backend dibangun.
