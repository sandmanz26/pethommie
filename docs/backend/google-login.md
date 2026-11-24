# Supabase + Google sign-in: setup

The app is ready for it. Until the two variables below are set, it runs fully local (the mock accounts), exactly as
before. Once they are set, **registering and logging in go through Google only**, and "Try now" keeps working locally.

Time needed: about 20 minutes. You need: a Google account, a Supabase account, access to the Vercel project.

## 1. Create the Supabase project

1. https://supabase.com/dashboard → **New project**.
   - Region: **Southeast Asia (Singapore)** (closest to Indonesia; see the data-residency note in [README.md §6](README.md)).
   - Save the database password somewhere safe (a password manager). It is not used by the app.
2. Apply the schema, in order, `0001` → the last file in `backend/supabase/migrations/`. On a fresh project the
   simplest is one paste of `backend/supabase/setup.sql` into the SQL Editor (see [setup-supabase.md](setup-supabase.md),
   in Indonesian). Or:
   - **CLI** (recommended):
     ```bash
     npx supabase login
     npx supabase link --project-ref <project-ref>
     npx supabase db push          # from the repo root; reads backend/supabase/migrations
     ```
     (If the CLI looks for `supabase/migrations`, run it with `--workdir backend`.)
   - or **SQL Editor** in the dashboard: paste each file and run it, in number order. Never edit a file that was
     already applied; add the next number instead.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key. Do **not** copy the
   `service_role` key anywhere near the app.

## 2. Create the Google OAuth client

1. https://console.cloud.google.com → create (or pick) a project, e.g. "Siomofu".
2. **APIs & Services → OAuth consent screen**:
   - User type **External**. App name "Siomofu", support email, logo optional.
   - Authorized domains: `supabase.co` **and `siomofu.xyz`** (not `vercel.app` — Google refuses that one, see
     Gotcha below; `pethommie-web.vercel.app` still works as a login *entry point* without being an "authorized
     domain" here, since that field is about the consent screen, not every URL the app lives at).
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough.
   - While the app is in **Testing**, only the test users you add can sign in — real customers get "Access blocked:
     Siomofu has not completed the Google verification process". **Publish** it (button at the top of this page)
     before telling anyone outside your test-user list to sign up. Publishing an app that only asks for
     email/profile/openid does not need Google's manual review.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: `https://siomofu.xyz`, `https://pethommie-web.vercel.app` (keep both — the old
     URL still works and still needs to) and `http://localhost:5173`.
   - Authorized redirect URI (exactly one, Supabase's):
     `https://<project-ref>.supabase.co/auth/v1/callback`
   - Save, then copy the **Client ID** and **Client secret**.

## 3. Turn on Google in Supabase

1. **Authentication → Sign In / Providers → Google**: enable, paste the Client ID and Client secret, save.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://siomofu.xyz` (this is where Google sends people back to *by default*; the exact page is
     still whatever `redirectTo` the app asked for, as long as it's in the list below).
   - **Redirect URLs** (add each):
     - `https://siomofu.xyz/app/auth/callback`
     - `https://pethommie-web.vercel.app/app/auth/callback` (keep: the old URL still needs to work)
     - `https://*-sandmanzzs-projects.vercel.app/app/auth/callback` (preview deploys, optional)
     - `http://localhost:5173/app/auth/callback`
3. Optional, **Authentication → Sign In / Providers → Email**: turn **off** "Enable email provider" if you want
   Google to be the only way in (the app only offers Google anyway).

## 4. Give the app the keys

- **Vercel** → project `pethommie-web` → Settings → Environment Variables (Production and Preview):
  - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = the anon public key
  - then **Redeploy** (Vite reads them at build time).
- **Local**: copy `web/.env.example` to `web/.env.local` and fill in the same two values; `npm run dev`.
- The site's CSP (`web/vercel.json`) already allows `https://*.supabase.co`, `wss://*.supabase.co` and Google profile
  pictures. Once the project exists you may narrow `*.supabase.co` to `<project-ref>.supabase.co`.

## 5. Check it works

1. Open `/app/register` → **Continue with Google** → choose an account → you land on **setup** (hotel name, WhatsApp,
   cages). The Google name and email are already on the account.
2. Supabase dashboard → **Authentication → Users**: the new user is there with provider `google`.
3. Log out, then `/app/login` → **Continue with Google** → back in, straight to today's board.
4. `/app/try` still opens the demo hotels without Google.

## 6. Security checklist

Everything the *code* needs for this to be safe is already in place (PKCE flow, the redirect target is always this
site's own origin and never taken from user input, no secret key anywhere in the browser) — reviewed 24 Nov 2026,
nothing found to fix in `web/src/app/supabase/client.ts`, `supabaseAuthService.ts`, `AuthCallbackPage.tsx`,
`landing.ts`. What's left is *configuration*, which only you can check in the two dashboards:

| # | Where | What to check | What goes wrong if it isn't |
|---|---|---|---|
| 1 | Google Cloud Console → OAuth consent screen | Publishing status is **In production**, not **Testing** | A real customer sees "Access blocked", not a login screen |
| 2 | Same page → Authorized domains | `siomofu.xyz` is listed | Google rejects the domain outright when you try to add it as a JavaScript origin in step 2.3 |
| 3 | Credentials → your OAuth client → Authorized JavaScript origins | `https://siomofu.xyz` is listed (and the `vercel.app` one, if you still link people there) | `redirect_uri_mismatch` / `origin_mismatch` error from Google, login never starts |
| 4 | Same client → Authorized redirect URI | Exactly one: `https://<project-ref>.supabase.co/auth/v1/callback` — **not** `/app/auth/callback` (that one belongs in Supabase's own list, step 3.2, not here) | `redirect_uri_mismatch` from Google |
| 5 | Supabase → Authentication → URL Configuration → Redirect URLs | `https://siomofu.xyz/app/auth/callback` is listed | Supabase sends the person back to a URL it doesn't recognise; login fails after Google's own screen succeeds |
| 6 | Supabase → Authentication → Providers → Google | Client ID and secret match what Google Cloud Console shows right now (not an old regenerated one) | `invalid_client` from Google |
| 7 | Vercel → `pethommie-web` → Environment Variables | `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are the **anon** key, never `service_role` | The anon key is meant to be public (row level security is the real guard) — but the service-role key bypasses that guard entirely, so it must never be a `VITE_` variable (those ship to every visitor's browser) |

Do the actual test in Langkah 5 above (register, log out, log back in) after checking these — a checklist that
passes on paper is not the same as a login that works.

**Gotchas already hit once** (see CLAUDE.md §7): Google refuses `vercel.app` as an *authorized domain* (row 2 above)
even though the `vercel.app` URL itself works fine as a JavaScript origin (row 3) and a redirect target (row 5) —
those are three different settings with three different rules, easy to conflate.

## How it works (for developers)

- `web/src/app/supabase/client.ts`: the one client (PKCE flow), or `null` when the variables are missing.
- `web/src/app/auth/supabaseAuthService.ts`: `signInWithGoogle(next)` → Google → `/app/auth/callback?next=…`;
  `restore()` reads the Supabase session (a local demo session wins while open); `logout()` ends both. Password
  register/login answer `unsupported`. An offer claimed in the demo is kept in the browser over the Google round trip
  and saved on the user's metadata.
- `web/src/app/auth/defaultService.ts`: picks Supabase when configured, else the local mock.
- `web/src/app/pages/AuthCallbackPage.tsx`: waits for the session, then goes on (setup for a new account).
- Tests: `supabaseAuthService.test.ts` (with a fake client) and `pages/google.test.tsx`. Nothing here was run against a
  live Supabase project from this repo; step 5 above is the first real check.
