/* MC2 rebuild shared helpers. Dependency-free, file:// compatible. */
const MC2 = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  const VALID_INCIDENTS = ["SwiftWren", "MellowOtter", "HiddenOrca"];
  const DEFAULT_STATE = { mode: "review", incident: "SwiftWren", walk: "hop", agent: "" };
  let _data = null;
  let _state = readState();

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

  function readState() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("mc2-view-state") || "{}"); } catch (_) { saved = {}; }
    const params = new URLSearchParams(location.search);
    const next = {
      ...DEFAULT_STATE,
      ...saved,
      ...Object.fromEntries([...params].filter(([key]) => key in DEFAULT_STATE)),
    };
    if (!VALID_INCIDENTS.includes(next.incident)) next.incident = DEFAULT_STATE.incident;
    if (!['review', 'explore'].includes(next.mode)) next.mode = DEFAULT_STATE.mode;
    if (!['hop', 'time'].includes(next.walk)) next.walk = DEFAULT_STATE.walk;
    return next;
  }

  function state() {
    return { ..._state };
  }

  function syncStateUi() {
    document.body.dataset.mode = _state.mode;
    document.querySelectorAll("[data-view-mode]").forEach((button) => {
      const active = button.dataset.viewMode === _state.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("a[data-page]").forEach((link) => {
      link.href = pageHref(link.dataset.page);
    });
  }

  function setState(patch, options = {}) {
    _state = { ..._state, ...patch };
    if (!VALID_INCIDENTS.includes(_state.incident)) _state.incident = DEFAULT_STATE.incident;
    if (!['review', 'explore'].includes(_state.mode)) _state.mode = DEFAULT_STATE.mode;
    if (!['hop', 'time'].includes(_state.walk)) _state.walk = DEFAULT_STATE.walk;
    try { localStorage.setItem("mc2-view-state", JSON.stringify(_state)); } catch (_) { /* file mode may deny storage */ }
    const params = new URLSearchParams(location.search);
    Object.entries(_state).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    if (options.replaceUrl !== false) {
      try { history.replaceState(null, "", `${location.pathname}?${params.toString()}${location.hash}`); } catch (_) { /* keep state without URL mutation */ }
    }
    syncStateUi();
    document.dispatchEvent(new CustomEvent("mc2statechange", { detail: state() }));
  }

  function resetState() {
    _state = { ...DEFAULT_STATE };
    try { localStorage.removeItem("mc2-view-state"); } catch (_) { /* ignore */ }
    setState(_state);
  }

  function pageHref(page) {
    const params = new URLSearchParams();
    Object.entries(_state).forEach(([key, value]) => { if (value) params.set(key, value); });
    return `${page}?${params.toString()}`;
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
  let _tipPinned = null;
  function tip() {
    if (!_tt) {
      _tt = document.createElement("div");
      _tt.className = "tooltip";
      _tt.setAttribute("role", "status");
      document.body.appendChild(_tt);
    }
    return _tt;
  }

  function showTip(html, ev, pinned = false) {
    const t = tip();
    t.innerHTML = html;
    t.classList.toggle("pinned", pinned);
    t.style.opacity = 1;
    const rect = ev?.currentTarget?.getBoundingClientRect?.();
    const x = Number.isFinite(ev?.clientX) && ev.clientX ? ev.clientX + 14 : (rect?.left || 12) + 14;
    const y = Number.isFinite(ev?.clientY) && ev.clientY ? ev.clientY + 14 : (rect?.bottom || 12) + 10;
    t.style.left = `${Math.max(8, Math.min(x, innerWidth - t.offsetWidth - 10))}px`;
    t.style.top = `${Math.max(8, Math.min(y, innerHeight - t.offsetHeight - 10))}px`;
  }

  function hideTip(force = false) {
    if (_tt && (force || !_tipPinned)) _tt.style.opacity = 0;
    if (force) _tipPinned = null;
  }

  function bindTooltip(node, label, htmlFactory) {
    if (!node) return node;
    node.classList.add("tooltip-mark");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", label);
    const html = () => typeof htmlFactory === "function" ? htmlFactory() : htmlFactory;
    node.addEventListener("pointermove", (ev) => { if (_tipPinned !== node) showTip(html(), ev); });
    node.addEventListener("pointerleave", () => { if (_tipPinned !== node) hideTip(); });
    node.addEventListener("focus", (ev) => showTip(html(), ev, _tipPinned === node));
    node.addEventListener("click", (ev) => {
      ev.stopPropagation();
      _tipPinned = _tipPinned === node ? null : node;
      if (_tipPinned) showTip(`${html()}<div class="tt-pin">Pinned - Esc to close</div>`, ev, true);
      else hideTip(true);
    });
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        node.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 }));
      }
    });
    return node;
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
        `<a data-page="${h}" href="${pageHref(h)}" class="${active === h ? "active" : ""}">${t}</a>`).join("")}</nav>
      <div class="view-tools" aria-label="View density">
        <div class="segmented"><button type="button" data-view-mode="review">Review</button><button type="button" data-view-mode="explore">Explore</button></div>
        <button type="button" class="reset-view" data-reset-view aria-label="Reset filters">Reset</button>
      </div>
    </div></div>`;
  }

  function name(s) {
    return String(s || "").split("_")
      .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  const DEPT_COLOR = {
    executive_suite: "#a45f00",
    information_technologies: "#256fb8",
    customer_support: "#c43d4b",
    products: "#13795b",
    human_resources: "#7057c8",
    legal: "#087f8c",
    null: "#63748a",
  };

  function deptColor(d) { return DEPT_COLOR[d] || "#63748a"; }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
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
      ["event id", r.id], ["time UTC-7", r.when], ["action", r.action || "queue_subordinate_task"],
      ["from", name(r.from)], ["to", name(r.to)], ["details", JSON.stringify(r.detail || {})],
    ];
  }

  function toTs(s) { return Date.parse(String(s).replace(" ", "T") + "Z"); }
  function daysBetween(a, b) { return (toTs(b) - toTs(a)) / 86400000; }

  return {
    load, el, add, labelSvg, makeInteractive, bindTooltip, showTip, hideTip, nav, name,
    deptColor, DEPT_COLOR, esc, evidenceBox, eventRows, toTs, daysBetween,
    state, setState, resetState, pageHref,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const holder = document.getElementById("nav");
  if (holder) holder.outerHTML = MC2.nav(holder.dataset.active);
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => MC2.setState({ mode: button.dataset.viewMode }));
  });
  document.querySelector("[data-reset-view]")?.addEventListener("click", () => MC2.resetState());
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") MC2.hideTip(true); });
  document.addEventListener("click", (ev) => { if (!ev.target.closest(".tooltip-mark")) MC2.hideTip(true); });
  MC2.setState(MC2.state());
});
