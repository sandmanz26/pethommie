# CLAUDE.md — project memory for Siomofu (formerly Pethommie)

Read this first in every session. It holds the owner's preferences, the decisions already made, how the project is
built and checked, and where things stand. Keep it current: when something here changes, update this file in the same
commit.

---

## 1. Working with the owner

- **Language:** always reply in **Indonesian** (code, commits, comments and docs for developers stay in English;
  guides meant for the owner are in Indonesian).
- The owner is a **designer / product person, not a backend developer**. Step-by-step guides must be click-by-click,
  with exact menu names, exact values to paste, a "how to check it worked" table and a troubleshooting table.
- Quality bar: **real-product quality**. Every behaviour change comes with tests that prove it; mutation-check key
  rules (break the rule on purpose, see a test fail, restore). Be honest about what is not built or not tested
  (especially anything not run against a live Supabase / Resend / Google project).
- Work in **parallel** when asked: delegate independent chunks to background agents with tight file boundaries, then
  verify (tsc, eslint, vitest, e2e) before committing their work. Never commit an agent's half-finished work; when a
  stop hook complains about uncommitted changes from a running agent, say so and wait.
- **Document everything, every session, as you go — not just at the end.** The owner hands this project between
  different agents/models and relies on this file (plus §6 and the docs/ pages it names) to carry full context across
  that handoff: nothing should live only in a chat transcript. In the same turn a thing happens, write it down:
  - A shipped fix or feature → one line under §6 "Done and live", with the commit sha(s).
  - A decision the owner made (a name, a wording choice, a policy) → wherever in this file it's relevant, not just §6.
  - A proposal given to the owner that is NOT yet approved/implemented (e.g. replacement copy, a design direction) →
    its own dated entry under §6 with the full proposed content inline (not "see chat"), so another agent can pick it
    up and implement it, or know it's still awaiting a yes, without re-deriving it.
  - A background agent started → what it's building and its file list, under §6, kept current while it runs.
  - A gotcha hit while working → §7, one line, so the next agent doesn't rediscover it the hard way.
  If something here turns out stale (a gap gets fixed, a plan changes), correct it in the same commit — don't leave
  two contradictory facts in the file.
- **Git:** develop on branch `claude/serene-cannon-kc2qw7`, push to it **and** to `main`
  (`git push -u origin claude/serene-cannon-kc2qw7 && git push origin claude/serene-cannon-kc2qw7:main`). Vercel
  deploys `main`. No pull requests unless asked. Commit trailers (**check this block itself is current before using
  it** — the model/session serving this file changes over time):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RE3iftNrPa7AWWeqfo8aVZ
  ```
  Never put a model name/identifier in code, docs or commit text beyond that trailer.
- **Do not** attempt the git-history purge of old images without the owner's explicit permission.
- **Do not** link to a demo from marketing copy unless asked (the owner first banned demo links, later asked for a
  separate "Try now" demo screen — current state in §5).
- Higgsfield (image/video AI) is connected; the owner is on **Pro**, ~**194 credits** left after the 4K film upscale
  (15 credits). Ask/estimate before spending big amounts.
- After pushing, confirm the Vercel deploy succeeded (GitHub commit statuses API:
  `https://api.github.com/repos/sandmanz26/pethommie/commits/<sha>/statuses`) and, for user-visible changes, check the
  live site. A push that fails with a GitHub 500 on `main` may leave production undeployed even after a retry with the
  same SHA: check, and trigger with an empty commit if needed.

## 2. Product

- **Name:** **Siomofu** (renamed from Pethommie on 4 Nov 2026). Domain **siomofu.xyz** (bought at Rumahweb, nameservers
  moved to **Vercel**: `ns1/ns2.vercel-dns.com`; Vercel Team Domains shows Nameservers: Vercel, CDN active; DNS answers
  via Vercel as of 4 Nov; HTTPS on the new domain was still being provisioned at last check).
  Primary = `siomofu.xyz`; `www.siomofu.xyz` 308-redirects to it. Old URL `https://pethommie-web.vercel.app` still works.
- **What it is:** pet hotel management for small/medium Indonesian pet hotels. Owner panel (operator app) + marketing
  landing + public booking link page. Bilingual **Bahasa Indonesia / English** everywhere.
- **Brand look:** warm paper palette, one vermilion accent (`--seal` #b8321f), hanko seal mark **宿** ("inn"),
  Fredoka (display) + Nunito (text), hand-drawn diorama illustrations. **Never change the illustration/film style**:
  it is brand identity; only improve quality.
- Names kept as "pethommie" **on purpose** (renaming loses data): browser storage keys (`pethommie.app.v1.<account>`,
  `pethommie.auth.*`, `pethommie.locale`, `pethommie.calendar.view`, `pethommie.demo.*`, …), the stable-id seed in
  `web/src/app/sync/ids.ts`, the GitHub repo `sandmanz26/pethommie`, the Vercel project `pethommie-web`.

## 3. Repository map

```
web/                    the app (React 19 + TypeScript strict + Vite 6 + react-router 7, PWA under /app)
  src/site/             marketing site (landing, legal pages, public booking page /book)
  src/app/              operator app (/app/*): domain/, store/, sync/, auth/, pages/, design-system/, i18n/
  src/shared/           used by both (company.ts, serverMode.ts, bookingLink.ts, ui/Hanko …)
  api/                  Vercel serverless functions (/api/*), helpers in api/_lib, tests in api/_tests
  e2e/                  Playwright (axe a11y + layout checks)
  public/films/turntable/  the scroll film: 213 WebP frames, 12 fps, 1800x1512 (from a 4K Topaz upscale)
  public/screens/       app screenshots for the landing tour (scripts/capture-screens.mjs + prepare-resources.py --screens)
  media/                video masters (*-4k.mp4 is gitignored: >100 MB)
backend/supabase/
  migrations/0001…0007  schema, RLS, triggers, sync RPCs. Never edit an applied migration: add the next number.
  setup.sql             GENERATED (npm run build:setup-sql in web/) = 0001–0007 in one transaction + verify.sql
  verify.sql            11 read-only checks, all should say OK
docs/
  ARCHITECTURE.md       module boundaries, storage, "The name" section
  backend/README.md     backend plan & status; setup-supabase.md (owner guide, ID); google-login.md; api.md;
                        notifications.md (email/push plan); email-setup.md (being written, see §6)
```

Module boundaries are lint-enforced: `shared` depends on neither; `site` may use `shared`; `app` may use `shared`;
imports across folders use the `@/` alias. ESLint react-refresh: component files export only components (put helpers
in `.ts` files). **Don't run prettier on whole files** (no prettier config; it reformats everything).

## 4. Commands (run in `web/`)

```bash
npx tsc -b --noEmit          # typecheck (app + api via tsconfig.api.json)
npx eslint .                 # lint
npx vitest run               # unit/integration (≈889 tests at last count) incl. PGlite schema tests
npm run build                # production build (tsc + vite); `npx vite build` skips tsc
npm run build:setup-sql      # regenerate backend/supabase/setup.sql after changing migrations
# e2e (Chromium preinstalled; PW_CHROMIUM=/opt/pw-browsers/...):
npm run build && (curl -s localhost:4173 >/dev/null || (npx vite preview --port 4173 --strictPort &))
E2E_BASE_URL=http://localhost:4173 npx playwright test          # 24 tests
E2E_BASE_URL=https://pethommie-web.vercel.app npx playwright test # against live
```
Background preview servers get killed at their time limit; just restart. Don't `pkill -f "vite preview"` from a
compound command (it can kill the calling shell). Foreground `sleep` is blocked: poll with an until-loop.

## 5. How the product works (current state)

**Auth**
- Without Supabase env vars: fully local mock (accounts in localStorage, password login).
- With `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`: real accounts via **Google sign-in only** (PKCE, callback
  `/app/auth/callback`); `supabaseAuthService` wraps the local service so **Try now** stays local.
- **Try now** (`/app/try`): 3 demo hotels (small/simple, big/advanced, empty→setup), no password, data under
  `pethommie.demo.v1.<id>`, separate from real accounts. Demo shows a top strip (start over / leave) and a red
  floating 50%-off offer with a 3-day countdown (`startOffer`, stored once per browser); "Claim" → register, offer saved
  on the account (pending offer survives the Google round trip). No payment system exists yet.
- Homepage: top bar has Log in + Coba gratis (register); the demo is a link under the hero buttons. Logo links home.

**Data & sync**
- Local-first: the store reads/writes localStorage (`createLocalRepository`), data version **7** (migrations in
  `store/storage.ts`, each with a test using an old document).
- Google accounts use `createSyncedRepository`: outbox in localStorage, debounced push, pull on start/focus/online,
  `create_hotel`/`my_hotel`/`pull_changes`/`push_changes` RPCs (security invoker → RLS). A new device shows
  "Loading your hotel…" until the server answers (setup only if the server has no hotel; offline first sign-in
  explains it needs a connection). Server hotel wins over a locally set-up one (local kept aside). Settings delete for
  synced hotels: "this device only" vs "everywhere" (typed hotel name).
- Known small gaps: `create_hotel` has no server-side "already has a hotel" guard (tiny race; would need 0008);
  "Replace with sample data" on a synced hotel syncs the sample.

**Operator app features**
- Layouts: cages (sizes S/M/L), shared rooms (capacity), or **no units** (`unitTerm "none"`: one hidden pool unit with
  total capacity; UI never shows units; calendar shows per-day counts).
- Booking: owners ranked "book most often" (3 columns), nights/days stepper (label follows the hotel's counting),
  money inputs group thousands while typing (`MoneyInput`), validation on every input with focus on first error.
- **Booking settings** (`/app/settings/booking`, gate before the first booking): day counting (per night / per
  calendar day / per 24h), drop-off/pick-up hours, grace, late fee (per hour capped at a day / half day / full day),
  payment rules (flexible / deposit first → "Menunggu DP" / check slot first → "Permintaan" that holds no place,
  "Konfirmasi slot"), deposit %. Saved options show an **"In use / Dipakai sekarang"** badge.
- Check-out proposes the late fee as a charge. Calendar: Week/Month toolbar with prev/next/Today, day drawer.
- Sidebar: Today, Calendar, Bookings on top; groups Customers / Money / Insights / Hotel setup (fold, open where you
  are). Simple/Advanced mode: no switch in sidebar/Settings/More; only the upgrade card in Settings.
- Invoices, receipts, payments/refunds, expenses, finance (P&L, break-even), tax (PPh final 0.5% estimate), reports,
  dashboard, WhatsApp report/messages, shareable booking link + public `/book` page (sends request via WhatsApp).

**Landing**
- Scroll-scrubbed film (`InkFilm`, canvas, `film.ts` focus `{x:306,y:162,w:1152,h:1278}` in the 1800x1512 frames),
  then Problem (currently three numbers: Rp 900.000 empty places + Rp 810.000 unpaid/extras = Rp 1.710.000/month,
  30 hours — a replacement copy proposal is pending the owner's approval, see §6), Before/After, Features, Kinds,
  Link, Product tour (screens), Pricing (Akses awal free 30 days; Paket Lebaran Rp299rb "segera hadir"), FAQ, final
  CTA. Parallax/reveal via `useScrollEffects`, off for reduced motion.
- Legal pages: `usesServer` (both Supabase vars set) switches privacy/terms to the server version (`legalCloud`:
  Google data, Supabase Singapore, Vercel, rights, UU PDP No. 27/2022). Needs a lawyer's review before real customers.

**API on Vercel (`web/api`)** — runs as the signed-in user with the anon key (RLS applies); no service role except
server-only where unavoidable: `GET /api/health`, `GET|POST /api/hotel|owners|pets|bookings`, `GET /api/cages`,
`POST /api/join` (honeypot + rate limit). 409 for double booking, 422 with field list. `vercel.json` rewrite excludes
`/api`. CSP allows `https://*.supabase.co`, `wss://*.supabase.co`, Google avatars.

## 6. Where things stand (update this list)

Done and live: everything in §5; Siomofu rename (commit `3b7864e` + redeploy `e923434`); sharper 4K-upscaled film.

**Shipped 4 Nov 2026 (UI bug reports from the owner, each its own commit, all verified tsc+eslint+vitest+e2e green
and confirmed live on `pethommie-web.vercel.app`):**
- `e1aa9cf` — Onboarding's cage-layout picker ("In cages" / "Shared rooms, no cages" / "No cages or rooms") was a
  `Segmented` tab row whose longer labels overflowed. Replaced with a new `OptionCards` molecule (icon + title +
  subtitle stacked cards, `role="radiogroup"`/`role="radio"`): `web/src/app/design-system/molecules/OptionCards.tsx`
  (+`.css`), new `room`/`openSpace` icons in `Icon.tsx`, i18n `o.cages.layout.*` restructured to `{title, subtitle}`,
  wired in `OnboardingPage.tsx`.
- `6c8fd8f` — `.pg-settings` (the max-width:720px card wrapper used on `SettingsPage`, `BookingSettingsPage`, and the
  in-progress `EmailSettings`) had no `margin-inline: auto`, so on a wide screen it sat flush left inside the wider
  1040px content column instead of centering, reading as "broken/untidy" (reported with a screenshot of Booking
  settings). Fixed in `web/src/app/pages/pages.css` with a one-line rule change.
- `f8f1725` — Help FAQ "Where is my data kept?" and Settings "Your data" lead text both still claimed data never
  leaves the browser; true before Google sign-in + Supabase sync shipped, wrong for a signed-in account now. Also
  fixed the FAQ "Can two phones share the same hotel?" (used to say "not yet", but cross-device sync is exactly what
  a synced account does). Both now branch on `useSyncedRepository()`: `web/src/app/pages/HelpPage.tsx`,
  `web/src/app/pages/SettingsPage.tsx`, new i18n keys `help.faqSynced` and `settings.dataLeadSynced` in
  `web/src/app/i18n/{en,id}.ts`.

**Pending decision — landing Problem section copy (proposed to the owner 4/5 Nov 2026, NOT yet implemented):**
The current section (`web/src/site/sections/Problem.tsx`, copy in `web/src/site/i18n/{en,id}.ts` under `problem`,
numbers computed in `web/src/site/lib/leaks.ts`) shows a fabricated example hotel ("12 places, Rp 75.000/night, 60%
full") and computes Rp 900.000 / Rp 810.000 / 30 hours of monthly "leaks" + a yearly total. The owner flagged this as
unrealistic after checking it against reality ("hal ini tidak sering terjadi") — Indonesian pet-hotel demand is
sharply seasonal (full at Lebaran/year-end, slow otherwise), so a steady monthly-leak premise doesn't match how these
businesses run, and a background research agent (web search of Indonesian pet-boarding theses/case studies + industry
blogs) confirmed the better-supported pain points are concrete frictions, not a dollar leak: double-booked cages (no
one shared place to check before saying yes), unpaid balances tracked only in memory, and the same nightly report
retyped by hand per owner on WhatsApp. Proposed replacement (drops the Rp-amount/total/note format entirely — no
disclaimer needed because nothing is estimated):
  ```ts
  // en.ts
  problem: {
    eyebrow: "Without a system",
    title: "Packed at Lebaran. Forgotten by June.",
    lead: "Booking by chat and memory works — until the season turns.",
    items: [
      { key: "double", art: "problem-empty", label: "Two owners, one cage", detail: "Nothing in one place to check before you say yes" },
      { key: "unpaid", art: "problem-money", label: "What's owed stays in your head", detail: "Chased from a notebook after they've already left" },
      { key: "report", art: "problem-time", label: "The same update, typed by hand", detail: "Once per owner, every night, on WhatsApp" },
    ],
  },
  // id.ts
  problem: {
    eyebrow: "Tanpa sistem",
    title: "Penuh saat Lebaran. Terlupa saat sepi.",
    lead: "Booking lewat chat dan ingatan masih jalan — sampai musimnya berubah.",
    items: [
      { key: "double", art: "problem-empty", label: "Dua pemilik, satu kandang", detail: "Tidak ada satu tempat untuk cek sebelum bilang 'bisa'" },
      { key: "unpaid", art: "problem-money", label: "Yang belum dibayar cuma di kepala", detail: "Dikejar dari catatan tangan setelah anabulnya pulang" },
      { key: "report", art: "problem-time", label: "Laporan yang sama, diketik ulang", detail: "Satu per satu pemilik, tiap malam, lewat WhatsApp" },
    ],
  },
  ```
  Implementation note for whoever picks this up: `Problem.tsx` would drop the `EXAMPLE`/`leaksFor`/`value`/`rupiah()`
  computation and the `problem__number`/`problem__total`/`problem__note` paragraphs — each `<li>` renders just the
  illustration (same 3 files: `problem-empty`/`problem-money`/`problem-time`, reused) + `item.label` (bold) +
  `item.detail`. `web/src/site/lib/leaks.ts` becomes unused by this section — check `BookPage.test.tsx`/
  `sections.test.tsx` before deleting it. Caveat: the three pain points are backed by a handful of ID theses/case
  studies plus non-Indonesian vendor blogs (which have an incentive to overstate pain), not a direct survey of
  Indonesian pet-hotel owners — treat the *existence* of the frictions as reasonably supported, don't add any
  frequency/percentage claim to the copy. **Waiting on the owner's go-ahead before touching any file.**

**Owner's setup progress (as of 4 Nov 2026):**
- Supabase project created, `setup.sql` (0001–0007) run, Google sign-in configured, Vercel env vars set (owner says
  "the rest is done"). Not yet verified by me on the live site.
- Domain siomofu.xyz: Vercel nameservers active, DNS resolving; waiting for HTTPS/"Valid Configuration".
  After it's valid: Supabase Site URL → `https://siomofu.xyz` + redirect `https://siomofu.xyz/app/auth/callback`;
  Google OAuth JavaScript origin `https://siomofu.xyz`; authorized domain `siomofu.xyz` (Search Console TXT if Google
  asks, needed to Publish). Google consent screen is still **Testing** (only test users can log in) → Publish later.

**In progress (a background agent was building it; check `git status` — uncommitted files belong to it):**
- **Email system** (Resend): migration **0008** (booking_requests table for public link requests, notification_outbox,
  enqueue triggers, claim RPC), `/api/requests` (public, anon), `/api/email/dispatch` (secret header, service role
  server-side, retries 1m/10m/1h), bilingual templates, Settings toggles, Requests list in the app,
  `docs/backend/email-setup.md` (Resend domain `mail.siomofu.xyz`, DNS records in Vercel, env vars RESEND_API_KEY,
  EMAIL_FROM, EMAIL_DISPATCH_SECRET, SUPABASE_SERVICE_ROLE_KEY, APP_URL; owner pastes **0008 only**).
  If the agent's work is incomplete, verify/finish it, run all checks, then commit.

**Next candidates:** server guard for `create_hotel` (0008/0009), synced "sample data" and Settings data text,
Realtime sync, staff accounts, deposits on the booking link, payments (Xendit/DOKU), Search Console verification,
privacy review by a lawyer, Dribbble/portfolio assets refresh with the Siomofu name (earlier assets in the session
scratchpad say Pethommie and `app.pethommie.com`).

## 7. Gotchas learned

- Vercel Hobby: build rate limits (two branches × projects consume it); cron only daily.
- Vercel returns 200 HTML for missing paths (SPA fallback): check real content, not status codes.
- Invoice e2e tests must tick "All months": the sample invoice can be dated last month.
- The film's hero link needs the film veil to finish before clicking (`.film__veil.is-done`).
- Google rejects `vercel.app` as an authorized domain; use `<ref>.supabase.co` and your own domain.
- Supabase SQL Editor warns "destructive operation" for `drop constraint` in 0003 and about RLS: both safe to run.
- Higgsfield uploads: `media_upload` → curl PUT with `If-None-Match: *` and the content type → `media_confirm`.
- Segmented options can carry a `badge`; accessible name then includes it ("Per night In use").
