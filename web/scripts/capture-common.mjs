// What every landing-page capture shares: a clean window on the built app, signed in to a sample hotel.
// No service worker (its "ready to work offline" notice), no backup reminder, no demo line, and a fixed morning in
// Jakarta so the times on screen read like a working day.
import { chromium } from '@playwright/test'

export const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
export const out = new URL('../public/screens/', import.meta.url).pathname
const today = new Date().toISOString().slice(0, 10)

export const launch = () => chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})

/** `phone`: 390x844 at 2x, as an iPhone; otherwise a laptop window of `viewport` at `scale`. */
export async function open(browser, locale, { phone = false, viewport = { width: 1280, height: 800 }, scale = 1 } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width: 390, height: 844 } : viewport,
    deviceScaleFactor: phone ? 2 : scale,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    timezoneId: 'Asia/Jakarta',
    ...(phone ? { isMobile: true, hasTouch: true } : {}),
  })
  await context.addInitScript(([l, d]) => {
    localStorage.setItem('pethommie.locale', l)
    for (const id of ['demo-pro', 'demo-rina', 'demo-baru']) localStorage.setItem(`pethommie.backupAt.${id}`, d)
  }, [locale, today])
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(`${today}T09:40:00+07:00`))
  return { context, page }
}

/** Signs in to the small sample hotel as it comes (demo@pethommie.id, filled with sample data, simple mode). */
/** Opens a "Try now" sample hotel (the first, small one unless told otherwise); `show` hides the demo strip and offer. */
export async function signIn(page, demo = 0) {
  await page.goto(`${base}/app/try`)
  await page.getByRole('button', { name: /^(open this demo|buka demo ini)/i }).nth(demo).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/try'))
}

/** The demo's strip and floating offer are not part of the screens the pictures show. */
export const HIDE_DEMO = '.demo-bar, .demo-offer { display: none !important; } body.has-demobar .tpl-app__main { padding-bottom: 40px !important; } body.has-demobar .ds-sidenav { top: 0 !important; height: 100dvh !important; }'


/** Goes to a screen and waits until it has drawn, without the demo's strip and offer. */
export async function show(page, path) {
  if (path) await page.goto(`${base}${path}`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.addStyleTag({ content: HIDE_DEMO })
  await page.evaluate(() => document.fonts.ready)
  // the pointer rests in an empty corner, not over the last thing clicked (a hovered menu item would show)
  const { width } = page.viewportSize()
  await page.mouse.move(width - 4, 4)
  await page.waitForTimeout(500)
}
