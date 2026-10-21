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
    ui/        Hanko (seal mark), LanguageSwitch, Loading, Select (our own dropdown, used instead of
               the browser's <select> in the app and on the site)
    lib/       phone.ts (WhatsApp numbers), bookingLink.ts (the booking link: packing a hotel into the
               URL, reading it back, the WhatsApp request it sends)
    testing/   select.ts (pick an option in a Select from a test)
    styles/    base.css: resets, type tokens, focus ring
  site/      the marketing site (landing page)
    i18n/      en.ts (default) and id.ts: all copy, caption and clock timings, prices; useSiteT
    content/   film registry: frame count, duration, paper colour, focus box (one film: the turntable)
    components/  ink (the scroll film), layout (TopBar, Footer), ui
    sections/  Hero, Problem, BeforeAfter, Features, Kinds, LinkSpot, ProductTour, Pricing, Faq,
               FinalCta (with WaitlistForm)
    pages/     LandingPage, BookPage (/book, a hotel's public booking page), LegalPage, NotFoundPage
    hooks/ lib/ styles/
  app/       the operator product (see below)
  App.tsx    routes: site pages, and /app/* lazy-loaded
  main.tsx   entry; loads base + site CSS before any component CSS
public/
  films/turntable/   213 WebP frames of the illustrated turntable film (17.75 s, 12 fps, 1600 px)
  screens/           app screens captured for the landing page (scripts/capture-*.mjs)
media/             source videos from Higgsfield (kept out of public/, so not deployed)
resources/         raw images and photos you drop in; scripts/prepare-resources.py makes the
                   web versions in public/illustrations, public/icons/nav, public/icons/ui, public/backgrounds
                   and public/photos (see resources/README.md)
```

Import rules: `./x` only for files in the same folder; everything else through the `@/` alias
(`@/shared/ui/Hanko`). Each surface scopes its CSS to `body.site` or `body.app`, so styles never leak.

## How the scroll film works

The video is pre-split into frames and drawn to a `<canvas>` based on scroll
position (the same approach Apple uses on product pages). This scrubs smoothly
forwards and backwards on every browser, which seeking a `<video>` does not.

- Frames load coarse-to-fine (every 30th, 10th, 3rd, then all) so a fast scroll shows the whole story early.
- Scroll handling runs once per animation frame and never re-renders React.
- One film ships: the turntable (`public/films/turntable`). There is no film switcher.
- Captions come from `chapters[]` in each `site/i18n/*.ts` file: `at` is the second of the film they belong
  to, `moment` picks the caption's illustrated icon (from `public/icons/nav`) and the small app screen drawn beside
  it (`components/ink/Moment.tsx`, sample data from `film.moments`). A caption is that icon, a title and one line
  (`components/ink/Chapter.tsx`); there is no day-and-time eyebrow.
- The clock under the film (`film.clock`) names the stage of the stay (Booking in, Arrival, Check-in … Pickup),
  not the hour.
- Wide screens: a deck on the left shows the opening (the hero), then one caption and its app screen at a time; the
  scene fills the rest. The turntable is a small diorama in a wide frame, so it gives a `focus` box
  (`content/film.ts`) and is fitted into the area beside the deck.
- Phones and portrait tablets (≤720 px, or portrait up to 1100 px): the scene sits above the same
  deck, so captions never cover the illustration. Screen readers get the captions as a list.

To replace the film with a new video:

```bash
ffmpeg -i new.mp4 -vf "fps=12,scale=1280:-1" -c:v libwebp -quality 72 public/films/<id>/f%04d.webp
```

Then register it in `site/content/film.ts` and add its chapter/clock timings in `site/i18n/en.ts` and `site/i18n/id.ts`.
The turntable is built from 10 HD keyframes: 9 Wan 3.0 clips (1080p, 2 s, start frame → end frame),
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

Sections of the landing page (`src/site/sections`, in order): the film (the story of one stay, with the hero as its
opening; each caption has a drawn phone in the film's style, not a screenshot), Problem (what running without a system
costs, as three numbers for an example hotel, each with its assumption, from `site/lib/leaks.ts`), BeforeAfter (the same
front desk in a mess and calm, with four changes), Features (an illustration for each and one line of words; the real app
is only in the tour), Kinds (who it's for: cages, cage-free and daycare, home boarding, cattery), LinkSpot (the booking link in
three steps, saying plainly that nothing is paid on the page), Product tour (the real app up close: screens behind
tabs, three numbered points marked on each, and the ask beside them), Pricing, FAQ (with a puzzled dog and cat in the
corners), and a last call to action on a paper scene, with an optional "help me set up" form. After the film the page
keeps moving with the scroll (`site/hooks/useScrollEffects.ts`: pictures drift, blocks rise into place; nothing moves
with reduced motion). There is no demo to link to, and the site never links to one. Kept short on purpose; plus `/privacy` and `/terms`
(`site/pages/LegalPage.tsx`, words in the site copy, written to describe what the product does today). Nothing on it
is invented: there are no testimonials or customer numbers, and what isn't built is marked **Coming soon**.

`/book#<code>` (`site/pages/BookPage.tsx`) is a hotel's public booking page, opened from the link the hotel makes
in the app. Everything about the hotel (name, WhatsApp, prices, the pets it takes, a note, its language) is carried
in the part of the link after `#` (`shared/lib/bookingLink.ts`), so no server is involved and nothing is stored. The
owner fills in a short form, which opens WhatsApp to the hotel with the request written out in the hotel's
language; it ends with a link that opens a new booking in the app with the dates, the guest and the source "Booking
link" filled in. Nothing is booked or paid on the page.

Screens are captured from the running app: `npm run build && npx vite preview --port 4173`, then
`node scripts/capture-screens.mjs` (the tour's laptop and phone views, and where its numbered points sit, written to
`src/site/content/tourSpots.ts`); set `PW_CHROMIUM` if needed. Then `python3 scripts/prepare-resources.py --screens` turns the PNGs into WebP (phone shots up to 520 px wide,
the tour's laptop views 1600 px, the rest 640 px); commit `public/screens/`. Run them again when the app's look
changes.

Company name, contact email and WhatsApp for the footer, legal pages and Help come from environment variables
(`web/.env.example`); anything unset is not shown.

## Operator app (`/app`, no backend yet)

The SaaS lives under `/app` as its own lazily-loaded bundle. A first visit goes to
`/app/onboarding`: a welcome screen, then hotel name and WhatsApp → where pets stay: cages (one-tap
Home / Small / Large presets, then counts and nightly prices per size) or shared rooms for a cage-free hotel (how
many pets each takes, the price per pet per night) → a done screen with the first task to pick. "Explore
with sample data" skips it and fills every screen (a small hotel in Simple mode, a big one in Advanced). Once a
hotel exists, `/app/onboarding` redirects to `/app`; Settings → Delete all data brings the onboarding back.

Sign in and sign up: `/app/login` and `/app/register` (also reachable as `/login` and `/register`).
Everything else under `/app` needs an account, and each account has its own hotel data.
Accounts are a **mock** for now (see below); the pages talk to an `AuthService` interface, so a real
backend replaces one file.

Two modes, switched in the sidebar, on the More page or in Settings (kept per account, and only changing what is
shown): **Simple** is the everyday core with fewer fields (quick check-in, one-tap "paid in full", a care log you fill
in with taps); **Advanced** adds Customers, Payments, Transactions, Expenses, Invoices, Finance, Tax and every option. On Simple,
Settings opens with a card of what Advanced adds and one button that switches (the data stays as it is). On a phone
the tab bar has the four everyday pages plus More.

Pages: Today (arrivals, departures, who is staying and whether their report went out,
vaccine alerts, a "getting started" list for new hotels, a No-show button on late arrivals, a reminder to download a
backup when there is none or the last is a week old), Dashboard (`/app/dashboard`: tonight's places, this month
against last, money per month, the next 14 nights, what is owed, arrivals this week, vaccine alerts, overdue invoices,
this week's incidents, this month's tax estimate), Bookings (upcoming / staying / past, with filters by payment, unit, source and species),
the booking page (check-in record, payments, daily care log, the report for the owner,
ready-made WhatsApp messages, change dates or cage, cancel: why (owner, no-show, the hotel) and how much of what was
paid to give back; the stay's invoice is voided), Calendar (14 days by cage or room; tap a
free day to book it), New booking (starts with the owner: search by name, WhatsApp or a pet's name, pick them and
tick which of their pets are staying, or add a new owner and pet; only free places are offered, so a unit can't be
overbooked), Pets (who is staying or arriving, filters by stay, species and vaccine), Cages (tonight's status, cages
and shared rooms, add/edit; a unit with past stays is archived instead of deleted and can be restored from the
Archived list; called cages, rooms or spaces, as the hotel chooses in Settings), Customers and a
customer's page (advanced; segments: owes, regular, new, inactive), Payments: what is owed, grouped by urgency, with a
WhatsApp reminder ready (advanced), Transactions (`/app/transactions`, advanced: every payment and refund in a period
as a cash book, filtered by method and kind, totals per method, CSV), Expenses (`/app/expenses`, advanced: what the
hotel spends, by month, in 13 categories split into direct and operating costs; marked monthly ones brought into the
next month in one tap; search, totals, CSV), Finance (`/app/finance`, advanced: profit and loss for this month, last
month, 3 months, this year or 12 months, on money received or on stays completed; gross and net profit, margin, the
PPh final estimate, income vs expenses and profit by month as charts, income and cost per night sold, the break-even
in nights a month and as occupancy; CSV and print/PDF), Receipts
(`/app/receipts/:bookingId/:paymentId`: one per payment, numbered `KW-YYYYMMDD-NN`, the amount in words, to print,
save as PDF or send on WhatsApp), Invoices (advanced: the register by month or all, each one paid / partly paid /
unpaid / overdue / void, CSV) and an invoice's page (a WhatsApp reminder once it is overdue), Tax (advanced, an
estimate), Reports (periods: this month, last month, 30 or 90 days, this year or your own dates; filters by unit and
species; occupancy by places, money in, average rate, lead time, repeat stays, cancellations and no-shows against the previous
period; busy weekdays; breakdowns by source, method, species, unit and top customers; CSV export), Booking link
(`/app/link`: language, price list on or off, the pets taken, a note; a live preview, copy, share on WhatsApp, open;
see `/book` above), Help, and Settings (hotel profile, what the hotel calls its places, an optional rule that holds check-in until a valid
vaccination card is seen, mode, language, download and restore a JSON backup, reset).

Check-out asks first when money is still owed, and when the pet leaves on another day than booked: an early pickup
can end the stay today (fewer nights), a late one adds the extra nights if the unit is free; the balance shown follows
the choice. A stay keeps the nightly rate it was booked at, so a later price change doesn't change old stays (moving
it to another unit takes that unit's price). A pet whose stays started, were paid or invoiced can't be deleted.
Payments are recorded by hand (cash, QRIS,
transfer, e-wallet, card; as a deposit, a payment or a refund, with an optional bank or QRIS reference); nothing here
talks to a bank. Paying more than the total is pointed out, with a one-tap refund; a cancelled stay can still give
money back. WhatsApp messages open the operator's own WhatsApp with
the text filled in (a `wa.me` link); nothing is sent until they press send, and they are written in the owner's
language (Indonesian unless the owner is set to English). Every dropdown is our own `Select` (`shared/ui/Select.tsx`),
not the browser's: same `<option>` children and `onChange`, keyboard like a native select. The app works offline after
the first visit (service worker scoped to `/app`).

More in [`docs/product`](../docs/product/README.md): audit, research, roadmap, metrics.

```
src/app/
  domain/          types.ts (Hotel, Cage with capacity, Owner, Pet, Booking with payments,
                   rate, source and arrival, care log, Expense), logic.ts (pure: dates,
                   availability, totals, vaccine state), bookingRules.ts (what makes a booking
                   valid, how a stay moves, what may change, which pets have history),
                   payments.ts, careLog.ts, calendar.ts, messages.ts,
                   charges.ts, invoices.ts, tax.ts, customers.ts, csv.ts, reports.ts (periods,
                   filters, breakdowns), dashboard.ts, ledger.ts (transactions, receipt numbers,
                   invoice states), words.ts (amounts in words), filters.ts (list filters),
                   guest.ts (owner and pets of a booking), linkCard.ts (what the booking link
                   carries), finance.ts (expenses, profit and loss, break-even, CSVs). No React.
  store/           actions.ts (pure state changes that enforce the rules), AppStore.tsx
                   (React wiring, autosave), storage.ts (HotelRepository: validated
                   localStorage with a backup; swap for an API later), backupNote.ts (when a
                   backup was last downloaded), sampleData.ts (small hotel) and
                   sampleAdvanced.ts (big hotel, from a fixed seed)
  testing/         test fixtures
  i18n/            en.ts (default) / id.ts app copy; follows the site's EN/ID switch
  design-system/   Atomic design
    atoms/         Button, Icon, Input/Select/Textarea (Select is shared/ui/Select), Badge,
                   Avatar, Heading/Muted
    molecules/     Field, Stepper, StatCard, EmptyState, Segmented, SearchField, FilterBar,
                   Alert, ConfirmDialog, ProgressSteps
    organisms/     AppNav, PageHeader, BookingCard, PetRow, CageTile, BookingForm, PetForm,
                   CageForm, CheckInForm, ArrivalSummary, PaymentsPanel, CareLogPanel,
                   ReportPanel, MessagesPanel, BookingEditForm, CalendarGrid, StayingRow,
                   FirstSteps, GuestPicker, ReceiptDocument, InvoiceDocument, BarList,
                   ColumnChart, PairChart, SignedChart, UpgradeCard
    templates/     AppLayout (sidebar / phone tab bar), FocusLayout (sign in, sign up, setup)
    tokens.css     app tokens incl. semantic status colours
  pages/           one file per route + AppRoutes.tsx; useCheckOut and useCancelBooking
                   (the check-out and cancel dialogs)
```

### Demo accounts and mock data

While there is no backend, demo mode is on (`src/app/config.ts`):

| Email | Password | What it is |
|---|---|---|
| `demo@pethommie.id` | `Demo1234` | A small pet hotel with sample bookings, Simple mode |
| `baru@pethommie.id` | `Demo1234` | A brand-new owner: goes straight to setup |
| `pro@pethommie.id` | `Demo1234` | A big hotel with cages and shared rooms and six months of history, Advanced mode |

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
