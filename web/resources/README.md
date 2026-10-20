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

## Icons and logo received

Small icons (64 px, the logo 340 x 287) sliced from sheets. Kept as originals in `icons/<set>/`; the
ones the app uses are listed in `ICONS` in `scripts/prepare-resources.py` and become
`public/icons/ui/<name>.webp`, named by what they are for (`meal`, `drink`, `dog`, ...). To use another
one, add a line to `ICONS`, run the script, and add the name to `UI_ICONS` in
`src/app/design-system/atoms/uiIcons.ts` (a test checks the two lists match the files).

| Folder | What |
|---|---|
| `icons/app/` | calendar, user dog/cat, clock, cctv, data, report, bag, food, kibble, diaper, money, voucher, promo, bone, drink |
| `icons/play/` | happy dog/cat, walking, toys, carriers, dog house, cat bed, haircut, grooming, ear cleaning, big/small dogs, cctv |
| `icons/care/` | sleep, night, day, fleas, sick, confused cat, reservation, full calendar, holiday, raw meat, litter box, litter, nails, paws |
| `logo/` | `logo_pethomi.png` (not used: cut off on the right) |

Used today: care log kinds (meal, water, play, toilet, medicine, mood, note, incident), dog and cat
faces as pet avatars, money / bag / report on the booking page, and empty states.

Problems in the sources (they were sliced from a sheet): the script removes slivers of neighbouring
icons, but drawings cut flat at the tile edge stay cut (calendar, clock, data and others, so these are
not used). The tile `app/16_drink` is empty because the sheet was cut one tile off: the water bowl is
in `app/15_bone`, right of the bone, and the script crops it from there. Sets with a sticker outline
show a faint dashed halo. 64 px is sharp only up to about 32 px on a 2x phone screen, so the app
shows them at 28 to 48 px. The logo is cut off at the right (the last letter of "pethomi").
The 12 illustrations received again in `pet_hotel_12_no_background*.zip` are byte-identical to the ones
already in `illustrations/`.
