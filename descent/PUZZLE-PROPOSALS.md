# DESCENT — 10 creative puzzle proposals (variety pass)

> **STATUS: P1–P8 and P10 BUILT.** Only **P9 (image enumeration)** is not built. `signal.png` and `care.png` should be regenerated (their old cipher-specific art no longer matches).

Each replaces a *repetitive* cipher (8 pages currently use plain reverse; base64/hex/morse repeat) with a distinct puzzle type. All are worked out to yield the exact next page name. "Regen" = needs a new image; everything else lives in the page **body** or **source**. Nothing is implemented yet — pick any subset.

Unifying house rule kept: page names are still the address bar. A couple of puzzles fold the old "reverse" into the puzzle *object* (a mirror, a reflection) instead of an instruction.

| # | page → next | replaces | method | regen? |
|--|--|--|--|--|
| P1 | signal (12) → scale | hex | cryptic crossword clue | no |
| P2 | hunger (14) → core | ascii-decimal | riddle in a source comment | no |
| P3 | 3x1t (3) → tnerruc | reverse | word-search hiding the filename | no |
| P4 | tnerruc (4) → dneps | reverse | arithmetic ledger → letters | no |
| P5 | refiuqa (7) → sthgiew | acrostic+reverse | balance / weighing puzzle | no |
| P6 | care (33) → cursor | base64 | chess knight's-path | optional |
| P7 | recursion (27) → loop | morse | a poem that loops (acrostic) | no |
| P8 | core (15) → tsacdaorb | reverse | mirror device (depicted, not instructed) | no |
| P9 | canopy (23) → worrub | reverse | image enumeration (count the roots) | **yes** |
| P10 | qnloernx (37) → persist | base64 | lateral / lore fill-in riddle | no |

---

### P1 · signal → `scale` — CRYPTIC CROSSWORD CLUE
The "decoded transmission" is one cryptic clue:
> **"Climb the fish's armour (5)"**

Double meaning — to *scale* a wall (climb) / a fish's *scale* (armour). Answer typed straight: `scale`.
Hint (zone 2): "the signal carries one clue. solve it." Lives: body.

### P2 · hunger → `core` — RIDDLE IN A SOURCE COMMENT
View-source reward. HTML comment:
> `<!-- The apple keeps me at its heart. The planet keeps me at its own. The reactor screams my name. Four letters — the centre of it all. -->`

→ `core`. Visible hint: "it asks from the centre — look underneath the page." Lives: source.

### P3 · 3x1t → `tnerruc` — WORD-SEARCH (hides the filename itself)
A 7×5 monospace grid in the body; the string **`tnerruc`** runs along one diagonal — the "current" flowing through. Trace it, type it. No separate reverse step.
```
 q w t n e r r u c k     (illustrative — final grid places `tnerruc`
 a t s d f g h j k l      on a diagonal, padded with noise)
 ...
```
Hint (zone 1): "trace the current through the grid." Lives: body.

### P4 · tnerruc → `dneps` — ARITHMETIC LEDGER (numbers → letters)
Five sums; each result is a letter (a=1). Designed to read the filename out **directly**:
```
√16 = ?   → 4   (d)
2 × 7 = ? → 14  (n)
20 ÷ 4 = ?→ 5   (e)
4²  = ?   → 16  (p)
23 − 4 = ?→ 19  (s)
```
Read top-to-bottom: `dneps`. Hint (zone 1): "the spend, line by line. a = 1." Lives: body.

### P5 · refiuqa → `sthgiew` — BALANCE / WEIGHING PUZZLE
Thematic ("weights"). A stack of ASCII balance scales; each balanced pair leaves one unknown mass; the masses (a=1) read top-to-bottom spell **WEIGHTS**, then the house rule (names read backwards) → `sthgiew`.
```
 [ 5 + ? ] = [ 24 ]   ? = 19 ... etc.
```
Hint (zone 2): "balance each beam. then, as ever, backwards." Lives: body (or image, regen).

### P6 · care → `cursor` — CHESS, KNIGHT'S PATH
A board with letters on six squares. From the marked start, the **unique** knight's tour of those squares visits them spelling **C-U-R-S-O-R**. Follow the knight, type `cursor`.
Hint (zone 4, terse): "the knight knows the way." Lives: body (ASCII board) or image (regen for a real board).

### P7 · recursion → `loop` — A POEM THAT LOOPS (acrostic)
Four lines; first letters spell **L-O-O-P**; the last line feeds back to the first (it loops):
> **L**ight starts the circuit's run,
> **O**ut past the open gate,
> **O**nward it turns to find
> **P**lainly, the start again —

Hint (zone 3): "read it down the left. then read it again." Lives: body.

### P8 · core → `tsacdaorb` — MIRROR DEVICE (reverse made an object)
Instead of "read it backwards," draw an ASCII mirror: `BROADCAST` against a reflective line, its reflection rendered as `TSACDAORB`. The solver reads the **reflection** — a broadcast going out and echoing back — and types it.
```
   B R O A D C A S T
  ─────────────────── (mirror)
   T S A C D A O R B
```
Hint (zone 2): "what it sent, returning." Lives: body.

### P9 · canopy → `worrub` — IMAGE ENUMERATION
Regenerate `canopy.png` so the roots form **six countable clusters**; counting them L→R gives 2·21·18·18·15·23 (a=1) → B-U-R-R-O-W, then mirrored (roots echo the leaves) → `worrub`.
Hint (zone 3): "count the roots. then read them as the leaves would — reversed." Lives: image. **Regen required.**

### P10 · qnloernx → `persist` — LATERAL / LORE FILL-IN
Ties to the ending's own line ("the light does not win — it persists"):
> **"Day broke on a drowned machine. The light did not win. It did this instead (7):"**

→ `persist`. Hint (zone 4): "what light does when it refuses to win." Lives: body.

---

## Notes
- **Sudoku — ✅ BUILT on `collapse` (20 → cinder).** A real 9×9 with a unique solution; solve it, then read 8 blank cells (given as row,col) grouped into 6 A1Z26 numbers → C-I-N-D-E-R. This also removed the last every-N duplicate (worrub keeps every-2nd).
- **Anagram / palindrome / steganography** are also on the table — say the word and I'll draft variants.
- Each alteration touches one page (clue block + graded hint + voice; P9 also the image). They preserve the hand-holding gradient (P3/P4 easy & early-ish, P6/P10 terse & deep).
- Difficulty rises with depth as designed; P6 (chess) and P9 (enumeration) are the spiciest.
