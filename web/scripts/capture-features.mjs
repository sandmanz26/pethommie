// Captures the real app pieces shown on the landing page, from the sample hotel, in both languages:
//   - one crop per feature card:  public/screens/feature-<key>-<locale>.png  (then made WebP, see below)
//   - phone views for the tour:   public/screens/<today|booking|calendar>-phone-<locale>.png
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   PW_CHROMIUM=/path/to/chromium node scripts/capture-features.mjs
//   python3 scripts/prepare-resources.py --screens       (PNG -> WebP, sized for the page)
//
// Run it again when the app's look changes.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const out = new URL('../public/screens/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

async function signIn(page, locale) {
  await page.goto(`${base}/app/login`)
  await page.getByRole('button', { name: /^(use|pakai)$/i }).nth(1).click()
  await page.getByRole('button', { name: /^(log in|masuk)$/i }).click()
  await page.getByRole('button', { name: /sample data|data contoh/i }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  const banner = page.getByRole('button', { name: /^(dismiss|tutup)$/i }) // the one-time "works offline" notice
  if (await banner.count()) await banner.first().click()
}

/** Screenshot of an element, cut to at most `maxH` CSS px tall (the top of it). */
async function crop(page, locator, file, maxW = 720, maxH = 440) {
  await locator.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const box = await locator.boundingBox()
  await page.screenshot({ path: `${out}${file}.png`, clip: { x: box.x, y: box.y, width: Math.min(box.width, maxW), height: Math.min(box.height, maxH) } })
  console.log(file)
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
for (const locale of ['en', 'id']) {
  // Feature crops, from a phone-sized window at 2x: the app's narrow layout keeps them readable on a small card.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', isMobile: true, hasTouch: true })
  await context.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  const page = await context.newPage()
  await signIn(page, locale)
  await page.goto(`${base}/app/more`)
  await page.getByRole('tab', { name: /^(advanced|lengkap)$/i }).first().click()
  // The phone tab bar floats over the bottom of the screen; keep it out of the crops.
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = '.ds-tabbar { display: none !important; }'
    document.head.append(style)
  }))

  await page.goto(`${base}/app/calendar`)
  await crop(page, page.locator('.ds-cal'), `feature-calendar-${locale}`, 390, 300)

  await page.goto(`${base}/app`)
  const checkin = await page.locator('a[href*="#checkin"]').first().getAttribute('href')
  await page.goto(`${base}${checkin.replace('#checkin', '')}`)
  await crop(page, page.locator('form[aria-labelledby="checkin-title"]'), `feature-checkin-${locale}`, 390, 300)

  await page.goto(`${base}/app`)
  const care = await page.locator('a[href*="#care"]').first().getAttribute('href')
  await page.goto(`${base}${care.replace('#care', '')}`)
  // the day's entries, with the heading above them
  const panel = await page.locator('section[aria-labelledby="care-title"]').boundingBox()
  const list = page.locator('section[aria-labelledby="care-title"] .ds-timeline').first()
  await list.scrollIntoViewIfNeeded()
  const entries = await list.boundingBox()
  await page.screenshot({ path: `${out}feature-care-${locale}.png`, clip: { x: panel.x, y: entries.y - 44, width: panel.width, height: entries.height + 60 } })
  await crop(page, page.locator('section[aria-labelledby="report-title"]'), `feature-report-${locale}`, 390, 360)

  await page.goto(`${base}/app/invoices`)
  await page.locator('.pg-table a').first().click()
  await page.getByText(locale === 'en' ? 'English' : 'Indonesia', { exact: true }).first().click()
  await crop(page, page.locator('.ds-invdoc'), `feature-invoice-${locale}`, 390, 330)

  await page.goto(`${base}/app/tax`)
  // the stats, the ceiling meter and the first rows of the table, as one picture
  const top = await page.locator('main .pg-stats').first().boundingBox()
  const meter = await page.locator('main .pg-meter').first().boundingBox()
  await page.screenshot({ path: `${out}feature-tax-${locale}.png`, clip: { x: top.x, y: top.y, width: top.width, height: meter.y + meter.height + 8 - top.y } })
  await context.close()

  // Phone views for the tour.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', isMobile: true, hasTouch: true })
  await phone.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  const p = await phone.newPage()
  await signIn(p, locale)
  await p.waitForTimeout(800)
  const notice = p.getByRole('button', { name: /^(dismiss|tutup)$/i })
  if (await notice.count()) await notice.first().click()
  await p.screenshot({ path: `${out}today-phone-${locale}.png` })
  await p.goto(`${base}/app/calendar`)
  await p.getByRole('heading', { level: 1 }).first().waitFor()
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${out}calendar-phone-${locale}.png` })
  await p.goto(`${base}/app`)
  const stay = await p.locator('a[href*="#care"]').first().getAttribute('href')
  await p.goto(`${base}${stay}`)
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${out}booking-phone-${locale}.png` })
  console.log(`phone ${locale}`)
  await phone.close()
}
await browser.close()
