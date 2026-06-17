/*
    ghost-breach.js — the leak. zdanowicz.dev
    Something underneath the site is still drawing power. A meter that does not
    belong flickers into the status bar — PWR climbing, in a colour that isn't
    ours. Catch it and it drops you into /ghost/ : the Desert, and the descent
    beneath it. Entry point for GHOST/31 — EMBER.
    Pure decoration + one door. No tracking, no state.
*/
(() => {
    "use strict";
    const bar = document.querySelector(".sysmeta");
    if (!bar) return;

    // styles injected here so index.html stays untouched but for the <script> tag
    const css = document.createElement("style");
    css.textContent = `
      .pwr-leak{position:relative;display:inline-flex;align-items:center;gap:5px;
        font:600 10px/1 "JetBrains Mono",monospace;letter-spacing:.06em;
        color:#ff2e2e;cursor:pointer;opacity:0;transition:opacity .25s;
        text-shadow:0 0 6px rgba(255,46,46,.5);user-select:none}
      .pwr-leak.show{opacity:.62}
      .pwr-leak:hover{opacity:1;text-shadow:0 0 11px rgba(255,46,46,.9)}
      .pwr-leak .arw{animation:pwrar 1.1s steps(2) infinite}
      .pwr-leak.glitch{animation:pwrgl .18s steps(2) 3}
      @keyframes pwrar{50%{opacity:.2}}
      @keyframes pwrgl{0%{transform:translate(0)}25%{transform:translate(-1px,1px)}
        50%{transform:translate(1px,-1px);color:#ff8a3c}75%{transform:translate(-1px,0)}}
    `;
    document.head.appendChild(css);

    const el = document.createElement("span");
    el.className = "pwr-leak";
    el.title = "the Current never stopped flowing. something below is still drawing.";
    el.setAttribute("aria-hidden", "true");
    bar.insertBefore(el, bar.querySelector(".clock") || null);

    // a draw that should not exist, climbing slowly. seeded from the page load.
    let mw = 31.0;
    const render = () => {
        el.innerHTML = `PWR:<b style="font-weight:700">${mw.toFixed(1)}</b>MW <span class="arw">▲</span>`;
    };
    render();

    // surface it intermittently — it "doesn't belong", so it stutters in and out
    let t = 0;
    setInterval(() => {
        t++;
        mw += 0.1 + (t % 7 === 0 ? 0.4 : 0);   // creeps up, occasional spike
        render();
        // flicker visible roughly 1 beat in 4
        const on = (t % 4 === 1) || el.matches(":hover");
        el.classList.toggle("show", on);
        if (on && t % 12 === 1) { el.classList.add("glitch"); setTimeout(() => el.classList.remove("glitch"), 600); }
    }, 1500);
    // first reveal shortly after load so it's catchable
    setTimeout(() => el.classList.add("show"), 2600);

    el.addEventListener("click", (e) => {
        e.preventDefault();
        el.classList.add("glitch");
        setTimeout(() => { location.href = "descent/ghost.html"; }, 260);
    });
})();
