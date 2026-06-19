# DESCENT — image prompts (40)

One image per page. Filename = page name → `assets/descent/<page>.png`.
Roles: **THEME** (mood only) · **CONCEPT** (shows the cipher *idea*, never the answer) · **CLUE** (the answer is really hidden in the pixels, low-contrast).

## Shared style — prepend to EVERY prompt
> Dark noir still from an imagined late-1990s operating system. Deep near-black background, one dim ink colour, one brighter accent — nothing else. Mysterious, searching, liminal; an empty in-between place, something just out of sight. Low light, heavy shadow, a single weak source. Technical but decayed: old CRT phosphor, scanlines, screen-burn, chromatic-aberration edges, blocky JPEG-style compression, coarse ordered dithering, raster dot texture, VHS tracking noise. Imperfect on purpose — banding, smearing, dead pixels, mis-registration. 4:3 frame.

## Shared negative — append to EVERY prompt
> no people, no faces, no clean modern UI, no glossy 3D render, no logos, no watermark, no signature, no bright daylight (except #40), no readable text unless the prompt asks for it, no colours outside the listed palette.

## Format (all)
PNG-8, indexed, ≤3 colours, **640×480**, shown on-page at 320px. Never JPEG-export. For **CLUE** images, typeset the exact characters in vector/pixel and composite — a diffusion model will corrupt them.

## Palettes by zone (bg / ink / accent)
- **Sand** `#0b0a07 / #9a8f73 / #e8d9a8` — pages 1–3
- **Amber** `#0d0a04 / #9a875a / #ffcf6a` — pages 4–10
- **Ember** `#0c0605 / #9a6a5e / #ff5a3c` — pages 11–17
- **Violet** `#08070b / #7d7790 / #b9a7ff` — pages 18–21
- **Green** `#050807 / #7d9488 / #3df58c` — pages 22–29
- **Teal** `#04080a / #8fb6b0 / #79f0d0` — pages 30–40

---

## 1 · ghost.png — Sand · CONCEPT
A wide desert at night, black dunes under a thin moon. One line of footprints crosses a flat, mirror-still pool in the foreground. In the reflection the prints point the **opposite way** and do not line up with the real ones. The mirror is the whole idea. Faint highlight on the water; everything else swallowed by shadow.

## 2 · tresed.png — Sand · CONCEPT
A sealed bulkhead hatch set into a concrete wall, lit by one weak emergency lamp. A small worn sign hangs above it. A few of the sign's letters have quietly turned into glowing numbers — a **3** where an E belongs, a **1** where an I belongs. Frost at the edges, flickering tube light. Claustrophobic, no way through.

## 3 · 3x1t.png — Sand · THEME
A long, low service corridor that ends in a flat blank wall. No door, no handle. Dust hanging in the weak light. The vanishing point pulls you forward into nothing.

## 4 · tnerruc.png — Amber · THEME
A single thin line of warm amber light running across a black floor like a current you cannot switch off. Everything around it is dark. Faint hum implied in the haze.

## 5 · dneps.png — Amber · THEME
An old electric meter mounted on a damp wall, glass frosted. The needle has fallen and rests near empty. One amber digit glows weakly behind cracked glass.

## 6 · c00l4nt.png — Amber · THEME
Frost spreading across a dead machine. Pipes furred white with ice, valves seized. The thing that used to run hot is silent and cold.

## 7 · refiuqa.png — Amber · THEME
A cross-section of layered rock with a flat sheet of perfectly still water held between the strata. A single drop about to fall. Quiet, buried, patient.

## 8 · sthgiew.png — Amber · CLUE
Heavy foundry counterweights hanging on chains in a dark shaft. Each weight is faintly stamped with one character; read down the chain, **very low contrast**, they spell **GR4D13NT** (composite the exact glyphs, barely one shade above the metal). Nothing points at them; you only catch it if you stare.

## 9 · gr4d13nt.png — Amber · CONCEPT
A brass dial with a ring of letters around its edge, turned part way around so the marks no longer sit under their labels. A small engraved notch and arrow show that it has been **stepped along** by some fixed amount. The shift is the idea — not the answer.

## 10 · rcbpu.png — Amber · THEME
An old round clock face with no hands, the glass cracked across the middle. Time stopped here. Amber numerals ghosting under grime.

## 11 · lizxov.png — Ember · THEME
A dead oracle-terminal in red gloom. One line of glowing output, too smeared and bloomed to read. The block cursor still blinks at the end of it. Phosphor burn, scanlines.

## 12 · signal.png — Ember · CLUE
A dim wall of hex bytes, like a paused memory dump, rows and rows. Among them, five bytes — **`73 63 61 6c 65`** — sit exactly one shade brighter than the rest, in reading order, with nothing else pointing to them. Typeset the hex crisply and composite.

## 13 · scale.png — Ember · THEME
A tall tower seen at night. Its windows are lit and dark in an uneven, deliberate-looking pattern, like a code nobody will read. Red bloom on the lit panes.

## 14 · hunger.png — Ember · THEME
A deep vertical shaft dropping straight down past a few marked floor numbers, the bottom lost in black. The scale of it feels hungry. Heavy vignette.

## 15 · core.png — Ember · THEME
A reactor core still warm at the centre, glowing dull red through grime and dust. Faint heat-haze ripples the air. It is still asking something.

## 16 · tsacdaorb.png — Ember · CLUE
A broadcast tower against the dark. A single horizontal row of warning lamps blinks in short and long groups, read left to right: **`-.- .-.. .- -..- --- -.`** (six morse groups, dot = short streak, dash = long streak). Render as light, not letters — no text. Lay the groups out exactly.

## 17 · klaxon.png — Ember · THEME
One rotating alarm beacon on a pole, sweeping a hard cone of red light across an empty machine room. The room is bare; the alarm is for something far away.

## 18 · darkness.png — Violet · CONCEPT
Almost total black. A faint horizontal alphabet strip has slid exactly **one notch** sideways, so each letter now sits over the letter that follows it. Just enough violet glow to see the single step. One step off — that is the whole idea.

## 19 · sfqmz.png — Violet · THEME
Lettered stone tiles spilled across a floor like rubble, face up, in no order at all. Violet light rakes low across them. The right pieces, the wrong arrangement.

## 20 · collapse.png — Violet · THEME
A wall built of small characters, caught mid-collapse, streaming downward and breaking apart into grain. Motion smear, falling dither.

## 21 · cinder.png — Violet · THEME
Heavy violet television static filling the frame. Somewhere deep in the noise, one small red point still holds on, almost out. You feel it more than see it.

## 22 · hush.png — Violet · CONCEPT
Two see-through sheets of noise overlap. Each sheet alone is meaningless; where they cross, the noise **cancels** and a clean empty patch appears. Show the patch blank — the cancellation is the idea, not the word inside it.

## 23 · canopy.png — Green · CONCEPT
Looking straight up into a forest canopy that is mirrored by a tangle of roots below, meeting at a waterline. The roots are the same shapes as the leaves, **reflected**. Green dapple, deep shadow.

## 24 · worrub.png — Green · THEME
A burrow wall of stacked sticks and packed earth. A few sticks, spaced evenly apart, are notched and charred — a rhythm in the woodpile. Damp, close, underground.

## 25 · kindling.png — Green · THEME
A small pile of embers in the dark, just enough glow to not go out. A held breath of heat. Green-tinged smoke curling off.

## 26 · 3mb3r.png — Green · THEME
Smoke rising off cooling coals. Each curl of smoke seems to **double** — every shape echoed once beside itself, as if the air stutters. Soft green trails.

## 27 · recursion.png — Green · CONCEPT
A glowing rectangle that contains a smaller copy of the same rectangle, and a smaller one inside that, three levels deep. A thing holding itself. Green phosphor, fractal framing.

## 28 · loop.png — Green · THEME
A single sound-wave bent into a closed ring, repeating around the loop and fading a little each time it comes back to the start. Oscilloscope green.

## 29 · echo.png — Green · THEME
Faint dots and gaps laid out in strict even rows on dark ground, like seeds planted to a plan. Some positions filled, some empty — deliberate, unreadable at a glance.

## 30 · seed.png — Teal · THEME
A single pale seed cracking open in dark soil, one thin root reaching down. Teal glow at the split. The smallest beginning, buried.

## 31 · ecneicsnoc.png — Teal · THEME
Several hands held up in the dark, each frozen in a different shape, as if mid-spelling. Diagram-like teal outlines, no letters, no faces. Quiet, almost reverent.

## 32 · hand.png — Teal · CLUE
A fingertip resting on a small plate of raised dots. The dots are real braille reading **⠉ ⠁ ⠗ ⠑** (four cells). Raking teal light throws shadows so the bumps are visible; nothing labels them. Place the dot positions exactly and composite.

## 33 · care.png — Teal · THEME
Strange bracket-and-dot shapes scratched in a worn row on a metal plate, half-erased. Old marks someone left on purpose. Teal corrosion.

## 34 · cursor.png — Teal · THEME
A single blinking block cursor on a dark screen, a slow log scrolling past behind it, deliberately out of focus so no line can be read. Teal phosphor, scanlines.

## 35 · foresight.png — Teal · THEME
An audio spectrogram glowing teal across the frame. The bright bands carry a clear rhythm — short and long pulses — like a heartbeat hidden inside a picture. Read it as sound, not text.

## 36 · surface.png — Teal · CONCEPT
A sunrise dial: a horizon ring turned **thirteen steps**, so the word engraved on the rim no longer matches the word engraved inside it. First teal light rising behind the dial. The turn is the idea.

## 37 · qnloernx.png — Teal · THEME
First daylight breaking over a low ridge, throwing long rays across a row of pale stones. The light is almost reaching you. Teal warming toward gold.

## 38 · persist.png — Teal · CLUE
A prison-style wall covered in scratched tally marks, gathered into seven clear groups counting **23, 9, 20, 14, 5, 19, 19** (e.g. four-and-a-cross clusters). Just marks — no numerals written. Carve the counts exactly; let them read as endurance, not arithmetic.

## 39 · witness.png — Teal · CONCEPT
A single word held up to a mirror — but the reflection shows **different letters** than the original, as if the glass swaps each one for its opposite. Keep both blurred enough that only the *mismatch* reads, never the words. Teal daylight beginning.

## 40 · slkv.png — Teal · THEME / the reveal
Full daybreak at the surface, the long descent finally behind you. Calm, plain, almost clean — the only un-decayed image in the set, just a soft teal sky going to gold over a flat horizon. Optional: one almost-invisible word, `ghost`, in a shadowed corner, to loop the whole thing back to the start.
