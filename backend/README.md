# Backend

The server side of Pethommie. Prepared, not connected: see [`docs/backend`](../docs/backend/README.md) for the plan
and the decisions.

```
supabase/migrations/   numbered SQL files, applied in order. Never edit one that has been applied: add the next.
  0001_init.sql                                  tables, constraints, row level security
  0002_charges_companions_invoices.sql           charges, pets sharing a stay, invoices
  0003_shared_rooms_payment_kinds_sources.sql    cages.capacity (the trigger keep_unit_within_capacity replaces the
                                                 exclusion constraint), payments.kind and .reference, e-wallet and
                                                 card methods, bookings.source
```

The migrations are tested without any database installed: `cd web && npm test` runs it on PGlite (Postgres compiled to
WebAssembly) with a stub of Supabase's `auth` schema, in `web/src/app/sync/schema.test.ts`.
