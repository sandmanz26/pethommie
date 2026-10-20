# Pajak: yang dibutuhkan operator, dan apa yang dibuat Pethommie

Tanggal riset: 20 Okt 2026. **Ini bukan nasihat pajak.** Aturan berubah (PP 20/2026 terbit 22 April 2026), dan status pajak tiap usaha berbeda. Fitur di Pethommie menghasilkan **perkiraan dan bahan untuk akuntan atau konsultan pajak**, bukan pelaporan. Layar pajak menampilkan peringatan ini dan tanggal aturan yang dipakai.

## 1. Yang kami pastikan dari sumber

| Hal | Isi | Sumber | Keyakinan |
|---|---|---|---|
| PPh final UMKM | Tarif **0,5%** dari omzet (peredaran bruto), untuk omzet sampai **Rp4,8 miliar** per tahun | [pajak.go.id](https://www.pajak.go.id/en/node/119950), [DDTC](https://news.ddtc.co.id/berita/nasional/1820074/memahami-pph-final-umkm-pasca-terbit-pp-202026) | tinggi |
| PP 20/2026 | Mengubah PP 55/2022 (berlaku 22 April 2026). Orang pribadi dan PT perorangan memakai 0,5% **tanpa batas waktu**; koperasi maksimal 4 tahun; CV, firma, dan PT lain mengikuti masa transisi | [pajak.go.id](https://www.pajak.go.id/en/node/119950), [DDTC](https://news.ddtc.co.id/berita/nasional/1820074/memahami-pph-final-umkm-pasca-terbit-pp-202026), [PKN STAN Tax Center](https://taxcenterpknstan.com/pp-20-2026/) | sedang: sumber sedikit berbeda soal CV/firma |
| Bagian omzet bebas pajak | **Rp500 juta** pertama per tahun tidak dikenai PPh, **hanya untuk orang pribadi** | [DDTC](https://news.ddtc.co.id/berita/nasional/1819765/ada-pp-baru-omzet-hingga-rp500-juta-bebas-pajak-masih-berlaku), [Pajakku](https://pajakku.com/artikel/aturan-pajak-umkm-yang-masih-berlaku-dalam-pp-202026) | tinggi |
| Cara hitung bulanan | Omzet **kumulatif** sejak Januari dikurangi Rp500 juta; hanya bagian di atasnya dikali 0,5% pada bulan itu. Contoh sumber: kumulatif Rp540 juta pada September, kena pajak Rp40 juta, PPh Rp200.000 | [Pajakku](https://pajakku.com/artikel/pph-final-05-untuk-umkm-wp-pribadi-diperpanjang-hingga-2029) dan hasil pencarian terkait | sedang: satu rumusan dari artikel, bukan teks peraturan |
| Setor | Per masa pajak lewat Coretax, KAP 411128 dan KJS 420, paling lambat **tanggal 15 bulan berikutnya** | [DDTC](https://news.ddtc.co.id/berita/nasional/1811337/pph-final-umkm-05-disetor-per-masa-pajak-kode-billing-lewat-coretax), [Ortax](https://ortax.org/membuat-kode-billing-pph-final-umkm-di-coretax) | sedang |
| Lapor | Dengan menyetor PPh UMKM, SPT Masa dianggap sudah dilaporkan (PMK 81/2024 pasal 171 ayat 4). **SPT Tahunan tetap wajib** | hasil pencarian | rendah-sedang: satu sumber |
| PPN | Hanya untuk **PKP**. Tarif 12% dikali DPP nilai lain 11/12, jadi **efektif 11%**; faktur memakai kode 04 di Coretax | [DDTC](https://news.ddtc.co.id/berita/nasional/1808011/ppn-12-dihitung-dengan-dpp-1112-faktur-pajaknya-sudah-via-coretax), [Ortax](https://ortax.org/membuat-faktur-pajak-dpp-nilai-lain-pada-aplikasi-coretax) | sedang |
| Kewajiban PKP | Omzet di atas Rp4,8 miliar wajib dikukuhkan sebagai PKP **jika** barang/jasanya kena PPN | [pajak.go.id](https://pajak.go.id/id/artikel/cermati-3-hal-ini-saat-omzet-lebihi-rp48-miliar) | sedang |

## 2. Yang **tidak** kami ketahui

- **Apakah jasa penitipan hewan (pet hotel) dan grooming adalah jasa kena PPN.** Tidak ditemukan sumber. Jasa dokter hewan dibebaskan, tetapi itu bukan penitipan. Jangan berasumsi dari analogi hotel manusia (itu pajak daerah). Tanyakan ke KPP atau konsultan, lihat KLU usaha. Karena itu PPN di Pethommie **mati secara bawaan** dan hanya dinyalakan operator yang sudah PKP.
- Dasar pengakuan omzet: **kas** (uang diterima) atau **akrual** (jasa diserahkan). Sumber menyebut "peredaran bruto" tanpa menjelaskan. Pethommie menampilkan **keduanya** berdampingan dan memakai yang dipilih operator untuk perkiraan.
- Tenggat dan tata cara bisa berubah dengan peraturan turunan PP 20/2026. Tanggal 15 dan kode billing di atas harus dicek di DJP/Coretax sebelum menyetor.
- Perlakuan untuk CV, firma, dan PT biasa selama masa transisi, serta penggabungan omzet pasangan/keluarga (PP 20/2026 memperketat). Pethommie tidak menghitung ini; operator jenis ini dipilih sebagai "lainnya" dan mendapat ringkasan omzet saja.

## 3. Yang dibuat

**Pengaturan usaha dan pajak** (Pengaturan): nama usaha, alamat, NPWP, awalan nomor invoice, petunjuk pembayaran, bahasa invoice; jenis wajib pajak (orang pribadi / lainnya), rezim (belum diatur / PPh final UMKM 0,5% / PPh umum), dasar omzet (kas / akrual), status PKP, tarif PPN efektif (bawaan 11), harga sudah termasuk pajak atau belum.

**Invoice:** nomor berurutan per tahun (INV-2026-0001), tidak pernah dipakai ulang; invoice yang diterbitkan adalah **salinan tetap** (baris, total, pajak, data penjual dan pelanggan). Salah ketik diperbaiki dengan **membatalkan** (nomornya tetap tercatat) lalu menerbitkan ulang. Dua bahasa, bisa dicetak atau disimpan sebagai PDF lewat cetak browser.

**Daftar invoice bulanan:** semua invoice satu bulan, jumlah, DPP, PPN, total, status bayar, ekspor CSV.

**Laporan pajak:**
- omzet per bulan (kas dan akrual), kumulatif, dan kemajuan menuju Rp4,8 miliar dengan peringatan di 80% dan 100%;
- perkiraan PPh final per bulan dengan Rp500 juta bebas untuk orang pribadi, dan tanggal setor (tanggal 15 bulan berikutnya);
- jika PKP: DPP dan PPN keluaran per bulan dari invoice yang diterbitkan, dengan daftar invoice;
- ekspor CSV untuk akuntan.

**Dasar hitung (diuji):** kumulatif dikurangi Rp500 juta (hanya orang pribadi), dikali 0,5% per bulan, dibulatkan ke rupiah; PPN efektif dari tarif yang diatur, dengan harga termasuk atau belum termasuk pajak; omzet bagi PKP tidak memuat PPN.

## 4. Pertanyaan untuk konsultan pajak Anda

1. Jenis wajib pajak dan rezim yang berlaku untuk usaha Anda sekarang?
2. Apakah jasa penitipan dan grooming hewan termasuk JKP? Perlu PKP?
3. Omzet diakui secara kas atau akrual untuk PPh final Anda?
4. Apakah invoice dari Pethommie cukup sebagai bukti, atau perlu faktur pajak lewat Coretax (untuk PKP)?
5. Berapa lama dokumen ini harus disimpan, dan dalam bentuk apa?
