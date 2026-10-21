// Captures the screens in the landing page's product tour, from the small sample hotel, in both languages:
//   public/screens/<today|booking|calendar>-<locale>.png        laptop view, 1280x800 at 2x
//   public/screens/<today|booking|calendar>-phone-<locale>.png  phone view, 390x844 at 2x
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   PW_CHROMIUM=/path/to/chromium node scripts/capture-screens.mjs
//   python3 scripts/prepare-resources.py --screens       (PNG -> WebP, sized for the page)
//
// Run it again when the app's look changes.
import { mkdirSync } from 'node:fs'
import { launch, open, out, show, signIn } from './capture-common.mjs'

mkdirSync(out, { recursive: true })
const browser = await launch()
for (const locale of ['en', 'id']) {
  for (const phone of [false, true]) {
    const { context, page } = await open(browser, locale, { phone, scale: 2 })
    await signIn(page)
    const file = (key) => `${out}${key}${phone ? '-phone' : ''}-${locale}.png`
    await show(page, '/app')
    const stay = (await page.locator('a[href*="#care"]').first().getAttribute('href')).replace('#care', '')
    await page.screenshot({ path: file('today') })
    await show(page, '/app/calendar')
    await page.screenshot({ path: file('calendar') })
    await show(page, stay)
    await page.screenshot({ path: file('booking') })
    console.log(`${phone ? 'phone' : 'laptop'} ${locale}`)
    await context.close()
  }
}
await browser.close()
