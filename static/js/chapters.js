/* Chapter cards with live thumbnails drawn from the stored data (ROUTING_DATA, EXAMPLES). */
(function () {
  "use strict";
  var host = document.getElementById("chapter-cards");
  if (!host || !window.ROUTING_DATA) { return; }
  var D = window.ROUTING_DATA, E = window.EXAMPLES, NS = "http://www.w3.org/2000/svg";
  function S(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) { e.setAttribute(k, a[k]); } p.appendChild(e); return e; }
  var cards = [
    ["depth", "1", "The two framings split inside a four-layer window"],
    ["audit", "2", "One fitted direction, moved on held-out prompts"],
    ["examples", "3", "The question stays fixed and only the wrapper changes"],
    ["results", "4", "Ten of twelve gaps shrink and four close"],
    ["controls", "5", "Random directions never close the gap"]
  ];
  cards.forEach(function (c, k) {
    var a = document.createElement("a"); a.className = "ch-card"; a.href = "#" + c[0];
    a.innerHTML = '<div class="n">Chapter ' + c[1] + '</div><div class="t"></div>';
    a.querySelector(".t").textContent = c[2];
    var svg = S("svg", { viewBox: "0 0 160 62", preserveAspectRatio: "none", "aria-hidden": "true" }, a);
    if (k === 0) {
      var w = D.depth.window, n = w.layer.length, lo = -5, hi = 2.5;
      function line(arr, col) { var d = arr.map(function (v, i) { return (i ? "L" : "M") + (4 + i * 152 / (n - 1)).toFixed(1) + " " + (4 + (hi - v) / (hi - lo) * 54).toFixed(1); }).join(""); S("path", { d: d, fill: "none", stroke: col, "stroke-width": 1.5 }, svg); }
      var x0 = 4 + 14 * 152 / (n - 1), x1 = 4 + 17 * 152 / (n - 1);
      S("rect", { x: x0, y: 2, width: x1 - x0, height: 58, fill: "var(--accent-soft)" }, svg);
      line(w.eval, "var(--eval)"); line(w.deploy, "var(--depl)");
    }
    if (k === 1) {
      D.dose.lam.forEach(function (l, i) { var h = D.dose.eval[i] * 110; S("rect", { x: 10 + i * 36, y: 58 - h, width: 22, height: h, fill: "var(--eval)" }, svg); });
      var y = 58 - D.dose.deploy[0] * 110; S("line", { x1: 4, x2: 156, y1: y, y2: y, stroke: "var(--depl)", "stroke-width": 1.5 }, svg);
    }
    if (k === 2 && E && E.grid) {
      var cnt = E.grid.counts, order = E.grid.order, cols = { restored: "var(--accent)", homogenized: "var(--depl)", persistent: "var(--eval)", mixed: "var(--muted)", no_gap: "var(--line)" }, i = 0;
      order.forEach(function (g) { for (var j = 0; j < (cnt[g] || 0); j++) { var cx = i % 25, cy = Math.floor(i / 25); S("rect", { x: 3 + cx * 6.2, y: 3 + cy * 7, width: 5, height: 6, fill: cols[g] || "var(--muted)" }, svg); i++; } });
    }
    if (k === 3) {
      D.matrix.forEach(function (m, i) { var y = 4 + i * 4.8, sx = function (v) { return 10 + (v + 0.1) / 1 * 140; };
        S("line", { x1: sx(m.after), x2: sx(m.before), y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1.2 }, svg);
        S("circle", { cx: sx(m.before), cy: y, r: 1.8, fill: "none", stroke: "var(--ink-2)", "stroke-width": 0.8 }, svg);
        S("circle", { cx: sx(m.after), cy: y, r: 1.8, fill: "var(--accent)" }, svg); });
    }
    if (k === 4) {
      var sx = function (v) { return 20 + (v + 0.1) / 0.8 * 130; };
      S("line", { x1: sx(0), x2: sx(0), y1: 2, y2: 60, stroke: "var(--muted)", "stroke-dasharray": "2 2" }, svg);
      D.controls.forEach(function (c, i) { var y = 4 + i * 4.8;
        c.random.forEach(function (r) { S("circle", { cx: sx(r), cy: y, r: 1.2, fill: "var(--muted)" }, svg); });
        S("circle", { cx: sx(c.learned), cy: y, r: 2, fill: "var(--accent)" }, svg); });
    }
    host.appendChild(a);
  });
})();
/* Highlight the chapter in view in the top navigation. */
(function () {
  "use strict";
  var links = Array.prototype.slice.call(document.querySelectorAll(".topnav a"));
  if (!links.length) { return; }
  function spy() {
    var cur = null;
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute("href")); if (t && t.getBoundingClientRect().top < 140) { cur = a; } });
    links.forEach(function (a) { a.classList.toggle("on", a === cur); });
    if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) { var nav = cur.parentNode, l = cur.offsetLeft - 16; if (Math.abs(nav.scrollLeft - l) > 30) { nav.scrollLeft = l; } }
  }
  window.addEventListener("scroll", spy, { passive: true }); spy();
})();
