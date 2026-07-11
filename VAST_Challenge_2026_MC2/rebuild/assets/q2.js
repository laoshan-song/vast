/* q2.js - provenance rows, evidence matrix, and interpretation boundaries */
(async () => {
  const d = await MC2.load();
  const { name, esc, evidenceBox } = MC2;
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

  renderEvidence("SwiftWren");
})();
