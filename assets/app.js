/* MC2 rebuild — shared helpers (no dependencies) */
const MC2 = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  let _data = null;

  async function load() {
    if (_data) return _data;
    // data is embedded as window.MC2_DATA (mc2_viz_data.js) so pages work
    // when opened directly from disk (file://), as required for VAST submission.
    if (window.MC2_DATA) { _data = window.MC2_DATA; return _data; }
    const res = await fetch("./mc2_viz_data.json");
    _data = await res.json();
    return _data;
  }

  // svg element factory
  function el(tag, attrs = {}, text) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent, tag, attrs, text) { const n = el(tag, attrs, text); parent.appendChild(n); return n; }

  // shared tooltip
  let _tt;
  function tip() {
    if (!_tt) { _tt = document.createElement("div"); _tt.className = "tooltip"; document.body.appendChild(_tt); }
    return _tt;
  }
  function showTip(html, ev) {
    const t = tip(); t.innerHTML = html; t.style.opacity = 1;
    const x = ev.clientX + 14, y = ev.clientY + 14;
    t.style.left = Math.min(x, innerWidth - t.offsetWidth - 10) + "px";
    t.style.top = Math.min(y, innerHeight - t.offsetHeight - 10) + "px";
  }
  function hideTip() { if (_tt) _tt.style.opacity = 0; }

  // nav render
  function nav(active) {
    const links = [
      ["overview.html", "总览 Overview"],
      ["q1.html", "Q1 · 如何产生"],
      ["q2.html", "Q2 · 内容含义"],
      ["q3.html", "Q3 · 复发与干预"],
    ];
    return `<div class="topbar"><div class="inner">
      <div class="brand">TenantThread · MC2<small>Anomalous SaidIt Post · 多智能体系统溯源</small></div>
      <nav class="nav">${links.map(([h, t]) =>
      `<a href="${h}" class="${active === h ? "active" : ""}">${t}</a>`).join("")}</nav>
    </div></div>`;
  }

  // short name -> Title Case
  function name(s) {
    return (s || "").split("_").map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
  }
  // department color
  const DEPT_COLOR = {
    executive_suite: "#e3b341", information_technologies: "#58a6ff",
    customer_support: "#ff6b6b", products: "#3fb950",
    human_resources: "#a371f7", legal: "#39c5cf", null: "#63748a",
  };
  function deptColor(d) { return DEPT_COLOR[d] || "#63748a"; }

  return { load, el, add, showTip, hideTip, nav, name, deptColor, DEPT_COLOR };
})();

// mount nav + mark step interactions after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("nav");
  if (holder) holder.outerHTML = MC2.nav(holder.dataset.active);
});
