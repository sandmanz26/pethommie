// Captures the dashboard of the big sample hotel (pro@pethommie.id) for the landing page, in both languages:
//   public/screens/wide-dashboard-<locale>.png   (then made WebP: python3 scripts/prepare-resources.py --screens)
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   node scripts/capture-dashboard.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const out = new URL('../public/screens/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
for (const locale of ['en', 'id']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' })
  await context.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  const page = await context.newPage()
  await page.goto(`${base}/app/login`)
  await page.getByRole('button', { name: /^(use|pakai)$/i }).nth(2).click()
  await page.getByRole('button', { name: /^(log in|masuk)$/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('login'))
  await page.goto(`${base}/app/dashboard`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  // the one-time "works offline" notice is not part of the dashboard
  await page.addStyleTag({ content: '.tpl-app__main .ds-alert { display: none !important; }' })
  await page.waitForTimeout(800)
  // the sidebar and the first screenful: the numbers, today and both charts
  const charts = await page.locator('main .pg-columns').first().boundingBox()
  await page.screenshot({ path: `${out}wide-dashboard-${locale}.png`, clip: { x: 0, y: 0, width: 1280, height: Math.round(charts.y + charts.height + 24) } })
  console.log(`wide-dashboard-${locale}`)
  await context.close()
}
await browser.close()
