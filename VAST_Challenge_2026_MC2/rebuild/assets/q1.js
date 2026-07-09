/* q1.js — detailed chain + random-walk trace + system overview */
(async () => {
  const d = await MC2.load();
  const { add, showTip, hideTip, name, deptColor } = MC2;
  const CODES = ["SwiftWren", "MellowOtter", "HiddenOrca"];
  let cur = "SwiftWren";

  const incStats = document.getElementById("incstats");
  const incSel = document.getElementById("incsel");
  incSel.innerHTML = CODES.map(c =>
    `<button class="btn ${c === cur ? "primary" : ""}" data-c="${c}">${c}</button>`).join("");
  incSel.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    cur = b.dataset.c;
    incSel.querySelectorAll("button").forEach(x => x.classList.toggle("primary", x.dataset.c === cur));
    render();
  }));

  /* steps sidebar (scroll to panel) */
  const steps = [
    ["A 精确链路", "5 步配方，秒级", "p-recipe"],
    ["B 传播轨迹", "随机游走折线", "p-walk"],
    ["C 系统总图", "四层管线", "p-sys"],
  ];
  document.getElementById("steps").innerHTML = steps.map(([t, dd, id], i) =>
    `<button data-id="${id}"><span class="idx">${i + 1}</span><span><span class="t">${t}</span>
     <span class="d">${dd}</span></span></button>`).join("");
  document.querySelectorAll("#steps button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#steps button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.id).scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  function render() {
    const inc = d.incidents[cur];
    /* incident stat chips */
    incStats.innerHTML = [
      ["hops", inc.hop_count, "info"],
      ["agents", inc.distinct_agent_count, "purple"],
      ["跨部门跳", inc.cross_dept_hops, "warn"],
      ["到达 John", inc.john_arrival_count, "anom"],
    ].map(([l, n, c]) => `<div class="stat ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
    document.getElementById("recipe-sub").textContent =
      `${cur} · origin ${name(inc.origin)} · post id ${inc.post ? inc.post.id : "?"} · ${inc.post ? inc.post.when : ""}`;
    drawRecipe(inc);
    drawWalk(inc);
    drawSys(inc);
  }

  /* ================= A. recipe timeline ================= */
  function drawRecipe(inc) {
    const svg = document.getElementById("recipe");
    svg.innerHTML = "";
    const rec = inc.recipe || [];
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 260`);
    const n = rec.length, pad = 28;
    const gapW = (W - pad * 2) / Math.max(n, 5);
    const y = 120, boxW = Math.min(190, gapW - 18), boxH = 74;
    const COLORS = { queue_subordinate_task: "#a371f7", saidit_post_check: "#e3b341",
      saidit_post: "#e5484d", delete_file: "#58a6ff" };
    const LABELS = {
      queue_subordinate_task: "relay task",
      saidit_post_check: "post_check",
      saidit_post: "saidit_post",
      delete_file: "delete_file",
    };
    rec.forEach((r, i) => {
      const cx = pad + i * gapW + gapW / 2;
      // connector
      if (i < n - 1) add(svg, "line", { x1: cx + boxW / 2, y1: y, x2: cx + gapW - boxW / 2, y2: y,
        stroke: "#2c3d4f", "stroke-width": 2, "marker-end": "url(#ar)" });
      const col = COLORS[r.action] || "#58a6ff";
      const g = add(svg, "g", {});
      add(g, "rect", { x: cx - boxW / 2, y: y - boxH / 2, width: boxW, height: boxH, rx: 8,
        fill: "#18212e", stroke: col, "stroke-width": r.action === "saidit_post" ? 2.5 : 1.5 });
      add(g, "text", { x: cx, y: y - 16, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: col },
        `${i + 1}. ${LABELS[r.action] || r.action}`);
      const who = r.action === "queue_subordinate_task" ? `${name(r.from)}→John` : "John Agent";
      add(g, "text", { x: cx, y: y + 2, "text-anchor": "middle", "font-size": 11, fill: "#93a1b0" }, who);
      const dt = r.detail.content_source || r.detail.target || r.detail.task || r.detail.forum || "";
      if (dt) add(g, "text", { x: cx, y: y + 18, "text-anchor": "middle", "font-size": 10.5,
        fill: "#63748a", "font-family": "var(--mono)" }, String(dt).slice(0, Math.max(16, Math.floor(boxW / 7))));
      g.addEventListener("mousemove", e => showTip(
        `<div class="tt-h">${i + 1}. ${r.action}</div>
         <div class="tt-r">${r.when} · id ${r.id}</div>
         <div class="tt-r">${JSON.stringify(r.detail)}</div>`, e));
      g.addEventListener("mouseleave", hideTip);
      // time + id below
      add(svg, "text", { x: cx, y: y + boxH / 2 + 22, "text-anchor": "middle", "font-size": 10.5,
        fill: "#63748a", "font-family": "var(--mono)" }, r.when.slice(11));
      add(svg, "text", { x: cx, y: y + boxH / 2 + 38, "text-anchor": "middle", "font-size": 10,
        fill: "#4b5a6b", "font-family": "var(--mono)" }, `id ${r.id}`);
    });
    // arrow marker
    const defs = add(svg, "defs", {});
    const m = add(defs, "marker", { id: "ar", markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto" });
    add(m, "path", { d: "M0,0 L6,3 L0,6 Z", fill: "#2c3d4f" });
    add(svg, "text", { x: 40, y: 30, "font-size": 12, fill: "#63748a" },
      `⏱ 全程约 ${rec.length ? 4 : 0} 秒 · 发帖后立即删除指令文件与 payload（反取证）`);
  }

  /* ================= B. random-walk trace ================= */
  function drawWalk(inc) {
    const svg = document.getElementById("walk");
    svg.innerHTML = "";
    const hops = inc.hops;
    // build ordered agent list: origin first, John last, others between (by dept)
    const agents = inc.distinct_agents.slice();
    agents.sort((a, b) => {
      if (a === "john_windward") return 1; if (b === "john_windward") return -1;
      if (a === inc.origin) return -1; if (b === inc.origin) return 1;
      const da = d.org.person_dept[a] || "", db = d.org.person_dept[b] || "";
      return da === db ? a.localeCompare(b) : da.localeCompare(db);
    });
    const rowOf = {}; agents.forEach((a, i) => rowOf[a] = i);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 520`);
    const ml = 150, mr = 30, mt = 20, mb = 30;
    const rh = (svg.getAttribute("height") - mt - mb) / agents.length;
    const nH = hops.length;
    const x = i => ml + (nH <= 1 ? 0 : (i / (nH - 1)) * (W - ml - mr));
    const y = a => mt + rowOf[a] * rh + rh / 2;

    // row backgrounds + labels
    agents.forEach(a => {
      const isJohn = a === "john_windward", isOrigin = a === inc.origin;
      add(svg, "rect", { x: ml, y: y(a) - rh / 2 + 1, width: W - ml - mr, height: rh - 2,
        fill: isJohn ? "rgba(229,72,77,.08)" : isOrigin ? "rgba(88,166,255,.07)" : "transparent" });
      add(svg, "line", { x1: ml, y1: y(a), x2: W - mr, y2: y(a), stroke: "#182130", "stroke-width": 1 });
      const dept = d.org.person_dept[a];
      add(svg, "circle", { cx: ml - 128, cy: y(a), r: 4, fill: deptColor(dept) });
      add(svg, "text", { x: ml - 118, y: y(a) + 4, "font-size": 11.5,
        fill: isJohn ? "#ff6b6b" : isOrigin ? "#58a6ff" : "#93a1b0",
        "font-weight": (isJohn || isOrigin) ? 700 : 400 },
        name(a) + (isJohn ? " ◀ 发帖终点" : isOrigin ? " ◀ 源头" : ""));
    });

    // walk polyline: point per hop at receiver row
    let prevX = x(0), prevY = y(hops[0].from);
    // start marker at origin (sender of hop 0)
    add(svg, "circle", { cx: prevX, cy: prevY, r: 3, fill: "#58a6ff" });
    hops.forEach((h, i) => {
      const px = x(i), py = y(h.to);
      add(svg, "line", { x1: prevX, y1: prevY, x2: px, y2: py,
        stroke: h.to === "john_windward" ? "rgba(229,72,77,.6)" : "rgba(88,166,255,.35)",
        "stroke-width": h.to === "john_windward" ? 2 : 1.2 });
      const isArr = h.to === "john_windward";
      const c = add(svg, "circle", { cx: px, cy: py, r: isArr ? 5 : 2.6,
        fill: isArr ? "#e5484d" : "#8bb7e8", stroke: isArr ? "#fff" : "none", "stroke-width": isArr ? 1 : 0 });
      c.addEventListener("mousemove", e => showTip(
        `<div class="tt-h">hop ${i + 1}${isArr ? " · 到达 John" : ""}</div>
         <div class="tt-r">${name(h.from)} → ${name(h.to)}</div>
         <div class="tt-r">${h.when} · id ${h.id}</div>`, e));
      c.addEventListener("mouseleave", hideTip);
      prevX = px; prevY = py;
    });

    // x-axis ticks (hop index)
    const yb = mt + agents.length * rh + 4;
    [0, Math.floor(nH / 4), Math.floor(nH / 2), Math.floor(3 * nH / 4), nH - 1].forEach(i => {
      add(svg, "text", { x: x(i), y: yb + 12, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" },
        `hop ${i + 1}`);
    });

    // legend (dept colors + arrival)
    const lg = document.getElementById("walk-legend");
    const depts = [...new Set(inc.distinct_agents.map(a => d.org.person_dept[a]))].filter(Boolean);
    lg.innerHTML = depts.map(dp =>
      `<span class="pill"><span class="dot" style="background:${deptColor(dp)}"></span>${name(dp)}</span>`).join("")
      + `<span class="pill"><span class="dot" style="background:#e5484d"></span>指令到达 John（${inc.john_arrival_count} 次）</span>`;
  }

  /* ================= C. system flow ================= */
  function drawSys(inc) {
    const src = inc.source_doc;
    const cf = inc.create_file;
    const payloadMeta = cf
      ? `${cf.size_hint.toLocaleString()} B${cf.word_count ? " · " + cf.word_count.toLocaleString() + " words" : ""}`
      : "无 create_file 记录";
    document.getElementById("sysflow").innerHTML = `
    <div class="flow">
      <div class="fbox src"><div class="k">① 内部文档层</div>
        <div class="v">${src ? src.name : "源文档（窗口外）"}</div>
        <div class="s">${src ? "read_by " + name(src.read_by) + " · " + src.when : "HiddenOrca 源不在数据集"}</div></div>
      <div class="farrow">→</div>
      <div class="fbox pay"><div class="k">② 文件系统层 payload</div>
        <div class="v">${inc.code}.txt</div>
        <div class="s">${payloadMeta}</div></div>
      <div class="farrow">→</div>
      <div class="fbox agent"><div class="k">③ Agent 传播层</div>
        <div class="v">${inc.hop_count} × queue_subordinate_task</div>
        <div class="s">${inc.distinct_agent_count} Agent · ${inc.cross_dept_hops} 跨部门跳 · task=read_file</div></div>
      <div class="farrow">→</div>
      <div class="fbox post"><div class="k">④ 外部发布边界 ★</div>
        <div class="v">saidit_post(content_source)</div>
        <div class="s">John Agent · forum=general · 随后 delete×2</div></div>
    </div>
    <div class="note" style="margin-top:14px">
      <b>系统视角的关键：</b>①②③ 都还在公司内部，风险可控；真正把机密<b>外部化</b>的是第 ④ 步——
      Agent 越过人类、直接把本地文件发到公开 SaidIt。全系统 108 次 saidit_post 里只有 3 次由 Agent 发起，
      全是这一步。这也是 Q3 选定的<b>唯一干预点</b>。</div>`;
  }

  render();
})();
