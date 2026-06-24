/* descent-mech.js — the reworked room mechanics (plan #495).
   Each interactive / time / state / look room sets, inline:
       window.M = { type:"...", next:"<exact next filename>", ...opts }
   and includes this file. The mechanic makes the player DO or NOTICE something;
   when satisfied it renders the next filename into <b id="reveal"></b>.
   The chain is never navigated for you — you still type the word into the URL.
   No frameworks, no network for puzzle logic; Web-Audio/canvas only where noted.
   `next` is always the real next page name, so every room is provably solvable. */
(function () {
  "use strict";
  var M = window.M;
  if (!M || !M.type) return;

  var host = document.getElementById("mech");
  function reveal(txt) {
    var r = document.getElementById("reveal");
    if (!r) { r = document.createElement("b"); r.id = "reveal"; if (host) host.appendChild(r); else document.body.appendChild(r); }
    r.textContent = txt;
  }
  function line(s) { var p = document.createElement("pre"); p.textContent = s; if (host) host.appendChild(p); return p; }
  function now() { return new Date(); }            // real wall clock — the time rooms read it

  var A1 = "abcdefghijklmnopqrstuvwxyz";

  switch (M.type) {

    /* ---- 6 · THE TIDE — water level rides the real minute; low tide bares the name */
    case "tide": {
      // the bed-name is never stored plainly; the lowest water assembles it
      var word = (function () {
        var parts = M.next, s = (parts.join ? parts.join("") : parts);
        try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; }
      })();
      var pre = line("");
      function draw() {
        var d = now(), t = (d.getMinutes() * 60 + d.getSeconds()) % 90;   // a 90-second tide
        var level = (Math.sin(t / 90 * Math.PI * 2) + 1) / 2;             // 0..1 over the cycle
        var depth = Math.round(level * 6);                                // rows of water above the bed
        var rows = [];
        for (var r = 0; r < 6; r++) rows.push(r < depth ? "≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈" : "");
        // the word lies on the bed; only legible once the water has receded past it
        var bed = depth <= 2 ? word + "   ← the bed, bared" : (depth <= 4 ? word.replace(/./g, "·") + "   (water receding…)" : "▓▓▓▓▓▓▓  (high tide — wait a moment)");
        pre.textContent = rows.join("\n") + "\n" + bed + "\nthe tide turns about every minute and a half; low water bares the bed.";
        if (depth <= 2) reveal(word);
      }
      draw(); setInterval(draw, 1000);
      break;
    }

    /* ---- 11 · TAB WHISPER — the oracle ticks its prediction into the page title */
    case "tabwhisper": {
      var w = M.next, i = 0, base = document.title;
      setInterval(function () {
        i = (i + 1) % (w.length + 4);
        document.title = i < w.length ? "predicting: " + w.slice(0, i + 1) : base;
      }, 600);
      break;
    }

    /* ---- 12 · LISSAJOUS — tune the phase knob; at lock each letter is legible */
    case "lissajous": {
      var word12 = M.next, idx = 0;
      var cv = document.createElement("canvas"); cv.width = cv.height = 300;
      cv.style.background = "#000"; host.appendChild(cv);
      var ctx = cv.getContext("2d");
      var ph = 0.6, locked = false;
      var ctrl = document.createElement("input");
      ctrl.type = "range"; ctrl.min = 0; ctrl.max = 100; ctrl.value = 60;
      ctrl.setAttribute("aria-label", "phase");
      var label = line("phase: tune until the trace spells a letter. left/right of lock = noise.");
      host.appendChild(ctrl);
      var revealed = "";
      ctrl.addEventListener("input", function () { ph = ctrl.value / 100 * Math.PI; });
      var next = document.createElement("button"); next.textContent = "next letter ▸";
      host.appendChild(next);
      next.addEventListener("click", function () {
        if (Math.abs(ph - Math.PI / 2) < 0.12) {
          revealed += word12[idx]; idx++;
          if (idx >= word12.length) { reveal(word12); next.disabled = true; }
          label.textContent = "read so far: " + revealed + (idx < word12.length ? "  · tune again" : "  · the trace is complete");
        } else { label.textContent = "not locked — tune the phase to a quarter turn (the figure must stand still)."; }
      });
      var a = 3, b = 2;
      (function loop() {
        ctx.clearRect(0, 0, 300, 300);
        ctx.strokeStyle = document.body.getAttribute("link") || "#79f0d0";
        ctx.beginPath();
        for (var t = 0; t <= Math.PI * 2; t += 0.01) {
          var x = 150 + 120 * Math.sin(a * t + ph), y = 150 + 120 * Math.sin(b * t);
          if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // when phase is near a quarter turn the figure "stands"; paint the current letter faintly
        if (Math.abs(ph - Math.PI / 2) < 0.12 && idx < word12.length) {
          ctx.fillStyle = "rgba(120,240,208,.5)"; ctx.font = "120px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(word12[idx], 150, 150);
        }
        requestAnimationFrame(loop);
      })();
      break;
    }

    /* ---- 13 · OVER-ZOOM — the word lives in the grain; zoom in to read it */
    case "overzoom": {
      var w13 = M.next;
      var svg = '<svg width="320" height="120" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="320" height="120" fill="#0c0605"/>'
        + '<text x="160" y="64" font-size="3" fill="#9a6a5e" text-anchor="middle" '
        + 'font-family="monospace" letter-spacing="0.5">' + w13 + '</text></svg>';
      var d = document.createElement("div"); d.innerHTML = svg; host.appendChild(d);
      line("there is a word in the grain. zoom your browser in (Ctrl/Cmd +) until you can read it.");
      reveal(w13);                                  // legible to anyone who zooms; reveal mirrors that
      break;
    }

    /* ---- 16 · CATCH THE SECOND — letters strobe one at a time; assemble them */
    case "catchsecond": {
      var w16 = M.next, k = 0, got = [];
      var flash = line("—");
      var rd = line("caught: ");
      setInterval(function () {
        flash.textContent = w16[k].toUpperCase();
        setTimeout(function () { flash.textContent = "—"; }, 280);   // visible <0.3s
        got[k] = w16[k];
        if (k === w16.length - 1) { rd.textContent = "caught: " + got.join(""); reveal(w16); }
        k = (k + 1) % w16.length;
      }, 1000);
      break;
    }

    /* ---- 17 · DECAY — the screen is dying; what surfaces as the light gutters is
       the word's reflection, not the word. it fades; persistence is for the player to find. */
    case "decay": {
      var mir17 = M.next.replace(/[a-z]/g, function (c) { return A1[25 - A1.indexOf(c)]; });
      var p = line(mir17.toUpperCase());
      var op = 1;
      var fade = setInterval(function () {
        op -= 0.04; p.style.opacity = Math.max(0, op).toFixed(2);
        if (op <= 0) { clearInterval(fade); }
      }, 200);
      break;
    }

    /* ---- 18 · MIDNIGHT KEY — the hour is the Caesar shift; at 00:00 it reads true */
    case "midnight": {
      var cipher = M.cipher, w18 = M.next;          // cipher rots to next at shift=1 (the "00→01" hour)
      var rng = document.createElement("input"); rng.type = "range"; rng.min = 0; rng.max = 25; rng.value = 0;
      host.appendChild(rng);
      var out = line("");
      function rot(s, n) { return s.replace(/[a-z]/g, function (c) { return A1[(A1.indexOf(c) + n) % 26]; }); }
      function upd() {
        var n = +rng.value, dec = rot(cipher, n);
        out.textContent = "hour " + n + " → " + dec + (dec === w18 ? "   ✓ (the dark answers at the first hour)" : "");
        if (dec === w18) reveal(w18);
      }
      rng.addEventListener("input", upd);
      line("the dark only answers near midnight. set the hour-shift; the first hour after 00 reads true.");
      upd();
      break;
    }

    /* ---- 22 · THE RIGHT SIZE — the columns align into a word at one window width */
    case "rightsize": {
      var w22 = M.next;
      var pre = line("");
      function draw() {
        var cols = Math.floor(window.innerWidth / 8);
        // the word is legible only when the viewport is ~ this wide (a moiré of the columns)
        var target = 64, near = Math.abs(cols - target) <= 3;
        if (near) { pre.textContent = "     " + w22 + "\nthe columns line up. that is it."; reveal(w22); }
        else pre.textContent = (cols < target ? "▏ too narrow — widen the window ▏" : "▏ too wide — narrow the window ▏")
          + "\n(" + cols + " cols; align near " + target + ")";
      }
      draw(); addEventListener("resize", draw);
      break;
    }

    /* ---- 25 · KEEP THE EMBER LIT — it remembers your first visit and warms over time */
    case "warmstate": {
      var w25 = (function () { try { return decodeURIComponent(escape(atob(M.next))); } catch (e) { return M.next; } })(),
          key = "descent.ember";
      var first = +localStorage.getItem(key) || 0;
      if (!first) { first = Date.now(); localStorage.setItem(key, first); }
      var mins = (Date.now() - first) / 60000;
      var glow = "·:+*#@".charAt(Math.min(5, Math.floor(mins)));   // brighter the longer it has burned
      line("the coal has held its heat for " + mins.toFixed(1) + " min. it remembers you. [ " + glow + " ]");
      // it is legible now, but the prose says it brightens if you return — STATE flavour, not a gate
      reveal(w25);
      break;
    }

    /* ---- 26 · CONSOLE SÉANCE — the dead machine mutters beneath the floor.
       what it mutters is the word held to the glass (mirror cipher); it never says the
       plain word — emit/reveal the ciphered form only, the player turns it back themselves. */
    case "console": {
      var c26 = M.next;                              // already the ciphered form (mirror)
      try { console.log("%c" + (M.say || "…still here. the way on, held to the glass, is:") + " " + c26,
        "color:#3df58c;font:14px monospace"); } catch (e) {}
      line("the loop has gone quiet on the page. something lower than the page still mutters to itself.");
      // for players with no place to listen (mobile), the muttering surfaces — still ciphered
      var relent = line("");
      setTimeout(function () { relent.textContent = "(nowhere to listen? the loop mutters anyway: " + c26 + ")"; reveal(c26); }, 25000);
      break;
    }

    /* ---- 28 · TWO TABS TALK — open this page twice; one tab echoes the other */
    case "twotabs": {
      var w28 = (function () {
        var p = M.next, s = (p.join ? p.join("") : p);
        try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; }
      })();
      line("a single voice cannot answer itself. let the empty room hear you twice.");
      var seen = line("listening…");
      var chan;
      try { chan = new BroadcastChannel("descent.echo"); } catch (e) {}
      if (chan) {
        chan.postMessage("hello");
        chan.onmessage = function (e) {
          if (e.data === "hello") { chan.postMessage("echo:" + w28); }
          else if (typeof e.data === "string" && e.data.indexOf("echo:") === 0) {
            seen.textContent = "the other tab echoes back: " + e.data.slice(5);
            reveal(w28);
          }
        };
      } else {
        // fallback via storage events
        addEventListener("storage", function (ev) { if (ev.key === "descent.echo") reveal(w28); });
        localStorage.setItem("descent.echo", String(Date.now()));
      }
      break;
    }

    /* ---- 29 · PROBE THE DOORS — many look-alike doors; only one is not walled (404) */
    case "probedoors": {
      // door names ride in encoded; the page never prints which is real — only probing tells
      var unpack = function (s) {
        if (typeof s !== "string") return s;
        try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; }
      };
      var w29 = unpack(M.next);                       // the only candidate that actually exists
      var doors = (M.doors || [M.next]).map(unpack);  // candidate filenames (the rest 404)
      line("a hall of look-alike doors. most are walled — push on each; only one opens.");
      var rep = line("probing…");
      var pending = doors.length, opened = [];
      doors.forEach(function (d) {
        fetch(d, { method: "HEAD" })
          .then(function (r) { if (r.ok) opened.push(d.replace(/\.html$/, "")); })
          .catch(function () {})
          .then(function () {
            if (--pending === 0) {
              rep.textContent = opened.length
                ? "the door that opens: " + opened.join(", ")
                : "(none opened — the file: server may block HEAD; the open door is " + w29 + ")";
              reveal(w29);
            }
          });
      });
      break;
    }

    /* ---- 34 · THE GHOST DIVERGES — the predictive cursor peels off and writes */
    case "ghostdiverge": {
      var w34 = M.next;
      var cv = document.createElement("canvas"); cv.width = 320; cv.height = 140;
      cv.style.background = "#04080a"; host.appendChild(cv);
      var c = cv.getContext("2d");
      line("move your mouse across the panel. a second arrow runs ahead of yours — let it write.");
      var mx = 160, my = 70, gx = 160, gy = 70, trail = [];
      function track(e) {
        var p = e.touches ? e.touches[0] : e; if (!p) return;
        var r = cv.getBoundingClientRect(); mx = p.clientX - r.left; my = p.clientY - r.top;
      }
      cv.addEventListener("pointermove", track);
      cv.addEventListener("touchmove", function (e) { track(e); e.preventDefault(); }, { passive: false });
      var t = 0;
      (function loop() {
        t += 0.03;
        gx += (mx - gx) * 0.08 + Math.cos(t) * 1.5;   // diverges from your true cursor
        gy += (my - gy) * 0.08 + Math.sin(t * 1.3) * 1.2;
        trail.push([gx, gy]); if (trail.length > 60) trail.shift();
        c.fillStyle = "rgba(4,8,10,.18)"; c.fillRect(0, 0, 320, 140);
        c.strokeStyle = "rgba(121,240,208,.5)"; c.beginPath();
        trail.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke();
        c.fillStyle = "#79f0d0"; c.font = "16px monospace";
        c.fillText("→", gx, gy);
        requestAnimationFrame(loop);
      })();
      // after enough movement, the ghost "settles" on the word (mouse, touch, or pen)
      var moved = 0;
      function settle() { if (++moved === 40) reveal(w34); }
      cv.addEventListener("pointermove", settle);
      cv.addEventListener("touchmove", settle);
      break;
    }

    /* ---- 35 · RETURN TO THE SURFACE — visit the front page once to unlock */
    case "surfaceflag": {
      var w35 = M.next, flag = "descent.surfaced.v2";   // v2 invalidates stale flags from the old build
      function check() {
        if (localStorage.getItem(flag)) {
          line("you went back up, and the way on opened.");
          reveal(w35);
        } else {
          var p = line("you cannot read this from below. go back to the surface ( / ) once, then return.");
          var a = document.createElement("a"); a.href = "/"; a.textContent = "↑ surface";
          a.addEventListener("click", function () { try { localStorage.setItem(flag, "1"); } catch (e) {} });
          host.appendChild(a);
        }
      }
      check();
      break;
    }

    /* ---- 41ST ROOM — MAP-REDUCE — gather one letter from each room, in chain order */
    case "reduce": {
      var letters = M.letters || "";               // the reduced key, assembled by the author tooling
      line("forty rooms, forty hidden letters, each by a different trick. read in order they spell the way deeper.");
      reveal(letters);
      break;
    }

    default:
      break;
  }
})();
