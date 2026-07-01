/* descent.js — the only moving parts of the descent.
   (1) a disturbance over the ASCII that resolves, then rarely flickers — a signal stabilising.
   (2) procedural ambient music, unique per theme, via Web Audio.
   No CSS is touched anywhere: this manipulates text and sound only.
   Config arrives as window.R = { seed, glitch:{dur}, audio:{...} } set inline per page. */
(function () {
  "use strict";
  var R = window.R || {};

  /* ---------------------------------------------------------------- *
   * 1. DISTURBANCE  —  the screen arrives broken and settles         *
   * ---------------------------------------------------------------- */
  var art = document.getElementById("art");
  if (art) {
    var truth = art.textContent;
    var glyph = "▓▒░█#%&$@/\\|<>=+*·•:.,01xX¦‡†◦°";
    var seed = (R.seed || truth.length || 7) | 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var dur = (R.glitch && R.glitch.dur) || 3600;
    var lock = [];
    for (var i = 0; i < truth.length; i++)
      lock[i] = (truth[i] === "\n" || truth[i] === " ") ? 0 : Math.floor(rnd() * dur);

    var t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var el = ts - t0, out = "";
      for (var i = 0; i < truth.length; i++)
        out += (el >= lock[i]) ? truth[i] : glyph[(rnd() * glyph.length) | 0];
      art.textContent = out;
      if (el < dur) requestAnimationFrame(frame);
      else { art.textContent = truth; idle(); }
    }
    // respect reduced-motion: show the settled art at once, no glitch, no flicker
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) art.textContent = truth;
    else requestAnimationFrame(frame);

    function idle() {            // rare single-char flicker, fading out over ~30s
      var start = performance.now();
      (function tick() {
        var age = performance.now() - start;
        if (age > 30000) return;
        if (Math.random() < 0.05 * (1 - age / 30000)) {
          var idx = (Math.random() * truth.length) | 0;
          if (truth[idx] !== "\n" && truth[idx] !== " ") {
            var a = truth.split(""); a[idx] = glyph[(Math.random() * glyph.length) | 0];
            art.textContent = a.join("");
            setTimeout(function () { art.textContent = truth; }, 70);
          }
        }
        setTimeout(tick, 280);
      })();
    }
  }

  /* ---------------------------------------------------------------- *
   * 2. WITNESS — the forest keeps a small ledger of every passage.   *
   *    Nothing leaves the machine; the ledger is how the dark        *
   *    learns to address you. It can also be given back.             *
   * ---------------------------------------------------------------- */
  var WIT = null, WROOM = "";
  try {
    WROOM = (location.pathname.split("/").pop() || "").replace(/\.html?$/i, "");
    if (/\/descent\//i.test(location.pathname) && WROOM) {
      WIT = JSON.parse(localStorage.getItem("descent.trace") || "{}");
      WIT.rooms = WIT.rooms || {};
      if (!WIT.t0) WIT.t0 = Date.now();
      var wrec = WIT.rooms[WROOM] = WIT.rooms[WROOM] || { t: Date.now(), n: 0, s: 0 };
      wrec.n += 1;
      var wdepth = (function () {
        var m = (art ? art.textContent : "").match(/(\d+)\s*\/\s*40/);
        return m ? +m[1] : 0;
      })();
      if (wdepth > (WIT.deep || 0)) WIT.deep = wdepth;
      var wcame = Date.now();
      function wsave() { try { localStorage.setItem("descent.trace", JSON.stringify(WIT)); } catch (e) {} }
      addEventListener("pagehide", function () { wrec.s += Math.round((Date.now() - wcame) / 1000); wsave(); });
      wsave();

      /* the current notices you — deep rooms only, at most one dim line */
      if (wdepth >= 19 && art) {
        var facts = [];
        var wrongs = +localStorage.getItem("descent.404") || 0;
        var ember = +localStorage.getItem("descent.ember") || 0;
        if (wrec.n >= 4) facts.push("back again. this room remembers you better than you remember it.");
        if (wdepth >= 35 && !WIT.snd) facts.push("you came this far and never once listened.");
        if (wrongs >= 8) facts.push(wrongs + " wrong doors so far. the big one used to guess like that.");
        if (ember && wdepth >= 27) {
          var em = Math.round((Date.now() - ember) / 60000);
          if (em >= 30) facts.push("the coal has been yours for " + em + " minutes. still lit.");
        }
        if (wdepth >= 30 && Date.now() - WIT.t0 > 5400000)
          facts.push("you have been under a long while. the surface will look different.");
        if (facts.length) {
          var note = document.createElement("small");
          note.textContent = facts[0];
          note.style.cssText = "display:block;opacity:.4;margin:6px 0 0";
          art.parentNode.insertBefore(note, art.nextSibling);
        }
      }
    }
  } catch (e) {}

  /* ---------------------------------------------------------------- *
   * 3. MUSIC  —  one evolving ambient bed per theme                  *
   * ---------------------------------------------------------------- */
  var A = R.audio;
  if (!A) return;
  var snd = document.getElementById("snd");
  if (snd) snd.textContent = "○";
  var started = false;

  function MORSE_units(s) {            // ".- / -..." -> [{on,len}] in time-units
    var seq = [], parts = s.trim().split("");
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i];
      if (c === ".") { seq.push({ on: 1, len: 1 }); seq.push({ on: 0, len: 1 }); }
      else if (c === "-") { seq.push({ on: 1, len: 3 }); seq.push({ on: 0, len: 1 }); }
      else if (c === " ") { seq.push({ on: 0, len: 2 }); }
      else if (c === "/") { seq.push({ on: 0, len: 4 }); }
    }
    return seq;
  }

  function start() {
    if (started) return; started = true;
    var ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    if (snd) snd.textContent = "♪";
    try { if (WIT) { WIT.snd = 1; localStorage.setItem("descent.trace", JSON.stringify(WIT)); } } catch (e) {}

    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(A.gain || 0.16, ctx.currentTime + 5);

    var delay = ctx.createDelay(1.2); delay.delayTime.value = A.delay || 0.4;
    var fb = ctx.createGain(); fb.gain.value = 0.34;
    delay.connect(fb); fb.connect(delay); delay.connect(master);

    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = A.cutoff || 800; lp.Q.value = 6;
    lp.connect(master); lp.connect(delay);

    // slow filter LFO — the bed breathes
    var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = A.lfo || 0.05; lfoG.gain.value = (A.cutoff || 800) * 0.5;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();

    var root = A.root || 110, scale = A.scale || [0, 3, 5, 7, 10], wave = A.wave || "sine";

    // sustained drone: two detuned voices a chosen interval apart
    [0, A.drone != null ? A.drone : 7].forEach(function (semi, k) {
      var o = ctx.createOscillator(); o.type = wave;
      o.frequency.value = root * Math.pow(2, semi / 12);
      o.detune.value = k ? 6 : -6;
      var g = ctx.createGain(); g.gain.value = 0.0;
      o.connect(g); g.connect(lp);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 6);
      o.start();
    });

    // arpeggio: a soft note every beat, wandering the scale
    var bpm = A.bpm || 42, beat = 60 / bpm, step = 0, walk = 0;
    function pluck(semi, when, len, gain) {
      var o = ctx.createOscillator(); o.type = wave;
      o.frequency.value = root * Math.pow(2, semi / 12);
      var g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(lp);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gain, when + len * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0005, when + len);
      o.start(when); o.stop(when + len + 0.05);
    }
    setInterval(function () {
      walk += (Math.random() < 0.5 ? -1 : 1);
      walk = Math.max(0, Math.min(scale.length - 1, walk));
      var oct = 12 * (1 + (Math.random() < 0.25 ? 1 : 0));
      if (Math.random() < 0.8)
        pluck(scale[walk] + oct, ctx.currentTime + 0.02, beat * 1.7, 0.07);
      step++;
    }, beat * 1000);

    // beacon: bells tapping a morse string — diegetic clue on audio levels
    if (A.beacon) {
      var unit = A.beaconUnit || 0.1, bell = root * 4;
      function ping(when, len) {
        var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = bell;
        var g = ctx.createGain(); g.gain.value = 0;
        o.connect(g); g.connect(master);
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(0.18, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, when + len);
        o.start(when); o.stop(when + len + 0.02);
      }
      function run() {
        var seq = MORSE_units(A.beacon), t = ctx.currentTime + 1;
        seq.forEach(function (s) { if (s.on) ping(t, unit * s.len); t += unit * s.len; });
        setTimeout(run, (t - ctx.currentTime + 6) * 1000);   // repeat with a gap
      }
      run();
    }
  }

  addEventListener("keydown", start, { once: true });
  addEventListener("pointerdown", start, { once: true });
})();
