import { defineConfig } from '@playwright/test'

/**
 * End-to-end checks against the built site (`npm run build` first). They cover what unit tests can't:
 * a real browser, real layout, the service worker, and accessibility of the rendered pages.
 * Set E2E_BASE_URL to run against a deployed site instead (e.g. the Vercel URL, to see the real headers).
 * Set PW_CHROMIUM to use an already-installed Chromium instead of the one `playwright install` fetches.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    serviceWorkers: 'allow',
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/app/login',
    reuseExistingServer: !process.env.CI,
  },
})
