// Captures the dashboard of the big sample hotel (pro@pethommie.id) for the landing page, in both languages:
//   public/screens/wide-dashboard-<locale>.png   (then made WebP: python3 scripts/prepare-resources.py --screens)
//
//   npm run build && npx vite preview --port 4173 &      (the built app must be running)
//   node scripts/capture-dashboard.mjs
import { mkdirSync } from 'node:fs'
import { launch, open, out, show, signIn } from './capture-common.mjs'

mkdirSync(out, { recursive: true })
const browser = await launch()
for (const locale of ['en', 'id']) {
  const { context, page } = await open(browser, locale, { viewport: { width: 1280, height: 1000 }, scale: 1.5 })
  await signIn(page, 'big')
  await show(page, '/app/dashboard')
  // the sidebar and the first screenful: the numbers, today and both charts
  const charts = await page.locator('main .pg-columns').first().boundingBox()
  await page.screenshot({ path: `${out}wide-dashboard-${locale}.png`, clip: { x: 0, y: 0, width: 1280, height: Math.round(charts.y + charts.height + 24) } })
  console.log(`wide-dashboard-${locale}`)
  await context.close()
}
await browser.close()
