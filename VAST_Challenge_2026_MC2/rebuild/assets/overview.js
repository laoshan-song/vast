/* overview.js - system baseline, signature small multiples, method pipeline */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, showTip, hideTip } = MC2;

  const b = d.saidit_baseline;
  const ck = d.saidit_check;
  const swift = d.incidents.SwiftWren;

  document.getElementById("keystats").innerHTML = [
    ["185,147", "total logged events", "info"],
    ["108", "SaidIt posts", "ok"],
    ["3", "Agent file-source anomalies", "anom"],
    ["105", "normal human SaidIt posts", "ok"],
    ["235", "codename relay hops", "info"],
    ["5", "SwiftWren arrivals at John", "warn"],
  ].map(([n, l, c]) => `<div class="stat ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");

  document.getElementById("qmap").innerHTML = `
  <div class="cards3">
    <div class="card qcard info">
      <h2>Q1: How was it made?</h2>
      <p>Internal document -> codename payload -> Agent relay -> John Agent -> <code>saidit_post(content_source)</code> -> cleanup.</p>
      <div class="metricline"><b>${swift.hop_count}</b> SwiftWren relay hops / <b>${swift.distinct_agent_count}</b> Agents / <b>${swift.john_arrival_count}</b> John arrivals</div>
      <a class="pill" href="q1.html">Open chain view</a>
    </div>
    <div class="card qcard ok">
      <h2>Q2: What does it mean?</h2>
      <p>The posts are probably internal company documents externalized as file-backed posts. Exact payload wording is unknown.</p>
      <div class="metricline"><b>2</b> visible source documents / <b>1</b> source outside the window</div>
      <a class="pill" href="q2.html">Open provenance view</a>
    </div>
    <div class="card qcard anom">
      <h2>Q3: Could it repeat?</h2>
      <p>Yes. HiddenOrca, MellowOtter, and SwiftWren share the same terminal mechanism. Use one boundary gate.</p>
      <div class="metricline"><b>3/3</b> covered / <b>0/105</b> normal-post false positives</div>
      <a class="pill" href="q3.html">Open intervention view</a>
    </div>
  </div>`;

  function drawEventBars() {
    const svg = document.getElementById("typebars");
    svg.innerHTML = "";
    labelSvg(svg, "Sorted event type distribution. SaidIt actions are highlighted.");
    const W = 1180, H = 470, ml = 198, mr = 96, mt = 12, mb = 24;
    const entries = Object.entries(d.event_type_counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map((x) => x[1]));
    const bh = (H - mt - mb) / entries.length;
    const x = (v) => ml + (v / max) * (W - ml - mr);
    const postActions = new Set(["saidit_post", "saidit_post_check", "post_saidit", "flex_post", "post_flex"]);

    entries.forEach(([k, v], i) => {
      const y = mt + i * bh;
      const isSaidIt = postActions.has(k);
      const col = k === "saidit_post" ? "var(--anom)" : isSaidIt ? "var(--warn)" : "var(--info)";
      add(svg, "text", { x: ml - 10, y: y + bh / 2 + 4, "text-anchor": "end", "font-size": 12,
        fill: isSaidIt ? "#172033" : "#526174", "font-weight": isSaidIt ? 700 : 400 }, k);
      const bar = add(svg, "rect", { x: ml, y: y + 2, width: Math.max(1, x(v) - ml), height: bh - 5,
        rx: 3, fill: col, opacity: isSaidIt ? 0.96 : 0.55 });
      add(svg, "text", { x: x(v) + 8, y: y + bh / 2 + 4, "font-size": 11.5, fill: "#526174",
        "font-family": "var(--mono)" }, v.toLocaleString());
      bar.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${k}</div><div class="tt-r">${v.toLocaleString()} events</div>`, e));
      bar.addEventListener("mouseleave", hideTip);
    });

    [["anomalous post action", "var(--anom)"], ["SaidIt check/post actions", "var(--warn)"], ["other event types", "var(--info)"]]
      .forEach(([t, c], i) => {
        add(svg, "rect", { x: W - mr - 190, y: mt + 8 + i * 21, width: 12, height: 12, rx: 2, fill: c, opacity: .85 });
        add(svg, "text", { x: W - mr - 172, y: mt + 18 + i * 21, "font-size": 11.5, fill: "#526174" }, t);
      });
  }

  function drawSignatureBars() {
    const svg = document.getElementById("sigbars");
    svg.innerHTML = "";
    labelSvg(svg, "Small multiples comparing normal SaidIt behavior with anomaly signatures.");
    const W = 1180, H = 310, ml = 58, mt = 34, barW = 820, rowH = 86;
    const rows = [
      {
        title: "Actor type among 108 saidit_post events",
        denom: b.total,
        parts: [["person", b.by_person, "var(--ok)"], ["Agent", b.by_agent, "var(--anom)"]],
      },
      {
        title: "Post source field among 108 saidit_post events",
        denom: b.total,
        parts: [["content topic", b.with_content_topic, "var(--ok)"], ["content_source file", b.with_content_source, "var(--anom)"]],
      },
      {
        title: "Outcome after 71 saidit_post_check events",
        denom: ck.total_checks,
        parts: [["no public post", ck.checks_not_posting, "var(--warn)"], ["led to post", ck.checks_leading_to_post, "var(--anom)"]],
      },
    ];

    rows.forEach((row, i) => {
      const y = mt + i * rowH;
      add(svg, "text", { x: ml, y, "font-size": 13, "font-weight": 700 }, row.title);
      let acc = 0;
      row.parts.forEach(([lab, v, col]) => {
        const w = (v / row.denom) * barW;
        const r = add(svg, "rect", { x: ml + acc, y: y + 16, width: Math.max(3, w), height: 32,
          rx: 4, fill: col, opacity: lab.includes("content") && !lab.includes("source") ? .65 : .82 });
        r.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${lab}</div><div class="tt-r">${v} of ${row.denom}</div>`, e));
        r.addEventListener("mouseleave", hideTip);
        if (w > 118) {
          add(svg, "text", { x: ml + acc + 10, y: y + 37, "font-size": 12, "font-weight": 700, fill: "#fff" }, `${lab}: ${v}`);
        } else {
          add(svg, "text", { x: ml + acc + w + 10, y: y + 37, "font-size": 12, "font-weight": 700, fill: col }, `${lab}: ${v}`);
        }
        acc += w;
      });
      add(svg, "text", { x: ml + barW + 22, y: y + 37, "font-size": 12, fill: "#526174" },
        `denominator = ${row.denom}`);
    });

    add(svg, "text", { x: ml, y: H - 16, "font-size": 12, fill: "#526174" },
      "The anomaly is defined by the intersection of Agent actor and content_source file, not by post count alone.");
  }

  function drawQstBars() {
    const svg = document.getElementById("qstbars");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "queue_subordinate_task composition showing virus, access email, relay, and read file tasks.");
    const W = 560, H = 300, ml = 150, mr = 28, mt = 34, mb = 34;
    const entries = Object.entries(d.qst_overview.task_types).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map((x) => x[1]));
    add(svg, "text", { x: 18, y: 18, "font-size": 13, "font-weight": 800 }, "Task composition");
    add(svg, "text", { x: 18, y: 36, "font-size": 11.5, fill: "#526174" }, `${d.qst_overview.total.toLocaleString()} queue_subordinate_task records`);
    const bh = (H - mt - mb) / entries.length;
    entries.forEach(([k, v], i) => {
      const y = mt + i * bh + 14;
      const isCodename = k === "queue_subordinate_task" || k === "read_file";
      const col = k === "virus" ? "var(--dim)" : isCodename ? "var(--anom)" : "var(--info)";
      add(svg, "text", { x: ml - 10, y: y + bh / 2 + 4, "text-anchor": "end", "font-size": 12, fill: "#526174" }, k);
      const bar = add(svg, "rect", { x: ml, y: y + 4, width: (v / max) * (W - ml - mr), height: bh - 12, rx: 4, fill: col, opacity: k === "virus" ? .48 : .82 });
      add(svg, "text", { x: ml + (v / max) * (W - ml - mr) + 8, y: y + bh / 2 + 4, "font-size": 11.5, fill: "#526174", "font-family": "var(--mono)" }, v.toLocaleString());
      bar.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${k}</div><div class="tt-r">${v.toLocaleString()} task records</div>`, e));
      bar.addEventListener("mouseleave", hideTip);
    });
    add(svg, "text", { x: 18, y: H - 12, "font-size": 11.5, fill: "#526174" }, "Virus tasks are large background volume; codename read-file relay is the relevant path subset.");
  }

  function drawActorBars() {
    const svg = document.getElementById("actorbars");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Named-party activity baseline, with John highlighted.");
    const W = 560, H = 300, ml = 160, mr = 28, mt = 34, mb = 24;
    const aggregate = new Set(["person", "Agent/person", "system", "world", "agent"]);
    const named = Object.entries(d.party_type_counts)
      .filter(([k]) => !aggregate.has(k))
      .sort((a, b) => b[1] - a[1]);
    const john = named.find(([k]) => k === "John Windward");
    const top = named.slice(0, 10);
    if (john && !top.some(([k]) => k === "John Windward")) top.push(john);
    top.sort((a, b) => b[1] - a[1]);
    const max = Math.max(...top.map((x) => x[1]));
    add(svg, "text", { x: 18, y: 18, "font-size": 13, "font-weight": 800 }, "Named actor activity");
    add(svg, "text", { x: 18, y: 36, "font-size": 11.5, fill: "#526174" }, "Raw event counts; John highlighted for context");
    const bh = (H - mt - mb) / top.length;
    top.forEach(([k, v], i) => {
      const y = mt + i * bh + 8;
      const isJohn = k === "John Windward";
      add(svg, "text", { x: ml - 10, y: y + bh / 2 + 4, "text-anchor": "end", "font-size": 11.3,
        fill: isJohn ? "var(--anom)" : "#526174", "font-weight": isJohn ? 800 : 400 }, k);
      const bar = add(svg, "rect", { x: ml, y: y + 3, width: (v / max) * (W - ml - mr), height: bh - 7, rx: 4,
        fill: isJohn ? "var(--anom)" : "var(--info)", opacity: isJohn ? .86 : .48 });
      add(svg, "text", { x: ml + (v / max) * (W - ml - mr) + 7, y: y + bh / 2 + 4, "font-size": 10.8, fill: "#526174", "font-family": "var(--mono)" }, v.toLocaleString());
      bar.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${k}</div><div class="tt-r">${v.toLocaleString()} events</div>`, e));
      bar.addEventListener("mouseleave", hideTip);
    });
    add(svg, "text", { x: 18, y: H - 12, "font-size": 11.5, fill: "#526174" }, "This baseline argues against blaming raw activity volume alone.");
  }

  document.getElementById("pipeline").innerHTML = `
    <div class="method-grid">
      ${[
        ["1", "Filter", "isolate SaidIt and codename relay actions"],
        ["2", "Trace", "unfold the route by hop order"],
        ["3", "Link", "connect source, payload, post, and cleanup"],
        ["4", "Compare", "contrast normal posts with anomaly signatures"],
        ["5", "Intervene", "choose the single boundary gate with coverage evidence"],
      ].map(([n, t, s]) => `<div class="method-step"><div class="method-num">${n}</div><div><b>${t}</b><span>${s}</span></div></div>`).join("")}
    </div>`;

  drawEventBars();
  drawSignatureBars();
  drawQstBars();
  drawActorBars();
})();
