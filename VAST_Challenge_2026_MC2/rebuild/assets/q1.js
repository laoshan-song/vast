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
  let investigationStep = 0;

  const incSel = document.getElementById("incsel");
  const incStats = document.getElementById("incstats");
  const evidence = document.getElementById("evidence");
  const invStepsEl = document.getElementById("investigationSteps");
  const invTextEl = document.getElementById("investigationText");

  const investigationSteps = [
    ["01", "Use prompt clues", "Why inspect SaidIt at all?"],
    ["02", "Scan post fields", "Which dimension separates normal and odd posts?"],
    ["03", "Compare signatures", "What differs between human posts and Agent posts?"],
    ["04", "Trace payload", "Where does SwiftWren.txt point upstream?"],
    ["05", "Trace relay task", "How did instructions move through Agents?"],
    ["06", "Close the case", "Which exact events prove the post mechanism?"],
  ];
  if (invStepsEl) {
    invStepsEl.innerHTML = investigationSteps.map(([k, v, s], i) =>
      `<button type="button" data-step="${i}" class="${i === investigationStep ? "active" : ""}"><span class="k">step ${k}</span><span class="v">${v}</span><span class="d">${s}</span></button>`).join("");
    invStepsEl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      investigationStep = Number(b.dataset.step);
      invStepsEl.querySelectorAll("button").forEach((x) => x.classList.toggle("active", Number(x.dataset.step) === investigationStep));
      renderInvestigation();
    }));
  }

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
    ["Investigation EDA", "detective workflow", "p-investigation"],
    ["EDA answer path", "six Q1 figures", "p-eda"],
    ["Conclusion", "after evidence", "p-answer"],
    ["Terminal chain", "detailed view", "p-recipe"],
    ["File lifecycle", "detailed view", "p-life"],
    ["Relay path", "detailed view", "p-walk"],
    ["Departments", "system overview", "p-dept"],
    ["System boundary", "system overview", "p-sys"],
  ];
  function renderGuide() {
    document.getElementById("steps").innerHTML = guide.map(([t, dd, id], i) =>
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
    renderInvestigation();
    const selected = I.recipe?.find((r) => r.action === "saidit_post") || I.recipe?.[0];
    if (selected) showRecEvidence(`${cur}: selected terminal evidence`, selected);
  }

  function htmlNotes(question, finding) {
    if (!invTextEl) return;
    invTextEl.innerHTML = `<div class="eda-note"><b>Question driving this step</b>${question}</div><div class="eda-note"><b>What the visual lets us conclude</b>${finding}</div>`;
  }

  function clearSvg(id, h = 520) {
    const svg = document.getElementById(id);
    if (!svg) return null;
    svg.innerHTML = "";
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} ${h}`);
    svg.setAttribute("height", h);
    labelSvg(svg, `Q1 investigation step ${investigationStep + 1}`);
    return { svg, W, H: h };
  }

  function drawBar(svg, x, y, w, h, color, label, value, note = "") {
    add(svg, "rect", { x, y, width: Math.max(0, w), height: h, rx: 6, fill: color, opacity: .9 });
    add(svg, "text", { x: x + 12, y: y + 25, "font-size": 13, "font-weight": 800, fill: "#fff" }, label);
    add(svg, "text", { x: x + w - 12, y: y + 25, "text-anchor": "end", "font-size": 13, "font-weight": 900, fill: "#fff", "font-family": "var(--mono)" }, value);
    if (note) add(svg, "text", { x, y: y + h + 17, "font-size": 11.5, fill: "#526174" }, note);
  }

  function shortText(v, n = 20) {
    const s = String(v == null || v === "" ? "(missing)" : v);
    return s.length > n ? `${s.slice(0, n - 1)}...` : s;
  }

  function countBy(items, get) {
    const m = new Map();
    items.forEach((item) => {
      const raw = get(item);
      const key = raw == null || raw === "" ? "(missing)" : String(raw);
      m.set(key, (m.get(key) || 0) + 1);
    });
    return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }

  function drawInvestigationFunnel() {
    htmlNotes(
      "The prompt already gives SaidIt, John Windward, and May 17 04:21. The first EDA move should therefore be a clue-driven target search, not an arbitrary chart.",
      "We narrow the full log to SaidIt posts, then to John-related posts, then to the target time window. Only after locating the target record do we inspect its fields."
    );
    const box = clearSvg("investigationViz", 520); if (!box) return;
    const { svg, W } = box;
    const posts = d.saidit_posts_compact || [];
    const johnPosts = posts.filter((p) => p.actor === "john_windward");
    const rows = [
      ["all log events", d.total_events, "start from all available data", "var(--dim)"],
      ["SaidIt posts", posts.length, "official platform clue", "var(--info)"],
      ["John Windward SaidIt posts", johnPosts.length, "official actor clue", "var(--warn)"],
      ["May 17 04:21 target record", 1, "official time clue", "var(--anom)"],
    ];
    const maxLog = Math.log10(rows[0][1] + 1);
    const cx = W / 2;
    rows.forEach(([lab, val, why, color], i) => {
      const y = 86 + i * 88;
      const bw = 250 + (Math.log10(val + 1) / maxLog) * Math.min(520, W - 520);
      drawBar(svg, cx - bw / 2, y, bw, 44, color, lab, val.toLocaleString(), why);
      if (i < rows.length - 1) add(svg, "path", { d: `M${cx - 11},${y + 58} L${cx},${y + 72} L${cx + 11},${y + 58}`, fill: "none", stroke: "#bdc9d8", "stroke-width": 2 });
    });
    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    const s2 = detail.svg;
    add(s2, "text", { x: 34, y: 42, "font-size": 15, "font-weight": 800 }, "Data operation shown");
    add(s2, "text", { x: 34, y: 72, "font-size": 13, fill: "#526174" }, "Filter by platform clue -> filter by actor clue -> inspect records near the official timestamp.");
    add(s2, "text", { x: 34, y: 112, "font-size": 13, fill: "#526174" }, "This justifies why SaidIt appears first in the analysis. It is not a post-hoc choice.");
  }

  function drawFieldScan() {
    htmlNotes(
      "After locating the target SaidIt record, we scan several candidate fields across all 108 SaidIt posts. The point is not to assume Agent behavior first; the point is to see which fields have a rare target value.",
      "Forum and actor are not enough: they only locate the record. The fields that explain mechanism are source_field=content_source, actor_type=Agent, file=SwiftWren.txt, post_check=true, and cleanup=true."
    );
    const box = clearSvg("investigationViz", 600); if (!box) return;
    const { svg, W } = box;
    const posts = d.saidit_posts_compact || [];
    const target = posts.find((p) => p.file === "SwiftWren.txt") || {};
    const specs = [
      ["day", (target.when_local || "").slice(0, 10), (p) => (p.when_local || "").slice(0, 10), "target date"],
      ["file", target.file || "(none)", (p) => p.file || "(none)", "specific posted payload"],
      ["actor_type", target.actor_type, (p) => p.actor_type, "human vs automated actor class"],
      ["cleanup", String(!!target.cleanup), (p) => String(!!p.cleanup), "post-event file deletion"],
      ["post_check", String(!!target.post_check), (p) => String(!!p.post_check), "pre-post automation check"],
      ["source_field", target.source_field, (p) => p.source_field, "how post body is supplied"],
    ].map(([field, targetValue, get, why]) => {
      const values = countBy(posts, get);
      const targetCount = values.find((v) => v.value === String(targetValue))?.count || 0;
      const targetRank = values.findIndex((v) => v.value === String(targetValue)) + 1;
      return { field, targetValue: String(targetValue), get, why, values, targetCount, targetRank };
    }).sort((a, b) => a.targetCount - b.targetCount || a.field.localeCompare(b.field));

    const context = [
      ["actor", name(target.actor || "john_windward")],
      ["forum", target.forum || "general"],
    ];
    const x0 = 220, x1 = W - 52, mt = 112, rowH = 62, barH = 24;
    add(svg, "text", { x: x0, y: 28, "font-size": 13.5, "font-weight": 900 }, "Field distribution diagnostic across all 108 SaidIt posts");
    add(svg, "text", { x: x0, y: 48, "font-size": 11.5, fill: "#526174" }, "Red outline marks the target record's value; each stacked bar shows the full field distribution.");
    context.forEach(([k, v], i) => {
      const x = x0 + i * 260;
      add(svg, "rect", { x, y: 62, width: 238, height: 34, rx: 7, fill: "#f8fafc", stroke: "#bdc9d8" });
      add(svg, "text", { x: x + 10, y: 84, "font-size": 11.2, fill: "#526174", "font-family": "var(--mono)" }, k);
      add(svg, "text", { x: x + 78, y: 84, "font-size": 11.6, fill: "#172033", "font-weight": 800 }, shortText(v, 17));
    });
    specs.forEach((r, i) => {
      const y = mt + i * rowH;
      add(svg, "text", { x: 34, y: y + 17, "font-size": 12.2, "font-weight": 900, fill: r.targetCount <= 3 ? "var(--anom)" : "#526174", "font-family": "var(--mono)" }, r.field);
      add(svg, "text", { x: 34, y: y + 36, "font-size": 10.8, fill: "#7a8797" }, shortText(r.why, 27));
      add(svg, "line", { x1: x0, y1: y + barH + 3, x2: x1, y2: y + barH + 3, stroke: "#e6edf5" });
      let x = x0;
      const visible = r.values.slice(0, 5);
      if (!visible.some((v) => v.value === r.targetValue)) {
        const targetPart = r.values.find((v) => v.value === r.targetValue);
        if (targetPart) visible.splice(Math.max(0, visible.length - 1), 1, targetPart);
      }
      const visibleTotal = visible.reduce((s, v) => s + v.count, 0);
      if (visibleTotal < posts.length) visible.push({ value: "other values", count: posts.length - visibleTotal, other: true });
      visible.forEach((v, j) => {
        const w = Math.max(v.count / posts.length * (x1 - x0), v.count ? 5 : 0);
        const isTarget = v.value === r.targetValue;
        const fill = isTarget ? (r.targetCount <= 3 ? "rgba(196,61,75,.82)" : "rgba(37,111,184,.82)") : v.other ? "#e6edf5" : ["#b7c7d9", "#cad7e5", "#d8e2ed", "#e4ebf2", "#eef3f8"][j] || "#eef3f8";
        const rect = add(svg, "rect", { x, y, width: w, height: barH, rx: 4, fill, stroke: isTarget ? "var(--anom)" : "#fff", "stroke-width": isTarget ? 2.4 : 1 });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${r.field}: ${shortText(v.value, 40)}</div><div class="tt-r">${v.count} / ${posts.length} SaidIt posts${isTarget ? " / target value" : ""}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        if (w > 72) add(svg, "text", { x: x + 6, y: y + 15, "font-size": 10.2, "font-weight": isTarget ? 900 : 600, fill: isTarget && r.targetCount <= 3 ? "#fff" : "#526174" }, `${shortText(v.value, 14)} ${v.count}`);
        x += w;
      });
      add(svg, "text", { x: x1, y: y + 42, "text-anchor": "end", "font-size": 11.2, fill: r.targetCount <= 3 ? "var(--anom)" : "#526174", "font-weight": 800, "font-family": "var(--mono)" }, `target: ${shortText(r.targetValue, 22)} = ${r.targetCount}/108`);
    });
    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    drawFieldScanDetail(detail.svg, specs);
  }

  function drawFieldScanDetail(svg, specs) {
    const target = (d.saidit_posts_compact || []).find((p) => p.file === "SwiftWren.txt") || {};
    add(svg, "text", { x: 34, y: 36, "font-size": 15, "font-weight": 900 }, "Field scan interpretation");
    add(svg, "text", { x: 34, y: 66, "font-size": 12.5, fill: "#526174" },
      `Target event id ${target.id || "373902"} is located first; only then are its field values compared against all SaidIt posts.`);
    const rows = specs.slice(0, 6);
    rows.forEach((r, i) => {
      const y = 104 + i * 28;
      add(svg, "text", { x: 44, y, "font-size": 11.8, fill: "#526174", "font-family": "var(--mono)" }, r.field);
      add(svg, "text", { x: 190, y, "font-size": 11.8, fill: r.targetCount <= 3 ? "var(--anom)" : "#172033", "font-weight": 850 }, shortText(r.targetValue, 24));
      add(svg, "text", { x: 430, y, "font-size": 11.8, fill: r.targetCount <= 3 ? "var(--anom)" : "#526174", "font-family": "var(--mono)", "font-weight": 800 }, `${r.targetCount}/108`);
      add(svg, "text", { x: 528, y, "font-size": 11.4, fill: "#7a8797" }, r.targetCount <= 3 ? "mechanism lead" : "locator/context");
    });
    add(svg, "text", { x: 34, y: 278, "font-size": 12.2, fill: "#986200", "font-weight": 800 },
      "Next step: use the mechanism fields to split normal content posts from rare file-source posts.");
  }

  function drawSignatureCompare() {
    htmlNotes(
      "Now we turn the field scan into a count-preserving multi-field split. This is the EDA step that separates the normal posting workflow from the rare file-source workflow.",
      "The thick green stream is the ordinary Human -> content -> no file path. The thin red stream is the Agent -> content_source -> file -> check -> cleanup path, which then splits into three one-record payloads including SwiftWren.txt."
    );
    const box = clearSvg("investigationViz", 580); if (!box) return;
    const { svg, W } = box;
    const cols = [
      { title: "actor_type", normal: "Human", anomaly: "Agent" },
      { title: "source_field", normal: "content", anomaly: "content_source" },
      { title: "file", normal: "no file", anomaly: "file present" },
      { title: "post_check", normal: "none", anomaly: "true" },
      { title: "cleanup", normal: "none", anomaly: "true" },
      { title: "payload", normal: "ordinary text", anomaly: "3 payload files" },
    ];
    const laneStart = 70;
    const laneEnd = Math.max(560, W - 250);
    const xs = cols.map((_, i) => laneStart + i * ((laneEnd - laneStart) / (cols.length - 1)));
    const yNorm = 145, yAnom = 355;
    add(svg, "text", { x: 40, y: 32, "font-size": 13.5, "font-weight": 900 }, "Parallel sets: 108 SaidIt posts split by mechanism fields");
    add(svg, "text", { x: 40, y: 52, "font-size": 11.8, fill: "#526174" }, "Flow width encodes record count; the red branch is not assumed first, it emerges from the field distribution scan.");
    for (let i = 0; i < cols.length - 1; i++) {
      const xA = xs[i] + 48, xB = xs[i + 1] - 48;
      add(svg, "path", { d: `M${xA},${yNorm} C${xA + 52},${yNorm} ${xB - 52},${yNorm} ${xB},${yNorm}`, fill: "none", stroke: "rgba(19,121,91,.38)", "stroke-width": 34, "stroke-linecap": "round" });
      add(svg, "path", { d: `M${xA},${yAnom} C${xA + 52},${yAnom} ${xB - 52},${yAnom} ${xB},${yAnom}`, fill: "none", stroke: "rgba(196,61,75,.72)", "stroke-width": 8, "stroke-linecap": "round" });
    }
    cols.forEach((col, i) => {
      const x = xs[i];
      add(svg, "text", { x, y: 88, "text-anchor": "middle", "font-size": 11.4, "font-weight": 900, fill: "#526174", "font-family": "var(--mono)" }, col.title);
      add(svg, "rect", { x: x - 52, y: yNorm - 34, width: 104, height: 68, rx: 8, fill: "#f8fafc", stroke: "var(--ok)", "stroke-width": 1.8 });
      add(svg, "text", { x, y: yNorm - 5, "text-anchor": "middle", "font-size": 11.5, "font-weight": 900, fill: "var(--ok)" }, shortText(col.normal, 16));
      add(svg, "text", { x, y: yNorm + 15, "text-anchor": "middle", "font-size": 10.8, fill: "#526174", "font-family": "var(--mono)" }, "105 posts");
      add(svg, "rect", { x: x - 52, y: yAnom - 34, width: 104, height: 68, rx: 8, fill: "#fff5f6", stroke: "var(--anom)", "stroke-width": 2 });
      add(svg, "text", { x, y: yAnom - 5, "text-anchor": "middle", "font-size": 11.3, "font-weight": 900, fill: "var(--anom)" }, shortText(col.anomaly, 17));
      add(svg, "text", { x, y: yAnom + 15, "text-anchor": "middle", "font-size": 10.8, fill: "#526174", "font-family": "var(--mono)" }, "3 posts");
    });
    const payloads = [
      ["HiddenOrca.txt", "2046-05-10"],
      ["MellowOtter.txt", "2046-05-10"],
      ["SwiftWren.txt", "2046-05-17"],
    ];
    payloads.forEach(([file, when], i) => {
      const x = Math.max(xs[5] + 62, W - 178);
      const y = 288 + i * 54;
      add(svg, "path", { d: `M${xs[5] + 52},${yAnom} C${xs[5] + 85},${yAnom} ${x - 54},${y} ${x - 28},${y}`, fill: "none", stroke: file === "SwiftWren.txt" ? "var(--anom)" : "rgba(196,61,75,.45)", "stroke-width": file === "SwiftWren.txt" ? 3.2 : 2, "stroke-linecap": "round" });
      add(svg, "rect", { x: x - 28, y: y - 18, width: 128, height: 36, rx: 7, fill: file === "SwiftWren.txt" ? "#fff5f6" : "#f8fafc", stroke: file === "SwiftWren.txt" ? "var(--anom)" : "#bdc9d8", "stroke-width": file === "SwiftWren.txt" ? 2 : 1.2 });
      add(svg, "text", { x: x + 36, y: y - 2, "text-anchor": "middle", "font-size": 10.5, "font-weight": 900, fill: file === "SwiftWren.txt" ? "var(--anom)" : "#526174" }, file);
      add(svg, "text", { x: x + 36, y: y + 13, "text-anchor": "middle", "font-size": 9.5, fill: "#7a8797", "font-family": "var(--mono)" }, `${when} / 1 post`);
    });
    add(svg, "text", { x: 62, y: 500, "font-size": 12, fill: "#526174" }, "This view replaces a colored table with a count-preserving split: same denominator, explicit fields, visible target branch.");
    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    const s = detail.svg;
    add(s, "text", { x: 34, y: 42, "font-size": 15, "font-weight": 900 }, "Why this split justifies the next trace");
    add(s, "text", { x: 34, y: 78, "font-size": 13, fill: "#526174" }, "Normal branch: 105 Human posts use ordinary content, no file source, no cleanup.");
    add(s, "text", { x: 34, y: 116, "font-size": 13, fill: "var(--anom)", "font-weight": 800 }, "Anomaly branch: 3 Agent posts use content_source, file payloads, post_check, and cleanup.");
    add(s, "text", { x: 34, y: 154, "font-size": 13, fill: "#526174" }, "Target branch: SwiftWren.txt is one of the three payload files, so the next evidence object is the file itself.");
    add(s, "text", { x: 34, y: 192, "font-size": 13, fill: "#986200" }, "This answers why we trace SwiftWren.txt without pretending that all John posts are suspicious.");
  }

  function drawPayloadTrace() {
    const I = d.incidents.SwiftWren;
    htmlNotes(
      "The target post points to SwiftWren.txt. The next EDA move is file provenance: who created that file, and what was read immediately before it?",
      "The observed upstream chain is meeting_notes.doc -> SwiftWren.txt -> SaidIt content_source. We keep the claim to provenance, not exact file text."
    );
    const box = clearSvg("investigationViz", 540); if (!box) return;
    const { svg, W } = box;
    add(svg, "text", { x: 46, y: 32, "font-size": 14, "font-weight": 900 }, "Two-row provenance layout: posted file above, upstream source below");
    add(svg, "text", { x: 46, y: 52, "font-size": 11.8, fill: "#526174" }, "Horizontal crowding is avoided: the source chain and the posting chain meet at the shared payload file.");
    const xA = Math.max(102, W * .16), xB = W * .45, xC = W * .74;
    const topY = 135, botY = 295;
    function node(n) {
      const w = 154, h = 70;
      add(svg, "rect", { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 9, fill: n.fill || "#f8fafc", stroke: n.c, "stroke-width": n.strong ? 2.4 : 1.7 });
      add(svg, "text", { x: n.x, y: n.y - 14, "text-anchor": "middle", "font-size": 10.8, fill: "#526174", "font-weight": 850 }, n.title);
      add(svg, "text", { x: n.x, y: n.y + 6, "text-anchor": "middle", "font-size": 11.6, fill: n.c, "font-weight": 900 }, shortText(n.v, 19));
      if (n.sub) add(svg, "text", { x: n.x, y: n.y + 24, "text-anchor": "middle", "font-size": 10.2, fill: "#7a8797", "font-family": "var(--mono)" }, shortText(n.sub, 22));
    }
    function arrow(a, b, label, dashed = false) {
      add(svg, "path", { d: `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`, fill: "none", stroke: dashed ? "#bdc9d8" : "var(--info)", "stroke-width": 2.2, "stroke-dasharray": dashed ? "5 5" : "none", opacity: .78 });
      add(svg, "text", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10, "text-anchor": "middle", "font-size": 10.6, fill: dashed ? "#66758a" : "#526174" }, label);
    }
    const nPrompt = { title: "Prompt target", v: "John + SaidIt + 04:21", sub: "locates event 373902", x: xA, y: topY, c: "var(--dim)" };
    const nPost = { title: "public post record", v: "content_source=SwiftWren.txt", sub: "id 373902", x: xB, y: topY, c: "var(--anom)", fill: "#fff5f6", strong: true };
    const nPayload = { title: "payload file", v: "SwiftWren.txt", sub: "shared object", x: xC, y: topY, c: "var(--ok)", strong: true };
    const nSource = { title: "source read", v: "meeting_notes.doc", sub: "Emma / id 21201", x: xA, y: botY, c: "var(--purple)" };
    const nCreate = { title: "payload created", v: "create_file", sub: "Emma / id 21202", x: xB, y: botY, c: "var(--info)" };
    const nPayload2 = { title: "same payload", v: "SwiftWren.txt", sub: "created one second later", x: xC, y: botY, c: "var(--ok)", strong: true };
    [nPrompt, nPost, nPayload, nSource, nCreate, nPayload2].forEach(node);
    arrow({ x: xA + 77, y: topY }, { x: xB - 77, y: topY }, "target record");
    arrow({ x: xB + 77, y: topY }, { x: xC - 77, y: topY }, "post source");
    arrow({ x: xA + 77, y: botY }, { x: xB - 77, y: botY }, "read then");
    arrow({ x: xB + 77, y: botY }, { x: xC - 77, y: botY }, "create file");
    arrow({ x: xC, y: botY - 35 }, { x: xC, y: topY + 35 }, "same file", true);
    const events = [
      ["2046-05-09 08:02:00", "Emma Harbor", "read_file", "meeting_notes.doc"],
      ["2046-05-09 08:02:01", "Emma Harbor", "create_file", "SwiftWren.txt"],
      [I.post.when, "John Windward", "saidit_post", "content_source=SwiftWren.txt"],
    ];
    events.forEach((e, i) => {
      const y = 410 + i * 34;
      add(svg, "text", { x: 80, y, "font-size": 12, fill: "#526174", "font-family": "var(--mono)" }, e[0]);
      add(svg, "text", { x: 260, y, "font-size": 12, fill: "#172033", "font-weight": 800 }, e[1]);
      add(svg, "text", { x: 430, y, "font-size": 12, fill: i === 2 ? "var(--anom)" : "var(--info)", "font-weight": 800 }, e[2]);
      add(svg, "text", { x: 590, y, "font-size": 12, fill: "#526174" }, e[3]);
    });
    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    const s = detail.svg;
    add(s, "text", { x: 34, y: 42, "font-size": 15, "font-weight": 800 }, "Evidence boundary");
    add(s, "text", { x: 34, y: 76, "font-size": 13, fill: "#526174" }, "Observed: source read, payload creation, target post using content_source.");
    add(s, "text", { x: 34, y: 110, "font-size": 13, fill: "#986200" }, "Inferred: SwiftWren.txt likely derives from meeting_notes.doc due to adjacent read/create events.");
    add(s, "text", { x: 34, y: 144, "font-size": 13, fill: "#66758a" }, "Unknown: exact leaked wording. The logs do not provide full file bodies.");
  }

  function drawRelayTrace() {
    const I = d.incidents.SwiftWren;
    htmlNotes(
      "A payload file explains what got posted, but not how it reached John. We therefore search the relay log for queue_subordinate_task events carrying SwiftWren_further_instructions.md and sort all matches by hop order.",
      "This is no longer a summary trunk: every dot is one relay hop, lanes are departments, and the five red John arrivals are labelled with event ids. Only the final arrival flows into saidit_post_check and publication."
    );
    const box = clearSvg("investigationViz", 560); if (!box) return;
    const { svg, W } = box;
    const x0 = 178, x1 = W - 72;
    add(svg, "text", { x: 46, y: 32, "font-size": 14, "font-weight": 900 }, "Search operation");
    const filters = [
      ["queue_subordinate_task", d.qst_overview.total],
      ["task=read_file", d.qst_overview.task_types.read_file],
      ["contains SwiftWren instructions", I.hop_count],
    ];
    filters.forEach(([lab, n], i) => {
      const x = 58 + i * Math.min(245, (W - 210) / 3);
      add(svg, "rect", { x, y: 50, width: 205, height: 44, rx: 8, fill: "#f8fafc", stroke: i === 2 ? "var(--purple)" : "#bdc9d8", "stroke-width": i === 2 ? 2 : 1.2 });
      add(svg, "text", { x: x + 102, y: 70, "text-anchor": "middle", "font-size": 11.2, "font-weight": 800, fill: i === 2 ? "var(--purple)" : "#526174" }, lab);
      add(svg, "text", { x: x + 102, y: 88, "text-anchor": "middle", "font-size": 11.5, "font-family": "var(--mono)", fill: "#172033" }, n.toLocaleString());
      if (i < filters.length - 1) add(svg, "path", { d: `M${x + 211},72 L${x + 236},72`, stroke: "#bdc9d8", "stroke-width": 2, "marker-end": `url(#arrow-${cur})` });
    });

    add(svg, "text", { x: 46, y: 126, "font-size": 14, "font-weight": 900 }, "Hop-expanded relay path by receiver department");
    const hops = I.hops || [];
    const depts = I.departments_touched.slice();
    const y0 = 164, yGap = 47;
    const yOfDept = {};
    depts.forEach((dp, i) => yOfDept[dp] = y0 + i * yGap);
    const x = (i) => x0 + (i / Math.max(1, hops.length - 1)) * (x1 - x0);
    depts.forEach((dp) => {
      const y = yOfDept[dp];
      add(svg, "line", { x1: x0, y1: y, x2: x1, y2: y, stroke: "#e1e8f0" });
      add(svg, "circle", { cx: x0 - 18, cy: y, r: 4, fill: deptColor(dp) });
      add(svg, "text", { x: x0 - 16, y: y + 4, "text-anchor": "end", "font-size": 11.2, fill: "#526174", "font-weight": 750 }, name(dp));
    });
    let px = x0, py = yOfDept[d.org.person_dept[hops[0]?.from] || depts[0]];
    hops.forEach((h, i) => {
      const dept = d.org.person_dept[h.to] || "unknown";
      const cx = x(i), cy = yOfDept[dept] || y0;
      const toJohn = h.to === "john_windward";
      const selfLoop = h.from === h.to;
      add(svg, "line", { x1: px, y1: py, x2: cx, y2: cy,
        stroke: toJohn ? "rgba(196,61,75,.62)" : selfLoop ? "rgba(152,98,0,.45)" : "rgba(37,111,184,.22)",
        "stroke-width": toJohn ? 1.9 : selfLoop ? 1.4 : .8, opacity: .78 });
      const mark = add(svg, "circle", { cx, cy, r: toJohn ? 5.6 : selfLoop ? 3.4 : 2.4,
        fill: toJohn ? "var(--anom)" : selfLoop ? "var(--warn)" : "#7fb2e5",
        stroke: "#fff", "stroke-width": toJohn ? 1.4 : .4, opacity: .92 });
      mark.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">hop ${i + 1}${toJohn ? " / John arrival" : ""}</div><div class="tt-r">id ${h.id} / ${h.when}</div><div class="tt-r">${name(h.from)} -> ${name(h.to)} / ${name(dept)}</div>`, ev));
      mark.addEventListener("mouseleave", hideTip);
      mark.addEventListener("click", () => evidenceBox(evidence, `SwiftWren relay hop ${i + 1}`, [
        ["event id", h.id],
        ["time UTC-7", h.when],
        ["from", name(h.from)],
        ["to", name(h.to)],
        ["receiver department", name(dept)],
        ["task", "read_file / SwiftWren_further_instructions.md"],
      ], h));
      px = cx; py = cy;
    });
    const arrivals = I.john_arrival_outcomes || [];
    arrivals.forEach((o, i) => {
      const hopIndex = Math.max(0, hops.findIndex((h) => h.id === o.arrival_id));
      const ax = x(hopIndex);
      const ay = yOfDept[d.org.person_dept.john_windward] || y0;
      const posted = o.outcome === "posted to SaidIt";
      const by = posted ? "var(--anom)" : "var(--warn)";
      const labelY = ay - 13 - (i % 2) * 13;
      add(svg, "circle", { cx: ax, cy: ay, r: posted ? 5.8 : 4.8, fill: posted ? "var(--anom)" : "var(--warn)", stroke: "#fff", "stroke-width": 1.2 });
      add(svg, "circle", { cx: ax, cy: labelY, r: posted ? 8.5 : 7.2, fill: posted ? "#fff5f6" : "#fffaf0", stroke: by, "stroke-width": posted ? 2.2 : 1.7 });
      add(svg, "line", { x1: ax, y1: labelY + 8, x2: ax, y2: ay - 6, stroke: by, "stroke-width": 1, opacity: .55 });
      add(svg, "text", { x: ax, y: labelY + 4, "text-anchor": "middle", "font-size": 10.5, "font-weight": 900, fill: by }, String(i + 1));
      add(svg, "line", { x1: ax, y1: ay + 11, x2: ax, y2: 432, stroke: by, "stroke-width": posted ? 1.6 : 1, "stroke-dasharray": posted ? "none" : "4 4", opacity: .7 });
    });
    add(svg, "text", { x: x0, y: 540, "font-size": 10.8, fill: "#63748a" }, "Each dot is one relay hop; numbered circles mark the five John arrivals. Details are listed below.");

    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    const s = detail.svg;
    const outs = I.john_arrival_outcomes || [];
    add(s, "text", { x: 34, y: 38, "font-size": 15, "font-weight": 900 }, "Sorted John arrival outcomes with raw ids");
    add(s, "text", { x: 48, y: 63, "font-size": 10.8, fill: "#7a8797", "font-family": "var(--mono)" }, "#");
    add(s, "text", { x: 84, y: 63, "font-size": 10.8, fill: "#7a8797", "font-family": "var(--mono)" }, "event id");
    add(s, "text", { x: 166, y: 63, "font-size": 10.8, fill: "#7a8797", "font-family": "var(--mono)" }, "time");
    add(s, "text", { x: 300, y: 63, "font-size": 10.8, fill: "#7a8797" }, "from");
    add(s, "text", { x: 560, y: 63, "font-size": 10.8, fill: "#7a8797" }, "outcome");
    outs.forEach((o, i) => {
      const y = 90 + i * 36;
      const posted = o.outcome === "posted to SaidIt";
      add(s, "circle", { cx: 48, cy: y - 4, r: posted ? 6 : 4, fill: posted ? "var(--anom)" : "var(--warn)" });
      add(s, "text", { x: 66, y, "font-size": 11.6, fill: "#172033", "font-weight": 800, "font-family": "var(--mono)" }, String(i + 1));
      add(s, "text", { x: 96, y, "font-size": 11.6, fill: "#526174", "font-family": "var(--mono)" }, String(o.arrival_id));
      add(s, "text", { x: 166, y, "font-size": 11.6, fill: "#526174", "font-family": "var(--mono)" }, o.arrival_when.slice(5));
      add(s, "text", { x: 300, y, "font-size": 11.8, fill: "#172033" }, `${name(o.from)} -> John`);
      add(s, "text", { x: 560, y, "font-size": 11.8, fill: posted ? "var(--anom)" : "#986200", "font-weight": posted ? 850 : 600 }, o.outcome);
    });
  }

  function drawCaseClosure() {
    const I = d.incidents.SwiftWren;
    htmlNotes(
      "The final step combines the discovered signature, payload provenance, instruction relay, and terminal recipe into one evidence chain.",
      "The supported answer is shown as an evidence tree: each branch is a data-supported component of the final mechanism, with uncertainty kept outside the claim."
    );
    const box = clearSvg("investigationViz", 520); if (!box) return;
    const { svg, W } = box;
    const root = { x: W / 2, y: 60, title: "Agent-mediated file-source SaidIt post", sub: "final Q1 mechanism", c: "var(--anom)" };
    const branches = [
      { x: W * .19, y: 178, title: "Target", sub: "John + SaidIt + time", c: "var(--dim)" },
      { x: W * .39, y: 178, title: "Signature", sub: "Agent + file source", c: "var(--warn)" },
      { x: W * .59, y: 178, title: "Payload", sub: "notes -> SwiftWren", c: "var(--purple)" },
      { x: W * .77, y: 178, title: "Relay", sub: "186 hops / 18 Agents", c: "var(--info)" },
    ];
    const leaves = [
      { parent: 0, title: "prompt clues", sub: "task-driven search", y: 310 },
      { parent: 1, title: "rarity scan", sub: "3/108 content_source", y: 310 },
      { parent: 2, title: "read/create", sub: "Emma Harbor events", y: 310 },
      { parent: 3, title: "terminal recipe", sub: "check -> post -> delete", y: 310 },
      { parent: 3, title: "system context", sub: "cross-dept relay", y: 408 },
    ];
    function evidenceNode(n, w = 210, h = 64) {
      add(svg, "rect", { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 9, fill: "#f8fafc", stroke: n.c, "stroke-width": n.c === "var(--anom)" ? 2.4 : 1.6 });
      add(svg, "text", { x: n.x, y: n.y - 5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 900, fill: n.c }, n.title);
      add(svg, "text", { x: n.x, y: n.y + 15, "text-anchor": "middle", "font-size": 10.8, fill: "#526174" }, n.sub);
    }
    evidenceNode(root, 330, 70);
    branches.forEach((b, i) => {
      add(svg, "path", { d: `M${root.x},${root.y + 36} C${root.x},${root.y + 82} ${b.x},${b.y - 76} ${b.x},${b.y - 36}`, fill: "none", stroke: "#bdc9d8", "stroke-width": 2 });
      evidenceNode(b, 220, 64);
    });
    leaves.forEach((l) => {
      const p = branches[l.parent];
      const x = l.parent === 3 && l.y > 350 ? p.x + 52 : p.x;
      add(svg, "path", { d: `M${p.x},${p.y + 34} C${p.x},${p.y + 72} ${x},${l.y - 72} ${x},${l.y - 30}`, fill: "none", stroke: "#d8e1ec", "stroke-width": 1.7 });
      evidenceNode({ x, y: l.y, title: l.title, sub: l.sub, c: p.c }, 190, 58);
    });
    const detail = clearSvg("investigationDetail", 300); if (!detail) return;
    const s = detail.svg;
    add(s, "text", { x: 34, y: 38, "font-size": 15, "font-weight": 800 }, "Final Q1 statement supported by the evidence tree");
    const lines = [
      "The target was identified from the official SaidIt + John + time clues.",
      "Field scanning showed it belongs to the rare Agent/content_source post signature.",
      "File provenance links SwiftWren.txt to an upstream internal document read/create sequence.",
      "Instruction tracing shows the task moved through a long Agent relay before reaching John.",
      "The terminal recipe proves John Agent posted the file source and immediately cleaned up files.",
    ];
    lines.forEach((l, i) => add(s, "text", { x: 44, y: 72 + i * 34, "font-size": 12.5, fill: "#526174" }, `${i + 1}. ${l}`));
  }

  function renderInvestigation() {
    if (!document.getElementById("investigationViz")) return;
    if (investigationStep === 0) drawInvestigationFunnel();
    else if (investigationStep === 1) drawFieldScan();
    else if (investigationStep === 2) drawSignatureCompare();
    else if (investigationStep === 3) drawPayloadTrace();
    else if (investigationStep === 4) drawRelayTrace();
    else drawCaseClosure();
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
    const shortDept = (dp) => ({
      customer_support: "Support",
      executive_suite: "Exec",
      human_resources: "HR",
      information_technologies: "IT",
      legal: "Legal",
      product: "Product",
      sales: "Sales",
      unknown: "Unknown"
    })[dp] || name(dp).replace("Information Technologies", "IT").replace("Customer Support", "Support").replace("Executive Suite", "Exec");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 440;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const ml = 112, mt = 122, mr = 150, mb = 62;
    const size = Math.min((W - ml - mr) / depts.length, (H - mt - mb) / depts.length);
    const lookup = new Map(I.department_flow.map((e) => [`${e.from}|${e.to}`, e.count]));
    const max = Math.max(...I.department_flow.map((e) => e.count), 1);
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, `${cur}: ${I.cross_dept_hops} cross-department relay hops`);
    add(svg, "text", { x: ml, y: 46, "font-size": 11.5, fill: "#526174" },
      "Rows send; columns receive. Darker cells mean more relay hops.");
    depts.forEach((dp, i) => {
      const x = ml + i * size + size / 2;
      const y = mt + i * size + size / 2;
      add(svg, "text", { x, y: mt - 20, "text-anchor": "middle", "font-size": 11, fill: "#526174",
        transform: `rotate(-50 ${x} ${mt - 20})` }, shortDept(dp));
      add(svg, "text", { x: ml - 12, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#526174" }, shortDept(dp));
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
    const svg = document.getElementById("syschart");
    const src = I.source_doc;
    const cf = I.create_file;
    const payloadMeta = cf ? `${cf.size_hint.toLocaleString()} B${cf.word_count ? ` / ${cf.word_count.toLocaleString()} words` : ""}` : "no visible create_file record";
    if (svg) {
      svg.innerHTML = "";
      labelSvg(svg, `${cur} system boundary node-link flow from source document to public SaidIt post.`);
      const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
      const H = 330;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const nodes = [
        { key: "source", title: "Internal document", value: src ? src.name : "source unknown", sub: src ? `read by ${name(src.read_by)} / id ${src.id}` : "outside visible window", status: src ? "observed" : "unknown", color: "var(--info)" },
        { key: "payload", title: "Payload file", value: `${I.code}.txt`, sub: payloadMeta, status: cf ? "observed" : "unknown", color: "var(--ok)" },
        { key: "relay", title: "Agent relay", value: `${I.hop_count} read_file hops`, sub: `${I.distinct_agent_count} Agents / ${I.cross_dept_hops} cross-dept hops`, status: "observed", color: "var(--purple)" },
        { key: "post", title: "Public boundary", value: "saidit_post(content_source)", sub: "John Agent -> SaidIt -> cleanup", status: "observed", color: "var(--anom)" },
      ];
      const x = (i) => 70 + i * ((W - 140) / (nodes.length - 1));
      const y = 150;
      add(svg, "text", { x: 42, y: 26, "font-size": 13.5, "font-weight": 800 }, "Boundary-crossing system flow");
      add(svg, "text", { x: 42, y: 46, "font-size": 11.8, fill: "#526174" },
        "Node color encodes the system stage; red marks the external publication boundary where the incident becomes visible.");
      for (let i = 0; i < nodes.length - 1; i++) {
        const dashed = nodes[i].status === "unknown";
        add(svg, "path", {
          d: `M${x(i) + 92},${y} C${x(i) + 145},${y - 36} ${x(i + 1) - 145},${y - 36} ${x(i + 1) - 92},${y}`,
          fill: "none", stroke: dashed ? "var(--dim)" : "var(--info)", "stroke-width": 2.4,
          "stroke-dasharray": dashed ? "6 5" : "none", opacity: .72,
        });
        add(svg, "text", { x: (x(i) + x(i + 1)) / 2, y: y - 48, "text-anchor": "middle", "font-size": 10.8, fill: dashed ? "var(--dim)" : "#526174" },
          dashed ? "unknown link" : i === 2 ? "public post" : "logged transition");
      }
      nodes.forEach((n, i) => {
        const cx = x(i);
        const g = add(svg, "g");
        add(g, "rect", { x: cx - 92, y: y - 45, width: 184, height: 90, rx: 9,
          fill: "#f8fafc", stroke: n.color, "stroke-width": n.key === "post" ? 2.5 : 1.8,
          "stroke-dasharray": n.status === "unknown" ? "5 4" : "none" });
        add(g, "text", { x: cx, y: y - 20, "text-anchor": "middle", "font-size": 10.8, fill: "#63748a", "font-weight": 800, "text-transform": "uppercase" }, n.title);
        add(g, "text", { x: cx, y: y + 1, "text-anchor": "middle", "font-size": 13, "font-weight": 900, fill: n.color }, n.value.length > 25 ? n.value.slice(0, 24) + "..." : n.value);
        add(g, "text", { x: cx, y: y + 20, "text-anchor": "middle", "font-size": 10.5, fill: "#526174" }, n.sub.length > 34 ? n.sub.slice(0, 33) + "..." : n.sub);
      });
      add(svg, "line", { x1: x(2) + 118, y1: 244, x2: x(3) - 118, y2: 244, stroke: "var(--anom)", "stroke-width": 3 });
      add(svg, "text", { x: (x(2) + x(3)) / 2, y: 268, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "var(--anom)" },
        "single boundary-control target for Q3");
    }
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
