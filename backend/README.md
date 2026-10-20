# Backend

The server side of Pethommie. Prepared, not connected: see [`docs/backend`](../docs/backend/README.md) for the plan
and the decisions.

```
supabase/migrations/   numbered SQL files, applied in order. Never edit one that has been applied: add the next.
```

`0001_init.sql` is tested without any database installed: `cd web && npm test` runs it on PGlite (Postgres compiled to
WebAssembly) with a stub of Supabase's `auth` schema, in `web/src/app/sync/schema.test.ts`.
