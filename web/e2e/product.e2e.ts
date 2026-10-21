import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signInWithSampleData } from './helpers'

test('a day at the hotel: check in, get paid, log care, send the report', async ({ page }) => {
  await signInWithSampleData(page)

  // Nala arrives today: open her booking from Today and check her in with a record.
  await page.getByRole('link', { name: 'Check in' }).first().click()
  await page.getByLabel(/weight/i).fill('3.8')
  await page.getByRole('button', { name: /^check in$/i }).click()
  await expect(page.getByRole('region', { name: /check-in record/i })).toContainText('3.8 kg')

  // Settle the whole bill.
  const payments = page.getByRole('region', { name: /payments/i })
  await payments.getByRole('button', { name: /fill in the balance/i }).click()
  await payments.getByRole('button', { name: /save payment/i }).click()
  await expect(payments.getByText('Paid in full')).toBeVisible()

  // One tap in the care log, and it is in the owner's report.
  const log = page.getByRole('region', { name: /daily care log/i })
  await log.getByRole('button', { name: 'All eaten' }).click()
  const report = page.getByRole('region', { name: /report for the owner/i })
  await expect(report.getByRole('textbox')).toHaveValue(/Makan: habis/)

  // WhatsApp opens with the owner's number and that text. Stop the new tab: we only check the link.
  const link = report.getByRole('link', { name: /send on whatsapp/i })
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/62\d+\?text=Halo%20Kak/)
  await link.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault())) // don't leave for wa.me; the app's own handler still runs
  await link.click()
  await expect(report.getByText(/^Sent at/)).toBeVisible()

  // Everything survives a reload.
  await page.reload()
  await expect(page.getByRole('region', { name: /check-in record/i })).toContainText('3.8 kg')
  await expect(page.getByRole('region', { name: /daily care log/i })).toContainText('All eaten')
})

test('simple mode: a day with fewer fields', async ({ page }) => {
  await signInWithSampleData(page, 'en', 'simple')
  await expect(page.getByRole('link', { name: 'Customers' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Check in' }).first().click()
  await page.getByRole('button', { name: /^check in$/i }).click()
  const payments = page.getByRole('region', { name: /payments/i })
  await payments.getByRole('button', { name: /mark as paid in full/i }).click()
  await expect(payments.getByText('Paid in full')).toBeVisible()
  await page.getByRole('region', { name: /daily care log/i }).getByRole('button', { name: 'All eaten' }).click()
  await expect(page.getByRole('region', { name: /report for the owner/i }).getByRole('textbox')).toHaveValue(/Makan: habis/)
})

test('advanced mode adds customers, payments and reports', async ({ page }) => {
  await signInWithSampleData(page)
  await page.getByRole('link', { name: 'Payments' }).click()
  await expect(page.getByRole('heading', { name: 'Payments', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /send reminder/i }).first()).toHaveAttribute('href', /^https:\/\/wa\.me\/62/)
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByRole('figure', { name: /places in use/i })).toBeVisible()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('figure', { name: /next 14 nights/i })).toBeVisible()
  await page.getByRole('link', { name: 'Customers' }).click()
  await expect(page.getByRole('link', { name: /Rina|Sari|Budi|Andi/ }).first()).toBeVisible()
})

test('an invoice for a stay shows up in the register and in the tax estimate', async ({ page }) => {
  await signInWithSampleData(page)
  await page.getByRole('link', { name: 'Invoices' }).click()
  await expect(page.getByRole('link', { name: /^INV-\d{4}-0001$/ })).toBeVisible()
  await page.getByRole('link', { name: /^INV-\d{4}-0001$/ }).click()
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible()
  await page.getByRole('link', { name: 'Tax' }).click()
  await expect(page.getByText('An estimate, not a filing.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Download for the accountant/ })).toBeVisible()
})

test('the calendar books an empty day', async ({ page }) => {
  await signInWithSampleData(page)
  await page.goto('/app/calendar')
  await page.getByRole('link', { name: /new booking in S-04 from/i }).first().click()
  await expect(page.getByLabel(/^cage ·/i)).toHaveAttribute('data-value', /.+/)
  await expect(page.getByRole('heading', { name: 'New booking', level: 1 })).toBeVisible()
})

for (const [name, viewport, locale] of [
  ['desktop', { width: 1280, height: 800 }, 'en'],
  ['phone', { width: 390, height: 844 }, 'id'],
] as const) {
  test.describe(`${name}`, () => {
    test.use({ viewport })

    test('every operator screen is free of accessibility violations and fits the width', async ({ page }) => {
      test.setTimeout(120_000) // twenty-odd screens, each scanned
      await signInWithSampleData(page, locale)
      await page.goto('/app')
      const bookingHref = await page.locator('a[href*="#care"]').first().getAttribute('href')
      await page.goto('/app/transactions')
      const receiptHref = (await page.locator('a[href^="/app/receipts/"]').first().getAttribute('href')) ?? '/app'
      await page.goto('/app/invoices')
      const invoiceHref = (await page.locator('a[href^="/app/invoices/"]').first().getAttribute('href')) ?? '/app'
      const paths = [receiptHref, invoiceHref,
        '/app', '/app/calendar', '/app/bookings', '/app/bookings/new', '/app/pets', '/app/cages', '/app/settings',
        '/app/more', '/app/customers', '/app/payments', '/app/invoices', '/app/tax', '/app/reports', '/app/dashboard', '/app/transactions', '/app/expenses', '/app/finance', '/app/link', '/app/help', bookingHref!.replace('#care', ''),
      ]
      for (const path of paths) {
        await page.goto(path)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), path).toEqual([])
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0)
      }
    })

    test('the public booking page from the link is accessible and fits the width', async ({ page }) => {
      await signInWithSampleData(page, locale)
      await page.goto('/app/link')
      const url = await page.locator('input[readonly]').inputValue()
      await page.goto(url.replace(/^https?:\/\/[^/]+/, ''))
      await page.getByRole('heading', { level: 1 }).waitFor()
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    })
  })
}

for (const [name, viewport] of [
  ['desktop', { width: 1280, height: 800 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test.describe(`website · ${name}`, () => {
    test.use({ viewport })

    for (const locale of ['en', 'id'] as const) {
      test(`landing and legal pages in ${locale}: no accessibility violations, no sideways scrolling`, async ({ page }) => {
        await page.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
        for (const path of ['/', '/privacy', '/terms', '/does-not-exist']) {
          await page.goto(path)
          await page.getByRole('heading', { level: 1 }).first().waitFor()
          const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
          expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), path).toEqual([])
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
          expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0)
        }
      })
    }
  })
}

test('the landing page shows each tour screen and every feature picture, and the last ask opens the help form', async ({ page }) => {
  await page.goto('/')
  await page.locator('#tour').scrollIntoViewIfNeeded()
  const tabs = page.locator('#tour [role=tab]')
  await expect(tabs).toHaveCount(3)
  for (const tab of await tabs.all()) {
    await tab.click()
    for (const img of await page.locator('#tour [role=tabpanel]:not([hidden]) img:visible').all()) {
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    }
  }
  await page.getByRole('link', { name: "Tell me when it's ready" }).click()
  await expect(page.getByLabel('WhatsApp number')).toBeVisible()
  await page.locator('#features').scrollIntoViewIfNeeded()
  for (const img of await page.locator('#features img').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  }
  await expect(page.getByRole('contentinfo')).toContainText('All rights reserved')
})

test.describe('after the film', () => {
  test('the leaks add up as they scroll past, and the bar turns to ink over them', async ({ page }) => {
    await page.goto('/')
    const meter = page.locator('.cost__amount')
    const top = await page.locator('#cost').evaluate((el) => el.getBoundingClientRect().top + scrollY)
    await page.evaluate((y) => scrollTo(0, y - innerHeight), top) // the section is just below the screen
    await expect(meter).toHaveText('Rp 0')
    await page.locator('.cost__leak').nth(3).scrollIntoViewIfNeeded()
    await page.evaluate(() => scrollBy(0, 200))
    await expect(meter).toHaveText('Rp 1.710.000')
    await expect(page.locator('.topbar')).toHaveClass(/topbar--dark/)

    // the calculator makes it the visitor's own hotel
    await page.getByRole('slider', { name: 'Cages or places' }).fill('24')
    await expect(page.locator('.cost__result')).toContainText('Rp 3.420.000')
    await page.locator('#tour').scrollIntoViewIfNeeded()
    await expect(page.locator('.topbar')).not.toHaveClass(/topbar--dark/)
  })

  test('nothing on the page leads to a demo', async ({ page }) => {
    for (const locale of ['en', 'id']) {
      await page.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
      await page.goto('/')
      await expect(page.locator('a[href*="demo"]')).toHaveCount(0)
    }
  })

  test.describe('with motion allowed', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } })

    test('pictures drift with the scroll and blocks rise into place as they arrive', async ({ page }) => {
      await page.goto('/')
      const card = page.locator('.feature').first()
      await expect(card).toHaveClass(/rises/)
      await expect(card).not.toHaveClass(/is-in/)
      await card.scrollIntoViewIfNeeded()
      await expect(card).toHaveClass(/is-in/)
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')

      const art = page.locator('.feature__art').first()
      const at = () => art.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--parallax')) || 0)
      const before = await at()
      await page.evaluate(() => scrollBy(0, 300))
      await expect.poll(at).not.toBe(before)
    })
  })

  test('with less motion asked for, nothing waits to appear', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.rises')).toHaveCount(0)
    await expect(page.locator('.drifts')).toHaveCount(0)
  })
})

test('the app opens without a connection after the first visit, and the website is not touched', async ({ page, context }) => {
  await signInWithSampleData(page)
  await page.evaluate(() => navigator.serviceWorker.ready) // installed and active: the app is cached
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/app'))?.scope)).toMatch(/\/app$/)
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.scope)).toBeUndefined()

  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller) // the worker now controls the page
  await context.setOffline(true)
  await page.goto('/app/calendar')
  await expect(page.getByRole('heading', { name: 'Cage calendar', level: 1 })).toBeVisible()
  await page.goto('/app/bookings')
  await expect(page.locator('.ds-booking').first()).toBeVisible()
  expect(await page.evaluate(() => document.fonts.ready.then(() => [...document.fonts].some((f) => f.family === 'Fredoka' && f.status === 'loaded')))).toBe(true)
  await context.setOffline(false)
})

test.describe('layout on short and narrow screens', () => {
  test('on a short laptop screen the sidebar scrolls on its own down to "log out"', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 560 })
    await signInWithSampleData(page)
    const sidebar = page.getByRole('complementary')
    const logout = sidebar.getByRole('button', { name: 'Log out' })
    expect(await sidebar.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true) // the links don't fit
    await sidebar.evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect(logout).toBeInViewport()
    expect(await page.evaluate(() => window.scrollY)).toBe(0) // the page itself stayed put
  })

  test('the tax page shows how much of the final-tax turnover ceiling is used', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pethommie.locale', 'en'))
    await page.goto('/app/login')
    await page.getByRole('button', { name: /^use$/i }).nth(2).click() // the full hotel, on the final 0.5% tax
    await page.getByRole('button', { name: /^log in$/i }).click()
    await page.waitForURL((u) => !u.pathname.endsWith('/login'))
    await page.goto('/app/tax')
    const bar = page.getByRole('progressbar')
    await expect(bar).toBeVisible()
    expect((await bar.boundingBox())!.width).toBeGreaterThan(200)
    await expect(page.getByText(/% used/)).toBeVisible()
  })

  for (const width of [320, 768, 1024]) {
    test(`at ${width}px no screen scrolls sideways and chart dates never overlap`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/', '/privacy', '/terms']) {
        await page.goto(path)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0)
      }
      await signInWithSampleData(page)
      for (const path of ['/app', '/app/dashboard', '/app/calendar', '/app/bookings', '/app/bookings/new', '/app/customers', '/app/transactions',
        '/app/expenses', '/app/invoices', '/app/finance', '/app/reports', '/app/tax', '/app/pets', '/app/cages', '/app/link', '/app/settings']) {
        await page.goto(path)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0)
        // every chart stays inside its card, and the dates under it don't run into each other
        const problems = await page.evaluate(() => [...document.querySelectorAll('figure')].flatMap((fig) => {
          const box = fig.getBoundingClientRect()
          const out = [...fig.querySelectorAll('*')].some((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > box.right + 1 })
          const marks = [...fig.querySelectorAll('[class*="ticks"] span')]
            .filter((s) => s.textContent!.trim() && getComputedStyle(s).visibility !== 'hidden')
            .map((s) => { const range = document.createRange(); range.selectNodeContents(s); return range.getBoundingClientRect() })
          const overlap = marks.some((r, i) => i > 0 && r.left < marks[i - 1].right + 2)
          return [...(out ? [`${fig.textContent!.slice(0, 30)}: wider than its card`] : []), ...(overlap ? [`${fig.textContent!.slice(0, 30)}: dates overlap`] : [])]
        }))
        expect(problems, path).toEqual([])
      }
    })
  }
})
