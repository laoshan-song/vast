/* q2.js - provenance rows, evidence matrix, and interpretation boundaries */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, makeInteractive, showTip, hideTip, name, esc, evidenceBox } = MC2;
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
  document.querySelectorAll("#strength button[data-c]").forEach((b) => b.addEventListener("click", () => renderEvidence(b.dataset.c)));

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
    return `<div class="provenance-row">
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
  drawSourceTimeline();
  renderEvidence("SwiftWren");
})();
