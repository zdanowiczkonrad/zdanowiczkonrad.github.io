/* descent-sudoku.js — an interactive sudoku gate.
   window.SUD = { givens:"<81 chars, '.'=empty>", groups:[ [[r,c],...], ... ] }
   Each group's filled cells form a value; only the group cells are marked.
   Renders into <div id="sud">. No prose hints — the grid carries it. */
(function () {
  "use strict";
  var C = window.SUD; if (!C) return;
  var host = document.getElementById("sud"); if (!host) return;
  var AC = document.body.getAttribute("link") || "#b9a7ff";
  var FG = document.body.getAttribute("text") || "#7d7790";
  var DIM = "#2c2740";
  var given = C.givens.split("").map(function (c) { return c === "." ? 0 : +c; });

  var cellGroup = {};
  C.groups.forEach(function (g, gi) { g.forEach(function (rc) { cellGroup[rc[0] + "," + rc[1]] = gi; }); });
  var inputs = {};

  var table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;margin:10px auto";
  for (var r = 1; r <= 9; r++) {
    var tr = table.insertRow();
    for (var c = 1; c <= 9; c++) {
      var td = tr.insertCell(), idx = (r - 1) * 9 + (c - 1), key = r + "," + c, grp = cellGroup[key];
      td.style.cssText = "width:26px;height:26px;text-align:center;padding:0;position:relative;" +
        "border:1px solid #3a3460;" +
        "border-left-width:" + ((c - 1) % 3 === 0 ? 2 : 1) + "px;border-top-width:" + ((r - 1) % 3 === 0 ? 2 : 1) + "px;" +
        "border-right-width:" + (c === 9 ? 2 : 1) + "px;border-bottom-width:" + (r === 9 ? 2 : 1) + "px;" +
        "border-left-color:" + ((c - 1) % 3 === 0 ? "#5a5390" : "#2a2540") +
        ";border-top-color:" + ((r - 1) % 3 === 0 ? "#5a5390" : "#2a2540") + ";";
      if (given[idx]) {
        td.textContent = given[idx]; td.style.color = FG; td.style.background = "#100e18";
        td.style.font = "600 15px monospace";
      } else {
        var inp = document.createElement("input");
        inp.maxLength = 1; inp.inputMode = "numeric"; inp.dataset.key = key;
        inp.style.cssText = "width:24px;height:24px;border:0;background:transparent;text-align:center;" +
          "font:600 15px monospace;color:" + AC + ";outline:none;caret-color:" + AC + ";padding:0";
        inp.addEventListener("input", onInput);
        td.appendChild(inp); inputs[key] = inp;
      }
      if (grp !== undefined) {
        td.style.boxShadow = "inset 0 0 0 2px " + AC;
        var b = document.createElement("sup");
        b.textContent = grp + 1;
        b.style.cssText = "position:absolute;top:0;left:2px;font:8px monospace;color:" + AC + ";opacity:.85;pointer-events:none";
        td.appendChild(b);
      }
    }
  }
  host.appendChild(table);

  var read = document.createElement("div");
  read.style.cssText = "text-align:center;margin:8px auto 2px;font:600 17px/1.5 monospace;letter-spacing:.4em;color:" + DIM;
  host.appendChild(read);
  var msg = document.createElement("div");
  msg.style.cssText = "text-align:center;font:11px monospace;color:" + DIM + ";min-height:14px";
  host.appendChild(msg);

  function val(key) { var i = inputs[key]; if (i) return i.value ? +i.value : 0; var p = key.split(","); return given[(+p[0] - 1) * 9 + (+p[1] - 1)]; }
  function onInput(e) { e.target.value = e.target.value.replace(/[^1-9]/g, "").slice(-1); update(); }

  function badCells() {
    var bad = {};
    function scan(cells) {
      var seen = {};
      cells.forEach(function (k) { var v = val(k); if (!v) return; (seen[v] = seen[v] || []).push(k); });
      Object.keys(seen).forEach(function (v) { if (seen[v].length > 1) seen[v].forEach(function (k) { bad[k] = 1; }); });
    }
    for (var i = 1; i <= 9; i++) {
      var row = [], col = [];
      for (var j = 1; j <= 9; j++) { row.push(i + "," + j); col.push(j + "," + i); }
      scan(row); scan(col);
    }
    for (var br = 0; br < 3; br++) for (var bc = 0; bc < 3; bc++) {
      var box = []; for (var dr = 1; dr <= 3; dr++) for (var dc = 1; dc <= 3; dc++) box.push((br * 3 + dr) + "," + (bc * 3 + dc));
      scan(box);
    }
    return bad;
  }
  function update() {
    var bad = badCells();
    Object.keys(inputs).forEach(function (k) { inputs[k].style.color = bad[k] ? "#ff6b6b" : AC; });
    var letters = C.groups.map(function (g) {
      if (!g.every(function (rc) { return val(rc[0] + "," + rc[1]) > 0; })) return "·";
      var num = +g.map(function (rc) { return val(rc[0] + "," + rc[1]); }).join("");
      return (num >= 1 && num <= 26) ? String.fromCharCode(96 + num) : "?";
    });
    read.textContent = letters.join(" ");
    var allFilled = true;
    for (var r = 1; r <= 9; r++) for (var c = 1; c <= 9; c++) if (!val(r + "," + c)) allFilled = false;
    var solved = allFilled && !Object.keys(bad).length;
    read.style.color = solved ? AC : DIM;
    msg.textContent = solved ? "the lid is open." : "";
    msg.style.color = AC;
  }
  update();
})();
