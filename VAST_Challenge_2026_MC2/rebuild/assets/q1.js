/* q1.js - terminal recipe, hop-expanded route, system boundary context */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, deptColor, evidenceBox, eventRows, state, setState, toTs } = MC2;
  const CODES = ["SwiftWren", "MellowOtter", "HiddenOrca"];
  const STAGES = ["all", "relay", "check", "post", "cleanup"];
  let cur = state().incident;
  let stage = "all";
  let walkMode = state().walk;
  let selectedAgent = state().agent;

  const incSel = document.getElementById("incsel");
  const incStats = document.getElementById("incstats");
  const evidence = document.getElementById("evidence");

  incSel.innerHTML = CODES.map((c) => `<button class="btn ${c === cur ? "primary" : ""}" data-c="${c}">${c}</button>`).join("");
  incSel.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    setState({ incident: b.dataset.c, agent: "" });
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
    ["File lifecycle", "source to cleanup", "p-life"],
    ["Relay path", "hop-expanded trace", "p-walk"],
    ["Departments", "propagation matrix", "p-dept"],
    ["Flow ribbons", "top department flows", "p-flow"],
    ["System context", "boundary crossing", "p-sys"],
  ];
  function renderGuide() {
    const visibleGuide = guide.filter(([, , id]) => state().mode === "explore" || !["p-dept", "p-flow"].includes(id));
    document.getElementById("steps").innerHTML = visibleGuide.map(([t, dd, id], i) =>
      `<button data-id="${id}"><span class="idx">${i + 1}</span><span><span class="t">${t}</span><span class="d">${dd}</span></span></button>`).join("");
    document.querySelectorAll("#steps button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#steps button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      document.getElementById(b.dataset.id).scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  document.getElementById("walk-hop").addEventListener("click", () => setState({ walk: "hop" }));
  document.getElementById("walk-time").addEventListener("click", () => setState({ walk: "time" }));
  document.getElementById("clear-agent").addEventListener("click", () => setState({ agent: "" }));
  document.addEventListener("mc2statechange", (ev) => {
    const next = ev.detail;
    const changed = cur !== next.incident || walkMode !== next.walk || selectedAgent !== next.agent;
    cur = next.incident;
    walkMode = next.walk;
    selectedAgent = next.agent;
    incSel.querySelectorAll("button").forEach((x) => x.classList.toggle("primary", x.dataset.c === cur));
    document.getElementById("walk-hop").classList.toggle("primary", walkMode === "hop");
    document.getElementById("walk-time").classList.toggle("primary", walkMode === "time");
    document.getElementById("clear-agent").disabled = !selectedAgent;
    renderGuide();
    if (changed) render();
  });

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
    drawLifecycle(I);
    drawWalk(I);
    drawDeptMatrix(I);
    drawDeptFlow(I);
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

  function drawLifecycle(I) {
    const svg = document.getElementById("lifecycle");
    if (!svg || !I.lifecycle) return;
    svg.innerHTML = "";
    labelSvg(svg, `${cur} file lifecycle timeline from source read to cleanup`);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 250`);
    const ml = 42, mr = 34, mt = 52, y = 116;
    const events = I.lifecycle;
    const shown = events.length;
    const x = (i) => ml + (shown <= 1 ? 0 : (i / (shown - 1)) * (W - ml - mr));
    const color = (status, stage) => status === "unknown" ? "var(--dim)" : stage === "public_post" ? "var(--anom)" : stage.startsWith("cleanup") ? "var(--info)" : "var(--ok)";
    add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#bdc9d8", "stroke-width": 2 });
    events.forEach((ev, i) => {
      const xx = x(i);
      const unknown = ev.status === "unknown";
      add(svg, "line", { x1: xx, y1: y - 34, x2: xx, y2: y + 34, stroke: "#d8e1ec" });
      const c = add(svg, "circle", { cx: xx, cy: y, r: ev.stage === "public_post" ? 9 : 7,
        fill: color(ev.status, ev.stage), opacity: unknown ? .55 : 1, stroke: "#fff", "stroke-width": 2 });
      makeInteractive(c, `${cur} lifecycle ${ev.label}`, () => evidenceBox(evidence, `${cur}: ${ev.label}`, [
        ["status", ev.status],
        ["time UTC-7", ev.when || "not visible"],
        ["event id", ev.event_id || "not visible"],
        ["actor", name(ev.actor)],
        ["target", ev.target || "not visible"],
      ], ev));
      c.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${ev.label}</div><div class="tt-r">${ev.status}${ev.event_id ? ` / id ${ev.event_id}` : ""}</div><div class="tt-r">${ev.when || "not visible"}</div>`, e));
      c.addEventListener("mouseleave", hideTip);
      const short = {
        source_read: "source read",
        payload_create: "payload",
        first_relay: "first relay",
        final_arrival: "John arrival",
        post_check: "post check",
        public_post: "public post",
        cleanup_1: "delete 1",
        cleanup_2: "delete 2",
      }[ev.stage] || ev.label;
      add(svg, "text", { x: xx, y: y - 43, "text-anchor": "middle", "font-size": 11.2,
        "font-weight": ev.stage === "public_post" ? 800 : 600, fill: color(ev.status, ev.stage) }, short);
      add(svg, "text", { x: xx, y: y + 54, "text-anchor": "middle", "font-size": 10.2,
        fill: "#63748a", "font-family": "var(--mono)" }, ev.event_id ? `id ${ev.event_id}` : "unknown");
      add(svg, "text", { x: xx, y: y + 70, "text-anchor": "middle", "font-size": 10,
        fill: "#7a8797", "font-family": "var(--mono)" }, ev.when ? ev.when.slice(5, 16) : "outside window");
    });
    add(svg, "text", { x: ml, y: 24, "font-size": 12.5, fill: "#526174" },
      "Green = observed internal file/task evidence, red = public SaidIt boundary, gray = unknown from available logs.");

    const outs = I.john_arrival_outcomes || [];
    const posted = outs.filter((o) => o.outcome === "posted to SaidIt").length;
    document.getElementById("johnoutcomes").innerHTML = `<div class="cards2">
      <div class="card">
        <h3>John arrival outcomes</h3>
        <table class="grid">
          <tr><th>#</th><th>Arrival time</th><th>From</th><th>Observed next outcome</th></tr>
          ${outs.map((o, i) => `<tr>
            <td class="num">${i + 1}</td><td>${o.arrival_when}</td><td>${name(o.from)}</td>
            <td><span class="badge ${o.outcome === "posted to SaidIt" ? "obs" : "inf"}">${o.outcome}</span></td>
          </tr>`).join("")}
        </table>
      </div>
      <div class="card">
        <h3>Interpretation guardrail</h3>
        <p class="tight">Arrival at John is necessary in the observed terminal chain, but not sufficient. For ${cur}, <b>${posted}</b> of <b>${outs.length}</b> John arrivals directly produced the public post.</p>
        <div class="note">This prevents a misleading causal claim that every John arrival automatically posts to SaidIt.</div>
      </div>
    </div>`;
  }

  function drawWalk(I) {
    const svg = document.getElementById("walk");
    svg.innerHTML = "";
    labelSvg(svg, `${cur} Agent relay swimlane by ${walkMode === "time" ? "elapsed time" : "hop order"}`);
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
    const times = hops.map((h) => toTs(h.when));
    const minTime = Math.min(...times), maxTime = Math.max(...times);
    const x = (i) => walkMode === "time"
      ? ml + ((times[i] - minTime) / Math.max(1, maxTime - minTime)) * (W - ml - mr)
      : ml + (hops.length <= 1 ? 0 : (i / (hops.length - 1)) * (W - ml - mr));
    const y = (a) => mt + rowOf[a] * rh + rh / 2;
    document.getElementById("walk-sub").textContent = walkMode === "time"
      ? "Agents on y-axis, elapsed challenge time on x-axis"
      : "Agents on y-axis, hop order on x-axis";

    agents.forEach((a) => {
      const isJohn = a === "john_windward";
      const isOrigin = a === I.origin;
      const selected = !selectedAgent || selectedAgent === a;
      const row = add(svg, "g", { opacity: selected ? 1 : .22 });
      add(row, "rect", { x: ml, y: y(a) - rh / 2 + 1, width: W - ml - mr, height: rh - 2,
        fill: isJohn ? "rgba(201,59,69,.08)" : isOrigin ? "rgba(37,111,184,.08)" : "transparent" });
      add(row, "line", { x1: ml, y1: y(a), x2: W - mr, y2: y(a), stroke: "#d8e1ec", "stroke-width": 1 });
      const dept = d.org.person_dept[a];
      add(row, "circle", { cx: ml - 132, cy: y(a), r: 4, fill: deptColor(dept) });
      const label = add(row, "text", { x: ml - 122, y: y(a) + 4, "font-size": 11.5,
        fill: isJohn ? "var(--anom)" : isOrigin ? "var(--info)" : "var(--muted)",
        "font-weight": (isJohn || isOrigin) ? 800 : 400 },
        name(a) + (isJohn ? " / terminal endpoint" : isOrigin ? " / origin" : ""));
      makeInteractive(label, `Filter relay path to ${name(a)}`, () => setState({ agent: selectedAgent === a ? "" : a }));
    });

    let prevX = x(0), prevY = y(hops[0]?.from || I.origin);
    add(svg, "circle", { cx: prevX, cy: prevY, r: 4, fill: "var(--info)" });
    hops.forEach((h, i) => {
      const px = x(i), py = y(h.to);
      const toJohn = h.to === "john_windward";
      const selfLoop = h.from === h.to;
      const involvesSelected = !selectedAgent || h.from === selectedAgent || h.to === selectedAgent;
      add(svg, "line", { x1: prevX, y1: prevY, x2: px, y2: py,
        stroke: toJohn ? "rgba(201,59,69,.65)" : selfLoop ? "rgba(166,106,0,.72)" : "rgba(37,111,184,.35)",
        "stroke-width": toJohn ? 2 : selfLoop ? 1.8 : 1.2, opacity: involvesSelected ? 1 : .12 });
      const c = add(svg, "circle", { cx: px, cy: py, r: toJohn ? 5.5 : selfLoop ? 4.2 : 2.7,
        fill: toJohn ? "var(--anom)" : selfLoop ? "var(--warn)" : "#8bb7e8", stroke: "#fff", "stroke-width": toJohn ? 1.2 : 0,
        opacity: involvesSelected ? 1 : .16 });
      makeInteractive(c, `${cur} relay hop ${i + 1}: ${name(h.from)} to ${name(h.to)}`, () => {
        setState({ agent: h.to });
        evidenceBox(evidence, `${cur}: relay hop ${i + 1}`, [
        ["event id", h.id],
        ["time UTC-7", h.when],
        ["from", name(h.from)],
        ["to", name(h.to)],
        ["task", "read_file"],
        ["arrival at John", toJohn ? "yes" : "no"],
      ], h);
      });
      c.addEventListener("mousemove", (e) => showTip(
        `<div class="tt-h">hop ${i + 1}${toJohn ? " / arrival at John" : ""}</div><div class="tt-r">${name(h.from)} -> ${name(h.to)}</div><div class="tt-r">${h.when} / id ${h.id}</div>`, e));
      c.addEventListener("mouseleave", hideTip);
      prevX = px; prevY = py;
    });

    [0, Math.floor(hops.length / 4), Math.floor(hops.length / 2), Math.floor(3 * hops.length / 4), hops.length - 1]
      .filter((v, i, a) => v >= 0 && a.indexOf(v) === i)
      .forEach((i) => add(svg, "text", { x: x(i), y: 525, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" },
        walkMode === "time" ? hops[i].when.slice(5, 16) : `hop ${i + 1}`));

    const depts = [...new Set(agents.map((a) => d.org.person_dept[a]))].filter(Boolean);
    document.getElementById("walk-legend").innerHTML = depts.map((dp) =>
      `<span class="pill"><span class="dot" style="background:${deptColor(dp)}"></span>${name(dp)}</span>`).join("")
      + `<span class="pill"><span class="dot" style="background:var(--anom)"></span>arrival at John: ${I.john_arrival_count}</span>`
      + `<span class="pill"><span class="dot" style="background:var(--warn)"></span>self-loop</span>`;
  }

  function drawDeptMatrix(I) {
    const svg = document.getElementById("deptmatrix");
    if (!svg || !I.department_flow) return;
    svg.innerHTML = "";
    labelSvg(svg, `${cur} department-to-department relay matrix`);
    const depts = I.departments_touched.slice();
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 420;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const ml = 172, mt = 90, mr = 150, mb = 44;
    const size = Math.min((W - ml - mr) / depts.length, (H - mt - mb) / depts.length);
    const lookup = new Map(I.department_flow.map((e) => [`${e.from}|${e.to}`, e.count]));
    const max = Math.max(...I.department_flow.map((e) => e.count), 1);
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, `${cur}: ${I.cross_dept_hops} cross-department relay hops`);
    add(svg, "text", { x: ml, y: 44, "font-size": 11.5, fill: "#526174" },
      "Rows are sender departments; columns are receiver departments. Darker cells mean more relay traffic.");
    depts.forEach((dp, i) => {
      const x = ml + i * size + size / 2;
      const y = mt + i * size + size / 2;
      add(svg, "text", { x, y: mt - 12, "text-anchor": "middle", "font-size": 10.5, fill: "#526174",
        transform: `rotate(-35 ${x} ${mt - 12})` }, name(dp));
      add(svg, "text", { x: ml - 10, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#526174" }, name(dp));
    });
    depts.forEach((from, r) => {
      depts.forEach((to, c) => {
        const v = lookup.get(`${from}|${to}`) || 0;
        const intensity = v ? .18 + .82 * Math.sqrt(v / max) : 0;
        const fill = from === to ? `rgba(37,111,184,${intensity})` : `rgba(201,59,69,${intensity})`;
        const rect = add(svg, "rect", { x: ml + c * size + 2, y: mt + r * size + 2,
          width: size - 4, height: size - 4, rx: 4, fill: v ? fill : "#f4f6fa", stroke: "#d8e1ec" });
        rect.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${name(from)} -> ${name(to)}</div><div class="tt-r">${v} relay hops</div><div class="tt-r">${from === to ? "within department" : "cross department"}</div>`, e));
        rect.addEventListener("mouseleave", hideTip);
        if (v) add(svg, "text", { x: ml + c * size + size / 2, y: mt + r * size + size / 2 + 4,
          "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: intensity > .55 ? "#fff" : "#172033" }, v);
      });
    });
    const lx = W - mr + 24, ly = mt + 24;
    add(svg, "rect", { x: lx, y: ly, width: 12, height: 12, rx: 2, fill: "rgba(201,59,69,.74)" });
    add(svg, "text", { x: lx + 18, y: ly + 10, "font-size": 11.5, fill: "#526174" }, "cross-dept flow");
    add(svg, "rect", { x: lx, y: ly + 24, width: 12, height: 12, rx: 2, fill: "rgba(37,111,184,.62)" });
    add(svg, "text", { x: lx + 18, y: ly + 34, "font-size": 11.5, fill: "#526174" }, "within-dept flow");
    add(svg, "text", { x: ml, y: H - 14, "font-size": 11.5, fill: "#526174" },
      "This aggregation complements the hop path: the path explains order; the matrix explains organizational spread.");
  }

  function drawDeptFlow(I) {
    const svg = document.getElementById("deptflow");
    if (!svg || !I.department_flow) return;
    svg.innerHTML = "";
    labelSvg(svg, `${cur} top department relay directions as flow ribbons`);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 380, ml = 170, mr = 170, mt = 54, mb = 44;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const flows = I.department_flow
      .filter((f) => f.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    const depts = [...new Set(flows.flatMap((f) => [f.from, f.to]))].filter((x) => x !== "unknown");
    const yOf = {};
    depts.forEach((dp, i) => yOf[dp] = mt + 32 + i * ((H - mt - mb - 40) / Math.max(1, depts.length - 1)));
    const max = Math.max(...flows.map((f) => f.count), 1);
    const x1 = ml, x2 = W - mr;
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, `${cur}: strongest department relay directions`);
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Curved ribbons show top aggregated directions only. Width encodes hop count; omitted low-count flows remain in the matrix.");
    depts.forEach((dp) => {
      const y = yOf[dp];
      add(svg, "circle", { cx: x1, cy: y, r: 5, fill: deptColor(dp) });
      add(svg, "circle", { cx: x2, cy: y, r: 5, fill: deptColor(dp) });
      add(svg, "text", { x: x1 - 10, y: y + 4, "text-anchor": "end", "font-size": 11.5, fill: "#526174" }, name(dp));
      add(svg, "text", { x: x2 + 10, y: y + 4, "font-size": 11.5, fill: "#526174" }, name(dp));
    });
    add(svg, "text", { x: x1, y: mt + 8, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#526174" }, "from department");
    add(svg, "text", { x: x2, y: mt + 8, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#526174" }, "to department");
    flows.forEach((f, i) => {
      const yA = yOf[f.from], yB = yOf[f.to];
      if (yA == null || yB == null) return;
      const sw = 1.5 + 9 * Math.sqrt(f.count / max);
      const path = `M${x1},${yA} C${x1 + 180},${yA} ${x2 - 180},${yB} ${x2},${yB}`;
      const p = add(svg, "path", { d: path, fill: "none", stroke: f.from === f.to ? "rgba(37,111,184,.42)" : "rgba(201,59,69,.45)",
        "stroke-width": sw, "stroke-linecap": "round", opacity: .72 });
      p.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${name(f.from)} -> ${name(f.to)}</div><div class="tt-r">${f.count} relay hops</div><div class="tt-r">rank ${i + 1} of top ${flows.length}</div>`, e));
      p.addEventListener("mouseleave", hideTip);
      if (i < 3) {
        const xm = (x1 + x2) / 2;
        const ym = (yA + yB) / 2 + [-18, 0, 18][i];
        add(svg, "text", { x: xm, y: ym, "text-anchor": "middle", "font-size": 10.8, fill: "#526174", "font-family": "var(--mono)" }, f.count);
      }
    });
    add(svg, "text", { x: ml, y: H - 14, "font-size": 11.5, fill: "#526174" },
      "This view uses aggregation to avoid a force-directed hairball while still showing directional structure.");
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

  renderGuide();
  document.getElementById("walk-hop").classList.toggle("primary", walkMode === "hop");
  document.getElementById("walk-time").classList.toggle("primary", walkMode === "time");
  document.getElementById("clear-agent").disabled = !selectedAgent;
  render();
})();
