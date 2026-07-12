/* overview.js - system baseline, signature small multiples, method pipeline */
(async () => {
  const d = await MC2.load();
  const { add, labelSvg, bindTooltip, showTip, hideTip, toTs, pageHref } = MC2;

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
      <a class="pill" href="${pageHref("q1.html")}">Open chain view</a>
    </div>
    <div class="card qcard ok">
      <h2>Q2: What does it mean?</h2>
      <p>The posts are probably internal company documents externalized as file-backed posts. Exact payload wording is unknown.</p>
      <div class="metricline"><b>2</b> visible source documents / <b>1</b> source outside the window</div>
      <a class="pill" href="${pageHref("q2.html")}">Open provenance view</a>
    </div>
    <div class="card qcard anom">
      <h2>Q3: Could it repeat?</h2>
      <p>Yes. HiddenOrca, MellowOtter, and SwiftWren share the same terminal mechanism. Use one boundary gate.</p>
      <div class="metricline"><b>3/3</b> covered / <b>0/105</b> normal-post false positives</div>
      <a class="pill" href="${pageHref("q3.html")}">Open intervention view</a>
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
      bindTooltip(bar, `${k}: ${v.toLocaleString()} events`, `<div class="tt-h">${k}</div><div class="tt-r">${v.toLocaleString()} events</div>`);
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
        bindTooltip(r, `${lab}: ${v} of ${row.denom}`, `<div class="tt-h">${lab}</div><div class="tt-r">${v} of ${row.denom}</div>`);
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

  function drawTimeDensity() {
    const svg = document.getElementById("timeheat");
    if (!svg || !d.time_density) return;
    svg.innerHTML = "";
    labelSvg(svg, "Hourly global event density with virus window and file-source SaidIt anomaly posts.");
    const W = 1180, H = 330, ml = 58, mr = 36, mt = 36, mb = 58;
    const rows = d.time_density.map((r) => ({ ...r, ts: toTs(r.hour) }));
    const min = rows[0].ts, max = rows[rows.length - 1].ts;
    const x = (t) => ml + ((t - min) / (max - min)) * (W - ml - mr);
    const maxLog = Math.log1p(Math.max(...rows.map((r) => r.total)));
    const y = (v) => mt + (1 - Math.log1p(v) / maxLog) * (H - mt - mb);
    const barW = Math.max(1, (W - ml - mr) / rows.length);

    add(svg, "text", { x: ml, y: 18, "font-size": 13, "font-weight": 800 }, "Hourly event density across the full log");
    add(svg, "text", { x: ml + 300, y: 18, "font-size": 11.5, fill: "#526174" },
      "gray = all events, amber = virus:true, red markers = content_source SaidIt posts");

    [1, 10, 100, 1000, 7000].forEach((v) => {
      const yy = y(v);
      add(svg, "line", { x1: ml, y1: yy, x2: W - mr, y2: yy, stroke: "#eef3f8" });
      add(svg, "text", { x: ml - 8, y: yy + 4, "text-anchor": "end", "font-size": 10.5, fill: "#63748a" }, v.toLocaleString());
    });
    add(svg, "line", { x1: ml, y1: mt, x2: ml, y2: H - mb, stroke: "#bdc9d8" });
    add(svg, "line", { x1: ml, y1: H - mb, x2: W - mr, y2: H - mb, stroke: "#bdc9d8" });

    rows.forEach((r) => {
      const xx = x(r.ts);
      const h = H - mb - y(r.total);
      const rect = add(svg, "rect", { x: xx, y: y(r.total), width: barW, height: Math.max(.8, h),
        fill: r.virus ? "rgba(166,106,0,.52)" : "rgba(37,111,184,.22)" });
      if (r.codename_related) {
        add(svg, "rect", { x: xx, y: H - mb - 10, width: barW, height: 10, fill: "rgba(201,59,69,.55)" });
      }
      bindTooltip(rect, `${r.hour}: ${r.total.toLocaleString()} events`,
        `<div class="tt-h">${r.hour}</div><div class="tt-r">total ${r.total.toLocaleString()}</div><div class="tt-r">virus ${r.virus.toLocaleString()} / codename ${r.codename_related.toLocaleString()}</div>`);
    });

    const daySeen = new Set();
    rows.forEach((r) => {
      const day = r.hour.slice(0, 10);
      if (daySeen.has(day) || !r.hour.endsWith("00:00")) return;
      daySeen.add(day);
      const xx = x(r.ts);
      add(svg, "line", { x1: xx, y1: mt, x2: xx, y2: H - mb + 5, stroke: "#d8e1ec", "stroke-width": .8 });
      if (daySeen.size % 2 === 1) add(svg, "text", { x: xx + 3, y: H - 28, "font-size": 10.5, fill: "#63748a" }, day.slice(5));
    });

    d.anomalous_posts.forEach((p) => {
      const tt = toTs(p.when_local);
      const xx = x(tt);
      const yy = y(rows.find((r) => r.hour === p.when_local.slice(0, 13) + ":00")?.total || 1) - 10;
      const m = add(svg, "circle", { cx: xx, cy: yy, r: p.file.startsWith("Swift") ? 7 : 5.5,
        fill: "var(--anom)", stroke: "#fff", "stroke-width": 2 });
      bindTooltip(m, `${p.file} anomaly post`, `<div class="tt-h">${p.file}</div><div class="tt-r">${p.when_local}</div><div class="tt-r">post id ${p.id} / by ${p.by}</div>`);
      add(svg, "line", { x1: xx, y1: yy + 7, x2: xx, y2: H - mb, stroke: "rgba(201,59,69,.45)", "stroke-dasharray": "3 3" });
      add(svg, "text", { x: xx + 7, y: yy - 7, "font-size": 10.8, "font-weight": 800, fill: "var(--anom)" }, p.file.replace(".txt", ""));
    });

    [
      ["all events", "rgba(37,111,184,.35)"],
      ["virus:true burst", "rgba(166,106,0,.62)"],
      ["codename-related hour", "rgba(201,59,69,.55)"],
      ["file-source post", "var(--anom)"],
    ].forEach(([lab, col], i) => {
      add(svg, "rect", { x: ml + i * 190, y: H - 16, width: 12, height: 12, rx: 2, fill: col });
      add(svg, "text", { x: ml + i * 190 + 18, y: H - 6, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawCalendarHeatmap() {
    const svg = document.getElementById("calendarheat");
    if (!svg || !d.time_density) return;
    svg.innerHTML = "";
    labelSvg(svg, "Date by hour activity heatmap with anomaly post markers.");
    const rows = d.time_density;
    const days = [...new Set(rows.map((r) => r.hour.slice(0, 10)))];
    const dayIndex = new Map(days.map((x, i) => [x, i]));
    const byKey = new Map(rows.map((r) => [`${r.hour.slice(0, 10)}|${Number(r.hour.slice(11, 13))}`, r]));
    const W = 1180, H = 560, ml = 86, mr = 28, mt = 82, mb = 46;
    const cw = (W - ml - mr) / 24;
    const rh = Math.min(7, (H - mt - mb) / days.length);
    const maxLog = Math.log1p(Math.max(...rows.map((r) => r.total)));
    const y0 = mt;
    const color = (r) => {
      if (!r) return "#f7f9fc";
      if (r.content_source_post) return "var(--anom)";
      if (r.virus) return `rgba(166,106,0,${.18 + .68 * Math.log1p(r.total) / maxLog})`;
      return `rgba(37,111,184,${.08 + .55 * Math.log1p(r.total) / maxLog})`;
    };
    add(svg, "text", { x: ml, y: 24, "font-size": 13, "font-weight": 800 }, "Date-hour activity heatmap");
    add(svg, "text", { x: ml, y: 43, "font-size": 11.5, fill: "#526174" },
      "Rows are dates and columns are hours. Color encodes log-scaled event volume; red marks file-source SaidIt post hours.");
    for (let h = 0; h < 24; h += 3) {
      const x = ml + h * cw + cw / 2;
      add(svg, "text", { x, y: mt - 16, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" }, `${String(h).padStart(2, "0")}:00`);
    }
    days.forEach((day, i) => {
      const y = y0 + i * rh;
      if (i % 5 === 0 || day.endsWith("-10") || day.endsWith("-17")) {
        add(svg, "text", { x: ml - 8, y: y + rh - 1, "text-anchor": "end", "font-size": 9.5,
          fill: day.endsWith("-17") ? "var(--anom)" : "#63748a", "font-weight": day.endsWith("-17") ? 800 : 400 }, day.slice(5));
      }
      for (let h = 0; h < 24; h++) {
        const r = byKey.get(`${day}|${h}`);
        const rect = add(svg, "rect", { x: ml + h * cw + 1, y, width: cw - 1.5, height: Math.max(2, rh - .8),
          rx: 1, fill: color(r), stroke: r?.content_source_post ? "#fff" : "transparent", "stroke-width": r?.content_source_post ? 1.2 : 0 });
        rect.addEventListener("mousemove", (e) => showTip(
          `<div class="tt-h">${day} ${String(h).padStart(2, "0")}:00</div><div class="tt-r">total ${(r?.total || 0).toLocaleString()}</div><div class="tt-r">virus ${(r?.virus || 0).toLocaleString()} / content_source posts ${(r?.content_source_post || 0)}</div>`, e));
        rect.addEventListener("mouseleave", hideTip);
      }
    });
    [
      ["regular activity", "rgba(37,111,184,.45)"],
      ["virus-heavy hour", "rgba(166,106,0,.70)"],
      ["file-source post hour", "var(--anom)"],
    ].forEach(([lab, col], i) => {
      const x = ml + i * 190;
      add(svg, "rect", { x, y: H - 20, width: 12, height: 12, rx: 2, fill: col });
      add(svg, "text", { x: x + 18, y: H - 10, "font-size": 11.5, fill: "#526174" }, lab);
    });
  }

  function drawEventStream() {
    const svg = document.getElementById("eventstream");
    if (!svg || !d.time_density) return;
    svg.innerHTML = "";
    labelSvg(svg, "Daily stacked event composition stream.");
    const byDay = new Map();
    d.time_density.forEach((r) => {
      const day = r.hour.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { day, total: 0, virus: 0, qst: 0, codename: 0, saidit: 0 });
      const v = byDay.get(day);
      v.total += r.total;
      v.virus += r.virus;
      v.qst += r.queue_subordinate_task;
      v.codename += r.codename_related;
      v.saidit += r.saidit_post;
    });
    const days = [...byDay.values()];
    days.forEach((r) => r.other = Math.max(0, r.total - r.virus - r.qst - r.codename - r.saidit));
    const W = 1180, H = 340, ml = 60, mr = 34, mt = 50, mb = 54;
    const plotH = H - mt - mb;
    const x = (i) => ml + (i / Math.max(1, days.length - 1)) * (W - ml - mr);
    const max = Math.max(...days.map((r) => r.total));
    const y = (v) => mt + plotH - (v / max) * plotH;
    const keys = [
      ["other", "other events", "rgba(99,116,138,.32)"],
      ["qst", "queue tasks", "rgba(37,111,184,.52)"],
      ["virus", "virus:true", "rgba(166,106,0,.58)"],
      ["codename", "codename-related", "rgba(201,59,69,.50)"],
      ["saidit", "SaidIt posts", "rgba(8,127,140,.70)"],
    ];
    add(svg, "text", { x: ml, y: 22, "font-size": 13, "font-weight": 800 }, "Daily event stream composition");
    add(svg, "text", { x: ml, y: 41, "font-size": 11.5, fill: "#526174" },
      "Stacked daily totals show background volume versus task, virus, codename, and SaidIt activity.");
    add(svg, "line", { x1: ml, y1: mt + plotH, x2: W - mr, y2: mt + plotH, stroke: "#bdc9d8" });
    keys.forEach(([key, label, col], ki) => {
      const ptsTop = [];
      const ptsBot = [];
      days.forEach((r, i) => {
        const before = keys.slice(0, ki).reduce((s, [k]) => s + r[k], 0);
        ptsBot.push([x(i), y(before)]);
        ptsTop.push([x(i), y(before + r[key])]);
      });
      const dpath = [...ptsTop, ...ptsBot.reverse()].map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
      const area = add(svg, "path", { d: dpath, fill: col, stroke: "rgba(255,255,255,.75)", "stroke-width": .7 });
      area.addEventListener("mousemove", (e) => showTip(`<div class="tt-h">${label}</div><div class="tt-r">daily stacked area; hover bars in heatmap for exact hours</div>`, e));
      area.addEventListener("mouseleave", hideTip);
    });
    days.forEach((r, i) => {
      if (i % 7 === 0 || r.day.endsWith("-10") || r.day.endsWith("-17")) {
        add(svg, "line", { x1: x(i), y1: mt, x2: x(i), y2: mt + plotH + 5, stroke: "#eef3f8" });
        add(svg, "text", { x: x(i), y: H - 28, "text-anchor": "middle", "font-size": 10.5,
          fill: r.day.endsWith("-17") ? "var(--anom)" : "#63748a" }, r.day.slice(5));
      }
    });
    keys.forEach(([, label, col], i) => {
      const x0 = ml + i * 168;
      add(svg, "rect", { x: x0, y: H - 16, width: 12, height: 12, rx: 2, fill: col });
      add(svg, "text", { x: x0 + 18, y: H - 6, "font-size": 11.5, fill: "#526174" }, label);
    });
  }

  function drawSignalSmallMultiples() {
    const svg = document.getElementById("signalsmall");
    if (!svg || !d.time_density) return;
    svg.innerHTML = "";
    labelSvg(svg, "Daily small multiples for total events, queue tasks, virus events, codename activity, SaidIt posts, and content-source posts.");
    const byDay = new Map();
    d.time_density.forEach((r) => {
      const day = r.hour.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { day, total: 0, qst: 0, virus: 0, codename: 0, saidit: 0, contentSource: 0 });
      const v = byDay.get(day);
      v.total += r.total;
      v.qst += r.queue_subordinate_task;
      v.virus += r.virus;
      v.codename += r.codename_related;
      v.saidit += r.saidit_post;
      v.contentSource += r.content_source_post;
    });
    const days = [...byDay.values()];
    const W = 1180, H = 460, ml = 148, mr = 34, mt = 44, mb = 48;
    const rowH = (H - mt - mb) / 6;
    const x = (i) => ml + (i / Math.max(1, days.length - 1)) * (W - ml - mr);
    const series = [
      { key: "total", label: "all events", color: "rgba(99,116,138,.78)", scale: "log" },
      { key: "qst", label: "queue tasks", color: "var(--info)", scale: "log" },
      { key: "virus", label: "virus:true", color: "var(--warn)", scale: "log" },
      { key: "codename", label: "codename events", color: "var(--anom)", scale: "linear" },
      { key: "saidit", label: "SaidIt posts", color: "var(--cyan)", scale: "linear" },
      { key: "contentSource", label: "content_source posts", color: "var(--anom)", scale: "linear" },
    ];
    add(svg, "text", { x: ml, y: 22, "font-size": 13, "font-weight": 800 }, "Daily signal small multiples");
    add(svg, "text", { x: ml + 210, y: 22, "font-size": 11.5, fill: "#526174" },
      "Each row has its own scale; red dots mark the three file-source post days.");
    series.forEach((s, si) => {
      const y0 = mt + si * rowH;
      const vals = days.map((r) => r[s.key]);
      const max = Math.max(...vals, 1);
      const y = (v) => {
        const t = s.scale === "log" ? Math.log1p(v) / Math.log1p(max) : v / max;
        return y0 + rowH - 18 - t * (rowH - 28);
      };
      add(svg, "text", { x: ml - 12, y: y0 + 22, "text-anchor": "end", "font-size": 11.5,
        "font-weight": 800, fill: s.color }, s.label);
      add(svg, "line", { x1: ml, y1: y0 + rowH - 18, x2: W - mr, y2: y0 + rowH - 18, stroke: "#d8e1ec" });
      add(svg, "text", { x: W - mr + 4, y: y(max) + 4, "font-size": 10, fill: "#63748a", "font-family": "var(--mono)" },
        max.toLocaleString());
      const path = days.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[s.key]).toFixed(1)}`).join(" ");
      add(svg, "path", { d: path, fill: "none", stroke: s.color, "stroke-width": s.key === "contentSource" ? 2.6 : 1.7, opacity: .86 });
      days.forEach((r, i) => {
        const active = r.contentSource > 0 || (s.key !== "contentSource" && r[s.key] > 0 && (s.key === "saidit" || s.key === "codename"));
        const dot = add(svg, "circle", { cx: x(i), cy: y(r[s.key]), r: r.contentSource > 0 ? 4.6 : active ? 2.8 : 1.5,
          fill: r.contentSource > 0 ? "var(--anom)" : s.color, opacity: r[s.key] > 0 ? .86 : .18, stroke: r.contentSource > 0 ? "#fff" : "none", "stroke-width": 1.2 });
        dot.addEventListener("mousemove", (e) => showTip(
          `<div class="tt-h">${r.day}</div><div class="tt-r">${s.label}: ${r[s.key].toLocaleString()}</div><div class="tt-r">content_source posts: ${r.contentSource}</div>`, e));
        dot.addEventListener("mouseleave", hideTip);
      });
    });
    days.forEach((r, i) => {
      if (i % 7 === 0 || r.day.endsWith("-10") || r.day.endsWith("-17")) {
        add(svg, "text", { x: x(i), y: H - 22, "text-anchor": "middle", "font-size": 10.5,
          fill: r.day.endsWith("-17") ? "var(--anom)" : "#63748a" }, r.day.slice(5));
      }
    });
    add(svg, "text", { x: ml, y: H - 6, "font-size": 11.2, fill: "#526174" },
      "Small multiples are used instead of one shared axis because the signals differ by orders of magnitude.");
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

  function drawProcessComparison() {
    const svg = document.getElementById("processflow");
    if (!svg) return;
    svg.innerHTML = "";
    labelSvg(svg, "Directly-follows process comparison for normal human and anomalous Agent SaidIt posts.");
    const W = Math.max(820, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 330, ml = 52, mr = 36;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const lanes = [
      {
        y: 104, label: `Normal human posts / ${b.with_content_topic}`,
        color: "var(--ok)",
        nodes: [
          ["Human actor", `${b.by_person} posts`],
          ["content field", "ordinary text"],
          ["saidit_post", "public post"],
        ],
      },
      {
        y: 236, label: `Repeated Agent anomaly / ${b.with_content_source}`,
        color: "var(--anom)",
        nodes: [
          ["relay arrival", "read_file task"],
          ["post check", "within 1 second"],
          ["content_source", "file-backed post"],
          ["cleanup", "two deletes"],
        ],
      },
    ];
    add(svg, "text", { x: ml, y: 24, "font-size": 13.5, "font-weight": 800 }, "Directly-follows process model");
    add(svg, "text", { x: ml, y: 44, "font-size": 12, fill: "#46576b" },
      "The anomaly differs as a process, not only as a rare post: Agent relay, file source, check, and cleanup recur together.");
    lanes.forEach((lane) => {
      add(svg, "text", { x: ml, y: lane.y - 42, "font-size": 12.5, "font-weight": 800, fill: lane.color }, lane.label);
      const start = ml + 26;
      const usable = W - start - mr;
      const gap = usable / lane.nodes.length;
      lane.nodes.forEach(([title, sub], i) => {
        const cx = start + gap * i + gap / 2;
        if (i) {
          const px = start + gap * (i - 1) + gap / 2;
          add(svg, "line", { x1: px + 66, y1: lane.y, x2: cx - 66, y2: lane.y,
            stroke: lane.color, "stroke-width": lane === lanes[1] ? 3 : 2, opacity: .58 });
          add(svg, "path", { d: `M${cx - 72},${lane.y - 5} L${cx - 63},${lane.y} L${cx - 72},${lane.y + 5}`,
            fill: "none", stroke: lane.color, "stroke-width": 2 });
        }
        const box = add(svg, "rect", { x: cx - 66, y: lane.y - 30, width: 132, height: 60, rx: 8,
          fill: "#f8fafc", stroke: lane.color, "stroke-width": title === "content_source" ? 2.5 : 1.6 });
        bindTooltip(box, `${lane.label}: ${title}`, `<div class="tt-h">${title}</div><div class="tt-r">${sub}</div><div class="tt-r">${lane.label}</div>`);
        add(svg, "text", { x: cx, y: lane.y - 3, "text-anchor": "middle", "font-size": 12.2,
          "font-weight": 800, fill: lane.color }, title);
        add(svg, "text", { x: cx, y: lane.y + 16, "text-anchor": "middle", "font-size": 11.2, fill: "#46576b" }, sub);
      });
    });
    add(svg, "text", { x: ml, y: H - 18, "font-size": 12, fill: "#46576b" },
      "Process contrast is derived from 108 SaidIt posts and the three repeated terminal recipes.");
  }

  function drawRuleSpace() {
    const svg = document.getElementById("rulespace");
    if (!svg || !d.saidit_posts_compact) return;
    svg.innerHTML = "";
    labelSvg(svg, "Rule space of all SaidIt posts by actor type and source field, with check and cleanup rings.");
    const W = Math.max(820, Math.floor(svg.parentElement.clientWidth || 1160));
    const H = 360, ml = 174, mr = 34, mt = 72, mb = 56;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const cellW = (W - ml - mr) / 2;
    const cellH = (H - mt - mb) / 2;
    const sourceIndex = { content: 0, content_source: 1 };
    const actorIndex = { Human: 0, Agent: 1 };
    add(svg, "text", { x: ml, y: 24, "font-size": 13.5, "font-weight": 800 }, "SaidIt rule-space separation");
    add(svg, "text", { x: ml, y: 44, "font-size": 12, fill: "#46576b" },
      "Position encodes actor and source field; a dark ring marks posts preceded by post_check and followed by cleanup.");
    ["content", "content_source"].forEach((label, i) => {
      add(svg, "text", { x: ml + i * cellW + cellW / 2, y: mt - 14, "text-anchor": "middle",
        "font-size": 12.5, "font-weight": 800, fill: i ? "var(--anom)" : "var(--ok)" }, label);
    });
    ["Human actor", "Agent actor"].forEach((label, i) => {
      add(svg, "text", { x: ml - 18, y: mt + i * cellH + cellH / 2 + 4, "text-anchor": "end",
        "font-size": 12.5, "font-weight": 800, fill: i ? "var(--anom)" : "var(--ok)" }, label);
    });
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      add(svg, "rect", { x: ml + col * cellW + 4, y: mt + row * cellH + 4,
        width: cellW - 8, height: cellH - 8, rx: 8, fill: row === col ? "#f3f8f7" : "#f8fafc", stroke: "#d8e1ec" });
    }
    const groups = new Map();
    d.saidit_posts_compact.forEach((post) => {
      const key = `${post.actor_type}|${post.source_field}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(post);
    });
    groups.forEach((posts, key) => {
      const [actorType, sourceField] = key.split("|");
      const row = actorIndex[actorType], col = sourceIndex[sourceField];
      const cols = Math.min(18, Math.ceil(Math.sqrt(posts.length * 2.2)));
      const dx = Math.min(18, (cellW - 44) / Math.max(cols, 1));
      const rows = Math.ceil(posts.length / cols);
      const dy = Math.min(18, (cellH - 42) / Math.max(rows, 1));
      posts.forEach((post, i) => {
        const x = ml + col * cellW + 24 + (i % cols) * dx;
        const y = mt + row * cellH + 24 + Math.floor(i / cols) * dy;
        const anomaly = post.actor_type === "Agent" && post.source_field === "content_source";
        const mark = add(svg, "circle", { cx: x, cy: y, r: anomaly ? 6 : 4.2,
          fill: anomaly ? "var(--anom)" : "var(--ok)", opacity: anomaly ? 1 : .62,
          stroke: post.post_check && post.cleanup ? "#172033" : "#fff", "stroke-width": post.post_check && post.cleanup ? 2.4 : 1 });
        bindTooltip(mark, `SaidIt post ${post.id}: ${actorType}, ${sourceField}`,
          `<div class="tt-h">post id ${post.id}</div><div class="tt-r">${post.when_local}</div><div class="tt-r">${actorType} / ${sourceField}</div><div class="tt-r">post_check ${post.post_check} / cleanup ${post.cleanup}</div>${post.file ? `<div class="tt-r">${post.file}</div>` : ""}`);
      });
      add(svg, "text", { x: ml + col * cellW + cellW - 16, y: mt + row * cellH + 24,
        "text-anchor": "end", "font-size": 18, "font-weight": 900,
        fill: actorType === "Agent" ? "var(--anom)" : "var(--ok)" }, posts.length);
    });
    add(svg, "circle", { cx: ml, cy: H - 20, r: 5, fill: "var(--ok)" });
    add(svg, "text", { x: ml + 12, y: H - 16, "font-size": 12, fill: "#46576b" }, "ordinary post");
    add(svg, "circle", { cx: ml + 150, cy: H - 20, r: 6, fill: "var(--anom)", stroke: "#172033", "stroke-width": 2 });
    add(svg, "text", { x: ml + 164, y: H - 16, "font-size": 12, fill: "#46576b" }, "Agent file-source + check + cleanup");
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
  drawTimeDensity();
  drawProcessComparison();
  drawCalendarHeatmap();
  drawEventStream();
  drawSignalSmallMultiples();
  drawSignatureBars();
  drawRuleSpace();
  drawQstBars();
  drawActorBars();
})();
