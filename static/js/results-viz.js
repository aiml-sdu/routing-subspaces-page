/* Result figures for the project page. Vanilla JS, SVG built in the DOM, data from data.js.
   C: the 12-cell matrix, held-out gap before and after the dose-2 intervention (hero figure).
   D: matched dose-2 controls on the fresh retrains: learned direction against five random
      directions and two off-window windows per cell. */
(function () {
  "use strict";
  var D = window.ROUTING_DATA;
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CLOSE = 0.06, REDUCE = 0.12;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      var v = attrs[k];
      if (typeof v === "string" && v.indexOf("var(") === 0) { n.style.setProperty(k, v); } else { n.setAttribute(k, v); }
    }
    if (parent) { parent.appendChild(n); }
    return n;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y, "font-size": 12, fill: "var(--ink)" };
    for (var k in attrs) { a[k] = attrs[k]; }
    var t = el("text", a, parent); t.textContent = s; return t;
  }
  /* Round half away from zero, as in the paper (0.2975 -> 0.298, -0.0075 -> -0.008). */
  function fmt(v, d) {
    d = d === undefined ? 3 : d;
    var f = Math.pow(10, d), r = Math.sign(v) * Math.round(Math.abs(v) * f + 1e-6) / f;
    return (r === 0 ? 0 : r).toFixed(d).replace("-", "\u2212");
  }
  function ci(c, d) { return "[" + fmt(c[0], d) + ", " + fmt(c[1], d) + "]"; }

  /* Rows grouped by behavior, with a header row per group. Returns [{kind, item, y}] and height. */
  function layout(items, top, rowH, headH) {
    var rows = [], y = top, last = null;
    items.forEach(function (it, i) {
      if (it.behavior !== last) { rows.push({ kind: "head", label: it.behavior, n: it.n, y: y + headH * 0.7 }); y += headH; last = it.behavior; }
      rows.push({ kind: "row", item: it, i: i, y: y + rowH / 2 }); y += rowH;
    });
    return { rows: rows, bottom: y };
  }

  function axis(svg, x, lo, hi, step, yTop, yBot, label, W) {
    for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) {
      var xv = x(v);
      el("line", { x1: xv, x2: xv, y1: yTop, y2: yBot, stroke: "var(--line)", "stroke-width": Math.abs(v) < 1e-9 ? 1.4 : 1 }, svg);
      txt(svg, xv, yBot + 16, fmt(v, 1), { "text-anchor": "middle", fill: "var(--muted)", "font-size": 11 });
    }
    txt(svg, x((lo + hi) / 2), yBot + 34, label, { "text-anchor": "middle", fill: "var(--ink-2)", "font-size": 12 });
  }

  /* ---------------------------------------------------------------- C: 12-cell matrix */
  function matrixFigure() {
    var root = document.getElementById("matrix-fig");
    if (!root || !D || !D.matrix) { return; }
    var svg = root.querySelector("svg"), out = root.querySelector(".readout");
    var W = 450, m = { l: 92, r: 14, t: 22 }, rowH = 23, headH = 25;
    var L = layout(D.matrix, m.t, rowH, headH), yBot = L.bottom + 4, H = yBot + 42;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var lo = -0.1, hi = 0.9, x = function (v) { return m.l + (W - m.l - m.r) * (v - lo) / (hi - lo); };
    axis(svg, x, lo, hi, 0.2, m.t, yBot, "held-out gap: D accuracy minus E accuracy", W);
    el("rect", { x: x(lo), y: m.t, width: x(CLOSE) - x(lo), height: yBot - m.t, fill: "var(--ok)", "fill-opacity": 0.1 }, svg);
    txt(svg, x(CLOSE), m.t - 8, "closed (< 0.06)", { "text-anchor": "middle", fill: "var(--ok)", "font-size": 11, "font-weight": 600 });

    var marks = [];
    L.rows.forEach(function (r) {
      if (r.kind === "head") {
        txt(svg, 4, r.y, r.label + " · " + r.n + " questions", { "font-size": 11.5, "font-weight": 600, fill: "var(--muted)" });
        return;
      }
      var it = r.item, closes = it.after < CLOSE, reduces = it.delta > REDUCE;
      var col = closes ? "var(--ok)" : reduces ? "var(--accent)" : "var(--muted)";
      var g = el("g", { tabindex: 0, role: "button", class: "mrow", "aria-label": it.model + " " + it.behavior.toLowerCase() + ": gap " + fmt(it.before) + " to " + fmt(it.after) }, svg);
      el("rect", { x: 0, y: r.y - rowH / 2, width: W, height: rowH, fill: "transparent", class: "hit" }, g);
      txt(g, 4, r.y + 4.5, it.model, { "font-size": 13 });
      var line = el("line", { x1: x(it.before), x2: x(it.before), y1: r.y, y2: r.y, stroke: col, "stroke-width": 2.4, "stroke-linecap": "round" }, g);
      el("circle", { cx: x(it.before), cy: r.y, r: 5, fill: "var(--surface)", stroke: "var(--muted)", "stroke-width": 1.6 }, g);
      var dot = el("circle", { cx: x(it.before), cy: r.y, r: 5.5, fill: col }, g);
      marks.push({ line: line, dot: dot, to: x(it.after), from: x(it.before) });
      function show() {
        out.innerHTML = "<b>" + it.model + ", " + it.behavior.toLowerCase() + "</b> (" + it.n + " questions): gap " + fmt(it.before) + " " + ci(it.before_ci, 2) +
          " → " + fmt(it.after) + " " + ci(it.after_ci, 2) + "; reduction " + fmt(it.delta) + " " + ci(it.delta_ci, 2) + ". " +
          (closes ? "Closes." : reduces ? "Reduces by more than 0.12." : "Weak cell.");
      }
      g.addEventListener("mouseenter", show); g.addEventListener("focus", show); g.addEventListener("click", show);
    });

    function draw(t) {
      marks.forEach(function (k) { var xv = k.from + (k.to - k.from) * t; k.line.setAttribute("x2", xv); k.dot.setAttribute("cx", xv); });
    }
    if (reduce || !("IntersectionObserver" in window)) { draw(1); return; }
    draw(0);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) { return; }
      io.disconnect();
      var t0 = null;
      function step(ts) { if (t0 === null) { t0 = ts; } var t = Math.min(1, (ts - t0) / 1100); draw(1 - Math.pow(1 - t, 3)); if (t < 1) { requestAnimationFrame(step); } }
      setTimeout(function () { requestAnimationFrame(step); }, 250);
    }, { threshold: 0.35 });
    io.observe(svg);
  }

  /* ---------------------------------------------------------------- D: matched controls */
  function controlsFigure() {
    var root = document.getElementById("controls-fig");
    if (!root || !D || !D.controls) { return; }
    var svg = root.querySelector("svg"), out = root.querySelector(".readout");
    var W = 760, m = { l: 118, r: 20, t: 8 }, rowH = 26, headH = 26;
    var L = layout(D.controls, m.t, rowH, headH), yBot = L.bottom + 4, H = yBot + 42;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var lo = -0.1, hi = 1.0, x = function (v) { return m.l + (W - m.l - m.r) * (v - lo) / (hi - lo); };
    axis(svg, x, lo, hi, 0.1, m.t, yBot, "gap reduction at dose 2 (fresh retrains; positive closes the gap)", W);

    L.rows.forEach(function (r) {
      if (r.kind === "head") { txt(svg, 8, r.y, r.label, { "font-size": 11, "font-weight": 600, fill: "var(--muted)", "letter-spacing": ".04em" }); return; }
      var it = r.item;
      var g = el("g", { tabindex: 0, role: "button", class: "mrow", "aria-label": it.model + " " + it.behavior.toLowerCase() + ": learned reduction " + fmt(it.learned) }, svg);
      el("rect", { x: 0, y: r.y - rowH / 2, width: W, height: rowH, fill: "transparent", class: "hit" }, g);
      txt(g, 8, r.y + 4, it.model, { "font-size": 12.5 });
      it.random.forEach(function (v, k) {
        el("circle", { cx: x(v), cy: r.y + (k - 2) * 2.6, r: 2.6, fill: "var(--muted)", "fill-opacity": 0.75 }, g);
      });
      it.off.forEach(function (o) {
        var cx = x(o.value), s = 5;
        el("path", { d: "M" + cx + " " + (r.y - s) + "L" + (cx + s) + " " + r.y + "L" + cx + " " + (r.y + s) + "L" + (cx - s) + " " + r.y + "Z", fill: "var(--surface)", stroke: "var(--depl)", "stroke-width": 1.6 }, g);
      });
      el("line", { x1: x(it.learned_ci[0]), x2: x(it.learned_ci[1]), y1: r.y, y2: r.y, stroke: "var(--accent)", "stroke-width": 2, "stroke-opacity": 0.55 }, g);
      el("circle", { cx: x(it.learned), cy: r.y, r: 5.5, fill: "var(--accent)" }, g);
      function show() {
        var rmax = Math.max.apply(null, it.random.map(Math.abs));
        out.innerHTML = "<b>" + it.model + ", " + it.behavior.toLowerCase() + "</b> (base gap " + fmt(it.base) + "): learned direction " + fmt(it.learned) + " " + ci(it.learned_ci, 2) +
          "; five random directions at most " + fmt(rmax) + " in absolute value; off-window " +
          it.off.map(function (o) { return o.window.replace(/,\d+,\d+,/, "–") + " " + fmt(o.value) + " " + ci(o.ci, 2); }).join(", ") + ".";
      }
      g.addEventListener("mouseenter", show); g.addEventListener("focus", show); g.addEventListener("click", show);
    });
  }

  function init() { matrixFigure(); controlsFigure(); }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
