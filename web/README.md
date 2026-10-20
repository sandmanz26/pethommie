# Pethommie Web

Frontend foundation for Pethommie, a pet hotel app for Indonesian operators.
React 19 + TypeScript + Vite, no backend yet.

## Deploy (Vercel)

Root Directory must be `web`. `vercel.json` here sends every path to `index.html` (so `/app/...`
survives a refresh; without it only `/` works), sets the security headers and cache rules.
Pushes to `main` go to production. Details: `../docs/ARCHITECTURE.md` §8.

## Run

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run lint
npm test         # unit + flow tests (Vitest)
npm run check    # typecheck, lint, tests, build: what CI runs
npm run e2e      # browser tests on the built site (build first; needs Chromium: npx playwright install chromium)
```

## Structure

Three folders under `src/`, with one-way dependencies (enforced by ESLint, see
`docs/ARCHITECTURE.md`):

```
src/
  shared/    used by both surfaces; depends on neither
    i18n/      LocaleProvider (which language), locales list
    hooks/     useBodyTheme, useDocumentMeta
    ui/        Hanko (seal mark), LanguageSwitch
    styles/    base.css: resets, type tokens, focus ring
  site/      the marketing site (landing page)
    i18n/      en.ts (default) and id.ts: all copy, chapter timings, prices; useSiteT
    content/   film registry: frame count, duration, paper colour per film
    components/  ink (the scroll film), film-switcher, layout (TopBar, Footer), ui
    sections/  Hero, Features, RaporPreview, LebaranPackage, WaitlistForm
    hooks/ lib/ pages/ styles/
  app/       the operator product (see below)
  App.tsx    routes: site pages, and /app/* lazy-loaded
  main.tsx   entry; loads base + site CSS before any component CSS
public/
  films/ink/         V1: 181 WebP frames of the sumi-e ink film (15 s, 12 fps)
  films/turntable/   V2: 213 WebP frames of the illustrated turntable (17.75 s, 12 fps, 1600 px)
  illustrations/     generated from resources/illustrations (transparent WebP cut-outs)
media/             source videos from Higgsfield (kept out of public/, so not deployed)
resources/         raw images and photos you drop in; scripts/prepare-resources.py makes the
                   web versions in public/illustrations and public/photos (see resources/README.md)
```

Import rules: `./x` only for files in the same folder; everything else through the `@/` alias
(`@/shared/ui/Hanko`). Each surface scopes its CSS to `body.site` or `body.app`, so styles never leak.

## How the scroll film works

The video is pre-split into frames and drawn to a `<canvas>` based on scroll
position (the same approach Apple uses on product pages). This scrubs smoothly
forwards and backwards on every browser, which seeking a `<video>` does not.

- Frames load coarse-to-fine (every 30th, 10th, 3rd, then all) so a fast scroll shows the whole story early.
- Scroll handling runs once per animation frame and never re-renders React.
- Caption positions come from `chapters.<film>[].at` (seconds into that film) in each `site/i18n/*.ts` file.
- Two films ship today. The floating switcher picks one; `<html data-film>` swaps the page palette to match.
- Phones and portrait tablets (≤720 px, or portrait up to 1100 px): the scene sits above a caption
  deck that shows the current chapter, so captions never cover the illustration. The drifting
  captions stay in the page for screen readers. The V1/V2 switcher compacts to one row there and
  fades out once the film has scrolled past.

To replace the film with a new video:

```bash
ffmpeg -i new.mp4 -vf "fps=12,scale=1280:-1" -c:v libwebp -quality 72 public/films/<id>/f%04d.webp
```

Then register it in `site/content/film.ts` and add its chapter/clock timings in `site/i18n/en.ts` and `site/i18n/id.ts`.
V2 is built from 10 HD keyframes: 9 Wan 3.0 clips (1080p, 2 s, start frame → end frame),
joined with the duplicate first frame of each later clip dropped, then cut at 1600 px
(`media/pethommie-turntable-hd.mp4` is the joined source). Each scene holds about 1.5 s, so
scene *k* sits at roughly 2k−1 to 2k+0.5 s; chapter and clock timings follow that.

`site/lib/drawFrame.ts` never enlarges a frame past 1.25× its own pixels, so big screens
get paper around the film instead of a soft, stretched image.

## Languages

English is the default. Indonesian is available from the EN / ID switch in the
top bar; the choice is remembered in the browser. `en.ts` defines the shape of
the copy, and TypeScript fails the build if `id.ts` is missing a key. To add a
language, copy `en.ts`, translate it, and register it in `i18n/locales.ts`.

## Waitlist (no backend yet)

`site/lib/waitlist.ts` defines a `WaitlistStore` interface. The current
implementation saves entries to `localStorage` and the form shows a "demo mode"
note. When an API exists, add a store that calls it and export it as
`waitlistStore`; the form does not need to change.

## Website

Sections of the landing page (`src/site/sections`): the film, How it works, Product tour (real screens), Features,
Simple/Advanced, Daily report, Trust, Lebaran package, FAQ, Waitlist; plus `/privacy` and `/terms`
(`site/pages/LegalPage.tsx`, words in the site copy, written to describe what the product does today). Nothing on it
is invented: there are no testimonials or customer numbers, and what isn't built is marked **Coming soon**.

The tour images are captured from the running app: `npm run build && npx vite preview --port 4173`, then
`node scripts/capture-screens.mjs` (set `PW_CHROMIUM` if needed), and commit `public/screens/`. Run it again when the
app's look changes.

Company name, contact email and WhatsApp for the footer, legal pages and Help come from environment variables
(`web/.env.example`); anything unset is not shown.

## Operator app (`/app`, no backend yet)

The SaaS lives under `/app` as its own lazily-loaded bundle. A first visit goes to
`/app/onboarding`: a welcome screen, then hotel name and WhatsApp → cages (one-tap
Home / Small / Large presets, then counts and nightly prices per size) → a done screen with
the first task to pick. Each step has an illustration from `public/illustrations`. "Explore
with sample data" skips it and fills every screen. Once a hotel exists, `/app/onboarding`
redirects to `/app`; Settings → Delete all data brings the onboarding back.

Sign in and sign up: `/app/login` and `/app/register` (also reachable as `/login` and `/register`).
Everything else under `/app` needs an account, and each account has its own hotel data.
Accounts are a **mock** for now (see below); the pages talk to an `AuthService` interface, so a real
backend replaces one file.

Two modes, switched in the sidebar, on the More page or in Settings (kept per account, and only changing what is
shown): **Simple** is the everyday core with fewer fields (quick check-in, one-tap "paid in full", a care log you fill
in with taps); **Advanced** adds Customers, Payments, Reports and every option. On a phone the tab bar has the four
everyday pages plus More.

Pages: Today (arrivals, departures, who is staying and whether their report went out,
vaccine alerts, a "getting started" list for new hotels), Bookings (upcoming / staying /
past), the booking page (check-in record, payments, daily care log, the report for the owner,
ready-made WhatsApp messages, change dates or cage, cancel), Calendar (14 days by cage; tap a
free day to book it), New booking (only free cages are offered, so a cage can't be double-booked;
a new pet + owner can be added inline), Pets (search, vaccine status), Cages (tonight's status,
add/edit), Customers and a customer's page (advanced), Payments: what is owed, grouped by urgency, with a WhatsApp
reminder ready (advanced), Reports: occupancy, money received, returning guests, CSV export (advanced), Help, and Settings
(hotel profile, mode, language, download and restore a JSON backup, reset).

Check-out asks first when money is still owed. Payments are recorded by hand (cash, QRIS,
transfer); nothing here talks to a bank. WhatsApp messages open the operator's own WhatsApp with
the text filled in (a `wa.me` link); nothing is sent until they press send, and they are always in
Indonesian. The app works offline after the first visit (service worker scoped to `/app`).

More in [`docs/product`](../docs/product/README.md): audit, research, roadmap, metrics.

```
src/app/
  domain/          types.ts (Hotel, Cage, Owner, Pet, Booking with payments and arrival,
                   care log), logic.ts (pure: dates, availability, totals, vaccine state),
                   bookingRules.ts (what makes a booking valid, how a stay moves, what may
                   change), payments.ts, careLog.ts, calendar.ts, messages.ts. No React.
  store/           actions.ts (pure state changes that enforce the rules), AppStore.tsx
                   (React wiring, autosave), storage.ts (HotelRepository: validated
                   localStorage with a backup; swap for an API later), sampleData.ts
  testing/         test fixtures
  i18n/            en.ts (default) / id.ts app copy; follows the site's EN/ID switch
  design-system/   Atomic design
    atoms/         Button, Icon, Input/Select/Textarea, Badge, Avatar, Heading/Muted
    molecules/     Field, Stepper, StatCard, EmptyState, Segmented, SearchField,
                   Alert, ConfirmDialog, ProgressSteps
    organisms/     AppNav, PageHeader, BookingCard, PetRow, CageTile, BookingForm, PetForm,
                   CageForm, CheckInForm, ArrivalSummary, PaymentsPanel, CareLogPanel,
                   ReportPanel, MessagesPanel, BookingEditForm, CalendarGrid, StayingRow,
                   FirstSteps
    templates/     AppLayout (sidebar / phone tab bar), FocusLayout (sign in, sign up, setup)
    tokens.css     app tokens incl. semantic status colours
  pages/           one file per route + AppRoutes.tsx
```

### Demo accounts and mock data

While there is no backend, demo mode is on (`src/app/config.ts`):

| Email | Password | What it is |
|---|---|---|
| `demo@pethommie.id` | `Demo1234` | A pet hotel with sample bookings |
| `baru@pethommie.id` | `Demo1234` | A brand-new owner: goes straight to setup |

The login page lists them with a one-tap "Use". The sign-up page has "Fill with sample data", which
fills a different made-up person each time (emails are `…@example.com` with a random number, so
repeats never collide). Set `VITE_DEMO_MODE=false` at build time (see `.env.example`) to remove all of
this for a real launch.

`auth/`: `validation.ts` (sign-up and login rules, pure), `password.ts` (PBKDF2 hashing),
`AuthService.ts` (the interface), `localAuthService.ts` (the mock: accounts in localStorage),
`AuthProvider.tsx` + `guards.tsx` (who is signed in; who may see what).

Rules of thumb: atoms and molecules never touch the store; organisms get data and
callbacks as props; pages connect the store to organisms. Business rules live in
`domain/logic.ts` so the future backend can share them.
