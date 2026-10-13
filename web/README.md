# Pethommie Web

Frontend foundation for Pethommie, a pet hotel app for Indonesian operators.
React 19 + TypeScript + Vite, no backend yet.

## Run

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run lint
```

## Structure

```
public/
  frames/            181 WebP frames of the ink film (12 fps, 1280px)
  video/             source video from Higgsfield (15 s, 720p) — not loaded by the page
src/
  content/landing.ts All copy, chapter timings, prices. Edit text here, not in components.
  styles/            tokens.css (colors, type scale) and global.css
  components/
    ink/             InkFilm: sticky canvas that scrubs the frames with scroll
    layout/          TopBar, Footer
    ui/              Button, Hanko (seal mark), BrushLine
  sections/          Hero, Features, RaporPreview, LebaranPackage, WaitlistForm
  hooks/             useScrollProgress, useFrameSequence (preloading)
  lib/               drawFrame (canvas fit), waitlist (storage adapter)
  pages/             LandingPage, NotFoundPage
  App.tsx            Routes. Operator app routes get added here.
```

## How the scroll film works

The video is pre-split into frames and drawn to a `<canvas>` based on scroll
position (the same approach Apple uses on product pages). This scrubs smoothly
forwards and backwards on every browser, which seeking a `<video>` does not.

- Frames load coarse-to-fine (every 30th, 10th, 3rd, then all) so a fast scroll shows the whole story early.
- Scroll handling runs once per animation frame and never re-renders React.
- Caption positions come from `chapters[].at` (seconds into the film) in `content/landing.ts`.

To replace the film with a new video:

```bash
ffmpeg -i new.mp4 -vf "fps=12,scale=1280:-1" -c:v libwebp -quality 72 public/frames/f%04d.webp
```

Then update `film.frameCount` and the chapter/clock timings in `content/landing.ts`.

## Waitlist (no backend yet)

`lib/waitlist.ts` defines a `WaitlistStore` interface. The current
implementation saves entries to `localStorage` and the form shows a "demo mode"
note. When an API exists, add a store that calls it and export it as
`waitlistStore`; the form does not need to change.
