/* descent-signal.js — live signal puzzles for the descent.
   The payload is an OPAQUE number array — no letters, dots/dashes or the answer
   word ever appear in the source. To read it you must play and watch.
     window.SIG = { mode:"morse", unit:240, sig:[ +on / -off units ... ] }
              | { mode:"roll",  hold:1100, gap:300, base:220, freqs:[ Hz ... ] }
   Renders to <canvas id="sig">, plays on the first key / pointer. Click to replay. */
(function () {
  "use strict";
  var S = window.SIG; if (!S) return;
  var cv = document.getElementById("sig"); if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = cv.width, H = cv.height;
  var AC = document.body.getAttribute("link") || "#79f0d0";
  var DIM = "#33403a";

  var actx = null, analyser = null, wave = null, started = false, t0 = 0, tEnd = 0;
  var segs = [], notes = [];

  function tone(when, dur, freq) {
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    o.connect(g); g.connect(analyser);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.22, when + 0.02);
    g.gain.setValueAtTime(0.22, when + Math.max(dur - 0.05, 0.05));
    g.gain.exponentialRampToValueAtTime(0.0006, when + dur);
    o.start(when); o.stop(when + dur + 0.03);
  }

  /* ---------- MORSE: timeline of pips + live oscilloscope ---------- */
  function buildMorse() {
    var u = (S.unit || 240) / 1000, t = t0;
    segs = [];
    S.sig.forEach(function (n) {
      var d = Math.abs(n) * u, on = n > 0;
      segs.push({ on: on, s: t, e: t + d });
      if (on) tone(t, d, 520);
      t += d;
    });
    tEnd = t;
  }
  function drawMorse() {
    if (!actx || actx.state === "closed") return;
    var now = actx.currentTime;
    ctx.clearRect(0, 0, W, H);
    var pad = 12, T = Math.max(tEnd - t0, 0.001);
    var sx = function (tt) { return pad + (tt - t0) / T * (W - 2 * pad); };
    var yBar = H - 28, bh = 18;
    segs.forEach(function (g) {
      if (!g.on) return;
      var x1 = sx(g.s), xe = sx(g.e);
      if (g.s > now) { ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.strokeRect(x1, yBar, xe - x1, bh); return; }
      var x2 = sx(Math.min(g.e, now));
      ctx.fillStyle = AC; ctx.fillRect(x1, yBar, Math.max(x2 - x1, 1.5), bh);
    });
    var px = sx(Math.min(now, tEnd));
    ctx.strokeStyle = AC; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(px, 6); ctx.lineTo(px, H - 4); ctx.stroke();
    ctx.globalAlpha = 1;
    analyser.getByteTimeDomainData(wave);
    var midY = H * 0.36, amp = H * 0.26;
    ctx.strokeStyle = AC; ctx.lineWidth = 1.4; ctx.beginPath();
    for (var i = 0; i < wave.length; i += 3) {
      var x = pad + (i / wave.length) * (W - 2 * pad);
      var y = midY + (wave[i] / 128 - 1) * amp;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (now < tEnd + 0.4) requestAnimationFrame(drawMorse);
  }

  /* ---------- ROLL: tones snapped to labelled A–Z lanes ---------- */
  function buildRoll() {
    var hold = (S.hold || 1100) / 1000, gap = (S.gap || 300) / 1000, base = S.base || 220, t = t0;
    notes = [];
    S.freqs.forEach(function (f) {
      var lane = Math.round(12 * Math.log(f / base) / Math.log(2));
      lane = Math.max(0, Math.min(25, lane));
      notes.push({ s: t, e: t + hold, lane: lane });
      tone(t, hold, f);
      t += hold + gap;
    });
    tEnd = t;
  }
  function drawRoll() {
    if (!actx || actx.state === "closed") return;
    var now = actx.currentTime;
    ctx.clearRect(0, 0, W, H);
    var padL = 18, padR = 10, padT = 8, padB = 8, rows = 26;
    var rh = (H - padT - padB) / rows;
    var T = Math.max(tEnd - t0, 0.001);
    var sx = function (tt) { return padL + (tt - t0) / T * (W - padL - padR); };
    ctx.font = "9px monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "start";
    for (var r = 0; r < rows; r++) {
      var yc = padT + r * rh + rh / 2;
      ctx.strokeStyle = "#15201c"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, yc); ctx.lineTo(W - padR, yc); ctx.stroke();
      ctx.fillStyle = DIM; ctx.fillText(String.fromCharCode(65 + r), 4, yc);
    }
    notes.forEach(function (nt) {
      if (nt.s > now) return;
      var yc = padT + nt.lane * rh + rh / 2, x = sx(nt.s);
      var on = now >= nt.s && now <= nt.e;
      if (on) {
        ctx.fillStyle = AC; ctx.globalAlpha = 0.14;
        ctx.fillRect(padL, padT + nt.lane * rh, W - padL - padR, rh); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = AC; ctx.globalAlpha = on ? 1 : 0.85;
      var sz = Math.min(rh * 0.82, 11);
      ctx.fillRect(x - sz / 2, yc - sz / 2, sz, sz); ctx.globalAlpha = 1;
      if (on) { ctx.fillStyle = AC; ctx.font = "bold 10px monospace"; ctx.fillText(String.fromCharCode(65 + nt.lane), 4, yc); ctx.font = "9px monospace"; }
    });
    var px = sx(Math.min(now, tEnd));
    ctx.strokeStyle = AC; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, H - padB); ctx.stroke();
    ctx.globalAlpha = 1;
    if (now < tEnd + 0.5) requestAnimationFrame(drawRoll);
  }

  function start() {
    if (started) return; started = true;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    analyser = actx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.5;
    analyser.connect(actx.destination);
    wave = new Uint8Array(analyser.fftSize);
    t0 = actx.currentTime + 0.4;
    if (S.mode === "morse") { buildMorse(); requestAnimationFrame(drawMorse); }
    else { buildRoll(); requestAnimationFrame(drawRoll); }
  }
  function replay() {
    if (!started) { start(); return; }
    try { actx.close(); } catch (e) {}
    started = false; segs = []; notes = []; start();
  }

  (function idle() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DIM; ctx.font = "11px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(S.mode === "morse" ? "press a key — watch the bells" : "press a key — watch the rows", W / 2, H / 2);
    ctx.textAlign = "start";
  })();

  addEventListener("keydown", start, { once: true });
  addEventListener("pointerdown", start, { once: true });
  cv.style.cursor = "pointer";
  cv.title = "click to replay";
  cv.addEventListener("click", replay);
})();
