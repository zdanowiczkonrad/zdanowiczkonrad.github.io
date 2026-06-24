# DESCENT — image prompts for the reworked rooms

The mechanics changed under plan #495; these rooms now want new art (their `alt` text has
already been updated to match the intended image, so dropping a new PNG in `arts/` aligns
everything). Rooms not listed keep their current art.

**Shared style — prepend to every prompt:**
> *320×320 square, dark moody lo-fi analog still, heavy film grain, faint CRT scanlines and vignette, near-black background, one dull subject lit from within, muted palette, no text, no logos, ominous minimal sci-fi dread, slightly soft focus.*

| file → arts/ | room | subject prompt | palette |
|--|--|--|--|
| `arts/sthgiew.png` | 8 boolean gates | a minimal circuit of glowing AND/OR/NOT logic-gate symbols wired on a dark board, warm traces | amber |
| `arts/signal.png` | 12 Lissajous | a single glowing oscilloscope trace forming a delicate looping Lissajous knot on a round CRT scope, faint graticule grid, green phosphor | green |
| `arts/klaxon.png` | 17 decay | a CRT screen mid-collapse, its glowing image sliding and dissolving into static and black, one word almost gone | red |
| `arts/darkness.png` | 18 midnight | a blank-faced analog wall clock, both hands straight up at midnight, dim backlight, dust in the air | violet |
| `arts/loop.png` | 28 two-tabs | two identical narrow windows side by side, the right one a faint delayed after-image echo of the left | green |
| `arts/echo.png` | 29 probe-doors | a long dark corridor lined with identical small hatches, some sealed shut, some open onto black voids, faint emergency light | green |
| `arts/seed.png` | 30 odd-comment-out | a row of identical featureless speaking masks in the dark, all mid-whisper, exactly one lit faintly from within | teal |
| `arts/cursor.png` | 34 ghost-diverges | two thin arrow cursors on a black field, one a half-step ahead of the other, a faint trailing line between them | teal |
| `arts/surface.png` | 36 byte-key cipher | an old brass key whose teeth are formed from tiny rows of ones and zeros and circuit traces, resting on dark glass | teal |
| `arts/persist.png` | 38 print-only | a single sheet of paper emerging from darkness under a thin bar of light, faint impressed text you cannot quite read | teal |
| `arts/deeper.png` | 41 the forest | an endless dark pine forest seen from above at night, trees in faint receding rows like uncountable doors, one distant warm point of light deep within | green→teal |

**Optional (404 room):** the `/404.html` room is pure ASCII (a single empty doorframe) and needs no image; if you want one:
> *a single wrong door standing alone in an empty grey void, ajar onto more void, sand drifting at its base* — amber.

Notes:
- `arts/signal.png` and `arts/cursor.png` previously depicted the old cipher; regenerating them is the only *required* replacements (their old art actively misleads). The rest are upgrades.
- All other rooms (tide 6, catch-second 16, ember 25, return-to-surface 35, plus every keep-room) reuse their existing art unchanged.
