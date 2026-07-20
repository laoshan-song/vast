/* q3.js - recurrence timeline, baseline comparison, and one intervention */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, evidenceBox, toTs, daysBetween, state, setState } = MC2;
  const inc = d.incidents;
  const evidence = document.getElementById("evidence");
  const CODES = ["HiddenOrca", "MellowOtter", "SwiftWren"];

  const guide = [
    ["Discovery path", "baseline to recurrence", "p-base"],
    ["Prior occurrences", "terminal recipe", "p-prior"],
    ["Scale comparison", "dot plot metrics", "p-scale"],
    ["Shared Agents", "supporting context", "p-upset"],
    ["Rule tradeoffs", "data plus analyst cost", "p-parallel"],
    ["Single intervention", "SaidIt boundary", "p-fix"],
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
  document.addEventListener("mc2statechange", renderGuide);
  renderGuide();

  function showGateEvidence() {
    evidenceBox(evidence, "SaidIt boundary gate evidence", [
      ["rule", "actor is Agent AND saidit_post.details.content_source exists -> block or review"],
      ["known anomalies covered", "3 / 3"],
      ["observed normal human false positives", "0 / 105"],
      ["why this point", "irreversible external-publication boundary"],
      ["limitation", "does not catch a future variant that writes ordinary content directly"],
    ], { saidit_baseline: d.saidit_baseline, saidit_check: d.saidit_check });
  }

  function showIncidentEvidence(c) {
    if (state().incident !== c) setState({ incident: c });
    const I = inc[c];
    const post = I.recipe?.find((x) => x.action === "saidit_post") || null;
    evidenceBox(evidence, `${c}: recurrence evidence`, [
      ["post event", post ? `id ${post.id}, ${post.when}` : "not visible"],
      ["origin / first visible source", name(I.origin)],
      ["relay hops", I.hop_count],
      ["distinct Agents", I.distinct_agent_count],
      ["departments touched", I.departments_touched.length],
      ["John arrivals", I.john_arrival_count],
      ["source document", I.source_doc ? I.source_doc.name : "unknown / outside data window"],
      ["shared terminal mechanism", "John Agent -> saidit_post(content_source) -> delete files"],
    ], { post_event: post, source_doc: I.source_doc || null, create_file: I.create_file || null, recipe: I.recipe || [] });
  }

  function ratioCard(title, parts, note) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    return `<div class="card">
      <h3>${title}</h3>
      <div class="ratio-bar">
        ${parts.map((p) => `<div style="width:${(p.value / total) * 100}%;background:${p.color};min-width:${p.value ? 3 : 0}px" title="${p.label}: ${p.value}"></div>`).join("")}
      </div>
      <div class="legend">
        ${parts.map((p) => `<span class="pill"><span class="dot" style="background:${p.color}"></span>${p.label}: <b>${p.value.toLocaleString()}</b></span>`).join("")}
      </div>
      <div class="note" style="margin-top:10px">${note}</div>
    </div>`;
  }

  const b = d.saidit_baseline;
  const ck = d.saidit_check;
  const vir = d.virus;
  function drawBaselineChart() {
    const svg = document.getElementById("baselinechart");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Discovery funnel and denominator-safe baseline comparison for Q3 recurrence.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 520, ml = 252, mr = 136, mt = 220, rowH = 70;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);

    const funnel = [
      { label: "All SaidIt posts", value: b.total, sub: "observed posts", color: "var(--muted)" },
      { label: "content_source posts", value: b.with_content_source, sub: "file-backed", color: "var(--anom)" },
      { label: "John Agent endpoints", value: b.by_agent, sub: "same terminal poster", color: "var(--anom)" },
      { label: "recurrence incidents", value: CODES.length, sub: "HiddenOrca, MellowOtter, SwiftWren", color: "var(--anom)" },
    ];
    const fw = (W - 76 - 76) / funnel.length;
    add(svg, "text", { x: 76, y: 24, "font-size": 13.5, "font-weight": 800 }, "Discovery path from prompt to recurrence");
    add(svg, "text", { x: 76, y: 44, "font-size": 11.8, fill: "#526174" },
      "Start from the official SaidIt clue, scan post fields, isolate content_source posts, then test whether the terminal mechanism repeats.");
    funnel.forEach((step, i) => {
      const x = 76 + i * fw;
      const y = 74;
      const boxW = Math.min(188, fw - 26);
      const rect = add(svg, "rect", { x, y, width: boxW, height: 96, rx: 8, fill: i === 0 ? "#f8fafc" : "#fff4f5",
        stroke: i === 0 ? "#d8e1ec" : "rgba(201,59,69,.45)" });
      makeInteractive(rect, step.label, () => evidenceBox(evidence, "Q3 discovery step", [
        ["step", step.label],
        ["count", step.value],
        ["evidence", step.sub],
      ], { saidit_baseline: b, incidents: CODES }));
      add(svg, "text", { x: x + 12, y: y + 24, "font-size": 11.5, "font-weight": 800, fill: "#526174" }, `step ${i + 1}`);
      add(svg, "text", { x: x + 12, y: y + 56, "font-size": 24, "font-weight": 900, fill: step.color,
        "font-family": "var(--mono)" }, step.value.toLocaleString());
      add(svg, "text", { x: x + 12, y: y + 76, "font-size": 12, "font-weight": 800, fill: "#172033" }, step.label);
      add(svg, "text", { x: x + 12, y: y + 92, "font-size": 10.5, fill: "#63748a" }, step.sub);
      if (i < funnel.length - 1) {
        const ax = x + boxW + 7;
        const ay = y + 48;
        add(svg, "line", { x1: ax, y1: ay, x2: x + fw - 16, y2: ay, stroke: "#bdc9d8", "stroke-width": 1.8, "marker-end": "url(#arrow)" });
      }
    });

    const rows = [
      { label: "Actor type among SaidIt posts", denom: `${b.total} SaidIt posts`, normal: b.by_person, anomaly: b.by_agent, normalLabel: "person", anomalyLabel: "Agent" },
      { label: "Post content field", denom: `${b.total} SaidIt posts`, normal: b.with_content_topic, anomaly: b.with_content_source, normalLabel: "ordinary content", anomalyLabel: "content_source file" },
      { label: "Post-check outcome", denom: `${ck.total_checks} post_check events`, normal: ck.checks_not_posting, anomaly: ck.checks_leading_to_post, normalLabel: "no public post", anomalyLabel: "led to post" },
    ];
    const max = Math.max(...rows.flatMap((r) => [r.normal, r.anomaly]), 1);
    const x = (v) => ml + (v / max) * (W - ml - mr);
    add(svg, "text", { x: ml, y: 192, "font-size": 13.5, "font-weight": 800 }, "Denominator-safe baseline comparison");
    add(svg, "text", { x: ml, y: 211, "font-size": 11.8, fill: "#526174" },
      "Rows 1-2 use 108 SaidIt posts; row 3 uses 71 post_check events.");
    rows.forEach((r, i) => {
      const y = mt + i * rowH + 22;
      add(svg, "text", { x: ml - 14, y: y + 13, "text-anchor": "end", "font-size": 12,
        "font-weight": 800, fill: "#526174" }, r.label);
      add(svg, "text", { x: ml - 14, y: y + 30, "text-anchor": "end", "font-size": 10.4,
        fill: "#7a8797" }, r.denom);
      add(svg, "line", { x1: ml, y1: y - 8, x2: W - mr, y2: y - 8, stroke: "#eef3f8" });
      const bars = [
        { v: r.normal, label: r.normalLabel, color: "var(--ok)", yy: y - 8 },
        { v: r.anomaly, label: r.anomalyLabel, color: "var(--anom)", yy: y + 18 },
      ];
      bars.forEach((bar) => {
        const rect = add(svg, "rect", { x: ml, y: bar.yy, width: Math.max(3, x(bar.v) - ml), height: 19, rx: 4, fill: bar.color, opacity: .86 });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${r.label}</div><div class="tt-r">${bar.label}: ${bar.v.toLocaleString()}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        const longBar = bar.v / max > .44;
        add(svg, "text", { x: longBar ? x(bar.v) - 8 : Math.min(x(bar.v) + 8, W - mr - 8), y: bar.yy + 14,
          "text-anchor": longBar ? "end" : "start", "font-size": 10.8,
          "font-weight": 800, fill: longBar ? "#fff" : bar.color }, `${bar.label}: ${bar.v.toLocaleString()}`);
      });
    });
    add(svg, "text", { x: ml, y: H - 24, "font-size": 11.5, fill: "#526174" },
      `${b.with_content_source}/${b.total} SaidIt posts use content_source; these are the three observed recurrence incidents.`);
  }
  document.getElementById("baseline").innerHTML = `
    <div class="cards3">
      ${ratioCard("Who posted to SaidIt?", [
        { label: "person", value: b.by_person, color: "var(--ok)" },
        { label: "Agent", value: b.by_agent, color: "var(--anom)" },
      ], `Denominator: <b>${b.total}</b> SaidIt posts. Only <b>${b.by_agent}</b> are Agent-initiated, and all three are file-source anomalies.`)}
      ${ratioCard("What field supplied content?", [
        { label: "ordinary content", value: b.with_content_topic, color: "var(--ok)" },
        { label: "content_source file", value: b.with_content_source, color: "var(--anom)" },
      ], `Denominator: <b>${b.total}</b> SaidIt posts. <b>${b.with_content_source}</b> posts use <code>content_source</code>, exactly the three observed anomalies.`)}
      ${ratioCard("What happened after post_check?", [
        { label: "no public post", value: ck.checks_not_posting, color: "var(--warn)" },
        { label: "led to post", value: ck.checks_leading_to_post, color: "var(--anom)" },
      ], `Denominator: <b>${ck.total_checks}</b> <code>saidit_post_check</code> events. Only <b>${ck.checks_leading_to_post}</b> led to posting, all John Agent terminal cases.`)}
    </div>
    <div class="note" style="margin-top:14px"><b>Noise control:</b> the dataset also contains ${vir.count.toLocaleString()} <code>virus:true</code> events, but they do not touch codename files or SaidIt (<code>${vir.touch_codename_files}/${vir.touch_saidit}</code>). They are background noise, not evidence for the file-source posting mechanism.</div>`;

  function drawTimeline() {
    const svg = document.getElementById("timeline");
    svg.innerHTML = "";
    labelSvg(svg, "Timeline of the three file-source SaidIt incidents with propagation spans.");
    const posts = CODES.map((c) => ({
      c,
      first: inc[c].first_hop_when,
      post: inc[c].post.when,
      hops: inc[c].hop_count,
      agents: inc[c].distinct_agent_count,
      color: c === "SwiftWren" ? "var(--anom)" : c === "MellowOtter" ? "var(--purple)" : "var(--info)",
    }));
    const allT = posts.flatMap((p) => [toTs(p.first), toTs(p.post)]);
    const min = Math.min(...allT);
    const max = Math.max(...allT);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 240`);
    const ml = 46, mr = 102, y0 = 68, rowH = 48;
    const x = (t) => ml + ((t - min) / (max - min)) * (W - ml - mr);

    add(svg, "line", { x1: ml, y1: y0 - 32, x2: W - mr, y2: y0 - 32, stroke: "#bdc9d8" });
    for (let day = 8; day <= 17; day++) {
      const t = Date.parse(`2046-05-${String(day).padStart(2, "0")}T00:00:00Z`);
      if (t < min || t > max) continue;
      add(svg, "line", { x1: x(t), y1: y0 - 36, x2: x(t), y2: y0 + rowH * 3, stroke: "#eef3f8" });
      add(svg, "text", { x: x(t), y: y0 - 40, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" }, `May ${day}`);
    }

    posts.forEach((p, i) => {
      const y = y0 + i * rowH;
      const x1 = x(toTs(p.first));
      const x2 = x(toTs(p.post));
      add(svg, "rect", { x: x1, y: y - 7, width: Math.max(3, x2 - x1), height: 14, rx: 7, fill: p.color, opacity: .25 });
      add(svg, "circle", { cx: x1, cy: y, r: 4, fill: p.color });
      const marker = add(svg, "circle", { cx: x2, cy: y, r: 7, fill: p.color, stroke: "#fff", "stroke-width": 2 });
      makeInteractive(marker, `${p.c} recurrence evidence`, () => showIncidentEvidence(p.c));
      marker.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${p.c}</div><div class="tt-r">${p.post}</div><div class="tt-r">${p.hops} hops / ${p.agents} Agents</div>`, e));
      marker.addEventListener("mouseleave", hideTip);
      const right = x2 > ml + .72 * (W - ml - mr);
      add(svg, "text", { x: right ? x2 - 12 : x2 + 12, y: y + 4, "text-anchor": right ? "end" : "start",
        "font-size": 12.5, "font-weight": 800, fill: p.color }, `${p.c} / ${p.hops} hops`);
      add(svg, "text", { x: x1, y: y + 22, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" }, "first hop");
    });

    add(svg, "text", { x: ml, y: 228, "font-size": 11.5, fill: "#526174" },
      "Span length encodes propagation duration; the dot encodes the public post time. Click post dots for evidence.");
  }

  drawTimeline();

  function drawTerminalRecipes() {
    const svg = document.getElementById("terminalrecipes");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Small-multiple terminal recipes for the three recurring file-source SaidIt incidents.");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 430, ml = 220, mr = 70, mt = 72, rowH = 104;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    add(svg, "text", { x: ml, y: 24, "font-size": 13.5, "font-weight": 800 }, "Repeated terminal recipe evidence");
    add(svg, "text", { x: ml, y: 44, "font-size": 11.8, fill: "#526174" },
      "Each row uses the observed terminal event records. Same five-step recipe across incidents is the recurrence proof.");
    const steps = [
      { action: "queue_subordinate_task", label: "relay arrives", color: "var(--purple)" },
      { action: "saidit_post_check", label: "post check", color: "var(--warn)" },
      { action: "saidit_post", label: "content_source post", color: "var(--anom)" },
      { action: "delete_file", label: "delete instruction", color: "#7a8797", nth: 0 },
      { action: "delete_file", label: "delete payload", color: "#7a8797", nth: 1 },
    ];
    const x = (i) => ml + i * ((W - ml - mr) / (steps.length - 1));
    CODES.forEach((code, row) => {
      const I = inc[code];
      const y = mt + row * rowH;
      const recipe = I.recipe || [];
      const deletes = recipe.filter((e) => e.action === "delete_file");
      const stepEvents = steps.map((s) => {
        if (s.action === "delete_file") return deletes[s.nth] || null;
        return recipe.find((e) => e.action === s.action) || null;
      });
      add(svg, "text", { x: ml - 56, y: y + 6, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 900, fill: code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)" }, code);
      add(svg, "text", { x: ml - 56, y: y + 24, "text-anchor": "end", "font-size": 10.5,
        fill: "#63748a" }, `${I.hop_count} hops / ${I.john_arrival_count} John arrival${I.john_arrival_count === 1 ? "" : "s"}`);
      add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#d8e1ec", "stroke-width": 1.5 });
      stepEvents.forEach((ev, i) => {
        const xx = x(i);
        if (i > 0) add(svg, "line", { x1: x(i - 1) + 11, y1: y, x2: xx - 11, y2: y, stroke: "#bdc9d8", "stroke-width": 1.4 });
        const step = steps[i];
        const fill = ev ? step.color : "#f4f6fa";
        const circ = add(svg, "circle", { cx: xx, cy: y, r: 11, fill, stroke: ev ? "#fff" : "#bdc9d8", "stroke-width": 2 });
        makeInteractive(circ, `${code}: ${step.label}`, () => showIncidentEvidence(code));
        circ.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${code}: ${step.label}</div><div class="tt-r">${ev ? `id ${ev.id}, ${ev.when}` : "not observed"}</div>`, e));
        circ.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: xx, y: y + 34, "text-anchor": "middle", "font-size": 10.4,
          "font-weight": 750, fill: "#526174" }, step.label);
        add(svg, "text", { x: xx, y: y + 50, "text-anchor": "middle", "font-size": 9.8,
          fill: "#7a8797", "font-family": "var(--mono)" }, ev ? `id ${ev.id}` : "missing");
      });
    });
    add(svg, "text", { x: ml, y: H - 22, "font-size": 11.5, fill: "#526174" },
      "Different upstream relay sizes, same terminal recipe: this is why Q3 treats the issue as repeatable system behavior.");
  }
  drawTerminalRecipes();

  const rows = [
    ["post time (UTC-7)", (c) => inc[c].post.when],
    ["content source", (c) => `${c}.txt`],
    ["origin", (c) => name(inc[c].origin)],
    ["relay hops", (c) => inc[c].hop_count],
    ["distinct Agents", (c) => inc[c].distinct_agent_count],
    ["departments touched", (c) => inc[c].departments_touched.length],
    ["John arrivals", (c) => inc[c].john_arrival_count],
    ["propagation days", (c) => daysBetween(inc[c].first_hop_when, inc[c].post.when).toFixed(2)],
    ["visible source doc", (c) => inc[c].source_doc ? "yes" : "no, outside window"],
    ["terminal endpoint", () => "John Agent"],
    ["cleanup", () => "delete instruction + payload"],
  ];
  document.getElementById("priortable").innerHTML = `<table class="grid">
    <tr><th>Metric</th>${CODES.map((c) => `<th>${c}</th>`).join("")}</tr>
    ${rows.map(([lab, fn]) => `<tr><td>${lab}</td>${CODES.map((c) => `<td>${fn(c)}</td>`).join("")}</tr>`).join("")}
  </table>
  <div class="note" style="margin-top:12px"><b>Shared mechanism:</b> <code>instruction relay -> John Agent -> content_source post -> cleanup</code>. Three successful occurrences with different origins are sufficient evidence that the behavior is repeatable.</div>`;

  function drawScalePlot() {
    const svg = document.getElementById("scaleplot");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Incident scale dot plots comparing hops, agents, departments, arrivals, duration, and cross-department hops.");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 420, ml = 196, mr = 74, mt = 56, mb = 48;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const metrics = [
      { key: "hop_count", label: "relay hops", fmt: (v) => v.toLocaleString(), get: (I) => I.hop_count },
      { key: "distinct_agent_count", label: "distinct Agents", fmt: (v) => v.toLocaleString(), get: (I) => I.distinct_agent_count },
      { key: "departments", label: "departments touched", fmt: (v) => v.toLocaleString(), get: (I) => I.departments_touched.length },
      { key: "john_arrival_count", label: "John arrivals", fmt: (v) => v.toLocaleString(), get: (I) => I.john_arrival_count },
      { key: "propagation_days", label: "propagation days", fmt: (v) => v.toFixed(2), get: (I) => daysBetween(I.first_hop_when, I.post.when) },
      { key: "cross_dept_hops", label: "cross-dept hops", fmt: (v) => v.toLocaleString(), get: (I) => I.cross_dept_hops },
    ];
    const colors = { HiddenOrca: "var(--info)", MellowOtter: "var(--purple)", SwiftWren: "var(--anom)" };
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, "Incident scale comparison");
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Separate axes avoid a misleading single normalized score; click dots for exact evidence.");
    const rowH = (H - mt - mb) / metrics.length;
    metrics.forEach((m, i) => {
      const y = mt + i * rowH + rowH / 2;
      const vals = CODES.map((c) => ({ c, v: m.get(inc[c]) }));
      const max = Math.max(...vals.map((x) => x.v), 1);
      const x = (v) => ml + (v / max) * (W - ml - mr);
      add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#d8e1ec", "stroke-width": 1.5 });
      [0].forEach((tick) => {
        const xx = x(tick);
        add(svg, "line", { x1: xx, y1: y - 6, x2: xx, y2: y + 6, stroke: "#bdc9d8" });
        add(svg, "text", { x: xx, y: y + 22, "text-anchor": tick === 0 ? "start" : "end", "font-size": 10.4, fill: "#63748a" }, m.fmt(tick));
      });
      add(svg, "text", { x: ml - 14, y: y + 4, "text-anchor": "end", "font-size": 12,
        "font-weight": 700, fill: "#526174" }, m.label);
      vals.forEach(({ c, v }, j) => {
        const xx = x(v);
        const yy = y + (j - 1) * 9;
        const dot = add(svg, "circle", { cx: xx, cy: yy, r: c === "SwiftWren" ? 6.5 : 5.2,
          fill: colors[c], stroke: "#fff", "stroke-width": 1.8 });
        makeInteractive(dot, `${c} ${m.label}: ${m.fmt(v)}`, () => showIncidentEvidence(c));
        dot.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c}</div><div class="tt-r">${m.label}: ${m.fmt(v)}</div>`, e));
        dot.addEventListener("mouseleave", hideTip);
        if (v === max || c === "SwiftWren") {
          const nearRight = xx > W - mr - 96;
          add(svg, "text", { x: nearRight ? xx - 10 : xx + 9, y: yy + 4,
            "text-anchor": nearRight ? "end" : "start", "font-size": 10.5,
            "font-weight": c === "SwiftWren" ? 800 : 600, fill: colors[c] }, `${c}: ${m.fmt(v)}`);
        }
      });
    });
    CODES.forEach((c, i) => {
      const x = ml + i * 166;
      add(svg, "circle", { cx: x, cy: H - 16, r: 5, fill: colors[c] });
      add(svg, "text", { x: x + 10, y: H - 12, "font-size": 11.5, fill: "#526174" }, c);
    });
  }

  function drawRecurrenceBars() {
    const svg = document.getElementById("recurrencebars");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Numeric recurrence bar matrix comparing incident scale and propagation burden.");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 480, ml = 190, mr = 72, mt = 76, rowH = 62;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    add(svg, "text", { x: 34, y: 24, "font-size": 13.5, "font-weight": 900 }, "Recurrence scale as descriptive statistics");
    add(svg, "text", { x: 34, y: 45, "font-size": 11.8, fill: "#526174" },
      "Each row is one comparable metric. Length encodes value; labels keep exact numbers visible.");

    const durationHours = (I) => Math.max(0, (toTs(I.post.when) - toTs(I.first_hop_when)) / 3600000);
    const metrics = [
      { label: "relay hops", get: (I) => I.hop_count, unit: "hops", color: "var(--info)" },
      { label: "distinct Agents", get: (I) => I.distinct_agent_count, unit: "Agents", color: "var(--purple)" },
      { label: "departments touched", get: (I) => I.departments_touched.length, unit: "depts", color: "var(--ok)" },
      { label: "cross-dept hops", get: (I) => I.cross_dept_hops, unit: "hops", color: "var(--anom)" },
      { label: "John arrivals", get: (I) => I.john_arrival_count, unit: "arrivals", color: "var(--warn)" },
      { label: "propagation duration", get: (I) => durationHours(I), unit: "hours", color: "var(--cyan)", fmt: (v) => v >= 24 ? `${(v / 24).toFixed(1)}d` : `${v.toFixed(1)}h` },
    ];
    const plotW = W - ml - mr;
    metrics.forEach((m, mi) => {
      const y = mt + mi * rowH;
      const vals = CODES.map((code) => ({ code, value: m.get(inc[code]) }));
      const max = Math.max(...vals.map((v) => v.value), 1);
      add(svg, "text", { x: ml - 16, y: y + 26, "text-anchor": "end",
        "font-size": 12, "font-weight": 900, fill: "#526174" }, m.label);
      add(svg, "line", { x1: ml, y1: y + 32, x2: W - mr, y2: y + 32, stroke: "#eef3f8" });
      vals.forEach((v, i) => {
        const laneY = y + i * 17;
        const w = (v.value / max) * plotW;
        const fill = v.code === "SwiftWren" ? "var(--anom)" : v.code === "MellowOtter" ? "var(--purple)" : "var(--info)";
        const rect = add(svg, "rect", { x: ml, y: laneY, width: Math.max(3, w), height: 12, rx: 4,
          fill, opacity: .78 });
        makeInteractive(rect, `${v.code}: ${m.label}`, () => showIncidentEvidence(v.code));
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${v.code}: ${m.label}</div><div class="tt-r">${m.fmt ? m.fmt(v.value) : `${v.value.toLocaleString()} ${m.unit}`}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: ml + Math.max(3, w) + 7, y: laneY + 10, "font-size": 10.4,
          fill: "#526174", "font-family": "var(--mono)" }, m.fmt ? m.fmt(v.value) : v.value.toLocaleString());
      });
    });
    CODES.forEach((code, i) => {
      const x = ml + i * 160;
      const fill = code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)";
      add(svg, "rect", { x, y: H - 28, width: 12, height: 12, rx: 2, fill });
      add(svg, "text", { x: x + 18, y: H - 18, "font-size": 11.5, fill: "#526174" }, code);
    });
    add(svg, "text", { x: 34, y: H - 52, "font-size": 11.3, fill: "#526174" },
      "Interpretation: the repeated mechanism is shared, but SwiftWren is much larger by hop count, cross-department movement, John arrivals, and duration.");
  }

  function drawUpSet() {
    const svg = document.getElementById("upset");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "UpSet intersection chart of Agent membership across HiddenOrca, MellowOtter, and SwiftWren.");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 390, ml = 182, mr = 36, mt = 54, barBottom = 205;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const sets = CODES.map((c) => new Set(inc[c].distinct_agents));
    const allAgents = [...new Set(CODES.flatMap((c) => inc[c].distinct_agents))];
    const groups = new Map();
    allAgents.forEach((agent) => {
      const bits = sets.map((set) => set.has(agent) ? "1" : "0").join("");
      if (!groups.has(bits)) groups.set(bits, []);
      groups.get(bits).push(agent);
    });
    const combos = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || b[0].localeCompare(a[0]));
    const max = Math.max(...combos.map(([, agents]) => agents.length), 1);
    const colW = (W - ml - mr) / combos.length;
    const x = (i) => ml + i * colW + colW / 2;
    const yBar = (v) => barBottom - (v / max) * 118;
    add(svg, "text", { x: ml, y: 22, "font-size": 13.5, "font-weight": 800 }, "Shared-Agent membership intersections");
    add(svg, "text", { x: ml, y: 42, "font-size": 12, fill: "#46576b" },
      "Bar height counts Agents with the exact membership pattern shown by connected dots below.");
    [0, max].forEach((tick) => {
      const y = yBar(tick);
      add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#e7edf4" });
      add(svg, "text", { x: ml - 10, y: y + 4, "text-anchor": "end", "font-size": 11.5, fill: "#66758a" }, tick);
    });
    const rowYs = [254, 302, 350];
    CODES.forEach((code, i) => {
      add(svg, "text", { x: ml - 16, y: rowYs[i] + 4, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 800, fill: code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)" }, code);
      add(svg, "line", { x1: ml, y1: rowYs[i], x2: W - mr, y2: rowYs[i], stroke: "#eef3f8" });
    });
    combos.forEach(([bits, agents], i) => {
      const xx = x(i), yy = yBar(agents.length);
      const sharedAll = bits === "111";
      const col = sharedAll ? "var(--anom)" : bits.split("").filter((b) => b === "1").length > 1 ? "var(--purple)" : "var(--info)";
      const bar = add(svg, "rect", { x: xx - Math.min(30, colW * .32), y: yy,
        width: Math.min(60, colW * .64), height: barBottom - yy, rx: 4, fill: col, opacity: sharedAll ? .92 : .68 });
      makeInteractive(bar, `${agents.length} Agents in membership ${bits}`, () => evidenceBox(evidence, `Shared-Agent intersection ${bits}`, [
        ["HiddenOrca", bits[0] === "1" ? "included" : "not included"],
        ["MellowOtter", bits[1] === "1" ? "included" : "not included"],
        ["SwiftWren", bits[2] === "1" ? "included" : "not included"],
        ["Agent count", agents.length],
        ["Agents", agents.map(name).join(", ")],
      ], { membership: bits, agents }));
      add(svg, "text", { x: xx, y: yy - 8, "text-anchor": "middle", "font-size": 12.5,
        "font-weight": 900, fill: col }, agents.length);
      const activeRows = [...bits].map((bit, index) => bit === "1" ? index : -1).filter((index) => index >= 0);
      if (activeRows.length > 1) add(svg, "line", { x1: xx, y1: rowYs[Math.min(...activeRows)], x2: xx, y2: rowYs[Math.max(...activeRows)], stroke: col, "stroke-width": 3 });
      rowYs.forEach((rowY, index) => {
        add(svg, "circle", { cx: xx, cy: rowY, r: bits[index] === "1" ? 7 : 5,
          fill: bits[index] === "1" ? col : "#fff", stroke: bits[index] === "1" ? col : "#bdc9d8", "stroke-width": 2 });
      });
    });
  }

  const rationaleByRule = {
    "Agent saidit_post with details.content_source": "all three anomalies cross this exact boundary; no observed normal human content posts are affected",
    "Block all queue_subordinate_task": "breaks normal automation and creates excessive operational cost",
    "Detect *_further_instructions.md relay filenames": "works on current filenames, but a small filename change bypasses it",
    "Remove John Agent SaidIt permission": "works for the observed endpoint but can be bypassed by routing to another posting-capable Agent",
    "Alert on delete_file immediately after content_source post": "helps investigation after exposure, but cannot prevent the public post",
  };
  const costByRule = {
    "Agent saidit_post with details.content_source": 1,
    "Block all queue_subordinate_task": 5,
    "Detect *_further_instructions.md relay filenames": 2,
    "Remove John Agent SaidIt permission": 3,
    "Alert on delete_file immediately after content_source post": 2,
  };
  const verdictOf = (decision) => decision.startsWith("recommended") ? "recommended"
    : decision.startsWith("forensics") ? "forensics only" : "reject";
  const candidates = (d.intervention_rules || []).map((r) => ({
    name: r.rule,
    coverage: r.coverage,
    fp: r.normal_human_false_positives,
    affected: r.records_affected,
    timing: r.timing,
    cost: costByRule[r.rule] || 3,
    costNote: "analyst-assigned ordinal score, not directly logged",
    verdict: verdictOf(r.decision),
    rationale: rationaleByRule[r.rule] || r.decision,
    raw: r,
  }));

  document.getElementById("gate").innerHTML = `
    <div class="flow">
      <div class="fbox agent"><div class="k">request</div><div class="v">Agent saidit_post</div><div class="s">actor type = Agent</div></div>
      <div class="farrow">-></div>
      <div class="fbox" style="border-color:var(--warn)"><div class="k">one intervention point</div><div class="v">details.content_source exists?</div><div class="s">yes -> block / human approval / high-priority alert</div></div>
      <div class="farrow">-></div>
      <div class="fbox post"><div class="k">otherwise</div><div class="v">allow ordinary post</div><div class="s">normal human content posts unaffected</div></div>
    </div>
    <div class="stats" style="margin-top:16px">
      <div class="stat anom"><div class="n">3/3</div><div class="l">known anomalies covered</div></div>
      <div class="stat ok"><div class="n">0/105</div><div class="l">observed normal-post false positives</div></div>
      <div class="stat info"><div class="n">1</div><div class="l">single intervention point</div></div>
      <div class="stat warn"><div class="n">boundary</div><div class="l">closest point before public exposure</div></div>
    </div>`;
  showGateEvidence();

  document.getElementById("rulematrix").innerHTML = `<table class="grid evidence-matrix">
    <tr><th>Single rule</th><th>Timing</th><th>Anomaly coverage</th><th>Observed non-anomaly hits</th><th>Records affected</th><th>Decision</th></tr>
    ${candidates.map((c) => `<tr>
      <td style="${c.verdict === "recommended" ? "color:var(--ok);font-weight:800" : ""}">${c.name}</td>
      <td>${c.timing}</td>
      <td><span class="badge ${c.coverage === 3 ? "obs" : "inf"}">${c.coverage}/3</span></td>
      <td><span class="badge ${c.fp === 0 ? "obs" : "unk"}">${c.fp.toLocaleString()}</span></td>
      <td class="num">${c.affected.toLocaleString()}</td>
      <td><span class="badge ${c.verdict === "recommended" ? "obs" : c.verdict === "forensics only" ? "inf" : "unk"}">${c.verdict}</span></td>
    </tr>`).join("")}
  </table>
  <div class="note" style="margin-top:12px"><b>Why the first rule wins:</b> it is pre-publication, covers all observed file-source anomalies, and affects only the three Agent content_source posts in the data. Broad relay blocking touches ${d.qst_overview.total.toLocaleString()} task records and is not proportionate.</div>`;

  document.getElementById("alts").innerHTML = `<table class="grid">
    <tr><th>Candidate</th><th>Coverage</th><th>Observed hits / analyst cost</th><th>Reason</th><th>Decision</th></tr>
    ${candidates.map((c) => `<tr>
      <td style="${c.verdict === "recommended" ? "color:var(--ok);font-weight:800" : ""}">${c.name}</td>
      <td>${c.coverage}/3</td>
      <td>${c.fp.toLocaleString()} / cost ${c.cost}</td>
      <td>${c.rationale}</td>
      <td><span class="badge ${c.verdict === "recommended" ? "obs" : c.verdict === "forensics only" ? "inf" : "unk"}">${c.verdict}</span></td>
    </tr>`).join("")}
  </table>`;

  function drawConfusion() {
    const svg = document.getElementById("confusion");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Two by two confusion matrix for the recommended SaidIt content-source boundary gate.");
    const W = Math.max(720, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 340, ml = 220, mt = 88, cw = Math.min(260, (W - ml - 80) / 2), rh = 82;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const cells = [
      { row: 0, col: 0, title: "blocked / reviewed", value: 3, label: "known anomalies", fill: "rgba(201,59,69,.82)", good: true },
      { row: 0, col: 1, title: "allowed", value: 0, label: "missed anomalies", fill: "rgba(122,135,151,.14)", good: true },
      { row: 1, col: 0, title: "blocked / reviewed", value: 0, label: "observed human false positives", fill: "rgba(122,135,151,.14)", good: true },
      { row: 1, col: 1, title: "allowed", value: 105, label: "normal human posts", fill: "rgba(32,134,90,.80)", good: true },
    ];
    add(svg, "text", { x: 34, y: 24, "font-size": 13, "font-weight": 800 }, "Recommended gate confusion matrix");
    add(svg, "text", { x: 34, y: 43, "font-size": 11.5, fill: "#526174" },
      "Rule: Agent saidit_post with details.content_source -> block or require approval.");
    ["Rule blocks / reviews", "Rule allows"].forEach((t, i) => {
      add(svg, "text", { x: ml + i * cw + cw / 2, y: mt - 18, "text-anchor": "middle",
        "font-size": 12, "font-weight": 800, fill: "#526174" }, t);
    });
    [
      ["Actual anomaly", "Agent + content_source"],
      ["Normal post", "human + content"],
    ].forEach(([t, s], i) => {
      add(svg, "text", { x: ml - 18, y: mt + i * rh + rh / 2 - 4, "text-anchor": "end",
        "font-size": 12.5, "font-weight": 800, fill: i === 0 ? "var(--anom)" : "var(--ok)" }, t);
      add(svg, "text", { x: ml - 18, y: mt + i * rh + rh / 2 + 14, "text-anchor": "end",
        "font-size": 10.5, fill: "#63748a", "font-family": "var(--mono)" }, s);
    });
    cells.forEach((c) => {
      const x = ml + c.col * cw, y = mt + c.row * rh;
      const rect = add(svg, "rect", { x: x + 6, y: y + 6, width: cw - 12, height: rh - 12, rx: 8,
        fill: c.fill, stroke: c.value === 0 ? "#bdc9d8" : "transparent" });
      makeInteractive(rect, `${c.label}: ${c.value}`, () => showGateEvidence());
      rect.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c.label}</div><div class="tt-r">${c.value.toLocaleString()} SaidIt posts</div><div class="tt-r">${c.title}</div>`, e));
      rect.addEventListener("mouseleave", hideTip);
      add(svg, "text", { x: x + cw / 2, y: y + 36, "text-anchor": "middle", "font-size": 25,
        "font-weight": 900, fill: c.value === 0 ? "#526174" : "#fff", "font-family": "var(--mono)" }, c.value.toLocaleString());
      add(svg, "text", { x: x + cw / 2, y: y + 58, "text-anchor": "middle", "font-size": 11.3,
        "font-weight": 700, fill: c.value === 0 ? "#63748a" : "#fff" }, c.label);
    });
    add(svg, "text", { x: ml, y: H - 34, "font-size": 11.5, fill: "#526174" },
      `Observed SaidIt denominator: ${b.total} posts = ${b.with_content_source} content_source anomalies + ${b.with_content_topic} normal human content posts.`);
    add(svg, "text", { x: ml, y: H - 14, "font-size": 11.2, fill: "#526174" },
      "The matrix is not a guarantee against future variants; it validates the selected rule against the observed dataset.");
  }

  function drawParallel() {
    const svg = document.getElementById("parallel");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Parallel coordinates comparing candidate intervention rules.");
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 400, ml = 78, mr = 58, mt = 88, mb = 66;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const axes = [
      { key: "coverage", label: "coverage", min: 0, max: 3, goodHigh: true, get: (c) => c.coverage, fmt: (v) => `${v}/3` },
      { key: "fp", label: "blast radius", min: 0, max: Math.max(...candidates.map((c) => c.fp), 1), goodHigh: false, get: (c) => c.fp, fmt: (v) => Math.round(v).toLocaleString() },
      { key: "affected", label: "records affected", min: 0, max: Math.max(...candidates.map((c) => c.affected), 1), goodHigh: false, get: (c) => c.affected, fmt: (v) => Math.round(v).toLocaleString() },
      { key: "cost", label: "analyst cost", min: 1, max: 5, goodHigh: false, get: (c) => c.cost, fmt: (v) => v.toFixed(0) },
      { key: "timing", label: "prevention timing", min: 0, max: 2, goodHigh: true, get: (c) => c.timing === "pre-publication" ? 2 : c.timing === "post-exposure" ? 0 : 1, fmt: (v) => v === 2 ? "pre" : v === 1 ? "during" : "post" },
    ];
    const x = (i) => ml + i * ((W - ml - mr) / (axes.length - 1));
    const y = (a, v) => {
      const t = (v - a.min) / Math.max(1e-9, a.max - a.min);
      const oriented = a.goodHigh ? t : 1 - t;
      return mt + (1 - oriented) * (H - mt - mb);
    };
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, "Intervention tradeoff parallel coordinates");
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Higher is better after orientation. Coverage, hits, records, and timing are derived counts; cost is analyst-scored 1-5.");
    axes.forEach((a, i) => {
      const xx = x(i);
      add(svg, "line", { x1: xx, y1: mt, x2: xx, y2: H - mb, stroke: "#bdc9d8" });
      add(svg, "text", { x: xx, y: H - 34, "text-anchor": "middle", "font-size": 11.2, "font-weight": 800, fill: "#526174" }, a.label);
      add(svg, "text", { x: xx, y: mt - 8, "text-anchor": "middle", "font-size": 10.2, fill: "#63748a" }, a.goodHigh ? a.fmt(a.max) : a.fmt(a.min));
      add(svg, "text", { x: xx, y: H - mb + 16, "text-anchor": "middle", "font-size": 10.2, fill: "#63748a" }, a.goodHigh ? a.fmt(a.min) : a.fmt(a.max));
    });
    candidates.forEach((c) => {
      const pts = axes.map((a, i) => [x(i), y(a, a.get(c))]);
      const dpath = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      const rec = c.verdict === "recommended";
      const line = add(svg, "path", { d: dpath, fill: "none", stroke: rec ? "var(--ok)" : c.verdict === "forensics only" ? "var(--warn)" : "#7a8797",
        "stroke-width": rec ? 3.2 : 1.8, opacity: rec ? .95 : .56 });
      makeInteractive(line, `${c.name}: ${c.verdict}`, () => evidenceBox(evidence, `${c.name}`, [
        ["coverage", `${c.coverage}/3`],
        ["blast radius", c.fp],
        ["records affected", c.affected],
        ["analyst cost", `${c.cost} (${c.costNote})`],
        ["timing", c.timing],
        ["decision", c.verdict],
      ], c));
      line.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c.name}</div><div class="tt-r">${c.verdict}</div><div class="tt-r">coverage ${c.coverage}/3, analyst cost ${c.cost}</div>`, e));
      line.addEventListener("mouseleave", hideTip);
      if (rec) {
        add(svg, "text", { x: pts[0][0] + 8, y: pts[0][1] - 8, "font-size": 11.5, "font-weight": 800, fill: "var(--ok)" }, "recommended");
      }
    });
    [["recommended", "var(--ok)"], ["forensics only", "var(--warn)"], ["rejected", "#7a8797"]].forEach(([lab, col], i) => {
      const xx = ml + i * 142;
      add(svg, "line", { x1: xx, y1: H - 16, x2: xx + 26, y2: H - 16, stroke: col, "stroke-width": lab === "recommended" ? 3 : 2 });
      add(svg, "text", { x: xx + 34, y: H - 12, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawDecision() {
    const svg = document.getElementById("decision");
    svg.innerHTML = "";
    labelSvg(svg, "Coverage versus analyst-scored operational cost for candidate interventions.");
    const W = Math.max(720, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 300`);
    const ml = 74, mr = 42, mt = 36, mb = 54;
    const plotW = W - ml - mr, plotH = 300 - mt - mb;
    const x = (cost) => ml + ((cost - 1) / 4) * plotW;
    const y = (coverage) => mt + (1 - coverage / 3) * plotH;

    add(svg, "line", { x1: ml, y1: mt + plotH, x2: ml + plotW, y2: mt + plotH, stroke: "#bdc9d8" });
    add(svg, "line", { x1: ml, y1: mt, x2: ml, y2: mt + plotH, stroke: "#bdc9d8" });
    for (let c = 1; c <= 5; c++) {
      add(svg, "line", { x1: x(c), y1: mt, x2: x(c), y2: mt + plotH, stroke: "#eef3f8" });
      add(svg, "text", { x: x(c), y: mt + plotH + 20, "text-anchor": "middle", "font-size": 11, fill: "#63748a" }, c);
    }
    for (let cov = 0; cov <= 3; cov++) {
      add(svg, "line", { x1: ml, y1: y(cov), x2: ml + plotW, y2: y(cov), stroke: "#eef3f8" });
      add(svg, "text", { x: ml - 12, y: y(cov) + 4, "text-anchor": "end", "font-size": 11, fill: "#63748a" }, `${cov}/3`);
    }
    add(svg, "text", { x: ml + plotW / 2, y: 288, "text-anchor": "middle", "font-size": 12, fill: "#526174" }, "analyst-scored operational cost");
      add(svg, "text", { x: 14, y: mt + plotH / 2, transform: `rotate(-90 14 ${mt + plotH / 2})`, "text-anchor": "middle", "font-size": 12, fill: "#526174" }, "known anomaly coverage");
      add(svg, "text", { x: ml + plotW, y: mt - 12, "text-anchor": "end", "font-size": 11, fill: "#63748a" },
        "labels use callouts for co-located candidates");

    const jitter = {
      "Detect *_further_instructions.md relay filenames": -18,
      "Alert on delete_file immediately after content_source post": 18,
    };
    const labelSpec = {
      "SaidIt gate": { dx: 14, dy: -20, w: 84 },
      "Filename rule": { dx: -104, dy: 38, w: 104 },
      "Delete alert": { dx: 22, dy: 64, w: 94 },
      "John-only": { dx: -42, dy: 38, w: 82 },
      "Block tasks": { dx: -104, dy: 18, w: 94 },
    };
    function labelBox(text, px, py, spec, color, recommended) {
      const lx = Math.max(ml + 4, Math.min(W - mr - spec.w, px + spec.dx));
      const ly = Math.max(10, Math.min(300 - 38, py + spec.dy));
      add(svg, "line", { x1: px, y1: py, x2: lx + spec.w / 2, y2: ly + 15, stroke: color, "stroke-width": 1.1, opacity: .45 });
      add(svg, "rect", { x: lx, y: ly, width: spec.w, height: 24, rx: 6, fill: recommended ? "#eef9f4" : "#f8fafc", stroke: color, "stroke-width": recommended ? 1.6 : 1, opacity: .96 });
      add(svg, "text", { x: lx + spec.w / 2, y: ly + 16, "text-anchor": "middle", "font-size": 10.8,
        fill: recommended ? "var(--ok)" : "#526174", "font-weight": recommended ? 850 : 650 }, text);
    }
    candidates.forEach((c) => {
      const recommended = c.verdict === "recommended";
      const px = x(c.cost) + (jitter[c.name] || 0);
      const py = y(c.coverage);
      const r = add(svg, "circle", { cx: px, cy: py, r: recommended ? 9 : 6,
        fill: recommended ? "var(--ok)" : c.verdict === "forensics only" ? "var(--warn)" : "var(--muted)",
        opacity: recommended ? 1 : .72, stroke: "#fff", "stroke-width": recommended ? 2 : 1 });
      makeInteractive(r, `${c.name}: ${c.verdict}`, () => evidenceBox(evidence, `${c.name}`, [
        ["coverage", `${c.coverage}/3`],
        ["false positives", c.fp],
        ["analyst cost", `${c.cost} (${c.costNote})`],
        ["decision", c.verdict],
        ["reason", c.rationale],
      ], c));
      r.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c.name}</div><div class="tt-r">coverage ${c.coverage}/3 / analyst cost ${c.cost}</div><div class="tt-r">${c.verdict}</div>`, e));
      r.addEventListener("mouseleave", hideTip);
      const short = {
        "Agent saidit_post with details.content_source": "SaidIt gate",
        "Block all queue_subordinate_task": "Block tasks",
        "Detect *_further_instructions.md relay filenames": "Filename rule",
        "Remove John Agent SaidIt permission": "John-only",
        "Alert on delete_file immediately after content_source post": "Delete alert",
      }[c.name] || c.name;
      const spec = labelSpec[short] || { dx: 12, dy: 14, w: 90 };
      labelBox(short, px, py, spec, recommended ? "var(--ok)" : c.verdict === "forensics only" ? "var(--warn)" : "#7a8797", recommended);
    });
  }

  drawRecurrenceBars();
  drawScalePlot();
  drawUpSet();
  drawBaselineChart();
  drawParallel();
  drawConfusion();
  drawDecision();
})();
