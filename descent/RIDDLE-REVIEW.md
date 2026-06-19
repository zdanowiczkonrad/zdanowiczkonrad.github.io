# DESCENT — riddle review: diff + suggestions

A full pass over all 40 pages: every page's real on-page cipher decoded, checked against its hint, its in-source `voice:` comment, and the image you generated in `arts/`. This records **what was changed** and **what is still suggested**.

> **Root cause found.** The original pages had *explicit* cipher hints (e.g. rot13 "rotate every letter by 13", atbash "a becomes z, b becomes y", xor "the key k", leet "a e i o → 4 3 1 0"). An earlier pass softened all hints into mood lines and **removed those cipher names** — which is why "how do I know to reverse `current`?" had no answer. This review re-adds the missing signposts (kept oblique, in the `voice:` where possible) and aligns each page's cipher ↔ hint ↔ image.

---

## A. Changes applied this session

### A1 · Reverse signposting (the "how do I know to reverse?" gap)
Page 1 teaches reverse via the head comment `(backwards) desert`. Pages 3/4/6/7/30 found the plaintext but never said to reverse it. Added a reverse cue to each page's in-source `voice:` comment.

| Page | clue is in | voice cue added |
|---|---|---|
| 3x1t | meta `current` | "…and every name here reads backwards." |
| tnerruc | hidden word `spend` | "(every name down here reads backwards.)" |
| c00l4nt | hidden word `aquifer` | "the water's name is here, facing backwards." |
| refiuqa | acrostic `weights` | "turned backwards, like all of them." |
| seed | hidden word `conscience` | "buried, the colour of the soil, and turned around." |

### A2 · Cipher ↔ hint alignment (hint named the wrong cipher)
| Page | actual cipher | hint before | hint now |
|---|---|---|---|
| signal | hex `7363616c65` | "a few characters are not like the others" | "two hex digits make one letter" |
| ecneicsnoc | ascii-decimal `104 97 110 100` | "it grew the word in reverse" | "each number is a letter's code" |
| cursor | hex `666f72…` | "first letter of each line" | "two hex digits make one letter" |
| qnloernx | base64 `cGVy…==` | "first light, first letters" | "packed tight. unpack it" |
| recursion | morse `.-.. --- --- .--.` | "find the smallest copy of the word" | "dots and dashes — read it as code" |

### A3 · XOR was unsolvable
`hush` (`080a05041b12`, key `k`) had no key cue. New hint: **"xor each byte against one letter — the eleventh of the alphabet."**

### A4 · Clue swapped to match the image you already generated
Four images depicted a different cipher than the page used. To avoid regenerating art, the **clue was changed to match the image** (decodes verified):

| Page | image depicts | new clue | decodes to |
|---|---|---|---|
| 3mb3r | doubled smoke | `rreeccuurrssiioonn` (echo-double) | recursion ✓ |
| hand | braille card | `⠉⠁⠗⠑` (braille) | care ✓ |
| persist | tally key | `23 9 20 14 5 19 19` (A1Z26) | witness ✓ |
| worrub | sticks notched at even intervals | `akoiunedrlsitncg` (every-2nd) | kindling ✓ |

### A5 · One image must be regenerated
`care.png` shows pigpen bracket-and-dot marks, but the page uses base64 (`Y3Vyc29y`→cursor) and pigpen can't be typed as page text. Its prompt + alt were repointed to a neutral worn "care-label" that encodes nothing. **→ regenerate `care.png`.**

---

## B. Full solvability matrix (post-fix)

`✓` solvable & consistent · `★` too easy (see §C1) · `⚠` open item

| # | page → next | cipher | clue is in | how the cipher is signalled now | level |
|--|--|--|--|--|--|
| 1 | ghost → tresed | reverse | head comment | comment says "backwards" + reflection image | teach ✓ |
| 2 | tresed → 3x1t | leet | `<title>` exit | image = EXIT + key legend | teach ✓ |
| 3 | 3x1t → tnerruc | reverse | meta `current` | voice "reads backwards" | ✓ |
| 4 | tnerruc → dneps | reverse | hidden word | voice "reads backwards" | ✓ |
| 5 | dneps → c00l4nt | leet | tag attribute | image = COOLANT + key | ✓ |
| 6 | c00l4nt → refiuqa | reverse | hidden word | voice "facing backwards" | ✓ |
| 7 | refiuqa → sthgiew | acrostic → reverse | acrostic | hint "first letters" + voice "backwards" | ✓ |
| 8 | sthgiew → gr4d13nt | leet | visible | image = GRADIENT + key | ✓ |
| 9 | gr4d13nt → rcbpu | rot13 | visible `epoch` | hint "turned thirteen steps" + dial image | ✓ |
| 10 | rcbpu → lizxov | atbash | visible `oracle` | voice "a meets z" + hint "mirror" | ✓ |
| 11 | lizxov → signal | base64 | visible | hint "packed, unpack" | ✓ |
| 12 | signal → scale | hex | visible | hint "two hex digits" + hex-card image | ✓ |
| 13 | scale → hunger | binary | visible | hint "on and off" | ✓ |
| 14 | hunger → core | ascii-decimal | visible | hint "letters turned into numbers" | ✓ |
| 15 | core → tsacdaorb | reverse | **hidden** word | hint "uncover it … backwards" | ✓ |
| 16 | tsacdaorb → klaxon | morse | visible | hint "short and long" + lamps image | ✓ |
| 17 | klaxon → darkness | morse (audio) | audio beacon | hint "press a key and listen" | hard ✓ |
| 18 | darkness → sfqmz | caesar+1 | **hidden** word | hint "uncover … one step on" | ✓ |
| 19 | sfqmz → collapse | anagram | visible | hint "right letters, wrong order" | ✓ |
| 20 | collapse → cinder | every-3rd | visible | hint "keep every third one" | ✓ |
| 21 | cinder → hush | disturbance reveal | art block | hint "let the noise settle" | ✓ |
| 22 | hush → canopy | xor (key k) | visible | hint "xor … the eleventh" | hard ✓ |
| 23 | canopy → worrub | reverse | **hidden** word | hint "uncover … roots = leaves reversed" | ✓ |
| 24 | worrub → kindling | every-2nd | visible | hint "every second letter" + notched image | ✓ |
| 25 | kindling → 3mb3r | acrostic → leet | prose acrostic | hint "what the fire leaves … wear numbers" | ✓ (reworked) |
| 26 | 3mb3r → recursion | echo-double | visible | hint "said twice" + doubled image | ✓ ⚠ dup w/ loop |
| 27 | recursion → loop | morse | visible | hint "dots and dashes" | ✓ |
| 28 | loop → echo | echo-double | visible | hint "first time is the true one" | ✓ ⚠ dup w/ 3mb3r |
| 29 | echo → seed | whitespace-binary | source whitespace | hint "gaps in the source are counting" | hard ✓ |
| 30 | seed → ecneicsnoc | reverse | hidden word | voice "turned around" | ✓ |
| 31 | ecneicsnoc → hand | ascii-decimal | visible | hint "each number is a letter's code" | ✓ |
| 32 | hand → care | braille | visible | hint "spells in dots" + braille image | ✓ |
| 33 | care → cursor | base64 | visible | hint "packed, unpack" | ✓ ⚠ regen image |
| 34 | cursor → foresight | hex | visible | hint "two hex digits" | ✓ |
| 35 | foresight → surface | morse (audio) | audio beacon | hint "listen to the rhythm" | hard ✓ |
| 36 | surface → qnloernx | rot13 | **hidden** word | hint "uncover … thirteen steps" + dial | ✓ |
| 37 | qnloernx → persist | base64 | visible | hint "packed, unpack" | ✓ |
| 38 | persist → witness | A1Z26 | visible | hint "count … a is one" + tally image | ✓ |
| 39 | witness → slkv | atbash | **hidden** word | hint "uncover … hold to the glass" | ✓ |
| 40 | slkv | — | — | the reveal | end |

---

## C. Suggestions (C1, C2 applied; C3–C5 open)

### C1 · Difficulty: 5 pages past 10 are too easy — ✅ APPLIED
`core (15)`, `darkness (18)`, `canopy (23)`, `surface (36)`, `witness (39)` printed the plaintext word plainly in the accent colour, so only a one-step transform remained. Each word was recoloured accent → background, so it is now hidden (select-all / view-source to find), and each hint updated to "uncover it, then <transform>". The solver must now *find* the word **and** transform it.

### C2 · gr4d13nt: state the shift — ✅ APPLIED
rot13's amount is explicit again: voice → "the dial moved thirteen, and stopped"; hint → "the name is here — every letter turned thirteen steps". (Matches `surface`'s "thirteen steps" cue.)

### C3 · Cipher variety (side-effect of A4)
Matching the generated images introduced two small duplicates: **echo-double** now on both `3mb3r` and `loop`; **every-N** on both `collapse` (3rd) and `worrub` (2nd). Harmless, but if you want full variety back, the cleaner fix is to regenerate `3mb3r.png` / `worrub.png` and restore their original base64 clues.

### C4 · Regenerate `care.png`
From the updated prompt in `IMAGE-PROMPTS-FOOTAGE.md` (#33) — neutral worn care-label, no cipher marks.

### C5 · Oblique vs explicit hints — a taste call
Current hints name the *kind* of operation ("two hex digits", "packed, unpack", "xor … the eleventh") but stay softer than the originals, which spelled cipher names outright. This is solvable and more mysterious. If any feel too thin in playtesting, the originals (preserved in git history) can be restored per page.

---

## D. Decode verification (the four swapped clues)
```
worrub   akoiunedrlsitncg  → every 2nd letter → k i n d l i n g  → kindling
3mb3r    rreeccuurrssiioonn → drop the doubles → r e c u r s i o n → recursion
persist  23 9 20 14 5 19 19 → A=1…Z=26        → w i t n e s s     → witness
hand     ⠉ ⠁ ⠗ ⠑           → braille          → c a r e           → care
```

### C6 · Hand-holding gradient — ✅ APPLIED
Hints now ease off as the descent deepens, so the player is taught the ciphers, then trusted with them:
- **Zone 1 — pages 1–10 (explicit):** full recipe, e.g. tresed "spell it in machine numbers: o→0 i→1 e→3 a→4", rcbpu "flip the alphabet — a becomes z, b becomes y", gr4d13nt "turned thirteen steps forward. turn them back".
- **Zone 2 — pages 11–20 (named):** name the operation only, e.g. lizxov "packed in base64. unpack it", signal "it's hex — two digits to a letter", tsacdaorb "morse — short and long".
- **Zone 3 — pages 21–30 (oblique):** point at the idea, e.g. canopy "the roots are the leaves, reversed", loop "the first of each pair is the true one", seed "backwards, as ever".
- **Zone 4 — pages 31–40 (minimal):** a nudge; the image/voice carry the method, e.g. care "unpack it", cursor "hex, as before", witness "the glass knows".
- **Repeat ciphers get terser each time** they recur (hex: "two digits to a letter" → "hex, as before"; reverse: full recipe → "backwards, as ever").
- **Exception:** `hush` (xor) keeps its key cue regardless of depth — it's the one cipher that's unsolvable without it.
