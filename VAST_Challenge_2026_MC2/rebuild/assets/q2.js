/* q2.js - provenance rows, evidence matrix, and interpretation boundaries */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, esc, evidenceBox, state, setState } = MC2;
  const inc = d.incidents;
  const evidence = document.getElementById("evidence");
  const CODES = ["SwiftWren", "MellowOtter", "HiddenOrca"];

  const META = {
    SwiftWren: {
      theme: "probable CFO meeting notes",
      role: "CFO Emma Harbor",
      sourceStrength: "strong",
      claim: "source read and payload creation are visible",
    },
    MellowOtter: {
      theme: "probable COO strategic directions",
      role: "COO Noah Mariner",
      sourceStrength: "strong",
      claim: "source read and payload creation are visible",
    },
    HiddenOrca: {
      theme: "unknown source theme",
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
      row.hidden = state().mode === "review" && row.dataset.c !== c;
    });
  }

  function statusColor(status) {
    return status === "observed" ? "var(--ok)" : status === "inferred" ? "var(--warn)" : "var(--dim)";
  }

  function statusBadge(status) {
    return status === "observed" ? "obs" : status === "inferred" ? "inf" : "unk";
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
    const H = 310, ml = 150, mt = 70, mr = 36;
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
    labelSvg(svg, "Evidence provenance directed acyclic graph from source evidence to payload, public post, and inferred meaning.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 410, mt = 88, mb = 44;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const cols = [
      { key: "source", x: Math.max(155, W * .15), label: "source evidence" },
      { key: "payload", x: W * .40, label: "payload file" },
      { key: "post", x: W * .66, label: "public post" },
      { key: "meaning", x: W - 116, label: "probable meaning" },
    ];
    const y = (i) => mt + 42 + i * 76;
    add(svg, "text", { x: 36, y: 24, "font-size": 13, "font-weight": 800 }, "Evidence provenance DAG");
    add(svg, "text", { x: 36, y: 43, "font-size": 11.5, fill: "#526174" },
      "Solid edges connect logged evidence. Dashed edges indicate interpretation or an unavailable link.");
    add(svg, "text", { x: 36, y: 61, "font-size": 11.5, fill: "#526174" },
      "Gray dashed nodes remain unknown from the visible logs.");
    cols.forEach((c) => {
      add(svg, "text", { x: c.x, y: mt - 20, "text-anchor": "middle", "font-size": 11.5,
        "font-weight": 800, fill: "#526174" }, c.label);
      add(svg, "line", { x1: c.x, y1: mt - 8, x2: c.x, y2: H - mb, stroke: "#d8e1ec", "stroke-dasharray": "2 3" });
    });
    CODES.forEach((c, i) => {
      const I = inc[c];
      const rowY = y(i);
      const srcKnown = !!I.source_doc;
      const col = c === "SwiftWren" ? "var(--anom)" : c === "MellowOtter" ? "var(--purple)" : "var(--info)";
      const sourceCol = srcKnown ? "var(--ok)" : "var(--dim)";
      const nodes = [
        { k: "source", label: srcKnown ? I.source_doc.name : "source unknown", sub: srcKnown ? `id ${I.source_doc.id}` : "outside window", fill: sourceCol, status: srcKnown ? "observed" : "unknown" },
        { k: "payload", label: `${c}.txt`, sub: I.create_file ? `${I.create_file.size_hint.toLocaleString()} B` : "payload existed", fill: srcKnown ? "var(--ok)" : "var(--dim)", status: I.create_file ? "observed" : "unknown" },
        { k: "post", label: "saidit_post", sub: I.post ? `id ${I.post.id}` : "not visible", fill: col, status: "observed" },
        { k: "meaning", label: META[c].theme, sub: META[c].sourceStrength, fill: srcKnown ? "var(--warn)" : "var(--dim)", status: srcKnown ? "inferred" : "unknown" },
      ];
      for (let j = 0; j < cols.length - 1; j++) {
        const x1 = cols[j].x + 72, x2 = cols[j + 1].x - 72;
        const inferred = j === 2;
        const unknown = j === 0 && !srcKnown;
        const p = `M${x1},${rowY} C${x1 + 80},${rowY} ${x2 - 80},${rowY} ${x2},${rowY}`;
        add(svg, "path", { d: p, fill: "none", stroke: inferred ? "var(--warn)" : unknown ? "var(--dim)" : "var(--info)",
          "stroke-width": inferred ? 2 : 2.6, "stroke-dasharray": inferred || unknown ? "6 5" : "none", opacity: inferred ? .82 : .62 });
        add(svg, "text", { x: (x1 + x2) / 2, y: rowY - 9, "text-anchor": "middle", "font-size": 10.5,
          fill: inferred ? "var(--warn)" : unknown ? "var(--dim)" : "#526174" }, inferred ? "inferred" : unknown ? "not visible" : "logged link");
      }
      add(svg, "text", { x: cols[0].x - 80, y: rowY + 4, "text-anchor": "end",
        "font-size": 12.5, "font-weight": 800, fill: col }, c);
      nodes.forEach((n, j) => {
        const cx = cols[j].x;
        const rect = add(svg, "rect", { x: cx - 70, y: rowY - 22, width: 140, height: 44, rx: 7,
          fill: "#f8fafc", stroke: n.fill, "stroke-width": n.status === "unknown" ? 1.2 : 1.8,
          "stroke-dasharray": n.status === "unknown" ? "4 3" : "none" });
        makeInteractive(rect, `${c} ${cols[j].label}: ${n.status}`, () => setState({ incident: c }));
        rect.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${c}: ${cols[j].label}</div><div class="tt-r">${esc(n.label)}</div><div class="tt-r">${n.status}</div>`, e));
        rect.addEventListener("mouseleave", hideTip);
        add(svg, "text", { x: cx, y: rowY - 3, "text-anchor": "middle", "font-size": 11.2,
          "font-weight": 800, fill: n.fill }, n.label.length > 20 ? n.label.slice(0, 19) + "..." : n.label);
        add(svg, "text", { x: cx, y: rowY + 13, "text-anchor": "middle", "font-size": 9.7,
          fill: "#63748a", "font-family": "var(--mono)" }, n.sub);
      });
    });
    [["observed node / solid link", "var(--ok)"], ["public boundary", "var(--anom)"], ["inferred / dashed", "var(--warn)"], ["unknown / dashed", "var(--dim)"]].forEach(([lab, col], i) => {
      const x = 36 + i * 150;
      add(svg, "rect", { x, y: H - 20, width: 12, height: 12, rx: 2, fill: col, opacity: lab === "unknown" ? .45 : .9 });
      add(svg, "text", { x: x + 18, y: H - 10, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawPayloadScale() {
    const svg = document.getElementById("payloadscale");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Payload size and relay-hop lollipop comparison for the three anomalous posts.");
    const W = Math.max(780, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 340, mt = 86, mb = 40;
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

  const boundaryRows = [
    ["read_file / create_file / saidit_post / delete_file event order", "obs", "", ""],
    ["SwiftWren source document and payload packaging", "obs", "", ""],
    ["MellowOtter source document and payload packaging", "obs", "", ""],
    ["All three posts use John Agent with content_source", "obs", "", ""],
    ["Payload file derived from the visible source document", "", "inf", ""],
    ["Probable themes: meeting notes and strategic directions", "", "inf", ""],
    ["HiddenOrca follows the same terminal mechanism", "", "inf", ""],
    ["Exact body text of each posted file", "", "", "unk"],
    ["Specific confidential sentences or decisions exposed", "", "", "unk"],
    ["HiddenOrca source document and creator", "", "", "unk"],
    ["Human motive or attacker identity", "", "", "unk"],
  ];

  document.getElementById("boundary").innerHTML = `<table class="grid evidence-matrix">
    <tr><th>Claim</th><th>Observed</th><th>Inferred</th><th>Unknown</th></tr>
    ${boundaryRows.map(([claim, o, i, u]) => `<tr>
      <td>${esc(claim)}</td>
      <td>${o ? '<span class="badge obs">yes</span>' : ""}</td>
      <td>${i ? '<span class="badge inf">yes</span>' : ""}</td>
      <td>${u ? '<span class="badge unk">yes</span>' : ""}</td>
    </tr>`).join("")}
  </table>`;

  document.getElementById("gibberish").innerHTML = `
    <div class="cards2">
      <div class="card">
        <h3>Why gibberish is plausible</h3>
        <p class="tight">The visible source files are <code>.doc</code> documents, while the public posts point to <code>.txt</code> payload files. The logs show file handling and posting, not a clean human-authored forum message. A format or byte-level mismatch can explain unreadable text without proving encryption.</p>
        <div class="note">Evidence supports "file content was posted where forum text was expected." It does not support a verbatim reconstruction of the content.</div>
      </div>
      <div class="card">
        <h3>Why the forum choice looks random</h3>
        <p class="tight">All three terminal post events use <code>forum=general</code>. The action was automated by an Agent with a fixed posting path, not a human selecting a semantically appropriate forum.</p>
        <div class="note">This supports an automation failure or misuse pattern. It does not prove intent.</div>
      </div>
    </div>`;

  drawConfidenceMatrix();
  drawGlyphGrid();
  drawProvFlow();
  drawPayloadScale();
  drawSourceTimeline();
  document.addEventListener("mc2statechange", (ev) => renderEvidence(ev.detail.incident));
  renderEvidence(state().incident);
})();
