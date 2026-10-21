// Captures the real app pieces shown on the landing page's feature cards, from the small sample hotel, in both
// languages: public/screens/feature-<key>-<locale>.png (then made WebP, see below). The tour's phone views come from
// capture-screens.mjs.
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   PW_CHROMIUM=/path/to/chromium node scripts/capture-features.mjs
//   python3 scripts/prepare-resources.py --screens       (PNG -> WebP, sized for the page)
//
// Run it again when the app's look changes.
import { mkdirSync } from 'node:fs'
import { base, launch, open, out, signIn } from './capture-common.mjs'

mkdirSync(out, { recursive: true })

/** Screenshot of an element, cut to at most `maxH` CSS px tall (the top of it). */
async function crop(page, locator, file, maxW = 720, maxH = 440) {
  await locator.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const box = await locator.boundingBox()
  await page.screenshot({ path: `${out}${file}.png`, clip: { x: box.x, y: box.y, width: Math.min(box.width, maxW), height: Math.min(box.height, maxH) } })
  console.log(file)
}

const browser = await launch()
for (const locale of ['en', 'id']) {
  // Feature crops, from a phone-sized window at 2x: the app's narrow layout keeps them readable on a small card.
  const { context, page } = await open(browser, locale, { phone: true })
  await signIn(page)
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

  await context.close()

  // The tax card: the big hotel, whose turnover is past the tax-free part, so the estimate isn't zero.
  const big = await open(browser, locale, { phone: true })
  await signIn(big.page, 'big')
  await big.page.goto(`${base}/app/tax`)
  await crop(big.page, big.page.locator('main .pg-stats').first(), `feature-tax-${locale}`, 390, 300)
  await big.context.close()
}
await browser.close()
