// All landing page copy lives here so it can be edited without touching components.

export const brand = {
  name: "Pethommie",
  seal: "宿", // "inn" — the hanko mark
  tagline: "Aplikasi manajemen pet hotel",
};

export const nav = [
  { href: "#fitur", label: "Fitur" },
  { href: "#rapor", label: "Rapor Anabul" },
  { href: "#lebaran", label: "Paket Lebaran" },
  { href: "#gabung", label: "Daftar" },
];

export const hero = {
  titleStart: "Kandang penuh, kamu tetap ",
  titleAccent: "tenang",
  titleEnd: ".",
  lead: "Pethommie adalah aplikasi manajemen pet hotel untuk operator di Indonesia. Booking dengan DP QRIS, kalender kandang, check-in, dan rapor harian ke WhatsApp pemilik, cukup dari HP Android.",
  primaryCta: { href: "#gabung", label: "Coba gratis 30 hari" },
  secondaryCta: { href: "#fitur", label: "Lihat fiturnya" },
  scrollHint: "Gulir untuk melihat satu masa inap dari sisi operator",
};

/** The ink film: 15 s generated with Higgsfield, extracted to 12 fps WebP frames. */
export const film = {
  frameCount: 181,
  durationSeconds: 15,
  frameSrc: (i: number) => `/frames/f${String(i + 1).padStart(4, "0")}.webp`,
  label: "Satu masa inap",
  /** Story clock under the film, keyed to the video's beats (seconds). */
  clock: [
    { at: 0, label: "H-3 · Booking masuk" },
    { at: 3, label: "Hari 1 · 08.30" },
    { at: 5.5, label: "Hari 1 · 09.15" },
    { at: 8, label: "Hari 1 · 21.00" },
    { at: 10.8, label: "Hari 2 · 07.30" },
    { at: 12.8, label: "Hari 5 · 16.00" },
  ],
};

export type Chapter = {
  /** Second in the film where this caption should sit mid-screen. */
  at: number;
  side: "left" | "right";
  when: string;
  title: string;
  body: string;
};

export const chapters: Chapter[] = [
  {
    at: 3.8,
    side: "right",
    when: "Hari 1 · 08.30 · Antar",
    title: "Booking beres sebelum pemilik datang.",
    body: "Pemilik booking dari link di bio Instagram-mu, unggah kartu vaksin, dan bayar DP lewat QRIS. Kandang langsung terkunci di kalender. Tidak ada chat bolak-balik, tidak ada slot dobel.",
  },
  {
    at: 6.5,
    side: "left",
    when: "Hari 1 · 09.15 · Check-in",
    title: "Check-in dalam satu menit.",
    body: "Staf memotret kondisi anabul saat datang, mengecek vaksin, dan mencatat makanan bawaan. Semuanya tersimpan dengan jam, jadi kalau ada keluhan kamu punya bukti.",
  },
  {
    at: 9.5,
    side: "right",
    when: "Hari 1 · 21.00 · Shift malam",
    title: "Shift malam tahu harus apa.",
    body: "Jadwal makan dan obat per kandang muncul di HP staf. Yang sudah dikerjakan dicentang, jadi serah terima shift tidak bergantung pada ingatan.",
  },
  {
    at: 12,
    side: "left",
    when: "Hari 2 · 07.30 · Rapor pagi",
    title: "Rapor terkirim, chat berkurang.",
    body: "Satu ketukan mengirim foto dan ringkasan harian ke WhatsApp tiap pemilik. Mereka tenang, dan kamu tidak perlu membalas \"anakku gimana, kak?\" satu per satu.",
  },
  {
    at: 14,
    side: "right",
    when: "Hari 5 · 16.00 · Jemput",
    title: "Pelunasan beres, pelanggan kembali.",
    body: "Tagihan sisa terkirim lewat QRIS saat penjemputan. Riwayat menginap tersimpan, jadi kamu tahu siapa pelanggan setiamu dan booking berikutnya lebih cepat.",
  },
];

export const features = {
  eyebrow: "Fitur untuk operator",
  title: "Seluruh alur penitipan dalam satu aplikasi.",
  lead: "Dibuat untuk pet hotel 10 sampai 150 kandang yang hari ini masih mengandalkan buku, spreadsheet, dan chat WhatsApp. Bukan aplikasi kasir yang ditambal fitur hotel.",
  items: [
    { title: "Kalender kandang", body: "Lihat kandang kosong per tanggal dan per ukuran. Slot yang sudah dibooking tidak bisa diisi dua kali." },
    { title: "Link booking dengan DP QRIS", body: "Pasang di bio Instagram atau kirim lewat WhatsApp. Slot baru terkunci setelah DP masuk, jadi booking tanpa kabar berkurang." },
    { title: "Cek vaksin otomatis", body: "Pemilik wajib unggah foto kartu vaksin saat booking. Vaksin yang sudah kedaluwarsa langsung ditandai." },
    { title: "Log harian dan insiden", body: "Makan, obat, BAB, mood, dan kejadian penting tercatat dengan jam. Serah terima shift jadi rapi." },
    { title: "Rapor ke WhatsApp pemilik", body: "Satu ketukan mengirim foto dan ringkasan harian dari nomor WhatsApp pet hotelmu sendiri." },
    { title: "Tetap jalan saat sinyal hilang", body: "Check-in dan log tetap bisa dicatat offline, lalu tersinkron saat sinyal kembali." },
  ],
};

export const rapor = {
  eyebrow: "Rapor Anabul",
  title: "Alasan pelanggan memilih hotelmu lagi.",
  body: "Kekhawatiran terbesar pemilik adalah tidak tahu kondisi anabulnya. Rapor harian menjawabnya sebelum mereka bertanya. Setiap catatan juga tersimpan sebagai bukti kalau suatu saat ada keluhan atau sengketa.",
  points: [
    "Dikirim dari nomor WhatsApp pet hotelmu sendiri",
    "Foto, makan, tidur, dan mood dalam satu pesan",
    "Pemilik tidak perlu install aplikasi apa pun",
  ],
  sample: {
    hotel: "Rumah Meong Bintaro",
    subtitle: "Rapor Anabul · contoh",
    image: "/frames/f0084.webp",
    imageAlt: "Ilustrasi anjing dielus staf pet hotel",
    heading: "Rapor Mochi · Hari 2",
    lines: ["Makan pagi habis (Royal Canin bawaan)", "Main 20 menit, tidur siang 3 jam", "Mood: santai, sudah mau dielus"],
    sentAt: "07.32",
    reply: "Ya ampun lega banget, makasih kak 🥹",
    replyAt: "07.40",
  },
};

export const lebaran = {
  eyebrow: "Paket Lebaran",
  title: "Minggu tersibukmu, tanpa kewalahan.",
  lead: "Menjelang Lebaran, permintaan penitipan bisa naik tiga sampai tujuh kali lipat. Paket Lebaran menyiapkan booking, kapasitas, dan kabar ke pemilik untuk puncak musim, supaya kamu bisa menerima lebih banyak tamu tanpa menambah kekacauan.",
  timeline: [
    { day: "H-30", tag: "buka", body: "Link booking Lebaran aktif dengan DP wajib dan cek vaksin." },
    { day: "H-7", tag: "penuh", body: "Saat kandang penuh, slot otomatis tertutup dan peminat masuk daftar tunggu. Ada yang batal, kamu langsung tahu siapa berikutnya." },
    { day: "H+0", tag: "rapor", body: "Rapor harian ke puluhan pemilik sekaligus, tanpa balas chat satu per satu." },
    { day: "H+7", tag: "pulang", body: "Jadwal jemput tersusun, tagihan pelunasan terkirim lewat QRIS." },
  ],
  price: "Rp299rb",
  priceUnit: "per musim Lebaran",
  priceNote: "Bayar sekali untuk satu musim. Setelah Lebaran, lanjut berlangganan hanya kalau cocok.",
  cta: { href: "#gabung", label: "Amankan paket Lebaran" },
};

export const waitlist = {
  eyebrow: "Akses awal untuk pet hotel",
  title: "Kami bantu setup sampai hotelmu jalan.",
  lead: "Isi data singkat. Tim kami menghubungi lewat WhatsApp, membantu memindahkan data pelanggan dari buku atau spreadsheet, dan mengajari stafmu memakai aplikasinya. Gratis 30 hari, tanpa kartu kredit.",
  cageOptions: ["Di bawah 15", "15 sampai 50", "50 sampai 150", "Lebih dari 150"],
  submit: "Daftarkan pet hotel saya",
  success: "Terima kasih, pet hotelmu sudah terdaftar. Tim kami akan menghubungi lewat WhatsApp untuk menjadwalkan setup.",
};

export const footer = {
  left: "Pethommie · Aplikasi manajemen pet hotel untuk Indonesia",
  right: "Ilustrasi tinta dibuat untuk Pethommie",
};
