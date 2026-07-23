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
  setupGuidedAnalysisPath();
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

function setupGuidedAnalysisPath() {
  const main = document.querySelector("main");
  if (!main || document.querySelector(".guided-path")) return;

  const isZh = document.documentElement.lang === "zh-CN" || /_zh\.html$/i.test(location.pathname);
  const page = (location.pathname.split("/").pop() || "overview.html").replace("_zh", "");
  const labels = isZh
    ? {
      title: "引导式分析路径",
      sub: "按步骤复现从基线到结论的可视分析过程",
      prev: "上一步",
      next: "下一步",
      jump: "查看当前证据",
      step: "步骤",
      modeReview: "该步骤适合 Review 模式",
      modeExplore: "该步骤会切到 Explore 模式",
    }
    : {
      title: "Guided Analysis Path",
      sub: "step through the visual reasoning from baseline to conclusion",
      prev: "Previous",
      next: "Next",
      jump: "Open current evidence",
      step: "Step",
      modeReview: "This step uses Review mode",
      modeExplore: "This step switches to Explore mode",
    };

  const paths = guidedPathDefinitions(isZh);
  const config = paths[page];
  if (!config?.steps?.length) return;

  const panel = document.createElement("section");
  panel.className = "panel core guided-path";
  panel.setAttribute("aria-label", labels.title);
  panel.innerHTML = `<div class="head"><h2>${labels.title}</h2><span class="sub">${labels.sub}</span></div>
    <p class="desc">${config.intro}</p>
    <div class="guided-shell">
      <div class="guided-steps" role="tablist" aria-label="${labels.title}"></div>
      <div class="guided-current" aria-live="polite">
        <div class="guided-eyebrow"></div>
        <h3></h3>
        <p class="guided-why"></p>
        <p class="guided-action"></p>
        <div class="guided-controls">
          <button type="button" class="btn" data-guide-prev>${labels.prev}</button>
          <button type="button" class="btn primary" data-guide-next>${labels.next}</button>
          <button type="button" class="btn" data-guide-jump>${labels.jump}</button>
        </div>
      </div>
    </div>`;

  main.insertBefore(panel, main.firstElementChild);

  const stepsBox = panel.querySelector(".guided-steps");
  const eyebrow = panel.querySelector(".guided-eyebrow");
  const title = panel.querySelector(".guided-current h3");
  const why = panel.querySelector(".guided-why");
  const action = panel.querySelector(".guided-action");
  const prev = panel.querySelector("[data-guide-prev]");
  const next = panel.querySelector("[data-guide-next]");
  const jump = panel.querySelector("[data-guide-jump]");
  let current = 0;
  let clearTimer = null;

  config.steps.forEach((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.innerHTML = `<span class="idx">${index + 1}</span><span><b>${MC2.esc(step.label)}</b><small>${MC2.esc(step.short)}</small></span>`;
    button.addEventListener("click", () => setStep(index, true));
    stepsBox.appendChild(button);
  });

  function stepTarget(step) {
    if (!step.target) return null;
    const raw = document.querySelector(step.target);
    return raw?.closest?.(".panel") || raw;
  }

  function setStep(index, shouldJump = false) {
    current = Math.max(0, Math.min(index, config.steps.length - 1));
    const step = config.steps[current];
    [...stepsBox.children].forEach((button, i) => {
      const active = i === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    eyebrow.textContent = `${labels.step} ${current + 1}/${config.steps.length} - ${step.mode === "explore" ? labels.modeExplore : labels.modeReview}`;
    title.textContent = step.label;
    why.textContent = step.why;
    action.textContent = step.action;
    prev.disabled = current === 0;
    next.disabled = current === config.steps.length - 1;
    if (shouldJump) jumpToStep(step);
  }

  function jumpToStep(step) {
    if (step.mode) MC2.setState({ mode: step.mode });
    const target = stepTarget(step);
    if (!target) return;
    window.clearTimeout(clearTimer);
    document.querySelectorAll(".guided-target,.guided-context").forEach((node) => {
      node.classList.remove("guided-target", "guided-context");
    });
    [...main.querySelectorAll(".panel")].forEach((node) => {
      if (node !== panel && node !== target) node.classList.add("guided-context");
    });
    target.classList.add("guided-target");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const id = target.id || step.target?.replace(/^#/, "") || "";
      if (id) history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
    } catch (_) { /* ignore */ }
    clearTimer = window.setTimeout(() => {
      document.querySelectorAll(".guided-target,.guided-context").forEach((node) => {
        node.classList.remove("guided-target", "guided-context");
      });
    }, 4200);
  }

  prev.addEventListener("click", () => setStep(current - 1, true));
  next.addEventListener("click", () => setStep(current + 1, true));
  jump.addEventListener("click", () => jumpToStep(config.steps[current]));
  setStep(0, false);
}

function guidedPathDefinitions(isZh) {
  if (isZh) {
    return {
      "overview.html": {
        intro: "这条路径把北京房价作业中的步进式叙事迁移到 MC2：先看全局基线，再看字段异常，最后进入三道题的证据视图。",
        steps: [
          { label: "建立全局基线", short: "185,147 条事件", target: "#typebars", mode: "review", why: "先看系统规模和事件构成，避免一开始就把单个帖子孤立解释。", action: "讲清楚 SaidIt 只是全系统中的小子集，因此后续要先缩小范围。" },
          { label: "审计 SaidIt 字段", short: "105 content vs 3 content_source", target: "#fieldaudit", mode: "review", why: "字段差异是最可靠的异常入口，不是主观觉得乱码奇怪。", action: "强调 Agent + content_source 是三起异常共享的字段签名。" },
          { label: "对比正常与异常流程", short: "process comparison", target: "#processflow", mode: "review", why: "流程图把普通人类发帖和 Agent 文件源发帖分开，说明异常机制在哪里越界。", action: "指出异常分支包含 post check、content_source post 和 cleanup。" },
          { label: "进入具体问题", short: "Q1 -> Q2 -> Q3", target: "#qmap", mode: "review", why: "总览只负责定位问题，具体链条、含义和干预分别在 Q1-Q3 展开。", action: "从这里按 Q1、Q2、Q3 顺序录制视频。" },
        ],
      },
      "q1.html": {
        intro: "Q1 的路径是：题目线索 -> 字段扫描 -> 终端五步 -> relay 传播 -> 文件来源 -> 系统背景。",
        steps: [
          { label: "从题目线索开始", short: "SaidIt + John + 04:21", target: "#p-investigation", mode: "review", why: "从 SaidIt 入手不是随意筛选，而是题目明确给出了平台、人物和时间。", action: "说明如何从全量事件定位到目标 SaidIt post。" },
          { label: "识别文件源字段", short: "content_source=SwiftWren.txt", target: "#p-eda", mode: "review", why: "这个字段把问题从谁写了乱码转化为哪个文件被发出。", action: "指向 Figure 1 和 Figure 2，讲 105 条普通 content 与 3 条 content_source 的差异。" },
          { label: "证明最后几秒", short: "五步终端序列", target: "#p-recipe", mode: "review", why: "终端序列直接证明 relay、检查、发帖和清理在同一窗口连续发生。", action: "点击一个事件框，展示 event id、actor、target 和 raw JSON。" },
          { label: "追踪任务传播", short: "186 hops", target: "#p-walk", mode: "explore", why: "只看 John 不够，必须说明任务如何经过多个 Agent 到达 John。", action: "切换 hop/time 轴，并点击 relay 点查看详情。" },
          { label: "追踪文件来源", short: "meeting_notes.doc -> SwiftWren.txt", target: "#p-life", mode: "review", why: "文件生命周期把目标 payload 连接到上游文档读取。", action: "说明 Emma Harbor Agent 读取源文档并创建 payload。" },
          { label: "放回系统背景", short: "跨部门传播", target: "#p-dept", mode: "review", why: "部门矩阵说明这不是单点个人行为，而是系统级 relay 失败。", action: "用跨部门跳转数解释为什么要叫 system overview。" },
        ],
      },
      "q2.html": {
        intro: "Q2 的路径是：先定义证据等级，再追踪源文档、payload 和公开帖子，最后守住不能声称的边界。",
        steps: [
          { label: "先看证据完整性", short: "observed / inferred / unknown", target: "#p-confidence", mode: "review", why: "Q2 最容易过度解释，所以先定义哪些证据能说、哪些不能说。", action: "说明绿色、黄色、灰色分别代表日志观测、合理推断和未知。" },
          { label: "确认文件源机制", short: "content vs content_source", target: "#p-reasoning", mode: "review", why: "帖子含义首先是机制层面的：payload 文件被当作正文来源。", action: "展示字段扫描和 payload backtrace，而不是编造乱码正文。" },
          { label: "连接来源链", short: "source -> payload -> SaidIt", target: "#p-provenance", mode: "review", why: "provenance graph 把源文档、中间文件和公开帖子分开，避免混淆事实与推断。", action: "分别讲 SwiftWren、MellowOtter、HiddenOrca 的证据强弱。" },
          { label: "说明结论支持关系", short: "claim support DAG", target: "#p-claim", mode: "review", why: "DAG 让评委看到每个 Q2 结论由哪些日志事实支撑。", action: "强调 Q2 是溯源问题，不是动机判断问题。" },
          { label: "明确不能声称什么", short: "claim guardrails", target: "#p-boundary", mode: "review", why: "优秀答案需要主动标出 exact text、动机和缺失来源不可恢复。", action: "用边界矩阵说明为什么 HiddenOrca 保留 unknown。" },
        ],
      },
      "q3.html": {
        intro: "Q3 的路径是：先证明复发，再比较干预点，最后选择一个覆盖高、误伤低、发生在公开前的位置。",
        steps: [
          { label: "证明历史复发", short: "三起 content_source 帖", target: "#p-prior", mode: "review", why: "Q3 不能只说可能复发，要展示 HiddenOrca、MellowOtter 和 SwiftWren 已经共享终端机制。", action: "指向时间线和 terminal recipe，对比三起事件。" },
          { label: "比较规模差异", short: "SwiftWren 最大", target: "#p-scale", mode: "review", why: "规模图说明三起事件不是完全相同，但属于同一机制的不同规模复现。", action: "讲 hop、Agent、部门和 John arrivals 的差异。" },
          { label: "从基线证明稀有性", short: "3/108", target: "#p-base", mode: "review", why: "文件源帖子虽然只有三条，但在 108 条 SaidIt posts 中形成清晰异常签名。", action: "说明为什么三次重复具有运维意义。" },
          { label: "比较候选干预", short: "coverage vs cost", target: "#p-parallel", mode: "review", why: "不能凭直觉选规则，需要比较覆盖、误伤、影响记录数和时机。", action: "指出 broad relay controls 影响更大，delete-file 报警太晚。" },
          { label: "给出唯一干预点", short: "3/3 coverage, 0/105 FP", target: "#p-fix", mode: "review", why: "SaidIt boundary gate 同时满足全覆盖、低误伤和发布前拦截。", action: "停在混淆矩阵和规则表，作为视频结尾。" },
        ],
      },
    };
  }
  return {
    "overview.html": {
      intro: "This path adapts the Stepper Narrative idea: establish the system baseline, isolate the field-level anomaly, then move into Q1-Q3 evidence views.",
      steps: [
        { label: "Establish baseline", short: "185,147 events", target: "#typebars", mode: "review", why: "The system scale must be visible before any anomaly claim is made.", action: "Explain why SaidIt is a small but consequential subset of the event log." },
        { label: "Audit SaidIt fields", short: "105 content vs 3 content_source", target: "#fieldaudit", mode: "review", why: "The field difference is the defensible anomaly entry point.", action: "Point out that Agent + content_source is the shared signature." },
        { label: "Compare processes", short: "normal vs anomalous paths", target: "#processflow", mode: "review", why: "The directly-follows view separates normal human posting from the repeated Agent file-source path.", action: "Identify post check, content_source post, and cleanup as the anomalous branch." },
        { label: "Move to answers", short: "Q1 -> Q2 -> Q3", target: "#qmap", mode: "review", why: "The overview locates the issue; the three question pages document the chain, meaning, and remedy.", action: "Use this map as the transition into the recorded solution." },
      ],
    },
    "q1.html": {
      intro: "Q1 follows a reproducible investigation path: prompt clue, field scan, terminal recipe, relay chain, file origin, and system context.",
      steps: [
        { label: "Start from prompt clue", short: "SaidIt + John + 04:21", target: "#p-investigation", mode: "review", why: "SaidIt is the starting point because the prompt names the platform, actor, and time.", action: "Show how the target post is isolated from the full log." },
        { label: "Find the file-source field", short: "content_source=SwiftWren.txt", target: "#p-eda", mode: "review", why: "This changes the question from who typed gibberish to which file was posted.", action: "Use Figures 1 and 2 to contrast 105 content posts with 3 content_source posts." },
        { label: "Prove final seconds", short: "terminal five-step recipe", target: "#p-recipe", mode: "review", why: "The terminal sequence directly links relay arrival, check, post, and cleanup.", action: "Click an event box to show event id, actor, target, and raw JSON." },
        { label: "Trace task propagation", short: "186 hops", target: "#p-walk", mode: "explore", why: "John's Agent is the endpoint, but the task arrived through a broader Agent relay chain.", action: "Switch hop/time axes and click a relay point for details." },
        { label: "Trace file origin", short: "meeting_notes.doc -> SwiftWren.txt", target: "#p-life", mode: "review", why: "The lifecycle view connects the payload file to upstream document access.", action: "Explain Emma Harbor's read and payload creation events." },
        { label: "Contextualize in system", short: "cross-department spread", target: "#p-dept", mode: "review", why: "The department matrix frames the post as a system relay failure, not a single-person action.", action: "Use cross-department hops to explain system context." },
      ],
    },
    "q2.html": {
      intro: "Q2 first defines evidence certainty, then traces source document, payload file, and public post without overclaiming plaintext or motive.",
      steps: [
        { label: "Check evidence completeness", short: "observed / inferred / unknown", target: "#p-confidence", mode: "review", why: "Meaning claims must be bounded before interpretation.", action: "Define green, yellow, and gray evidence categories." },
        { label: "Confirm file-source mechanism", short: "content vs content_source", target: "#p-reasoning", mode: "review", why: "The operational meaning is that a payload file became the post body.", action: "Show field scan and payload backtrace instead of inventing text." },
        { label: "Link provenance rows", short: "source -> payload -> SaidIt", target: "#p-provenance", mode: "review", why: "The graph separates source documents, payload files, and public posts.", action: "Compare SwiftWren, MellowOtter, and HiddenOrca certainty." },
        { label: "Show claim support", short: "claim support DAG", target: "#p-claim", mode: "review", why: "Each Q2 claim should map back to logged evidence.", action: "Emphasize that Q2 is provenance, not motive." },
        { label: "State guardrails", short: "what not to claim", target: "#p-boundary", mode: "review", why: "A strong answer explicitly marks exact text, motive, and missing sources as unsupported.", action: "Use the boundary matrix to explain why HiddenOrca remains unknown." },
      ],
    },
    "q3.html": {
      intro: "Q3 proves recurrence first, then compares intervention candidates before selecting one pre-publication boundary gate.",
      steps: [
        { label: "Prove recurrence", short: "three content_source posts", target: "#p-prior", mode: "review", why: "The answer must show prior issues, not only speculate about future risk.", action: "Use the timeline and terminal recipes to compare the three incidents." },
        { label: "Compare scale", short: "SwiftWren is largest", target: "#p-scale", mode: "review", why: "The incidents differ in size but share the same terminal mechanism.", action: "Discuss hops, Agents, departments, and John arrivals." },
        { label: "Show rarity", short: "3/108", target: "#p-base", mode: "review", why: "The repeated pattern is meaningful because file-source posts are rare in the SaidIt baseline.", action: "Use denominators to avoid misleading ratios." },
        { label: "Compare candidates", short: "coverage vs cost", target: "#p-parallel", mode: "review", why: "The intervention should be selected by evidence, not intuition.", action: "Contrast broad relay controls, filename rules, John-only controls, and delete alerts." },
        { label: "Select one gate", short: "3/3 coverage, 0/105 FP", target: "#p-fix", mode: "review", why: "The SaidIt boundary gate has full observed coverage, zero observed human-post false positives, and pre-publication timing.", action: "End the video on the confusion matrix and decision table." },
      ],
    },
  };
}
