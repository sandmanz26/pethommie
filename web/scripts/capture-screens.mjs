// Captures the app screens shown in the landing page's product tour, from the sample hotel.
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   PW_CHROMIUM=/path/to/chromium node scripts/capture-screens.mjs
//
// Writes public/screens/<today|booking|calendar>-<en|id>.jpg at 1280x800. Run it again when the app's look changes.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const out = new URL('../public/screens/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
for (const locale of ['en', 'id']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await context.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  const page = await context.newPage()
  await page.goto(`${base}/app/login`)
  await page.getByRole('button', { name: /^(use|pakai)$/i }).nth(1).click()
  await page.getByRole('button', { name: /^(log in|masuk)$/i }).click()
  await page.getByRole('button', { name: /sample data|data contoh/i }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()

  const shot = async (name) => {
    await page.waitForTimeout(500) // let images and fonts settle
    const banner = page.getByRole('button', { name: /^(dismiss|tutup)$/i }) // the one-time "works offline" notice
    if (await banner.count()) await banner.first().click()
    await page.screenshot({ path: `${out}${name}-${locale}.jpg`, type: 'jpeg', quality: 82 })
    console.log(`${name}-${locale}.jpg`)
  }

  await shot('today')
  await page.goto(`${base}/app/calendar`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await shot('calendar')
  await page.goto(`${base}/app`)
  const care = await page.locator('a[href*="#care"]').first().getAttribute('href')
  await page.goto(`${base}${care.replace('#care', '')}`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await shot('booking')
  await context.close()
}
await browser.close()
