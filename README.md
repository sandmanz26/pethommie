# Pethommie

Pet hotel management software for operators in Indonesia: bookings with QRIS deposits, a cage
calendar, check-in, and daily reports to owners on WhatsApp.

This repo has a marketing site (scroll-driven landing page) and the operator app, in one React
codebase. There is no backend yet; the app keeps data in the browser.

```
web/        the React app (site + operator app). Start here.
docs/       architecture and research
  ARCHITECTURE.md   how it is built, the rules, and how to move to a backend
  research/         market validation for Indonesia (Bahasa Indonesia)
  product/          product audit, research, roadmap and metrics (Bahasa Indonesia)
.github/    CI: typecheck, lint, tests, build, dependency audit, browser tests
```

## Run it

Needs Node 22 (`web/.nvmrc`).

```bash
cd web
npm ci
npm run dev        # http://localhost:5173   (site at /, app at /app)
npm run check      # typecheck + lint + tests + build: what CI runs
```

More in [`web/README.md`](web/README.md); the design rules in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Deploy

Vercel, with the project's **Root Directory set to `web`**. `web/vercel.json` holds the SPA rewrite,
security headers and cache rules. Pushing to `main` deploys to production.
