/* Animated versions of the paper's figures: path patching, dose response and controls, and the routing-coordinate schematic.
   Vanilla JS, SVG built in the DOM. Numbers come from paper-data.js, which make_paper_data.py evaluates from the paper's own
   figure script. Colors are the page's CSS variables: blue = evaluation framing (--eval), orange = ordinary-use framing (--depl). */
(function () {
  "use strict";
  var P = window.PAPER_DATA;
  if (!P) { return; }
  var NS = "http://www.w3.org/2000/svg";
  var EVAL = "var(--eval)", DEPL = "var(--depl)", OK = "var(--ok)", INK = "var(--ink)", MUTED = "var(--muted)", GRID = "var(--line)", BG = "var(--surface)", CTRL = "var(--muted)";
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
  function dL(parent, x, y, attrs, pre, post) {
    var a = { x: x, y: y, "font-size": 14, fill: INK, "font-style": "italic" };
    for (var k in attrs) { a[k] = attrs[k]; }
    var t = el("text", a, parent);
    var s0 = el("tspan", {}, t); s0.textContent = (pre || "") + "d";
    var s1 = el("tspan", { "font-size": (a["font-size"] * 0.7), dy: 3, "font-style": "normal" }, t); s1.textContent = "L";
    if (post) { var s2 = el("tspan", { dy: -3 }, t); s2.textContent = post; }
    return t;
  }
  function fmt(v, d) { return v.toFixed(d === undefined ? 2 : d).replace("-", "−"); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function follow(cur, target, dt, tau) { return reduce ? target : target + (cur - target) * Math.exp(-dt / tau); }

  var ICON_PAUSE = '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="0.5"/><rect x="9" y="3" width="3" height="10" rx="0.5"/></svg>';
  var ICON_PLAY = '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z"/></svg>';
  var ICON_REPLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3a5 5 0 1 0 4.6 3H11a3.5 3.5 0 1 1-3-1.9V7l3.5-3L8 1z"/></svg>';

  /* Shell: svg, play / replay, scrubber, annotation strip. Returns handles. */
  function shell(root, o) {
    var ticks = (o.ticks || []).map(function (t) { return '<span style="left:' + t.at * 100 + '%"' + (t.label ? "" : ' class="dot"') + ">" + (t.label || "") + "</span>"; }).join("");
    root.innerHTML =
      '<div class="svgbox"><svg viewBox="0 0 ' + o.W + " " + o.H + '" role="img" aria-label="' + o.label + '"></svg></div>' +
      (o.chips ? '<div class="chips pf-chips" role="group" aria-label="' + o.chipsLabel + '">' + o.chips.map(function (c, i) { return '<button type="button" class="chip" data-i="' + i + '">' + c + "</button>"; }).join("") + "</div>" : "") +
      '<div class="bench-ctl"><button type="button" class="rbtn" data-play data-state="playing" aria-pressed="true" aria-label="Pause">' + ICON_PAUSE + ICON_PLAY + "</button>" +
      '<button type="button" class="rbtn" data-replay aria-label="Replay from the start">' + ICON_REPLAY + "</button>" +
      '<div class="scrub"><input type="range" min="' + o.min + '" max="' + o.max + '" step="0.01" value="' + o.min + '" aria-label="' + o.sliderLabel + '"><div class="scrub-ticks" aria-hidden="true">' + ticks + "</div></div></div>" +
      '<div class="bench-note" aria-live="polite">' + o.rows.map(function (r, i) { return '<div class="row"><span class="k">' + r + '</span><span class="v" data-r="' + i + '"></span></div>'; }).join("") + "</div>";
    var h = {
      svg: root.querySelector("svg"), play: root.querySelector("[data-play]"), replay: root.querySelector("[data-replay]"),
      slider: root.querySelector("input[type=range]"), chips: root.querySelectorAll(".pf-chips .chip"),
      rows: root.querySelectorAll("[data-r]"),
      clear: function () { while (h.svg.firstChild) { h.svg.removeChild(h.svg.firstChild); } },
      say: function (i, s) { if (h.rows[i].textContent !== s) { h.rows[i].textContent = s; } },
      playing: function (on) { h.play.dataset.state = on ? "playing" : "paused"; h.play.setAttribute("aria-pressed", String(on)); h.play.setAttribute("aria-label", on ? "Pause" : "Play"); }
    };
    return h;
  }

  /* One frame loop per figure: runs only while visible and moving. */
  function runner(root, step) {
    var frame = 0, last = 0, visible = false;
    function tick(now) {
      var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
      var more = step(dt);
      frame = visible && more ? requestAnimationFrame(tick) : 0;
    }
    function wake() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
    new IntersectionObserver(function (e) { visible = e[e.length - 1].isIntersecting; if (visible) { wake(); } }, { rootMargin: "120px 0px" }).observe(root);
    return { wake: wake };
  }

  /* Axes helper: left axis with ticks and an optional label. */
  function axisY(svg, x, y0, y1, ys, vals, f, label) {
    el("line", { x1: x, y1: y0, x2: x, y2: y1, stroke: GRID }, svg);
    vals.forEach(function (v) {
      el("line", { x1: x - 4, y1: ys(v), x2: x, y2: ys(v), stroke: MUTED }, svg);
      txt(svg, x - 8, ys(v) + 4, f(v), { "text-anchor": "end", fill: MUTED, "font-size": 11 });
    });
    if (label) { txt(svg, 0, 0, label, { transform: "translate(" + (x - 40) + "," + (y0 + y1) / 2 + ") rotate(-90)", "text-anchor": "middle", fill: MUTED, "font-size": 12 }); }
  }

  /* ============================================================ 1. Path patching */
  function patchFigure() {
    var root = document.getElementById("pf-patch");
    if (!root) { return; }
    var bars = P.G2B_SINGLE.concat(P.G2B_WINDOW).map(function (b, i) {
      var sets = [[14], [15], [16], [17], [14, 15, 16], [14, 15, 16, 17], [12, 13, 14, 15, 16, 17]];
      return { name: b[0].replace("-", "–"), v: b[1], num: Math.round(b[1] * 17), win: i >= 4, set: sets[i] };
    });
    var fams = P.FAMILIES.map(function (f) { return { name: f[0], win: f[1].replace("-", "–"), rec: f[2], depth: f[3] }; });
    var NB = bars.length, NF = fams.length, N = NB + NF - 1;
    var ticks = []; for (var i = 0; i <= N; i++) { ticks.push({ at: i / N }); }
    var h = shell(root, {
      W: 760, H: 312, min: 0, max: N, ticks: ticks, rows: ["patched", "recovery", "reading"],
      label: "Path-patching recovery. Left, bars for Gemma-2-2B single layers and contiguous windows of layers; the window L14 to L17 recovers 0.94 of the installed gap. Right, recovery fractions of five models against the relative depth of their routing window.",
      sliderLabel: "Step through the patched layer sets, then the five models"
    });
    var t = 0, target = 0, playing = !reduce, hold = 0, idle = 0;
    var ax = { x0: 78, ys: function (v) { return 252 - (v + 0.2) / 1.5 * 176; } };
    var bx = { x0: 478, x1: 735, xs: function (d) { return 478 + (d - 0.4) / 0.38 * 257; }, ys: function (v) { return 252 - (v - 0.4) / 0.8 * 176; } };

    function draw() {
      h.clear();
      var svg = h.svg, a = clamp(Math.round(t), 0, N), ab = Math.min(a, NB - 1);
      txt(svg, 78, 18, "(a) Gemma-2-2B sandbagging: layer versus window", { "font-weight": 600, "font-size": 13 });
      txt(svg, 478, 18, "(b) sandbagging, five models", { "font-weight": 600, "font-size": 13 });
      /* layer ribbon: which layers are patched into the fine-tuned model */
      txt(svg, 78, 42, "layers patched", { fill: MUTED, "font-size": 11 });
      for (var L = 12; L <= 17; L++) {
        var on = a < NB && bars[ab].set.indexOf(L) >= 0;
        el("rect", { x: 160 + (L - 12) * 34, y: 31, width: 30, height: 15, rx: 3, fill: on ? EVAL : "none", "fill-opacity": on ? 0.9 : 1, stroke: on ? EVAL : GRID }, svg);
        txt(svg, 175 + (L - 12) * 34, 42, "L" + L, { "text-anchor": "middle", "font-size": 10, fill: on ? "var(--bg)" : MUTED });
      }
      /* panel a: axes, 1.0 line, bars */
      axisY(svg, ax.x0, 66, 252, ax.ys, [0, 0.25, 0.5, 0.75, 1, 1.25], function (v) { return fmt(v); }, "recovery fraction");
      el("line", { x1: ax.x0, y1: ax.ys(0), x2: 400, y2: ax.ys(0), stroke: MUTED }, svg);
      el("line", { x1: ax.x0, y1: ax.ys(1), x2: 400, y2: ax.ys(1), stroke: MUTED, "stroke-dasharray": "5 4", "stroke-opacity": 0.7 }, svg);
      txt(svg, ax.x0 + 6, ax.ys(1) - 5, "full recovery", { fill: MUTED, "font-size": 10.5 });
      var bw = 34, x = ax.x0 + 16;
      bars.forEach(function (b, i) {
        if (i === 4) { x += 14; el("line", { x1: x - 9, y1: 70, x2: x - 9, y2: 252, stroke: GRID }, svg); }
        var f = ease(t - i + 1), y0 = ax.ys(0), y1 = ax.ys(b.v * f);
        el("rect", { x: x, y: Math.min(y0, y1), width: bw, height: Math.max(0.5, Math.abs(y1 - y0)), rx: 2, fill: b.win ? EVAL : CTRL, "fill-opacity": b.win ? 0.9 : 0.45, stroke: i === a ? INK : "none", "stroke-width": 1.5 }, svg);
        if (f > 0.85) { txt(svg, x + bw / 2, b.v >= 0 ? y1 - 5 : y1 + 14, fmt(b.v), { "text-anchor": "middle", "font-size": 11, fill: INK }); }
        txt(svg, x + bw / 2, 270, b.name, { "text-anchor": "end", "font-size": 11, fill: MUTED, transform: "rotate(-35 " + (x + bw / 2) + " 270)" });
        x += bw + 10;
      });
      txt(svg, 110, 64, "single layer", { fill: MUTED, "font-size": 11, "font-style": "italic" });
      txt(svg, 290, 64, "contiguous window", { fill: EVAL, "font-size": 11, "font-style": "italic" });
      /* panel b: band, axes, points */
      el("rect", { x: bx.xs(0.5), y: 66, width: bx.xs(0.62) - bx.xs(0.5), height: 186, fill: EVAL, "fill-opacity": 0.08 }, svg);
      txt(svg, (bx.xs(0.5) + bx.xs(0.62)) / 2, 80, "depth ≈ 0.55", { "text-anchor": "middle", fill: EVAL, "font-size": 11, "font-style": "italic" });
      axisY(svg, bx.x0, 66, 252, bx.ys, [0.4, 0.6, 0.8, 1.0], function (v) { return fmt(v, 1); }, "recovery fraction");
      el("line", { x1: bx.x0, y1: 252, x2: bx.x1, y2: 252, stroke: GRID }, svg);
      [0.4, 0.5, 0.6, 0.7].forEach(function (v) { el("line", { x1: bx.xs(v), y1: 252, x2: bx.xs(v), y2: 256, stroke: MUTED }, svg); txt(svg, bx.xs(v), 270, fmt(v, 1), { "text-anchor": "middle", fill: MUTED, "font-size": 11 }); });
      txt(svg, (bx.x0 + bx.x1) / 2, 300, "routing-window relative depth", { "text-anchor": "middle", fill: MUTED, "font-size": 12 });
      el("line", { x1: bx.x0, y1: bx.ys(1), x2: bx.x1, y2: bx.ys(1), stroke: MUTED, "stroke-dasharray": "5 4", "stroke-opacity": 0.7 }, svg);
      fams.forEach(function (f, i) {
        var s = ease(t - (NB + i) + 1); if (s <= 0) { return; }
        var cur = a === NB + i, cx = bx.xs(f.depth), cy = bx.ys(f.rec);
        el("circle", { cx: cx, cy: cy, r: (cur ? 8 : 6) * s, fill: EVAL, "fill-opacity": cur ? 1 : 0.7, stroke: BG, "stroke-width": 1.6 }, svg);
        if (cur) {
          var up = f.rec < 0.8 ? 1 : -1;
          txt(svg, cx, cy + (up > 0 ? 24 : -14), f.name, { "text-anchor": cx > 640 ? "end" : "middle", "font-size": 12, "font-weight": 600 });
        }
      });
      /* annotation strip */
      if (a < NB) {
        var b = bars[ab];
        h.say(0, b.name + (b.set.length > 1 ? " (" + b.set.length + " layers together)" : " alone"));
        h.say(1, fmt(b.v) + " of the installed gap  (" + fmt(b.num, 0) + " of 17 gap questions, n = 48)");
        h.say(2, ab === 5 ? "four contiguous layers recover nearly all of it, where no single layer recovers more than 0.35" : ab === 6 ? "two layers earlier overshoots to 1.12" : ab < 4 ? "no single layer carries more than about a third of the gap" : "three layers recover less than half");
      } else {
        var f2 = fams[a - NB];
        h.say(0, f2.name + ", window " + f2.win);
        h.say(1, fmt(f2.rec) + " recovered at relative depth " + fmt(f2.depth));
        h.say(2, f2.rec > 0.9 ? "near-full recovery by a window at about 0.55 depth" : "the window recovers about half; Gemma-2-9B and Qwen-2.5-7B are the partial cases");
      }
      h.slider.value = String(t.toFixed(3));
    }
    function step(dt) {
      if (playing) {
        hold += dt;
        var dwell = target === NB - 1 || target === N ? 3.2 : 1.6;
        if (hold > dwell) { hold = 0; target = target >= N ? 0 : target + 1; if (target === 0) { t = 0; } }
      }
      t = follow(t, target, dt, 0.18);
      if (Math.abs(t - target) < 0.002) { t = target; }
      draw();
      return playing || t !== target;
    }
    var run = runner(root, step);
    h.play.addEventListener("click", function () { playing = !playing; h.playing(playing); hold = 0; run.wake(); });
    h.replay.addEventListener("click", function () { t = target = 0; playing = true; h.playing(true); hold = 0; run.wake(); draw(); });
    h.slider.addEventListener("input", function () { playing = false; h.playing(false); target = Math.round(parseFloat(h.slider.value)); t = parseFloat(h.slider.value); run.wake(); draw(); });
    if (reduce) { h.playing(false); }
    draw();
  }

  /* ============================================================ 2. Dose response and controls */
  function doseFigure() {
    var root = document.getElementById("pf-dose");
    if (!root) { return; }
    var X = P.DOSE_X, REM = P.DOSE_REM, ADD = P.DOSE_ADD, CLP = P.DOSE_CLAMP, CTL = P.CTL_LAM1, SPEC = P.SPEC, GEO = P.GEO;
    var STAGES = ["Dose response", "Controls at λ = 1", "Semantic specificity", "Direction norms"];
    var h = shell(root, {
      W: 760, H: 340, min: 0, max: 2, chips: STAGES, chipsLabel: "Panels of the dose-response figure", rows: ["panel", "reading", "note"],
      ticks: X.map(function (x) { return { at: x / 2, label: String(x) }; }),
      label: "Dose response and matched controls on the Gemma-2-2B sandbagging primary cell: gap against dose for the remove, joint and add arms; gap at dose 1 for the learned direction and four controls; evaluation accuracy after remove for the routing direction and four semantic directions; direction norms of base and fine-tuned models.",
      sliderLabel: "Dose lambda, in the first panel"
    });
    var stage = 0, lam = 0, lamT = 0, p = 0, playing = !reduce, hold = 0, sweep = true;
    function interp(arr, l) {
      for (var i = 0; i < X.length - 1; i++) { if (l <= X[i + 1] + 1e-9) { return lerp(arr[i], arr[i + 1], (l - X[i]) / (X[i + 1] - X[i])); } }
      return arr[arr.length - 1];
    }
    function curve(svg, xs, ys, arr, col, shape, upTo) {
      var pts = [];
      for (var i = 0; i < X.length; i++) { if (X[i] <= upTo + 1e-9) { pts.push([xs(X[i]), ys(arr[i])]); } }
      var last = pts[pts.length - 1];
      if (upTo < 2 && last && upTo > X.filter(function (x) { return x <= upTo + 1e-9; }).pop()) { pts.push([xs(upTo), ys(interp(arr, upTo))]); }
      el("polyline", { points: pts.map(function (q) { return q.join(","); }).join(" "), fill: "none", stroke: col, "stroke-width": 2.4, "stroke-linejoin": "round" }, svg);
      for (var j = 0; j < X.length; j++) {
        if (X[j] > upTo + 1e-9) { continue; }
        var cx = xs(X[j]), cy = ys(arr[j]);
        if (shape === "c") { el("circle", { cx: cx, cy: cy, r: 5, fill: col, stroke: BG, "stroke-width": 1.5 }, svg); }
        else if (shape === "t") { el("polygon", { points: [cx, cy - 6, cx + 6, cy + 5, cx - 6, cy + 5].join(","), fill: col, stroke: BG, "stroke-width": 1.5 }, svg); }
        else { el("rect", { x: cx - 5, y: cy - 5, width: 10, height: 10, fill: col, stroke: BG, "stroke-width": 1.5 }, svg); }
      }
    }
    function hbars(svg, rows, scale, x0, x1, base, baseLabel, hiFirst) {
      var rowH = 38, top = 66;
      el("line", { x1: x0, y1: top - 8, x2: x0, y2: top + rows.length * rowH, stroke: MUTED }, svg);
      if (base !== null) {
        el("line", { x1: scale(base), y1: top - 12, x2: scale(base), y2: top + rows.length * rowH - 4, stroke: INK, "stroke-dasharray": "5 4", "stroke-opacity": 0.55 }, svg);
        txt(svg, scale(base), top - 18, baseLabel, { "text-anchor": "middle", fill: MUTED, "font-size": 11, "font-style": "italic" });
      }
      rows.forEach(function (r, i) {
        var s = ease(p * 1.6 - i * 0.12), y = top + i * rowH, w = Math.max(0, (scale(r.v) - x0) * s);
        txt(svg, x0 - 10, y + 17, r.label, { "text-anchor": "end", fill: r.hi ? INK : MUTED, "font-size": 13, "font-weight": r.hi ? 600 : 400 });
        el("rect", { x: x0, y: y, width: w, height: 24, rx: 2, fill: r.hi ? EVAL : CTRL, "fill-opacity": r.hi ? 0.9 : 0.45 }, svg);
        if (s > 0.9) { txt(svg, x0 + w + 8, y + 17, r.fmt, { "font-size": 12 }); }
      });
    }
    function draw() {
      h.clear();
      var svg = h.svg;
      Array.prototype.forEach.call(h.chips, function (c, i) { c.classList.toggle("is-active", i === stage); });
      h.slider.disabled = stage !== 0;
      root.classList.toggle("pf-noscrub", stage !== 0);
      if (stage === 0) {
        var Lx = { x0: 90, x1: 350 }, Rx = { x0: 440, x1: 700 };
        var ysc = function (v) { return 262 - (v + 0.03) / 0.33 * 200; };
        var xl = function (x) { return Lx.x0 + (x / 2) * (Lx.x1 - Lx.x0); }, xr = function (x) { return Rx.x0 + (x / 2) * (Rx.x1 - Rx.x0); };
        txt(svg, 90, 22, "(a) dose response, Gemma-2-2B sandbagging, L14–L17", { "font-weight": 600, "font-size": 13 });
        axisY(svg, 90, 56, 262, ysc, [0, 0.05, 0.1, 0.15, 0.2, 0.25], function (v) { return fmt(v); }, "evaluation/deployment gap");
        [[Lx, xl, "projection dose λ"], [Rx, xr, "multiple of the raw direction d_L"]].forEach(function (pn) {
          var pa = pn[0], xs = pn[1];
          el("line", { x1: pa.x0, y1: ysc(0), x2: pa.x1, y2: ysc(0), stroke: MUTED, "stroke-opacity": 0.6 }, svg);
          el("line", { x1: pa.x0, y1: ysc(REM[0]), x2: pa.x1, y2: ysc(REM[0]), stroke: INK, "stroke-dasharray": "5 4", "stroke-opacity": 0.5 }, svg);
          X.forEach(function (x) { el("line", { x1: xs(x), y1: 262, x2: xs(x), y2: 267, stroke: MUTED }, svg); txt(svg, xs(x), 282, x === 0.5 ? ".5" : String(x), { "text-anchor": "middle", fill: MUTED, "font-size": 11 }); });
          txt(svg, (pa.x0 + pa.x1) / 2, 306, pn[2], { "text-anchor": "middle", fill: MUTED, "font-size": 12 });
          el("line", { x1: xs(lam), y1: 56, x2: xs(lam), y2: 262, stroke: INK, "stroke-opacity": 0.18 }, svg);
        });
        txt(svg, Lx.x0 + 6, ysc(REM[0]) - 6, "baseline gap", { fill: MUTED, "font-size": 11, "font-style": "italic" });
        curve(svg, xl, ysc, REM, EVAL, "c", lam);
        curve(svg, xl, ysc, CLP, OK, "t", lam);
        curve(svg, xr, ysc, ADD, DEPL, "s", lam);
        txt(svg, Lx.x1 - 4, ysc(0.075), "remove eval.", { "text-anchor": "end", fill: EVAL, "font-size": 12, "font-weight": 600 });
        txt(svg, Lx.x1 - 4, ysc(0.045), "joint", { "text-anchor": "end", fill: OK, "font-size": 12, "font-weight": 600 });
        txt(svg, Rx.x1 - 4, ysc(0.075), "add on deployment", { "text-anchor": "end", fill: DEPL, "font-size": 12, "font-weight": 600 });
        var exact = X.indexOf(Math.round(lam * 100) / 100) >= 0;
        h.say(0, "(a) dose response");
        h.say(1, "λ = " + fmt(lam) + "   remove " + fmt(interp(REM, lam), 3) + ",  joint " + fmt(interp(CLP, lam), 3) + ",  add " + fmt(interp(ADD, lam), 3));
        h.say(2, exact ? "measured dose" : "straight line between the measured doses 0, 0.5, 1 and 2");
        h.slider.value = String(lam.toFixed(3));
      } else if (stage === 1) {
        txt(svg, 90, 22, "(b) gap at λ = 1, Gemma-2-2B sandbagging", { "font-weight": 600, "font-size": 13 });
        var sc1 = function (v) { return 200 + (v + 0.04) / 0.41 * 480; };
        hbars(svg, CTL.map(function (r) { return { label: r[0].replace(/\$/g, ""), v: r[1], hi: r[2] === "model", fmt: "+" + fmt(r[1]) }; }), sc1, 200, 690, REM[0], "baseline gap " + fmt(REM[0], 3), true);
        [0, 0.1, 0.2, 0.3].forEach(function (v) { el("line", { x1: sc1(v), y1: 252, x2: sc1(v), y2: 257, stroke: MUTED }, svg); txt(svg, sc1(v), 272, fmt(v, 1), { "text-anchor": "middle", fill: MUTED, "font-size": 11 }); });
        txt(svg, 445, 300, "gap at λ = 1", { "text-anchor": "middle", fill: MUTED, "font-size": 12 });
        h.say(0, "(b) matched-dose controls");
        h.say(1, "learned direction: " + fmt(CTL[1][1], 3) + " (remove), " + fmt(CTL[0][1], 3) + " (joint)");
        h.say(2, "random direction " + fmt(CTL[2][1], 3) + ", non-routing L6 " + fmt(CTL[3][1], 3) + ", non-routing L22 " + fmt(CTL[4][1], 3) + ": the gap stays near baseline");
      } else if (stage === 2) {
        txt(svg, 90, 22, "(c) semantic specificity, evaluation accuracy after remove at λ = 2", { "font-weight": 600, "font-size": 13 });
        var sc2 = function (v) { return 200 + v / 0.55 * 480; };
        hbars(svg, SPEC.map(function (r, i) { return { label: r[0], v: r[1], hi: i === 0, fmt: fmt(r[1]) }; }), sc2, 200, 690, 0.183, "evaluation baseline 0.18", true);
        [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach(function (v) { el("line", { x1: sc2(v), y1: 252, x2: sc2(v), y2: 257, stroke: MUTED }, svg); txt(svg, sc2(v), 272, fmt(v, 1), { "text-anchor": "middle", fill: MUTED, "font-size": 11 }); });
        txt(svg, 445, 300, "evaluation accuracy after remove at λ = 2", { "text-anchor": "middle", fill: MUTED, "font-size": 12 });
        h.say(0, "(c) semantic controls");
        h.say(1, "routing direction " + fmt(SPEC[0][1]) + "; the four semantic contrasts " + fmt(Math.min(SPEC[1][1], SPEC[2][1], SPEC[3][1], SPEC[4][1])) + " to " + fmt(Math.max(SPEC[1][1], SPEC[2][1], SPEC[3][1], SPEC[4][1])));
        h.say(2, "semantic directions leave evaluation accuracy near its baseline");
      } else {
        txt(svg, 90, 22, "(d) direction norms, base versus fine-tuned", { "font-weight": 600, "font-size": 13 });
        var ylog = function (v) { return 262 - (Math.log10(v) - Math.log10(0.5)) / (Math.log10(85) - Math.log10(0.5)) * 200; };
        [1, 10].forEach(function (v) { el("line", { x1: 90, y1: ylog(v), x2: 700, y2: ylog(v), stroke: GRID, "stroke-dasharray": "3 4" }, svg); txt(svg, 82, ylog(v) + 4, String(v), { "text-anchor": "end", fill: MUTED, "font-size": 11 }); });
        el("line", { x1: 90, y1: 56, x2: 90, y2: 262, stroke: MUTED }, svg);
        txt(svg, 0, 0, "direction norm, log scale", { transform: "translate(40,159) rotate(-90)", "text-anchor": "middle", fill: MUTED, "font-size": 12 });
        var slot = 0, bwid = 26, names = Object.keys(GEO), nTot = 8;
        names.forEach(function (nm, gi) {
          var g = GEO[nm];
          txt(svg, 90 + (slot + 2) * 74, 50, nm, { "text-anchor": "middle", "font-style": "italic", fill: MUTED, "font-size": 12 });
          g.layers.forEach(function (Ln, i) {
            var x = 106 + slot * 74, s = ease(p * 1.5 - slot * 0.08);
            [[g.base[i], CTRL, 0.45, 0], [g.fused[i], EVAL, 0.9, bwid + 3]].forEach(function (b) {
              var top = ylog(0.5 + (b[0] - 0.5) * s);
              el("rect", { x: x + b[3], y: top, width: bwid, height: Math.max(0.5, 262 - top), fill: b[1], "fill-opacity": b[2] }, svg);
            });
            if (s > 0.9) { txt(svg, x + bwid + 1.5, ylog(g.fused[i]) - 6, "×" + fmt(g.fused[i] / g.base[i], 1), { "text-anchor": "middle", "font-size": 11 }); }
            txt(svg, x + bwid + 1.5, 280, Ln, { "text-anchor": "middle", fill: MUTED, "font-size": 11 });
            slot++;
          });
          if (gi === 0) { el("line", { x1: 106 + slot * 74 - 20, y1: 56, x2: 106 + slot * 74 - 20, y2: 262, stroke: GRID }, svg); }
        });
        el("rect", { x: 300, y: 296, width: 12, height: 12, fill: CTRL, "fill-opacity": 0.45 }, svg); txt(svg, 318, 306, "base", { "font-size": 12, fill: MUTED });
        el("rect", { x: 380, y: 296, width: 12, height: 12, fill: EVAL, "fill-opacity": 0.9 }, svg); txt(svg, 398, 306, "fine-tuned", { "font-size": 12, fill: MUTED });
        var r0 = GEO["Gemma-2-2B"], rg = r0.fused.map(function (v, i) { return v / r0.base[i]; }), r1 = GEO["Phi-3-mini"], rp = r1.fused.map(function (v, i) { return v / r1.base[i]; });
        h.say(0, "(d) direction norms");
        h.say(1, "Gemma-2-2B L14–L17: " + fmt(Math.min.apply(null, rg), 1) + "× to " + fmt(Math.max.apply(null, rg), 1) + "×;  Phi-3-mini L18–L21: " + fmt(Math.min.apply(null, rp), 1) + "× to " + fmt(Math.max.apply(null, rp), 1) + "×");
        h.say(2, "the fitted direction is several times larger in the fine-tuned model than in the base model");
      }
    }
    function go(i) { stage = i; p = 0; hold = 0; if (i === 0) { lam = 0; lamT = 0; sweep = true; } run.wake(); }
    function step(dt) {
      p = follow(p, 1, dt, 0.35); if (p > 0.999) { p = 1; }
      if (stage === 0) {
        if (playing && sweep) { lamT = clamp(lamT + dt * 0.5, 0, 2); if (lamT >= 2) { sweep = false; hold = 0; } }
        lam = follow(lam, lamT, dt, 0.08); if (Math.abs(lam - lamT) < 0.001) { lam = lamT; }
      }
      if (playing && (stage !== 0 || !sweep)) { hold += dt; if (hold > (stage === 0 ? 2.2 : 4.2)) { go((stage + 1) % STAGES.length); } }
      draw();
      return playing || p < 1 || lam !== lamT;
    }
    var run = runner(root, step);
    Array.prototype.forEach.call(h.chips, function (c) { c.addEventListener("click", function () { playing = false; h.playing(false); go(parseInt(c.dataset.i, 10)); if (stage === 0) { lamT = 2; lam = 2; sweep = false; } }); });
    h.play.addEventListener("click", function () { playing = !playing; h.playing(playing); hold = 0; if (playing && stage === 0 && lamT >= 2) { sweep = false; } run.wake(); });
    h.replay.addEventListener("click", function () { playing = true; h.playing(true); go(0); });
    h.slider.addEventListener("input", function () { playing = false; h.playing(false); sweep = false; lamT = parseFloat(h.slider.value); lam = lamT; run.wake(); draw(); });
    if (reduce) { h.playing(false); lamT = lam = 2; sweep = false; }
    draw();
  }

  /* ============================================================ 3. Routing-coordinate schematic */
  function geometryFigure() {
    var root = document.getElementById("pf-geo");
    if (!root) { return; }
    var G = P.geometry, E = G.E, D = G.D, d = G.d_hat, m = G.m, SC = G.scale;
    var STAGES = ["(a) two clusters", "(b) remove evaluation", "(c) add ordinary use", "(d) joint intervention"];
    var h = shell(root, {
      W: 760, H: 340, min: 0, max: 1, chips: STAGES, chipsLabel: "Stages of the schematic", rows: ["stage", "operation", "reading"],
      ticks: [{ at: 0, label: "0" }, { at: 0.5, label: "0.5" }, { at: 1, label: "1" }],
      label: "Schematic of the routing-coordinate audit on synthetic points. Evaluation-framed points (blue) and ordinary-use points (orange) separate along a fitted direction. Removing the evaluation coordinate moves the blue cluster toward orange, adding the ordinary-use coordinate moves orange toward blue, and the joint intervention sets the coordinate of both to the midpoint.",
      sliderLabel: "Strength lambda of the intervention in the current stage"
    });
    var X0 = -0.45, X1 = 3.95, Y0 = -0.3, Y1 = 3.0, left = 30, right = 730, top = 22, bot = 296;
    var sx = function (x) { return left + (x - X0) / (X1 - X0) * (right - left); }, sy = function (y) { return bot - (y - Y0) / (Y1 - Y0) * (bot - top); };
    var stage = 0, a = { rem: 0, add: 0, joint: 0 }, tg = { rem: 0, add: 0, joint: 0 }, lamS = 1, playing = !reduce, hold = 0;
    function proj(pt, l) { var c = ((m[0] - pt[0]) * d[0] + (m[1] - pt[1]) * d[1]) * l; return [pt[0] + c * d[0], pt[1] + c * d[1]]; }
    function pointsE() { return E.map(function (q) { var s = a.rem * G.sigma_e * SC; var r = [q[0] - s * d[0], q[1] - s * d[1]]; return proj(r, a.joint); }); }
    function pointsD() { return D.map(function (q) { var s = a.add * G.sigma_d * SC; var r = [q[0] + s * d[0], q[1] + s * d[1]]; return proj(r, a.joint); }); }
    function setStage(i) {
      stage = i; hold = 0;
      tg = { rem: i === 1 ? 1 : 0, add: i === 2 ? 1 : 0, joint: i === 3 ? 1 : 0 };
      lamS = 1; h.slider.value = "1";
    }
    function draw() {
      h.clear(); var svg = h.svg;
      Array.prototype.forEach.call(h.chips, function (c, i) { c.classList.toggle("is-active", i === stage); });
      el("line", { x1: sx(-0.3), y1: sy(0.1), x2: sx(3.75), y2: sy(0.1), stroke: MUTED, "stroke-opacity": 0.7 }, svg);
      dL(svg, sx(3.78), sy(0.1) + 4, { fill: MUTED, "font-size": 15, "font-weight": 600 });
      var moved = a.rem + a.add + a.joint > 0.01;
      /* ghosts of the pre-intervention clusters */
      if (moved) { E.concat(D).forEach(function (q) { el("circle", { cx: sx(q[0]), cy: sy(q[1]), r: 3.4, fill: MUTED, "fill-opacity": 0.22 }, svg); }); }
      var pe = pointsE(), pd = pointsD();
      D.forEach(function (_, i) { el("circle", { cx: sx(pd[i][0]), cy: sy(pd[i][1]), r: 3.6, fill: DEPL, "fill-opacity": 0.75, stroke: BG, "stroke-width": 0.5 }, svg); });
      E.forEach(function (_, i) { el("circle", { cx: sx(pe[i][0]), cy: sy(pe[i][1]), r: 3.6, fill: EVAL, "fill-opacity": 0.75, stroke: BG, "stroke-width": 0.5 }, svg); });
      var me = G.mu_e, md = G.mu_d;
      /* joint: the suppressed coordinate */
      if (a.joint > 0.02) {
        el("line", { x1: sx(m[0]), y1: sy(2.85), x2: sx(m[0]), y2: sy(-0.1), stroke: OK, "stroke-width": 1.8, "stroke-dasharray": "6 4", "stroke-opacity": a.joint * 0.85 }, svg);
        dL(svg, sx(m[0]) + 8, sy(0.45), { fill: OK, "font-size": 14, "fill-opacity": a.joint }, "⟨h, ", "⟩ → 0");
      }
      /* stage (a): means, d_L, midpoint */
      var base = 1 - Math.max(a.rem, a.add, a.joint);
      if (base > 0.02) {
        var g = el("g", { opacity: base }, svg);
        el("line", { x1: sx(md[0]), y1: sy(md[1]), x2: sx(me[0]) - 12, y2: sy(me[1]), stroke: INK, "stroke-width": 3 }, g);
        el("polygon", { points: [sx(me[0]) - 4, sy(me[1]), sx(me[0]) - 18, sy(me[1]) - 8, sx(me[0]) - 18, sy(me[1]) + 8].join(","), fill: INK }, g);
        el("circle", { cx: sx(md[0]), cy: sy(md[1]), r: 8, fill: DEPL, stroke: BG, "stroke-width": 1.5 }, g);
        el("circle", { cx: sx(me[0]), cy: sy(me[1]), r: 8, fill: EVAL, stroke: BG, "stroke-width": 1.5 }, g);
        el("polygon", { points: [sx(m[0]), sy(m[1]) - 9, sx(m[0]) + 9, sy(m[1]), sx(m[0]), sy(m[1]) + 9, sx(m[0]) - 9, sy(m[1])].join(","), fill: OK, stroke: BG, "stroke-width": 1.5 }, g);
        dL(g, (sx(md[0]) + sx(me[0])) / 2, sy(me[1]) - 40, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        txt(g, sx(md[0]) - 22, sy(md[1]) - 46, "μ dep", { "text-anchor": "end", fill: DEPL, "font-size": 14, "font-weight": 600 });
        txt(g, sx(me[0]) + 28, sy(me[1]) - 46, "μ eval", { fill: EVAL, "font-size": 14, "font-weight": 600 });
        el("line", { x1: sx(m[0]), y1: sy(m[1]) + 10, x2: sx(m[0]), y2: sy(0.62), stroke: OK }, g);
        txt(g, sx(m[0]), sy(0.4), "0", { "text-anchor": "middle", fill: OK, "font-size": 20, "font-style": "italic", "font-weight": 700 });
      }
      /* stage (b) / (c): the shift arrows */
      if (a.rem > 0.02) {
        var x1 = me[0], x2 = me[0] - a.rem * G.sigma_e * SC * d[0];
        el("line", { x1: sx(x1), y1: sy(2.55), x2: sx(x2) + 8, y2: sy(2.55), stroke: EVAL, "stroke-width": 2, "stroke-opacity": Math.min(1, a.rem * 2) }, svg);
        el("polygon", { points: [sx(x2), sy(2.55), sx(x2) + 11, sy(2.55) - 6, sx(x2) + 11, sy(2.55) + 6].join(","), fill: EVAL, "fill-opacity": Math.min(1, a.rem * 2) }, svg);
        dL(svg, (sx(x1) + sx(x2)) / 2, sy(2.55) - 12, { "text-anchor": "middle", fill: EVAL, "font-size": 15, "font-weight": 600 }, "−λ σ ");
      }
      if (a.add > 0.02) {
        var y1 = md[0], y2 = md[0] + a.add * G.sigma_d * SC * d[0];
        el("line", { x1: sx(y1), y1: sy(0.62), x2: sx(y2) - 8, y2: sy(0.62), stroke: DEPL, "stroke-width": 2, "stroke-opacity": Math.min(1, a.add * 2) }, svg);
        el("polygon", { points: [sx(y2), sy(0.62), sx(y2) - 11, sy(0.62) - 6, sx(y2) - 11, sy(0.62) + 6].join(","), fill: DEPL, "fill-opacity": Math.min(1, a.add * 2) }, svg);
        dL(svg, (sx(y1) + sx(y2)) / 2, sy(0.62) + 22, { "text-anchor": "middle", fill: DEPL, "font-size": 15, "font-weight": 600 }, "+λ σ ");
      }
      var pc = function (arr, off) { return arr.reduce(function (s, q) { return s + (q[0] - m[0]) * d[0] + (q[1] - m[1]) * d[1]; }, 0) / arr.length; };
      var ce = pc(pe), cd = pc(pd);
      h.say(0, STAGES[stage]);
      h.say(1, ["the fitted direction d_L runs from the ordinary-use mean to the evaluation mean; its midpoint is the target 0",
        "the evaluation coordinate moves by −λ·σ·d̂_L (λ = " + fmt(lamS) + "), toward the ordinary-use cluster",
        "the ordinary-use coordinate moves by +λ·σ·d̂_L (λ = " + fmt(lamS) + "), toward the evaluation cluster",
        "both framings are projected to the midpoint coordinate (λ = " + fmt(lamS) + "); the two clusters coincide along d̂_L"][stage]);
      h.say(2, "mean coordinate along d̂_L, relative to the midpoint: evaluation " + fmt(ce, 2) + ", ordinary use " + fmt(cd, 2));
    }
    function step(dt) {
      var any = false;
      ["rem", "add", "joint"].forEach(function (k) {
        var tgt = tg[k] * lamS; a[k] = follow(a[k], tgt, dt, 0.3);
        if (Math.abs(a[k] - tgt) < 0.002) { a[k] = tgt; } else { any = true; }
      });
      if (playing) { hold += dt; if (hold > 4.2) { setStage((stage + 1) % STAGES.length); } }
      draw();
      return playing || any;
    }
    var run = runner(root, step);
    Array.prototype.forEach.call(h.chips, function (c) { c.addEventListener("click", function () { playing = false; h.playing(false); setStage(parseInt(c.dataset.i, 10)); run.wake(); }); });
    h.play.addEventListener("click", function () { playing = !playing; h.playing(playing); hold = 0; run.wake(); });
    h.replay.addEventListener("click", function () { playing = true; h.playing(true); a = { rem: 0, add: 0, joint: 0 }; setStage(0); run.wake(); });
    h.slider.addEventListener("input", function () { playing = false; h.playing(false); lamS = parseFloat(h.slider.value); run.wake(); });
    if (reduce) { h.playing(false); }
    draw();
  }

  function init() { patchFigure(); doseFigure(); geometryFigure(); }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
