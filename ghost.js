/*
    ghost.js — the ghost cursor. zdanowicz.dev
    A [12,16,2] regression net predicts where your pointer will be 350ms from
    now, and renders it as a second cursor running ahead of you. Every real
    movement becomes a training sample ~25×/s, so it learns YOUR hand — flicks,
    arcs, hesitation — and the error readout drops as it does. Persisted, so it
    remembers your kinetics next visit.
*/
(() => {
    "use strict";
    if (!window.NN || !matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    const HORIZON = 350;                  // ms ahead
    const SCALE = 360;                    // px normalization for the delta head
    const STEP = 40;                      // sampling cadence, ms

    let net = null;
    try {
        const saved = JSON.parse(localStorage.getItem("nn.mouse") || "null");
        if (saved && saved.v === 1) net = NN.Net.deserialize(saved.net);
    } catch {}
    if (!net) net = new NN.Net([12, 16, 2], { out: "linear", hidden: "tanh", lr: 0.008, seed: 51 });

    let off = false;
    try { off = localStorage.getItem("ghost.off") === "1"; } catch {}

    /* ---- ghost element ---------------------------------------------------- */

    const el = document.createElement("div");
    el.className = "ghost-cursor";
    el.innerHTML =
        `<svg width="18" height="18" viewBox="0 0 18 18">` +
        `<path d="M2,1 L2,14 L5.6,11 L8,16 L10,15 L7.7,10.2 L12.5,10 Z" ` +
        `fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>` +
        `<span class="ghost-tag" id="ghostTag">GHOST</span>`;
    el.style.opacity = "0";
    document.body.appendChild(el);
    const tag = el.querySelector("#ghostTag");

    /* ---- sampling, features, online training ------------------------------- */

    const hist = [];                      // {x, y, t} ring, newest last
    const pending = [];                   // {f, x, y, t} awaiting their future label
    let errEma = -1, lastSample = 0, lastMove = 0;
    let mx = 0, my = 0;
    let gx = 0, gy = 0;                   // rendered ghost position (lerped)

    const features = () => {
        /* last 4 velocity vectors + position + speed + turn  -> 12 dims */
        const f = new Float32Array(12);
        const n = hist.length;
        for (let k = 0; k < 4; k++) {
            const a = hist[n - 2 - k], b = hist[n - 1 - k];
            if (!a || !b) continue;
            const dt = Math.max(1, b.t - a.t);
            f[k * 2] = Math.max(-1, Math.min(1, (b.x - a.x) / dt / 1.5));
            f[k * 2 + 1] = Math.max(-1, Math.min(1, (b.y - a.y) / dt / 1.5));
        }
        f[8] = mx / innerWidth;
        f[9] = my / innerHeight;
        f[10] = Math.min(1, Math.hypot(f[0], f[1]));
        f[11] = Math.max(-1, Math.min(1, f[0] * f[3] - f[1] * f[2]));   // cross product ≈ turning
        return f;
    };

    document.addEventListener("mousemove", (e) => {
        mx = e.clientX; my = e.clientY;
        lastMove = performance.now();
    }, { passive: true });

    const sample = () => {
        const t = performance.now();
        if (t - lastMove > 1500) return;             // idle: don't learn stillness
        hist.push({ x: mx, y: my, t });
        if (hist.length > 8) hist.shift();
        if (hist.length < 6) return;
        pending.push({ f: features(), x: mx, y: my, t });
        /* label matured samples: where the pointer ACTUALLY went */
        while (pending.length && t - pending[0].t >= HORIZON) {
            const p = pending.shift();
            const y = new Float32Array(2);
            y[0] = (mx - p.x) / SCALE;
            y[1] = (my - p.y) / SCALE;
            net.train(p.f, y);
            const out = net.a[net.L];
            const err = Math.hypot((out[0] - y[0]) * SCALE, (out[1] - y[1]) * SCALE);
            errEma = errEma < 0 ? err : errEma * 0.96 + err * 0.04;
        }
    };

    /* ---- render loop --------------------------------------------------------- */

    let raf = null;
    const frame = () => {
        raf = requestAnimationFrame(frame);
        const t = performance.now();
        if (t - lastSample >= STEP) { lastSample = t; sample(); }
        if (off || document.hidden) { el.style.opacity = "0"; return; }
        const idle = t - lastMove > 1200;
        const warm = net.steps > 60;
        el.style.opacity = idle || !warm ? "0" : "1";
        if (idle || !warm || hist.length < 6) return;
        const p = net.forward(features());
        const tx = mx + p[0] * SCALE;
        const ty = my + p[1] * SCALE;
        gx += (tx - gx) * 0.3;
        gy += (ty - gy) * 0.3;
        el.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
        tag.textContent = `GHOST +${HORIZON}MS · ±${errEma < 0 ? "—" : errEma.toFixed(0)}PX`;
    };
    raf = requestAnimationFrame(frame);

    setInterval(() => {
        if (net.steps < 80) return;
        try { localStorage.setItem("nn.mouse", JSON.stringify({ v: 1, net: JSON.parse(net.serialize()) })); } catch {}
    }, 20000);

    window.Ghost = {
        toggle() {
            off = !off;
            try { localStorage.setItem("ghost.off", off ? "1" : "0"); } catch {}
        },
        get stats() {
            return `${net.steps} steps, ±${errEma < 0 ? "—" : errEma.toFixed(0)}px @ +${HORIZON}ms`;
        },
    };
})();
