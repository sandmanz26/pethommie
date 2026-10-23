import type { Page } from '@playwright/test'

/** Signs up a real account (not the demo) and fills its hotel with sample data. The app starts in simple mode. */
export async function signInWithSampleData(page: Page, locale: 'en' | 'id' = 'en', mode: 'simple' | 'advanced' = 'advanced') {
  await page.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  await page.goto('/app/register')
  const field = (en: RegExp, id: RegExp) => page.getByLabel(locale === 'en' ? en : id)
  await field(/your name/i, /namamu/i).fill('Rina Kusuma')
  await field(/pet hotel name/i, /nama pet hotel/i).fill('Rumah Meong')
  await field(/^email$/i, /^email$/i).fill(`e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`)
  await field(/whatsapp number/i, /nomor whatsapp/i).fill('0812 3456 7890')
  await field(/^password$/i, /^password$/i).fill('E2eTest1234')
  await page.getByRole('button', { name: /^(create account|buat akun)$/i }).click()
  await page.getByRole('button', { name: /sample data|data contoh/i }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  if (mode === 'advanced') {
    // The switch is in the sidebar on a wide screen and on the More page on a phone.
    if (!(await page.getByRole('complementary').isVisible())) await page.goto('/app/more')
    await page.getByRole('tab', { name: /^(advanced|lengkap)$/i }).first().click()
  }
}
