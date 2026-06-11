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
        Sound.retune();
        CrtGL.sync();
        Dirt.sync();
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

    const clock = $("#clock");
    const tickClock = () => {
        if (clock) clock.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
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
    const signalSvg = $("#signalSvg");

    const buildSignal = () => {
        if (!signalSvg) return;
        const W = Math.max(320, signalSvg.clientWidth || 800);
        const H = 170;
        const m = 36, top = 24, bottom = H - 36;
        const X = (yr) => m + (yr - 2009) / (2026 - 2009) * (W - 2 * m);
        const Y = (p) => bottom - p * (bottom - top);

        let dPath = "";
        SIGNAL_MILESTONES.forEach(([yr, p], i) => {
            const x = X(yr), y = Y(p);
            if (i === 0) { dPath = `M${x},${y}`; return; }
            const py = Y(SIGNAL_MILESTONES[i - 1][1]);
            dPath += ` L${x},${py} L${x},${y}`;
        });
        dPath += ` L${W - m + 14},${Y(1)}`;

        const axes = [bottom, (top + bottom) / 2, top].map((y, i) =>
            `<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="axis${i ? " faint" : ""}"/>`).join("");
        const nodes = SIGNAL_MILESTONES.map(([yr, p], i) => {
            const last = i === SIGNAL_MILESTONES.length - 1;
            return `<circle cx="${X(yr)}" cy="${Y(p)}" r="${last ? 5 : 4}"${last ? ' class="live"' : ""}/>`;
        }).join("");
        const ticks = SIGNAL_MILESTONES.map(([yr]) =>
            `<text x="${X(yr)}" y="${H - 10}">${yr === 2026 ? "NOW" : yr}</text>`).join("");

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
        $$(".btn, .op, .signal-panel, .contact-panel, .palette-box, .avatar").forEach((el) => {
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

    /* ---- face map ---------------------------------------------------------------------------------- */

    (() => {
        const fm = $("#facemap");
        const frame = $("#avatarFrame");
        const readout = $("#faceReadout");
        if (!fm || !frame) return;

        // landmark mesh tuned to assets/avatar-hd.jpg (viewBox 0..100)
        const RING = [[50, 12], [60, 14], [68, 20], [71, 32], [69, 46], [66, 58], [60, 70], [53, 80],
                      [50, 84], [47, 80], [40, 70], [34, 58], [31, 46], [29, 32], [32, 20], [40, 14]];
        const BRL = [[35, 40], [40, 38], [45, 40]];
        const BRR = [[55, 40], [60, 38], [65, 40]];
        const EYL = [[38, 45], [41, 43.6], [44, 45], [41, 46.4]];
        const EYR = [[56, 45], [59, 43.6], [62, 45], [59, 46.4]];
        const NOSE = [[50, 47], [47.5, 57], [52.5, 57], [50, 60]];
        const MOUTH = [[42, 68], [46, 66.6], [50, 67.2], [54, 66.6], [58, 68], [50, 70.6]];
        const EXTRA = [[36, 55], [64, 55], [50, 77]]; // cheekL 40, cheekR 41, chin 42
        const BASE = [...RING, ...BRL, ...BRR, ...EYL, ...EYR, ...NOSE, ...MOUTH, ...EXTRA];

        const E = [];
        for (let i = 0; i < 16; i++) E.push([i, (i + 1) % 16]);           // face oval
        E.push([16, 17], [17, 18], [19, 20], [20, 21]);                   // brows
        E.push([22, 23], [23, 24], [24, 25], [25, 22]);                   // eye L
        E.push([26, 27], [27, 28], [28, 29], [29, 26]);                   // eye R
        E.push([30, 31], [30, 32], [31, 33], [32, 33]);                   // nose
        E.push([34, 35], [35, 36], [36, 37], [37, 38], [34, 39], [39, 38]); // mouth
        E.push([13, 16], [3, 21]);                                         // temples -> brows
        E.push([16, 22], [18, 24], [19, 26], [21, 28]);                    // brows -> eyes
        E.push([24, 30], [26, 30]);                                        // eyes -> bridge
        E.push([33, 36], [31, 34], [32, 38]);                              // nose -> mouth
        E.push([40, 22], [40, 12], [40, 11], [40, 34]);                    // cheek L web
        E.push([41, 28], [41, 4], [41, 5], [41, 38]);                      // cheek R web
        E.push([42, 39], [42, 7], [42, 9]);                                // chin web

        fm.innerHTML =
            `<path class="fm-box" d="M24,8 H78 V94 H24 Z"/>` +
            `<line class="fm-scan" id="fmScan" x1="24" x2="78" y1="8" y2="8"/>` +
            `<g id="fmMesh">` +
            E.map(() => "<line/>").join("") +
            BASE.map(() => `<circle r=".8"/>`).join("") +
            `</g>`;

        const mesh = $("#fmMesh", fm);
        const scan = $("#fmScan", fm);
        const lineEls = $$("line", mesh);
        const dotEls = $$("circle", mesh);
        let nx = 0, ny = 0, raf = null, lastT = 0;

        const animate = (t) => {
            raf = requestAnimationFrame(animate);
            if (t - lastT < 33) return;
            lastT = t;
            // heartbeat scale around face center + per-vertex breathing drift
            const beat = 1 + 0.014 * Math.pow(Math.max(0, Math.sin(t * 0.0052)), 6);
            const sacc = Math.floor(t / 1700) % 3 === 0 ? Math.sin(t * 0.02) * 0.5 : 0; // eye micro-saccades
            const pts = BASE.map(([x, y], i) => {
                let px = x + Math.sin(t * 0.0021 + i * 1.93) * 0.5 + nx * 2.4;
                let py = y + Math.cos(t * 0.0017 + i * 2.41) * 0.45 + ny * 2;
                if (i >= 22 && i <= 29) px += sacc;
                return [(px - 50) * beat + 50, (py - 50) * beat + 50];
            });
            E.forEach(([a, b], i) => {
                const el = lineEls[i];
                el.setAttribute("x1", pts[a][0].toFixed(2)); el.setAttribute("y1", pts[a][1].toFixed(2));
                el.setAttribute("x2", pts[b][0].toFixed(2)); el.setAttribute("y2", pts[b][1].toFixed(2));
            });
            dotEls.forEach((el, i) => {
                el.setAttribute("cx", pts[i][0].toFixed(2));
                el.setAttribute("cy", pts[i][1].toFixed(2));
            });
            const sy = 8 + ((Math.sin(t * 0.0011) + 1) / 2) * 86;
            scan.setAttribute("y1", sy.toFixed(1));
            scan.setAttribute("y2", sy.toFixed(1));
            scan.setAttribute("opacity", (0.35 + 0.3 * Math.abs(Math.sin(t * 0.009))).toFixed(2));
        };

        frame.addEventListener("pointermove", (e) => {
            const r = frame.getBoundingClientRect();
            nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
            ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
            if (readout) readout.textContent =
                `FACE MAP v3.0 · LOCK ${(96.8 + Math.abs(nx) + Math.abs(ny)).toFixed(1)}% · PULSE 64`;
        });
        frame.addEventListener("pointerenter", () => {
            Sound.blip(1800, .05, .03);
            if (!reduced && !raf) raf = requestAnimationFrame(animate);
        });
        frame.addEventListener("pointerleave", () => {
            nx = ny = 0;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            if (readout) readout.textContent = "FACE MAP v3.0 · IDLE";
        });
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
        if (!eligible) return { sync() {} };

        const BARREL = 0.24;
        let gl = null, U = {}, tex = null, mapTex = null, texW = 0, texH = 0, texScale = 1;
        let raf = null, active = false, capturing = false, failed = false;
        let dpr = 1, t0 = performance.now();
        let vel = 0, lastSc = 0, glitchV = 0, tearV = 0;
        let bgCol = [0.024, 0.02, 0.012];
        let hovEl = null, hovRect = [0, 0, 0, 0], hovA = 0, patchBusy = false, patchQueue = [];
        let frameN = 0, recapT = null;

        const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
        const FS = `
precision mediump float;
uniform sampler2D tex;   /* page snapshot, transparent background */
uniform sampler2D map;   /* live world-map canvas, screen space */
uniform vec2 r;          /* canvas device px */
uniform vec2 ts;         /* snapshot texture px */
uniform vec3 bg;
uniform vec4 hov;        /* hover rect, page device px (x, y, w, h) */
uniform float t, ready, scroll, m, glitch, tearY, vel, hovA, grid;
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

    /* cheap phosphor bloom */
    vec4 b1 = texture2D(tex, tc + vec2(0.0, 2.2 * m / ts.y));
    vec4 b2 = texture2D(tex, tc - vec2(2.2 * m / ts.x, 0.0));
    col += (b1.rgb * b1.a + b2.rgb * b2.a) * 0.08 * inPage;

    /* glass: scanlines & grille fixed to the screen, grain, vignette, flicker */
    float sl = 0.80 + 0.20 * sin(d.y * r.y * 2.094);
    float grille = 0.95 + 0.05 * sin(d.x * r.x * 1.571);
    float grain = 0.94 + 0.06 * hash(floor(uv * r / 1.5) + vec2(floor(t * 24.0)));
    float vig = 1.0 - r2 * 0.75;
    float fl = 0.985 + 0.012 * sin(t * 11.0) + 0.003 * sin(t * 73.0) - band * 0.25;
    col *= sl * grille * grain * vig * fl;

    /* amber phosphor cast + idle glow */
    col = mix(col, vec3(col.g * 1.25, col.g * 0.85, col.g * 0.25), 0.22);
    col += vec3(1.0, 0.69, 0.1) * 0.012 * vig;

    if (ready < 0.5) col = vec3(1.0, 0.72, 0.2) * hash(floor(uv * r / 2.0) + vec2(floor(t * 30.0))) * 0.22;
    gl_FragColor = vec4(col * bezel, 0.55);  /* alpha + preserved buffer = phosphor persistence */
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
            ["tex", "map", "r", "ts", "bg", "hov", "t", "ready", "scroll", "m", "glitch", "tearY", "vel", "hovA", "grid"]
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

        const SKIP = ["statusbar", "bottombar", "palette", "boot", "crosshair", "legacy-flash", "fx-crt", "fx-noise", "fx-dread", "grid-bg", "fx-aurora"];
        const skipEl = (el) => el.id === "crtGL" || el.id === "worldMap" || el.id === "dirt" ||
            SKIP.some((c) => el.classList && el.classList.contains(c));

        const capture = async () => {
            root.classList.add("crt-cap");
            $$(".reveal:not(.in)").forEach(onReveal);
            settleScrambles();
            await new Promise((r) => setTimeout(r, 120));
            try {
                const pageH = root.scrollHeight;
                const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                texScale = Math.min(dpr, (maxTex - 8) / pageH, (maxTex - 8) / innerWidth, 2);
                const snap = await html2canvas(document.body, {
                    backgroundColor: null,            /* transparent: bg+grid+map live in the shader */
                    scale: texScale,
                    logging: false,
                    useCORS: true,
                    ignoreElements: skipEl,
                });
                texW = snap.width; texH = snap.height;
                if (tex) gl.deleteTexture(tex);
                tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snap);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            } finally {
                root.classList.remove("crt-cap");
            }
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
        return { sync };
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
        { k: "theme cyan", d: "ops blue", run: () => setTheme("cyan") },
        { k: "theme violet", d: "do not scroll too deep", run: () => setTheme("violet") },
        { k: "font sharp", d: "Space Grotesk display", run: () => setFont("sharp") },
        { k: "font brutal", d: "Martian Mono display", run: () => setFont("brutal") },
        { k: "font mono", d: "JetBrains Mono everywhere", run: () => setFont("mono") },
        { k: "sound toggle", d: "generative sequencer on/off", run: () => Sound.toggle() },
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

    const openPalette = () => {
        palette.hidden = false;
        input.value = "";
        filter();
        input.focus();
        buzz(5);
        Sound.blip(1760, .06, .035);
    };
    const closePalette = () => { palette.hidden = true; input.blur(); };
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
