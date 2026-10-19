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
`localStorage`, key `pethommie.app.v1`, document `version: 1`.

- Reads are validated (`parseStored`). Anything unreadable or from a newer app version comes
  back as empty data **and the original is copied to `pethommie.app.v1.backup` first**, because
  the first autosave would otherwise overwrite it.
- When `HotelData` changes shape: bump `CURRENT_VERSION`, add a step that upgrades the previous
  version inside `parseStored`, add tests for old documents.

## 3. Moving to a backend

The seams are in place:

1. Implement `HotelRepository` against an API. `load()` becomes async (give `AppStoreProvider`
   a loading state); `save()` becomes a per-action call instead of "write the whole document".
2. The rules in `domain/` have no React or browser dependencies: run them on the server as well
   and treat the client's checks as a convenience.
3. Real auth (§2), and a hotel id on every record. Today there is exactly one hotel per account.
4. `site/lib/waitlist.ts` has a `WaitlistStore` interface with the same idea. Entries are
   currently stored only in the visitor's own browser, so **the owner of the product cannot see
   sign-ups**. Fix this first when a backend exists.

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
- Storage: corrupt, newer-version, full and blocked storage.
- Real flows through the router: first visit → onboarding → saved data; booking with a new pet;
  only free cages offered; an existing hotel skips onboarding.
- Site integrity: film frames vs registry, caption timing, copy structure.
- Error boundary, including the "old tab after a deploy" reload.

Not covered by automated tests: how things look, and the canvas drawing. Both were checked by
capturing screenshots before and after structural changes and comparing them. Adding Playwright
with screenshot tests to CI is the next step if the UI changes often.

## 8. Deploy and hardening

- Vercel, Root Directory `web`. `web/vercel.json`: SPA rewrite (so `/app/bookings` survives a
  refresh), security headers (CSP, `X-Frame-Options`, `nosniff`, referrer and permissions policy),
  long cache for hashed assets, a day for films and illustrations, `X-Robots-Tag: noindex` on
  `/app/*`.
- The CSP allows inline *styles* (React sets some) and Google Fonts; scripts are `self` only. If you
  add a third-party script or API, extend it in `vercel.json`.
- After a deploy, tabs opened earlier ask for JS files that no longer exist. `ErrorBoundary` detects
  that and reloads once; any other error shows a way out instead of a blank page.
- CI (`.github/workflows/ci.yml`): typecheck, lint, tests, build, and a production dependency audit.

## 9. Known gaps

Honest list, roughly by importance:

1. No backend or real authentication (§2: the accounts are a mock) and no multi-device sync. Data lives in one browser; clearing site data loses it
   (Settings has a JSON export). Two tabs of the same hotel can overwrite each other.
2. Sign-ups from the landing page aren't visible to the owner (see §3.4).
3. One hotel per account; no staff roles or invitations. No password reset, email verification or
   rate limiting (all need a server).
4. Binary assets (about 37 MB of frames, source videos and illustrations) live in git. Fine now; consider
   Git LFS or an asset bucket if they keep growing.
5. No visual or end-to-end tests in CI (§7).
