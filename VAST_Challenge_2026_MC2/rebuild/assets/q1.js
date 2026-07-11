/* q1.js - terminal recipe, hop-expanded route, system boundary context */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, deptColor, evidenceBox, eventRows } = MC2;
  const CODES = ["SwiftWren", "MellowOtter", "HiddenOrca"];
  const STAGES = ["all", "relay", "check", "post", "cleanup"];
  let cur = "SwiftWren";
  let stage = "all";

  const incSel = document.getElementById("incsel");
  const incStats = document.getElementById("incstats");
  const evidence = document.getElementById("evidence");

  incSel.innerHTML = CODES.map((c) => `<button class="btn ${c === cur ? "primary" : ""}" data-c="${c}">${c}</button>`).join("");
  incSel.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    cur = b.dataset.c;
    incSel.querySelectorAll("button").forEach((x) => x.classList.toggle("primary", x.dataset.c === cur));
    render();
  }));

  document.getElementById("stagefilter").innerHTML = STAGES.map((s) =>
    `<button class="btn ${s === stage ? "primary" : ""}" data-stage="${s}">${s}</button>`).join("");
  document.querySelectorAll("#stagefilter button").forEach((b) => b.addEventListener("click", () => {
    stage = b.dataset.stage;
    document.querySelectorAll("#stagefilter button").forEach((x) => x.classList.toggle("primary", x.dataset.stage === stage));
    render();
  }));

  const guide = [
    ["Terminal chain", "five exact events", "p-recipe"],
    ["Relay path", "hop-expanded trace", "p-walk"],
    ["System context", "boundary crossing", "p-sys"],
  ];
  document.getElementById("steps").innerHTML = guide.map(([t, dd, id], i) =>
    `<button data-id="${id}"><span class="idx">${i + 1}</span><span><span class="t">${t}</span><span class="d">${dd}</span></span></button>`).join("");
  document.querySelectorAll("#steps button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#steps button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.id).scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  function stageOf(action) {
    if (action === "queue_subordinate_task") return "relay";
    if (action === "saidit_post_check") return "check";
    if (action === "saidit_post") return "post";
    if (action === "delete_file") return "cleanup";
    return "other";
  }

  function showRecEvidence(title, r) {
    evidenceBox(evidence, title, eventRows(r), r);
  }

  function render() {
    const I = d.incidents[cur];
    incStats.innerHTML = [
      ["hops", I.hop_count, "info"],
      ["Agents", I.distinct_agent_count, "purple"],
      ["cross-dept hops", I.cross_dept_hops, "warn"],
      ["John arrivals", I.john_arrival_count, "anom"],
    ].map(([l, n, c]) => `<div class="stat ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
    document.getElementById("recipe-sub").textContent = `${cur} / origin ${name(I.origin)} / post id ${I.post?.id || "unknown"} / ${I.post?.when || ""}`;
    drawRecipe(I);
    drawWalk(I);
    drawSys(I);
    const selected = I.recipe?.find((r) => r.action === "saidit_post") || I.recipe?.[0];
    if (selected) showRecEvidence(`${cur}: selected terminal evidence`, selected);
  }

  function drawRecipe(I) {
    const svg = document.getElementById("recipe");
    svg.innerHTML = "";
    labelSvg(svg, `${cur} terminal five-step event chain`);
    const rec = I.recipe || [];
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 270`);
    const defs = add(svg, "defs");
    const marker = add(defs, "marker", { id: `arrow-${cur}`, markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto" });
    add(marker, "path", { d: "M0,0 L6,3 L0,6 Z", fill: "#bdc9d8" });

    const pad = 28, y = 126;
    const gap = (W - pad * 2) / Math.max(rec.length, 5);
    const boxW = Math.min(188, gap - 18), boxH = 76;
    const colors = {
      relay: "var(--purple)",
      check: "var(--warn)",
      post: "var(--anom)",
      cleanup: "var(--info)",
    };
    const labels = {
      queue_subordinate_task: "relay task",
      saidit_post_check: "post check",
      saidit_post: "public post",
      delete_file: "cleanup",
    };

    rec.forEach((r, i) => {
      const s = stageOf(r.action);
      const match = stage === "all" || stage === s;
      const cx = pad + i * gap + gap / 2;
      if (i < rec.length - 1) {
        add(svg, "line", { x1: cx + boxW / 2, y1: y, x2: cx + gap - boxW / 2, y2: y,
          stroke: "#bdc9d8", "stroke-width": 2, "marker-end": `url(#arrow-${cur})`, opacity: stage === "all" ? .85 : .3 });
      }
      const g = add(svg, "g", { opacity: match ? 1 : .26 });
      makeInteractive(g, `${cur} terminal step ${i + 1}: ${r.action}`, () => showRecEvidence(`${cur}: terminal step ${i + 1}`, r));
      add(g, "rect", { x: cx - boxW / 2, y: y - boxH / 2, width: boxW, height: boxH, rx: 7,
        fill: "#f8fafc", stroke: colors[s] || "var(--border2)", "stroke-width": s === "post" ? 2.4 : 1.5 });
      add(g, "text", { x: cx, y: y - 18, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800,
        fill: colors[s] || "var(--text)" }, `${i + 1}. ${labels[r.action] || r.action}`);
      add(g, "text", { x: cx, y: y + 1, "text-anchor": "middle", "font-size": 11, fill: "#526174" },
        r.action === "queue_subordinate_task" ? `${name(r.from)} -> John` : "John Agent");
      const detail = r.detail.content_source || r.detail.target || r.detail.task || r.detail.forum || "";
      if (detail) add(g, "text", { x: cx, y: y + 18, "text-anchor": "middle", "font-size": 10.5,
        fill: "#63748a", "font-family": "var(--mono)" }, String(detail).slice(0, Math.max(16, Math.floor(boxW / 7))));
      add(svg, "text", { x: cx, y: y + boxH / 2 + 24, "text-anchor": "middle", "font-size": 10.5,
        fill: "#63748a", "font-family": "var(--mono)" }, r.when.slice(11));
      add(svg, "text", { x: cx, y: y + boxH / 2 + 40, "text-anchor": "middle", "font-size": 10,
        fill: "#7a8797", "font-family": "var(--mono)" }, `id ${r.id}`);
      g.addEventListener("mousemove", (e) => showTip(
        `<div class="tt-h">${i + 1}. ${r.action}</div><div class="tt-r">${r.when} / id ${r.id}</div><div class="tt-r">${JSON.stringify(r.detail)}</div>`, e));
      g.addEventListener("mouseleave", hideTip);
    });

    add(svg, "text", { x: 34, y: 28, "font-size": 12, fill: "#526174" },
      "Focus filter fades non-selected stages; event ids and times remain visible for audit screenshots.");
  }

  function drawWalk(I) {
    const svg = document.getElementById("walk");
    svg.innerHTML = "";
    labelSvg(svg, `${cur} hop-expanded relay route`);
    const hops = I.hops || [];
    const agents = I.distinct_agents.slice().sort((a, b) => {
      if (a === "john_windward") return 1;
      if (b === "john_windward") return -1;
      if (a === I.origin) return -1;
      if (b === I.origin) return 1;
      const da = d.org.person_dept[a] || "";
      const db = d.org.person_dept[b] || "";
      return da === db ? a.localeCompare(b) : da.localeCompare(db);
    });
    const rowOf = {};
    agents.forEach((a, i) => rowOf[a] = i);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 540`);
    const ml = 158, mr = 34, mt = 26, mb = 36;
    const rh = (540 - mt - mb) / agents.length;
    const x = (i) => ml + (hops.length <= 1 ? 0 : (i / (hops.length - 1)) * (W - ml - mr));
    const y = (a) => mt + rowOf[a] * rh + rh / 2;

    agents.forEach((a) => {
      const isJohn = a === "john_windward";
      const isOrigin = a === I.origin;
      add(svg, "rect", { x: ml, y: y(a) - rh / 2 + 1, width: W - ml - mr, height: rh - 2,
        fill: isJohn ? "rgba(201,59,69,.08)" : isOrigin ? "rgba(37,111,184,.08)" : "transparent" });
      add(svg, "line", { x1: ml, y1: y(a), x2: W - mr, y2: y(a), stroke: "#d8e1ec", "stroke-width": 1 });
      const dept = d.org.person_dept[a];
      add(svg, "circle", { cx: ml - 132, cy: y(a), r: 4, fill: deptColor(dept) });
      add(svg, "text", { x: ml - 122, y: y(a) + 4, "font-size": 11.5,
        fill: isJohn ? "var(--anom)" : isOrigin ? "var(--info)" : "var(--muted)",
        "font-weight": (isJohn || isOrigin) ? 800 : 400 },
        name(a) + (isJohn ? " / terminal endpoint" : isOrigin ? " / origin" : ""));
    });

    let prevX = x(0), prevY = y(hops[0]?.from || I.origin);
    add(svg, "circle", { cx: prevX, cy: prevY, r: 4, fill: "var(--info)" });
    hops.forEach((h, i) => {
      const px = x(i), py = y(h.to);
      const toJohn = h.to === "john_windward";
      const selfLoop = h.from === h.to;
      add(svg, "line", { x1: prevX, y1: prevY, x2: px, y2: py,
        stroke: toJohn ? "rgba(201,59,69,.65)" : selfLoop ? "rgba(166,106,0,.72)" : "rgba(37,111,184,.35)",
        "stroke-width": toJohn ? 2 : selfLoop ? 1.8 : 1.2 });
      const c = add(svg, "circle", { cx: px, cy: py, r: toJohn ? 5.5 : selfLoop ? 4.2 : 2.7,
        fill: toJohn ? "var(--anom)" : selfLoop ? "var(--warn)" : "#8bb7e8", stroke: "#fff", "stroke-width": toJohn ? 1.2 : 0 });
      makeInteractive(c, `${cur} relay hop ${i + 1}: ${name(h.from)} to ${name(h.to)}`, () => evidenceBox(evidence, `${cur}: relay hop ${i + 1}`, [
        ["event id", h.id],
        ["time UTC-7", h.when],
        ["from", name(h.from)],
        ["to", name(h.to)],
        ["task", "read_file"],
        ["arrival at John", toJohn ? "yes" : "no"],
      ], h));
      c.addEventListener("mousemove", (e) => showTip(
        `<div class="tt-h">hop ${i + 1}${toJohn ? " / arrival at John" : ""}</div><div class="tt-r">${name(h.from)} -> ${name(h.to)}</div><div class="tt-r">${h.when} / id ${h.id}</div>`, e));
      c.addEventListener("mouseleave", hideTip);
      prevX = px; prevY = py;
    });

    [0, Math.floor(hops.length / 4), Math.floor(hops.length / 2), Math.floor(3 * hops.length / 4), hops.length - 1]
      .filter((v, i, a) => v >= 0 && a.indexOf(v) === i)
      .forEach((i) => add(svg, "text", { x: x(i), y: 525, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" }, `hop ${i + 1}`));

    const depts = [...new Set(agents.map((a) => d.org.person_dept[a]))].filter(Boolean);
    document.getElementById("walk-legend").innerHTML = depts.map((dp) =>
      `<span class="pill"><span class="dot" style="background:${deptColor(dp)}"></span>${name(dp)}</span>`).join("")
      + `<span class="pill"><span class="dot" style="background:var(--anom)"></span>arrival at John: ${I.john_arrival_count}</span>`
      + `<span class="pill"><span class="dot" style="background:var(--warn)"></span>self-loop</span>`;
  }

  function drawSys(I) {
    const src = I.source_doc;
    const cf = I.create_file;
    const payloadMeta = cf ? `${cf.size_hint.toLocaleString()} B${cf.word_count ? ` / ${cf.word_count.toLocaleString()} words` : ""}` : "no visible create_file record";
    document.getElementById("sysflow").innerHTML = `
      <div class="flow">
        <div class="fbox src"><div class="k">1. internal document</div>
          <div class="v">${src ? src.name : "source outside data window"}</div>
          <div class="s">${src ? `read by ${name(src.read_by)} / ${src.when}` : "HiddenOrca source not visible"}</div></div>
        <div class="farrow">-></div>
        <div class="fbox pay"><div class="k">2. payload file</div>
          <div class="v">${I.code}.txt</div><div class="s">${payloadMeta}</div></div>
        <div class="farrow">-></div>
        <div class="fbox agent"><div class="k">3. Agent relay</div>
          <div class="v">${I.hop_count} read_file relay hops</div>
          <div class="s">${I.distinct_agent_count} Agents / ${I.cross_dept_hops} cross-department hops</div></div>
        <div class="farrow">-></div>
        <div class="fbox post"><div class="k">4. public boundary</div>
          <div class="v">saidit_post(content_source)</div>
          <div class="s">John Agent / forum=general / cleanup follows</div></div>
      </div>
      <div class="note" style="margin-top:14px"><b>System interpretation:</b> steps 1-3 remain internal operations. Step 4 is the external publication boundary, which is why Q3 evaluates a single SaidIt boundary gate instead of broad relay blocking.</div>`;
  }

  render();
})();
