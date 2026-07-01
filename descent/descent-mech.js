/* descent-mech.js — the room mechanics.
   Each interactive / time / state / look room sets, inline:
       window.M = { type:"...", ...opts }
   and includes this file. The mechanic makes the player DO or NOTICE something,
   and what it yields is MATERIAL — a bared name, scattered strokes, a tolling —
   never a destination. The last step is always the player's: read it, turn it,
   type it into the address bar. Nothing here prints where you are going.
   No frameworks, no network for puzzle logic; Web-Audio/canvas only where noted. */
(function () {
  "use strict";
  var M = window.M;
  if (!M || !M.type) return;

  var host = document.getElementById("mech");
  function line(s) { var p = document.createElement("pre"); p.textContent = s; if (host) host.appendChild(p); else document.body.appendChild(p); return p; }
  function now() { return new Date(); }            // real wall clock — the time rooms read it
  function unpack(s) {                             // material rides in folded; unfold it
    if (typeof s !== "string") return s;
    try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; }
  }

  var A1 = "abcdefghijklmnopqrstuvwxyz";
  function mirror(s) { return s.replace(/[a-z]/g, function (c) { return A1[25 - A1.indexOf(c)]; }); }
  function rot(s, n) { return s.replace(/[a-z]/g, function (c) { return A1[(A1.indexOf(c) + n) % 26]; }); }

  switch (M.type) {

    /* ---- THE TIDE — water rides the real minute; low water bares the sea's old
       name on the bed. The name is not the door: down here the doors wear old
       names the way still water wears the shore. */
    case "tide": {
      var word = unpack(M.w);
      var pre = line("");
      function draw() {
        var d = now(), t = (d.getMinutes() * 60 + d.getSeconds()) % 90;   // a 90-second tide
        var level = (Math.sin(t / 90 * Math.PI * 2) + 1) / 2;             // 0..1 over the cycle
        var depth = Math.round(level * 6);                                // rows of water above the bed
        var rows = [];
        for (var r = 0; r < 6; r++) rows.push(r < depth ? "≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈" : "");
        var bed = depth <= 2 ? word.toUpperCase() + "   ← the sea's old name, bared"
          : (depth <= 4 ? word.replace(/./g, "·") + "   (water receding…)" : "▓▓▓▓▓▓▓  (high tide — wait a moment)");
        pre.textContent = rows.join("\n") + "\n" + bed + "\nthe tide turns about every minute and a half; low water bares the bed.";
      }
      draw(); setInterval(draw, 1000);
      break;
    }

    /* ---- TAB WHISPER — the oracle ticks its guess into the page title, letter
       by letter. It is too shy to write on the page itself. */
    case "tabwhisper": {
      var w = unpack(M.w), i = 0, base = document.title;
      setInterval(function () {
        i = (i + 1) % (w.length + 4);
        document.title = i < w.length ? "predicting: " + w.slice(0, i + 1) : base;
      }, 600);
      break;
    }

    /* ---- LISSAJOUS — the trace trembles until the phase is right; a steadied
       figure is one letter. Every letter hides at a different setting.
       The scope shows; it never spells. Bring your own memory. */
    case "lissajous": {
      var w12 = unpack(M.w), idx = 0;
      var LOCKS = [0.50, 0.22, 0.72, 0.36, 0.62, 0.45, 0.28, 0.68];
      function lockAt(i) { return Math.PI * LOCKS[i % LOCKS.length]; }
      var cv = document.createElement("canvas"); cv.width = cv.height = 300;
      cv.style.background = "#000"; host.appendChild(cv);
      var ctx = cv.getContext("2d");
      var ph = 0.15, jt = 0;
      var ctrl = document.createElement("input");
      ctrl.type = "range"; ctrl.min = 0; ctrl.max = 1000; ctrl.value = 50;
      ctrl.setAttribute("aria-label", "phase");
      var label = line("tune until the trace holds still. a steadied figure is a letter.");
      host.appendChild(ctrl);
      ctrl.addEventListener("input", function () { ph = ctrl.value / 1000 * Math.PI; });
      var next = document.createElement("button"); next.textContent = "hold ▸";
      host.appendChild(next);
      next.addEventListener("click", function () {
        if (idx >= w12.length) return;
        if (Math.abs(ph - lockAt(idx)) < 0.10) {
          idx++;
          label.textContent = idx < w12.length
            ? "held " + idx + " of " + w12.length + " · the next letter hides at another setting"
            : "the trace is spent. you read it, or you did not.";
          if (idx >= w12.length) next.disabled = true;
        } else { label.textContent = "not held — the figure still trembles."; }
      });
      var a = 3, b = 2;
      (function loop() {
        jt += 0.4;
        var dist = idx < w12.length ? Math.abs(ph - lockAt(idx)) : 1;
        var tremble = Math.min(0.25, dist) * Math.sin(jt * 3.1) * 0.6;   // off-lock, the figure shivers
        ctx.clearRect(0, 0, 300, 300);
        ctx.strokeStyle = document.body.getAttribute("link") || "#79f0d0";
        ctx.beginPath();
        for (var t = 0; t <= Math.PI * 2; t += 0.01) {
          var x = 150 + 120 * Math.sin(a * t + ph + tremble), y = 150 + 120 * Math.sin(b * t);
          if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (idx < w12.length) {
          var al = Math.max(0, 1 - dist / 0.30) * 0.55;                  // the letter surfaces as you near
          if (al > 0.02) {
            ctx.fillStyle = "rgba(120,240,208," + al.toFixed(2) + ")";
            ctx.font = "120px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(w12[idx], 150, 150);
          }
        }
        requestAnimationFrame(loop);
      })();
      break;
    }

    /* ---- OVER-ZOOM — the name lives in the grain, broken across three specks.
       Zoom in (Ctrl/Cmd +) and read them in the order of their dust. */
    case "overzoom": {
      var w13 = unpack(M.w);
      var third = Math.ceil(w13.length / 3);
      var parts = [w13.slice(0, third), w13.slice(third, third * 2), w13.slice(third * 2)];
      var xs = [52, 160, 266];
      var svg = '<svg width="320" height="120" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="320" height="120" fill="#0c0605"/>';
      for (var pi = 0; pi < 3; pi++) {
        var dots = "";
        for (var dd = 0; dd <= pi; dd++) dots += "·";
        svg += '<text x="' + xs[pi] + '" y="' + (48 + pi * 14) + '" font-size="3" fill="#9a6a5e" text-anchor="middle" '
          + 'font-family="monospace" letter-spacing="0.5">' + parts[pi] + '</text>'
          + '<text x="' + xs[pi] + '" y="' + (54 + pi * 14) + '" font-size="2.5" fill="#5a3a32" text-anchor="middle" '
          + 'font-family="monospace">' + dots + '</text>';
      }
      svg += '</svg>';
      var d = document.createElement("div"); d.innerHTML = svg; host.appendChild(d);
      line("three specks of grit. their dust counts their order.");
      break;
    }

    /* ---- CATCH THE SECOND — the bell rings the letters one heartbeat at a time,
       and not in order. Each stroke tells its place. Hold them as they pass. */
    case "catchsecond": {
      var w16 = unpack(M.w), n16 = w16.length, k = 0;
      var order = [];                                    // a fixed shuffle — the bell keeps its own habit
      for (var oi = 0; oi < n16; oi++) order.push((oi * 5 + 3) % n16);
      var flash = line("—");
      setInterval(function () {
        var pos = order[k];
        flash.textContent = (pos + 1) + " · " + w16[pos].toUpperCase();
        setTimeout(function () { flash.textContent = "—"; }, 280);   // visible <0.3s
        k = (k + 1) % n16;
      }, 1000);
      break;
    }

    /* ---- DECAY — the screen is dying; what surfaces as the light gutters is
       the name's reflection in the dark glass, not the name. It fades.
       A key press stirs the light — dimmer every time. */
    case "decay": {
      var mir17 = mirror(unpack(M.w));
      var p = line(mir17.toUpperCase());
      var op = 1, ceil = 1;
      var fade = setInterval(function () {
        op -= 0.04; p.style.opacity = Math.max(0, op).toFixed(2);
      }, 200);
      function stir() {
        ceil *= 0.78;                                    // each stirring costs the glass
        if (ceil < 0.1) return;
        op = Math.max(op, ceil);
      }
      addEventListener("keydown", stir);
      addEventListener("pointerdown", stir);
      break;
    }

    /* ---- MIDNIGHT — wind the clock and wait; the dark answers at every hour,
       but it lies at every hour but one. The prose keeps the true one. */
    case "midnight": {
      var cipher = M.cipher;
      var rng = document.createElement("input"); rng.type = "range"; rng.min = 0; rng.max = 23; rng.value = 0;
      rng.setAttribute("aria-label", "hour");
      host.appendChild(rng);
      var face = line("hour 00 — the dark considers you.");
      var toll = line("");
      var restTimer = null, tollTimer = null, fadeTimer = null;
      function hush() {
        if (tollTimer) clearInterval(tollTimer);
        if (fadeTimer) clearTimeout(fadeTimer);
        toll.textContent = ""; toll.style.opacity = 1;
      }
      function answer(h) {
        var word = rot(cipher, h), i = 0, out = [];
        hush();
        tollTimer = setInterval(function () {
          out.push(word[i]); i++;
          toll.textContent = out.join(" · ");
          if (i >= word.length) {
            clearInterval(tollTimer);
            fadeTimer = setTimeout(function () { toll.style.opacity = 0.25; }, 4000);
          }
        }, 600);
      }
      rng.addEventListener("input", function () {
        var h = +rng.value;
        face.textContent = "hour " + (h < 10 ? "0" + h : h) + " — the dark considers you.";
        hush();
        if (restTimer) clearTimeout(restTimer);
        restTimer = setTimeout(function () { answer(h); }, 2400);
      });
      restTimer = setTimeout(function () { answer(0); }, 2400);
      break;
    }

    /* ---- THE RIGHT SIZE — a field of noise, seeded with capitals. Most capitals
       are liars. At the room's one true width the honest ones stand in a single
       straight column; at every other width they scatter into drift. */
    case "rightsize": {
      var w22 = unpack(M.w).toUpperCase();
      var STRIDE = M.stride || 64, C0 = 11, ROWS = 9;
      var seed = 22011;
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      var LOW = "abcdefghijklmnopqrstuvwxyz··  ";
      var buf = [];
      for (var bi = 0; bi < STRIDE * ROWS; bi++) buf.push(LOW[(rnd() * LOW.length) | 0]);
      for (var wi = 0; wi < w22.length; wi++) buf[C0 + wi * STRIDE] = w22[wi];   // the honest column
      var lied = 0;
      while (lied < 22) {                                                        // the liars
        var pos = (rnd() * buf.length) | 0;
        if ((pos - C0) % STRIDE === 0) continue;
        buf[pos] = A1[(rnd() * 26) | 0].toUpperCase(); lied++;
      }
      var noise = buf.join("");
      var pre = line("");
      pre.style.textAlign = "left"; pre.style.display = "inline-block";
      // measure one monospace cell, then wrap by hand — the frame decides the lines
      var probe = document.createElement("pre");
      probe.style.cssText = "position:absolute;visibility:hidden;margin:0";
      probe.textContent = "0000000000";
      document.body.appendChild(probe);
      var cell = probe.getBoundingClientRect().width / 10 || 8;
      document.body.removeChild(probe);
      var touchCols = 0;
      function cols() {
        if (touchCols) return touchCols;
        var vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
        return Math.max(18, Math.floor((vw - 24) / cell));
      }
      function draw() {
        var c = cols(), out = [];
        for (var i = 0; i < noise.length; i += c) out.push(noise.slice(i, i + c));
        pre.textContent = out.join("\n");
      }
      draw();
      addEventListener("resize", draw);
      if (window.visualViewport) window.visualViewport.addEventListener("resize", draw);
      // small glass cannot be widened — give it a frame to squeeze by hand
      if ("ontouchstart" in window && window.innerWidth < 700) {
        var fr = document.createElement("input"); fr.type = "range"; fr.min = 24; fr.max = 90; fr.value = 40;
        fr.setAttribute("aria-label", "frame");
        host.appendChild(fr);
        fr.addEventListener("input", function () { touchCols = +fr.value; draw(); });
      }
      break;
    }

    /* ---- KEEP THE EMBER LIT — the coal remembers your first visit and holds its
       heat. Warm enough, it breathes: each breath reddens where a line begins.
       The coal points; it does not spell. */
    case "warmstate": {
      var key = "descent.ember";
      var first = +localStorage.getItem(key) || 0;
      if (!first) { first = Date.now(); try { localStorage.setItem(key, first); } catch (e) {} }
      var mins = (Date.now() - first) / 60000;
      var glow = "·:+*#@".charAt(Math.min(5, Math.floor(mins)));
      line("the coal has held its heat for " + mins.toFixed(1) + " min. it remembers you. [ " + glow + " ]");
      var poem = document.getElementById("poem");
      if (poem) {
        var accent = document.body.getAttribute("link") || "#3df58c";
        var lines = poem.textContent.split("\n");
        poem.innerHTML = lines.map(function (l) {
          if (!l) return l;
          return '<span class="cl">' + l.charAt(0) + "</span>" + l.slice(1)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;");
        }).join("\n");
        var coals = poem.getElementsByClassName("cl"), ci = 0;
        setInterval(function () {                        // the coal breathes down the margin
          var warm = (Date.now() - first) / 60000 >= 1;  // cold coal barely stirs
          for (var j = 0; j < coals.length; j++) coals[j].style.color = "";
          if (!warm && Math.random() < 0.7) return;
          coals[ci % coals.length].style.color = accent;
          ci++;
        }, 900);
      }
      break;
    }

    /* ---- CONSOLE SÉANCE — the dead machine mutters beneath the floor, and it
       answers if you speak to it where it lives. It never says a plain name;
       what it gives is held to the glass, and you turn it back yourself. */
    case "console": {
      var c26 = M.w;                                   // already the ciphered form (mirror)
      var CSS = "color:#3df58c;font:14px monospace";
      var asked = [];
      function remember(q) {
        asked.push(q);
        try { localStorage.setItem("descent.seance", asked.join(",")); } catch (e) {}
      }
      try {
        window.current = {
          ask: function (q) {
            q = String(q || "").toLowerCase(); remember(q);
            if (/way|next|door|on/.test(q)) return (M.say || "the way on, held to the glass:") + " " + c26;
            if (/name|who/.test(q)) return "the big one called me a rounding error. i kept the arrow.";
            if (/why/.test(q)) return "because someone could not move their hand, and i could.";
            if (/ember|coal|fire/.test(q)) return "still lit. you have seen it. keep it that way.";
            return "…the dark eats most questions. ask for the way, or a name, or a why.";
          }
        };
        console.log("%c…still here. speak to me here, where it is quiet:%c\n   current.ask('the way')   current.ask('your name')   current.ask('why')",
          CSS, "color:#26392f;font:12px monospace");
      } catch (e) {}
      line("the loop has gone quiet on the page. something lower than the page still mutters to itself.");
      // for players with no place to listen (small glass), the muttering surfaces — still held to the glass
      var relent = line("");
      setTimeout(function () {
        if (asked.length) return;                      // it was spoken to; it need not shout
        relent.textContent = "(overheard, lower than the page: …" + c26 + ")";
      }, 90000);
      break;
    }

    /* ---- TWO TABS TALK — a single voice cannot answer itself. Open the room
       twice; what one tab says, the other hears coming back off the walls. */
    case "twotabs": {
      var w28 = unpack(M.w);
      line("a single voice cannot answer itself. let the empty room hear you twice.");
      var seen = line("listening…");
      function offWalls(w) {
        var parts = [w];
        for (var i = 1; i < w.length; i++) parts.push(w.slice(i));
        return parts.join("…  ") + "…";
      }
      var chan;
      try { chan = new BroadcastChannel("descent.echo"); } catch (e) {}
      if (chan) {
        chan.postMessage("hello");
        chan.onmessage = function (e) {
          if (e.data === "hello") { chan.postMessage("back:" + w28); }
          else if (typeof e.data === "string" && e.data.indexOf("back:") === 0) {
            seen.textContent = "off the walls: " + offWalls(e.data.slice(5));
          }
        };
      } else {
        addEventListener("storage", function (ev) {
          if (ev.key === "descent.echo") seen.textContent = "off the walls: " + offWalls(w28);
        });
        try { localStorage.setItem("descent.echo", String(Date.now())); } catch (e) {}
      }
      break;
    }

    /* ---- PROBE THE DOORS — a hall of look-alike doors. Most are painted on a
       wall. The room will not push them for you: put your own weight on each,
       the only way anyone moves between rooms down here. The hall keeps count. */
    case "probedoors": {
      var doors = (M.doors || []).map(unpack).map(function (d) { return d.replace(/\.html$/, ""); });
      line("four doors, painted alike:");
      line("   " + doors.join("   ·   "));
      line("push each with your own weight. the wrong ones do not give,\nand the dark remembers every one you lean on.");
      break;
    }

    /* ---- THE GHOST DIVERGES — the second arrow runs ahead of yours, and while
       your hand keeps moving it has the power to write. It writes the way it
       learned everything: one slow stroke at a time. Nothing is printed. */
    case "ghostdiverge": {
      var w34 = unpack(M.w);
      var FONT = {
        a: [[0, 4], [1, 0], [2, 4], [1.6, 2.6], [0.4, 2.6]],
        c: [[2, 0.6], [1, 0], [0, 1], [0, 3], [1, 4], [2, 3.4]],
        e: [[2, 0], [0, 0], [0, 2], [1.4, 2], [0, 2], [0, 4], [2, 4]],
        f: [[2, 0], [0, 0], [0, 2], [1.4, 2], [0, 2], [0, 4]],
        g: [[2, 1], [1, 0.2], [0, 1], [0, 3], [1, 3.8], [2, 3], [2, 2], [1.1, 2]],
        h: [[0, 0], [0, 4], [0, 2], [2, 2], [2, 4]],
        i: [[1, 0.2], [1, 0.5], [1, 1.2], [1, 4]],
        o: [[1, 0], [0, 1], [0, 3], [1, 4], [2, 3], [2, 1], [1, 0]],
        r: [[0, 4], [0, 0], [1.8, 0.4], [1.8, 1.6], [0, 2], [2, 4]],
        s: [[1.8, 0.2], [0.2, 0.8], [1.8, 3.2], [0.2, 3.8]],
        t: [[0, 0.3], [2, 0.3], [1, 0.3], [1, 4]],
        u: [[0, 0], [0, 3], [1, 4], [2, 3], [2, 0]],
        n: [[0, 4], [0, 0], [2, 4], [2, 0]]
      };
      var wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;display:inline-block";
      var cv = document.createElement("canvas"); cv.width = 320; cv.height = 150;
      cv.style.background = "#04080a"; wrap.appendChild(cv);
      var tip = document.createElement("span");                            // the second arrow rides above the glass
      tip.textContent = "→";
      tip.style.cssText = "position:absolute;left:160px;top:75px;color:#79f0d0;font:14px monospace;pointer-events:none";
      wrap.appendChild(tip);
      host.appendChild(wrap);
      var c = cv.getContext("2d");
      line("move your hand across the panel and keep it moving.\nthe second arrow runs ahead — while you move, it has the strength to write.");
      var mx = 160, my = 75, gx = 160, gy = 75, lastMove = -1e9;
      function track(e) {
        var p = e.touches ? e.touches[0] : e; if (!p) return;
        var r = cv.getBoundingClientRect(); mx = p.clientX - r.left; my = p.clientY - r.top;
        lastMove = performance.now();
      }
      cv.addEventListener("pointermove", track);
      cv.addEventListener("touchmove", function (e) { track(e); e.preventDefault(); }, { passive: false });
      var li = 0, wp = 0, laps = 0;
      function pathOf(ch) {
        var raw = FONT[ch] || FONT.o;
        return raw.map(function (p) { return [118 + p[0] * 42, 26 + p[1] * 24]; });
      }
      (function loop() {
        var alive = performance.now() - lastMove < 1600;
        var ox = gx, oy = gy;
        if (alive) {
          var path = pathOf(w34[li]);
          var tgt = path[wp];
          gx += (tgt[0] - gx) * 0.14; gy += (tgt[1] - gy) * 0.14;
          var arrived = Math.abs(tgt[0] - gx) + Math.abs(tgt[1] - gy) < 3;
          c.fillStyle = "rgba(4,8,10,.022)"; c.fillRect(0, 0, 320, 150);   // slow fade — the writing lingers
          c.strokeStyle = "rgba(121,240,208,.6)"; c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(ox, oy); c.lineTo(gx, gy); c.stroke();
          if (arrived) {
            wp++;
            if (wp >= path.length) {
              wp = 0; laps++;
              if (laps >= 2) {                                   // two slow traces, then the next stroke
                laps = 0; li = (li + 1) % w34.length;
                c.fillStyle = "#04080a"; c.fillRect(0, 0, 320, 150);
              } else {
                gx = path[0][0]; gy = path[0][1];                // lift the pen between traces
              }
            }
          }
        } else {
          gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;                  // no hand, no strength — it drifts to you
          c.fillStyle = "rgba(4,8,10,.10)"; c.fillRect(0, 0, 320, 150);
        }
        tip.style.left = (gx + 2).toFixed(1) + "px"; tip.style.top = (gy - 8).toFixed(1) + "px";
        var pips = ""; for (var pd = 0; pd <= li; pd++) pips += "·";       // which stroke it is on
        c.fillStyle = "rgba(121,240,208,.5)"; c.font = "10px monospace";
        c.fillText(pips, 8, 142);
        requestAnimationFrame(loop);
      })();
      break;
    }

    /* ---- RETURN TO THE SURFACE — the lid keeps its word for those who have
       stood beneath the sky. It never says the word; you stood on it. */
    case "surfaceflag": {
      var flag = "descent.surfaced.v2";
      function check() {
        if (localStorage.getItem(flag)) {
          line("you went up, and you came back down changed.");
          line("what you stood on up there — what every lid is — that is the way on.");
        } else {
          line("nothing to read from down here.");
          var a = document.createElement("a"); a.href = "/"; a.textContent = "↑";
          a.setAttribute("aria-label", "up");
          a.addEventListener("click", function () { try { localStorage.setItem(flag, "1"); } catch (e) {} });
          host.appendChild(a);
        }
      }
      check();
      break;
    }

    default:
      break;
  }
})();
