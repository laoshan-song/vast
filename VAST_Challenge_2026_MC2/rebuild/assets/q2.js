/* q2.js - provenance rows, evidence matrix, and interpretation boundaries */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, esc, evidenceBox, state, setState } = MC2;
  const inc = d.incidents;
  const evidence = document.getElementById("evidence");
  const CODES = ["SwiftWren", "MellowOtter", "HiddenOrca"];

  const META = {
    SwiftWren: {
      theme: "probable meeting-notes content",
      shortTheme: "meeting-notes theme",
      role: "handled by CFO Emma Harbor",
      sourceStrength: "strong",
      claim: "source read and payload creation are visible",
    },
    MellowOtter: {
      theme: "probable strategic-direction content",
      shortTheme: "strategic-direction theme",
      role: "handled by COO Noah Mariner",
      sourceStrength: "strong",
      claim: "source read and payload creation are visible",
    },
    HiddenOrca: {
      theme: "unknown source theme",
      shortTheme: "unknown source theme",
      role: "first visible relay from Gabriel Sonar",
      sourceStrength: "partial",
      claim: "terminal post is visible, but source is outside the data window",
    },
  };

  document.getElementById("strength").innerHTML = CODES.map((c, i) => {
    const I = inc[c];
    return `<button data-c="${c}"><span class="idx">${i + 1}</span><span>
      <span class="t">${c} / ${META[c].sourceStrength}</span>
      <span class="d">${I.source_doc ? I.source_doc.name : "source unknown"}</span></span></button>`;
  }).join("");
  document.querySelectorAll("#strength button[data-c]").forEach((b) => b.addEventListener("click", () => setState({ incident: b.dataset.c })));

  function postEvent(I) {
    return I.recipe?.find((x) => x.action === "saidit_post") || null;
  }

  function renderEvidence(c) {
    const I = inc[c];
    const src = I.source_doc;
    const cf = I.create_file;
    const post = postEvent(I);
    evidenceBox(evidence, `${c}: provenance evidence`, [
      ["source document", src ? src.name : "unknown / outside data window"],
      ["source event", src ? `id ${src.id}, read by ${name(src.read_by)}, ${src.when}` : "not visible"],
      ["payload create", cf ? `id ${cf.id}, by ${name(cf.by)}, ${cf.when}` : "not visible"],
      ["payload file", `${c}.txt${cf?.size_hint ? `, ${cf.size_hint.toLocaleString()} B` : ""}`],
      ["public post", post ? `id ${post.id}, ${post.when}, content_source=${post.detail.content_source}` : "not visible"],
      ["probable meaning", META[c].theme],
      ["evidence boundary", META[c].claim],
    ], { source_doc: src || null, create_file: cf || null, post_event: post });
    document.querySelectorAll("#strength button").forEach((b) => b.classList.toggle("active", b.dataset.c === c));
    document.querySelectorAll(".provenance-row[data-c]").forEach((row) => {
      row.hidden = false;
    });
  }

  function statusColor(status) {
    return status === "observed" ? "var(--ok)" : status === "inferred" ? "var(--warn)" : "var(--dim)";
  }

  function statusBadge(status) {
    return status === "observed" ? "obs" : status === "inferred" ? "inf" : "unk";
  }

  function shortText(value, n = 22) {
    const s = String(value == null || value === "" ? "(missing)" : value);
    return s.length > n ? `${s.slice(0, n - 1)}...` : s;
  }

  function parseLocalTime(value) {
    return Date.parse(String(value || "").replace(" ", "T"));
  }

  function codeColor(code) {
    return code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)";
  }

  function postFieldCounts() {
    const posts = d.saidit_posts_compact || [];
    return {
      total: posts.length,
      content: posts.filter((p) => p.source_field === "content").length,
      contentSource: posts.filter((p) => p.source_field === "content_source").length,
      target: posts.find((p) => p.id === inc.SwiftWren?.post?.id),
    };
  }

  function drawSourceFieldScan() {
    const svg = document.getElementById("sourcefieldscan");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "EDA locator and field scan showing why content_source becomes the Q2 tracing key.");
    const posts = d.saidit_posts_compact || [];
    const W = Math.max(560, Math.floor(svg.parentElement.clientWidth || 620));
    const H = 430, ml = 142, mr = 34, mt = 150;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const countsSummary = postFieldCounts();
    const target = countsSummary.target;

    add(svg, "text", { x: 24, y: 24, "font-size": 13, "font-weight": 900 }, "Step 0: locate the prompted target post");
    add(svg, "rect", { x: 24, y: 42, width: W - 48, height: 46, rx: 8, fill: "#f8fafc", stroke: "#d8e1ec" });
    const targetText = target
      ? `Prompt clue -> SaidIt post id ${target.id} / John Windward Agent / ${target.when_local} / ${target.file}`
      : "Prompt clue -> SaidIt post not found in compact index";
    add(svg, "text", { x: 38, y: 62, "font-size": 11.7, "font-weight": 800, fill: target ? "var(--anom)" : "var(--dim)" }, targetText);
    add(svg, "text", { x: 38, y: 78, "font-size": 10.9, fill: "#526174" },
      "Only after locating the target event do we compare its body field against all SaidIt posts.");

    const counts = new Map();
    posts.forEach((p) => counts.set(p.source_field, (counts.get(p.source_field) || 0) + 1));
    const rows = [
      { key: "content", label: "ordinary content", count: counts.get("content") || 0, color: "var(--ok)" },
      { key: "content_source", label: "file source", count: counts.get("content_source") || 0, color: "var(--anom)" },
    ];
    const max = Math.max(...rows.map((r) => r.count), 1);
    const x = (v) => ml + (v / max) * (W - ml - mr - 84);
    add(svg, "text", { x: 24, y: mt - 36, "font-size": 13, "font-weight": 900 }, "Step 1: scan SaidIt post body fields");
    add(svg, "text", { x: 24, y: mt - 18, "font-size": 11.5, fill: "#526174" },
      "The tracing key is selected from the field distribution, not assumed.");
    rows.forEach((r, i) => {
      const y = mt + 32 + i * 56;
      add(svg, "text", { x: ml - 14, y: y + 14, "text-anchor": "end", "font-size": 12,
        "font-weight": 800, fill: r.color }, r.key);
      add(svg, "rect", { x: ml, y, width: Math.max(4, x(r.count) - ml), height: 22, rx: 5, fill: r.color, opacity: .85 });
      add(svg, "text", { x: Math.min(x(r.count) + 8, W - mr - 10), y: y + 16, "font-size": 11.5,
        "font-family": "var(--mono)", "font-weight": 850, fill: r.color }, `${r.count}/108`);
      add(svg, "text", { x: ml, y: y + 40, "font-size": 10.8, fill: "#63748a" }, r.label);
    });

    const matrixY = 304, cellW = (W - ml - mr) / 2, cellH = 42;
    ["Human", "Agent"].forEach((actor, r) => {
      add(svg, "text", { x: ml - 14, y: matrixY + r * cellH + 27, "text-anchor": "end",
        "font-size": 11.6, "font-weight": 800, fill: actor === "Agent" ? "var(--anom)" : "var(--ok)" }, actor);
    });
    ["content", "content_source"].forEach((field, c) => {
      add(svg, "text", { x: ml + c * cellW + cellW / 2, y: matrixY - 10, "text-anchor": "middle",
        "font-size": 11.4, "font-weight": 800, fill: field === "content_source" ? "var(--anom)" : "var(--ok)" }, field);
    });
    ["Human", "Agent"].forEach((actor, r) => {
      ["content", "content_source"].forEach((field, c) => {
        const n = posts.filter((p) => p.actor_type === actor && p.source_field === field).length;
        const anomaly = actor === "Agent" && field === "content_source";
        const rect = add(svg, "rect", { x: ml + c * cellW + 5, y: matrixY + r * cellH,
          width: cellW - 10, height: cellH - 8, rx: 7, fill: anomaly ? "#fff5f6" : "#f8fafc",
          stroke: anomaly ? "var(--anom)" : "#d8e1ec", "stroke-width": anomaly ? 2 : 1 });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${actor} / ${field}</div><div class="tt-r">${n} SaidIt posts</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: ml + c * cellW + cellW / 2, y: matrixY + r * cellH + 22,
          "text-anchor": "middle", "font-size": 13, "font-family": "var(--mono)",
          "font-weight": 900, fill: anomaly ? "var(--anom)" : "#526174" }, n);
      });
    });
    add(svg, "text", { x: 24, y: H - 14, "font-size": 11.3, fill: "#526174" },
      "Result: the target belongs to the only Agent + content_source cluster, so Q2 traces payload files instead of treating the text as normal content.");
  }

  function drawPayloadBacktrace() {
    const svg = document.getElementById("payloadbacktrace");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "EDA reverse lookup funnel from public content_source to source document.");
    const W = Math.max(560, Math.floor(svg.parentElement.clientWidth || 620));
    const H = 340, ml = 104, mr = 24, mt = 92;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const cols = [
      { key: "post", label: "public post" },
      { key: "payload", label: "payload file" },
      { key: "create", label: "create_file" },
      { key: "source", label: "source read" },
    ];
    const colW = (W - ml - mr) / cols.length;
    add(svg, "text", { x: 24, y: 24, "font-size": 13, "font-weight": 900 }, "Step 2: reverse-search each payload");
    add(svg, "text", { x: 24, y: 43, "font-size": 11.5, fill: "#526174" },
      "Start from content_source, then search filename evidence.");
    cols.forEach((c, i) => {
      add(svg, "text", { x: ml + i * colW + colW / 2, y: mt - 16, "text-anchor": "middle",
        "font-size": 10.7, "font-weight": 850, fill: "#526174" }, c.label);
    });
    CODES.forEach((code, r) => {
      const I = inc[code];
      const y = mt + r * 64;
      const srcKnown = !!I.source_doc;
      const color = code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)";
      add(svg, "text", { x: ml - 16, y: y + 28, "text-anchor": "end", "font-size": 12,
        "font-weight": 850, fill: color }, code);
      const cells = [
        { value: `id ${I.post?.id || "?"}`, status: "observed", tip: `content_source=${code}.txt` },
        { value: `${code}.txt`, status: "observed", tip: "filename from public post" },
        { value: I.create_file ? `id ${I.create_file.id}` : "not visible", status: I.create_file ? "observed" : "unknown", tip: I.create_file ? `created by ${name(I.create_file.by)}` : "payload creation outside visible evidence" },
        { value: I.source_doc ? I.source_doc.name : "unknown", status: I.source_doc ? "observed" : "unknown", tip: I.source_doc ? `read by ${name(I.source_doc.read_by)}` : "source read outside visible evidence" },
      ];
      cells.forEach((cell, i) => {
        const x = ml + i * colW;
        const stroke = statusColor(cell.status);
        const rect = add(svg, "rect", { x: x + 5, y, width: colW - 10, height: 42, rx: 7,
          fill: cell.status === "unknown" ? "#f8fafc" : "#f6fbf8", stroke, "stroke-width": cell.status === "unknown" ? 1.3 : 1.8,
          "stroke-dasharray": cell.status === "unknown" ? "4 3" : "none" });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${code}: ${cols[i].label}</div><div class="tt-r">${esc(cell.value)}</div><div class="tt-r">${esc(cell.tip)}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: x + colW / 2, y: y + 25, "text-anchor": "middle", "font-size": 10.9,
          "font-weight": 850, fill: stroke }, shortText(cell.value, 18));
        if (i > 0) add(svg, "line", { x1: x - 6, y1: y + 21, x2: x + 4, y2: y + 21,
          stroke: cell.status === "unknown" ? "#bdc9d8" : "#6ea8d8", "stroke-width": 1.6,
          "stroke-dasharray": cell.status === "unknown" ? "4 3" : "none" });
      });
      if (srcKnown && I.create_file) {
        const delta = Math.round((parseLocalTime(I.create_file.when) - parseLocalTime(I.source_doc.when)) / 1000);
        add(svg, "text", { x: ml + 2 * colW + colW, y: y + 56, "text-anchor": "middle",
          "font-size": 10.5, "font-weight": 800, fill: "var(--warn)" }, `read -> create: ${delta}s`);
      }
    });
    add(svg, "text", { x: 24, y: H - 14, "font-size": 11.2, fill: "#526174" },
      "Result: two visible source reads; HiddenOrca source remains unknown.");
  }

  function drawLocalWindows() {
    const svg = document.getElementById("localwindows");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "EDA local event windows validating source-to-payload inference and unknown boundaries.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 500, ml = 168, mr = 40, mt = 100, mb = 62;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const stages = [
      ["source_read", "source read"],
      ["payload_create", "payload create"],
      ["first_relay", "first relay"],
      ["final_arrival", "John arrival"],
      ["post_check", "post check"],
      ["public_post", "public post"],
      ["cleanup_1", "cleanup"],
    ];
    const x = (i) => ml + i * ((W - ml - mr) / (stages.length - 1));
    add(svg, "text", { x: 34, y: 25, "font-size": 13.5, "font-weight": 900 }, "Step 3: inspect local event windows");
    add(svg, "text", { x: 34, y: 46, "font-size": 11.8, fill: "#526174" },
      "Nodes are ordered evidence stages. Adjacent read/create events support provenance; missing nodes define uncertainty.");
    stages.forEach(([key, label], i) => {
      add(svg, "text", { x: x(i), y: mt - 18, "text-anchor": "middle", "font-size": 10.8,
        "font-weight": 850, fill: key === "public_post" ? "var(--anom)" : "#526174" }, label);
      add(svg, "line", { x1: x(i), y1: mt - 6, x2: x(i), y2: H - mb, stroke: "#eef3f8" });
    });
    CODES.forEach((code, r) => {
      const I = inc[code];
      const y = mt + 52 + r * 108;
      const color = code === "SwiftWren" ? "var(--anom)" : code === "MellowOtter" ? "var(--purple)" : "var(--info)";
      const byStage = new Map((I.lifecycle || []).map((ev) => [ev.stage, ev]));
      add(svg, "text", { x: ml - 18, y: y + 5, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 900, fill: color }, code);
      add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#d8e1ec", "stroke-width": 1.6 });
      stages.forEach(([key], i) => {
        let ev = byStage.get(key);
        if (key === "cleanup_1") ev = byStage.get("cleanup_1") || byStage.get("cleanup_2");
        const known = !!ev && ev.status !== "unknown" && !!ev.when;
        const col = !known ? "var(--dim)" : key === "public_post" ? "var(--anom)" : key.startsWith("cleanup") ? "var(--info)" : "var(--ok)";
        const mark = add(svg, known ? "circle" : "rect", known
          ? { cx: x(i), cy: y, r: key === "public_post" ? 7.5 : 5.8, fill: col, stroke: "#fff", "stroke-width": 2 }
          : { x: x(i) - 8, y: y - 8, width: 16, height: 16, rx: 4, fill: "#f8fafc", stroke: "#bdc9d8", "stroke-dasharray": "3 3" });
        mark.addEventListener("mousemove", (mouse) => showTip(known
          ? `<div class="tt-h">${code}: ${ev.label}</div><div class="tt-r">${ev.when}</div><div class="tt-r">id ${ev.event_id} / ${name(ev.actor)} -> ${esc(ev.target)}</div>`
          : `<div class="tt-h">${code}: missing evidence</div><div class="tt-r">${stages[i][1]} is not visible in the data window.</div>`, mouse));
        mark.addEventListener("mouseleave", hideTip);
      });
      if (I.source_doc && I.create_file) {
        const sx = x(0), cx = x(1);
        const delta = Math.round((parseLocalTime(I.create_file.when) - parseLocalTime(I.source_doc.when)) / 1000);
        add(svg, "path", { d: `M${sx},${y - 18} C${sx + 20},${y - 40} ${cx - 20},${y - 40} ${cx},${y - 18}`,
          fill: "none", stroke: "var(--warn)", "stroke-width": 1.8 });
        add(svg, "text", { x: (sx + cx) / 2, y: y - 45, "text-anchor": "middle",
          "font-size": 10.8, "font-weight": 850, fill: "var(--warn)" }, `${delta}s gap`);
        const sourceLabel = `${name(I.source_doc.read_by).split(" ")[0]} / ${I.source_doc.name}`;
        const createLabel = `${code}.txt`;
        add(svg, "text", { x: sx, y: y + 26, "text-anchor": "middle", "font-size": 9.8,
          "font-weight": 800, fill: "#526174" }, shortText(sourceLabel, 21));
        add(svg, "text", { x: sx, y: y + 40, "text-anchor": "middle", "font-size": 9.4,
          fill: "#63748a", "font-family": "var(--mono)" }, `id ${I.source_doc.id}`);
        add(svg, "text", { x: cx, y: y + 26, "text-anchor": "middle", "font-size": 9.8,
          "font-weight": 800, fill: "#526174" }, createLabel);
        add(svg, "text", { x: cx, y: y + 40, "text-anchor": "middle", "font-size": 9.4,
          fill: "#63748a", "font-family": "var(--mono)" }, `id ${I.create_file.id}`);
      } else {
        add(svg, "text", { x: x(0), y: y - 24, "text-anchor": "middle", "font-size": 10.5,
          fill: "#63748a", "font-weight": 800 }, "source not visible");
      }
    });
    [
      ["observed internal event", "var(--ok)"],
      ["public post", "var(--anom)"],
      ["cleanup", "var(--info)"],
      ["missing from window", "var(--dim)"],
    ].forEach(([lab, col], i) => {
      const lx = ml + i * 175;
      add(svg, "circle", { cx: lx, cy: H - 22, r: 5, fill: col, opacity: lab.startsWith("missing") ? .45 : 1 });
      add(svg, "text", { x: lx + 10, y: H - 18, "font-size": 11.4, fill: "#526174" }, lab);
    });
  }

  function cell(badgeClass, badgeText, title, sub, dashed = false) {
    return `<div class="fbox" style="${dashed ? "border-style:dashed;opacity:.76" : ""}">
      <div class="k"><span class="badge ${badgeClass}">${badgeText}</span></div>
      <div class="v" style="font-size:14px">${title}</div>
      <div class="s">${sub}</div>
    </div>`;
  }

  document.getElementById("prov").innerHTML = CODES.map((c) => {
    const I = inc[c], src = I.source_doc, cf = I.create_file, post = postEvent(I);
    return `<div class="provenance-row" data-c="${c}">
      <div class="prov-title">${c}<span class="badge ${src ? "obs" : "unk"}">${src ? "source observed" : "source unknown"}</span></div>
      <div class="flow">
        ${cell(src ? "obs" : "unk", src ? "observed" : "unknown",
          src ? src.name : "created before visible window",
          src ? `read by ${name(src.read_by)}<br>${src.when} / id ${src.id}` : "no read/create source record", !src)}
        <div class="farrow">-></div>
        ${cell(cf ? "obs" : "unk", cf ? "observed" : "unknown",
          `${c}.txt`,
          cf ? `${cf.size_hint.toLocaleString()} B<br>created by ${name(cf.by)} / ${cf.when}` : "payload existed when terminal chain ran", !cf)}
        <div class="farrow">-></div>
        ${cell("obs", "observed",
          "saidit_post",
          post ? `content_source=${post.detail.content_source}<br>John Agent / ${post.when} / id ${post.id}` : "not visible")}
        <div class="farrow">-></div>
        ${cell("inf", "inferred",
          META[c].theme,
          `${META[c].role}<br>${src ? "theme inferred from role and source filename" : "theme cannot be reconstructed"}`)}
      </div>
    </div>`;
  }).join("") + `<div class="note"><b>Reading rule:</b> SwiftWren and MellowOtter have visible source and payload events. HiddenOrca has the same terminal posting mechanism, but its source/package origin is outside the available time window.</div>`;

  function drawProvenanceGraph() {
    const svg = document.getElementById("provenancegraph");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Content provenance graph separating source documents, payload files, public posts, and inferred themes.");
    const W = Math.max(860, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 540, mt = 96, mb = 52;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const cols = [
      { key: "source", label: "source document", x: Math.max(155, W * .15) },
      { key: "payload", label: "payload file", x: W * .38 },
      { key: "post", label: "public SaidIt post", x: W * .62 },
      { key: "theme", label: "probable theme", x: W * .84 },
    ];
    const rowY = (i) => mt + 52 + i * 116;
    add(svg, "text", { x: 36, y: 24, "font-size": 13.5, "font-weight": 900 }, "Provenance graph: files become public posts");
    add(svg, "text", { x: 36, y: 45, "font-size": 11.8, fill: "#526174" },
      "Solid edges are logged file/post links. Dashed edges are interpretation. Gray nodes are not visible in the logs.");
    cols.forEach((col) => {
      add(svg, "text", { x: col.x, y: mt - 28, "text-anchor": "middle", "font-size": 12,
        "font-weight": 900, fill: "#526174" }, col.label);
      add(svg, "line", { x1: col.x, y1: mt - 14, x2: col.x, y2: H - mb, stroke: "#eef3f8" });
    });
    function node(cx, cy, w, h, title, sub, status, stroke) {
      const fill = status === "unknown" ? "#f8fafc" : "#f7fbf9";
      const rect = add(svg, "rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 8,
        fill, stroke, "stroke-width": status === "unknown" ? 1.4 : 1.9,
        "stroke-dasharray": status === "unknown" ? "5 4" : "none" });
      add(svg, "text", { x: cx, y: cy - 7, "text-anchor": "middle", "font-size": 11.6,
        "font-weight": 900, fill: stroke }, shortText(title, 26));
      add(svg, "text", { x: cx, y: cy + 11, "text-anchor": "middle", "font-size": 10.2,
        fill: "#63748a", "font-family": "var(--mono)" }, shortText(sub, 30));
      return rect;
    }
    CODES.forEach((code, i) => {
      const I = inc[code];
      const y = rowY(i);
      const col = codeColor(code);
      const src = I.source_doc;
      const cf = I.create_file;
      const post = postEvent(I);
      add(svg, "text", { x: cols[0].x, y: y - 34, "text-anchor": "middle",
        "font-size": 12.4, "font-weight": 900, fill: col }, code);
      const nodes = [
        {
          title: src ? src.name : "source unknown",
          sub: src ? `read id ${src.id} / ${name(src.read_by)}` : "outside visible window",
          status: src ? "observed" : "unknown",
          stroke: src ? "var(--ok)" : "var(--dim)",
        },
        {
          title: `${code}.txt`,
          sub: cf ? `create id ${cf.id} / ${cf.size_hint.toLocaleString()} B` : "payload existed",
          status: cf ? "observed" : "unknown",
          stroke: cf ? "var(--ok)" : "var(--dim)",
        },
        {
          title: "saidit_post",
          sub: post ? `id ${post.id} / content_source` : "not visible",
          status: "observed",
          stroke: col,
        },
        {
          title: META[code].shortTheme,
          sub: src ? META[code].role : "theme not reconstructed",
          status: src ? "inferred" : "unknown",
          stroke: src ? "var(--warn)" : "var(--dim)",
        },
      ];
      for (let j = 0; j < cols.length - 1; j++) {
        const x1 = cols[j].x + 76, x2 = cols[j + 1].x - 76;
        const isInference = j === 2;
        const unavailable = j === 0 && !src;
        add(svg, "path", { d: `M${x1},${y} C${x1 + 52},${y} ${x2 - 52},${y} ${x2},${y}`,
          fill: "none", stroke: unavailable ? "var(--dim)" : isInference ? "var(--warn)" : "#4b9ad8",
          "stroke-width": unavailable ? 1.7 : 2.5, "stroke-dasharray": unavailable || isInference ? "6 5" : "none",
          opacity: unavailable ? .55 : .78 });
        add(svg, "text", { x: (x1 + x2) / 2, y: isInference ? y - 30 : y - 12, "text-anchor": "middle", "font-size": 10.3,
          fill: unavailable ? "var(--dim)" : isInference ? "var(--warn)" : "#526174" },
          unavailable ? "not visible" : isInference ? "inferred" : "logged link");
      }
      nodes.forEach((n, j) => {
        const mark = node(cols[j].x, y, 148, 50, n.title, n.sub, n.status, n.stroke);
        makeInteractive(mark, `${code}: ${cols[j].label}`, () => {
          setState({ incident: code });
          evidenceBox(evidence, `${code}: ${cols[j].label}`, [
            ["status", n.status],
            ["displayed value", n.title],
            ["support", n.sub],
            ["boundary", META[code].claim],
          ], { incident: code, column: cols[j].key, node: n });
        });
        mark.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${code}: ${cols[j].label}</div><div class="tt-r">${esc(n.title)}</div><div class="tt-r">${esc(n.sub)}</div>`, ev));
        mark.addEventListener("mouseleave", hideTip);
      });
    });
    [
      ["observed file/post evidence", "var(--ok)", "none"],
      ["public post boundary", "var(--anom)", "none"],
      ["inferred probable theme", "var(--warn)", "6 5"],
      ["unknown / unavailable", "var(--dim)", "5 4"],
    ].forEach(([lab, col, dash], i) => {
      const x = 36 + i * 202;
      add(svg, "line", { x1: x, y1: H - 22, x2: x + 22, y2: H - 22, stroke: col, "stroke-width": 4,
        "stroke-dasharray": dash === "none" ? "none" : dash, opacity: dash === "5 4" ? .55 : .9 });
      add(svg, "text", { x: x + 30, y: H - 18, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function confidenceCells(c) {
    const I = inc[c];
    const post = postEvent(I);
    const deletes = (I.recipe || []).filter((x) => x.action === "delete_file");
    return [
      { key: "source", label: "source read", status: I.source_doc ? "observed" : "unknown", value: I.source_doc?.name || "outside visible window" },
      { key: "payload", label: "payload create", status: I.create_file ? "observed" : "unknown", value: I.create_file ? `id ${I.create_file.id}` : "not visible" },
      { key: "relay", label: "relay path", status: I.hop_count ? "observed" : "unknown", value: `${I.hop_count} hops` },
      { key: "post", label: "public post", status: post ? "observed" : "unknown", value: post ? `id ${post.id}` : "not visible" },
      { key: "theme", label: "probable theme", status: I.source_doc ? "inferred" : "unknown", value: META[c].theme },
      { key: "body", label: "exact body", status: "unknown", value: "file body unavailable" },
      { key: "cleanup", label: "cleanup", status: deletes.length ? "observed" : "unknown", value: `${deletes.length} delete events` },
    ];
  }

  function drawConfidenceMatrix() {
    const svg = document.getElementById("confidence");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Provenance confidence matrix showing observed, inferred, and unknown evidence.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 310, ml = 150, mt = 74, mr = 34, mb = 42;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const cols = confidenceCells("SwiftWren").map((x) => x.label);
    const cw = (W - ml - mr) / cols.length;
    const rh = 52;
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, "Evidence confidence by incident");
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Click a cell to inspect the supporting event evidence; gray cells are deliberately not filled with speculation.");
    cols.forEach((col, i) => {
      const x = ml + i * cw + cw / 2;
      add(svg, "text", { x, y: mt - 15, "text-anchor": "middle", "font-size": 10.6, fill: "#526174" }, col);
    });
    CODES.forEach((c, r) => {
      const y = mt + r * rh;
      add(svg, "text", { x: ml - 14, y: y + rh / 2 + 4, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 800, fill: c === "SwiftWren" ? "var(--anom)" : "#172033" }, c);
      confidenceCells(c).forEach((cell, i) => {
        const x = ml + i * cw;
        const fill = cell.status === "observed" ? "rgba(32,134,90,.78)" : cell.status === "inferred" ? "rgba(166,106,0,.70)" : "rgba(122,135,151,.20)";
        const rect = add(svg, "rect", { x: x + 5, y: y + 8, width: cw - 10, height: rh - 14, rx: 6,
          fill, stroke: cell.status === "unknown" ? "#bdc9d8" : "transparent" });
        makeInteractive(rect, `${c} ${cell.label}: ${cell.status}`, () => evidenceBox(evidence, `${c}: ${cell.label}`, [
          ["status", cell.status],
          ["value", cell.value],
          ["meaning", META[c].claim],
        ], { incident: c, cell }));
        rect.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c}: ${cell.label}</div><div class="tt-r">${cell.status}</div><div class="tt-r">${esc(cell.value)}</div>`, e));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: x + cw / 2, y: y + rh / 2 + 4, "text-anchor": "middle",
          "font-size": 10.8, "font-weight": 800, fill: cell.status === "unknown" ? "#526174" : "#fff" },
          cell.status === "observed" ? "OBS" : cell.status === "inferred" ? "INF" : "UNK");
      });
    });
    [["observed", "var(--ok)"], ["inferred", "var(--warn)"], ["unknown", "var(--dim)"]].forEach(([lab, col], i) => {
      const x = ml + i * 132;
      add(svg, "rect", { x, y: H - 22, width: 12, height: 12, rx: 2, fill: col, opacity: lab === "unknown" ? .38 : .9 });
      add(svg, "text", { x: x + 18, y: H - 12, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawGlyphGrid() {
    const svg = document.getElementById("glyphgrid");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Evidence glyph grid showing compact certainty fingerprints for each anomalous post.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 330, ml = 150, mt = 88, mr = 36;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const fields = [
      ["source", "S", "source"],
      ["payload", "P", "payload"],
      ["relay", "R", "relay"],
      ["post", "O", "post"],
      ["theme", "T", "theme"],
      ["body", "B", "body"],
      ["cleanup", "C", "cleanup"],
    ];
    const cellW = (W - ml - mr) / fields.length;
    const rowH = 54;
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, "Evidence glyph fingerprints");
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Shape identifies evidence type; fill color identifies certainty. Click glyphs for exact support.");
    fields.forEach(([key, short, label], i) => {
      const x = ml + i * cellW + cellW / 2;
      add(svg, "text", { x, y: mt - 18, "text-anchor": "middle", "font-size": 10.8, "font-weight": 800, fill: "#526174" }, short);
      add(svg, "text", { x, y: mt - 4, "text-anchor": "middle", "font-size": 9.5, fill: "#7a8797" }, label);
    });
    function drawShape(parent, x, y, field, fill, stroke) {
      if (field === "source") return add(parent, "path", { d: `M${x},${y - 13} L${x + 13},${y} L${x},${y + 13} L${x - 13},${y} Z`, fill, stroke, "stroke-width": 1.4 });
      if (field === "payload") return add(parent, "rect", { x: x - 12, y: y - 12, width: 24, height: 24, rx: 4, fill, stroke, "stroke-width": 1.4 });
      if (field === "relay") return add(parent, "path", { d: `M${x - 15},${y + 10} L${x},${y - 14} L${x + 15},${y + 10} Z`, fill, stroke, "stroke-width": 1.4 });
      if (field === "post") return add(parent, "circle", { cx: x, cy: y, r: 13, fill, stroke, "stroke-width": 1.4 });
      if (field === "theme") return add(parent, "path", { d: `M${x - 13},${y - 11} H${x + 13} V${y + 7} H${x - 3} L${x - 10},${y + 13} V${y + 7} H${x - 13} Z`, fill, stroke, "stroke-width": 1.4 });
      if (field === "body") return add(parent, "line", { x1: x - 13, y1: y - 13, x2: x + 13, y2: y + 13, stroke, "stroke-width": 4, "stroke-linecap": "round" });
      return add(parent, "path", { d: `M${x - 12},${y - 12} H${x + 12} V${y + 12} H${x - 12} Z M${x - 6},${y - 16} H${x + 6}`, fill, stroke, "stroke-width": 1.4 });
    }
    CODES.forEach((c, r) => {
      const y = mt + r * rowH + 30;
      add(svg, "text", { x: ml - 14, y: y + 4, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 800, fill: c === "SwiftWren" ? "var(--anom)" : "#172033" }, c);
      const cells = new Map(confidenceCells(c).map((x) => [x.key, x]));
      fields.forEach(([key], i) => {
        const cell = cells.get(key);
        const x = ml + i * cellW + cellW / 2;
        const fill = cell.status === "observed" ? "rgba(32,134,90,.80)" : cell.status === "inferred" ? "rgba(166,106,0,.72)" : "rgba(122,135,151,.20)";
        const stroke = cell.status === "observed" ? "var(--ok)" : cell.status === "inferred" ? "var(--warn)" : "#7a8797";
        const mark = drawShape(svg, x, y, key, fill, stroke);
        makeInteractive(mark, `${c} ${cell.label}: ${cell.status}`, () => evidenceBox(evidence, `${c}: ${cell.label}`, [
          ["status", cell.status],
          ["value", cell.value],
          ["evidence boundary", META[c].claim],
        ], { incident: c, cell }));
        mark.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c}: ${cell.label}</div><div class="tt-r">${cell.status}</div><div class="tt-r">${esc(cell.value)}</div>`, e));
        mark.addEventListener("mouseleave", hideTip);
      });
    });
    [["observed", "var(--ok)"], ["inferred", "var(--warn)"], ["unknown", "var(--dim)"]].forEach(([lab, col], i) => {
      const x = ml + i * 132;
      add(svg, "rect", { x, y: H - 22, width: 12, height: 12, rx: 2, fill: col, opacity: lab === "unknown" ? .38 : .9 });
      add(svg, "text", { x: x + 18, y: H - 12, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawProvFlow() {
    const svg = document.getElementById("provflow");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Claim support DAG showing which observed evidence supports each Q2 conclusion.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 430, mt = 98, mb = 42;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    add(svg, "text", { x: 36, y: 24, "font-size": 13.5, "font-weight": 900 }, "Claim support DAG");
    add(svg, "text", { x: 36, y: 45, "font-size": 11.8, fill: "#526174" },
      "Left nodes are observed log facts. Right nodes are Q2 conclusions. Dashed links mark inference rather than direct observation.");

    const evidenceNodes = [
      { key: "field", label: "3/108 posts use content_source", sub: "observed SaidIt field scan", x: W * .18, y: mt + 18, status: "observed" },
      { key: "john", label: "all 3 are John Agent posts", sub: "observed actor + target", x: W * .18, y: mt + 92, status: "observed" },
      { key: "source", label: "2 visible source documents", sub: "meeting_notes / strategic_directions", x: W * .18, y: mt + 166, status: "observed" },
      { key: "body", label: "file bodies unavailable", sub: "not stored in provided logs", x: W * .18, y: mt + 240, status: "unknown" },
    ];
    const claimNodes = [
      { key: "mechanism", label: "file-backed posting mechanism", sub: "not ordinary forum composition", x: W * .63, y: mt + 24, status: "observed" },
      { key: "origin", label: "origin known for 2 posts", sub: "SwiftWren + MellowOtter", x: W * .63, y: mt + 108, status: "inferred" },
      { key: "meaning", label: "probable document themes", sub: "meeting notes / strategic direction", x: W * .63, y: mt + 192, status: "inferred" },
      { key: "limits", label: "exact wording unknown", sub: "no plaintext reconstruction", x: W * .63, y: mt + 276, status: "unknown" },
    ];
    const edges = [
      ["field", "mechanism", "observed"],
      ["john", "mechanism", "observed"],
      ["source", "origin", "observed"],
      ["source", "meaning", "inferred"],
      ["body", "limits", "unknown"],
      ["body", "meaning", "inferred"],
    ];
    const all = [...evidenceNodes, ...claimNodes];
    const byKey = new Map(all.map((n) => [n.key, n]));
    function nColor(status) {
      return status === "observed" ? "var(--ok)" : status === "inferred" ? "var(--warn)" : "var(--dim)";
    }
    edges.forEach(([from, to, status]) => {
      const a = byKey.get(from), b = byKey.get(to);
      const col = nColor(status);
      const p = `M${a.x + 98},${a.y} C${a.x + 180},${a.y} ${b.x - 180},${b.y} ${b.x - 98},${b.y}`;
      add(svg, "path", { d: p, fill: "none", stroke: col, "stroke-width": status === "unknown" ? 1.8 : 2.4,
        "stroke-dasharray": status === "observed" ? "none" : "7 5", opacity: status === "unknown" ? .55 : .72 });
    });
    all.forEach((n) => {
      const col = nColor(n.status);
      const rect = add(svg, "rect", { x: n.x - 98, y: n.y - 26, width: 196, height: 52, rx: 8,
        fill: "#f8fafc", stroke: col, "stroke-width": n.status === "unknown" ? 1.4 : 1.9,
        "stroke-dasharray": n.status === "unknown" ? "5 4" : "none" });
      rect.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${esc(n.label)}</div><div class="tt-r">${esc(n.sub)}</div><div class="tt-r">${n.status}</div>`, e));
      rect.addEventListener("mouseleave", hideTip);
      add(svg, "text", { x: n.x, y: n.y - 5, "text-anchor": "middle", "font-size": 11.4,
        "font-weight": 900, fill: col }, shortText(n.label, 30));
      add(svg, "text", { x: n.x, y: n.y + 13, "text-anchor": "middle", "font-size": 10.3,
        fill: "#63748a" }, shortText(n.sub, 34));
    });
    add(svg, "text", { x: W * .18, y: mt - 34, "text-anchor": "middle", "font-size": 12,
      "font-weight": 900, fill: "#526174" }, "observed evidence");
    add(svg, "text", { x: W * .63, y: mt - 34, "text-anchor": "middle", "font-size": 12,
      "font-weight": 900, fill: "#526174" }, "supported Q2 claims");
    [["observed", "var(--ok)", "none"], ["inferred", "var(--warn)", "7 5"], ["unknown limit", "var(--dim)", "5 4"]].forEach(([lab, col, dash], i) => {
      const x = 36 + i * 150;
      add(svg, "line", { x1: x, y1: H - 20, x2: x + 24, y2: H - 20, stroke: col, "stroke-width": 4,
        "stroke-dasharray": dash === "none" ? "none" : dash, opacity: lab.startsWith("unknown") ? .55 : .9 });
      add(svg, "text", { x: x + 32, y: H - 16, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawPayloadScale() {
    const svg = document.getElementById("payloadscale");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Payload size and relay-hop lollipop comparison for the three anomalous posts.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 360, mt = 104, mb = 40;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const left = { ml: 150, mr: W * .52, title: "payload size (bytes)" };
    const right = { ml: W * .60, mr: W - 56, title: "relay hops" };
    const rowH = 58;
    const maxSize = Math.max(...CODES.map((c) => inc[c].create_file?.size_hint || 0), 1);
    const maxHops = Math.max(...CODES.map((c) => inc[c].hop_count), 1);
    const xSize = (v) => left.ml + (v / maxSize) * (left.mr - left.ml);
    const xHop = (v) => right.ml + (v / maxHops) * (right.mr - right.ml);
    add(svg, "text", { x: 36, y: 24, "font-size": 13, "font-weight": 800 }, "Payload size and propagation scale");
    add(svg, "text", { x: 36, y: 43, "font-size": 11.5, fill: "#526174" },
      "Two separate axes prevent a false comparison between bytes and hops. Unknown payload size is shown as missing.");
    [
      [left, maxSize.toLocaleString()],
      [right, maxHops.toLocaleString()],
    ].forEach(([p, maxLabel]) => {
      add(svg, "text", { x: (p.ml + p.mr) / 2, y: mt - 30, "text-anchor": "middle", "font-size": 11.5,
        "font-weight": 800, fill: "#526174" }, p.title);
      add(svg, "line", { x1: p.ml, y1: mt - 14, x2: p.mr, y2: mt - 14, stroke: "#bdc9d8" });
      add(svg, "text", { x: p.ml, y: mt - 20, "text-anchor": "middle", "font-size": 10, fill: "#63748a" }, "0");
      add(svg, "text", { x: p.mr, y: mt - 20, "text-anchor": "middle", "font-size": 10, fill: "#63748a" }, maxLabel);
    });
    CODES.forEach((c, i) => {
      const I = inc[c];
      const y = mt + 38 + i * rowH;
      const col = c === "SwiftWren" ? "var(--anom)" : c === "MellowOtter" ? "var(--purple)" : "var(--info)";
      add(svg, "text", { x: 36, y: y + 4, "font-size": 12.5, "font-weight": 800, fill: col }, c);
      add(svg, "line", { x1: left.ml, y1: y, x2: left.mr, y2: y, stroke: "#eef3f8" });
      add(svg, "line", { x1: right.ml, y1: y, x2: right.mr, y2: y, stroke: "#eef3f8" });
      if (I.create_file?.size_hint) {
        const xs = xSize(I.create_file.size_hint);
        const l1 = add(svg, "line", { x1: left.ml, y1: y, x2: xs, y2: y, stroke: "var(--ok)", "stroke-width": 4, "stroke-linecap": "round" });
        const d1 = add(svg, "circle", { cx: xs, cy: y, r: 7, fill: "var(--ok)", stroke: "#fff", "stroke-width": 2 });
        [l1, d1].forEach((m) => {
          m.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c} payload</div><div class="tt-r">${I.create_file.size_hint.toLocaleString()} bytes</div><div class="tt-r">create_file id ${I.create_file.id}</div>`, e));
          m.addEventListener("mouseleave", hideTip);
        });
        add(svg, "text", { x: xs + 10, y: y + 4, "font-size": 10.8, "font-family": "var(--mono)", fill: "#526174" }, I.create_file.size_hint.toLocaleString());
      } else {
        add(svg, "line", { x1: left.ml, y1: y, x2: left.mr, y2: y, stroke: "#bdc9d8", "stroke-dasharray": "4 3" });
        add(svg, "text", { x: left.ml + 12, y: y - 8, "font-size": 10.8, fill: "#63748a" }, "payload size unknown");
      }
      const xh = xHop(I.hop_count);
      const l2 = add(svg, "line", { x1: right.ml, y1: y, x2: xh, y2: y, stroke: col, "stroke-width": 4, "stroke-linecap": "round" });
      const d2 = add(svg, "circle", { cx: xh, cy: y, r: c === "SwiftWren" ? 8 : 6.5, fill: col, stroke: "#fff", "stroke-width": 2 });
      [l2, d2].forEach((m) => {
        m.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c} relay scale</div><div class="tt-r">${I.hop_count} hops / ${I.distinct_agent_count} Agents</div><div class="tt-r">${I.departments_touched.length} departments</div>`, e));
        m.addEventListener("mouseleave", hideTip);
      });
      add(svg, "text", { x: Math.min(xh + 10, right.mr - 16), y: y + 4, "font-size": 10.8,
        "font-family": "var(--mono)", "font-weight": c === "SwiftWren" ? 800 : 400, fill: col }, I.hop_count.toLocaleString());
    });
    add(svg, "text", { x: 36, y: H - 12, "font-size": 11.2, fill: "#526174" },
      "Interpretation: file size does not explain propagation by itself; SwiftWren is the largest relay chain even though only two payload sizes are visible.");
  }

  function drawSourceTimeline() {
    const svg = document.getElementById("sourcetimeline");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Small-multiple source-to-post evidence stage timelines for the three anomalous posts.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 360, ml = 152, mr = 42, mt = 54, rowH = 86;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    add(svg, "text", { x: ml, y: 22, "font-size": 13, "font-weight": 800 }, "Source-to-post timelines");
    add(svg, "text", { x: ml, y: 41, "font-size": 11.5, fill: "#526174" },
      "The horizontal axis is evidence stage order. Hover or click nodes for stage, timestamp, event id, and actor.");

    CODES.forEach((c, ri) => {
      const I = inc[c];
      const events = (I.lifecycle || []).filter((e) => e.when);
      const y = mt + ri * rowH + 36;
      const x = (i) => ml + (events.length <= 1 ? 0 : (i / (events.length - 1)) * (W - ml - mr));
      add(svg, "text", { x: ml - 18, y: y + 4, "text-anchor": "end", "font-size": 12.5,
        "font-weight": 800, fill: c === "SwiftWren" ? "var(--anom)" : "#172033" }, c);
      add(svg, "line", { x1: ml, y1: y, x2: W - mr, y2: y, stroke: "#d8e1ec", "stroke-width": 2 });
      add(svg, "text", { x: ml, y: y + 28, "font-size": 10.5, fill: "#63748a", "font-family": "var(--mono)" }, events[0]?.when || "");
      add(svg, "text", { x: W - mr, y: y + 28, "text-anchor": "end", "font-size": 10.5, fill: "#63748a", "font-family": "var(--mono)" }, events[events.length - 1]?.when || "");
      events.forEach((ev, i) => {
        const xx = x(i);
        const col = ev.stage === "public_post" ? "var(--anom)" : ev.stage.startsWith("cleanup") ? "var(--info)" : statusColor(ev.status);
        const node = add(svg, "circle", { cx: xx, cy: y, r: ev.stage === "public_post" ? 7.5 : 5.5,
          fill: col, stroke: "#fff", "stroke-width": 2 });
        makeInteractive(node, `${c} ${ev.label}`, () => evidenceBox(evidence, `${c}: ${ev.label}`, [
          ["status", ev.status],
          ["time UTC-7", ev.when],
          ["event id", ev.event_id],
          ["actor", name(ev.actor)],
          ["target", ev.target],
        ], ev));
        node.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c}: ${ev.label}</div><div class="tt-r">${ev.when}</div><div class="tt-r">id ${ev.event_id}</div>`, e));
        node.addEventListener("mouseleave", hideTip);
      });
      if (!I.source_doc) {
        add(svg, "rect", { x: ml, y: y - 25, width: 72, height: 18, rx: 5, fill: "rgba(122,135,151,.16)", stroke: "#bdc9d8", "stroke-dasharray": "3 2" });
        add(svg, "text", { x: ml + 36, y: y - 12, "text-anchor": "middle", "font-size": 10, fill: "#63748a" }, "source unknown");
      }
    });
    [
      ["observed internal evidence", "var(--ok)"],
      ["public SaidIt post", "var(--anom)"],
      ["cleanup delete", "var(--info)"],
    ].forEach(([lab, col], i) => {
      const x = ml + i * 180;
      add(svg, "circle", { cx: x, cy: H - 18, r: 5, fill: col });
      add(svg, "text", { x: x + 10, y: H - 14, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  const guardrailRows = [
    ["Safe claim", "Agent + content_source posts", "3 of 108 SaidIt posts match", "observed"],
    ["Safe claim", "SwiftWren source visible", "meeting_notes -> SwiftWren.txt", "observed"],
    ["Safe claim", "MellowOtter source visible", "strategic_directions -> MellowOtter.txt", "observed"],
    ["Careful claim", "Probable document themes", "inferred from file names and handlers", "inferred"],
    ["Careful claim", "HiddenOrca terminal match", "same post/check/delete pattern", "inferred"],
    ["Do not claim", "Exact plaintext known", "payload bodies unavailable", "unknown"],
    ["Do not claim", "HiddenOrca source known", "no visible source read/create", "unknown"],
    ["Do not claim", "Encryption or intent proven", "format mismatch plausible only", "unknown"],
  ];

  document.getElementById("boundary").innerHTML = `<table class="grid evidence-matrix">
    <tr><th>Guardrail</th><th>Claim</th><th>Reason</th><th>Status</th></tr>
    ${guardrailRows.map(([kind, claim, reason, status]) => `<tr>
      <td>${esc(kind)}</td>
      <td>${esc(claim)}</td>
      <td>${esc(reason)}</td>
      <td><span class="badge ${statusBadge(status)}">${esc(status)}</span></td>
    </tr>`).join("")}
  </table>`;

  function drawBoundaryViz() {
    const svg = document.getElementById("boundaryviz");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Claim guardrail chart separating safe claims, careful claims, and unsupported claims.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 450, ml = 180, mt = 82, mr = 44, mb = 38;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    add(svg, "text", { x: 34, y: 24, "font-size": 13.5, "font-weight": 900 }, "Claim guardrails");
    add(svg, "text", { x: 34, y: 45, "font-size": 11.8, fill: "#526174" },
      "The chart separates what can be stated as fact, what must be phrased as inference, and what must remain unknown.");
    const lanes = [
      { key: "observed", label: "Safe: observed", color: "var(--ok)", x: ml },
      { key: "inferred", label: "Careful: inferred", color: "var(--warn)", x: ml + (W - ml - mr) / 3 },
      { key: "unknown", label: "Do not claim", color: "var(--dim)", x: ml + 2 * (W - ml - mr) / 3 },
    ];
    const laneW = (W - ml - mr) / 3 - 18;
    lanes.forEach((lane) => {
      add(svg, "text", { x: lane.x + laneW / 2, y: mt - 18, "text-anchor": "middle",
        "font-size": 12.2, "font-weight": 900, fill: lane.color }, lane.label);
      add(svg, "rect", { x: lane.x, y: mt - 5, width: laneW, height: H - mt - mb + 2, rx: 8,
        fill: lane.key === "unknown" ? "rgba(122,135,151,.08)" : lane.key === "inferred" ? "rgba(166,106,0,.08)" : "rgba(32,134,90,.07)",
        stroke: "#d8e1ec" });
    });
    const grouped = { observed: [], inferred: [], unknown: [] };
    guardrailRows.forEach((row) => grouped[row[3]].push(row));
    lanes.forEach((lane) => {
      grouped[lane.key].forEach(([kind, claim, reason], i) => {
        const y = mt + 18 + i * 66;
        const rect = add(svg, "rect", { x: lane.x + 10, y, width: laneW - 20, height: 54, rx: 7,
          fill: "#fff", stroke: lane.color, "stroke-width": lane.key === "unknown" ? 1.2 : 1.7,
          "stroke-dasharray": lane.key === "unknown" ? "5 4" : "none" });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${esc(kind)}</div><div class="tt-r">${esc(claim)}</div><div class="tt-r">${esc(reason)}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: lane.x + 22, y: y + 20, "font-size": 10.8,
          "font-weight": 900, fill: lane.color }, shortText(claim, 36));
        add(svg, "text", { x: lane.x + 22, y: y + 39, "font-size": 9.7,
          fill: "#63748a" }, shortText(reason, 44));
      });
    });
    add(svg, "text", { x: 34, y: H - 14, "font-size": 11.5, fill: "#526174" },
      "Submission rule: final prose must use the same guardrails; do not turn inferred or unknown items into factual claims.");
  }

  function drawMeaningModel() {
    const svg = document.getElementById("meaningmodel");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Meaning model comparing normal SaidIt text posts to anomalous file-backed posts.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 470, mt = 70;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const counts = postFieldCounts();
    add(svg, "text", { x: 36, y: 24, "font-size": 13.5, "font-weight": 900 }, "Meaning model: what gibberish means in the logs");
    add(svg, "text", { x: 36, y: 45, "font-size": 11.8, fill: "#526174" },
      "The evidence supports a field/source mismatch: ordinary posts contain text, while the anomalous posts submit file payloads as the post body.");

    const normalX = W * .25, anomX = W * .72;
    function fieldBox(cx, cy, title, rows, stroke, fill = "#f8fafc") {
      add(svg, "rect", { x: cx - 150, y: cy - 54, width: 300, height: 108, rx: 9,
        fill, stroke, "stroke-width": 1.8 });
      add(svg, "text", { x: cx, y: cy - 29, "text-anchor": "middle", "font-size": 13,
        "font-weight": 900, fill: stroke }, title);
      rows.forEach((row, i) => {
        add(svg, "text", { x: cx - 124, y: cy - 4 + i * 19, "font-size": 11.4,
          fill: "#526174", "font-family": "var(--mono)" }, row);
      });
    }
    add(svg, "text", { x: normalX, y: mt, "text-anchor": "middle", "font-size": 13,
      "font-weight": 900, fill: "var(--ok)" }, `Normal SaidIt baseline: ${counts.content}/108`);
    add(svg, "text", { x: anomX, y: mt, "text-anchor": "middle", "font-size": 13,
      "font-weight": 900, fill: "var(--anom)" }, `Anomalous file-source posts: ${counts.contentSource}/108`);
    fieldBox(normalX, mt + 76, "ordinary forum post", [
      "actor_type = Human",
      "body field = content",
      "body value = typed text",
    ], "var(--ok)", "rgba(32,134,90,.06)");
    fieldBox(anomX, mt + 76, "file-backed post", [
      "actor_type = Agent",
      "body field = content_source",
      "body value = *.txt payload",
    ], "var(--anom)", "rgba(196,61,75,.06)");

    add(svg, "path", { d: `M${normalX + 170},${mt + 76} C${W * .47},${mt + 54} ${W * .51},${mt + 54} ${anomX - 170},${mt + 76}`,
      fill: "none", stroke: "#bdc9d8", "stroke-width": 2, "stroke-dasharray": "5 5" });
    add(svg, "text", { x: W * .49, y: mt + 42, "text-anchor": "middle", "font-size": 10.7,
      "font-weight": 900, fill: "#526174" }, "different post-body field");

    const rowsY = mt + 204;
    const cols = [
      { label: "payload", x: W * .27 },
      { label: "visible origin", x: W * .47 },
      { label: "probable theme", x: W * .67 },
      { label: "body text", x: W * .82 },
    ];
    cols.forEach((c) => add(svg, "text", { x: c.x, y: rowsY - 22, "text-anchor": "middle",
      "font-size": 11.5, "font-weight": 900, fill: "#526174" }, c.label));
    CODES.forEach((code, i) => {
      const I = inc[code];
      const y = rowsY + 24 + i * 48;
      const col = codeColor(code);
      const originLabel = code === "SwiftWren" ? "meeting_notes.doc"
        : code === "MellowOtter" ? "strategic_dir.doc"
          : "unknown";
      const themeLabel = code === "SwiftWren" ? "meeting notes"
        : code === "MellowOtter" ? "strategy theme"
          : "unknown";
      add(svg, "text", { x: 36, y: y + 4, "font-size": 12.2, "font-weight": 900, fill: col }, code);
      const vals = [
        { text: `${code}.txt`, status: "observed" },
        { text: I.source_doc ? originLabel : "unknown", status: I.source_doc ? "observed" : "unknown" },
        { text: I.source_doc ? themeLabel : "unknown", status: I.source_doc ? "inferred" : "unknown" },
        { text: "unavailable", status: "unknown" },
      ];
      vals.forEach((v, j) => {
        const color = statusColor(v.status);
        const boxW = 126;
        const rect = add(svg, "rect", { x: cols[j].x - boxW / 2, y: y - 18, width: boxW, height: 34, rx: 7,
          fill: v.status === "unknown" ? "#f8fafc" : "#fff", stroke: color,
          "stroke-dasharray": v.status === "unknown" ? "4 3" : "none", "stroke-width": v.status === "inferred" ? 1.7 : 1.4 });
        rect.addEventListener("mousemove", (ev) => showTip(`<div class="tt-h">${code}: ${cols[j].label}</div><div class="tt-r">${esc(v.text)}</div><div class="tt-r">${v.status}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: cols[j].x, y: y + 4, "text-anchor": "middle", "font-size": 10.6,
          "font-weight": 850, fill: color }, shortText(v.text, 18));
      });
    });
    add(svg, "text", { x: 36, y: H - 18, "font-size": 11.5, fill: "#526174" },
      "Interpretation: the posts mean internal files were posted through a file-source field; exact wording, encryption, and motive remain unsupported.");
  }

  document.getElementById("gibberish").innerHTML = `
    <div class="cards3">
      <div class="card">
        <h3>What the posts mean</h3>
        <p class="tight">They are not ordinary forum messages. The post body is supplied by payload files through <code>content_source</code>, so the supported interpretation is file-backed externalization rather than human-authored prose.</p>
        <div class="note">Supported by 3/108 SaidIt posts using Agent + <code>content_source</code>.</div>
      </div>
      <div class="card">
        <h3>Why gibberish is plausible</h3>
        <p class="tight">The upstream source files are documents, while SaidIt expects text content. A file payload being posted as forum text can produce unreadable output without proving encryption.</p>
        <div class="note">The logs support a format/source mismatch mechanism, not exact plaintext recovery.</div>
      </div>
      <div class="card">
        <h3>What remains unknown</h3>
        <p class="tight">The file bodies are unavailable. Therefore the exact posted wording, specific confidential sentences, HiddenOrca source document, and human motive are unknown.</p>
        <div class="note">This keeps inference separate from observed event evidence.</div>
      </div>
    </div>`;

  drawSourceFieldScan();
  drawPayloadBacktrace();
  drawLocalWindows();
  drawProvenanceGraph();
  drawConfidenceMatrix();
  drawGlyphGrid();
  drawProvFlow();
  drawPayloadScale();
  drawSourceTimeline();
  drawMeaningModel();
  drawBoundaryViz();
  document.addEventListener("mc2statechange", (ev) => renderEvidence(ev.detail.incident));
  renderEvidence(state().incident);
})();
