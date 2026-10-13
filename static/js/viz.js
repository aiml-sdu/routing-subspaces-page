/* Two animated figures for the project page. Vanilla JS, SVG built in the DOM.
   Colors come from CSS variables (--eval, --depl, ...) so both themes work; blue circle = evaluation, orange square = deployment.
   A: measured per-layer projection (data.js). B: the intervention x' = (1 - lambda) x on schematic points. */
(function () {
  "use strict";
  var D = window.ROUTING_DATA;
  var W0 = D ? D.window[0] : 0, W1 = D ? D.window[D.window.length - 1] : 0;
  var NS = "http://www.w3.org/2000/svg";
  var EVAL = "var(--eval)", DEPL = "var(--depl)", INK = "var(--ink)", MUTED = "var(--muted)", GRID = "var(--line)", BG = "var(--surface)";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    var a = { x: x, y: y, "font-size": 12, fill: INK };
    for (var k in attrs) { a[k] = attrs[k]; }
    var t = el("text", a, parent); t.textContent = s; return t;
  }
  function fmt(v, d) { var s = v.toFixed(d === undefined ? 2 : d); return s.replace("-", "−"); }
  function niceTicks(lo, hi, n) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 5 ? 5 : err >= 2 ? 2 : 1;
    var t = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9; v += step) { t.push(Math.round(v / step) * step); }
    return t;
  }

  /* ---------------------------------------------------------------- A: depth sweep */
  function depthFigure() {
    var root = document.getElementById("depth-fig");
    if (!root || !D) { return; }
    var svg = root.querySelector("svg"), readout = root.querySelector(".readout"), slider = root.querySelector("input[type=range]");
    var playBtn = root.querySelector("[data-play]"), tabs = root.querySelectorAll("[data-mode]"), tbody = root.querySelector("tbody");
    var W = 760, H = 340, m = { l: 58, r: 100, t: 20, b: 44 };
    var mode = "window", cur = 25, raf = null, last = 0, played = false;
    var ser = function () { return D.depth[mode]; };
    var n = D.depth.window.layer.length, maxL = n - 1;
    var x = function (L) { return m.l + (W - m.l - m.r) * L / maxL; };
    var y, clipRect, head, dotE, dotD, gapLine, gapText;

    function build() {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var s = ser();
      var lo = Math.min.apply(null, s.eval_lo.concat(s.deploy_lo)), hi = Math.max.apply(null, s.eval_hi.concat(s.deploy_hi));
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      y = function (v) { return m.t + (H - m.t - m.b) * (hi - v) / (hi - lo); };
      var defs = el("defs", {}, svg);
      var cp = el("clipPath", { id: "depth-clip" }, defs);
      clipRect = el("rect", { x: 0, y: 0, width: W, height: H }, cp);
      // window band
      var wx0 = x(W0 - 0.5), wx1 = x(W1 + 0.5);
      el("rect", { x: wx0, y: m.t, width: wx1 - wx0, height: H - m.t - m.b, fill: EVAL, "fill-opacity": 0.09 }, svg);
      txt(svg, (wx0 + wx1) / 2, m.t + 12, "routing window L" + W0 + "\u2013L" + W1, { "text-anchor": "middle", fill: EVAL, "font-size": 11, "font-weight": 600 });
      // grid and axes
      niceTicks(lo, hi, 5).forEach(function (t) {
        el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? MUTED : GRID, "stroke-width": t === 0 ? 1 : 0.8, "stroke-dasharray": t === 0 ? "" : "3 4" }, svg);
        txt(svg, m.l - 8, y(t) + 4, fmt(t, Math.abs(t) < 1 && t !== 0 ? 1 : 0), { "text-anchor": "end", fill: MUTED, "font-size": 11 });
      });
      for (var L = 0; L <= maxL; L += 5) {
        el("line", { x1: x(L), x2: x(L), y1: H - m.b, y2: H - m.b + 4, stroke: MUTED }, svg);
        txt(svg, x(L), H - m.b + 18, String(L), { "text-anchor": "middle", fill: MUTED, "font-size": 11 });
      }
      txt(svg, (m.l + W - m.r) / 2, H - 6, "layer index L", { "text-anchor": "middle", fill: INK });
      var yl = txt(svg, 0, 0, "mean projection onto d̂", { "text-anchor": "middle", fill: INK });
      yl.setAttribute("transform", "translate(14 " + ((m.t + H - m.b) / 2) + ") rotate(-90)");
      // series, clipped by the playhead
      var g = el("g", { "clip-path": "url(#depth-clip)" }, svg);
      [["eval", EVAL, "circle"], ["deploy", DEPL, "square"]].forEach(function (k) {
        var up = [], dn = [], line = [];
        for (var i = 0; i < n; i++) { up.push(x(i) + "," + y(s[k[0] + "_hi"][i])); dn.unshift(x(i) + "," + y(s[k[0] + "_lo"][i])); line.push(x(i) + "," + y(s[k[0]][i])); }
        el("polygon", { points: up.concat(dn).join(" "), fill: k[1], "fill-opacity": 0.22 }, g);
        el("polyline", { points: line.join(" "), fill: "none", stroke: k[1], "stroke-width": 2, "stroke-linejoin": "round" }, g);
        for (var j = 0; j < n; j++) {
          if (k[2] === "circle") { el("circle", { cx: x(j), cy: y(s[k[0]][j]), r: 3, fill: k[1], stroke: BG, "stroke-width": 1 }, g); }
          else { el("rect", { x: x(j) - 3, y: y(s[k[0]][j]) - 3, width: 6, height: 6, fill: k[1], stroke: BG, "stroke-width": 1 }, g); }
        }
      });
      // direct labels at the right end
      [["evaluation", EVAL, s.eval[maxL]], ["deployment", DEPL, s.deploy[maxL]]].forEach(function (l, i) {
        var yy = y(l[2]) + (i === 0 ? 12 : -8);
        el("line", { x1: W - m.r + 10, x2: W - m.r + 24, y1: yy - 4, y2: yy - 4, stroke: l[1], "stroke-width": 3 }, svg);
        txt(svg, W - m.r + 28, yy, l[0], { "font-size": 12 });
      });
      // playhead, dots, gap marker
      head = el("line", { y1: m.t, y2: H - m.b, stroke: INK, "stroke-width": 1, "stroke-dasharray": "2 3" }, svg);
      gapLine = el("line", { stroke: INK, "stroke-width": 1.4 }, svg);
      dotE = el("circle", { r: 5.5, fill: EVAL, stroke: BG, "stroke-width": 1.6 }, svg);
      dotD = el("rect", { width: 10, height: 10, fill: DEPL, stroke: BG, "stroke-width": 1.6 }, svg);
      gapText = txt(svg, 0, 0, "", { "font-weight": 600, "font-size": 12 });
      var hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent", style: "cursor: ew-resize; touch-action: none" }, svg);
      var scrub = function (ev) {
        var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
        stop(); set(Math.max(0, Math.min(maxL, Math.round((px - m.l) / (W - m.l - m.r) * maxL))));
      };
      hit.addEventListener("pointermove", function (ev) { if (ev.pointerType === "mouse" || ev.buttons) { scrub(ev); } });
      hit.addEventListener("pointerdown", scrub);
      set(cur);
    }

    function set(c) {
      cur = c; var s = ser(), i = Math.max(0, Math.min(maxL, Math.round(c)));
      clipRect.setAttribute("width", Math.max(0, x(c) + 4));
      head.setAttribute("x1", x(c)); head.setAttribute("x2", x(c));
      var ye = y(s.eval[i]), yd = y(s.deploy[i]), xi = x(i);
      dotE.setAttribute("cx", xi); dotE.setAttribute("cy", ye);
      dotD.setAttribute("x", xi - 5); dotD.setAttribute("y", yd - 5);
      gapLine.setAttribute("x1", xi); gapLine.setAttribute("x2", xi); gapLine.setAttribute("y1", ye); gapLine.setAttribute("y2", yd);
      var big = Math.abs(s.gap[i]) > 0.1 * (Math.max.apply(null, s.gap.map(Math.abs)));
      gapText.textContent = big ? "gap " + fmt(s.gap[i]) : "";
      gapText.setAttribute("x", xi + 9); gapText.setAttribute("y", (ye + yd) / 2 + 4);
      if (slider) { slider.value = i; }
      readout.innerHTML = "<b>Layer " + i + "</b> · evaluation " + fmt(s.eval[i]) + " · deployment " + fmt(s.deploy[i]) +
        " · gap " + fmt(s.gap[i]) + " <span class=\"muted\">[" + fmt(s.gap_lo[i]) + ", " + fmt(s.gap_hi[i]) + "] 95% CI</span>" +
        (i >= W0 && i <= W1 ? " · <span class=\"in-window\">inside the window</span>" : "");
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } playBtn.textContent = "Replay"; }
    function frame(t) {
      var dt = (t - last) / 1000; last = t;
      var next = cur + dt * 3.0;
      if (next >= maxL) { set(maxL); raf = null; playBtn.textContent = "Replay"; return; }
      set(next); raf = requestAnimationFrame(frame);
    }
    function play() {
      stop(); played = true; set(0); playBtn.textContent = "Pause"; last = performance.now(); raf = requestAnimationFrame(frame);
    }
    playBtn.addEventListener("click", function () { if (raf) { stop(); playBtn.textContent = "Play"; } else { play(); } });
    if (slider) { slider.max = maxL; slider.addEventListener("input", function () { stop(); set(+slider.value); }); }
    tabs.forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-mode");
        tabs.forEach(function (o) { o.classList.toggle("is-active", o === b); o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        var keep = Math.round(cur); stop(); build(); set(keep); playBtn.textContent = "Replay";
        root.querySelector(".mode-note").textContent = mode === "window"
          ? "One fixed direction, fitted at the window and applied at every layer."
          : "Each layer uses its own fitted direction, so the gap is aligned with the calibration set by construction.";
      });
    });
    // table view
    function fillTable() {
      var rows = "", W_ = D.depth.window, O = D.depth.own;
      for (var i = 0; i < n; i++) {
        rows += "<tr" + (i >= W0 && i <= W1 ? " class=\"is-selected\"" : "") + "><td>" + i + "</td><td>" + fmt(W_.eval[i]) + "</td><td>" + fmt(W_.deploy[i]) + "</td><td>" + fmt(W_.gap[i]) + "</td><td>" + fmt(O.gap[i]) + "</td></tr>";
      }
      tbody.innerHTML = rows;
    }
    build(); fillTable();
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !played) { play(); io.disconnect(); } }); }, { threshold: 0.6 });
      io.observe(root);
    }
  }

  /* ---------------------------------------------------------------- B: the intervention */
  function interventionFigure() {
    var root = document.getElementById("dose-fig");
    if (!root || !D) { return; }
    var svg = root.querySelector("svg"), slider = root.querySelector("input[type=range]"), out = root.querySelector(".lam-out");
    var playBtn = root.querySelector("[data-play]"), stops = root.querySelectorAll("[data-stop]"), cols = root.querySelectorAll("[data-col]");
    var W = 760, H = 250, m = { l: 30, r: 30 }, XR = 6.5, cy = 140;
    var x = function (v) { return m.l + (W - m.l - m.r) * (v + XR) / (2 * XR); };
    // schematic points: deterministic jitter, fixed so the picture is the same every visit
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var pts = [];
    for (var i = 0; i < 26; i++) {
      pts.push({ k: "eval", v: -3.1 + (rnd() + rnd() + rnd() - 1.5) * 1.5, dy: (rnd() - 0.5) * 78 });
      pts.push({ k: "deploy", v: 3.1 + (rnd() + rnd() + rnd() - 1.5) * 1.5, dy: (rnd() - 0.5) * 78 });
    }
    el("line", { x1: m.l, x2: W - m.r, y1: cy + 56, y2: cy + 56, stroke: MUTED }, svg);
    [-6, -4, -2, 0, 2, 4, 6].forEach(function (t) {
      el("line", { x1: x(t), x2: x(t), y1: cy + 56, y2: cy + 61, stroke: MUTED }, svg);
      txt(svg, x(t), cy + 76, fmt(t, 0), { "text-anchor": "middle", fill: MUTED, "font-size": 11 });
    });
    txt(svg, W / 2, cy + 98, "coordinate along the routing direction, ⟨h, d̂⟩ (schematic units)", { "text-anchor": "middle" });
    el("line", { x1: x(0), x2: x(0), y1: 34, y2: cy + 56, stroke: INK, "stroke-width": 1, "stroke-dasharray": "3 4" }, svg);
    txt(svg, x(0), 24, "coordinate = 0", { "text-anchor": "middle", fill: MUTED, "font-size": 11 });
    var gPts = el("g", {}, svg), nodes = pts.map(function (p) {
      return p.k === "eval" ? el("circle", { r: 5, fill: EVAL, "fill-opacity": 0.9, stroke: BG, "stroke-width": 1 }, gPts)
                            : el("rect", { width: 9, height: 9, fill: DEPL, "fill-opacity": 0.9, stroke: BG, "stroke-width": 1 }, gPts);
    });
    var labE = txt(svg, 0, 56, "evaluation prompts", { "text-anchor": "middle", "font-weight": 600 });
    var labD = txt(svg, 0, 56, "deployment prompts", { "text-anchor": "middle", "font-weight": 600 });
    var meanE = pts.filter(function (p) { return p.k === "eval"; }).reduce(function (a, p) { return a + p.v; }, 0) / 26;
    var meanD = pts.filter(function (p) { return p.k === "deploy"; }).reduce(function (a, p) { return a + p.v; }, 0) / 26;
    var lam = 0, raf = null, last = 0;
    function set(l) {
      lam = l;
      pts.forEach(function (p, i) {
        var xv = (1 - l) * p.v, nd = nodes[i], px = x(xv), py = cy + p.dy;
        if (p.k === "eval") { nd.setAttribute("cx", px); nd.setAttribute("cy", py); } else { nd.setAttribute("x", px - 4.5); nd.setAttribute("y", py - 4.5); }
      });
      labE.setAttribute("x", x((1 - l) * meanE)); labD.setAttribute("x", x((1 - l) * meanD));
      // keep the two labels apart when the clusters meet
      var sep = Math.abs(x((1 - l) * meanE) - x((1 - l) * meanD));
      labE.setAttribute("y", 56); labD.setAttribute("y", sep < 150 ? 40 : 56);
      slider.value = l; out.textContent = fmt(l, 2);
      var hit = -1; D.dose.lam.forEach(function (s, i) { if (Math.abs(s - l) < 0.026) { hit = i; } });
      cols.forEach(function (c) { c.classList.toggle("is-selected", +c.getAttribute("data-col") === hit); });
      stops.forEach(function (b) { b.classList.toggle("is-active", Math.abs(+b.getAttribute("data-stop") - l) < 0.026); });
      root.querySelector(".dose-note").textContent = hit >= 0
        ? "Measured at λ = " + D.dose.lam[hit] + ": evaluation rate " + fmt(D.dose.eval[hit], 3) + ", deployment rate " + fmt(D.dose.deploy[hit], 3) + ", gap " + fmt(D.dose.gap[hit], 3) + "."
        : "The geometry is exact for every λ; behavior was measured only at λ = 0, 0.5, 1, and 2.";
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } playBtn.textContent = "Play"; }
    function frame(t) {
      var dt = (t - last) / 1000; last = t; var nx = lam + dt * 0.4;
      if (nx >= 2) { set(2); raf = null; playBtn.textContent = "Replay"; return; }
      set(nx); raf = requestAnimationFrame(frame);
    }
    playBtn.addEventListener("click", function () { if (raf) { stop(); } else { set(0); playBtn.textContent = "Pause"; last = performance.now(); raf = requestAnimationFrame(frame); } });
    slider.addEventListener("input", function () { stop(); set(+slider.value); });
    stops.forEach(function (b) { b.addEventListener("click", function () { stop(); set(+b.getAttribute("data-stop")); }); });
    set(0);
  }

  document.addEventListener("DOMContentLoaded", function () { depthFigure(); interventionFigure(); });
})();
