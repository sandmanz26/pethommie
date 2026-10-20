# Architecture

How Pethommie is put together, the rules that keep it that way, and what to change when it grows.

## 1. Shape

One React 19 + TypeScript + Vite app with two surfaces and a shared layer:

```
src/
  shared/   used by both surfaces; depends on neither
  site/     marketing site: the scroll-film landing page          → /
  app/      the operator product                                  → /app/*
  App.tsx   routes. The only place (with main.tsx) that sees both surfaces.
```

Dependencies point one way:

```
site ──► shared ◄── app          site and app never import each other
```

ESLint enforces it (`eslint.config.js`): `shared` may not import `site` or `app`; `site` may not
import `app`; `app` may not import `site`. Imports across folders use the `@/` alias, never `../`.
The rule is tested by breaking it; see `git log` for the restructure commit.

Why: the site is eagerly loaded and the app is lazy-loaded (its own bundle). Anything the app
imported from the site would drag site code, and its CSS, into the product.

## 2. The operator app (`src/app`)

Four layers, each allowed to know only about the ones below it:

| Layer | Folder | Knows about | Rule |
|---|---|---|---|
| Pages | `pages/` | everything below | Connect the store to organisms. One file per route. |
| Design system | `design-system/` | atoms → molecules → organisms → templates | Atoms and molecules never touch the store. Organisms get data and callbacks as props. |
| Store | `store/` | domain | `actions.ts` (pure state transitions), `AppStore.tsx` (React wiring + autosave), `storage.ts` (persistence). |
| Domain | `domain/` | nothing (no React, no browser) | Types and business rules as pure functions. |

### Where a rule lives

A business rule (no double booking, a stay only moves forward, a cage with live stays can't be
removed) lives in `domain/bookingRules.ts` and is **enforced in `store/actions.ts`**, so nothing
can put the data in a bad state, whichever screen or future API calls it. Forms use the same
rule functions only to explain problems early (`scheduleIssues` in `BookingForm`).

To add a rule: write it in `domain/`, call it from the relevant action (which should refuse by
returning the unchanged state and a reason), surface the reason in the form, add tests.

### Accounts and sign-in (`app/auth`)

Everything under `/app` except `login` and `register` needs an account. `RequireAuth` sends signed-out
visitors to `/app/login` and remembers where they were going; `GuestOnly` sends signed-in people on
(back to that page, or `/app`). `landingAfterLogin` only ever returns a path inside `/app`, so a crafted
link can't turn the login screen into an open redirect.

`AccountData` gives each account its own store, keyed by account id: signing out and in as someone
else starts from *their* hotel and nothing of the previous one stays in memory. Data lives under
`pethommie.app.v1.<accountId>`.

The pages only ever talk to the `AuthService` interface (`restore`, `register`, `login`, `logout`; all
async). Today the implementation is `localAuthService`: accounts in localStorage, passwords hashed with
PBKDF2-SHA256 and a per-account salt, never stored or returned as typed. **This is a stand-in, not
security**: anyone with access to the browser can read or change that data. To go live, write an
API-backed `AuthService` (sessions in an HttpOnly cookie, the same rules in `validation.ts` run on the
server, rate limiting, email verification, password reset) and change one line in `defaultService.ts`.

Mock data is gated by `DEMO_MODE` (`VITE_DEMO_MODE`, on by default for now): two seeded accounts and a
sign-up helper. Turn it off for a real launch and delete `demoAccounts.ts` with the mock service.

### State

`AppStore` keeps `HotelData` in React state and mirrors it in a ref. Every action reads the latest
value from the ref, so several actions in one event (save the owner, then the pet, then the
booking) each see the one before. Do not read `data` from a render's closure inside an action.
State is saved to the repository after every change; a failed save raises `saveFailed`, which
the layout shows as a warning.

### Persistence

`HotelRepository` (`store/storage.ts`) is the only thing that knows where data lives. Today:
`localStorage`, one document per account under `pethommie.app.v1.<accountId>`, `version: 2`.

- Reads are validated (`parseStored`). Anything unreadable or from a newer app version comes
  back as empty data **and the original is copied to `<key>.backup` first**, because
  the first autosave would otherwise overwrite it.
- Older documents are upgraded on read. v1 → v2 turns each booking's single `deposit` into a
  `payments` list (so no money is lost) and adds `arrival`, `careLog` and `reportsSent`. The
  untouched v1 document is kept once as `<key>.v1.backup`.
- When `HotelData` changes shape: bump `CURRENT_VERSION`, add a step that upgrades the previous
  version inside `parseStored`, add tests for old documents (see `storage.test.ts`).

### A stay, end to end

A `Booking` carries its own money and record: `payments[]` (cash / QRIS / transfer, entered by
hand; nothing talks to a bank) and `arrival` (the check-in record). The daily `careLog` and the
`reportsSent` marks sit at the top level, keyed by booking. Rules live in `domain/`:
`payments.ts` (paid, balance, status), `careLog.ts` (what may be logged, for whom),
`calendar.ts` (where a stay sits on a cage's row), `bookingRules.ts` (`editIssues`: what may change
once a stay exists) and `messages.ts` (the WhatsApp texts).

Messages to owners are always Indonesian whatever language the operator's screen uses, and the
words come from the domain, not from the app's i18n. WhatsApp is reached with a click-to-chat link
(`https://wa.me/<number>?text=…`) from the operator's own number; there is no API and nothing is
sent until the operator presses send in WhatsApp. No length limit for `?text=` is documented, so
the text is also shown for copying.

### Offline (PWA)

`vite-plugin-pwa` generates a service worker that precaches the built app, fonts, icons and
illustrations. It is registered only from the operator app (`app/pwa/useServiceWorker.ts`) with
scope `/app`, so the website and its large films are never controlled by it. Updates are
offered in a banner, never forced, so a reload can't interrupt someone mid-form. Fonts are
self-hosted (`@fontsource-variable`), which is what lets them work offline and keeps the CSP
free of third parties.

## 3. Moving to a backend

The decision, the schema, the sync design and what is left are in [`docs/backend`](backend/README.md). In short:
Supabase (Postgres + auth + storage), the app stays local-first and syncs changes. Already built and tested:

- `backend/supabase/migrations/0001_init.sql`: tables, constraints (no double booking, same-hotel references), row
  level security. Run on a real Postgres by `web/src/app/sync/schema.test.ts`.
- `web/src/app/sync/`: `rows.ts` (data ⇄ rows), `diff.ts` (what changed between two states, applying and
  merging changes), `gateway.ts` (what the app needs from a server, plus an in-memory one), `ids.ts` (UUIDs).

Left: a Supabase implementation of `AuthService` and of `HotelGateway`, a persistent outbox, and a sync status in
the UI. The seams:

1. `HotelRepository` stays synchronous (it returns the local copy); changes from the server arrive by replacing the
   state, as Restore a backup already does.
2. The rules in `domain/` have no React or browser dependencies: the same rules run on the server and the client's
   checks are a convenience. The one that can't be left to the client, no double booking, is also a database
   constraint.
3. `site/lib/waitlist.ts` has a `WaitlistStore` interface. Entries are currently stored only in the visitor's own
   browser, so **the owner of the product cannot see sign-ups**. The `join_requests` table is the fix (phase 2).

## 4. Styling

Plain CSS with custom properties. No runtime CSS-in-JS.

- `shared/styles/base.css`: resets and the type tokens (`--font-display`, `--font-body`).
- Each surface scopes its palette and page rules to a class on `<body>`: `body.site`, `body.app`.
  A hook (`useBodyTheme`) sets it per route before first paint. So neither surface's rules can
  reach the other. (They did before this was introduced.)
- Site CSS loads from `main.tsx` **before** any component, because some component rules
  (e.g. `.section--flush-top`) override `.section` and rely on coming later. Keep that order.
- Page rules that would raise specificity use `:where(body.site)` so component classes still win.
- App tokens (`app/design-system/tokens.css`) are on `body.app` and `.app-root`; the app's
  components use them and never the site's.

## 5. Language

English is the default; Indonesian is the other. `shared/i18n` owns *which* language
(`LocaleProvider`). Each surface owns its own copy: `site/i18n/{en,id}.ts` and
`app/i18n/{en,id}.ts`. `en` defines the shape and TypeScript fails the build if `id` is missing a
key; a test also checks the shape and, for the site, that captions are timed identically.

## 6. The scroll films (`site/components/ink`, `site/content/film.ts`)

A video is pre-split into 12 fps WebP frames in `public/films/<id>/` and drawn to a sticky
`<canvas>` from the scroll position (no `<video>` seeking, so it scrubs smoothly both ways).
`film.test.ts` checks the registry against the files on disk and that every caption and clock
label sits inside the film, so replacing a film can't silently break the timings. How to make a
film: `web/README.md`. Raw art goes in `web/resources/`; `web/media/` holds source videos and is
not deployed.

## 7. Testing

`npm test` (Vitest, jsdom + Testing Library). What is covered, and why there:

- Domain rules and store actions: the part where a bug costs a customer data.
- Storage: corrupt, newer-version, full and blocked storage; the v1 → v2 upgrade.
- Real flows through the router: first visit → onboarding → saved data; booking with a new pet;
  only free cages offered; an existing hotel skips onboarding; check-in, payments, check-out
  with a balance, the care log, the report link, editing a stay, the calendar (`stay.test.tsx`).
- The rules above were checked by mutation: breaking each one makes a test fail.
- Site integrity: film frames vs registry, caption timing, copy structure.
- Error boundary, including the "old tab after a deploy" reload.

`npm run e2e` (Playwright, run in CI against the built site) covers a day at the hotel in a real
browser, axe accessibility on every operator screen at desktop and phone width, no sideways
scrolling, and opening the app offline.

Not covered by automated tests: how things look, and the canvas drawing. Both were checked by
capturing screenshots before and after structural changes and comparing them. Screenshot tests
in CI are the next step if the UI changes often.

## 8. Deploy and hardening

- Vercel, Root Directory `web`. `web/vercel.json`: SPA rewrite (so `/app/bookings` survives a
  refresh), security headers (CSP, `X-Frame-Options`, `nosniff`, referrer and permissions policy),
  long cache for hashed assets, a day for films and illustrations, `X-Robots-Tag: noindex` on
  `/app/*`.
- The CSP allows inline *styles* (React sets some); fonts and scripts are `self` only. If you
  add a third-party script or API, extend it in `vercel.json`.
- After a deploy, tabs opened earlier ask for JS files that no longer exist. `ErrorBoundary` detects
  that and reloads once; any other error shows a way out instead of a blank page.
- `sw.js` and the manifest are served with `max-age=0, must-revalidate` so a new version is noticed.
- CI (`.github/workflows/ci.yml`): typecheck, lint, tests, build, a production dependency audit,
  and the Playwright suite.

## 9. Known gaps

Honest list, roughly by importance:

1. No backend or real authentication (§2: the accounts are a mock) and no multi-device sync. Data lives in one browser; clearing site data loses it
   (Settings has a JSON export). Two tabs of the same hotel can overwrite each other.
2. Sign-ups from the landing page aren't visible to the owner (see §3.4).
3. One hotel per account; no staff roles or invitations. No password reset, email verification or
   rate limiting (all need a server).
4. Binary assets (about 37 MB of frames, source videos and illustrations) live in git. Fine now; consider
   Git LFS or an asset bucket if they keep growing.
5. No screenshot tests in CI (§7). The landing page's tour images are captured by a script, not on every build.
6. Offline works per phone: data is not synced, and nothing here has been tried on a real Android
   phone or Safari yet (see `docs/product/riset.md` §6).
