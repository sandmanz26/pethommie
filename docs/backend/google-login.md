# Supabase + Google sign-in: setup

The app is ready for it. Until the two variables below are set, it runs fully local (the mock accounts), exactly as
before. Once they are set, **registering and logging in go through Google only**, and "Try now" keeps working locally.

Time needed: about 20 minutes. You need: a Google account, a Supabase account, access to the Vercel project.

## 1. Create the Supabase project

1. https://supabase.com/dashboard → **New project**.
   - Region: **Southeast Asia (Singapore)** (closest to Indonesia; see the data-residency note in [README.md §6](README.md)).
   - Save the database password somewhere safe (a password manager). It is not used by the app.
2. Apply the schema, in order, `0001` → the last file in `backend/supabase/migrations/`. Either:
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

1. https://console.cloud.google.com → create (or pick) a project, e.g. "Pethommie".
2. **APIs & Services → OAuth consent screen**:
   - User type **External**. App name "Pethommie", support email, logo optional.
   - Authorized domains: `supabase.co` and your own domain (e.g. `vercel.app` for now, or `pethommie.com` later).
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough.
   - While the app is in **Testing**, only the test users you add can sign in. **Publish** it before real customers.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: `https://pethommie-web.vercel.app` and `http://localhost:5173`.
   - Authorized redirect URI (exactly one, Supabase's):
     `https://<project-ref>.supabase.co/auth/v1/callback`
   - Save, then copy the **Client ID** and **Client secret**.

## 3. Turn on Google in Supabase

1. **Authentication → Sign In / Providers → Google**: enable, paste the Client ID and Client secret, save.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://pethommie-web.vercel.app`
   - **Redirect URLs** (add each):
     - `https://pethommie-web.vercel.app/app/auth/callback`
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
