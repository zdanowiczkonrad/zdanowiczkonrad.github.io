/*
    neural.js — the visitor model. zdanowicz.dev
    Two live networks built on nn.js:
      NEXT  [15,10,6]  — predicts your next move; trains online on every real
                         section transition you make (plus a synthetic prior).
      ARCH  [10,10,4]  — guesses who you are (engineer / recruiter / founder /
                         wanderer) from how you read the page.
    The NEXT net is rendered as the SVG background that replaces the world map
    as you scroll. Every weight update burns the affected paths.
    Models persist to localStorage — it remembers you between visits.
*/
(() => {
    "use strict";
    if (!window.NN || !document.getElementById("neuralBg")) return;

    const $ = (s, c = document) => c.querySelector(s);
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

    const SECTIONS = ["subject", "telemetry", "operations", "stack", "contact"];
    const TARGETS = ["01·SUBJECT", "02·TELEMETRY", "03·OPS", "04·STACK", "05·CONTACT", "06·APPS"];
    const IN_LABELS = ["@SUB", "@TEL", "@OPS", "@STK", "@CON", "DWELL", "SVEL", "SDIR", "MOUSE", "ACT",
                       "T·SUB", "T·TEL", "T·OPS", "T·STK", "T·CON"];
    const ARCHETYPES = ["ENGINEER", "RECRUITER", "FOUNDER", "WANDERER"];
    const VER = 1;

    /* ---- models (restored from a previous visit when possible) ---------- */

    let nextNet = null, archNet = null, pretrained = false;
    try {
        const saved = JSON.parse(localStorage.getItem("nn.model") || "null");
        if (saved && saved.v === VER) {
            nextNet = NN.Net.deserialize(saved.next, { track: true });
            archNet = NN.Net.deserialize(saved.arch);
            nextNet.steps = saved.steps || 0;
            pretrained = true;
        }
    } catch { nextNet = archNet = null; }
    if (!nextNet || !archNet) {
        nextNet = new NN.Net([15, 10, 6], { out: "softmax", lr: 0.012, l2: 1e-4, seed: 17, track: true });
        archNet = new NN.Net([10, 10, 4], { out: "softmax", lr: 0.01, seed: 23 });
        pretrained = false;
    }

    const persist = () => {
        try {
            localStorage.setItem("nn.model", JSON.stringify({
                v: VER, pre: pretrained ? 1 : 0, steps: nextNet.steps,
                next: JSON.parse(nextNet.serialize()),
                arch: JSON.parse(archNet.serialize()),
            }));
        } catch {}
    };

    /* ---- behavior signals ------------------------------------------------ */

    const now = () => performance.now();
    const T0 = now();
    const S = {
        cur: 0, enterT: T0,
        dwell: [1, 0, 0, 0, 0],          // ms per section
        visits: [1, 0, 0, 0, 0],
        mouseV: 0, scrollV: 0, scrollDir: 0.5, maxDepth: 0,
        clicks: 0, hovers: 0, gh: 0, li: 0, mail: 0, palette: 0,
    };

    let lastMx = -1, lastMy = -1, lastMt = 0;
    document.addEventListener("mousemove", (e) => {
        const t = now();
        if (lastMx >= 0 && t > lastMt) {
            const v = Math.hypot(e.clientX - lastMx, e.clientY - lastMy) / (t - lastMt);
            S.mouseV += (Math.min(v, 4) - S.mouseV) * 0.06;
        }
        lastMx = e.clientX; lastMy = e.clientY; lastMt = t;
    }, { passive: true });

    let lastSy = scrollY, lastSt = T0;
    addEventListener("scroll", () => {
        const t = now(), dy = scrollY - lastSy, dt = Math.max(1, t - lastSt);
        S.scrollV += (Math.min(Math.abs(dy) / dt, 4) - S.scrollV) * 0.15;
        if (dy) S.scrollDir += ((dy > 0 ? 1 : 0) - S.scrollDir) * 0.25;
        const doc = root.scrollHeight - innerHeight;
        if (doc > 0) S.maxDepth = Math.max(S.maxDepth, clamp01(scrollY / doc));
        lastSy = scrollY; lastSt = t;
    }, { passive: true });

    document.addEventListener("pointerover", (e) => {
        const a = e.target instanceof Element && e.target.closest("a[href]");
        if (!a) return;
        S.hovers++;
        const href = a.getAttribute("href") || "";
        if (href.includes("github")) S.gh += 0.4;
        if (href.includes("linkedin")) S.li += 0.4;
    }, true);

    document.addEventListener("click", (e) => {
        const a = e.target instanceof Element && e.target.closest("a[href]");
        S.clicks++;
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (href.includes("github")) S.gh += 1;
        if (href.includes("linkedin")) S.li += 1;
        if (href.startsWith("mailto")) { S.mail += 1; learn(4); }
        if (href.startsWith("apps") || href.includes("apps/")) learn(5);   // left for APPS
    }, true);

    const paletteEl = $("#palette");
    if (paletteEl) new MutationObserver(() => { if (!paletteEl.hidden) S.palette++; })
        .observe(paletteEl, { attributes: true, attributeFilter: ["hidden"] });

    /* feature vector for the NEXT net — must stay in [0,1] */
    const features = () => {
        const f = new Float32Array(15);
        f[S.cur] = 1;
        const dwellCur = now() - S.enterT;
        f[5] = clamp01(dwellCur / 30000);
        f[6] = clamp01(S.scrollV / 2.5);
        f[7] = S.scrollDir;
        f[8] = clamp01(S.mouseV / 1.8);
        const mins = Math.max(0.15, (now() - T0) / 60000);
        f[9] = clamp01((S.clicks + S.hovers * 0.25) / (mins * 14));
        let tot = 1;
        for (let i = 0; i < 5; i++) tot += S.dwell[i];
        for (let i = 0; i < 5; i++) f[10 + i] = S.dwell[i] / tot;
        return f;
    };

    /* aggregates for the ARCH net */
    const archFeatures = () => {
        const f = new Float32Array(10);
        f[0] = clamp01(S.scrollV / 2.5);
        f[1] = S.maxDepth;
        let tot = 1;
        for (let i = 0; i < 5; i++) tot += S.dwell[i];
        for (let i = 0; i < 5; i++) f[2 + i] = S.dwell[i] / tot;
        f[7] = clamp01(S.gh / 2.5);
        f[8] = clamp01(S.li / 2.5);
        const mins = Math.max(0.15, (now() - T0) / 60000);
        f[9] = clamp01((S.clicks + S.palette * 2 + S.hovers * 0.25) / (mins * 14));
        return f;
    };

    /* ---- online learning -------------------------------------------------- */

    const replay = [];                       // [features, targetIdx]
    let snapshot = features();               // features as they were *before* the move

    const oneHot = (i) => { const y = new Float32Array(6); y[i] = 1; return y; };

    const learn = (target) => {
        replay.push([snapshot.slice(), target]);
        if (replay.length > 64) replay.shift();
        for (let k = 0; k < 3; k++) nextNet.train(snapshot, oneHot(target));
        for (let k = 0; k < 3 && replay.length > 4; k++) {
            const [x, y] = replay[(Math.random() * replay.length) | 0];
            nextNet.train(x, oneHot(y));
        }
        Viz.burn(nextNet);
        Viz.restyle(nextNet);
    };

    const sectionEls = SECTIONS.map((id) => document.getElementById(id));
    const detectSection = () => {
        const probe = scrollY + innerHeight * 0.38;
        let cur = 0;
        for (let i = 0; i < sectionEls.length; i++) {
            if (sectionEls[i] && sectionEls[i].offsetTop <= probe) cur = i;
        }
        if (cur !== S.cur) {
            S.dwell[S.cur] += now() - S.enterT;
            learn(cur);                       // the move you just made is the label
            S.cur = cur; S.enterT = now(); S.visits[cur]++;
        }
    };
    addEventListener("scroll", detectSection, { passive: true });

    /* ---- synthetic priors (first visit): teach reading-flow + archetypes --- */

    const pretrain = (onProgress, onDone) => {
        const rand = NN.xorshift(0xC0FFEE);
        const synthNext = () => {
            const c = (rand() * 5) | 0;
            const x = new Float32Array(15);
            x[c] = 1;
            x[5] = rand(); x[6] = rand() * 0.7; x[7] = 0.4 + rand() * 0.6;
            x[8] = rand() * 0.6; x[9] = rand() * 0.5;
            for (let i = 0; i < 5; i++) x[10 + i] = rand() * (i <= c ? 0.25 : 0.06);
            const roll = rand();
            let y;
            if (c === 4) y = roll < 0.4 ? 5 : roll < 0.65 ? 0 : roll < 0.85 ? 3 : 4;
            else if (roll < 0.58) y = c + 1;
            else if (roll < 0.72) y = Math.min(4, c + 2);
            else if (roll < 0.84) y = Math.max(0, c - 1);
            else if (roll < 0.94) y = 4;
            else y = 5;
            return [x, oneHot(y)];
        };
        /* archetype prototypes: [svel, depth, dwell×5, gh, li, activity] */
        const PROTO = [
            [0.25, 0.92, 0.10, 0.16, 0.22, 0.34, 0.12, 0.80, 0.10, 0.65],  // engineer
            [0.55, 0.80, 0.18, 0.34, 0.10, 0.06, 0.30, 0.10, 0.85, 0.50],  // recruiter
            [0.42, 0.85, 0.16, 0.18, 0.34, 0.10, 0.26, 0.35, 0.45, 0.55],  // founder
            [0.80, 0.30, 0.55, 0.12, 0.05, 0.04, 0.04, 0.04, 0.05, 0.12],  // wanderer
        ];
        const synthArch = () => {
            const c = (rand() * 4) | 0;
            const x = new Float32Array(10);
            for (let i = 0; i < 10; i++) x[i] = clamp01(PROTO[c][i] + (rand() - 0.5) * 0.3);
            const y = new Float32Array(4); y[c] = 1;
            return [x, y];
        };
        let i = 0;
        const NEXT_N = 540, ARCH_N = 1400;
        const tick = () => {
            if (i < NEXT_N) {                /* visible phase: burns on the bg net */
                for (let k = 0; k < 12 && i < NEXT_N; k++, i++) {
                    const [x, y] = synthNext();
                    nextNet.train(x, y);
                }
                Viz.burn(nextNet);
                Viz.restyle(nextNet);
                onProgress(i / NEXT_N);
                setTimeout(tick, 60);
            } else if (i < NEXT_N + ARCH_N) { /* quiet phase */
                for (let k = 0; k < 200 && i < NEXT_N + ARCH_N; k++, i++) {
                    const [x, y] = synthArch();
                    archNet.train(x, y);
                }
                setTimeout(tick, 40);
            } else onDone();
        };
        tick();
    };

    /* ---- SVG visualization ------------------------------------------------- */

    const Viz = (() => {
        const svg = $("#neuralBg");
        const NS = "http://www.w3.org/2000/svg";
        const FIRE = [255, 94, 16];
        let accent = [61, 245, 140];
        let edges = [], nodeEls = [], outEls = [], heat = null, hot = new Set();
        let sparks = [], pulses = [], gPulse = null;
        let W = 0, H = 0, raf = null, lastF = 0;
        let active = true;

        const el = (tag, attrs, parent) => {
            const e = document.createElementNS(NS, tag);
            for (const k in attrs) e.setAttribute(k, attrs[k]);
            parent.appendChild(e);
            return e;
        };

        const build = (net) => {
            svg.innerHTML = "";
            W = innerWidth; H = innerHeight;
            svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
            const gE = el("g", {}, svg);
            gPulse = el("g", {}, svg);
            const gN = el("g", {}, svg);
            const gL = el("g", {}, svg);
            const sizes = net.sizes;
            const xs = sizes.map((_, l) => W * (0.18 + 0.64 * l / (sizes.length - 1)));
            const pos = sizes.map((n, l) => {
                const gap = Math.min(H * 0.74 / Math.max(1, n - 1), 56);
                const y0 = H * 0.5 - gap * (n - 1) / 2;
                return Array.from({ length: n }, (_, i) => [xs[l], y0 + i * gap]);
            });
            edges = []; nodeEls = []; outEls = [];
            for (let l = 0; l < sizes.length - 1; l++) {
                const nIn = sizes[l], nOut = sizes[l + 1];
                for (let j = 0; j < nOut; j++) {
                    for (let i = 0; i < nIn; i++) {
                        const [x1, y1] = pos[l][i], [x2, y2] = pos[l + 1][j];
                        const line = el("line", { x1, y1, x2, y2, class: "nn-edge" }, gE);
                        edges.push({ el: line, l, w: j * nIn + i, x1, y1, x2, y2, baseO: 0.05, baseW: 0.7 });
                    }
                }
            }
            heat = new Float32Array(edges.length);
            hot.clear(); sparks = []; pulses = [];
            pos.forEach((layer, l) => {
                nodeEls.push(layer.map(([x, y]) =>
                    el("circle", { cx: x, cy: y, r: l === sizes.length - 1 ? 4.5 : 3.2, class: "nn-node", "fill-opacity": 0.3 }, gN)));
            });
            IN_LABELS.forEach((t, i) => {
                el("text", { x: pos[0][i][0] - 10, y: pos[0][i][1] + 3, "text-anchor": "end", class: "nn-lab" }, gL).textContent = t;
            });
            TARGETS.forEach((t, i) => {
                const nx = pos[sizes.length - 1][i][0] + 12;
                const attrs = nx > W - 92
                    ? { x: W - 8, "text-anchor": "end" }      // narrow screens: pin to edge
                    : { x: nx };
                attrs.y = pos[sizes.length - 1][i][1] + 3;
                attrs.class = "nn-lab nn-out";
                outEls.push(el("text", attrs, gL));
                outEls[i].textContent = t;
            });
            restyle(net);
        };

        /* base stroke from |w| — called after weights move */
        const restyle = (net) => {
            const maxAbs = [];
            for (let l = 0; l < net.L; l++) {
                let m = 1e-6;
                const Wl = net.W[l];
                for (let i = 0; i < Wl.length; i++) { const a = Math.abs(Wl[i]); if (a > m) m = a; }
                maxAbs.push(m);
            }
            for (let e = 0; e < edges.length; e++) {
                const ed = edges[e];
                const r = Math.abs(net.W[ed.l][ed.w]) / maxAbs[ed.l];
                ed.baseO = 0.04 + r * 0.30;
                ed.baseW = 0.6 + r * 1.3;
                if (!hot.has(e)) {
                    ed.el.setAttribute("stroke-opacity", ed.baseO.toFixed(3));
                    ed.el.setAttribute("stroke-width", ed.baseW.toFixed(2));
                }
            }
        };

        /* burn the paths whose weights just changed the most */
        const burn = (net) => {
            if (reduced || !heat) return;
            const tops = [];
            for (let l = 0; l < net.L; l++) {
                const mag = net.dWmag[l];
                let m = 1e-9;
                for (let i = 0; i < mag.length; i++) if (mag[i] > m) m = mag[i];
                for (let e = 0; e < edges.length; e++) {
                    if (edges[e].l !== l) continue;
                    const r = mag[edges[e].w] / m;
                    if (r > 0.42) {
                        heat[e] = Math.min(1, heat[e] + r * 0.9);
                        hot.add(e);
                        if (r > 0.8) tops.push(e);
                    }
                }
            }
            for (let k = 0; k < Math.min(5, tops.length); k++) {
                sparks.push({ e: tops[(Math.random() * tops.length) | 0], t: 0 });
            }
            wake();
        };

        /* forward wave: pulses run the strongest routes, neurons glow */
        const flow = (net) => {
            for (let l = 0; l < net.sizes.length; l++) {
                const acts = net.a[l], els = nodeEls[l];
                for (let i = 0; i < els.length; i++) {
                    const a = Math.abs(acts[i]);
                    els[i].setAttribute("fill-opacity", (0.18 + Math.min(1, a) * 0.7).toFixed(2));
                }
            }
            const out = net.a[net.L];
            let am = 0;
            for (let j = 1; j < out.length; j++) if (out[j] > out[am]) am = j;
            outEls.forEach((t, j) => t.classList.toggle("on", j === am));
            if (reduced) return;
            for (let l = 0; l < net.L; l++) {
                const acts = net.a[l], nIn = net.sizes[l];
                let b1 = 0, b2 = 1;                          /* two liveliest sources */
                for (let i = 1; i < acts.length; i++) {
                    if (Math.abs(acts[i]) > Math.abs(acts[b1])) { b2 = b1; b1 = i; }
                }
                [b1, b2].forEach((src) => {
                    let bestE = -1, bestW = 0;
                    for (let e = 0; e < edges.length; e++) {
                        if (edges[e].l !== l || edges[e].w % nIn !== src) continue;
                        const wAbs = Math.abs(net.W[l][edges[e].w]);
                        if (wAbs > bestW) { bestW = wAbs; bestE = e; }
                    }
                    if (bestE >= 0 && pulses.length < 30) pulses.push({ e: bestE, t: -l * 0.45 });
                });
            }
            wake();
        };

        const mix = (h) => {
            const r = (accent[0] + (FIRE[0] - accent[0]) * h) | 0;
            const g = (accent[1] + (FIRE[1] - accent[1]) * h) | 0;
            const b = (accent[2] + (FIRE[2] - accent[2]) * h) | 0;
            return `rgb(${r},${g},${b})`;
        };

        const frame = (t) => {
            raf = null;
            if (document.hidden) { wake(); return; }
            const dt = Math.min(0.1, (t - lastF) / 1000) || 0.016;
            lastF = t;
            /* cool the burns */
            for (const e of hot) {
                const h = (heat[e] -= dt * 1.7);
                const ed = edges[e];
                if (h <= 0.04) {
                    heat[e] = 0; hot.delete(e);
                    ed.el.removeAttribute("stroke");
                    ed.el.setAttribute("stroke-opacity", ed.baseO.toFixed(3));
                    ed.el.setAttribute("stroke-width", ed.baseW.toFixed(2));
                } else {
                    ed.el.setAttribute("stroke", mix(h));
                    ed.el.setAttribute("stroke-opacity", Math.min(1, ed.baseO + h * 0.85).toFixed(3));
                    ed.el.setAttribute("stroke-width", (ed.baseW + h * 1.7).toFixed(2));
                }
            }
            /* sparks ride burning edges; pulses ride the forward wave */
            const move = (list, speed, cls, rr) => {
                for (let i = list.length - 1; i >= 0; i--) {
                    const p = list[i];
                    p.t += dt * speed;
                    if (p.t >= 1) {
                        if (p.el) p.el.remove();
                        list.splice(i, 1);
                        continue;
                    }
                    if (p.t < 0) continue;
                    if (!p.el) p.el = el("circle", { r: rr, class: cls }, gPulse);
                    const ed = edges[p.e];
                    p.el.setAttribute("cx", (ed.x1 + (ed.x2 - ed.x1) * p.t).toFixed(1));
                    p.el.setAttribute("cy", (ed.y1 + (ed.y2 - ed.y1) * p.t).toFixed(1));
                    p.el.setAttribute("opacity", (1 - p.t * 0.6).toFixed(2));
                }
            };
            move(sparks, 2.6, "nn-spark", 2.2);
            move(pulses, 1.8, "nn-pulse", 1.8);
            if (hot.size || sparks.length || pulses.length) wake();
        };

        const wake = () => { if (!raf && active) raf = requestAnimationFrame(frame); };

        const recolor = () => {
            const c = getComputedStyle(root).getPropertyValue("--accent").trim();
            if (c.startsWith("#") && c.length >= 7) accent = hexRgb(c);
        };

        let rsT;
        addEventListener("resize", () => {
            clearTimeout(rsT);
            rsT = setTimeout(() => build(nextNet), 220);
        });

        recolor();
        build(nextNet);
        return {
            burn, flow, restyle, recolor,
            set active(v) { active = v; if (v) wake(); },
        };
    })();

    /* ---- scroll crossfade: the network replaces the map as you go deeper ---- */

    let off = false;
    try { off = localStorage.getItem("nn.off") === "1"; } catch {}
    if (off) root.classList.add("nn-off");

    const applyMix = () => {
        const m = off ? 0 : clamp01((scrollY / innerHeight - 0.45) / 0.85);
        root.style.setProperty("--nn-mix", m.toFixed(3));
        root.style.setProperty("--map-fade", (1 - m * 0.94).toFixed(3));
        Viz.active = !off && m > 0.02;
    };
    addEventListener("scroll", applyMix, { passive: true });
    applyMix();

    /* ---- HUD ----------------------------------------------------------------- */

    const hudArch = $("#nhArch"), hudNext = $("#nhNext"), hudMeta = $("#nhMeta");
    const PARAMS = nextNet.W.reduce((s, w) => s + w.length, 0) + nextNet.b.reduce((s, b) => s + b.length, 0);

    const think = () => {
        if (document.hidden) return;
        snapshot = features();
        const p = nextNet.forward(snapshot);
        Viz.flow(nextNet);
        /* next step: best target that isn't where you already are */
        let best = -1;
        for (let j = 0; j < 6; j++) if (j !== S.cur && (best < 0 || p[j] > p[best])) best = j;
        if (hudNext) hudNext.textContent = `${TARGETS[best]} ${(p[best] * 100).toFixed(0)}%`;
        const ap = archNet.forward(archFeatures());
        let ab = 0;
        for (let j = 1; j < 4; j++) if (ap[j] > ap[ab]) ab = j;
        if (hudArch) hudArch.textContent = `${ARCHETYPES[ab]} ${(ap[ab] * 100).toFixed(0)}%`;
        if (hudMeta) hudMeta.textContent =
            `MLP 15·10·6 — ${PARAMS} PARAMS · ${nextNet.steps} STEPS · LOSS ${nextNet.emaLoss < 0 ? "—" : nextNet.emaLoss.toFixed(2)}`;
    };

    if (!pretrained) {
        if (hudMeta) hudMeta.textContent = "CALIBRATING SYNTHETIC PRIOR…";
        pretrain(
            (p) => { if (hudMeta) hudMeta.textContent = `CALIBRATING SYNTHETIC PRIOR… ${(p * 100).toFixed(0)}%`; },
            () => { pretrained = true; persist(); think(); }
        );
    }

    setInterval(think, 900);
    setInterval(() => {                       /* heartbeat replay keeps it dreaming */
        if (document.hidden || replay.length < 6 || !pretrained) return;
        const [x, y] = replay[(Math.random() * replay.length) | 0];
        nextNet.train(x, oneHot(y));
        Viz.burn(nextNet);
    }, 3400);
    setInterval(persist, 15000);
    addEventListener("pagehide", () => {
        S.dwell[S.cur] += now() - S.enterT;
        S.enterT = now();
        persist();
    });
    think();

    /* ---- public ----------------------------------------------------------------- */

    window.Mind = {
        recolor: Viz.recolor,
        toggle() {
            off = !off;
            root.classList.toggle("nn-off", off);
            try { localStorage.setItem("nn.off", off ? "1" : "0"); } catch {}
            applyMix();
        },
        get state() {
            return { features: Array.from(features()), arch: Array.from(archFeatures()),
                     steps: nextNet.steps, loss: nextNet.emaLoss, replay: replay.length };
        },
    };
})();
