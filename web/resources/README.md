# Resources

Drop raw images here. They are kept in the repo but **not** deployed. The web-ready versions are
generated into `public/`, which is what the site serves.

What is here now: `illustrations/0*_feature_*.png` (one diorama per feature on the landing page, generated in the
style of the V2 turntable film), `backgrounds/pet_hotel_scene.webp` (register page) and `backgrounds/faq_scene.webp`
(only its two bottom corners are used, see `CORNERS` in the script).

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
```

For illustrations the script removes stray slivers left by a crop, trims the empty margin and
keeps the alpha channel. To show an icon in the app, add a line to `ICONS` in the script, add the
name to a list of icon names, and render it with an `<img src="/icons/ui/<name>.webp">` component;
the previous `UiIcon`/`Illustration` components are in git history (commit `b4b1905`).

## Tips for good source files

- Leave a little transparent padding and **don't cut the drawing off at the edge**. A flat edge on the
  drawing itself can't be repaired.
- Illustrations show at roughly 300-400 px wide. Around 800 px of real detail keeps them sharp on
  phones (2x screens). Upscaled images don't help.
- Icons: 64 px is sharp only up to about 32 px on a 2x phone screen. Send 128 px or larger.
- Photos: landscape, at least 1200 px on the long side.
