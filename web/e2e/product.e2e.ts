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
  await expect(page.getByLabel(/^cage ·/i)).toHaveValue(/.+/)
  await expect(page.getByRole('heading', { name: 'New booking', level: 1 })).toBeVisible()
})

for (const [name, viewport, locale] of [
  ['desktop', { width: 1280, height: 800 }, 'en'],
  ['phone', { width: 390, height: 844 }, 'id'],
] as const) {
  test.describe(`${name}`, () => {
    test.use({ viewport })

    test('every operator screen is free of accessibility violations and fits the width', async ({ page }) => {
      await signInWithSampleData(page, locale)
      await page.goto('/app')
      const bookingHref = await page.locator('a[href*="#care"]').first().getAttribute('href')
      await page.goto('/app/transactions')
      const receiptHref = (await page.locator('a[href^="/app/receipts/"]').first().getAttribute('href')) ?? '/app'
      await page.goto('/app/invoices')
      const invoiceHref = (await page.locator('a[href^="/app/invoices/"]').first().getAttribute('href')) ?? '/app'
      const paths = [receiptHref, invoiceHref,
        '/app', '/app/calendar', '/app/bookings', '/app/bookings/new', '/app/pets', '/app/cages', '/app/settings',
        '/app/more', '/app/customers', '/app/payments', '/app/invoices', '/app/tax', '/app/reports', '/app/dashboard', '/app/transactions', '/app/help', bookingHref!.replace('#care', ''),
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
    for (const img of await page.locator('#tour [role=tabpanel]:not([hidden]) img').all()) {
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
