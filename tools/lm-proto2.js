const NN = require("../nn.js");
const fs = require("fs");
/* same corpus, pulled from proto 1 */
const src = fs.readFileSync("lm-proto.js", "utf8");
const CORPUS = eval(src.match(/const CORPUS = \(([\s\S]*?)\)\.replace/)[1]).replace(/\s+/g, " ").trim() + " ";
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789 .,-";
const V = CHARS.length, idx = {};
[...CHARS].forEach((c, i) => (idx[c] = i));
const text = [...CORPUS].map((c) => (idx[c] !== undefined ? c : " ")).join("");

const CTX = 12, HID = 144;
const net = new NN.Net([CTX * V, HID, V], { out: "softmax", lr: 0.008, seed: 7, l2: 1e-6 });
const x = new Float32Array(CTX * V), y = new Float32Array(V);
const N = text.length - CTX - 1;
const rand = NN.xorshift(99);
const t0 = Date.now();
for (let e = 0; e < 40; e++) {
    if (e >= 10) net.lr *= 0.88;
    let loss = 0;
    for (let s = 0; s < N; s++) {
        const pos = (rand() * N) | 0;
        x.fill(0);
        for (let k = 0; k < CTX; k++) x[k * V + idx[text[pos + k]]] = 1;
        y.fill(0); y[idx[text[pos + CTX]]] = 1;
        loss += net.train(x, y);
    }
    if (e % 10 === 9) console.log(`epoch ${e + 1} loss ${(loss / N).toFixed(3)} lr ${net.lr.toFixed(5)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

/* dream decode: seed from a VERBATIM corpus window, top-k2/temp .4, stop at sentence end */
const dream = () => {
    const starts = [];
    for (let i = 0; i < text.length - CTX; i++) {
        if (i === 0 || (text[i - 1] === "." || text[i - 1] === " ") && text.slice(i, i + 7).match(/^[a-z]/)) starts.push(i);
    }
    const s0 = starts[(rand() * starts.length) | 0];
    let win = text.slice(s0, s0 + CTX), out = win;
    for (let i = 0; i < 200; i++) {
        x.fill(0);
        for (let k = 0; k < CTX; k++) x[k * V + idx[win[k]]] = 1;
        const p = net.forward(x);
        let b1 = 0, b2 = 1;
        for (let j = 1; j < V; j++) if (p[j] > p[b1]) { b2 = b1; b1 = j; }
        const c = (p[b2] / p[b1] > 0.35 && rand() < 0.25) ? b2 : b1;   // top-2, mild temp
        out += CHARS[c];
        win = win.slice(1) + CHARS[c];
        if (CHARS[c] === "." && out.length > 60) break;
    }
    return out;
};
console.log("\n--- dreams ---");
for (let i = 0; i < 6; i++) console.log("· " + dream() + "\n");
