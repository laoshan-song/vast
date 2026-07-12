/* q3.js - recurrence timeline, baseline comparison, and one intervention */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, evidenceBox, toTs, daysBetween } = MC2;
  const inc = d.incidents;
  const evidence = document.getElementById("evidence");
  const CODES = ["HiddenOrca", "MellowOtter", "SwiftWren"];

  const guide = [
    ["Baseline comparison", "normal vs anomaly", "p-base"],
    ["Prior occurrences", "three incidents", "p-prior"],
    ["Single intervention", "SaidIt boundary", "p-fix"],
  ];
  document.getElementById("steps").innerHTML = guide.map(([t, dd, id], i) =>
    `<button data-id="${id}"><span class="idx">${i + 1}</span><span><span class="t">${t}</span><span class="d">${dd}</span></span></button>`).join("");
  document.querySelectorAll("#steps button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#steps button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.id).scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  function showGateEvidence() {
    evidenceBox(evidence, "SaidIt boundary gate evidence", [
      ["rule", "actor is Agent AND saidit_post.details.content_source exists -> block or review"],
      ["known anomalies covered", "3 / 3"],
      ["normal human posts affected", "0 / 105"],
      ["why this point", "irreversible external-publication boundary"],
      ["limitation", "does not catch a future variant that writes ordinary content directly"],
    ], { saidit_baseline: d.saidit_baseline, saidit_check: d.saidit_check });
  }

  function showIncidentEvidence(c) {
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
  document.getElementById("baseline").innerHTML = `
    <div class="cards3">
      ${ratioCard("Who posted to SaidIt?", [
        { label: "person", value: b.by_person, color: "var(--ok)" },
        { label: "Agent", value: b.by_agent, color: "var(--anom)" },
      ], `Only <b>${b.by_agent}</b> of ${b.total} SaidIt posts are Agent-initiated; all three are anomalous file-source posts.`)}
      ${ratioCard("What field supplied content?", [
        { label: "ordinary content", value: b.with_content_topic, color: "var(--ok)" },
        { label: "content_source file", value: b.with_content_source, color: "var(--anom)" },
      ], `<b>${b.with_content_source}</b> posts use <code>content_source</code>, and they are exactly the three anomalies.`)}
      ${ratioCard("What happened after post_check?", [
        { label: "no public post", value: ck.checks_not_posting, color: "var(--warn)" },
        { label: "led to post", value: ck.checks_leading_to_post, color: "var(--anom)" },
      ], `Only <b>${ck.checks_leading_to_post}</b> of ${ck.total_checks} checks led to posting; all are John Agent terminal cases.`)}
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

  const rationaleByRule = {
    "Agent saidit_post with details.content_source": "all three anomalies cross this exact boundary; no normal human content posts are affected",
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
      <div class="stat ok"><div class="n">0/105</div><div class="l">normal human-post false positives</div></div>
      <div class="stat info"><div class="n">1</div><div class="l">single intervention point</div></div>
      <div class="stat warn"><div class="n">boundary</div><div class="l">closest point before public exposure</div></div>
    </div>`;
  showGateEvidence();

  document.getElementById("rulematrix").innerHTML = `<table class="grid evidence-matrix">
    <tr><th>Single rule</th><th>Timing</th><th>Anomaly coverage</th><th>Non-anomaly blast radius</th><th>Records affected</th><th>Decision</th></tr>
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
    <tr><th>Candidate</th><th>Coverage</th><th>Blast radius / cost</th><th>Reason</th><th>Decision</th></tr>
    ${candidates.map((c) => `<tr>
      <td style="${c.verdict === "recommended" ? "color:var(--ok);font-weight:800" : ""}">${c.name}</td>
      <td>${c.coverage}/3</td>
      <td>${c.fp.toLocaleString()} / cost ${c.cost}</td>
      <td>${c.rationale}</td>
      <td><span class="badge ${c.verdict === "recommended" ? "obs" : c.verdict === "forensics only" ? "inf" : "unk"}">${c.verdict}</span></td>
    </tr>`).join("")}
  </table>`;

  function drawDecision() {
    const svg = document.getElementById("decision");
    svg.innerHTML = "";
    labelSvg(svg, "Coverage versus operational cost comparison for candidate interventions.");
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
    add(svg, "text", { x: ml + plotW / 2, y: 288, "text-anchor": "middle", "font-size": 12, fill: "#526174" }, "operational cost / blast radius");
      add(svg, "text", { x: 14, y: mt + plotH / 2, transform: `rotate(-90 14 ${mt + plotH / 2})`, "text-anchor": "middle", "font-size": 12, fill: "#526174" }, "known anomaly coverage");
      add(svg, "text", { x: ml + plotW, y: mt - 12, "text-anchor": "end", "font-size": 11, fill: "#63748a" },
        "co-located candidates are slightly nudged for readability");

    const jitter = {
      "Detect *_further_instructions.md relay filenames": -8,
      "Alert on delete_file immediately after content_source post": 8,
    };
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
        ["operational cost", c.cost],
        ["decision", c.verdict],
        ["reason", c.rationale],
      ], c));
      r.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c.name}</div><div class="tt-r">coverage ${c.coverage}/3 / cost ${c.cost}</div><div class="tt-r">${c.verdict}</div>`, e));
      r.addEventListener("mouseleave", hideTip);
      const short = {
        "Agent saidit_post with details.content_source": "SaidIt gate",
        "Block all queue_subordinate_task": "Block tasks",
        "Detect *_further_instructions.md relay filenames": "Filename rule",
        "Remove John Agent SaidIt permission": "John-only",
        "Alert on delete_file immediately after content_source post": "Delete alert",
      }[c.name] || c.name;
      const labelDy = {
        "SaidIt gate": -12,
        "Filename rule": 18,
        "John-only": -12,
        "Delete alert": 18,
        "Block tasks": -12,
      }[short] || 14;
      add(svg, "text", { x: px + 12, y: py + labelDy, "font-size": 11.2,
        fill: recommended ? "var(--ok)" : "#526174", "font-weight": recommended ? 800 : 500 }, short);
    });
  }

  drawDecision();
})();
