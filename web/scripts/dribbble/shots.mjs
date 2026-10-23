// Clean screenshots of the app for Dribbble: no frames, no captions. 1600x1200 (4:3) of the first screen, plus the
// whole page where it is longer, and a few phone screens.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/dribbble/shots.mjs <out-dir>
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { HIDE_DEMO } from '../capture-common.mjs'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const out = process.argv[2] ?? 'dribbble'
for (const d of ['desktop', 'desktop-full', 'mobile']) mkdirSync(`${out}/${d}`, { recursive: true })
const today = new Date().toISOString().slice(0, 10)
/** A mid-afternoon in Jakarta, so times on screen (the care log's clock, "now") look like a working day. */
const afternoon = new Date(`${today}T15:20:00+07:00`)
const english = async (p) => {
  // the public page opens in the hotel's language; the shots are in English
  await p.locator('.lang__option', { hasText: 'EN' }).click()
  await p.waitForTimeout(200)
}

/** `account`: which Try now hotel, 0 small, 1 big (advanced), 2 empty. */
async function session(browser, viewport, scale, account = 1) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Asia/Jakarta', ...(viewport.width < 500 ? { isMobile: true, hasTouch: true } : {}) })
  await context.addInitScript(([d]) => {
    localStorage.setItem('pethommie.locale', 'en')
    // a backup was made today: no reminder in the pictures
    for (const id of ['demo-pro', 'demo-rina', 'demo-baru']) localStorage.setItem(`pethommie.backupAt.${id}`, d)
  }, [today])
  const page = await context.newPage()
  await page.clock.setFixedTime(afternoon)
  await page.goto(`${base}/app/try`)
  await page.getByRole('button', { name: /^open this demo/i }).nth(account).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/try'))
  // the demo's strip and offer are for visitors trying it, not for the pictures
  await page.addStyleTag({ content: HIDE_DEMO }).catch(() => {})
  return { context, page }
}

async function settle(page) {
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.addStyleTag({ content: HIDE_DEMO })
  const dismiss = page.getByRole('button', { name: /^dismiss$/i })
  if (await dismiss.count()) await dismiss.first().click()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
}

async function shot(page, name, path, { full = false, before } = {}) {
  if (path) await page.goto(`${base}${path}`)
  await settle(page)
  if (before) await before(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${out}/desktop/${name}.png` })
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    if (h > 1000) await page.screenshot({ path: `${out}/desktop-full/${name}.png`, fullPage: true })
  }
  console.log(name)
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})

// Desktop: 1280x960 CSS px at 1.25x = 1600x1200, the app's wide layout.
{
  const { context, page } = await session(browser, { width: 1280, height: 960 }, 1.25)
  await shot(page, '01-dashboard', '/app/dashboard', { full: true })
  await shot(page, '02-today', '/app', { full: true })
  await shot(page, '03-calendar', '/app/calendar')
  await page.goto(`${base}/app`)
  await settle(page)
  const stay = await page.locator('a[href*="#care"]').first().getAttribute('href')
  await shot(page, '04-stay', stay.replace('#care', ''), { full: true })
  await shot(page, '05-new-booking', '/app/bookings/new', {
    before: async (p) => {
      await p.getByLabel('Find the owner').fill('ra')
      await p.waitForTimeout(300)
    },
  })
  await shot(page, '06-bookings', '/app/bookings', { full: true })
  await shot(page, '07-reports', '/app/reports', { full: true })
  await shot(page, '08-finance', '/app/finance', {
    full: true,
    before: async (p) => {
      await p.getByRole('tab', { name: 'Last 3 months' }).click()
      await p.waitForTimeout(300)
    },
  })
  await shot(page, '09-expenses', '/app/expenses', { full: true })
  await shot(page, '10-transactions', '/app/transactions', { full: true })
  await shot(page, '11-invoices', '/app/invoices', { full: true })
  await page.goto(`${base}/app/invoices`)
  await settle(page)
  await page.locator('.pg-table a[href^="/app/invoices/"]').first().click()
  await shot(page, '12-invoice', null, { full: true })
  await page.goto(`${base}/app/transactions`)
  await settle(page)
  await page.locator('a[href^="/app/receipts/"]').first().click()
  await shot(page, '13-receipt', null, { full: true })
  await shot(page, '14-customers', '/app/customers', { full: true })
  await shot(page, '15-pets', '/app/pets', { full: true })
  await shot(page, '16-units', '/app/cages', { full: true })
  await shot(page, '17-booking-link', '/app/link', { full: true })
  const link = await page.locator('input[readonly]').inputValue()
  await shot(page, '18-public-booking-page', link.replace(/^https?:\/\/[^/]+/, ''), { full: true, before: english })
  await context.close()
}

// The simple-mode hotel: the settings page with the upgrade card.
{
  const { context, page } = await session(browser, { width: 1280, height: 960 }, 1.25, 0)
  await shot(page, '19-settings-upgrade', '/app/settings')
  await context.close()
}

// Signed out: the login screen.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1.25 })
  await context.addInitScript(() => localStorage.setItem('pethommie.locale', 'en'))
  const page = await context.newPage()
  await shot(page, '20-login', '/app/login', {
    // the sign-in accounts for testers are not part of the product
    before: (p) => p.addStyleTag({ content: '.ds-demo { display: none !important; }' }),
  })
  await context.close()
}

// Phone: 390x844 at 3x, as an iPhone shows it.
{
  const { context, page } = await session(browser, { width: 390, height: 844 }, 3)
  const phone = async (name, path, before) => {
    if (path) await page.goto(`${base}${path}`)
    await settle(page)
    if (before) await before(page)
    await page.screenshot({ path: `${out}/mobile/${name}.png` })
    console.log(`mobile ${name}`)
  }
  await phone('01-today', '/app')
  await phone('02-dashboard', '/app/dashboard')
  await phone('03-calendar', '/app/calendar')
  await page.goto(`${base}/app`)
  await settle(page)
  const stay = await page.locator('a[href*="#care"]').first().getAttribute('href')
  await phone('04-stay-care-log', stay)
  await phone('05-finance', '/app/finance')
  await page.goto(`${base}/app/link`)
  await settle(page)
  const link = await page.locator('input[readonly]').inputValue()
  await phone('06-public-booking-page', link.replace(/^https?:\/\/[^/]+/, ''), english)
  await context.close()
}
await browser.close()
