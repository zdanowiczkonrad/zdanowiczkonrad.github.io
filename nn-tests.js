/*
    nn-tests.js — test suite for the zdanowicz.dev neural engine.
    Run headless:  node nn-tests.js
    Run in browser: load after nn.js, call NNTests.run(reporter)
*/
(function (global) {
    "use strict";

    const NN = global.NN || (typeof require !== "undefined" ? require("./nn.js") : null);
    if (!NN) throw new Error("nn.js must be loaded first");
    const { Net, xorshift } = NN;

    const CASES = [];
    const test = (name, fn) => CASES.push({ name, fn });
    const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

    /* ---- correctness: analytic gradients vs central differences ---------- */

    test("gradient check (backprop vs numeric)", () => {
        const checks = [
            new Net([3, 4, 2], { hidden: "tanh", out: "softmax", seed: 7 }),
            new Net([2, 5, 1], { hidden: "sigmoid", out: "sigmoid", seed: 8 }),
            new Net([4, 6, 3], { hidden: "tanh", out: "linear", seed: 9 }),
        ];
        const x3 = [0.3, -0.7, 0.5, 0.1], y3 = [0.2, -0.4, 0.9];
        const data = [
            [[0.3, -0.7, 0.5], [0, 1]],
            [[0.6, -0.2], [1]],
            [x3, y3],
        ];
        let maxRel = 0;
        checks.forEach((net, c) => {
            const [x, y] = data[c];
            net.grads(x, y);
            const h = 1e-3;
            for (let l = 0; l < net.L; l++) {
                for (let i = 0; i < net.W[l].length; i += Math.max(1, (net.W[l].length / 12) | 0)) {
                    const w0 = net.W[l][i];
                    net.W[l][i] = w0 + h; const lp = net.loss(x, y);
                    net.W[l][i] = w0 - h; const lm = net.loss(x, y);
                    net.W[l][i] = w0;
                    const num = (lp - lm) / (2 * h);
                    const ana = net.gW[l][i];
                    const rel = Math.abs(num - ana) / Math.max(1e-4, Math.abs(num) + Math.abs(ana));
                    if (rel > maxRel) maxRel = rel;
                    assert(rel < 0.02, `net#${c} W[${l}][${i}]: analytic ${ana} vs numeric ${num}`);
                }
            }
        });
        return `max rel err ${maxRel.toExponential(2)}`;
    });

    /* ---- logic gates ------------------------------------------------------ */

    const XOR_X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const XOR_Y = [[0], [1], [1], [0]];

    test("XOR (tanh hidden, adam)", () => {
        const net = new Net([2, 6, 1], { hidden: "tanh", out: "sigmoid", lr: 0.05, seed: 3 });
        const loss = net.trainSet(XOR_X, XOR_Y, 800);
        XOR_X.forEach((x, i) => {
            const p = net.forward(x)[0];
            assert(Math.round(p) === XOR_Y[i][0], `xor(${x}) = ${p.toFixed(3)}`);
        });
        assert(loss < 0.05, `loss ${loss}`);
        return `loss ${loss.toExponential(2)} after ${net.steps} steps`;
    });

    test("XOR (relu hidden, sgd+momentum)", () => {
        const net = new Net([2, 8, 1], { hidden: "relu", out: "sigmoid", lr: 0.03, optimizer: "sgd", seed: 11 });
        const loss = net.trainSet(XOR_X, XOR_Y, 1500);
        XOR_X.forEach((x, i) => assert(Math.round(net.forward(x)[0]) === XOR_Y[i][0], `xor(${x})`));
        return `loss ${loss.toExponential(2)}`;
    });

    test("AND / OR / NAND", () => {
        const T = {
            AND: [[0], [0], [0], [1]],
            OR: [[0], [1], [1], [1]],
            NAND: [[1], [1], [1], [0]],
        };
        Object.entries(T).forEach(([name, Y]) => {
            const net = new Net([2, 4, 1], { lr: 0.08, seed: 5 });
            net.trainSet(XOR_X, Y, 400);
            XOR_X.forEach((x, i) => assert(Math.round(net.forward(x)[0]) === Y[i][0], `${name}(${x})`));
        });
        return "3 gates learned";
    });

    test("3-bit parity", () => {
        const X = [], Y = [];
        for (let i = 0; i < 8; i++) {
            const b = [i & 1, (i >> 1) & 1, (i >> 2) & 1];
            X.push(b);
            Y.push([(b[0] ^ b[1] ^ b[2])]);
        }
        const net = new Net([3, 12, 1], { lr: 0.04, seed: 2 });
        const loss = net.trainSet(X, Y, 1200);
        X.forEach((x, i) => assert(Math.round(net.forward(x)[0]) === Y[i][0], `parity(${x})`));
        return `loss ${loss.toExponential(2)}`;
    });

    /* ---- regression -------------------------------------------------------- */

    test("sine regression (MSE < 0.005)", () => {
        const rand = xorshift(42);
        const X = [], Y = [];
        for (let i = 0; i < 160; i++) {
            const t = (rand() * 2 - 1) * Math.PI;
            X.push([t / Math.PI]);
            Y.push([Math.sin(t)]);
        }
        const net = new Net([1, 16, 16, 1], { hidden: "tanh", out: "linear", lr: 0.01, seed: 4 });
        net.trainSet(X, Y, 220);
        let mse = 0;
        for (let i = 0; i < 64; i++) {
            const t = (i / 63 * 2 - 1) * Math.PI;
            const e = net.forward([t / Math.PI])[0] - Math.sin(t);
            mse += e * e;
        }
        mse /= 64;
        assert(mse < 0.005, `mse ${mse}`);
        return `mse ${mse.toExponential(2)}`;
    });

    /* ---- nonlinear classification ------------------------------------------- */

    test("concentric rings (acc ≥ 96%)", () => {
        const rand = xorshift(77);
        const make = (n) => {
            const X = [], Y = [];
            for (let i = 0; i < n; i++) {
                const inner = rand() < 0.5;
                const r = inner ? rand() * 0.4 : 0.65 + rand() * 0.35;
                const a = rand() * Math.PI * 2;
                X.push([r * Math.cos(a), r * Math.sin(a)]);
                Y.push([inner ? 1 : 0]);
            }
            return [X, Y];
        };
        const [X, Y] = make(400);
        const [Xt, Yt] = make(200);
        const net = new Net([2, 12, 8, 1], { lr: 0.02, seed: 6 });
        net.trainSet(X, Y, 60);
        let ok = 0;
        Xt.forEach((x, i) => { if (Math.round(net.forward(x)[0]) === Yt[i][0]) ok++; });
        const acc = ok / Xt.length;
        assert(acc >= 0.96, `accuracy ${acc}`);
        return `accuracy ${(acc * 100).toFixed(1)}%`;
    });

    test("3-class blobs, softmax (acc ≥ 95%)", () => {
        const rand = xorshift(99);
        const C = [[0, 1], [-0.9, -0.6], [0.9, -0.6]];
        const make = (n) => {
            const X = [], Y = [];
            for (let i = 0; i < n; i++) {
                const c = (rand() * 3) | 0;
                X.push([C[c][0] + (rand() - 0.5) * 0.8, C[c][1] + (rand() - 0.5) * 0.8]);
                const y = [0, 0, 0]; y[c] = 1;
                Y.push(y);
            }
            return [X, Y];
        };
        const [X, Y] = make(450);
        const [Xt, Yt] = make(150);
        const net = new Net([2, 10, 3], { out: "softmax", lr: 0.02, seed: 12 });
        net.trainSet(X, Y, 40);
        let ok = 0;
        Xt.forEach((x, i) => {
            const p = net.forward(x);
            let am = 0;
            for (let j = 1; j < 3; j++) if (p[j] > p[am]) am = j;
            if (Yt[i][am] === 1) ok++;
        });
        const acc = ok / Xt.length;
        assert(acc >= 0.95, `accuracy ${acc}`);
        return `accuracy ${(acc * 100).toFixed(1)}%`;
    });

    /* ---- engine guarantees ----------------------------------------------------- */

    test("determinism (same seed → identical run)", () => {
        const run = () => {
            const net = new Net([2, 6, 1], { lr: 0.05, seed: 31 });
            let acc = 0;
            for (let e = 0; e < 50; e++) XOR_X.forEach((x, i) => (acc += net.train(x, XOR_Y[i])));
            return acc;
        };
        const a = run(), b = run();
        assert(a === b, `${a} !== ${b}`);
        return `checksum ${a.toFixed(6)}`;
    });

    test("serialize → deserialize round-trip", () => {
        const net = new Net([3, 7, 2], { out: "softmax", seed: 13 });
        net.trainSet([[0.1, 0.5, -0.3], [-0.6, 0.2, 0.9]], [[1, 0], [0, 1]], 30);
        const clone = Net.deserialize(net.serialize());
        const x = [0.25, -0.4, 0.7];
        const p1 = net.forward(x), p2 = clone.forward(x);
        for (let i = 0; i < p1.length; i++) assert(Math.abs(p1[i] - p2[i]) < 1e-6, `output ${i} drifted`);
        return "outputs identical";
    });

    test("throughput benchmark", () => {
        const net = new Net([16, 32, 32, 8], { out: "softmax", lr: 0.005, seed: 1 });
        const x = new Float32Array(16).map(() => Math.random());
        const y = new Float32Array(8); y[3] = 1;
        const N = 20000;
        const t0 = Date.now();
        for (let i = 0; i < N; i++) net.train(x, y);
        const dt = (Date.now() - t0) / 1000;
        const sps = Math.round(N / dt);
        assert(isFinite(net.emaLoss), "loss exploded");
        return `${sps.toLocaleString("en")} train steps/s on [16,32,32,8] (${(sps * 1888 / 1e6).toFixed(0)}M weight-updates/s)`;
    });

    /* ---- runner ------------------------------------------------------------------ */

    const run = (report) => {
        let pass = 0, fail = 0;
        const results = [];
        for (const c of CASES) {
            const t0 = Date.now();
            let r;
            try {
                const info = c.fn();
                r = { name: c.name, ok: true, ms: Date.now() - t0, info: info || "" };
                pass++;
            } catch (err) {
                r = { name: c.name, ok: false, ms: Date.now() - t0, info: err.message };
                fail++;
            }
            results.push(r);
            if (report) report(r);
        }
        return { pass, fail, results };
    };

    const api = { run, CASES };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.NNTests = api;

    /* CLI mode */
    if (typeof process !== "undefined" && typeof require !== "undefined" &&
        typeof module !== "undefined" && require.main === module) {
        console.log("nn-tests · zdanowicz.dev neural engine\n");
        const { pass, fail } = run((r) => {
            const mark = r.ok ? "\x1b[32m ✓ \x1b[0m" : "\x1b[31m ✗ \x1b[0m";
            console.log(`${mark}${r.name.padEnd(42)} ${String(r.ms + "ms").padStart(7)}  ${r.info}`);
        });
        console.log(`\n${pass} passed, ${fail} failed`);
        process.exit(fail ? 1 : 0);
    }
})(typeof window !== "undefined" ? window : globalThis);
