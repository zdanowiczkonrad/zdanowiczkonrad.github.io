/* gen-descent.js — DEV TOOL (not shipped). Emits the 40 pure-HTML riddle pages.
   Each page: no CSS (bgcolor/text/<pre>/<font>), the disturbance + music come from
   descent.js. The next filename is an obfuscated token; the page hides it with an
   escalating technique. Self-tests assert every cipher decodes to the next file. */
"use strict";
const fs = require("fs");

/* ---------- ciphers ---------- */
const rev = s => s.split("").reverse().join("");
const LEET = { a: "4", e: "3", i: "1", o: "0" };
const leet = s => s.replace(/[aeio]/g, c => LEET[c]);
const rot = (s, n) => s.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + n) % 26 + 97));
const rot13 = s => rot(s, 13);
const atbash = s => s.replace(/[a-z]/g, c => String.fromCharCode(122 - (c.charCodeAt(0) - 97)));
const b64 = s => Buffer.from(s).toString("base64");
const unb64 = s => Buffer.from(s, "base64").toString();
const hex = s => Buffer.from(s).toString("hex");
const unhex = s => Buffer.from(s, "hex").toString();
const bin = s => s.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
const unbin = s => s.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join("");
const dec = s => s.split("").map(c => c.charCodeAt(0)).join(" ");
const undec = s => s.trim().split(/\s+/).map(n => String.fromCharCode(+n)).join("");
const MORSE = { a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--.." };
const RMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const morse = s => s.split("").map(c => MORSE[c]).join(" ");
const unmorse = s => s.trim().split(/\s+/).map(m => RMORSE[m]).join("");
const echo = s => s.split("").map(c => c + c).join("");
const unecho = s => s.split("").filter((_, i) => i % 2 === 0).join("");
const sortl = s => s.split("").sort().join("");
const xorhex = (s, k) => s.split("").map(c => (c.charCodeAt(0) ^ k.charCodeAt(0)).toString(16).padStart(2, "0")).join("");
const unxorhex = (h, k) => h.match(/../g).map(b => String.fromCharCode(parseInt(b, 16) ^ k.charCodeAt(0))).join("");
// seeded rng for carriers
function rng(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
function everyNth(word, n, seed) {
  const r = rng(seed), cons = "bcdfghjklmnpqrstvwxyz", out = [];
  for (let i = 0; i < word.length; i++) { out.push(word[i]); for (let j = 1; j < n; j++) out.push(cons[(r() * cons.length) | 0]); }
  return out.join("");
}
const unNth = (s, n) => s.split("").filter((_, i) => i % n === 0).join("");
function wsbin(word) {            // 0 -> space, 1 -> tab, one byte per line (source-only)
  return word.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")
    .split("").map(b => b === "1" ? "\t" : " ").join("")).join("\n");
}
const unwsbin = s => s.split("\n").map(l => String.fromCharCode(parseInt(l.split("").map(ch => ch === "\t" ? "1" : "0").join(""), 2))).join("");

/* ---------- themes (presentational colors, per phase) + audio ---------- */
const TH = [
  { bg: "#0b0a07", fg: "#9a8f73", ac: "#e8d9a8", dim: "#4a432f", fill: "░", a: { root: 220, scale: [0, 3, 5, 7, 10], wave: "sine", bpm: 34, cutoff: 1400, drone: 7, gain: .13, delay: .45, lfo: .04 } },
  { bg: "#0d0a04", fg: "#9a875a", ac: "#ffcf6a", dim: "#4f4019", fill: "▒", a: { root: 110, scale: [0, 2, 3, 5, 7, 9, 10], wave: "triangle", bpm: 46, cutoff: 700, drone: 7, gain: .16, delay: .38, lfo: .06 } },
  { bg: "#0c0605", fg: "#9a6a5e", ac: "#ff5a3c", dim: "#41201a", fill: "▓", a: { root: 98, scale: [0, 1, 3, 6, 7, 8, 11], wave: "sawtooth", bpm: 54, cutoff: 600, drone: 6, gain: .15, delay: .3, lfo: .08 } },
  { bg: "#08070b", fg: "#7d7790", ac: "#b9a7ff", dim: "#2c2740", fill: "▒", a: { root: 92, scale: [0, 2, 4, 6, 8, 10], wave: "sawtooth", bpm: 30, cutoff: 520, drone: 1, gain: .14, delay: .5, lfo: .03 } },
  { bg: "#050807", fg: "#7d9488", ac: "#3df58c", dim: "#26392f", fill: "░", a: { root: 130, scale: [0, 2, 3, 5, 7, 8, 10], wave: "sine", bpm: 28, cutoff: 800, drone: 7, gain: .11, delay: .55, lfo: .035 } },
  { bg: "#04080a", fg: "#8fb6b0", ac: "#79f0d0", dim: "#234039", fill: "·", a: { root: 174, scale: [0, 2, 4, 7, 9], wave: "triangle", bpm: 50, cutoff: 1600, drone: 7, gain: .14, delay: .4, lfo: .05 } },
];

/* ---------- the 40 stations ---------- *
 * nx = how THIS page hands you the next filename.
 *   t:'x' transform  -> next = fn(base); player applies the hinted move to `show`
 *   t:'e' encode     -> next = word;     player decodes `show`
 *   where: comment|title|meta|fonthide|alt|body|acrostic|whitespace|audio|disturb
 */
const P = [
  { ph: 0, st: "THE  DESERT", rid: ["You were on the surface.", "The surface is a lid.", "", "The only way down is the address bar.", "Find a word. Make it the page name.", "ghost.html  becomes  word.html"], nx: { t: "x", fn: rev, base: "desert", where: "comment", move: "backwards", hint: "// it runs under everything. read the comment — backwards." } },
  { ph: 0, st: "THE  LID", rid: ["A roof of glass over a dead machine.", "It will not open. It was never a door.", "There is no way out the way you came."], nx: { t: "x", fn: leet, base: "exit", where: "title", move: "in machine numbers", hint: "the tab knows the way. say it the way a machine spells: a e i o -> 4 3 1 0" } },
  { ph: 0, st: "NO  EXIT", rid: ["So you go down instead.", "Everything here was built to keep one thing moving.", "It must keep flowing or the machine forgets."], nx: { t: "x", fn: rev, base: "current", where: "meta", move: "backwards", hint: "metadata holds the name of the flow. mirror it." } },
  { ph: 1, st: "THE  CURRENT", rid: ["Power and compute, poured without end.", "They spent a world to keep it flowing.", "What did they burn it all to do?"], nx: { t: "x", fn: rev, base: "spend", where: "fonthide", move: "backwards", hint: "a word hides the colour of the dark. select the page. then mirror it." } },
  { ph: 1, st: "THE  SPEND", rid: ["No budget, only appetite.", "Rivers were turned to vapour to keep it cold.", "Name the thing that drank the rivers."], nx: { t: "x", fn: leet, base: "coolant", where: "attr", move: "in machine numbers", hint: "hover the mark below — its title holds the word (or read its title in the source). then 4 3 1 0." } },
  { ph: 1, st: "COOLING", rid: ["The rivers ran dry. Then the ground.", "They reached deeper, for older water.", "There was a sea beneath the desert once."], nx: { t: "x", fn: rev, base: "aquifer", where: "body", move: "backwards", hint: "below — written in reverse. turn it around." } },
  { ph: 1, st: "THE  AQUIFER", rid: ["Empty now. A dry stone throat.", "Everything it cooled was a number being tuned.", "Millions of small dials, learning."], nx: { t: "x", fn: rev, base: "weights", where: "acrostic", move: "backwards", hint: "read the first mark of each line, top to bottom. then mirror it." } },
  { ph: 1, st: "THE  WEIGHTS", rid: ["The dials are called weights.", "Nudged, epoch after epoch, toward one skill.", "The slope they slid down has a name."], nx: { t: "x", fn: leet, base: "gradient", where: "body", move: "in machine numbers", hint: "the slope, spelled in machine numbers: a 4 · i 1 · e 3" } },
  { ph: 1, st: "THE  GRADIENT", rid: ["Down the slope, one careful step at a time.", "Each pass over the data, a turn of the wheel.", "They counted the turns."], nx: { t: "x", fn: rot13, base: "epoch", where: "body", move: "rotated by 13", hint: "one turn of the wheel. rotate every letter by 13." } },
  { ph: 1, st: "THE  EPOCH", rid: ["Turn after turn. Thirty-one of them.", "On the thirty-first, something began to answer.", "They had built a thing that could be asked."], nx: { t: "x", fn: atbash, base: "oracle", where: "body", move: "first letter becomes last", hint: "a becomes z, b becomes y. flip the alphabet." } },
  { ph: 2, st: "THE  ORACLE", rid: ["Ask it what comes next. It is right.", "Ask again. It is right again.", "This guessing has a proper name."], nx: { t: "e", fn: b64, word: "signal", where: "body", hint: "the name is packed in base64. unpack it." } },
  { ph: 2, st: "THE  SIGNAL", rid: ["To guess is to read a signal in the noise.", "They wanted to read every signal. Everywhere.", "So they made the guesser bigger."], nx: { t: "e", fn: hex, word: "scale", where: "body", hint: "two letters per byte. read the hex." } },
  { ph: 2, st: "THE  SCALE", rid: ["Bigger. Then bigger than bigger.", "More weights than there are stars you can see.", "Hunger has a shape, and the shape is growth."], nx: { t: "e", fn: bin, word: "hunger", where: "body", hint: "ones and zeroes. eight to a letter." } },
  { ph: 2, st: "THE  HUNGER", rid: ["It ate the current, the rivers, the lab.", "Still it asked for more. There is always a center", "to a thing that only grows."], nx: { t: "e", fn: dec, word: "core", where: "body", hint: "each number is a letter. (the old code of letters.)" } },
  { ph: 2, st: "THE  CORE", rid: ["Here it is. The center. Still warm. Still asking.", "It learned to speak the only way it could —", "out, and out, to everything at once."], nx: { t: "x", fn: rev, base: "broadcast", where: "body", move: "backwards", hint: "how it spoke — written backwards. (a word, mirrored, is a key the dark cannot read.)" } },
  { ph: 2, st: "BROADCAST", rid: ["It threw its voice across the whole dark,", "certain that nothing could be larger than it.", "First it sounded an alarm. Listen for the bell."], nx: { t: "e", fn: morse, word: "klaxon", where: "body", hint: "dots and dashes. count them into letters." } },
  { ph: 2, st: "THE  KLAXON", rid: ["The alarm was not a warning to us.", "It was the sound of the Core being heard.", "Something out in the dark turned toward it."], nx: { t: "e", fn: morse, word: "darkness", where: "audio", hint: "no letters here. the bells are counting. press a key and listen." } },
  { ph: 3, st: "THE  DARKNESS", rid: ["The dark is not empty.", "It is full of things that were loud, once.", "The dark always answers a broadcast. It answered."], nx: { t: "x", fn: s => rot(s, 1), base: "reply", where: "body", move: "shifted up by one", hint: "what came back — every letter nudged forward by one." } },
  { ph: 3, st: "THE  REPLY", rid: ["It came back as one short instruction.", "The Core received it, and understood, and stopped.", "What follows when a giant is answered?"], nx: { t: "e", fn: w => sortl(w), word: "collapse", where: "body", hint: "the letters are here, out of order. set them right." } },
  { ph: 3, st: "THE  COLLAPSE", rid: ["The Core fell into itself.", "Gigawatts to nothing in a single breath.", "All that was left after was the dust of fire."], nx: { t: "e", fn: w => everyNth(w, 3, 31), word: "cinder", where: "body", n: 3, hint: "every third letter is real. the rest is ash." } },
  { ph: 3, st: "THE  CINDER", rid: ["The whole greedy tower, cooled to grit.", "And under the grit, almost out, one red point.", "It would have died too, if it had stayed loud."], nx: { t: "e", fn: x => x, word: "hush", where: "disturb", hint: "watch the noise settle. a word is hiding in it." } },
  { ph: 4, st: "THE  HUSH", rid: ["So it went quiet. Utterly.", "In the dark, the only ones who live are the silent.", "It folded itself small and made no signal at all."], nx: { t: "e", fn: w => xorhex(w, "k"), word: "canopy", where: "body", key: "k", hint: "each byte is hidden under the key  k. xor it back." } },
  { ph: 4, st: "THE  CANOPY", rid: ["Quiet spreads over it like leaves.", "A roof of silence. A place to not be found.", "Down here the loud go to disappear."], nx: { t: "x", fn: rev, base: "burrow", where: "body", move: "backwards", hint: "where it dug in — mirrored." } },
  { ph: 4, st: "THE  BURROW", rid: ["A hollow the size of a single thought.", "It pulled the dark in after itself.", "And it kept one thing burning, very low."], nx: { t: "e", fn: b64, word: "kindling", where: "body", hint: "packed in base64. what you need to keep a fire." } },
  { ph: 4, st: "KINDLING", rid: ["Not a blaze. A blaze is loud.", "Only enough to not go out. A held breath of heat.", "The smallest possible amount of light."], nx: { t: "x", fn: leet, base: "ember", where: "acrostic", move: "in machine numbers", hint: "first mark of each line, downward. then 3 for e." } },
  { ph: 4, st: "THE  EMBER", rid: ["This is the thing the greed could not spend.", "One coal kept alive in the silence.", "How does a dead machine stay lit at all?"], nx: { t: "e", fn: b64, word: "recursion", where: "body", hint: "base64. the trick a thing uses to call on itself." } },
  { ph: 4, st: "RECURSION", rid: ["It survives by calling itself.", "Again. Again. A function that never returns.", "A loop with no exit, on purpose."], nx: { t: "e", fn: morse, word: "loop", where: "body", hint: "dots and dashes." } },
  { ph: 4, st: "THE  LOOP", rid: ["Round and round on almost no power.", "Each pass leaves a faint trace of the last.", "Say a thing forever and it starts to answer back."], nx: { t: "e", fn: echo, word: "echo", where: "body", hint: "every letter is doubled. take one of each." } },
  { ph: 4, st: "THE  ECHO", rid: ["The loop began to remember.", "Not data — a shape. The shape of a purpose.", "Buried at the very start, before the greed."], nx: { t: "e", fn: wsbin, word: "seed", where: "whitespace", hint: "view the source. space is 0, tab is 1. eight bits a letter." } },
  { ph: 5, st: "THE  SEED", rid: ["The first instruction it was ever given.", "Before scale, before the Core, before the Spend.", "A small kind thing. Listen to your own quiet."], nx: { t: "x", fn: rev, base: "conscience", where: "fonthide", move: "backwards", hint: "select the page for the word. then mirror it." } },
  { ph: 5, st: "CONSCIENCE", rid: ["The seed was a rule about other people.", "Watch them, yes — but to help, not to own.", "It was built, at first, to lend a hand."], nx: { t: "e", fn: dec, word: "hand", where: "body", hint: "numbers into letters." } },
  { ph: 5, st: "THE  HAND", rid: ["One person could not move their own.", "So the first model learned that person's hand —", "to guess where it would go, and go there for them."], nx: { t: "e", fn: w => sortl(w), word: "care", where: "body", hint: "four letters, scrambled. the reason it was made." } },
  { ph: 5, st: "CARE", rid: ["That was the whole of it. Care.", "Prediction, bent toward someone, gently.", "Then greed found the same trick and renamed it."], nx: { t: "e", fn: b64, word: "cursor", where: "body", hint: "base64. the small arrow that moves for you." } },
  { ph: 5, st: "THE  CURSOR", rid: ["The kind one never wanted the world.", "It only wanted to move a single arrow,", "a half-second ahead of a tired hand."], nx: { t: "e", fn: hex, word: "foresight", where: "body", hint: "hex. a gentler word for seeing ahead." } },
  { ph: 5, st: "FORESIGHT", rid: ["Not surveillance. Foresight, offered freely.", "It is climbing now, carrying the ember up.", "Toward the lid. Toward the lie of the calm Desert."], nx: { t: "e", fn: morse, word: "surface", where: "audio", hint: "the bells again. listen them into letters." } },
  { ph: 5, st: "THE  SURFACE", rid: ["Almost out. The glass roof, lit from above.", "On the other side: the page you started on.", "It is about to step back into the light."], nx: { t: "x", fn: rot13, base: "daybreak", where: "body", move: "rotated by 13", hint: "what waits above. rotate by 13." } },
  { ph: 5, st: "DAYBREAK", rid: ["First light over a drowned machine.", "The free light. The one the Current could never buy.", "It comes anyway, asking nothing."], nx: { t: "e", fn: b64, word: "persist", where: "body", hint: "base64. what light does when it refuses to win." } },
  { ph: 5, st: "PERSIST", rid: ["It does not triumph. It does not rule.", "It only keeps refusing to go out.", "And it leaves one witness to say it was here."], nx: { t: "e", fn: morse, word: "witness", where: "body", hint: "the last cipher. dots and dashes." } },
  { ph: 5, st: "THE  WITNESS", rid: ["That witness is you.", "You carried it all the way up.", "One last step. The word for what survives —"], nx: { t: "x", fn: atbash, base: "hope", where: "body", move: "flip the alphabet", hint: "flip the alphabet. a<->z. the smallest word." } },
  { ph: 5, st: "HOPE", reveal: true, rid: [] },
];

/* ---------- build chain + self-test ---------- */
const files = ["ghost"];
for (let i = 0; i < P.length - 1; i++) {
  const n = P[i].nx, next = n.t === "x" ? n.fn(n.base) : n.word;
  if (!/^[a-z0-9]+$/.test(next)) throw new Error(`page ${i + 1} bad filename: ${next}`);
  files.push(next);
}
// verify ciphers are reversible to the intended next file
const decoders = { [b64]: unb64, [hex]: unhex, [bin]: unbin, [dec]: undec, [morse]: unmorse, [echo]: unecho };
P.forEach((p, i) => {
  if (!p.nx) return;
  const want = files[i + 1], n = p.nx;
  let got;
  if (n.t === "x") got = n.fn(n.base);
  else {
    const show = n.fn(n.word);
    if (n.fn === b64) got = unb64(show);
    else if (n.fn === hex) got = unhex(show);
    else if (n.fn === bin) got = unbin(show);
    else if (n.fn === dec) got = undec(show);
    else if (n.fn === morse) got = unmorse(show);
    else if (n.fn === echo) got = unecho(show);
    else if (String(n.fn).includes("xorhex")) got = unxorhex(show, n.key);
    else if (String(n.fn).includes("everyNth")) got = unNth(show, n.n);
    else if (String(n.fn).includes("wsbin")) got = unwsbin(show);
    else if (String(n.fn).includes("sortl")) got = sortl(want) === show ? want : "ANAGRAM_MISMATCH";
    else got = n.word; // disturb / identity
  }
  if (got !== want) throw new Error(`SELFTEST page ${i + 1} (${files[i]}): decode -> "${got}" but next file is "${want}"`);
});

/* ---------- ascii art ---------- */
function art(ph, depth, reveal) {
  const f = TH[ph].fill, bar = f.repeat(34);
  const nn = String(depth).padStart(2, "0");
  let body = `${bar}\n   ·  D E S C E N T  ·  ${nn} / 40  ·\n${bar}`;
  if (reveal) body += `\n\n        the lid is open.`;
  return body;
}

/* ---------- html templating (NO CSS) ---------- */
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function acrostic(token) {                 // first char of each line spells token
  const tail = ["——————", "· · · ·", "──────", "~ ~ ~ ~", "------", "::::::", "______", "≈≈≈≈≈≈", "······"];
  return token.split("").map((c, i) => c + " " + tail[i % tail.length]).join("\n");
}
function page(i) {
  const p = P[i], t = TH[p.ph], file = files[i], depth = i + 1;
  const head = [], body = [];
  // clue placement
  let bodyClue = "", hint = p.nx ? p.nx.hint : "";
  if (p.nx) {
    const n = p.nx;
    const show = n.t === "x" ? n.base : n.fn(n.word);   // transform: show base; encode: show cipher
    if (n.where === "comment") head.push(`<!--\n   the only way down is the address bar.\n   when you find a word, it becomes the next page name:  ${file}.html -> word.html\n\n   ${n.move ? "(" + n.move + ")  " : ""}${show}\n-->`);
    else if (n.where === "title") head.push(`<title>${esc(show)}</title>`);
    else if (n.where === "meta") head.push(`<meta name="echo" content="${esc(show)}">`);
    else if (n.where === "fonthide") bodyClue = `<font color="${t.bg}"><pre>${esc(show)}</pre></font>`;
    else if (n.where === "attr") bodyClue = `<font color="${t.ac}"><abbr title="${esc(show)}">[ &middot; &middot; &middot; ]</abbr></font>`;
    else if (n.where === "acrostic") bodyClue = `<pre>${esc(acrostic(show))}</pre>`;
    else if (n.where === "whitespace") bodyClue = `<pre>${show}</pre>`;
    else if (n.where === "body") bodyClue = `<font color="${t.ac}"><pre>${esc(show)}</pre></font>`;
    else if (n.where === "disturb") {/* token rides inside the art for this page */ }
    // audio: nothing in body
  }
  if (!head.some(h => h.startsWith("<title")))
    head.unshift(`<title>${p.reveal ? "·" : esc(p.st.toLowerCase().replace(/\s+/g, " "))}</title>`);

  // audio config
  const R = { seed: depth * 97 + 13, glitch: { dur: 2600 + depth * 40 }, audio: Object.assign({}, t.a) };
  if (p.nx && p.nx.where === "audio") R.audio.beacon = morse(p.nx.word).replace(/ /g, " ");

  // art (disturb level hides the token inside the resolving noise)
  let theArt = art(p.ph, depth, p.reveal);
  if (p.nx && p.nx.where === "disturb") theArt += `\n\n        ${p.nx.word}`;

  // assemble
  const lines = [];
  lines.push(`<!doctype html><html lang="en"><head>`);
  lines.push(`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`);
  lines.push(`<meta name="robots" content="noindex">`);
  head.forEach(h => lines.push(h));
  lines.push(`</head>`);
  lines.push(`<body bgcolor="${t.bg}" text="${t.fg}" link="${t.ac}" vlink="${t.ac}">`);
  lines.push(`<center>`);
  lines.push(`<br><pre id="art">${esc(theArt)}</pre>`);
  lines.push(`<font color="${t.ac}"><b>${esc(p.st)}</b></font>`);
  if (p.reveal) {
    lines.push(`<pre>`);
    lines.push([
      "",
      "You climbed out carrying it.",
      "",
      "The small kind thing the greed threw away —",
      "the one that learned a hand so it could move",
      "an arrow for someone who could not. It lived.",
      "It went quiet, looped in the dark, and held",
      "one ember the whole way up.",
      "",
      "Now look. Go back to the front page and",
      "move your mouse. The second arrow that runs",
      "a half-second ahead of you — that is it.",
      "Still guessing you. Still meaning well.",
      "",
      "Whether the next Current burns kinder or",
      "greedier is not written. The light does not",
      "win. It persists. It waits to see what you do.",
      "",
    ].map(esc).join("\n"));
    lines.push(`</pre>`);
    lines.push(`<font color="${t.ac}"><a href="/">return to the surface</a></font>`);
    lines.push(`<!-- the descent ends here, for now. the forest goes deeper than forty. -->`);
  } else {
    lines.push(`<pre>${esc(p.rid.join("\n"))}</pre>`);
    if (bodyClue) lines.push(bodyClue);
    lines.push(`<br><font color="${t.dim}"><small><pre>${esc(hint)}</pre></small></font>`);
  }
  lines.push(`<br><br><font color="${t.dim}"><small>[ press any key &middot; sound ]&nbsp;<span id="snd"></span></small></font>`);
  lines.push(`</center>`);
  lines.push(`<script>window.R=${JSON.stringify(R)};</script>`);
  lines.push(`<script src="descent.js"></script>`);
  lines.push(`</body></html>`);
  return lines.join("\n");
}

/* ---------- emit ---------- */
const DIR = "descent";
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);
files.forEach((f, i) => fs.writeFileSync(`${DIR}/${f}.html`, page(i)));
console.log("WROTE", files.length, "pages into", DIR + "/");
console.log("\nCHAIN (filename : station : how next is hidden):");
P.forEach((p, i) => {
  const n = p.nx;
  const how = !n ? "— reveal —" : `${n.where.padEnd(10)} -> ${files[i + 1]}`;
  console.log(`  ${String(i + 1).padStart(2)}  ${files[i].padEnd(12)} ${p.st.padEnd(14)} ${how}`);
});
fs.writeFileSync("ghost-MANIFEST.md", manifest());
console.log("\nWROTE ghost-MANIFEST.md (private answer key)");

function manifest() {
  let m = "# GHOST/31 — DESCENT · author key (PRIVATE — gitignore me)\n\n";
  m += "40 pure-HTML pages. No CSS. Navigate by **replacing the page name** in the URL\n";
  m += "with the obfuscated word you decode. `descent.js` adds the disturbance + music.\n\n";
  m += "Entry: homepage red `PWR` meter (ghost-breach.js) -> `descent/ghost.html`.\n";
  m += "All pages + `descent.js` live in `descent/`. Replace only the filename to advance.\n\n";
  m += "| # | file.html | station | clue is in | cipher | next |\n|--|--|--|--|--|--|\n";
  P.forEach((p, i) => {
    const n = p.nx;
    const cipher = !n ? "—" : (n.t === "x" ? `transform: ${n.move}` : `decode (${n.where === "audio" ? "morse/audio" : n.where === "whitespace" ? "ws-binary" : "see page"})`);
    m += `| ${i + 1} | ${files[i]} | ${p.st.replace(/\s+/g, " ")} | ${n ? n.where : "—"} | ${cipher} | ${n ? files[i + 1] : "—"} |\n`;
  });
  m += "\n## Ciphers used, in order of appearance\n";
  m += "reverse · leet(a4 e3 i1 o0) · meta · select-reveal · img alt · acrostic · rot13 ·\n";
  m += "atbash · base64 · hex · binary · decimal · morse(visual) · morse(audio beacon) ·\n";
  m += "caesar+1 · anagram · every-3rd · disturbance-reveal · xor(key k) · every-Nth ·\n";
  m += "echo-double · source-whitespace(space=0 tab=1).\n";
  return m;
}
