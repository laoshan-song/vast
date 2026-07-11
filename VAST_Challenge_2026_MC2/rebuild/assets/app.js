/* MC2 rebuild shared helpers. Dependency-free, file:// compatible. */
const MC2 = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  let _data = null;

  async function load() {
    if (_data) return _data;
    if (window.MC2_DATA) {
      _data = window.MC2_DATA;
      return _data;
    }
    const res = await fetch("./mc2_viz_data.json");
    _data = await res.json();
    return _data;
  }

  function el(tag, attrs = {}, text) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function add(parent, tag, attrs = {}, text) {
    const n = el(tag, attrs, text);
    parent.appendChild(n);
    return n;
  }

  function labelSvg(svg, label) {
    if (!svg) return;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  }

  function makeInteractive(node, label, handler) {
    if (!node) return node;
    node.classList.add("clickable-mark");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", label);
    node.addEventListener("click", handler);
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        handler(ev);
      }
    });
    return node;
  }

  let _tt;
  function tip() {
    if (!_tt) {
      _tt = document.createElement("div");
      _tt.className = "tooltip";
      document.body.appendChild(_tt);
    }
    return _tt;
  }

  function showTip(html, ev) {
    const t = tip();
    t.innerHTML = html;
    t.style.opacity = 1;
    const x = ev.clientX + 14;
    const y = ev.clientY + 14;
    t.style.left = `${Math.min(x, innerWidth - t.offsetWidth - 10)}px`;
    t.style.top = `${Math.min(y, innerHeight - t.offsetHeight - 10)}px`;
  }

  function hideTip() {
    if (_tt) _tt.style.opacity = 0;
  }

  function nav(active) {
    const links = [
      ["overview.html", "Overview"],
      ["q1.html", "Q1 Mechanism"],
      ["q2.html", "Q2 Meaning"],
      ["q3.html", "Q3 Recurrence"],
    ];
    return `<div class="topbar"><div class="inner">
      <div class="brand">TenantThread MC2<small>Anomalous SaidIt Post Investigation</small></div>
      <nav class="nav">${links.map(([h, t]) =>
        `<a href="${h}" class="${active === h ? "active" : ""}">${t}</a>`).join("")}</nav>
    </div></div>`;
  }

  function name(s) {
    return String(s || "").split("_")
      .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  const DEPT_COLOR = {
    executive_suite: "#b7791f",
    information_technologies: "#256fb8",
    customer_support: "#c93b45",
    products: "#20865a",
    human_resources: "#7057c8",
    legal: "#087f8c",
    null: "#63748a",
  };

  function deptColor(d) {
    return DEPT_COLOR[d] || "#63748a";
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function evidenceBox(node, title, rows, raw) {
    if (!node) return;
    node.innerHTML = `<div class="evidence-title">${esc(title)}</div>
      <div class="evidence-grid">${rows.map(([k, v]) =>
        `<div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>`).join("")}</div>
      <pre class="evidence-pre">${esc(JSON.stringify(raw, null, 2))}</pre>`;
  }

  function eventRows(r) {
    return [
      ["event id", r.id],
      ["time UTC-7", r.when],
      ["action", r.action || "queue_subordinate_task"],
      ["from", name(r.from)],
      ["to", name(r.to)],
      ["details", JSON.stringify(r.detail || {})],
    ];
  }

  function toTs(s) {
    return Date.parse(String(s).replace(" ", "T") + "Z");
  }

  function daysBetween(a, b) {
    return (toTs(b) - toTs(a)) / 86400000;
  }

  return {
    load, el, add, labelSvg, makeInteractive, showTip, hideTip, nav, name,
    deptColor, DEPT_COLOR, esc, evidenceBox, eventRows, toTs, daysBetween,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("nav");
  if (holder) holder.outerHTML = MC2.nav(holder.dataset.active);
});
