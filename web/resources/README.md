# Resources

Drop raw images here. They are kept in the repo but **not** deployed. The web-ready versions are
generated into `public/`, which is what the site serves.

What is here now, all generated in the style of the turntable film:

- `illustrations/0*_feature_*.png`: one diorama per feature on the landing page; `1*_pricing_*.png`: the two plans.
- `illustrations/2*_app_*.png`: the operator app's onboarding steps, empty states and page banners;
  `28_app_link.png` is the booking link (the app's Booking link page and the landing page's booking link section).
- `illustrations/30_kind_cages.png`, `31_kind_rooms.png`, `32_kind_home.png`, `33_kind_cattery.png`: the four kinds
  of pet hotel in the landing page's "who it's for" section. These and `28_app_link.png` were generated with
  Higgsfield `gpt_image_2_5` in the same diorama style.
- `icons/nav_sheet.png`: the 16 navigation icons on one 4 x 4 sheet, cut by the script into `public/icons/nav/`.
  `icons/nav_sheet_2.png` (2 x 2: dashboard, link, transactions, upgrade), `icons/nav_sheet_3.png` (2 x 2: chat,
  night, grooming, play; made for the film's captions, which also use some of the first sheet) and
  `icons/nav_sheet_4.png` (2 x 2: expenses, finance, savings, incident) are cut the same way. The sheets and
  their names are in `NAV_SHEETS` in the script, and in `src/app/design-system/atoms/art.ts`; a test checks the files
  exist.
- `backgrounds/pet_hotel_scene.webp` (register), `backgrounds/login_scene.png` (login), `backgrounds/faq_scene.webp`
  (only its two bottom corners are used, see `CORNERS`).

| Put it in | What | Becomes |
|---|---|---|
| `illustrations/` | PNG cut-outs with a transparent background | `public/illustrations/<name>.webp` |
| `icons/<set>/` | Small icons cut from a sheet | `public/icons/ui/<name>.webp`, for those listed in `ICONS` in the script |
| `backgrounds/` | Full scenes with an empty or faded middle | `public/backgrounds/<name>.webp` and `-800.webp`; or only corners (`CORNERS`) |
| `photos/` | Real photos (JPG, PNG or WebP) | `public/photos/<name>.webp` (max 1600 px, EXIF removed) |

`<name>` is the file name without its leading number, in kebab-case: `01_setup_store.png` becomes
`setup-store`.

## Process

```bash
cd web
pip install pillow numpy          # once
python3 scripts/prepare-resources.py             # everything
python3 scripts/prepare-resources.py setup-store # just one
python3 scripts/prepare-resources.py --screens   # app screens captured into public/screens (see web/README.md)
```

`--screens` turns the PNGs that `scripts/capture-features.mjs` and `scripts/capture-dashboard.mjs` leave in
`public/screens/` into WebP and removes the PNG: phone views up to 520 px wide, `wide-` screens (the dashboard,
`wide-dashboard-<locale>`) up to 1200 px, the rest up to 640 px.

For illustrations the script removes stray slivers left by a crop, trims the empty margin and
keeps the alpha channel. To show an icon in the app, add a line to `ICONS` in the script, add the
name to a list of icon names, and render it with an `<img src="/icons/ui/<name>.webp">` component;
the previous `UiIcon` component is in git history (commit `b4b1905`). Illustrations in the app go through
`Illustration` (`src/app/design-system/atoms/Illustration.tsx`, names in `ILLUSTRATIONS` in `art.ts`).

## Tips for good source files

- Leave a little transparent padding and **don't cut the drawing off at the edge**. A flat edge on the
  drawing itself can't be repaired.
- Illustrations show at roughly 300-400 px wide. Around 800 px of real detail keeps them sharp on
  phones (2x screens). Upscaled images don't help.
- Icons: 64 px is sharp only up to about 32 px on a 2x phone screen. Send 128 px or larger.
- Photos: landscape, at least 1200 px on the long side.
