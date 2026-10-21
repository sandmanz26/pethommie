// A smooth scroll down the homepage for Dribbble: 1600x1200 (4:3), 30 fps, H.264.
//
// Frames are rendered one by one, not recorded in real time: the page is scrolled to each frame's position and
// every CSS animation and transition is set to that frame's time, so the video is smooth however slow the machine.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/dribbble/video.mjs <out.mp4>
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const out = process.argv[2] ?? 'homepage-scroll.mp4'
const FPS = 30
/** CSS px per second while reading the sections below the film. */
const READ_SPEED = 430
const HOLD_START = 1.6
const FILM_SECONDS = 13
const HOLD_END = 1.8

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
// 1280x960 CSS px at 1.25x = 1600x1200: the wide layout, as on a laptop.
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1.25, serviceWorkers: 'block' })
await context.addInitScript(() => localStorage.setItem('pethommie.locale', 'en'))
const page = await context.newPage()
await page.goto(base)
await page.locator('.film__veil.is-done').waitFor({ state: 'attached', timeout: 60_000 })
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)

// Run down the page once so lazy images are in, then back to the top.
const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let y = 0; y <= height; y += 600) await page.evaluate((y) => window.scrollTo(0, y), y)
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForLoadState('networkidle')
await page.waitForTimeout(800)

const filmEnd = await page.evaluate(() => {
  const film = document.querySelector('.film')
  return film.offsetTop + film.offsetHeight - innerHeight
})
const readSeconds = (height - filmEnd) / READ_SPEED
const total = HOLD_START + FILM_SECONDS + 0.5 + readSeconds + HOLD_END
console.log(`page ${height}px, film ends at ${filmEnd}px, video ${total.toFixed(1)}s`)

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeSoft = (t) => 0.5 - Math.cos(Math.PI * t) / 2
/** Where the page is at a time in the video. */
function scrollAt(t) {
  let s = t - HOLD_START
  if (s <= 0) return 0
  if (s < FILM_SECONDS) return filmEnd * ease(s / FILM_SECONDS)
  s -= FILM_SECONDS + 0.5
  if (s <= 0) return filmEnd
  if (s < readSeconds) return filmEnd + (height - filmEnd) * easeSoft(s / readSeconds)
  return height
}

const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF ?? '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)))))

const frames = Math.round(total * FPS)
for (let i = 0; i < frames; i++) {
  const ms = (i / FPS) * 1000
  await page.evaluate(async ([y, ms]) => {
    window.scrollTo(0, Math.round(y))
    // let scroll handlers, observers and the film's canvas catch up
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    for (const a of document.getAnimations()) {
      if (a.__from === undefined) {
        a.__from = ms
        a.pause()
      }
      a.currentTime = ms - a.__from
    }
  }, [scrollAt(ms / 1000), ms])
  ffmpeg.stdin.write(await page.screenshot({ type: 'png' }))
  if (i % 60 === 0) console.log(`${i}/${frames}`)
}
ffmpeg.stdin.end()
await done
await browser.close()
console.log(out)
