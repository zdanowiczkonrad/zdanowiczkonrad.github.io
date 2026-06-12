/*
    zdanowicz.dev — ops console runtime
    Reading the source? Good instinct. konrad@zdanowicz.dev
*/
(() => {
    "use strict";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const params = new URLSearchParams(location.search);
    const lerp = (a, b, t) => a + (b - a) * t;
    const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mixHex = (a, b, t) => {
        const A = hexRgb(a), B = hexRgb(b);
        return "#" + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, "0")).join("");
    };

    /* ---- haptics ------------------------------------------------------ */

    const buzz = (ms = 5) => { if (navigator.vibrate) navigator.vibrate(ms); };
    document.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) buzz(5);
    });

    /* ---- theme & font -------------------------------------------------- */

    const THEMES = ["green", "amber", "cyan", "violet"];
    const FONTS = ["sharp", "brutal", "mono"];
    const BASE_ACCENT = { green: "#3df58c", amber: "#ffb000", cyan: "#4ec9ff", violet: "#8d7aff" };

    const setTheme = (t) => {
        if (!THEMES.includes(t)) return;
        root.dataset.theme = t;
        root.style.removeProperty("--accent");
        try { localStorage.setItem("theme", t); } catch {}
        applyDread();
        MapBg.recolor();
        Face.recolor();
        if (window.Mind) window.Mind.recolor();
        Sound.retune();
        CrtGL.sync();
        Dirt.sync();
        if (t !== "amber" && window.CrtKnobs) window.CrtKnobs.hide();
    };
    const setFont = (f) => {
        if (!FONTS.includes(f)) return;
        root.dataset.font = f;
        try { localStorage.setItem("font", f); } catch {}
    };
    try {
        const t = params.get("theme") || localStorage.getItem("theme");
        if (t) root.dataset.theme = THEMES.includes(t) ? t : root.dataset.theme;
        const f = params.get("font") || localStorage.getItem("font");
        if (f) root.dataset.font = FONTS.includes(f) ? f : root.dataset.font;
    } catch {}

    /* ---- violet dread: the deeper you go, the redder it gets ------------- */

    let dread = 0;
    const applyDread = () => {
        const doc = root.scrollHeight - innerHeight;
        dread = doc > 0 ? Math.min(1, Math.max(0, scrollY / doc)) : 0;
        root.style.setProperty("--dread", dread.toFixed(3));
        if (root.dataset.theme === "violet") {
            root.style.setProperty("--accent", mixHex(BASE_ACCENT.violet, "#ff2030", dread * 0.85));
            MapBg.recolor();
        }
    };

    /* ---- boot sequence -------------------------------------------------- */

    const boot = $("#boot");
    const bootSeen = (() => { try { return sessionStorage.getItem("boot"); } catch { return true; } })();
    if (reduced || bootSeen || params.get("noboot")) {
        boot.hidden = true;
    } else {
        try { sessionStorage.setItem("boot", "1"); } catch {}
        const lines = [
            "ZDANOWICZ.DEV // UPLINK v5.1",
            "> ESTABLISHING SECURE CHANNEL ........ OK",
            "> DECRYPTING SUBJECT FILE ............ OK",
            "> RENDERING",
        ];
        const pre = $("#bootText");
        let i = 0;
        const tick = () => {
            pre.textContent = lines.slice(0, ++i).join("\n");
            if (i < lines.length) setTimeout(tick, 130);
            else setTimeout(() => {
                boot.classList.add("done");
                setTimeout(() => (boot.hidden = true), 400);
            }, 220);
        };
        tick();
    }

    /* ---- clock ----------------------------------------------------------- */

    /* odometer: six digit columns slide vertically inside masked cells */
    const clock = $("#clock");
    let clockCols = [];
    if (clock) {
        const tz = (() => {
            try {
                const part = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
                    .formatToParts(new Date()).find((p) => p.type === "timeZoneName");
                if (part) return part.value;
            } catch {}
            const off = -new Date().getTimezoneOffset() / 60;
            return "UTC" + (off >= 0 ? "+" : "") + off;
        })();
        clock.textContent = "";
        "00:00:00".split("").forEach((ch) => {
            if (ch === ":") {
                const sep = document.createElement("span");
                sep.className = "cl-sep";
                sep.textContent = ":";
                clock.appendChild(sep);
                return;
            }
            const cell = document.createElement("span");
            cell.className = "cl-d";
            const col = document.createElement("span");
            col.className = "cl-col";
            for (let d = 0; d < 10; d++) {
                const n = document.createElement("span");
                n.textContent = d;
                col.appendChild(n);
            }
            cell.appendChild(col);
            clock.appendChild(cell);
            clockCols.push(col);
        });
        const tzEl = document.createElement("span");
        tzEl.className = "cl-tz";
        tzEl.textContent = tz;
        clock.appendChild(tzEl);
    }
    const tickClock = () => {
        if (!clock) return;
        const digits = new Date().toLocaleTimeString("en-GB", { hour12: false }).replace(/:/g, "");
        clockCols.forEach((col, i) => {
            const d = digits[i] || "0";
            if (col.dataset.d !== d) {
                col.dataset.d = d;
                col.style.transform = `translateY(${-d * 1.5}em)`;
            }
        });
    };
    tickClock();
    setInterval(tickClock, 1000);

    /* ---- text scramble ------------------------------------------------------ */

    const GLYPHS = "█▓▒░<>/\\|01▮·";
    const activeScrambles = new Map(); // el -> original text, so a CRT capture can settle them
    const settleScrambles = () => {
        activeScrambles.forEach((orig, el) => (el.textContent = orig));
        activeScrambles.clear();
    };
    const scramble = (el) => {
        if (reduced) return;
        const original = el.textContent;
        const chars = [...original];
        const start = performance.now();
        const DURATION = 700;
        activeScrambles.set(el, original);
        const frame = (now) => {
            if (!activeScrambles.has(el)) return; // settled externally
            const p = Math.min(1, (now - start) / DURATION);
            const settled = Math.floor(p * chars.length);
            el.textContent = chars
                .map((c, i) => (i < settled || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
                .join("");
            if (p < 1) requestAnimationFrame(frame);
            else { el.textContent = original; activeScrambles.delete(el); }
        };
        requestAnimationFrame(frame);
    };

    /* ---- counters --------------------------------------------------------------- */

    const countUp = (el) => {
        const target = parseInt(el.dataset.count, 10);
        if (reduced || target === 0) { el.textContent = target; return; }
        const start = performance.now();
        const DURATION = 1200;
        const frame = (now) => {
            const p = Math.min(1, (now - start) / DURATION);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    };

    /* ---- career telemetry graph (responsive, JS-built) ------------------------------ */

    const SIGNAL_MILESTONES = [[2009, 0], [2016, .38], [2020, .64], [2022, .84], [2026, 1]];
    const SIGNAL_Y0 = 2009, SIGNAL_Y1 = 2026;
    const signalSvg = $("#signalSvg");

    /* exact-fit quartic through the milestones: Vandermonde system, Gaussian elimination */
    const SIGNAL_POLY = (() => {
        const pts = SIGNAL_MILESTONES.map(([yr, p]) => [yr - SIGNAL_Y0, p]);
        const n = pts.length;
        const A = pts.map(([x]) => Array.from({ length: n }, (_, j) => x ** j));
        const b = pts.map(([, y]) => y);
        for (let c = 0; c < n; c++) {
            let p = c;
            for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
            [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
            for (let r = c + 1; r < n; r++) {
                const f = A[r][c] / A[c][c];
                for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
                b[r] -= f * b[c];
            }
        }
        const co = new Array(n);
        for (let r = n - 1; r >= 0; r--) {
            let s = b[r];
            for (let k = r + 1; k < n; k++) s -= A[r][k] * co[k];
            co[r] = s / A[r][r];
        }
        return co;
    })();
    const signalVal = (t) => SIGNAL_POLY.reduce((s, c, j) => s + c * t ** j, 0);

    (() => {
        const eqEl = $("#signalEq");
        if (!eqEl) return;
        const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
        const sup = (num) => String(num).split("").map((ch) => (ch === "-" ? "⁻" : SUPS[+ch])).join("");
        const coef = (c) => {
            const a = Math.abs(c);
            const exp = Math.floor(Math.log10(a));
            return exp >= -2 ? a.toFixed(3) : `${(a / 10 ** exp).toFixed(2)}·10${sup(exp)}`;
        };
        const terms = [];
        for (let j = SIGNAL_POLY.length - 1; j >= 1; j--) {
            const c = SIGNAL_POLY[j];
            if (Math.abs(c) < 1e-12) continue;
            terms.push(`${terms.length ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : ""}${coef(c)}t${j > 1 ? sup(j) : ""}`);
        }
        eqEl.innerHTML =
            `<span class="eq">ƒ(t) = ${terms.join("")}</span>` +
            `<span>t = YRS SINCE ${SIGNAL_Y0} · QUARTIC FIT · R² = 1.000</span>`;
    })();

    const buildSignal = () => {
        if (!signalSvg) return;
        const W = Math.max(320, signalSvg.clientWidth || 800);
        const H = 170;
        const m = 36, top = 24, bottom = H - 36;
        const X = (yr) => m + (yr - SIGNAL_Y0) / (SIGNAL_Y1 - SIGNAL_Y0) * (W - 2 * m);
        const Y = (p) => bottom - p * (bottom - top);

        const STEPS = 96;
        let dPath = "";
        for (let s = 0; s <= STEPS; s++) {
            const t = (SIGNAL_Y1 - SIGNAL_Y0) * s / STEPS;
            const x = X(SIGNAL_Y0 + t), y = Y(Math.max(0, signalVal(t)));
            dPath += `${s ? " L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
        }

        const axes = [bottom, (top + bottom) / 2, top].map((y, i) =>
            `<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="axis${i ? " faint" : ""}"/>`).join("");
        const nodes = SIGNAL_MILESTONES.map(([yr, p], i) => {
            const last = i === SIGNAL_MILESTONES.length - 1;
            return `<circle cx="${X(yr)}" cy="${Y(p)}" r="${last ? 5 : 4}"${last ? ' class="live"' : ""}/>`;
        }).join("");
        let prevTickX = -Infinity;
        const ticks = SIGNAL_MILESTONES.map(([yr], i) => {
            const x = X(yr), last = i === SIGNAL_MILESTONES.length - 1;
            // drop labels that would collide on narrow screens; endpoints always shown
            if (!last && (x - prevTickX < 42 || X(SIGNAL_Y1) - x < 42)) return "";
            prevTickX = x;
            return `<text x="${x}" y="${H - 10}">${last ? "NOW" : yr}</text>`;
        }).join("");

        signalSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        signalSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        signalSvg.innerHTML = `${axes}<path class="trace" d="${dPath}"/><g class="nodes">${nodes}</g><g class="ticks">${ticks}</g>`;

        const trace = $(".trace", signalSvg);
        if (!reduced && !signalSvg.classList.contains("drawn")) {
            const len = trace.getTotalLength();
            trace.style.strokeDasharray = len;
            trace.style.strokeDashoffset = len;
            trace.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.3,.6,.2,1)";
        }
    };
    buildSignal();

    const drawSignal = () => {
        signalSvg.classList.add("drawn");
        const trace = $(".trace", signalSvg);
        if (trace) requestAnimationFrame(() => (trace.style.strokeDashoffset = "0"));
    };

    let resizeT;
    addEventListener("resize", () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
            buildSignal();
            if (signalSvg.classList.contains("drawn")) {
                const trace = $(".trace", signalSvg);
                trace.style.strokeDasharray = "none";
                trace.style.strokeDashoffset = "0";
            }
            MapBg.resize();
        }, 180);
    });

    /* ---- reveal on scroll ----------------------------------------------------------- */

    const onReveal = (el) => {
        el.classList.add("in");
        if (el.dataset.scramble !== undefined) scramble(el);
        $$("[data-count]", el).forEach(countUp);
        $$(".s-bar i", el).forEach((bar) => (bar.style.width = bar.dataset.level + "%"));
        if ($(".signal", el)) setTimeout(drawSignal, 150);
    };

    if (reduced) {
        $$(".reveal").forEach(onReveal);
    } else {
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => {
                if (e.isIntersecting) { onReveal(e.target); io.unobserve(e.target); }
            }),
            { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
        );
        $$(".reveal").forEach((el, i) => {
            el.style.transitionDelay = (i % 4) * 60 + "ms";
            io.observe(el);
        });
    }

    /* ---- active section in nav ---------------------------------------------------------- */

    const navLinks = $$("[data-nav]");
    const sections = $$("main .section");
    const sectionIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const id = e.target.id;
            navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        }),
        { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => sectionIO.observe(s));

    /* ---- crosshair ------------------------------------------------------------------------- */

    const finePointer = matchMedia("(pointer: fine)").matches;
    if (finePointer && !reduced) {
        const crosshair = $(".crosshair");
        const chX = $(".crosshair .ch-x");
        const chY = $(".crosshair .ch-y");
        const chRead = $("#chRead");
        let raf = null;
        document.addEventListener("mousemove", (e) => {
            crosshair.classList.add("live");
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = null;
                chX.style.left = e.clientX + "px";
                chY.style.top = e.clientY + "px";
                chRead.style.left = e.clientX + "px";
                chRead.style.top = e.clientY + "px";
                chRead.textContent =
                    "X:" + String(e.clientX).padStart(4, "0") +
                    " Y:" + String(e.clientY + Math.round(scrollY)).padStart(4, "0");
            });
        });
    }

    /* ---- feint light: borders chase the cursor ----------------------------------------------- */

    if (finePointer) {
        $$(".op, .signal-panel, .contact-panel, .palette-box, .avatar").forEach((el) => {
            el.classList.add("lit");
            el.addEventListener("pointermove", (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", (e.clientX - r.left) + "px");
                el.style.setProperty("--my", (e.clientY - r.top) + "px");
            });
        });
    }

    /* ---- career list: roaming row highlight ----------------------------------------------------- */

    const career = $("#career");
    if (career && finePointer) {
        $$("li", career).forEach((li) => {
            li.addEventListener("mouseenter", () => {
                career.style.setProperty("--glow-y", li.offsetTop + "px");
                career.style.setProperty("--glow-h", li.offsetHeight + "px");
                career.style.setProperty("--glow-o", "1");
                Sound.blip(1400 + Math.random() * 300, .04, .02);
            });
        });
        career.addEventListener("mouseleave", () => career.style.setProperty("--glow-o", "0"));
    }

    /* ---- bio-scan: sharpened image + edge contours on hover ----------------------------------------- */

    const Face = (() => {
        const frame = $("#avatarFrame");
        const readout = $("#faceReadout");
        if (!frame) return { recolor() {}, setPulse() {} };

        const img = $("img", frame);
        let bpm = 64;

        /* processing layers */
        const procCanvas = document.createElement("canvas");
        procCanvas.className = "avatar-proc";
        const edgeCanvas = document.createElement("canvas");
        edgeCanvas.className = "avatar-edges";
        frame.append(procCanvas, edgeCanvas);

        let edgeMap = null, pw = 0, ph = 0;

        const boxBlur = (src, w, h, r) => {
            const out = new Float32Array(src.length);
            const tmp = new Float32Array(src.length);
            const span = 2 * r + 1;
            for (let y = 0; y < h; y++) {            // horizontal pass
                let acc = 0;
                for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
                for (let x = 0; x < w; x++) {
                    tmp[y * w + x] = acc / span;
                    acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
                }
            }
            for (let x = 0; x < w; x++) {            // vertical pass
                let acc = 0;
                for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
                for (let y = 0; y < h; y++) {
                    out[y * w + x] = acc / span;
                    acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
                }
            }
            return out;
        };

        const accentRgb = () => {
            const c = getComputedStyle(root).getPropertyValue("--accent").trim();
            return c.startsWith("#") && c.length >= 7 ? hexRgb(c) : [61, 245, 140];
        };

        const drawEdges = () => {
            if (!edgeMap) return;
            const ec = edgeCanvas.getContext("2d");
            const id = ec.createImageData(pw, ph);
            const [r, g, b] = accentRgb();
            for (let i = 0; i < edgeMap.length; i++) {
                const a = edgeMap[i];
                if (!a) continue;
                const o = i * 4;
                id.data[o] = r; id.data[o + 1] = g; id.data[o + 2] = b; id.data[o + 3] = a;
            }
            ec.putImageData(id, 0, 0);
        };

        const process = () => {
            pw = Math.min(512, img.naturalWidth || 512);
            ph = Math.min(512, img.naturalHeight || 512);
            if (!pw || !ph) return;
            const off = document.createElement("canvas");
            off.width = pw; off.height = ph;
            const oc = off.getContext("2d", { willReadFrequently: true });
            oc.drawImage(img, 0, 0, pw, ph);
            let data;
            try { data = oc.getImageData(0, 0, pw, ph).data; }
            catch { return; }                         // tainted canvas (file://) — img fallback stays
            const N = pw * ph;
            const gray = new Float32Array(N);
            for (let i = 0; i < N; i++) {
                const o = i * 4;
                gray[i] = data[o] * .299 + data[o + 1] * .587 + data[o + 2] * .114;
            }
            /* unsharp mask = the "deblur": original + k·(original − gaussian) */
            const soft = boxBlur(boxBlur(gray, pw, ph, 2), pw, ph, 2);
            const sharp = new Float32Array(N);
            for (let i = 0; i < N; i++) sharp[i] = Math.max(0, Math.min(255, gray[i] + 1.5 * (gray[i] - soft[i])));

            procCanvas.width = pw; procCanvas.height = ph;
            const pc = procCanvas.getContext("2d");
            const pd = pc.createImageData(pw, ph);
            for (let i = 0; i < N; i++) {
                const v = Math.max(0, Math.min(255, (sharp[i] - 128) * 1.12 + 116));
                const o = i * 4;
                pd.data[o] = pd.data[o + 1] = pd.data[o + 2] = v;
                pd.data[o + 3] = 255;
            }
            pc.putImageData(pd, 0, 0);

            /* Sobel over the sharpened field -> contour map */
            edgeMap = new Uint8ClampedArray(N);
            for (let y = 1; y < ph - 1; y++) {
                for (let x = 1; x < pw - 1; x++) {
                    const i = y * pw + x;
                    const gx = -sharp[i - pw - 1] - 2 * sharp[i - 1] - sharp[i + pw - 1]
                             + sharp[i - pw + 1] + 2 * sharp[i + 1] + sharp[i + pw + 1];
                    const gy = -sharp[i - pw - 1] - 2 * sharp[i - pw] - sharp[i - pw + 1]
                             + sharp[i + pw - 1] + 2 * sharp[i + pw] + sharp[i + pw + 1];
                    const mag = Math.sqrt(gx * gx + gy * gy);
                    edgeMap[i] = mag > 70 ? Math.min(220, (mag - 70) * 1.6) : 0;
                }
            }
            edgeCanvas.width = pw; edgeCanvas.height = ph;
            drawEdges();
            if (readout) readout.textContent = `BIO-SCAN v3.0 · PULSE ${Math.round(bpm)}`;
        };
        if (img) {
            if (img.complete && img.naturalWidth) process();
            else img.addEventListener("load", process, { once: true });
        }

        const setPulse = (v) => {
            bpm = v;
            if (readout && !hovering) readout.textContent = `BIO-SCAN v3.0 · PULSE ${Math.round(bpm)}`;
        };
        let hovering = false;

        frame.addEventListener("pointermove", (e) => {
            const r = frame.getBoundingClientRect();
            const nx = Math.abs((e.clientX - r.left) / r.width - 0.5) * 2;
            const ny = Math.abs((e.clientY - r.top) / r.height - 0.5) * 2;
            if (readout) readout.textContent =
                `BIO-SCAN v3.0 · LOCK ${(96.8 + nx + ny).toFixed(1)}% · PULSE ${Math.round(bpm)}`;
        });
        frame.addEventListener("pointerenter", () => {
            hovering = true;
            Sound.blip(1800, .05, .03);
        });
        frame.addEventListener("pointerleave", () => {
            hovering = false;
            if (readout) readout.textContent = `BIO-SCAN v3.0 · PULSE ${Math.round(bpm)}`;
        });

        return { recolor: drawEdges, setPulse };
    })();

    /* ---- simulated vitals: bounded random walks, pulse feeds the bio-scan readout ------------------ */

    (() => {
        const els = { pulse: $("#vPulse"), bp: $("#vBp"), spo2: $("#vSpo2"), temp: $("#vTemp") };
        let pulse = 64, sys = 118, dia = 76, spo2 = 98.4, temp = 36.6;
        const walk = (v, min, max, step) => Math.min(max, Math.max(min, v + (Math.random() - .5) * step));
        const tick = () => {
            pulse = walk(pulse, 58, 76, 4);
            sys = walk(sys, 110, 126, 3);
            dia = walk(dia, 70, 84, 2.5);
            spo2 = walk(spo2, 96.5, 99.4, .7);
            temp = walk(temp, 36.4, 36.9, .1);
            if (els.pulse) els.pulse.textContent = Math.round(pulse) + " BPM";
            if (els.bp) els.bp.textContent = Math.round(sys) + "/" + Math.round(dia);
            if (els.spo2) els.spo2.textContent = Math.round(spo2) + "%";
            if (els.temp) els.temp.textContent = temp.toFixed(1) + "°C";
            Face.setPulse(pulse);
        };
        tick();
        setInterval(tick, 2000);
    })();

    /* ---- world map background --------------------------------------------------------------------------- */

    const MapBg = (() => {
        const canvas = $("#worldMap");
        if (!canvas || typeof MAP_GRID === "undefined") return { recolor() {}, resize() {} };
        const ctx2d = canvas.getContext("2d");

        const CITIES = [
            ["WROCŁAW", 51.11, 17.03],
            ["STOCKHOLM", 59.33, 18.07],
            ["GÖTEBORG", 57.71, 11.97],
            ["WARSZAWA", 52.23, 21.01],
            ["KRAKÓW", 50.06, 19.94],
            ["LONDON", 51.51, -0.13],
            ["BARCELONA", 41.39, 2.17],
            ["KYIV", 50.45, 30.52],
            ["MOSCOW", 55.76, 37.62],
            ["ISTANBUL", 41.01, 28.98],
            ["NEW YORK", 40.71, -74.01],
            ["WISCONSIN", 43.07, -89.40],
            ["FLORIDA", 25.76, -80.19],
            ["SAN FRANCISCO", 37.77, -122.42],
            ["BEIJING", 39.90, 116.40],
        ];
        const HUB = CITIES[0];

        // decode land bitmask -> [lon, lat] dots
        const bin = atob(MAP_GRID.b64);
        const bits = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
        const dots = [];
        const stride = innerWidth < 700 ? 3 : 2;
        for (let row = 0; row < MAP_GRID.rows; row += stride) {
            const lat = MAP_GRID.latTop - row * (MAP_GRID.latTop - MAP_GRID.latBot) / (MAP_GRID.rows - 1);
            for (let col = 0; col < MAP_GRID.cols; col += stride) {
                const i = row * MAP_GRID.cols + col;
                if (bits[i >> 3] & (1 << (i & 7))) dots.push([-180 + col + 0.5, lat]);
            }
        }

        let W = 0, H = 0, dpr = 1, accent = [61, 245, 140];
        let mx = -9999, my = -9999;
        let lastFrame = 0;

        const resize = () => {
            dpr = Math.min(2, devicePixelRatio || 1);
            W = innerWidth; H = innerHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            render(performance.now());
        };

        const recolor = () => {
            const c = getComputedStyle(root).getPropertyValue("--accent").trim();
            if (c.startsWith("#") && c.length >= 7) accent = hexRgb(c);
        };

        const project = (lon, lat) => {
            const k = W / 300;
            const cx = W / 2 + (mx > -999 ? (mx - W / 2) * -0.025 : 0);
            const cy = H * 0.44 + (my > -999 ? (my - H / 2) * -0.02 : 0);
            const relLon = ((lon - HUB[2] + 540) % 360) - 180;
            let x = cx + relLon * k;
            let y = cy - (lat - 48) * k * 1.28;
            y += Math.pow((x - cx) / W, 2) * H * 0.14;     // slight tube curvature
            return [x, y];
        };

        const render = (now) => {
            ctx2d.clearRect(0, 0, W, H);
            const [r, g, b] = accent;

            // land dots
            for (const [lon, lat] of dots) {
                const [x, y] = project(lon, lat);
                if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
                let a = 0.17;
                const dx = x - mx, dy = y - my;
                const d2 = dx * dx + dy * dy;
                if (d2 < 25600) a += 0.5 * (1 - Math.sqrt(d2) / 160);   // mouse lantern
                ctx2d.fillStyle = `rgba(${r},${g},${b},${a})`;
                ctx2d.fillRect(x, y, 1.6, 1.6);
            }

            // city markers
            const cyc = reduced ? 0 : Math.floor(now / 4600) % (CITIES.length - 1) + 1;
            CITIES.forEach(([name, lat, lon], i) => {
                const [x, y] = project(lon, lat);
                const hub = i === 0, active = i === cyc;
                ctx2d.strokeStyle = `rgba(${r},${g},${b},${hub || active ? .8 : .3})`;
                ctx2d.lineWidth = 1;
                const s = hub ? 5 : 3.5;
                ctx2d.beginPath();
                if (hub) { // diamond
                    ctx2d.moveTo(x, y - s); ctx2d.lineTo(x + s, y); ctx2d.lineTo(x, y + s); ctx2d.lineTo(x - s, y);
                    ctx2d.closePath();
                } else {   // cross
                    ctx2d.moveTo(x - s, y); ctx2d.lineTo(x + s, y);
                    ctx2d.moveTo(x, y - s); ctx2d.lineTo(x, y + s);
                }
                ctx2d.stroke();
                if (hub || active) {
                    ctx2d.fillStyle = `rgba(${r},${g},${b},${hub ? .75 : .55})`;
                    ctx2d.font = "9px JetBrains Mono, monospace";
                    ctx2d.fillText(name, x + 8, y - 6);
                }
            });

            if (!reduced) {
                // uplink curve hub -> active city + travelling pulse + ring
                const [, alat, alon] = CITIES[cyc];
                const [hx, hy] = project(HUB[2], HUB[1]);
                const [ax, ay] = project(alon, alat);
                const mxp = (hx + ax) / 2, myp = Math.min(hy, ay) - Math.abs(ax - hx) * 0.18 - 24;
                ctx2d.strokeStyle = `rgba(${r},${g},${b},.4)`;
                ctx2d.setLineDash([3, 5]);
                ctx2d.lineDashOffset = -(now / 40) % 8;
                ctx2d.beginPath();
                ctx2d.moveTo(hx, hy);
                ctx2d.quadraticCurveTo(mxp, myp, ax, ay);
                ctx2d.stroke();
                ctx2d.setLineDash([]);

                const t = (now % 4600) / 4600;
                const px = (1 - t) * (1 - t) * hx + 2 * (1 - t) * t * mxp + t * t * ax;
                const py = (1 - t) * (1 - t) * hy + 2 * (1 - t) * t * myp + t * t * ay;
                ctx2d.fillStyle = `rgba(${r},${g},${b},.9)`;
                ctx2d.fillRect(px - 1.5, py - 1.5, 3, 3);

                const ringT = (now % 1800) / 1800;
                ctx2d.strokeStyle = `rgba(${r},${g},${b},${(1 - ringT) * .5})`;
                ctx2d.beginPath();
                ctx2d.arc(ax, ay, 4 + ringT * 22, 0, Math.PI * 2);
                ctx2d.stroke();

                const hubT = (now % 2400) / 2400;
                ctx2d.strokeStyle = `rgba(${r},${g},${b},${(1 - hubT) * .6})`;
                ctx2d.beginPath();
                ctx2d.arc(hx, hy, 5 + hubT * 16, 0, Math.PI * 2);
                ctx2d.stroke();
            }
        };

        const loop = (now) => {
            if (!document.hidden && now - lastFrame > 33) { lastFrame = now; render(now); }
            requestAnimationFrame(loop);
        };

        if (finePointer) {
            document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
        }
        recolor();
        resize();
        if (!reduced) requestAnimationFrame(loop);
        return { recolor, resize };
    })();

    /* ---- amber: full CRT — the page is rasterized and re-rendered on a curved tube in WebGL.
            Scroll moves a uniform; tears, RGB split and phosphor persistence happen in-shader.
            Falls back to the CSS .fx-crt overlay when WebGL/rasterizer are unavailable. ---------- */

    const CrtGL = (() => {
        const canvas = $("#crtGL");
        const eligible = canvas && !reduced && finePointer && innerWidth > 900;

        /* tube control knobs (0..2, 1 = stock) — driven by the CrtKnobs panel */
        const knobs = { jitter: 1, snow: 1, intf: 1 };
        try {
            const saved = JSON.parse(localStorage.getItem("crtKnobs") || "{}");
            for (const k in knobs) if (typeof saved[k] === "number") knobs[k] = Math.min(2, Math.max(0, saved[k]));
        } catch {}
        const save = () => { try { localStorage.setItem("crtKnobs", JSON.stringify(knobs)); } catch {} };

        if (!eligible) return { sync() {}, knobs, save };

        const BARREL = 0.24;
        let gl = null, U = {}, tex = null, mapTex = null, texW = 0, texH = 0, texScale = 1;
        let raf = null, active = false, capturing = false, failed = false;
        let dpr = 1, t0 = performance.now();
        let vel = 0, lastSc = 0, glitchV = 0, tearV = 0;
        let bgCol = [0.024, 0.02, 0.012];
        let hovEl = null, hovRect = [0, 0, 0, 0], hovA = 0, patchBusy = false, patchQueue = [];
        let frameN = 0, recapT = null;
        const REPAINT_MS = 10000, SCAN_MS = 4000;   /* re-shoot cadence / top-to-bottom sweep duration */
        let scanSnap = null, scanCtx = null, scanRow = 0, repaintT = null;

        const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
        const FS = `
precision mediump float;
uniform sampler2D tex;   /* page snapshot, transparent background */
uniform sampler2D map;   /* live world-map canvas, screen space */
uniform vec2 r;          /* canvas device px */
uniform vec2 ts;         /* snapshot texture px */
uniform vec3 bg;
uniform vec4 hov;        /* hover rect, page device px (x, y, w, h) */
uniform float t, ready, scroll, m, glitch, tearY, vel, hovA, grid, scanY;  /* scanY: repaint sweep, page device px (idle: -2e4) */
uniform vec3 noise;      /* tube control knobs: x jitter, y background static, z interference (0..2, 1 = stock) */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
    vec2 uv = vec2(gl_FragCoord.x, r.y - gl_FragCoord.y) / r;  /* top-left origin */
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);
    vec2 d = uv + c * r2 * ${BARREL};                          /* barrel */
    vec2 e = abs(d - 0.5);
    float bezel = smoothstep(0.5, 0.494, max(e.x, e.y));

    /* content pixel (screen px -> page px -> texture px) */
    float wob = sin(d.y * 130.0 + t * 6.3) * (vel * 1.6 + glitch * 2.5);
    float px = d.x * r.x + wob;
    float py = d.y * r.y + scroll;
    /* per-line jitter + a drifting interference band that shimmers rows sideways */
    float ib = exp(-abs(uv.y - fract(t * 0.037)) * 24.0) * noise.z;
    px += (hash(vec2(floor(d.y * r.y), floor(t * 90.0))) - 0.5) * (0.7 * noise.x + ib * 6.0 + glitch * 3.0);
    float band = (1.0 - smoothstep(20.0, 90.0, abs(py - tearY))) * glitch;  /* sync tear */
    px += band * 70.0 * (hash(vec2(floor(t * 27.0), 1.0)) - 0.35);
    float split = 0.8 + vel * 1.4 + glitch * 5.0;

    vec2 tc = vec2(px, py) * m / ts;
    float inPage = (tc.x >= 0.0 && tc.x <= 1.0 && tc.y >= 0.0 && tc.y <= 1.0) ? 1.0 : 0.0;
    vec2 dx = vec2(split * m / ts.x, 0.0);
    vec4 pr = texture2D(tex, tc + dx);
    vec4 pg = texture2D(tex, tc);
    vec4 pb = texture2D(tex, tc - dx);

    /* base layers: bg color, procedural blueprint grid (under glass), live map */
    vec3 col = bg;
    vec2 sp = d * r;
    float gline = clamp(step(mod(sp.x, grid), 1.5) + step(mod(sp.y, grid), 1.5), 0.0, 1.0);
    col += vec3(1.0, 0.69, 0.06) * 0.028 * gline;
    vec4 mp = texture2D(map, d);
    col = mix(col, mp.rgb, clamp(mp.a, 0.0, 1.0) * 0.9);

    /* page snapshot over the base, per-channel for the rgb split */
    col.r = mix(col.r, pr.r, pr.a * inPage);
    col.g = mix(col.g, pg.g, pg.a * inPage);
    col.b = mix(col.b, pb.b, pb.a * inPage);

    /* shader-native hover glow: pulsing block highlight on the hovered control */
    float hx = step(hov.x, px) * step(px, hov.x + hov.z);
    float hy = step(hov.y, py) * step(py, hov.y + hov.w);
    col += vec3(1.0, 0.72, 0.12) * hx * hy * hovA * (0.09 + 0.03 * sin(t * 4.0));

    /* repaint sweep: bright scan line + long phosphor trail over the freshly drawn rows */
    float sd = scanY - py;
    col += vec3(1.0, 0.70, 0.12) * ((1.0 - smoothstep(0.0, 20.0, abs(sd))) * 0.6 + (sd > 0.0 ? exp(-sd / 200.0) * 0.16 : 0.0));

    /* cheap phosphor bloom */
    vec4 b1 = texture2D(tex, tc + vec2(0.0, 2.2 * m / ts.y));
    vec4 b2 = texture2D(tex, tc - vec2(2.2 * m / ts.x, 0.0));
    col += (b1.rgb * b1.a + b2.rgb * b2.a) * 0.08 * inPage;

    /* glass: scanlines & grille fixed to the screen, grain, vignette, flicker */
    float sl = 0.80 + 0.20 * sin(d.y * r.y * 2.094);
    float grille = 0.95 + 0.05 * sin(d.x * r.x * 1.571);
    float grain = 0.89 + 0.11 * hash(floor(uv * r / 1.5) + vec2(floor(t * 24.0)));
    float vig = 1.0 - r2 * 0.75;
    float fl = 0.985 + 0.012 * sin(t * 11.0) + 0.003 * sin(t * 73.0) - band * 0.25;
    col *= sl * grille * grain * vig * fl;

    /* brightness noise riding the interference band */
    col += vec3(1.0, 0.72, 0.2) * ib * (hash(vec2(floor(sp.y / 2.0), floor(t * 47.0))) - 0.4) * 0.10;

    /* background static: faint amber-tinted noise across the tube during normal
       view — STATIC knob = intensity & visibility (0 = clean glass) */
    col += vec3(1.0, 0.72, 0.2) * hash(floor(gl_FragCoord.xy / 2.0) + vec2(floor(t * 30.0), 3.0)) * (0.055 * noise.y);

    /* cathode beam: the raster refresh itself — a bright line rolling down the
       glass, phosphor dimming with time-since-refresh in the rows behind it */
    float by = fract(t * 0.42);
    float since = fract(by - d.y);                /* 0 = the beam just passed this row */
    col *= 0.80 + 0.45 * exp(-since * 4.0);
    col += vec3(1.0, 0.72, 0.18) * (1.0 - smoothstep(0.0, 0.005, abs(d.y - by))) * 0.22;

    /* amber phosphor cast + idle glow */
    col = mix(col, vec3(col.g * 1.25, col.g * 0.85, col.g * 0.25), 0.22);
    col += vec3(1.0, 0.69, 0.1) * 0.012 * vig;

    if (ready < 0.5) col = vec3(1.0, 0.72, 0.2) * hash(floor(uv * r / 2.0) + vec2(floor(t * 30.0))) * 0.22;
    /* phosphor persistence: low alpha + preserved buffer = ghost trails and burn-in
       accumulate; the sweep redraws at full strength, wiping the rows it just passed */
    float wipe = (sd > 0.0) ? exp(-sd / 240.0) : 0.0;
    gl_FragColor = vec4(col * bezel, mix(0.32, 1.0, wipe));
}`;

        const init = () => {
            gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true });
            if (!gl) return false;
            const sh = (type, src) => {
                const s = gl.createShader(type);
                gl.shaderSource(s, src); gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
                return s;
            };
            const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
            if (!vs || !fs) return false;
            const prog = gl.createProgram();
            gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
            gl.useProgram(prog);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            const pLoc = gl.getAttribLocation(prog, "p");
            gl.enableVertexAttribArray(pLoc);
            gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
            ["tex", "map", "r", "ts", "bg", "hov", "t", "ready", "scroll", "m", "glitch", "tearY", "vel", "hovA", "grid", "scanY", "noise"]
                .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
            gl.uniform1i(U.tex, 0);
            gl.uniform1i(U.map, 1);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            mapTex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, mapTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
            [[gl.TEXTURE_WRAP_S], [gl.TEXTURE_WRAP_T]].forEach(([p]) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.activeTexture(gl.TEXTURE0);
            return true;
        };

        const size = () => {
            dpr = Math.min(2, devicePixelRatio || 1);
            canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };

        const loadH2C = () => new Promise((res, rej) => {
            if (window.html2canvas) return res();
            const s = document.createElement("script");
            s.src = "vendor/html2canvas.min.js";
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });

        const SKIP = ["statusbar", "bottombar", "palette", "boot", "crosshair", "legacy-flash", "fx-crt", "fx-noise", "fx-dread", "grid-bg", "fx-aurora", "neural-bg", "neural-hud", "chatwin", "ghost-cursor", "crt-knobs"];
        const skipEl = (el) => el.id === "crtGL" || el.id === "worldMap" || el.id === "dirt" ||
            SKIP.some((c) => el.classList && el.classList.contains(c));

        const shoot = async () => {
            root.classList.add("crt-cap");
            $$(".reveal:not(.in)").forEach(onReveal);
            settleScrambles();
            await new Promise((r) => setTimeout(r, 120));
            try {
                const pageH = root.scrollHeight;
                const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                texScale = Math.min(dpr, (maxTex - 8) / pageH, (maxTex - 8) / innerWidth, 2);
                return await html2canvas(document.body, {
                    backgroundColor: null,            /* transparent: bg+grid+map live in the shader */
                    scale: texScale,
                    logging: false,
                    useCORS: true,
                    ignoreElements: skipEl,
                    /* scroll is virtual on the tube: the texture is always the unscrolled
                       page and the shader offsets by the live scrollY uniform — without
                       this pin a shot taken mid-page comes out shifted by the scroll offset */
                    scrollX: 0, scrollY: 0,
                });
            } finally {
                root.classList.remove("crt-cap");
            }
        };

        const upload = (snap) => {
            texW = snap.width; texH = snap.height;
            if (tex) gl.deleteTexture(tex);
            tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        };

        const capture = async () => {
            upload(await shoot());
            scanSnap = null;                          /* wholesale swap obsoletes any sweep in flight */
        };

        /* periodic repaint: re-shoot the page, then the frame loop sweeps the fresh
           frame into the live texture top-to-bottom behind a visible scan line */
        const scanRepaint = async () => {
            if (!active || capturing || patchBusy || scanSnap || document.hidden || !window.html2canvas) return;
            capturing = true;
            try {
                const snap = await shoot();
                if (snap.width === texW && snap.height === texH) {
                    scanCtx = snap.getContext("2d", { willReadFrequently: true });
                    scanSnap = snap; scanRow = 0;
                } else {
                    upload(snap);                     /* page reflowed since last shot — swap outright */
                }
            } catch {}
            capturing = false;
        };

        const uploadMap = () => {
            const mc = $("#worldMap");
            if (!mc || !mc.width) return;
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, mapTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
            gl.activeTexture(gl.TEXTURE0);
        };

        /* ---- hover: forward pointer events through the glass + patch re-shoots ---- */

        const unbarrel = (cx, cy) => {
            let ux = cx / innerWidth, uy = cy / innerHeight;
            const dx0 = ux, dy0 = uy;
            for (let i = 0; i < 3; i++) {
                const ox = ux - 0.5, oy = uy - 0.5, q = (ox * ox + oy * oy) * BARREL;
                ux = dx0 - ox * q; uy = dy0 - oy * q;
            }
            return [ux * innerWidth, uy * innerHeight];
        };

        const domAt = (x, y) =>
            document.elementsFromPoint(x, y).find((el) => el !== canvas && !el.closest(".statusbar, .bottombar, .palette")) || null;

        const fire = (el, type, x, y) => {
            try {
                el.dispatchEvent(new (window.PointerEvent || MouseEvent)(type, {
                    bubbles: type.endsWith("move"), clientX: x, clientY: y, pointerType: "mouse",
                }));
            } catch {}
        };

        const INTERACTIVE = "a, button, .career li, .op, .stack li, .avatar-frame";

        const requestPatch = (el, hover) => {
            patchQueue = patchQueue.filter((j) => j.el !== el);
            patchQueue.push({ el, hover });
            runPatches();
        };

        const runPatches = async () => {
            if (patchBusy || !active || !window.html2canvas) return;
            patchBusy = true;
            while (patchQueue.length) {
                const { el, hover } = patchQueue.shift();
                try {
                    const r0 = el.getBoundingClientRect();
                    if (r0.width < 2 || r0.width > innerWidth) continue;
                    // capture the full-page render CROPPED to this region — same renderer and
                    // coordinate system as the master snapshot, so the patch can't drift
                    const x0 = Math.max(0, Math.floor(r0.left) - 2);
                    const y0 = Math.max(0, Math.floor(r0.top + scrollY) - 2);
                    const w0 = Math.min(Math.ceil(r0.width) + 4, innerWidth - x0);
                    const h0 = Math.ceil(r0.height) + 4;
                    root.classList.add("crt-cap");           /* color-mix substitutions for the rasterizer */
                    el.classList.toggle("fake-hover", hover);
                    const snap = await html2canvas(document.body, {
                        backgroundColor: null,
                        scale: texScale,
                        logging: false,
                        useCORS: true,
                        ignoreElements: skipEl,
                        x: x0, y: y0, width: w0, height: h0,
                        /* x/y are page-absolute — without this the crop origin
                           drifts by the live scroll offset and patches paint the
                           wrong content (visible as garbled hover on the tube) */
                        scrollX: 0, scrollY: 0,
                    });
                    el.classList.remove("fake-hover");
                    root.classList.remove("crt-cap");
                    const tx = Math.round(x0 * texScale);
                    const ty = Math.round(y0 * texScale);
                    if (!tex || tx < 0 || ty < 0 || tx + snap.width > texW || ty + snap.height > texH) continue;
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, tx, ty, gl.RGBA, gl.UNSIGNED_BYTE, snap);
                } catch {
                    el.classList.remove("fake-hover");
                    root.classList.remove("crt-cap");
                }
            }
            patchBusy = false;
        };

        const setHover = (el, x, y) => {
            if (el === hovEl) return;
            const target = el ? el.closest(INTERACTIVE) : null;
            const oldTarget = hovEl ? hovEl.closest(INTERACTIVE) : null;
            if (hovEl) { fire(hovEl, "pointerleave", x, y); fire(hovEl, "mouseleave", x, y); }
            hovEl = el;
            if (el) { fire(el, "pointerenter", x, y); fire(el, "mouseenter", x, y); }
            if (target !== oldTarget) {
                if (oldTarget) requestPatch(oldTarget, false);
                if (target) {
                    requestPatch(target, true);
                    const r0 = target.getBoundingClientRect();
                    hovRect = [r0.left * dpr, (r0.top + scrollY) * dpr, r0.width * dpr, r0.height * dpr];
                }
            }
            canvas.style.cursor = target && target.closest("a, button") ? "pointer" : "crosshair";
        };

        let moveRaf = null;
        canvas.addEventListener("pointermove", (e) => {
            if (!active || moveRaf) return;
            moveRaf = requestAnimationFrame(() => {
                moveRaf = null;
                const [x, y] = unbarrel(e.clientX, e.clientY);
                const el = domAt(x, y);
                setHover(el, x, y);
                if (el) { fire(el, "pointermove", x, y); fire(el, "mousemove", x, y); }
            });
        });
        canvas.addEventListener("pointerleave", () => { if (active) setHover(null, 0, 0); });

        canvas.addEventListener("click", (e) => {
            if (!active) return;
            const [x, y] = unbarrel(e.clientX, e.clientY);
            const el = domAt(x, y);
            if (el) el.click();
            clearTimeout(recapT);                 /* state may have changed: one full re-shoot */
            recapT = setTimeout(() => { if (active && !capturing) capture(); }, 900);
        });

        const frame = (now) => {
            raf = requestAnimationFrame(frame);
            if (document.hidden) return;
            const sc = scrollY * dpr;
            const target = Math.min(3, Math.abs(sc - lastSc) / (18 * dpr));
            lastSc = sc;
            vel += (target - vel) * 0.14;
            hovA += (((hovEl && hovEl.closest(INTERACTIVE)) ? 1 : 0) - hovA) * 0.18;
            if (glitchV > 0.02) glitchV *= 0.88;
            else if (Math.random() < 0.006 + vel * 0.004) {
                glitchV = 0.6 + Math.random() * 0.4;
                tearV = sc + Math.random() * canvas.height;
            }
            if ((frameN++ & 1) === 0) uploadMap();   /* live map layer at ~30fps */
            if (scanSnap && tex) {
                const rows = Math.min(Math.max(2, Math.round(texH / (SCAN_MS / 16.7))), texH - scanRow);
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, scanRow, gl.RGBA, gl.UNSIGNED_BYTE,
                    scanCtx.getImageData(0, scanRow, texW, rows));
                scanRow += rows;
                if (scanRow >= texH) {
                    scanSnap = scanCtx = null;
                    const ht = hovEl && hovEl.closest(INTERACTIVE);
                    if (ht) requestPatch(ht, true);  /* fresh shot lost the hover styling — re-patch it */
                }
            }
            gl.uniform1f(U.scanY, scanSnap ? scanRow / (texScale / dpr) : -2e4);
            gl.uniform2f(U.r, canvas.width, canvas.height);
            gl.uniform2f(U.ts, Math.max(1, texW), Math.max(1, texH));
            gl.uniform3f(U.bg, bgCol[0], bgCol[1], bgCol[2]);
            gl.uniform4f(U.hov, hovRect[0], hovRect[1], hovRect[2], hovRect[3]);
            gl.uniform1f(U.t, (now - t0) / 1000);
            gl.uniform1f(U.ready, tex ? 1 : 0);
            gl.uniform1f(U.scroll, sc);
            gl.uniform1f(U.m, texScale / dpr);
            gl.uniform1f(U.glitch, glitchV);
            gl.uniform1f(U.tearY, tearV);
            gl.uniform1f(U.vel, vel);
            gl.uniform1f(U.hovA, hovA);
            gl.uniform1f(U.grid, 56 * dpr);
            gl.uniform3f(U.noise, knobs.jitter, knobs.snow, knobs.intf);
            if (tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); }
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const activate = async () => {
            if (capturing) return;
            capturing = true;
            try {
                if (gl === null && !init()) throw new Error("no webgl");
                size();
                const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                if (bg) bgCol = bg.slice(0, 3).map((v) => +v / 255);
                root.classList.add("crt-tuning");
                if (!raf) { lastSc = scrollY * dpr; raf = requestAnimationFrame(frame); }
                await loadH2C();
                await capture();
                if (root.dataset.theme === "amber") {
                    root.classList.remove("crt-tuning");
                    root.classList.add("crt-on");
                    active = true;
                    clearInterval(repaintT);
                    repaintT = setInterval(scanRepaint, REPAINT_MS);
                }
            } catch (err) {
                failed = true;
                root.classList.remove("crt-tuning", "crt-cap");
                deactivate(); // CSS .fx-crt fallback takes over
            }
            capturing = false;
        };

        const deactivate = () => {
            active = false;
            setHover(null, 0, 0);
            patchQueue = [];
            clearTimeout(recapT);
            clearInterval(repaintT); repaintT = null;
            scanSnap = scanCtx = null;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            root.classList.remove("crt-on", "crt-tuning");
            if (tex) { gl.deleteTexture(tex); tex = null; }
        };

        const sync = () => {
            const want = root.dataset.theme === "amber" && !failed;
            if (want && !active && !capturing) activate();
            else if (!want && (active || raf)) deactivate();
        };

        let rsT;
        addEventListener("resize", () => {
            if (!active) return;
            clearTimeout(rsT);
            rsT = setTimeout(() => { size(); capture(); }, 250);
        });
        sync();
        return { sync, knobs, save };
    })();

    /* ---- tube control: hardware knobs for the amber shader noise -------------------------------- */

    const CrtKnobs = (() => {
        const K = CrtGL.knobs;
        const DEFS = [
            { k: "jitter", label: "JITTER" },
            { k: "snow", label: "STATIC" },
            { k: "intf", label: "INTERF" },
        ];
        let panel = null;

        const build = () => {
            panel = document.createElement("div");
            panel.className = "crt-knobs";
            panel.innerHTML = `
                <div class="ck-head"><span>TUBE CONTROL</span><button class="ck-close" aria-label="Close tube control">✕</button></div>
                <div class="ck-row"></div>
                <div class="ck-foot">DRAG · SCROLL · 2×CLICK RESETS</div>`;
            const row = $(".ck-row", panel);
            DEFS.forEach(({ k, label }) => {
                const knob = document.createElement("div");
                knob.className = "ck-knob";
                knob.innerHTML = `<div class="ck-dial" tabindex="0" role="slider" aria-label="${label}"
                    aria-valuemin="0" aria-valuemax="2"><div class="ck-ind"></div></div>
                    <label>${label}</label><span class="ck-val"></span>`;
                row.appendChild(knob);
                const dial = $(".ck-dial", knob), ind = $(".ck-ind", knob), val = $(".ck-val", knob);
                const set = (v, tick) => {
                    v = Math.round(Math.min(2, Math.max(0, v)) * 100) / 100;
                    if (tick && Math.round(v * 20) !== Math.round(K[k] * 20)) Sound.blip(900 + v * 500, .03, .02);
                    K[k] = v;
                    ind.style.transform = `rotate(${(v - 1) * 135}deg)`;   /* 0..2 -> -135°..+135° */
                    val.textContent = v.toFixed(2);
                    dial.setAttribute("aria-valuenow", v);
                    CrtGL.save();
                };
                set(K[k]);
                let sy = 0, sv = 0;
                dial.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    dial.setPointerCapture(e.pointerId);
                    sy = e.clientY; sv = K[k];
                });
                dial.addEventListener("pointermove", (e) => {
                    if (dial.hasPointerCapture(e.pointerId)) set(sv + (sy - e.clientY) / 70, true);
                });
                dial.addEventListener("wheel", (e) => { e.preventDefault(); set(K[k] - e.deltaY * 0.0025, true); }, { passive: false });
                dial.addEventListener("dblclick", () => { set(1); Sound.blip(880, .08, .04); });
                dial.addEventListener("keydown", (e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); set(K[k] + 0.05, true); }
                    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); set(K[k] - 0.05, true); }
                });
            });
            $(".ck-close", panel).addEventListener("click", hide);
            document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) hide(); });
            document.body.appendChild(panel);
        };

        const show = () => { if (!panel) build(); panel.hidden = false; };
        const hide = () => { if (panel) panel.hidden = true; };
        const toggle = () => (panel && !panel.hidden ? hide() : show());
        window.CrtKnobs = { toggle, hide };
        return { toggle, hide };
    })();

    /* ---- violet: dust, ash & roaming shadows ------------------------------------------------------------------ */

    const Dirt = (() => {
        const canvas = $("#dirt");
        if (!canvas || reduced) return { sync() {} };
        const c2 = canvas.getContext("2d");
        let raf = null, W = 0, H = 0, parts = [], blobs = [], last = 0;

        const seed = () => {
            parts = Array.from({ length: 70 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.18, vy: 0.05 + Math.random() * 0.22,
                s: 0.6 + Math.random() * 1.7, a: 0.05 + Math.random() * 0.14,
                ph: Math.random() * Math.PI * 2,
            }));
            blobs = Array.from({ length: 4 }, (_, i) => ({
                ox: Math.random() * W, oy: Math.random() * H,
                r: 180 + Math.random() * 240, ph: i * 1.7,
                ax: 60 + Math.random() * 120, ay: 40 + Math.random() * 90,
            }));
        };
        const size = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; seed(); };

        const frame = (now) => {
            raf = requestAnimationFrame(frame);
            if (document.hidden || now - last < 33) return;
            last = now;
            c2.clearRect(0, 0, W, H);
            // roaming occlusion shadows
            for (const b of blobs) {
                const x = b.ox + Math.sin(now * 0.00007 + b.ph) * b.ax;
                const y = b.oy + Math.cos(now * 0.00009 + b.ph * 1.3) * b.ay;
                const g = c2.createRadialGradient(x, y, 0, x, y, b.r);
                g.addColorStop(0, `rgba(0,0,0,${0.22 + dread * 0.18})`);
                g.addColorStop(1, "rgba(0,0,0,0)");
                c2.fillStyle = g;
                c2.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
            }
            // drifting ash
            const rCh = Math.round(150 + dread * 105), gb = Math.round(140 - dread * 90);
            for (const p of parts) {
                p.x += p.vx + Math.sin(now * 0.0006 + p.ph) * 0.12;
                p.y += p.vy;
                if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
                if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
                const tw = 0.7 + 0.3 * Math.sin(now * 0.003 + p.ph * 3);
                c2.fillStyle = `rgba(${rCh},${gb},${Math.round(gb * 1.15)},${(p.a * tw).toFixed(3)})`;
                c2.fillRect(p.x, p.y, p.s, p.s);
            }
        };

        const sync = () => {
            const want = root.dataset.theme === "violet";
            if (want && !raf) { size(); raf = requestAnimationFrame(frame); }
            else if (!want && raf) { cancelAnimationFrame(raf); raf = null; c2.clearRect(0, 0, W, H); }
        };
        addEventListener("resize", () => { if (raf) size(); });
        sync();
        return { sync };
    })();

    /* ---- sound: generative sequencer + UI blips ----------------------------------------------------------- */

    const Sound = (() => {
        const btn = $("#sndBtn");
        let ctx = null, master, delay, fbGain, drone = [], droneGain, droneFilter, lfo, lfoGain, seqTimer = null, step = 0, noteIdx = 3;
        let on = false;

        const SCALES = {
            green: [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33],
            cyan: [220, 246.94, 293.66, 329.63, 369.99, 440, 493.88],
            amber: [196, 220, 246.94, 293.66, 329.63, 392, 440],
            violet: [110, 116.54, 130.81, 138.59, 155.56, 164.81, 220, 233.08],
        };
        const WAVES = { green: "triangle", cyan: "sine", amber: "square", violet: "sawtooth" };
        const TEMPO = { green: 280, cyan: 300, amber: 250, violet: 380 };
        const theme = () => root.dataset.theme || "green";

        const start = () => {
            if (ctx) { ctx.resume(); on = true; update(); startSeq(); return; }
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            master = ctx.createGain(); master.gain.value = 0.14; master.connect(ctx.destination);
            delay = ctx.createDelay(1); delay.delayTime.value = 0.27;
            fbGain = ctx.createGain(); fbGain.gain.value = 0.36;
            delay.connect(fbGain); fbGain.connect(delay); delay.connect(master);

            droneFilter = ctx.createBiquadFilter(); droneFilter.type = "lowpass";
            droneFilter.frequency.value = 160; droneFilter.Q.value = 7;
            droneGain = ctx.createGain(); droneGain.gain.value = 0.045;
            droneFilter.connect(droneGain); droneGain.connect(master);
            [55, 55.6].forEach((f) => {
                const o = ctx.createOscillator();
                o.type = "sawtooth"; o.frequency.value = f;
                o.connect(droneFilter); o.start();
                drone.push(o);
            });
            lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
            lfoGain = ctx.createGain(); lfoGain.gain.value = 60;
            lfo.connect(lfoGain); lfoGain.connect(droneFilter.frequency); lfo.start();

            on = true; update(); retune(); startSeq();
        };

        const stop = () => {
            on = false; update(); stopSeq();
            if (ctx) ctx.suspend();
        };

        const startSeq = () => {
            stopSeq();
            seqTimer = setInterval(() => {
                if (document.hidden) return;
                const sc = SCALES[theme()];
                step++;
                const roll = Math.random();
                if ((step % 2 === 0 && roll < 0.5) || roll < 0.12) {
                    noteIdx = Math.max(0, Math.min(sc.length - 1, noteIdx + [(-2), -1, -1, 1, 1, 2, 3][(Math.random() * 7) | 0]));
                    let f = sc[noteIdx] * (Math.random() < 0.18 ? 2 : 1);
                    if (theme() === "violet") f *= 1 + dread * 0.012 * (Math.random() - 0.5); // detune with depth
                    pluck(f, 0.5, 0.05 + Math.random() * 0.03);
                }
                if (theme() === "violet" && Math.random() < 0.05 + dread * 0.1) {
                    pluck(SCALES.violet[1] / 2, 1.2, 0.06, "sawtooth"); // dissonant low stab
                }
            }, TEMPO[theme()]);
        };
        const stopSeq = () => { if (seqTimer) clearInterval(seqTimer), (seqTimer = null); };

        const pluck = (freq, dur, vol, wave) => {
            if (!ctx || !on) return;
            const o = ctx.createOscillator();
            o.type = wave || WAVES[theme()];
            o.frequency.value = freq;
            const g = ctx.createGain();
            const t = ctx.currentTime;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(master); g.connect(delay);
            o.start(t); o.stop(t + dur + 0.05);
        };

        let lastBlip = 0;
        const blip = (freq, dur = 0.05, vol = 0.04) => {
            const now = performance.now();
            if (now - lastBlip < 70) return;
            lastBlip = now;
            pluck(freq, dur, vol, theme() === "amber" ? "square" : "sine");
        };

        const burst = () => {
            if (!ctx || !on) return;
            const len = ctx.sampleRate * 0.18;
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.8;
            const g = ctx.createGain(); g.gain.value = 0.16;
            src.connect(bp); bp.connect(g); g.connect(master);
            src.start();
        };

        const retune = () => {
            if (!ctx || !on) return;
            const t = theme();
            const base = { green: [55, 55.6], cyan: [55, 55.4], amber: [50, 100.3], violet: [49, 49.45] }[t];
            drone.forEach((o, i) => o.frequency.setTargetAtTime(base[i], ctx.currentTime, 1.2));
            droneFilter.frequency.setTargetAtTime(t === "violet" ? 110 : t === "amber" ? 210 : 160, ctx.currentTime, 1);
            startSeq();
        };

        const update = () => {
            if (!btn) return;
            btn.textContent = on ? "SND:ON" : "SND:OFF";
            btn.classList.toggle("on", on);
            try { localStorage.setItem("snd", on ? "1" : "0"); } catch {}
        };

        const toggle = () => (on ? stop() : start());
        if (btn) btn.addEventListener("click", toggle);

        // sound pref remembered -> arm on first gesture (autoplay policy)
        let wantsSound = false;
        try { wantsSound = params.get("snd") === "1" || localStorage.getItem("snd") === "1"; } catch {}
        if (wantsSound) {
            const arm = () => { start(); document.removeEventListener("pointerdown", arm); document.removeEventListener("keydown", arm); };
            document.addEventListener("pointerdown", arm, { once: true });
            document.addEventListener("keydown", arm, { once: true });
        }

        return { blip, burst, toggle, retune, get on() { return on; } };
    })();

    // UI hover blips
    if (finePointer) {
        document.addEventListener("pointerenter", (e) => {
            const t = e.target;
            if (t instanceof Element && t.closest("a, button, .stack li")) Sound.blip(1300 + Math.random() * 500, 0.04, 0.022);
        }, true);
    }
    document.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) Sound.blip(620, 0.08, 0.04);
    });

    /* ---- glitches: legacy easter egg + violet tears ------------------------------------------------------------ */

    const legacyFlash = $("#legacyFlash");
    const glitch = () => {
        root.classList.add("glitch");
        buzz([8, 40, 8]);
        Sound.burst();
        setTimeout(() => root.classList.remove("glitch"), 260);
    };
    const legacy = () => {
        legacyFlash.classList.add("on");
        glitch();
        setTimeout(() => legacyFlash.classList.remove("on"), 350);
    };

    let lastTrigger = -1;
    document.addEventListener("scroll", () => {
        applyDread();
        const consultancyHourCostInUSD = 119;
        const y = Math.round(scrollY);
        if (y > 0 && y % consultancyHourCostInUSD === 0 && y !== lastTrigger) {
            lastTrigger = y;
            glitch();
        }
    }, { passive: true });
    applyDread();

    if (!reduced) {
        const mainEl = $("main");
        const tearLoop = () => {
            const wait = 2200 + Math.random() * 5500;
            setTimeout(() => {
                if (root.dataset.theme === "violet" && !document.hidden) {
                    mainEl.classList.add("tear");
                    if (Math.random() < 0.5) Sound.burst();
                    buzz(8);
                    setTimeout(() => mainEl.classList.remove("tear"), 180);
                }
                tearLoop();
            }, wait);
        };
        tearLoop();
    }

    /* ---- command palette ----------------------------------------------------------------------- */

    const palette = $("#palette");
    const input = $("#paletteInput");
    const list = $("#paletteList");

    const goto = (id) => () => $(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    const open = (url) => () => window.open(url, "_blank", "noopener");

    const COMMANDS = [
        { k: "goto subject", d: "01 — subject file", run: goto("#subject") },
        { k: "goto telemetry", d: "02 — career telemetry", run: goto("#telemetry") },
        { k: "goto operations", d: "03 — current operations", run: goto("#operations") },
        { k: "goto stack", d: "04 — stack signal", run: goto("#stack") },
        { k: "goto contact", d: "05 — establish contact", run: goto("#contact") },
        { k: "goto apps", d: "06 — browse works", run: () => (location.href = "apps/") },
        { k: "open sequencer", d: "SEQ-86 synth lab", run: () => (location.href = "apps/sequencer/") },
        { k: "open github", d: "dossier ↗", run: open("https://github.com/zdanowiczkonrad") },
        { k: "open linkedin", d: "dossier ↗", run: open("https://www.linkedin.com/in/zdanowiczkonrad/") },
        { k: "mail konrad", d: "send transmission", run: () => (location.href = "mailto:konrad@zdanowicz.dev") },
        { k: "theme green", d: "phosphor", run: () => setTheme("green") },
        { k: "theme amber", d: "cathode-ray tube", run: () => setTheme("amber") },
        { k: "crt knobs", d: "tube control — jitter / static / interference", run: () => { if (root.dataset.theme !== "amber") setTheme("amber"); CrtKnobs.toggle(); } },
        { k: "theme cyan", d: "ops blue", run: () => setTheme("cyan") },
        { k: "theme violet", d: "do not scroll too deep", run: () => setTheme("violet") },
        { k: "font sharp", d: "Space Grotesk display", run: () => setFont("sharp") },
        { k: "font brutal", d: "Martian Mono display", run: () => setFont("brutal") },
        { k: "font mono", d: "JetBrains Mono everywhere", run: () => setFont("mono") },
        { k: "sound toggle", d: "generative sequencer on/off", run: () => Sound.toggle() },
        { k: "neural lab", d: "NN-31 — engine, tests, live training", run: () => (location.href = "apps/neural/") },
        { k: "neural toggle", d: "show/hide the visitor model", run: () => window.Mind && window.Mind.toggle() },
        { k: "chat", d: "KZ·MIND — on-device language model", run: () => window.Chat && window.Chat.open() },
        { k: "linux", d: "VM-86 — boot linux 6.8 in your tab", run: () => (location.href = "apps/linux/") },
        { k: "ghost toggle", d: "the cursor that predicts your cursor", run: () => window.Ghost && window.Ghost.toggle() },
        { k: "legacy", d: "flash the 2019 site palette", run: legacy },
        { k: "whoami", d: "you know who you are", run: goto("#subject") },
    ];

    let filtered = COMMANDS;
    let sel = 0;

    const render = () => {
        list.innerHTML = "";
        filtered.forEach((c, i) => {
            const li = document.createElement("li");
            li.role = "option";
            li.className = i === sel ? "sel" : "";
            li.innerHTML = `<span>${c.k}</span><span class="d">${c.d}</span>`;
            li.addEventListener("click", () => exec(c));
            li.addEventListener("mousemove", () => { if (sel !== i) { sel = i; render(); } });
            list.appendChild(li);
        });
    };

    const filter = () => {
        const q = input.value.trim().toLowerCase();
        filtered = q ? COMMANDS.filter((c) => (c.k + " " + c.d).toLowerCase().includes(q)) : COMMANDS;
        sel = 0;
        render();
    };

    /* body scroll lock: keeps iOS Safari from scrolling/jumping the page while the
       palette is open (focusing the input otherwise scrolls it into view) */
    let lockedY = 0;
    const lockScroll = () => {
        lockedY = scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = -lockedY + "px";
        document.body.style.left = "0";
        document.body.style.right = "0";
    };
    const unlockScroll = () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";       // bypass css smooth-scroll for the restore
        scrollTo(0, lockedY);
        root.style.scrollBehavior = prev;
    };

    const openPalette = () => {
        if (!palette.hidden) return;
        lockScroll();
        palette.hidden = false;
        input.value = "";
        filter();
        input.focus();
        buzz(5);
        Sound.blip(1760, .06, .035);
    };
    const closePalette = () => {
        if (palette.hidden) return;
        palette.hidden = true;
        input.blur();
        unlockScroll();
    };
    const exec = (c) => { closePalette(); buzz(8); Sound.blip(880, .1, .05); c.run(); };

    $("#paletteBtn").addEventListener("click", openPalette);
    const btnM = $("#paletteBtnM");
    if (btnM) btnM.addEventListener("click", openPalette);
    palette.addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closePalette(); });

    input.addEventListener("input", filter);

    document.addEventListener("keydown", (e) => {
        const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            palette.hidden ? openPalette() : closePalette();
            return;
        }
        if (palette.hidden) {
            if (!typing && (e.key === ":" || e.key === "/")) { e.preventDefault(); openPalette(); }
            return;
        }
        if (e.key === "Escape") { closePalette(); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); render(); }
        if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
        if (e.key === "Enter" && filtered[sel]) { e.preventDefault(); exec(filtered[sel]); }
    });

    /* ---- console signature ------------------------------------------------------------------------ */

    console.log(
        "%c ZDANOWICZ.DEV %c uplink established — ⌘K on the page, `theme violet` if you dare, or just write: konrad@zdanowicz.dev ",
        "background:#3df58c;color:#050807;font-weight:bold;padding:4px 8px;",
        "background:#0a0f0d;color:#3df58c;padding:4px 8px;"
    );
})();
