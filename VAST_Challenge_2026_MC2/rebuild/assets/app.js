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
  setupFigureLightbox();
  setupFigureExplorer();
  setupFigureEvidenceLinks();
});

function setupFigureLightbox() {
  const figures = [...document.querySelectorAll(".eda-figure")];
  if (!figures.length) return;

  const modal = document.createElement("div");
  const isZh = document.documentElement.lang === "zh-CN" || /_zh\.html$/i.test(location.pathname);
  const closeText = isZh ? "关闭" : "Close";
  modal.className = "figure-lightbox";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", isZh ? "放大的图表视图" : "Expanded figure view");
  modal.innerHTML = `<div class="figure-lightbox-inner">
    <div class="figure-lightbox-head">
      <div class="figure-lightbox-title"></div>
      <button type="button" class="figure-lightbox-close" aria-label="${closeText}">${closeText}</button>
    </div>
    <div class="figure-lightbox-stage"><img alt=""></div>
    <div class="figure-lightbox-caption"></div>
  </div>`;
  document.body.appendChild(modal);

  const title = modal.querySelector(".figure-lightbox-title");
  const img = modal.querySelector("img");
  const caption = modal.querySelector(".figure-lightbox-caption");
  const closeButton = modal.querySelector(".figure-lightbox-close");
  let lastFocus = null;

  function openFrom(sourceImg) {
    lastFocus = document.activeElement;
    const fig = sourceImg.closest(".eda-figure");
    const cap = fig?.querySelector("figcaption");
    const kicker = cap?.querySelector(".figure-kicker")?.textContent?.trim() || sourceImg.alt || "Figure";
    title.textContent = kicker;
    img.src = sourceImg.currentSrc || sourceImg.src;
    img.alt = sourceImg.alt || kicker;
    caption.innerHTML = cap ? cap.innerHTML : "";
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    img.removeAttribute("src");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  figures.forEach((fig) => {
    const sourceImg = fig.querySelector("img");
    if (!sourceImg) return;
    sourceImg.setAttribute("tabindex", "0");
    sourceImg.setAttribute("role", "button");
    sourceImg.setAttribute("aria-label", `${sourceImg.alt || "Figure"} - open large view`);
    sourceImg.addEventListener("click", () => openFrom(sourceImg));
    sourceImg.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openFrom(sourceImg);
      }
    });
  });

  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) close();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && modal.classList.contains("open")) close();
  });
}

function setupFigureExplorer() {
  const grids = [...document.querySelectorAll(".figure-grid")].filter((grid) => grid.querySelectorAll(".eda-figure").length >= 2);
  if (!grids.length) return;

  const isZh = document.documentElement.lang === "zh-CN" || /_zh\.html$/i.test(location.pathname);
  const labels = isZh
    ? { title: "证据图导航", search: "按关键词过滤图表", all: "全部显示", prev: "上一张", next: "下一张", count: "张可见图" }
    : { title: "Evidence Figure Navigator", search: "Filter figures by keyword", all: "Show all", prev: "Previous", next: "Next", count: "visible figures" };

  grids.forEach((grid, gridIndex) => {
    if (grid.dataset.figureExplorer === "ready") return;
    grid.dataset.figureExplorer = "ready";
    const figures = [...grid.querySelectorAll(".eda-figure")];
    let selected = -1;

    const toolbar = document.createElement("div");
    toolbar.className = "figure-explorer";
    toolbar.innerHTML = `<div class="figure-explorer-title">${labels.title}</div>
      <div class="figure-explorer-controls">
        <input type="search" aria-label="${labels.search}" placeholder="${labels.search}">
        <button type="button" data-action="all">${labels.all}</button>
        <button type="button" data-action="prev">${labels.prev}</button>
        <button type="button" data-action="next">${labels.next}</button>
        <span class="figure-explorer-count" aria-live="polite"></span>
      </div>`;
    grid.parentNode.insertBefore(toolbar, grid);

    const input = toolbar.querySelector("input");
    const count = toolbar.querySelector(".figure-explorer-count");
    const buttons = toolbar.querySelectorAll("button");

    function textOf(fig) {
      return `${fig.querySelector("img")?.alt || ""} ${fig.querySelector("figcaption")?.textContent || ""}`.toLowerCase();
    }

    function visibleFigures() {
      return figures.filter((fig) => !fig.hidden);
    }

    function updateCount() {
      const visible = visibleFigures().length;
      count.textContent = `${visible}/${figures.length} ${labels.count}`;
      buttons.forEach((button) => {
        if (button.dataset.action !== "all") button.disabled = visible === 0;
      });
    }

    function selectFigure(nextIndex, shouldScroll = true) {
      const visible = visibleFigures();
      figures.forEach((fig) => fig.classList.remove("selected"));
      if (!visible.length) {
        selected = -1;
        updateCount();
        return;
      }
      selected = ((nextIndex % visible.length) + visible.length) % visible.length;
      const fig = visible[selected];
      fig.classList.add("selected");
      fig.setAttribute("aria-current", "true");
      figures.filter((other) => other !== fig).forEach((other) => other.removeAttribute("aria-current"));
      updateCount();
      if (shouldScroll) fig.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function applyFilter() {
      const q = input.value.trim().toLowerCase();
      figures.forEach((fig) => {
        const show = !q || textOf(fig).includes(q);
        fig.hidden = !show;
        fig.classList.toggle("filtered-out", !show);
      });
      selectFigure(0, false);
    }

    input.addEventListener("input", applyFilter);
    toolbar.querySelector("[data-action='all']").addEventListener("click", () => {
      input.value = "";
      figures.forEach((fig) => {
        fig.hidden = false;
        fig.classList.remove("filtered-out");
      });
      selectFigure(0);
    });
    toolbar.querySelector("[data-action='prev']").addEventListener("click", () => selectFigure(selected - 1));
    toolbar.querySelector("[data-action='next']").addEventListener("click", () => selectFigure(selected + 1));

    figures.forEach((fig, index) => {
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("aria-label", `${labels.title} ${index + 1}`);
      fig.addEventListener("focus", () => selectFigure(visibleFigures().indexOf(fig), false));
      fig.addEventListener("click", (ev) => {
        if (ev.target.closest("img")) return;
        selectFigure(visibleFigures().indexOf(fig), false);
      });
    });

    selectFigure(gridIndex === 0 ? 0 : -1, false);
  });
}

function setupFigureEvidenceLinks() {
  const figures = [...document.querySelectorAll(".eda-figure[data-target-panel]")];
  if (!figures.length) return;
  const isZh = document.documentElement.lang === "zh-CN" || /_zh\.html$/i.test(location.pathname);
  const label = isZh ? "查看对应证据视图" : "Open linked evidence view";

  figures.forEach((fig) => {
    const targetId = fig.dataset.targetPanel;
    const target = document.getElementById(targetId);
    const caption = fig.querySelector("figcaption");
    if (!target || !caption || caption.querySelector(".figure-jump")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "figure-jump";
    button.textContent = label;
    button.setAttribute("aria-label", `${label}: ${target.querySelector("h2")?.textContent?.trim() || targetId}`);
    button.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (target.classList.contains("explore-only") || target.querySelector(".explore-only")) {
        MC2.setState({ mode: "explore" });
      }
      document.querySelectorAll(".panel.evidence-focus").forEach((node) => node.classList.remove("evidence-focus"));
      target.classList.add("evidence-focus");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      try { history.replaceState(null, "", `${location.pathname}${location.search}#${targetId}`); } catch (_) { /* ignore */ }
      window.setTimeout(() => target.classList.remove("evidence-focus"), 2400);
    });
    caption.appendChild(button);
  });
}

window.setupFigureEvidenceLinks = setupFigureEvidenceLinks;
