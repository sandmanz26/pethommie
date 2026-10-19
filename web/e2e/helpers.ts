import type { Page } from '@playwright/test'

/** Signs in as the second demo account and fills the hotel with sample data. */
export async function signInWithSampleData(page: Page, locale: 'en' | 'id' = 'en') {
  await page.addInitScript((l) => localStorage.setItem('pethommie.locale', l), locale)
  await page.goto('/app/login')
  await page.getByRole('button', { name: /^(use|pakai)$/i }).nth(1).click()
  await page.getByRole('button', { name: /^(log in|masuk)$/i }).click()
  await page.getByRole('button', { name: /sample data|data contoh/i }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}
