/* prototype: char-level LM on a Konrad corpus using nn.js — tune before shipping */
const NN = require("../nn.js");

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
const idx = {};
[...CHARS].forEach((c, i) => (idx[c] = i));
const text = [...CORPUS].map((c) => (idx[c] !== undefined ? c : " ")).join("");
console.log("corpus:", text.length, "chars, vocab", V);

const CTX = 12, HID = 128, LR = 0.006, EPOCHS = Number(process.argv[2] || 14);
const net = new NN.Net([CTX * V, HID, V], { out: "softmax", lr: LR, seed: 7, l2: 1e-6 });

const x = new Float32Array(CTX * V);
const y = new Float32Array(V);
const setX = (pos) => {
    x.fill(0);
    for (let k = 0; k < CTX; k++) x[k * V + idx[text[pos + k]]] = 1;
};

const t0 = Date.now();
const N = text.length - CTX - 1;
const rand = NN.xorshift(99);
for (let e = 0; e < EPOCHS; e++) {
    let loss = 0;
    for (let s = 0; s < N; s++) {
        const pos = (rand() * N) | 0;
        setX(pos);
        y.fill(0); y[idx[text[pos + CTX]]] = 1;
        loss += net.train(x, y);
    }
    console.log(`epoch ${e + 1} loss ${(loss / N).toFixed(3)} (${((Date.now() - t0) / 1000).toFixed(1)}s, ${net.steps} steps)`);
}
console.log(`total: ${((Date.now() - t0) / 1000).toFixed(1)}s, ${net.steps} steps, ${(net.steps / ((Date.now() - t0) / 1000) / 1000).toFixed(1)}k steps/s`);

/* sample */
const sample = (seed, n, temp) => {
    let win = seed.padStart(CTX, " ").slice(-CTX);
    let out = "";
    for (let i = 0; i < n; i++) {
        x.fill(0);
        for (let k = 0; k < CTX; k++) x[k * V + (idx[win[k]] !== undefined ? idx[win[k]] : 36)] = 1;
        const p = net.forward(x);
        /* temperature sampling */
        let sum = 0;
        const q = new Float64Array(V);
        for (let j = 0; j < V; j++) { q[j] = Math.pow(p[j], 1 / temp); sum += q[j]; }
        let r = rand() * sum, c = 0;
        for (let j = 0; j < V; j++) { r -= q[j]; if (r <= 0) { c = j; break; } }
        out += CHARS[c];
        win = win.slice(1) + CHARS[c];
    }
    return out;
};
console.log("\n--- samples (temp 0.65) ---");
["konrad is ", "ingrid bui", "the neural"].forEach((s) => console.log(`[${s}]` + sample(s, 170, 0.4) + "\n"));

/* top-k sampling: temp-weighted among top K candidates only */
const sampleK = (seed, n, temp, K) => {
    let win = seed.padStart(CTX, " ").slice(-CTX);
    let out = "";
    for (let i = 0; i < n; i++) {
        x.fill(0);
        for (let k = 0; k < CTX; k++) x[k * V + (idx[win[k]] !== undefined ? idx[win[k]] : 36)] = 1;
        const p = net.forward(x);
        const cand = [...p].map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, K);
        let sum = 0;
        const q = cand.map(([v]) => { const w = Math.pow(v, 1 / temp); sum += w; return w; });
        let r = rand() * sum, c = cand[0][1];
        for (let j = 0; j < cand.length; j++) { r -= q[j]; if (r <= 0) { c = cand[j][1]; break; } }
        out += CHARS[c];
        win = win.slice(1) + CHARS[c];
    }
    return out;
};
console.log("--- top-k=2 temp 0.35 ---");
["konrad is ", "ingrid bui", "the neural", "to reach k"].forEach((s) => console.log(`[${s}]` + sampleK(s, 170, 0.35, 2) + "\n"));
console.log("--- argmax (k=1) ---");
["konrad is ", "before bol"].forEach((s) => console.log(`[${s}]` + sampleK(s, 170, 1, 1) + "\n"));
