/*
    chat.js — KZ·MIND, an on-device language stack. zdanowicz.dev
    Three nets, all running on nn.js in this tab:
      INTENT  [192,24,N]   — hashed char-trigrams -> intent, trained at boot (<1s),
                             grounds every answer in curated dossier facts.
      CORTEX  [12·40,144,40] — a character-level language model trained IN YOUR
                             BROWSER on the dossier corpus (~50k steps, chunked,
                             persisted). It generates the dim "dream" lines.
      (the NEXT/ARCH nets in neural.js keep watching you while you type.)
    No server. No tokens leave the machine. View source.
*/
(() => {
    "use strict";
    if (!window.NN) return;

    const $ = (s, c = document) => c.querySelector(s);
    const root = document.documentElement;

    /* ---- corpus ----------------------------------------------------------- */

    const CORPUS = (`
konrad zdanowicz is vp of engineering at ingrid. ingrid builds the delivery experience platform powering checkout and logistics for world e-commerce.
konrad has been shipping production software for seventeen years. he is based in wroclaw, poland.
before ingrid, konrad was director of engineering for europe at bolt, the one-click checkout company. he led the european engineering division through hypergrowth and owned payments and integrations.
before bolt, konrad was head of engineering at tipser. tipser built embedded commerce, buyable products inside any publisher page. he grew from senior engineer to leading all engineering across wroclaw and stockholm.
konrad holds an m.sc. in internet engineering from wroclaw university of science and technology.
konrad builds engineering organizations and planet-scale systems. he scales teams, performance, and ai inference.
konrad is terminally fond of clis, music, and design. this page ships zero frameworks and one easter egg.
konrad works with scala and the jvm, typescript, node and react. his daily drivers are clis, mcp and tooling.
konrad leads engineering for fintech, e-commerce and ai. he puts agentic tooling and llm systems where they earn their keep, in developer workflow, inference, and the unglamorous middle of the stack.
to reach konrad, send a transmission to konrad at zdanowicz dot dev. response window is one or two days, timezone europe warsaw.
the neural engine on this site is a real multilayer perceptron in plain javascript, flat typed arrays, fused backprop, adam. it trains in your browser and it remembers you.
ingrid is the delivery experience platform. konrad scales ingrid engineering, talent, architecture and the agentic operating system.
konrad zdanowicz, vp engineering at ingrid, builds engineering teams in wroclaw. seventeen years in production, through tipser, bolt and now ingrid.
the stack signal is strong: engineering orgs, fintech checkout, ai and llm systems, scala jvm, typescript node react, cli mcp tooling.
careers are not ladders, they are signals. from field work to head of engineering to director to vp, the trajectory is a polynomial fit.
`).replace(/\s+/g, " ").trim() + " ";

    const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789 .,-";
    const V = CHARS.length;
    const CIDX = {};
    [...CHARS].forEach((c, i) => (CIDX[c] = i));
    const TEXT = [...CORPUS.toLowerCase()].map((c) => (CIDX[c] !== undefined ? c : " ")).join("");
    const CTX = 12, HID = 144, LM_EPOCHS = 30;
    const LM_VER = 2 * 1000000 + TEXT.length;          // invalidates stored cortex on corpus change

    /* ---- intents ------------------------------------------------------------ */

    const INTENTS = [
        ["greeting", ["hello", "hi", "hey there", "yo", "good morning", "good evening", "hej", "czesc"],
            ["channel open. ask about the operator — role, career, stack, contact.",
             "uplink acknowledged. i hold the dossier on konrad zdanowicz. query me."]],
        ["whoami", ["who are you", "what are you", "what is this", "are you an ai", "are you chatgpt", "what model is this"],
            ["i am KZ·MIND — three small neural nets running entirely in your tab. the language cortex was trained in your browser by the same engine that powers the background. no server, no api, no tokens leave this machine.",
             "a fully on-device language stack: an intent net grounds the facts, a character-level cortex dreams the rest. view source — it is all there."]],
        ["konrad", ["who is konrad", "tell me about konrad", "about the owner", "who owns this site", "tell me about yourself", "describe konrad"],
            ["KONRAD ZDANOWICZ — vp engineering at ingrid. seventeen years shipping production software. builds engineering organizations and planet-scale systems across fintech, e-commerce and ai. based in wrocław.",
             "subject: konrad zdanowicz. clearance: public. role: vp engineering, ingrid. signal: eng leadership · fintech · e-commerce · ai. terminally fond of clis, music, design."]],
        ["role", ["what do you do", "what is your job", "current role", "what is his role", "what does he do at work"],
            ["vp engineering at ingrid — the delivery experience platform powering checkout and logistics for world e-commerce. scaling talent, architecture and the agentic operating system."]],
        ["career", ["work experience", "career history", "where did he work before", "tell me about bolt", "tell me about tipser", "past jobs", "cv", "resume"],
            ["telemetry: 2009-2016 field work, full-stack on the jvm. 2016-2020 tipser, head of engineering — embedded commerce across wrocław and stockholm. 2020-2022 bolt, director of engineering europe through hypergrowth. 2022-now ingrid, vp engineering.",
             "the trajectory is a quartic fit: field work → tipser (head of eng) → bolt (director, europe) → ingrid (vp engineering). scroll to 02·TELEMETRY for the curve and its equation."]],
        ["ingrid", ["what is ingrid", "where does he work", "tell me about ingrid", "ingrid platform"],
            ["ingrid is the delivery experience platform — checkout and logistics infrastructure for world e-commerce. konrad leads its engineering."]],
        ["stack", ["what technologies", "tech stack", "what is your tech stack", "the stack", "programming languages", "scala", "typescript", "what does he code in", "skills", "what tools does he use", "languages and frameworks"],
            ["stack signal: engineering orgs (primary) · fintech/checkout · ai/llm systems · scala/jvm · typescript/node/react · cli/mcp/tooling (daily driver). full bars at 04·STACK."]],
        ["ai", ["does he work with ai", "llm experience", "machine learning", "agents", "ai in production", "mcp"],
            ["ai where it earns its keep: agentic tooling, llm systems, developer workflow, inference — the unglamorous middle of the stack. also: every net on this page is handwritten javascript, including me."]],
        ["contact", ["how can i contact", "email", "hire", "reach out", "get in touch", "i want to talk", "send message", "work with him"],
            ["transmission channel: konrad@zdanowicz.dev — response window 24-48h, timezone europe/warsaw. or take 05·CONTACT.",
             "$ mail konrad@zdanowicz.dev — the channel is open. recruiters, founders and engineers all decode the same address."]],
        ["location", ["where is he based", "location", "wroclaw", "poland", "timezone", "where does he live"],
            ["base of operations: wrocław, poland — 51.11°N 17.03°E. timezone europe/warsaw. the map behind this text knows the rest."]],
        ["site", ["how was this site built", "what framework", "react site", "source code", "who built this page", "how does this page work"],
            ["zero frameworks. hand-rolled html, css and javascript: a webgl crt, a generative sequencer, a world map, and four neural networks — engine, visitor model, ghost cursor, and me. view-source is the second-best feature.",
             "no build step, no dependencies. the neural engine (nn.js) has its own test suite — run it at apps/neural/ or with node nn-tests.js."]],
        ["model", ["how do you work", "what network is this", "how were you trained", "parameters", "is this a real neural network", "how big are you"],
            ["cortex: a character-level lm, context 12, ~70k parameters, trained in this very tab on the dossier corpus. intent net: hashed trigrams → softmax. small, honest, and provably real — the gradient check is in the test suite."]],
        ["predict", ["what will i do next", "predict me", "what do you know about me", "visitor model", "who am i"],
            ["the visitor model is watching: scroll depth, dwell, cursor kinetics. check NEURAL UPLINK (bottom right) for its current read on you — archetype and predicted next move. it trains on every move you make."]],
        ["apps", ["what apps", "projects", "sequencer", "neural lab", "experiments", "side projects"],
            ["field deployments at 06·APPS: NN-31 neural lab (engine + live training), SEQ-86 synth lab, hello-tty. all run in the browser, all dependency-free."]],
        ["egg", ["easter egg", "secret", "hidden", "konami", "surprise"],
            ["the footer says one easter egg. the old consultancy rate is involved. scroll with intent."]],
        ["thanks", ["thanks", "thank you", "cool", "awesome", "nice", "great job", "impressive"],
            ["acknowledged. the cortex glows a little brighter.", "logged. now go press ⌘K and type `theme violet`. do not scroll too deep."]],
        ["bye", ["bye", "goodbye", "see you", "later", "quit", "exit"],
            ["channel stays open. konrad@zdanowicz.dev for the human protocol. over."]],
    ];

    const FALLBACK = [
        "signal unclear. i ground my answers in the dossier — try: role, career, stack, ai, contact, or `/dream` to hear the cortex free-associate.",
        "that query is outside my training distribution. ask about konrad — or type `/help`.",
    ];

    /* explicit out-of-distribution class: random noise + off-topic — softmax
       overconfidence on garbage is otherwise unavoidable at this scale */
    {
        const nr = NN.xorshift(7331);
        const junk = ["what is the weather", "tell me a joke", "what time is it",
            "meaning of life", "recipe for pancakes", "how tall is the eiffel tower",
            "who won the game", "translate this to french", "write me a poem about cats"];
        for (let i = 0; i < 22; i++) {
            let s = "";
            const len = 8 + (nr() * 16) | 0;
            for (let k = 0; k < len; k++) s += "abcdefghijklmnopqrstuvwxyz  "[(nr() * 28) | 0];
            junk.push(s);
        }
        INTENTS.push(["fallback", junk, FALLBACK]);
    }

    /* ---- intent net: hashed char trigrams -> softmax ------------------------- */

    const HDIM = 192;
    const hashFeat = (s) => {
        const f = new Float32Array(HDIM);
        const t = " " + s.toLowerCase().replace(/[^a-z0-9 ]/g, "") + " ";
        for (let i = 0; i < t.length - 2; i++) {
            const h = (t.charCodeAt(i) * 31 + t.charCodeAt(i + 1)) * 31 + t.charCodeAt(i + 2);
            f[h % HDIM] += 1;
        }
        let n = 0;
        for (let i = 0; i < HDIM; i++) n += f[i] * f[i];
        n = Math.sqrt(n) || 1;
        for (let i = 0; i < HDIM; i++) f[i] /= n;
        return f;
    };

    const intentNet = new NN.Net([HDIM, 24, INTENTS.length], { out: "softmax", lr: 0.03, seed: 41 });
    {
        const X = [], Y = [];
        INTENTS.forEach(([, utts], c) => utts.forEach((u) => {
            X.push(hashFeat(u));
            const y = new Float32Array(INTENTS.length); y[c] = 1;
            Y.push(y);
        }));
        intentNet.trainSet(X, Y, 60);
    }
    const classify = (s) => {
        const p = intentNet.forward(hashFeat(s));
        let b = 0;
        for (let j = 1; j < p.length; j++) if (p[j] > p[b]) b = j;
        return { intent: INTENTS[b][0], answers: INTENTS[b][2], conf: p[b] };
    };

    /* ---- cortex: char-level LM, trained in-browser, persisted ----------------- */

    const rand = NN.xorshift((Math.random() * 1e9) | 0);
    let lm = null, lmProgress = 0, lmTraining = false;

    try {
        const saved = JSON.parse(localStorage.getItem("nn.lm") || "null");
        if (saved && saved.ver === LM_VER) {
            lm = NN.Net.deserialize(saved.net);
            lmProgress = 1;
        }
    } catch {}

    const lmX = new Float32Array(CTX * V);
    const lmY = new Float32Array(V);
    const N_WIN = TEXT.length - CTX - 1;

    const trainCortex = (onTick) => {
        if (lm || lmTraining) return;
        lmTraining = true;
        const net = new NN.Net([CTX * V, HID, V], { out: "softmax", lr: 0.008, seed: 7, l2: 1e-6 });
        const total = LM_EPOCHS * N_WIN;
        let done = 0, epoch = 0, inEpoch = 0;
        const slice = () => {
            const t0 = performance.now();
            while (performance.now() - t0 < 14) {           /* ~14ms work, 24ms rest */
                for (let k = 0; k < 24; k++) {
                    const pos = (rand() * N_WIN) | 0;
                    lmX.fill(0);
                    for (let i = 0; i < CTX; i++) lmX[i * V + CIDX[TEXT[pos + i]]] = 1;
                    lmY.fill(0); lmY[CIDX[TEXT[pos + CTX]]] = 1;
                    net.train(lmX, lmY);
                }
                done += 24; inEpoch += 24;
                if (inEpoch >= N_WIN) { inEpoch = 0; if (++epoch >= 10) net.lr *= 0.88; }
                if (done >= total) break;
            }
            lmProgress = Math.min(1, done / total);
            onTick && onTick(lmProgress);
            if (done < total) setTimeout(slice, 24);
            else {
                lm = net;
                lmTraining = false;
                try { localStorage.setItem("nn.lm", JSON.stringify({ ver: LM_VER, net: JSON.parse(net.serialize()) })); } catch {}
                onTick && onTick(1);
            }
        };
        slice();
    };

    /* dream: seed from a verbatim corpus window, top-2 decode, repetition guard */
    const dream = () => {
        if (!lm) return null;
        const starts = [];
        for (let i = 1; i < TEXT.length - CTX; i++) {
            if ((TEXT[i - 1] === "." || TEXT[i - 1] === ",") && TEXT[i] === " ") starts.push(i + 1);
        }
        const s0 = starts[(rand() * starts.length) | 0] || 0;
        let win = TEXT.slice(s0, s0 + CTX), out = win;
        for (let i = 0; i < 220; i++) {
            lmX.fill(0);
            for (let k = 0; k < CTX; k++) lmX[k * V + (CIDX[win[k]] !== undefined ? CIDX[win[k]] : 36)] = 1;
            const p = lm.forward(lmX);
            let b1 = 0, b2 = 1;
            for (let j = 1; j < V; j++) if (p[j] > p[b1]) { b2 = b1; b1 = j; }
            const c = (p[b2] / p[b1] > 0.35 && rand() < 0.22) ? b2 : b1;
            out += CHARS[c];
            win = win.slice(1) + CHARS[c];
            if (out.length > 40 && out.slice(-14) !== out.slice(-14).replace(/(.{7,})\1/, "•")) break; // loop guard
            if (CHARS[c] === "." && out.length > 60) break;
        }
        out = out.replace(/(.{7,})\1+/g, "$1");            /* collapse any escaped loops */
        const cut = out.lastIndexOf(".");
        return (cut > 40 ? out.slice(0, cut + 1) : out).trim();
    };

    /* ---- chat window ----------------------------------------------------------- */

    const win = document.createElement("div");
    win.className = "chatwin";
    win.id = "chatwin";
    win.hidden = true;
    win.innerHTML =
        `<div class="chat-head"><span>KZ·MIND — ON-DEVICE LM</span>` +
        `<span class="chat-stat" id="chatStat">CORTEX: COLD</span>` +
        `<button class="chat-x" id="chatX" aria-label="Close chat">✕</button></div>` +
        `<div class="chat-log" id="chatLog"></div>` +
        `<form class="chat-form" id="chatForm"><span class="chat-prompt">&gt;</span>` +
        `<input id="chatIn" type="text" autocomplete="off" spellcheck="false" placeholder="ask the dossier — or /help" aria-label="Chat message"></form>`;
    document.body.appendChild(win);

    const log = $("#chatLog", win), input = $("#chatIn", win), stat = $("#chatStat", win);

    const updateStat = () => {
        stat.textContent = lm ? "CORTEX: TRAINED·LOCAL" :
            lmTraining ? `CORTEX: TRAINING ${(lmProgress * 100).toFixed(0)}%` : "CORTEX: COLD";
    };

    const msg = (cls) => {
        const div = document.createElement("div");
        div.className = "chat-msg " + cls;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
        return div;
    };

    let streaming = false;
    const queue = [];
    const stream = (text, cls, then) => {
        const div = msg(cls);
        let i = 0;
        streaming = true;
        const tick = () => {
            div.textContent = text.slice(0, ++i) + (i < text.length ? "▮" : "");
            log.scrollTop = log.scrollHeight;
            if (i < text.length) setTimeout(tick, 13);
            else {
                streaming = false;
                if (then) then();
                /* if `then` started another stream, its completion drains the queue */
                if (!streaming && queue.length) setTimeout(() => respond(queue.shift()), 250);
            }
        };
        tick();
    };

    const respond = (q) => {
        if (q === "/help") {
            stream("grounded queries: role · career · stack · ai · ingrid · contact · location · site · apps. commands: /dream (let the cortex free-associate) · /stats · /reset. everything runs in this tab.", "bot");
            return;
        }
        if (q === "/stats") {
            const m = window.Mind ? window.Mind.state : null;
            stream(`cortex ${lm ? "trained" : lmTraining ? `training ${(lmProgress * 100).toFixed(0)}%` : "cold"} · ` +
                `intent net ${intentNet.steps} steps · ` +
                (m ? `visitor model ${m.steps} steps, loss ${m.loss < 0 ? "—" : m.loss.toFixed(2)} · ` : "") +
                (window.Ghost ? `ghost ${window.Ghost.stats}` : ""), "bot");
            return;
        }
        if (q === "/reset") {
            try { ["nn.lm", "nn.model", "nn.mouse"].forEach((k) => localStorage.removeItem(k)); } catch {}
            stream("all local models wiped. reload to retrain from zero. it knew too much anyway.", "bot");
            return;
        }
        if (q === "/dream") {
            if (!lm) { stream(`cortex still calibrating (${(lmProgress * 100).toFixed(0)}%) — dreams need a trained substrate. ask me something grounded meanwhile.`, "bot"); return; }
            stream(dream(), "bot dream");
            return;
        }
        const { intent, answers, conf } = classify(q);
        if (intent === "fallback" || conf < 0.3) {
            stream(FALLBACK[(rand() * FALLBACK.length) | 0], "bot", () => {
                if (lm && rand() < 0.6) stream("subconscious: " + dream(), "bot dream");
            });
            return;
        }
        stream(answers[(rand() * answers.length) | 0], "bot", () => {
            if (lm && rand() < 0.25) stream("subconscious: " + dream(), "bot dream");
        });
    };

    $("#chatForm", win).addEventListener("submit", (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        input.value = "";
        msg("user").textContent = "> " + q;
        if (streaming) queue.push(q.toLowerCase());      // answered after current stream
        else setTimeout(() => respond(q.toLowerCase()), 280);
    });

    let opened = false;
    const open = () => {
        win.hidden = false;
        root.classList.add("chat-open");
        if (!lm && !lmTraining) trainCortex(updateStat);
        updateStat();
        if (!opened) {
            opened = true;
            stream("KZ·MIND online. three neural nets, zero servers — the language cortex is training in your tab right now (watch the header). ask about konrad, or /help.", "bot");
        }
        if (matchMedia("(pointer: fine)").matches) input.focus();
    };
    const close = () => {
        win.hidden = true;
        root.classList.remove("chat-open");
        input.blur();
    };
    $("#chatX", win).addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !win.hidden) close();
    });

    const btn = $("#chatBtn");
    if (btn) btn.addEventListener("click", () => (win.hidden ? open() : close()));

    setInterval(updateStat, 1500);

    window.Chat = { open, close, toggle: () => (win.hidden ? open() : close()), dream };
})();
