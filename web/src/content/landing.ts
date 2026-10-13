// All landing page copy lives here so it can be edited without touching components.

export const brand = {
  name: "Pethommie",
  seal: "宿", // "inn" — the hanko mark
  tagline: "Aplikasi pet hotel Indonesia",
};

export const nav = [
  { href: "#fitur", label: "Fitur" },
  { href: "#rapor", label: "Rapor Anabul" },
  { href: "#lebaran", label: "Paket Lebaran" },
];

export const hero = {
  titleStart: "Titip anabul, ",
  titleAccent: "tenang",
  titleEnd: " sampai pulang.",
  lead: "Aplikasi pet hotel untuk operator Indonesia. Booking, check-in, dan rapor harian ke WhatsApp pemilik, dari satu HP Android.",
  primaryCta: { href: "#gabung", label: "Coba gratis 30 hari" },
  secondaryCta: { href: "#rapor", label: "Lihat Rapor Anabul" },
  scrollHint: "Gulir untuk membuka gulungan",
};

/** The ink film: 15 s generated with Higgsfield, extracted to 12 fps WebP frames. */
export const film = {
  frameCount: 181,
  durationSeconds: 15,
  frameSrc: (i: number) => `/frames/f${String(i + 1).padStart(4, "0")}.webp`,
  label: "Satu masa inap",
  /** Story clock under the film, keyed to the video's beats (seconds). */
  clock: [
    { at: 0, label: "Hari 0 · 08.00" },
    { at: 3, label: "Hari 0 · 08.30" },
    { at: 5.5, label: "Hari 0 · 09.15" },
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
    when: "Hari 0 · 08.00 · Berangkat",
    title: "Pemilik pergi dengan satu pertanyaan.",
    body: "\"Nanti anakku gimana?\" Itu alasan paling sering pemilik ragu menitipkan. Pethommie menjawabnya sebelum mereka bertanya.",
  },
  {
    at: 6.5,
    side: "left",
    when: "Hari 0 · 09.15 · Check-in",
    title: "Check-in tiga ketukan.",
    body: "Foto kondisi saat datang, foto kartu vaksin, catat makanan bawaan. Semua tersimpan dengan jam dan tanggal, jadi kalau ada apa-apa kamu punya bukti.",
  },
  {
    at: 9.5,
    side: "right",
    when: "Hari 1 · 21.00 · Malam",
    title: "Setiap kandang punya cerita.",
    body: "Jadwal makan, obat, dan catatan perilaku per hewan. Staf shift malam tahu persis apa yang sudah dan belum dilakukan.",
  },
  {
    at: 12,
    side: "left",
    when: "Hari 2 · 07.30 · Rapor pagi",
    title: "Kabar sampai sebelum ditanya.",
    body: "Rapor Anabul terkirim ke WhatsApp pemilik: foto, makan, tidur, mood. Tanpa pemilik perlu install aplikasi apa pun.",
  },
  {
    at: 14,
    side: "right",
    when: "Hari 5 · 16.00 · Pulang",
    title: "Pulang, lalu booking lagi.",
    body: "Pemilik yang tenang adalah pemilik yang kembali. Dan rekomendasi dari mereka lebih kuat dari iklan mana pun.",
  },
];

export const features = {
  eyebrow: "Yang dikerjakan Pethommie",
  title: "Dibuat untuk pet hotel 10 sampai 150 kandang.",
  lead: "Bukan aplikasi kasir yang ditambal. Setiap layar dirancang untuk alur penitipan: dari DP sampai anabul dijemput.",
  items: [
    { title: "Kalender kandang", body: "Lihat kandang kosong per tanggal, per ukuran. Tidak ada lagi double booking saat ramai." },
    { title: "DP lewat QRIS", body: "Link booking minta DP otomatis. Slot baru terkunci setelah DP masuk, jadi no-show turun." },
    { title: "Wajib vaksin", body: "Pemilik unggah foto kartu vaksin saat booking. Vaksin kedaluwarsa langsung ketahuan." },
    { title: "Log harian & insiden", body: "Makan, obat, BAB, mood, dan kejadian penting tercatat dengan jam. Rapi untuk serah terima shift." },
    { title: "Rapor ke WhatsApp", body: "Satu ketukan kirim foto dan ringkasan harian ke pemilik, dari nomor WhatsApp kamu sendiri." },
    { title: "Tetap jalan saat sinyal hilang", body: "Check-in dan log tetap bisa dicatat offline, lalu tersinkron saat sinyal kembali." },
  ],
};

export const rapor = {
  eyebrow: "Rapor Anabul",
  title: "Transparansi yang melindungi dua pihak.",
  body: "Banyak kasus penitipan yang viral berawal dari hal yang sama: pemilik tidak tahu apa yang terjadi. Rapor harian membuat pemilik tenang, dan memberi kamu catatan yang bisa ditunjukkan kalau terjadi sengketa.",
  points: [
    "Foto dan kondisi saat check-in tersimpan permanen",
    "Riwayat makan, obat, dan insiden bertanda waktu",
    "Dikirim ke WhatsApp, pemilik tidak perlu install apa pun",
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
  title: "Musim mudik datang. Kandangmu siap?",
  lead: "Menjelang Lebaran, permintaan penitipan bisa naik tiga sampai tujuh kali lipat. Paket ini menyiapkan hotelmu untuk minggu paling sibuk dalam setahun.",
  timeline: [
    { day: "H-30", tag: "buka", body: "Link booking Lebaran aktif dengan DP wajib dan cek vaksin." },
    { day: "H-7", tag: "penuh", body: "Kandang penuh otomatis menutup slot. Peminat masuk daftar tunggu." },
    { day: "H+0", tag: "rapor", body: "Rapor harian ke puluhan pemilik sekaligus, tanpa balas chat satu per satu." },
    { day: "H+7", tag: "pulang", body: "Jadwal jemput tersusun, tagihan pelunasan terkirim lewat QRIS." },
  ],
  price: "Rp299rb",
  priceUnit: "per musim Lebaran",
  priceNote: "Bayar sekali. Lanjut berlangganan setelahnya kalau cocok.",
  cta: { href: "#gabung", label: "Amankan paket Lebaran" },
};

export const waitlist = {
  eyebrow: "Daftar akses awal",
  title: "Kami dampingi sampai hotelmu jalan.",
  lead: "Isi data singkat, tim kami hubungi lewat WhatsApp untuk bantu pindahkan data dari buku atau spreadsheet. Gratis 30 hari, tanpa kartu kredit.",
  cageOptions: ["Di bawah 15", "15 sampai 50", "50 sampai 150", "Lebih dari 150"],
  submit: "Daftar akses awal",
  success: "Terima kasih, data tersimpan. Tim kami akan menghubungi lewat WhatsApp.",
};

export const footer = {
  left: "Pethommie · Aplikasi pet hotel Indonesia",
  right: "Ilustrasi tinta dibuat untuk Pethommie",
};
