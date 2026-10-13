/* Theme toggle, figure tabs, copy buttons. */
(function () {
  "use strict";
  var root = document.documentElement, KEY = "routing-theme";
  var modes = ["auto", "light", "dark"], mode = "auto";
  try { var saved = localStorage.getItem(KEY); if (modes.indexOf(saved) >= 0) { mode = saved; } } catch (e) {}
  var btn = document.getElementById("theme-toggle");
  function apply() {
    if (mode === "auto") { root.removeAttribute("data-theme"); } else { root.setAttribute("data-theme", mode); }
    if (btn) { btn.textContent = "Theme: " + mode; btn.setAttribute("aria-label", "Color theme: " + mode + ". Activate to change."); }
  }
  apply();
  if (btn) {
    btn.addEventListener("click", function () {
      mode = modes[(modes.indexOf(mode) + 1) % modes.length]; apply();
      try { localStorage.setItem(KEY, mode); } catch (e) {}
    });
  }

  var tabs = document.querySelectorAll("#gallery [role=tab]");
  function select(t) {
    tabs.forEach(function (o) {
      var on = o === t;
      o.setAttribute("aria-selected", on ? "true" : "false"); o.tabIndex = on ? 0 : -1;
      document.getElementById(o.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
      if (j >= 0) { j = (j + tabs.length) % tabs.length; select(tabs[j]); tabs[j].focus(); e.preventDefault(); }
    });
  });
  if (tabs.length) { select(tabs[0]); }

  document.querySelectorAll(".codebox").forEach(function (box) {
    var b = box.querySelector(".copy"), code = box.querySelector("code");
    if (!b || !code) { return; }
    b.addEventListener("click", function () {
      var text = code.textContent.trim();
      function done() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(ta);
      }
    });
  });
})();
