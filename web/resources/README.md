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

## Icons and logo received (not used in the app yet)

Kept as originals only; nothing here is deployed or prepared. All are 64 px (the logo 340 x 287).

| Folder | What |
|---|---|
| `icons/app/` | calendar, user dog/cat, clock, cctv, data, report, bag, food, kibble, diaper, money, voucher, promo, bone, drink |
| `icons/play/` | happy dog/cat, walking, toys, carriers, dog house, cat bed, haircut, grooming, ear cleaning, big/small dogs, cctv |
| `icons/care/` | sleep, night, day, fleas, sick, confused cat, reservation, full calendar, holiday, raw meat, litter box, litter, nails, paws |
| `logo/` | `logo_pethomi.png` |

Known problems in these sources (they were sliced from a sheet): many tiles contain slivers of the
neighbouring icon, some drawings are cut flat at the tile edge (calendar, user dog/cat, clock, data
and others), the sets with a sticker outline show a dashed halo, and the logo is cut off on the right
(the last letter of "pethomi"). 64 px is sharp only up to about 32 px on a 2x phone screen. The
12 illustrations received again in `pet_hotel_12_no_background*.zip` are byte-identical to the ones
already in `illustrations/`.
