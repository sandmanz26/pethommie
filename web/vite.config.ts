import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // The operator app works offline once it has been opened once. Only /app is controlled by the service
    // worker; the marketing site (and its large films) stays an ordinary website.
    VitePWA({
      disable: !!process.env.VITEST,
      registerType: 'prompt',
      scope: '/app',
      injectRegister: false,
      manifest: {
        name: 'Pethommie',
        short_name: 'Pethommie',
        description: 'Pet hotel management: bookings, cage calendar, check-in, daily care log and WhatsApp reports.',
        lang: 'id',
        start_url: '/app/',
        scope: '/app',
        display: 'standalone',
        background_color: '#f4efe6',
        theme_color: '#f4efe6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'icons/*.png', 'illustrations/*.webp'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/app(\/|$)/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
})
