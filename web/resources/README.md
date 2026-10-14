# Resources

Drop raw images here. They are kept in the repo but **not** deployed. The web-ready versions are
generated into `public/`, which is what the site serves.

| Put it in | What | Becomes |
|---|---|---|
| `illustrations/` | PNG cut-outs with a transparent background | `public/illustrations/<name>.webp` |
| `photos/` | Real photos (JPG, PNG or WebP) | `public/photos/<name>.webp` (max 1600 px, EXIF removed) |

`<name>` is the file name without its leading number, in kebab-case: `01_setup_store.png` becomes
`setup-store`, so the page uses it as `/illustrations/setup-store.webp`.

## Process

```bash
cd web
pip install pillow numpy          # once
python3 scripts/prepare-resources.py             # everything
python3 scripts/prepare-resources.py setup-store # just one
```

For illustrations the script removes stray slivers left by a crop, trims the empty margin and
keeps the alpha channel. Commit both the original and the generated file.

## Tips for good source files

- Leave a little transparent padding and **don't cut the drawing off at the edge**. A flat edge on the
  drawing itself can't be repaired.
- Illustrations show at roughly 300–400 px wide. Around 800 px of real detail keeps them sharp on
  phones (2x screens). Upscaled images don't help.
- Photos: landscape, at least 1200 px on the long side.

## Illustrations received

`setup-store`, `setup-price`, `pickup-delivery`, `additional-service`, `free-grooming`,
`free-hairstylist`, `playing-time`, `dog-walking`, `cat-ear-cleaning`, `24-hour-cctv`, `dog-diaper`,
`free-snacks`.

Cut off flat at the bottom edge in the source: `setup-store`, `setup-price`, `pickup-delivery`,
`additional-service`, `playing-time`.
