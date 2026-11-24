# Pasang analitik pengunjung (PostHog) — langkah demi langkah

Panduan ini untuk pemilik produk, bukan developer. Hasil akhirnya: kamu bisa lihat di dasbor PostHog halaman mana
yang paling sering dibuka, baik di website pemasaran maupun di aplikasi operator — berapa orang yang sampai ke
halaman Harga, berapa yang menyelesaikan onboarding, dan sebagainya.

**Ini opsional sepenuhnya.** Tanpa langkah ini, aplikasi berjalan persis seperti sekarang — tidak ada yang rusak,
tidak ada permintaan jaringan tambahan ke PostHog sama sekali.

**Yang dikirim, dan yang sengaja TIDAK dikirim** (lihat `web/src/shared/analytics.ts`):
- Dikirim: **halaman mana yang dibuka** (URL-nya saja), tanpa nama orang, email, atau isi formulir.
- Tidak dikirim: klik tombol satu per satu, isi formulir, rekaman sesi (*session recording*) — semuanya dimatikan
  sengaja. Tidak ada yang menghubungkan kejadian ini ke akun tertentu (tidak ada `identify()`).
- Ini dipilih supaya aman dipakai **sebelum** Kebijakan Privasi ditinjau pengacara (lihat README.md). Kalau nanti mau
  melacak lebih dalam (mis. per-akun), itu perlu masuk ke Kebijakan Privasi dulu — tanya developer sebelum menambah.

Waktu: sekitar **5 menit**.

## Langkah 1 — Buat akun dan project PostHog

1. Buka https://posthog.com → **Get started** (gratis sampai 1 juta kejadian/bulan).
2. Saat diminta memilih region: **US Cloud** cukup untuk kebanyakan kasus (lebih murah/cepat); pilih **EU Cloud**
   hanya kalau kamu punya alasan data harus di Eropa.
3. Buat satu project, mis. nama `Siomofu`.
4. Menu kiri bawah → ikon gerigi **Project Settings** → cari **Project API Key** → salin nilainya (dimulai `phc_...`).

## Langkah 2 — Isi Environment Variable di Vercel

Vercel → project **pethommie-web** → **Settings** → **Environment Variables**:

| Nama | Isi |
|---|---|
| `VITE_POSTHOG_KEY` | Kunci dari Langkah 1.4 (`phc_...`) |
| `VITE_POSTHOG_HOST` | **Kosongkan** kalau pilih US Cloud di Langkah 1.2. Isi `https://eu.i.posthog.com` kalau pilih EU Cloud. |

Centang **Production** (dan **Preview** kalau mau). Klik **Save**, lalu **Deployments** → titik tiga pada deploy
teratas → **Redeploy**.

## Langkah 3 — Coba

1. Buka situsnya (`https://siomofu.xyz` atau domainmu) di tab baru, klik-klik beberapa halaman.
2. Buka dasbor PostHog → menu kiri **Activity** (atau **Events**) → dalam beberapa detik harus muncul kejadian
   `$pageview` untuk tiap halaman yang kamu buka.

### Cara cek

| Yang dicek | Cara | Hasil yang benar |
|---|---|---|
| Env var kebaca | Langkah 3 | `$pageview` muncul di PostHog **Activity** |
| Tidak ada data pribadi ikut terkirim | PostHog → klik salah satu kejadian `$pageview` → lihat propertinya | Hanya ada URL halaman dan info teknis browser (user agent, dsb.), tidak ada nama/email |

## Kalau ada masalah

| Yang terlihat | Artinya | Yang dilakukan |
|---|---|---|
| Tidak ada kejadian masuk sama sekali | `VITE_POSTHOG_KEY` belum terisi, salah ketik, atau belum Redeploy | Cek ejaannya di Vercel, Redeploy, coba lagi. |
| Kejadian masuk tapi ke project yang salah | Kunci dari project PostHog yang berbeda tercopy | Ulangi Langkah 1.4 di project yang benar, ganti nilai `VITE_POSTHOG_KEY`, Redeploy. |
| Mau berhenti memakainya | — | Kosongkan `VITE_POSTHOG_KEY` di Vercel, Redeploy. Tidak ada yang perlu dihapus dari kode. |

## Untuk developer

- `web/src/shared/analytics.ts`: `initAnalytics()` (sekali, di `App.tsx`) dan `trackPageview(path)` (dipanggil dari
  `RouteAnalytics` di `App.tsx` lewat `useLocation()`), keduanya no-op tanpa `VITE_POSTHOG_KEY`.
  `person_profiles: "identified_only"` + tidak pernah memanggil `posthog.identify()` berarti tidak ada profil orang
  yang dibuat sama sekali saat ini — murni agregat anonim.
  `autocapture: false`, `capture_pageview: false` (ditrack manual, bukan `history.pushState` bawaan PostHog, supaya
  URL dengan parameter seperti `#` booking-link tidak ikut tertangkap dengan isi sensitif), `disable_session_recording:
  true`, `respect_dnt: true`.
- CSP (`vercel.json`) menambahkan `https://*.posthog.com https://*.i.posthog.com` ke `connect-src` — PostHog
  di-bundle lewat npm (`posthog-js`), jadi tidak perlu domain tambahan di `script-src`.
- Tes: `web/src/shared/analytics.test.ts` (mock modul `posthog-js`, membuktikan: tanpa kunci sama sekali tidak ada
  panggilan; dengan kunci, `init` sekali saja walau dipanggil dua kali, opsi autocapture/capture_pageview/identified_
  only benar, dan `trackPageview` tidak pernah terpanggil sebelum `init` sungguh jalan).
