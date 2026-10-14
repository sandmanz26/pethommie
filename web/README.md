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
  films/ink/         V1: 181 WebP frames of the sumi-e ink film (15 s, 12 fps)
  films/turntable/   V2: 144 WebP frames of the illustrated turntable (12 s, 12 fps)
  video/             source videos from Higgsfield — not loaded by the page
src/
  i18n/              en.ts (default) and id.ts: all copy, chapter timings, prices.
                     Edit text here, not in components. LocaleProvider + EN/ID switch.
  content/film.ts    Film registry: frame count, duration, paper colour per film
  styles/            tokens.css (colors, type scale) and global.css
  components/
    ink/             InkFilm: sticky canvas that scrubs a film's frames with scroll
    film-switcher/   Floating, draggable V1/V2 switch (choice + position remembered)
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
- Caption positions come from `chapters.<film>[].at` (seconds into that film) in each `i18n/*.ts` file.
- Two films ship today. The floating switcher picks one; `<html data-film>` swaps the page palette to match.

To replace the film with a new video:

```bash
ffmpeg -i new.mp4 -vf "fps=12,scale=1280:-1" -c:v libwebp -quality 72 public/films/<id>/f%04d.webp
```

Then register it in `content/film.ts` and add its chapter/clock timings in `i18n/en.ts` and `i18n/id.ts`.
The V2 frames had two faint vertical lines (copied from the reference board) painted out at x<300 and x>990.

## Languages

English is the default. Indonesian is available from the EN / ID switch in the
top bar; the choice is remembered in the browser. `en.ts` defines the shape of
the copy, and TypeScript fails the build if `id.ts` is missing a key. To add a
language, copy `en.ts`, translate it, and register it in `i18n/locales.ts`.

## Waitlist (no backend yet)

`lib/waitlist.ts` defines a `WaitlistStore` interface. The current
implementation saves entries to `localStorage` and the form shows a "demo mode"
note. When an API exists, add a store that calls it and export it as
`waitlistStore`; the form does not need to change.
