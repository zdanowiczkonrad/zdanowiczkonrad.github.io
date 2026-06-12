/*
    nn.js — zdanowicz.dev neural engine
    A real MLP in ~300 lines: flat Float32Array storage, fused forward/backward,
    Adam or momentum-SGD, seeded init, zero allocation in the hot path.
    Runs in the browser and in Node (`node nn-tests.js`).
*/
(function (global) {
    "use strict";

    /* xorshift32 — deterministic, fast, good enough for init & shuffles */
    const xorshift = (seed) => {
        let s = (seed >>> 0) || 0x9e3779b9;
        return () => {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    };

    const HID = { tanh: 0, relu: 1, sigmoid: 2 };
    const OUT = { linear: 0, sigmoid: 1, softmax: 2 };

    /*  Net([2, 8, 1], { hidden:"tanh", out:"sigmoid", lr:.05, optimizer:"adam",
                         l2:0, seed:1, track:false })
        out "softmax" pairs with cross-entropy, "sigmoid" with binary CE,
        "linear" with MSE — all three give output delta = (ŷ − y), which keeps
        the backward pass branch-free.                                          */
    class Net {
        constructor(sizes, opts = {}) {
            this.sizes = sizes.slice();
            this.L = sizes.length - 1;
            this.hidden = HID[opts.hidden || "tanh"];
            this.out = OUT[opts.out || "sigmoid"];
            this.lr = opts.lr !== undefined ? opts.lr : 0.01;
            this.l2 = opts.l2 || 0;
            this.optimizer = opts.optimizer || "adam";
            this.momentum = opts.momentum !== undefined ? opts.momentum : 0.9;
            this.track = !!opts.track;          // record |Δw| per weight (for viz)
            this.seed = opts.seed !== undefined ? opts.seed : 1;
            this.t = 0;                         // adam timestep
            this.steps = 0;
            this.emaLoss = -1;

            const rand = xorshift(this.seed);
            this.W = []; this.b = [];           // parameters
            this.gW = []; this.gB = [];         // gradients (last backward)
            this.mW = []; this.vW = [];         // adam moments / sgd velocity
            this.mB = []; this.vB = [];
            this.a = [new Float32Array(sizes[0])]; // activations per layer
            this.d = [];                        // deltas per non-input layer
            this.dWmag = this.track ? [] : null;
            for (let l = 0; l < this.L; l++) {
                const nIn = sizes[l], nOut = sizes[l + 1], n = nIn * nOut;
                const lim = this.hidden === HID.relu
                    ? Math.sqrt(6 / nIn)                 // He
                    : Math.sqrt(6 / (nIn + nOut));       // Xavier
                const W = new Float32Array(n);
                for (let i = 0; i < n; i++) W[i] = (rand() * 2 - 1) * lim;
                this.W.push(W);
                this.b.push(new Float32Array(nOut));
                this.gW.push(new Float32Array(n));
                this.gB.push(new Float32Array(nOut));
                this.mW.push(new Float32Array(n));
                this.vW.push(new Float32Array(n));
                this.mB.push(new Float32Array(nOut));
                this.vB.push(new Float32Array(nOut));
                this.a.push(new Float32Array(nOut));
                this.d.push(new Float32Array(nOut));
                if (this.track) this.dWmag.push(new Float32Array(n));
            }
        }

        /* returns the internal output buffer — read, don't keep */
        forward(x) {
            const sizes = this.sizes, L = this.L, hid = this.hidden;
            const a0 = this.a[0];
            for (let i = 0; i < a0.length; i++) a0[i] = x[i];
            for (let l = 0; l < L; l++) {
                const nIn = sizes[l], nOut = sizes[l + 1];
                const W = this.W[l], b = this.b[l], ain = this.a[l], aout = this.a[l + 1];
                for (let j = 0; j < nOut; j++) {
                    let s = b[j];
                    const off = j * nIn;
                    for (let i = 0; i < nIn; i++) s += W[off + i] * ain[i];
                    aout[j] = s;
                }
                if (l < L - 1) {
                    if (hid === 0) for (let j = 0; j < nOut; j++) aout[j] = Math.tanh(aout[j]);
                    else if (hid === 1) for (let j = 0; j < nOut; j++) { if (aout[j] < 0) aout[j] = 0; }
                    else for (let j = 0; j < nOut; j++) aout[j] = 1 / (1 + Math.exp(-aout[j]));
                } else {
                    if (this.out === 1) for (let j = 0; j < nOut; j++) aout[j] = 1 / (1 + Math.exp(-aout[j]));
                    else if (this.out === 2) {
                        let mx = -Infinity;
                        for (let j = 0; j < nOut; j++) if (aout[j] > mx) mx = aout[j];
                        let sum = 0;
                        for (let j = 0; j < nOut; j++) { const e = Math.exp(aout[j] - mx); aout[j] = e; sum += e; }
                        const inv = 1 / sum;
                        for (let j = 0; j < nOut; j++) aout[j] *= inv;
                    }
                }
            }
            return this.a[L];
        }

        /* loss only (no gradients) — used by numeric gradient checking */
        loss(x, y) {
            const p = this.forward(x);
            const n = p.length;
            let loss = 0;
            if (this.out === 2) {
                for (let j = 0; j < n; j++) if (y[j] > 0) loss -= y[j] * Math.log(p[j] + 1e-12);
            } else if (this.out === 1) {
                for (let j = 0; j < n; j++)
                    loss -= y[j] * Math.log(p[j] + 1e-12) + (1 - y[j]) * Math.log(1 - p[j] + 1e-12);
            } else {
                for (let j = 0; j < n; j++) { const e = p[j] - y[j]; loss += 0.5 * e * e; }
            }
            return loss;
        }

        /* fills gW/gB from the last forward; returns sample loss */
        backward(y) {
            const sizes = this.sizes, L = this.L, hid = this.hidden;
            const aL = this.a[L], dOut = this.d[L - 1], nO = sizes[L];
            let loss = 0;
            if (this.out === 2) {
                for (let j = 0; j < nO; j++) {
                    const p = aL[j];
                    dOut[j] = p - y[j];
                    if (y[j] > 0) loss -= y[j] * Math.log(p + 1e-12);
                }
            } else if (this.out === 1) {
                for (let j = 0; j < nO; j++) {
                    const p = aL[j];
                    dOut[j] = p - y[j];
                    loss -= y[j] * Math.log(p + 1e-12) + (1 - y[j]) * Math.log(1 - p + 1e-12);
                }
            } else {
                for (let j = 0; j < nO; j++) {
                    const e = aL[j] - y[j];
                    dOut[j] = e;
                    loss += 0.5 * e * e;
                }
            }
            for (let l = L - 1; l >= 0; l--) {
                const nIn = sizes[l], nOut = sizes[l + 1];
                const W = this.W[l], gW = this.gW[l], gB = this.gB[l];
                const ain = this.a[l], del = this.d[l];
                if (l > 0) {
                    const dprev = this.d[l - 1];
                    dprev.fill(0);
                    for (let j = 0; j < nOut; j++) {          // fused: grads + transpose-accumulate
                        const dj = del[j], off = j * nIn;
                        gB[j] = dj;
                        for (let i = 0; i < nIn; i++) {
                            gW[off + i] = dj * ain[i];
                            dprev[i] += W[off + i] * dj;
                        }
                    }
                    if (hid === 0) for (let i = 0; i < nIn; i++) { const ai = ain[i]; dprev[i] *= 1 - ai * ai; }
                    else if (hid === 1) for (let i = 0; i < nIn; i++) { if (ain[i] <= 0) dprev[i] = 0; }
                    else for (let i = 0; i < nIn; i++) { const ai = ain[i]; dprev[i] *= ai * (1 - ai); }
                } else {
                    for (let j = 0; j < nOut; j++) {
                        const dj = del[j], off = j * nIn;
                        gB[j] = dj;
                        for (let i = 0; i < nIn; i++) gW[off + i] = dj * ain[i];
                    }
                }
            }
            return loss;
        }

        apply() {
            this.t++;
            const lr = this.lr, l2 = this.l2;
            if (this.optimizer === "adam") {
                const b1 = 0.9, b2 = 0.999, eps = 1e-8;
                const c1 = 1 / (1 - Math.pow(b1, this.t));
                const c2 = 1 / (1 - Math.pow(b2, this.t));
                for (let l = 0; l < this.L; l++) {
                    const W = this.W[l], g = this.gW[l], m = this.mW[l], v = this.vW[l];
                    const n = W.length;
                    if (this.track) {
                        const mag = this.dWmag[l];
                        for (let i = 0; i < n; i++) {
                            const gi = g[i] + l2 * W[i];
                            const mi = m[i] = b1 * m[i] + (1 - b1) * gi;
                            const vi = v[i] = b2 * v[i] + (1 - b2) * gi * gi;
                            const dw = lr * (mi * c1) / (Math.sqrt(vi * c2) + eps);
                            W[i] -= dw;
                            mag[i] = dw < 0 ? -dw : dw;
                        }
                    } else {
                        for (let i = 0; i < n; i++) {
                            const gi = g[i] + l2 * W[i];
                            const mi = m[i] = b1 * m[i] + (1 - b1) * gi;
                            const vi = v[i] = b2 * v[i] + (1 - b2) * gi * gi;
                            W[i] -= lr * (mi * c1) / (Math.sqrt(vi * c2) + eps);
                        }
                    }
                    const B = this.b[l], gb = this.gB[l], mb = this.mB[l], vb = this.vB[l];
                    for (let i = 0; i < B.length; i++) {
                        const gi = gb[i];
                        const mi = mb[i] = b1 * mb[i] + (1 - b1) * gi;
                        const vi = vb[i] = b2 * vb[i] + (1 - b2) * gi * gi;
                        B[i] -= lr * (mi * c1) / (Math.sqrt(vi * c2) + eps);
                    }
                }
            } else {                                          // momentum SGD
                const mom = this.momentum;
                for (let l = 0; l < this.L; l++) {
                    const W = this.W[l], g = this.gW[l], m = this.mW[l];
                    const n = W.length;
                    const mag = this.track ? this.dWmag[l] : null;
                    for (let i = 0; i < n; i++) {
                        const dw = m[i] = mom * m[i] - lr * (g[i] + l2 * W[i]);
                        W[i] += dw;
                        if (mag) mag[i] = dw < 0 ? -dw : dw;
                    }
                    const B = this.b[l], gb = this.gB[l], mb = this.mB[l];
                    for (let i = 0; i < B.length; i++) {
                        B[i] += (mb[i] = mom * mb[i] - lr * gb[i]);
                    }
                }
            }
        }

        /* one SGD step on a single sample */
        train(x, y) {
            this.forward(x);
            const loss = this.backward(y);
            this.apply();
            this.steps++;
            this.emaLoss = this.emaLoss < 0 ? loss : this.emaLoss * 0.98 + loss * 0.02;
            return loss;
        }

        /* fills gW/gB without updating — for gradient checking */
        grads(x, y) {
            this.forward(x);
            return this.backward(y);
        }

        /* epochs over a dataset, seeded shuffle; returns mean loss of last epoch */
        trainSet(X, Y, epochs, shuffleSeed) {
            epochs = epochs || 1;
            const n = X.length;
            const idx = new Uint32Array(n);
            for (let i = 0; i < n; i++) idx[i] = i;
            const rand = xorshift(shuffleSeed !== undefined ? shuffleSeed : this.seed ^ 0x5f3759df);
            let mean = 0;
            for (let e = 0; e < epochs; e++) {
                for (let i = n - 1; i > 0; i--) {
                    const j = (rand() * (i + 1)) | 0;
                    const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
                }
                mean = 0;
                for (let i = 0; i < n; i++) mean += this.train(X[idx[i]], Y[idx[i]]);
                mean /= n;
            }
            return mean;
        }

        serialize() {
            return JSON.stringify({
                sizes: this.sizes,
                hidden: Object.keys(HID)[this.hidden],
                out: Object.keys(OUT)[this.out],
                lr: this.lr, l2: this.l2, optimizer: this.optimizer, seed: this.seed,
                W: this.W.map((w) => Array.from(w)),
                b: this.b.map((b) => Array.from(b)),
            });
        }

        static deserialize(json, extra) {
            const o = typeof json === "string" ? JSON.parse(json) : json;
            const net = new Net(o.sizes, extra ? Object.assign({}, o, extra) : o);
            o.W.forEach((w, l) => net.W[l].set(w));
            o.b.forEach((b, l) => net.b[l].set(b));
            return net;
        }
    }

    const api = { Net, xorshift };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.NN = api;
})(typeof window !== "undefined" ? window : globalThis);
