# Backend plan

Status: **prepared, not connected.** The schema, the mapping between the app's data and the server's rows, the sync
logic and a fake server exist and are tested. Nothing in the running app talks to a server yet. This page says what
was decided, what is already built, what is next, and what only the owner of the product can decide.

## 1. Decision

**Supabase** (managed Postgres, auth, file storage, row level security, edge functions), with the app staying
local-first.

Why:
- The product is relational (cage → booking → payments, pet → owner) and has one rule that must never fail: a cage
  can't be double-booked (and a shared room can't take more stays than it has places). Postgres enforces that itself,
  also for two phones booking at the same moment: `0001` with an exclusion constraint, and since `0003` with a
  trigger (`keep_unit_within_capacity`) that locks the unit and refuses a night over its capacity. A document
  database can't.
- Multi-tenancy is a database feature here (row level security), not code we have to remember to write on every query.
- Auth, file storage (vaccine cards, pet photos) and edge functions (the public booking link) come with it, so the team
  doesn't have to run a server to start.
- It is plain Postgres underneath. `backend/supabase/migrations/0001_init.sql` runs on any Postgres 15+ with a
  stub of Supabase's `auth` schema (that is how it is tested), so leaving is a migration, not a rewrite.

Considered and not chosen: **a custom Node API + Postgres** (more control, but auth, storage, row-level isolation
and operations all become our work before the first customer); **Firebase** (no relational integrity, no exclusion
constraint, harder to export). Revisit if the product outgrows Supabase's limits or an Indonesian data-residency
requirement rules it out (see §6).

## 2. What exists

| Piece | Where | Proven by |
|---|---|---|
| Schema, constraints, row level security | `backend/supabase/migrations/0001_init.sql` | `web/src/app/sync/schema.test.ts` runs it on a real Postgres (PGlite) |
| Charges, shared cages, invoices (tables `charges`, `booking_pets`, `invoices`; an issued invoice can only be voided) | `backend/supabase/migrations/0002_charges_companions_invoices.sql` | same PGlite tests, incl. the invoice protection trigger |
| Shared rooms (`cages.capacity`, the trigger `keep_unit_within_capacity` replacing the exclusion constraint), payment `kind` (deposit, payment, refund) and `reference`, e-wallet and card methods, `bookings.source` | `backend/supabase/migrations/0003_shared_rooms_payment_kinds_sources.sql` | same PGlite tests: a shared room takes stays up to its places and no more; only known kinds and methods |
| A stay keeps its nightly `rate`, `cancel_reason` (owner, no-show, hotel; required exactly when cancelled), `cages.archived` (the trigger `bookings_not_in_archived_unit` refuses new or moved stays there), `expenses` (13 categories, whole amounts above zero, row level security) | `backend/supabase/migrations/0004_rates_cancellations_archive_expenses.sql` | same PGlite tests: a cancelled stay needs a reason and only it; an archived unit takes no new stay but keeps its old ones; expenses refuse 0, unknown categories and methods |
| Data ⇄ rows | `web/src/app/sync/rows.ts` | round-trips the whole sample hotel through the database |
| Stable UUIDs for old ids | `web/src/app/sync/ids.ts` | unit tests; `newId()` now always makes a UUID |
| Diff / apply / merge of changes | `web/src/app/sync/diff.ts` | replays a day's actions: each step's diff rebuilds the next state |
| Server contract + in-memory server | `web/src/app/sync/gateway.ts` | pull, push, "pull first", double booking refused |
| Backup restore (also how a hotel's local data will be uploaded) | Settings → Restore a backup | UI tests |
| `AuthService` interface | `web/src/app/auth/AuthService.ts` | the mock implements it; a Supabase one replaces it |

The database tests show, with a real Postgres: a double booking is refused (and a cancelled or finished stay doesn't
count), and a shared room takes no more stays than its places; an archived unit takes no new stays; check-out must be after check-in; payments are whole rupiah above zero; a record can't point at another
hotel's record; a hotel's members see only their hotel, strangers see nothing, staff can work but not manage
members; the sign-up list takes entries from anyone and can be read by no one through the API. Each of these was
checked by breaking the rule and seeing the test fail.

Email and browser notifications are planned in [notifications.md](notifications.md) (not built).

## 3. Shape

```
 phone / laptop (React app, works offline)
   store ──► local copy (localStorage today)  ◄── always read from here
     │
     │ every change: diffData(before, after) → outbox (kept on the device)
     ▼
   sync engine ──push/pull──►  Supabase
                                 ├─ Auth            accounts, sessions
                                 ├─ Postgres + RLS  hotels, members, cages, owners, pets, bookings, payments,
                                 │                  care_entries, reports_sent, expenses, join_requests
                                 ├─ Storage         vaccine cards, pet photos (later)
                                 └─ Edge Functions  booking link with a deposit, sign-up intake (later)
```

Tables: see the migration; every record table has `hotel_id`, and children point at parents with composite keys
`(id, hotel_id)`, so a pet or a booking can only ever refer to records of its own hotel. Rows are never deleted by the
app: `deleted_at` marks them, so a device that was offline hears about it when it syncs.

### Sync rules

- **Local first.** The app always reads and writes the local copy; the network only moves changes. The operator's
  day never waits on a connection.
- **Outbox.** After each change the store computes `diffData(before, after)`; the result is queued on the device and
  pushed when online (on start, when the connection returns, after a short pause following a change). Pushing the same
  change twice is harmless (it is an upsert).
- **Pull.** On start, on focus, and (later) when Supabase Realtime says something changed, ask for everything with
  `updated_at` after the cursor. Use the cursor minus a couple of seconds, because rows can commit slightly out of
  order; re-reading a few rows is harmless for the same reason.
- **Conflicts.** Last writer wins per record, by the server's `updated_at`. That is right for notes, prices and
  payments; the one case it can't settle is the one the database refuses: **two devices booking the same cage and
  nights.** The second push is refused (`double_booking`); the app shows which stay is affected and asks the operator
  to move it. Nothing is silently dropped.
- **Server time** is the only clock that orders changes, so a phone with the wrong time can't win a conflict.

## 4. Order of work

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Supabase project, apply the migrations (`0001` to `0004`), env vars on Vercel, CSP `connect-src` extended | schema tests green in CI against the real project's migrations |
| 1 | `supabaseAuthService`; register creates account + hotel (`hotels` insert makes the creator the owner); `createSyncedRepository` (local + outbox + pull); first sign-in on a device with local data offers to upload it | sign up on phone A, see the same hotel on phone B; airplane-mode day ends with everything synced |
| 2 | Sign-up form writes `join_requests` (anon insert); owner reads them in the Supabase dashboard | a landing sign-up appears for the owner |
| 3 | Staff invites (`hotel_members`), Realtime pull | a second person logs in to the same hotel |
| 4 | Storage (vaccine card, photos in the report), a deposit on the booking link (the link itself already works without a server: requests go to the hotel's WhatsApp), manual QRIS deposit confirmation | an owner books from a link; the cage locks |
| 5 | Optional: online payments (Xendit/DOKU), WhatsApp API | decided with the owner of the product |

Phase 1 is the real work. It adds: a Supabase client, an implementation of `HotelGateway` over it (`pull` =
select rows with `updated_at > cursor` including tombstones; `push` = one call that upserts and soft-deletes in a single
transaction, e.g. a Postgres function), a persistent outbox, and a small "synced / offline / conflict" status in the
app. `HotelRepository.load()` stays synchronous (it returns the local copy); remote changes arrive through
`importData`-style replacement, so the store needs no redesign.

Auth details: email + password to start (what the app's mock does); email verification and password reset come free.
The demo accounts stay behind `VITE_DEMO_MODE`. Never ship the service-role key to the browser: only the anon key.

## 5. Security checklist (before real customers)

- [ ] Row level security on every table (done in the migration; the tests prove isolation). Re-run the tests on
      every schema change.
- [ ] Service-role key only in server functions, never in the client or the repo.
- [ ] CSP in `web/vercel.json`: add the project's `https://<ref>.supabase.co` and `wss://<ref>.supabase.co` to
      `connect-src`; still no inline scripts.
- [ ] Rate-limit and captcha the sign-up form before it writes to the server (spam).
- [ ] Backups: turn on point-in-time recovery; test a restore once.
- [ ] No personal data in logs. Owners' names and WhatsApp numbers are personal data: encryption at rest comes from
      the provider; access is by RLS only.
- [ ] Account deletion: deleting a hotel cascades to everything in it (foreign keys are `on delete cascade`).
- [ ] Update the privacy policy **before** the first byte of customer data leaves a device, and have it reviewed
      (see §6). Today it truthfully says nothing is sent to us.

## 6. Decisions only the owner of the product can make

1. **Where the data lives.** Supabase's nearest region to Indonesia is Singapore. Whether storing Indonesian
   customers' personal data offshore is acceptable for your plans, and what Law No. 27 of 2022 (personal data
   protection) and its implementing rules require of you as the controller, is a question for an Indonesian lawyer.
   This is the one item that could change the choice of provider.
2. **Who is the legal entity** (name in the footer and policies) and **how people reach you** (set
   `VITE_COMPANY_NAME`, `VITE_CONTACT_EMAIL`, `VITE_CONTACT_WHATSAPP` in Vercel; they are not in the code).
3. **Sign-in method.** Email + password is the default. WhatsApp OTP is what operators use every day, but it needs a
   paid messaging provider.
4. **Pricing and billing**, before any charge: the landing page says free for 30 days and that the price is announced
   before anyone is charged.
5. **Data retention**: how long to keep a hotel's data after it stops using the product.
6. **Support**: who answers, and in which channel.

## 7. Running things

```bash
cd web && npm test                    # includes the schema tests (PGlite, no database needed)
# Against a real Supabase project (later):
npx supabase link --project-ref <ref> && npx supabase db push
```

Schema changes: add a new numbered file in `backend/supabase/migrations/` (never edit an applied one), change
`web/src/app/sync/rows.ts` and `web/src/app/domain/types.ts` together, and extend `schema.test.ts`.
