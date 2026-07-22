const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "mc2_viz_data.json"), "utf8"));
const OUT = path.join(ROOT, "figure_gallery_statistical");
fs.mkdirSync(OUT, { recursive: true });

const C = {
  text: "#172033",
  muted: "#526174",
  dim: "#7a8797",
  grid: "#d8e1ec",
  bg: "#ffffff",
  blue: "#256fb8",
  red: "#c93b45",
  green: "#20865a",
  amber: "#a66a00",
  purple: "#7057c8",
  cyan: "#087f8c",
  gray: "#9aa6b2",
  pale: "#f4f7fb",
};
const incidents = ["HiddenOrca", "MellowOtter", "SwiftWren"];
const incColor = { HiddenOrca: C.blue, MellowOtter: C.purple, SwiftWren: C.red };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const label = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const parseTime = (s) => new Date(String(s).replace(" ", "T") + "Z").getTime();
const fmt = (v) => Number.isFinite(v) ? Math.round(v).toLocaleString() : "n/a";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function svg(title, subtitle, body, w = 1200, h = 720) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  <text x="34" y="42" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${C.text}">${esc(title)}</text>
  <text x="34" y="68" font-family="Arial, sans-serif" font-size="14" fill="${C.muted}">${esc(subtitle)}</text>
  ${body}
</svg>`;
}
function text(x, y, s, attrs = "") {
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="12" fill="${C.text}" ${attrs}>${esc(s)}</text>`;
}
function line(x1, y1, x2, y2, stroke = C.grid, sw = 1, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" ${attrs}/>`;
}
function rect(x, y, w, h, fill, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${fill}" ${attrs}/>`;
}
function circle(cx, cy, r, fill, attrs = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${attrs}/>`;
}
function pathD(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

function horizontalBar(title, subtitle, rows, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 720;
  const ml = opts.ml || 300, mr = 90, mt = 105, mb = 48;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const rowH = Math.min(opts.rowH || 34, (h - mt - mb) / Math.max(rows.length, 1));
  let body = line(ml, mt - 8, ml, h - mb, C.grid);
  rows.forEach((r, i) => {
    const y = mt + i * rowH;
    const bw = (r.value / max) * (w - ml - mr);
    body += text(ml - 12, y + rowH * 0.66, r.label, `text-anchor="end" fill="${C.muted}"`);
    body += rect(ml, y + 5, bw, rowH - 10, r.color || C.blue);
    body += text(ml + bw + 8, y + rowH * 0.66, r.fmt || fmt(r.value), `fill="${r.color || C.blue}" font-weight="700"`);
  });
  body += text(ml, h - 18, "0", `fill="${C.dim}"`);
  body += text(w - mr, h - 18, fmt(max), `text-anchor="end" fill="${C.dim}"`);
  return svg(title, subtitle, body, w, h);
}

function verticalBar(title, subtitle, rows, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 600;
  const ml = opts.ml || 80, mr = 60, mt = 105, mb = opts.mb || 110;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const gap = opts.gap || 16;
  const bw = (w - ml - mr - gap * (rows.length - 1)) / Math.max(rows.length, 1);
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  rows.forEach((r, i) => {
    const x = ml + i * (bw + gap);
    const bh = (r.value / max) * (h - mt - mb);
    body += rect(x, h - mb - bh, bw, bh, r.color || C.blue);
    body += text(x + bw / 2, h - mb - bh - 8, r.fmt || fmt(r.value), `text-anchor="middle" fill="${r.color || C.blue}" font-weight="700"`);
    body += text(x + bw / 2, h - mb + 18, r.label, `text-anchor="middle" fill="${C.muted}" transform="rotate(-30 ${x + bw / 2} ${h - mb + 18})"`);
  });
  return svg(title, subtitle, body, w, h);
}

function lineChart(title, subtitle, rows, yField, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 520;
  const ml = 86, mr = 55, mt = 95, mb = 70;
  const max = Math.max(...rows.map((r) => r[yField]), 1);
  const minT = Math.min(...rows.map((r) => parseTime(r.hour || r.day)));
  const maxT = Math.max(...rows.map((r) => parseTime(r.hour || r.day)));
  const x = (t) => ml + ((parseTime(t) - minT) / Math.max(1, maxT - minT)) * (w - ml - mr);
  const y = (v) => h - mb - (v / max) * (h - mt - mb);
  const pts = rows.map((r) => [x(r.hour || r.day), y(r[yField])]);
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  body += `<path d="${pathD(pts)}" fill="none" stroke="${opts.color || C.blue}" stroke-width="2.4"/>`;
  if (opts.area) {
    const area = `${pathD(pts)} L${pts[pts.length - 1][0].toFixed(1)},${h - mb} L${pts[0][0].toFixed(1)},${h - mb} Z`;
    body += `<path d="${area}" fill="${opts.color || C.blue}" opacity=".12"/>`;
  }
  body += text(ml, h - 28, rows[0].hour || rows[0].day, `fill="${C.dim}"`);
  body += text(w - mr, h - 28, rows[rows.length - 1].hour || rows[rows.length - 1].day, `text-anchor="end" fill="${C.dim}"`);
  body += text(ml - 12, mt + 4, fmt(max), `text-anchor="end" fill="${C.dim}"`);
  return svg(title, subtitle, body, w, h);
}

function histogram(title, subtitle, values, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 520;
  const ml = 85, mr = 60, mt = 95, mb = 70;
  const min = Math.min(...values), max = Math.max(...values);
  const bins = opts.bins || 24;
  const counts = Array.from({ length: bins }, () => 0);
  values.forEach((v) => counts[clamp(Math.floor(((v - min) / Math.max(1, max - min)) * bins), 0, bins - 1)]++);
  const cmax = Math.max(...counts, 1);
  const bw = (w - ml - mr) / bins;
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  counts.forEach((c, i) => {
    const bh = (c / cmax) * (h - mt - mb);
    body += rect(ml + i * bw + 1, h - mb - bh, bw - 2, bh, opts.color || C.blue);
  });
  body += text(ml, h - 28, fmt(min), `fill="${C.dim}"`);
  body += text(w - mr, h - 28, fmt(max), `text-anchor="end" fill="${C.dim}"`);
  body += text(ml - 12, mt + 4, `${fmt(cmax)} hours`, `text-anchor="end" fill="${C.dim}"`);
  return svg(title, subtitle, body, w, h);
}

function heatmap(title, subtitle, rows, cols, valueFn, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 700;
  const ml = opts.ml || 190, mt = opts.mt || 118, mr = 45, mb = 70;
  const cw = (w - ml - mr) / cols.length;
  const ch = (h - mt - mb) / rows.length;
  const vals = rows.flatMap((r) => cols.map((c) => Number(valueFn(r, c)) || 0));
  const max = Math.max(...vals, 1);
  let body = "";
  cols.forEach((c, i) => body += text(ml + i * cw + cw / 2, mt - 12, c, `text-anchor="middle" fill="${C.muted}"`));
  rows.forEach((r, ri) => {
    body += text(ml - 10, mt + ri * ch + ch / 2 + 4, r, `text-anchor="end" fill="${C.muted}"`);
    cols.forEach((c, ci) => {
      const v = Number(valueFn(r, c)) || 0;
      const a = v ? 0.16 + 0.84 * Math.sqrt(v / max) : 0;
      const fill = v ? (opts.color || C.blue) : C.pale;
      body += rect(ml + ci * cw + 1, mt + ri * ch + 1, cw - 2, ch - 2, fill, `opacity="${v ? a : 1}" stroke="${C.grid}"`);
      if (opts.labels && v) body += text(ml + ci * cw + cw / 2, mt + ri * ch + ch / 2 + 4, opts.format ? opts.format(v) : fmt(v), `text-anchor="middle" font-weight="700" fill="${a > .55 ? "#fff" : C.text}"`);
    });
  });
  body += text(ml, h - 28, "lighter = lower / blank = zero", `fill="${C.dim}"`);
  body += text(w - mr, h - 28, `max ${fmt(max)}`, `text-anchor="end" fill="${C.dim}"`);
  return svg(title, subtitle, body, w, h);
}

function scatter(title, subtitle, rows, xField, yField, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 560;
  const ml = 90, mr = 80, mt = 92, mb = 78;
  const xmax = Math.max(...rows.map((r) => r[xField]), 1);
  const ymax = Math.max(...rows.map((r) => r[yField]), 1);
  const x = (v) => ml + (v / xmax) * (w - ml - mr);
  const y = (v) => h - mb - (v / ymax) * (h - mt - mb);
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  rows.forEach((r) => {
    const col = r.color || C.blue;
    body += circle(x(r[xField]), y(r[yField]), r.r || 8, col, `opacity=".86"`);
    body += text(x(r[xField]) + 11, y(r[yField]) + 4, r.label, `fill="${col}" font-weight="700"`);
  });
  body += text(w / 2, h - 26, opts.xLabel || xField, `text-anchor="middle" fill="${C.muted}"`);
  body += text(22, h / 2, opts.yLabel || yField, `transform="rotate(-90 22 ${h / 2})" text-anchor="middle" fill="${C.muted}"`);
  return svg(title, subtitle, body, w, h);
}

function dotPlot(title, subtitle, metrics, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 620;
  const ml = 235, mr = 90, mt = 105, rowH = (h - mt - 70) / metrics.length;
  let body = "";
  metrics.forEach((m, i) => {
    const vals = incidents.map((code) => ({ code, value: m.get(data.incidents[code]) }));
    const max = Math.max(...vals.map((v) => v.value), 1);
    const y = mt + i * rowH;
    body += text(ml - 16, y + 4, m.label, `text-anchor="end" fill="${C.muted}" font-weight="700"`);
    body += line(ml, y, w - mr, y, C.grid);
    vals.forEach((v, j) => {
      const x = ml + (v.value / max) * (w - ml - mr);
      body += circle(x, y + (j - 1) * 9, v.code === "SwiftWren" ? 7 : 5, incColor[v.code]);
      body += text(x + 10, y + (j - 1) * 9 + 4, `${v.code}: ${fmt(v.value)}`, `fill="${incColor[v.code]}"`);
    });
  });
  return svg(title, subtitle, body, w, h);
}

function boxPlot(title, subtitle, groups, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 560;
  const ml = 105, mr = 60, mt = 95, mb = 95;
  const all = groups.flatMap((g) => g.values);
  const max = Math.max(...all, 1);
  const bw = (w - ml - mr) / groups.length;
  const y = (v) => h - mb - (v / max) * (h - mt - mb);
  const quantile = (arr, p) => {
    const a = arr.slice().sort((x, y) => x - y);
    if (!a.length) return 0;
    const idx = (a.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return a[lo] + (a[hi] - a[lo]) * (idx - lo);
  };
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  groups.forEach((g, i) => {
    const x = ml + i * bw + bw / 2;
    const vals = g.values.slice().sort((a, b) => a - b);
    const q1 = quantile(vals, .25), med = quantile(vals, .5), q3 = quantile(vals, .75);
    const min = vals[0] || 0, maxv = vals[vals.length - 1] || 0;
    body += line(x, y(min), x, y(maxv), g.color || C.blue, 2);
    body += rect(x - 34, y(q3), 68, y(q1) - y(q3), g.color || C.blue, `opacity=".28" stroke="${g.color || C.blue}"`);
    body += line(x - 38, y(med), x + 38, y(med), g.color || C.blue, 3);
    body += line(x - 25, y(min), x + 25, y(min), g.color || C.blue, 2);
    body += line(x - 25, y(maxv), x + 25, y(maxv), g.color || C.blue, 2);
    body += text(x, h - mb + 24, g.label, `text-anchor="middle" fill="${C.muted}"`);
  });
  body += text(ml - 12, mt + 4, fmt(max), `text-anchor="end" fill="${C.dim}"`);
  return svg(title, subtitle, body, w, h);
}

function stackedBar(title, subtitle, rows, keys, colors, opts = {}) {
  const w = opts.w || 1200, h = opts.h || 540;
  const ml = opts.ml || 250, mr = 90, mt = 105, mb = 70;
  const rowH = Math.min(52, (h - mt - mb) / rows.length);
  const max = Math.max(...rows.map((r) => keys.reduce((s, k) => s + (r[k] || 0), 0)), 1);
  let body = "";
  rows.forEach((r, i) => {
    const y = mt + i * rowH;
    body += text(ml - 14, y + rowH * .62, r.label, `text-anchor="end" fill="${C.muted}" font-weight="700"`);
    let x0 = ml;
    keys.forEach((k) => {
      const wv = ((r[k] || 0) / max) * (w - ml - mr);
      body += rect(x0, y + 10, wv, rowH - 20, colors[k] || C.blue);
      if (wv > 36) body += text(x0 + wv / 2, y + rowH * .62, fmt(r[k] || 0), `text-anchor="middle" fill="#fff" font-weight="700"`);
      x0 += wv;
    });
  });
  let lx = ml;
  keys.forEach((k) => {
    body += rect(lx, h - 34, 16, 16, colors[k] || C.blue) + text(lx + 22, h - 21, k, `fill="${C.muted}"`);
    lx += 150;
  });
  return svg(title, subtitle, body, w, h);
}

function targetingFunnel() {
  const w = 1200, h = 560, cx = w / 2, mt = 116;
  const rows = [
    { label: "all log events", value: data.total_events, why: "start from the provided event log", color: C.gray },
    { label: "SaidIt posts", value: data.saidit_baseline.total, why: "official clue names SaidIt as the posting platform", color: C.blue },
    { label: "Agent file-source posts", value: data.saidit_baseline.with_content_source, why: "abnormal posts use content_source instead of ordinary content", color: C.red },
    { label: "target SwiftWren post", value: 1, why: "John Windward + May 17 04:21 identifies the message of interest", color: C.green },
  ];
  const maxLog = Math.log10(rows[0].value + 1);
  const rowH = 82;
  let body = text(46, 92, "Filter is task-driven: the challenge gives SaidIt, John Windward, and the May 17 04:21 target time.", `fill="${C.muted}" font-size="13"`);
  rows.forEach((r, i) => {
    const y = mt + i * rowH;
    const width = 240 + (Math.log10(r.value + 1) / maxLog) * 520;
    const x = cx - width / 2;
    body += rect(x, y, width, 42, r.color, `rx="6" opacity="${i === 0 ? .45 : .88}"`);
    body += text(cx, y + 27, `${r.label}: ${fmt(r.value)}`, `text-anchor="middle" fill="#fff" font-weight="700" font-size="14"`);
    body += text(cx, y + 62, r.why, `text-anchor="middle" fill="${C.muted}" font-size="12"`);
    if (i < rows.length - 1) {
      body += `<path d="M${cx - 12},${y + 49} L${cx},${y + 62} L${cx + 12},${y + 49}" fill="none" stroke="${C.grid}" stroke-width="2"/>`;
    }
  });
  body += text(46, h - 34, "Bar width uses log10(count + 1), so the 185,147-to-1 narrowing remains readable without hiding the counts.", `fill="${C.dim}" font-size="12"`);
  return svg("Task-Driven Targeting Funnel", "How Q1 narrows the full event log to the target anomalous SaidIt post.", body, w, h);
}

function dailyRows() {
  return data.daily_event_mix.map((r) => ({
    day: r.day,
    total: r.total,
    queue_subordinate_task: r.top.queue_subordinate_task || 0,
    read_file: r.top.read_file || 0,
    create_file: r.top.create_file || 0,
    delete_file: r.top.delete_file || 0,
    check_email: r.top.check_email || 0,
    saidit_post: r.top.saidit_post || 0,
  }));
}
function incidentRows() {
  return incidents.map((code) => {
    const I = data.incidents[code];
    const start = parseTime(I.first_hop_when);
    const end = parseTime(I.post.when);
    return {
      label: code,
      code,
      hops: I.hop_count,
      agents: I.distinct_agent_count,
      departments: I.departments_touched.length,
      crossDept: I.cross_dept_hops,
      crossRatio: I.cross_dept_hops / Math.max(1, I.hop_count),
      johnArrivals: I.john_arrival_count,
      durationHours: (end - start) / 3600000,
      color: incColor[code],
    };
  });
}
function hopIntervals(code) {
  const hops = data.incidents[code].hops || [];
  const vals = [];
  for (let i = 1; i < hops.length; i++) vals.push((parseTime(hops[i].when) - parseTime(hops[i - 1].when)) / 60000);
  return vals.filter((v) => Number.isFinite(v) && v >= 0);
}
function receiverCounts(code) {
  const map = new Map();
  (data.incidents[code].hops || []).forEach((h) => map.set(h.to, (map.get(h.to) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ label: label(k), value: v, color: k === "john_windward" ? C.red : C.blue }));
}

const figures = [];
function add(id, group, title, svgText) {
  figures.push({ id, group, title, svg: svgText });
}

// Overview: descriptive system baseline.
add("01_overview_event_type_rank_bar", "overview", "Event Type Rank Bar", horizontalBar("Event Type Rank Bar", "Top event types by count; establishes the operating baseline before focusing on anomalies.", Object.entries(data.event_type_counts).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => ({ label: label(k), value: v, color: k === "queue_subordinate_task" ? C.red : C.blue })), { h: 760, ml: 300 }));
add("02_overview_party_type_bar", "overview", "Actor Type Composition", verticalBar("Actor Type Composition", "Event counts by actor type; used as a high-level system composition check.", Object.entries(data.party_type_counts || {}).map(([k, v]) => ({ label: label(k), value: v, color: k.toLowerCase().includes("agent") ? C.red : C.green })), { h: 520 }));
add("03_overview_daily_total_area", "overview", "Daily Total Event Trend", lineChart("Daily Total Event Trend", "Daily total events show the high-volume May 10-12 background spike.", dailyRows(), "total", { color: C.blue, area: true }));
add("04_overview_hourly_volume_histogram", "overview", "Hourly Event Volume Distribution", histogram("Hourly Event Volume Distribution", "Histogram of hourly event counts; separates ordinary hours from the high-density tail.", data.time_density.map((r) => r.total), { bins: 30, color: C.purple }));
add("05_overview_day_hour_heatmap", "overview", "Day-Hour Event Heatmap", heatmap("Day-Hour Event Heatmap", "Aggregated event volume by day and hour; first 18 days shown to keep the temporal baseline readable.", [...new Set(data.time_density.map((r) => r.hour.slice(0, 10)))].slice(0, 18), Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), (day, hour) => (data.time_density.find((r) => r.hour.slice(0, 10) === day && r.hour.slice(11, 13) === hour) || {}).total || 0, { h: 760, ml: 130, mt: 116, color: C.blue }));
add("06_overview_saidit_source_stacked", "overview", "SaidIt Source-Field Composition", stackedBar("SaidIt Source-Field Composition", "Normal posts use content; anomalies use content_source.", [{ label: "SaidIt posts", content: data.saidit_baseline.with_content_topic, content_source: data.saidit_baseline.with_content_source }], ["content", "content_source"], { content: C.green, content_source: C.red }, { h: 320, ml: 190 }));
add("07_overview_saidit_actor_rank", "overview", "SaidIt Post Count by Actor", horizontalBar("SaidIt Post Count by Actor", "Top posting actors, with John Agent highlighted when present.", Object.entries(data.saidit_posts_compact.reduce((m, p) => (m[p.actor] = (m[p.actor] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => ({ label: label(k), value: v, color: k === "john_windward" ? C.red : C.green })), { h: 640, ml: 260 }));
add("08_overview_queue_task_composition", "overview", "Queue Task Composition", horizontalBar("Queue Task Composition", "Subordinate-task categories; read_file is the task used in the anomalous relays.", Object.entries(data.qst_overview.task_types || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: label(k), value: v, color: k === "read_file" ? C.red : C.blue })), { h: 420, ml: 280 }));
add("09_overview_virus_action_distribution", "overview", "Virus Action Distribution", verticalBar("Virus Action Distribution", "Virus-labeled decoy events form balanced action classes and do not touch codename files or SaidIt.", Object.entries(data.virus.short_name_split || {}).map(([k, v]) => ({ label: label(k), value: v, color: C.amber })), { h: 560 }));

// Q1: event-chain mechanism with descriptive comparisons.
const inc = incidentRows();
add("09_q1_task_targeting_funnel", "q1", "Task-Driven Targeting Funnel", targetingFunnel());
add("10_q1_incident_metric_dotplot", "q1", "Incident Metric Dot Plot", dotPlot("Incident Metric Dot Plot", "Separate axes compare each incident without mixing units.", [
  { label: "relay hops", get: (I) => I.hop_count },
  { label: "distinct Agents", get: (I) => I.distinct_agent_count },
  { label: "departments touched", get: (I) => I.departments_touched.length },
  { label: "cross-department hops", get: (I) => I.cross_dept_hops },
  { label: "John arrivals", get: (I) => I.john_arrival_count },
], { h: 600 }));
add("11_q1_relay_hop_bar", "q1", "Relay Hop Count Bar", verticalBar("Relay Hop Count Bar", "SwiftWren is the largest relay chain by hop count.", inc.map((r) => ({ label: r.label, value: r.hops, color: r.color })), { h: 520 }));
add("12_q1_relay_duration_bar", "q1", "Relay Duration Bar", verticalBar("Relay Duration Bar", "Time from first visible relay to public SaidIt post, in hours.", inc.map((r) => ({ label: r.label, value: r.durationHours, color: r.color, fmt: `${r.durationHours.toFixed(1)}h` })), { h: 520 }));
add("13_q1_cross_dept_ratio_bar", "q1", "Cross-Department Ratio", verticalBar("Cross-Department Ratio", "Share of relay hops crossing department boundaries.", inc.map((r) => ({ label: r.label, value: r.crossRatio * 100, color: r.color, fmt: `${(r.crossRatio * 100).toFixed(1)}%` })), { h: 520 }));
add("14_q1_john_arrivals_bar", "q1", "John Arrival Count", verticalBar("John Arrival Count", "Number of times the relay task arrived at John Windward before or at posting.", inc.map((r) => ({ label: r.label, value: r.johnArrivals, color: r.color })), { h: 520 }));
add("15_q1_swiftwren_receiver_rank", "q1", "SwiftWren Receiver Rank", horizontalBar("SwiftWren Receiver Rank", "Top receivers in the 186-hop SwiftWren relay chain.", receiverCounts("SwiftWren"), { h: 620, ml: 260 }));
add("16_q1_hop_interval_boxplot", "q1", "Relay Hop Interval Box Plot", boxPlot("Relay Hop Interval Box Plot", "Distribution of minutes between consecutive relay hops.", incidents.map((code) => ({ label: code, values: hopIntervals(code), color: incColor[code] })), { h: 560 }));
add("17_q1_department_flow_heatmap", "q1", "SwiftWren Department Flow Heatmap", heatmap("SwiftWren Department Flow Heatmap", "Sender department by receiver department for the target chain.", data.incidents.SwiftWren.departments_touched.map(label), data.incidents.SwiftWren.departments_touched.map(label), (r, c) => {
  const rr = r.toLowerCase().replaceAll(" ", "_");
  const cc = c.toLowerCase().replaceAll(" ", "_");
  return (data.incidents.SwiftWren.department_flow.find((e) => e.from === rr && e.to === cc) || {}).count || 0;
}, { h: 660, ml: 250, mt: 145, color: C.red, labels: true }));
add("18_q1_terminal_recipe_timeline", "q1", "Terminal Recipe Timeline", (() => {
  const rows = data.incidents.SwiftWren.recipe;
  const w = 1200, h = 430, ml = 120, mr = 80, y = 220;
  const min = Math.min(...rows.map((r) => parseTime(r.when))), max = Math.max(...rows.map((r) => parseTime(r.when)));
  const x = (t) => ml + ((parseTime(t) - min) / Math.max(1, max - min)) * (w - ml - mr);
  let body = line(ml, y, w - mr, y, C.grid, 2);
  rows.forEach((r, i) => {
    const xx = x(r.when);
    const col = r.action === "saidit_post" ? C.red : r.action === "delete_file" ? C.blue : C.green;
    body += circle(xx, y, r.action === "saidit_post" ? 10 : 7, col);
    body += text(xx, y - 45 - (i % 2) * 26, r.action, `text-anchor="middle" fill="${col}" font-weight="700"`);
    body += text(xx, y + 38 + (i % 2) * 22, `id ${r.id}`, `text-anchor="middle" fill="${C.dim}"`);
  });
  return svg("Terminal Recipe Timeline", "Observed second-by-second John Agent sequence for SwiftWren.", body, w, h);
})());

// Q2: meaning, source, and uncertainty as evidence statistics.
add("19_q2_provenance_completeness_heatmap", "q2", "Provenance Completeness Heatmap", heatmap("Provenance Completeness Heatmap", "Which provenance stages are directly observed for each incident.", incidents, ["source read", "payload create", "relay chain", "public post", "cleanup"], (code, stage) => {
  const I = data.incidents[code];
  return stage === "source read" ? (I.source_doc ? 1 : 0) : stage === "payload create" ? (I.create_file ? 1 : 0) : stage === "relay chain" ? 1 : stage === "public post" ? 1 : 1;
}, { h: 430, ml: 160, mt: 120, color: C.green, labels: true, format: (v) => v ? "yes" : "" }));
add("20_q2_payload_size_bar", "q2", "Payload Size Bar", verticalBar("Payload Size Bar", "Visible payload file size hints; HiddenOrca payload creation is outside the visible evidence window.", incidents.map((code) => ({ label: code, value: data.incidents[code].create_file?.size_hint || 0, color: data.incidents[code].create_file ? incColor[code] : C.gray, fmt: data.incidents[code].create_file ? fmt(data.incidents[code].create_file.size_hint) : "unknown" })), { h: 520 }));
add("21_q2_source_to_post_lag_bar", "q2", "Source-to-Post Lag", verticalBar("Source-to-Post Lag", "Hours from observed source read to public post; unknown where source read is not observed.", incidents.map((code) => {
  const I = data.incidents[code];
  const v = I.source_doc ? (parseTime(I.post.when) - parseTime(I.source_doc.when)) / 3600000 : 0;
  return { label: code, value: v, color: I.source_doc ? incColor[code] : C.gray, fmt: I.source_doc ? `${v.toFixed(1)}h` : "unknown" };
}), { h: 520 }));
add("22_q2_evidence_certainty_stacked", "q2", "Evidence Certainty Counts", stackedBar("Evidence Certainty Counts", "Observed, inferred, and unknown claim counts used in the written answer.", [
  { label: "HiddenOrca", observed: 4, inferred: 2, unknown: 3 },
  { label: "MellowOtter", observed: 6, inferred: 2, unknown: 1 },
  { label: "SwiftWren", observed: 6, inferred: 2, unknown: 1 },
], ["observed", "inferred", "unknown"], { observed: C.green, inferred: C.amber, unknown: C.gray }, { h: 470, ml: 190 }));
add("23_q2_source_visibility_bar", "q2", "Source Visibility Bar", verticalBar("Source Visibility Bar", "Binary visibility of source document evidence.", incidents.map((code) => ({ label: code, value: data.incidents[code].source_doc ? 1 : 0, color: data.incidents[code].source_doc ? C.green : C.gray, fmt: data.incidents[code].source_doc ? "visible" : "unknown" })), { h: 430 }));
add("24_q2_post_source_field_composition", "q2", "Post Source-Field Composition", stackedBar("Post Source-Field Composition", "The key observed difference: human posts have content; anomalous Agent posts have content_source.", [
  { label: "Human SaidIt posts", content: 105, content_source: 0 },
  { label: "Agent SaidIt posts", content: 0, content_source: 3 },
], ["content", "content_source"], { content: C.green, content_source: C.red }, { h: 420, ml: 230 }));
add("25_q2_cleanup_delete_count", "q2", "Cleanup Delete Count", verticalBar("Cleanup Delete Count", "Observed delete_file actions immediately after each anomalous public post.", incidents.map((code) => ({ label: code, value: (data.incidents[code].recipe || []).filter((r) => r.action === "delete_file").length, color: incColor[code] })), { h: 430 }));
add("26_q2_claim_boundary_matrix", "q2", "Claim Boundary Matrix", heatmap("Claim Boundary Matrix", "Evidence boundary prevents unsupported claims about exact text or motive.", ["source document", "payload file", "public post", "exact leaked text", "human motive"], ["observed", "inferred", "unknown"], (r, c) => {
  const map = {
    "source document": "observed",
    "payload file": "observed",
    "public post": "observed",
    "exact leaked text": "unknown",
    "human motive": "unknown",
  };
  return map[r] === c ? 1 : 0;
}, { h: 500, ml: 220, mt: 125, color: C.amber, labels: true, format: () => "yes" }));
add("27_q2_source_actor_department_bar", "q2", "Source Actor Department", horizontalBar("Source Actor Department", "Observed source reads come from executive-suite actors; absence remains explicit for HiddenOrca.", incidents.map((code) => {
  const I = data.incidents[code];
  const actor = I.source_doc?.read_by;
  const dept = actor ? data.org.person_dept[actor] : "unknown";
  return { label: `${code}: ${label(dept)}`, value: actor ? 1 : 0, color: actor ? C.green : C.gray, fmt: actor ? label(actor) : "unknown" };
}), { h: 430, ml: 360 }));

// Q3: recurrence and intervention with statistical tradeoffs.
add("28_q3_recurrence_post_timeline", "q3", "Recurrence Post Timeline", (() => {
  const rows = incidents.map((code) => ({ code, when: data.incidents[code].post.when }));
  const w = 1200, h = 430, ml = 110, mr = 90, y = 220;
  const min = Math.min(...rows.map((r) => parseTime(r.when))), max = Math.max(...rows.map((r) => parseTime(r.when)));
  const x = (t) => ml + ((parseTime(t) - min) / Math.max(1, max - min)) * (w - ml - mr);
  let body = line(ml, y, w - mr, y, C.grid, 2);
  rows.forEach((r) => {
    const xx = x(r.when);
    body += circle(xx, y, r.code === "SwiftWren" ? 10 : 7, incColor[r.code]);
    body += text(xx, y - 28, r.code, `text-anchor="middle" fill="${incColor[r.code]}" font-weight="700"`);
    body += text(xx, y + 36, r.when, `text-anchor="middle" fill="${C.dim}"`);
  });
  return svg("Recurrence Post Timeline", "Three file-source SaidIt posts occurred before and including the target incident.", body, w, h);
})());
add("29_q3_incident_scale_dotplot", "q3", "Incident Scale Dot Plot", dotPlot("Incident Scale Dot Plot", "Historic cases and the target case compared on recurring behavior metrics.", [
  { label: "relay hops", get: (I) => I.hop_count },
  { label: "Agents", get: (I) => I.distinct_agent_count },
  { label: "departments", get: (I) => I.departments_touched.length },
  { label: "cross-dept hops", get: (I) => I.cross_dept_hops },
  { label: "cleanup deletes", get: (I) => (I.recipe || []).filter((r) => r.action === "delete_file").length },
], { h: 600 }));
add("30_q3_anomaly_ratio_bar", "q3", "Anomaly Ratio Bar", verticalBar("Anomaly Ratio Bar", "Only 3 of 108 SaidIt posts are Agent content_source anomalies.", [
  { label: "normal human content", value: 105, color: C.green },
  { label: "Agent content_source", value: 3, color: C.red },
], { h: 500 }));
add("31_q3_intervention_scatter", "q3", "False Positives vs Blast Radius", (() => {
  const short = {
    "Agent saidit_post with details.content_source": "SaidIt content_source gate",
    "Block all queue_subordinate_task": "Block all queue tasks",
    "Detect *_further_instructions.md relay filenames": "Filename relay detector",
    "Remove John Agent SaidIt permission": "Remove John permission",
    "Alert on delete_file immediately after content_source post": "Post-cleanup alert",
  };
  const rows = data.intervention_rules.map((r, i) => ({
    label: short[r.rule] || r.rule,
    x: Math.log10(r.normal_human_false_positives + 1),
    y: Math.log10(r.records_affected + 1),
    rawFalse: r.normal_human_false_positives,
    rawAffected: r.records_affected,
    rawCoverage: r.coverage,
    color: r.decision.startsWith("recommended") ? C.green : C.blue,
    recommended: r.decision.startsWith("recommended"),
  }));
  const w = 1200, h = 560, ml = 95, mr = 95, mt = 95, mb = 82;
  const xmax = Math.max(...rows.map((r) => r.x), 1);
  const ymax = Math.max(...rows.map((r) => r.y), 1);
  const x = (v) => ml + (v / xmax) * (w - ml - mr);
  const y = (v) => h - mb - (v / ymax) * (h - mt - mb);
  let body = line(ml, h - mb, w - mr, h - mb, C.grid) + line(ml, mt, ml, h - mb, C.grid);
  body += text(ml, h - 52, "0", `fill="${C.dim}"`);
  body += text(w - mr, h - 52, "log10(false positives + 1)", `text-anchor="end" fill="${C.dim}"`);
  rows.forEach((r, i) => {
    const jitterY = r.rawFalse === 0 && r.rawAffected === 3 && !r.recommended ? 16 : 0;
    const xx = x(r.x), yy = y(r.y) + jitterY;
    body += circle(xx, yy, r.recommended ? 11 : 7, r.color, `opacity=".9"`);
    body += text(xx + (r.rawFalse === 0 ? 14 : -14), yy + 4, `${r.label}: ${r.rawCoverage}/3, FP ${fmt(r.rawFalse)}, affected ${fmt(r.rawAffected)}`, `${r.rawFalse === 0 ? "" : "text-anchor=\"end\""} fill="${r.color}" font-weight="${r.recommended ? 700 : 400}"`);
  });
  body += text(w / 2, h - 25, "normal human false positives, log scale", `text-anchor="middle" fill="${C.muted}"`);
  body += text(22, h / 2, "affected records, log scale", `transform="rotate(-90 22 ${h / 2})" text-anchor="middle" fill="${C.muted}"`);
  return svg("False Positives vs Blast Radius", "All candidates cover 3/3 known anomalies; this chart compares side effects.", body, w, h);
})());
add("32_q3_affected_records_log_bar", "q3", "Affected Records Log Bar", horizontalBar("Affected Records Log Bar", "Operational blast radius on log10 scale; lower is easier to justify.", data.intervention_rules.map((r) => ({ label: r.rule, value: Math.log10(r.records_affected + 1), color: r.decision.startsWith("recommended") ? C.green : C.blue, fmt: fmt(r.records_affected) })), { h: 620, ml: 430 }));
add("33_q3_gate_confusion_matrix", "q3", "Gate Confusion Matrix", heatmap("Gate Confusion Matrix", "For Agent + content_source gate: catches 3/3 anomalies and blocks 0/105 normal human posts.", ["actual anomaly", "normal human post"], ["blocked by gate", "allowed by gate"], (r, c) => ({
  "actual anomaly|blocked by gate": 3,
  "actual anomaly|allowed by gate": 0,
  "normal human post|blocked by gate": 0,
  "normal human post|allowed by gate": 105,
}[`${r}|${c}`] || 0), { h: 420, ml: 230, mt: 120, color: C.green, labels: true }));
add("34_q3_rule_tradeoff_matrix", "q3", "Rule Tradeoff Matrix", heatmap("Rule Tradeoff Matrix", "Candidate interventions compared by count metrics.", data.intervention_rules.map((r) => r.rule), ["coverage", "false positives", "affected records"], (r, c) => {
  const item = data.intervention_rules.find((x) => x.rule === r);
  return c === "coverage" ? item.coverage : c === "false positives" ? item.normal_human_false_positives : item.records_affected;
}, { h: 650, ml: 430, mt: 120, color: C.blue, labels: true }));
add("35_q3_timing_category_bar", "q3", "Intervention Timing Category", horizontalBar("Intervention Timing Category", "Counts of candidate rules by timing category.", Object.entries(data.intervention_rules.reduce((m, r) => (m[r.timing] = (m[r.timing] || 0) + 1, m), {})).map(([k, v]) => ({ label: label(k), value: v, color: k === "pre-publication" ? C.green : k === "post-exposure" ? C.amber : C.blue })), { h: 430, ml: 270 }));
add("36_q3_shared_agent_intersections", "q3", "Shared-Agent Intersections", horizontalBar("Shared-Agent Intersections", "UpSet-style counts: exact Agent membership across HiddenOrca, MellowOtter, SwiftWren.", (() => {
  const sets = incidents.map((code) => new Set(data.incidents[code].distinct_agents));
  const all = [...new Set(incidents.flatMap((code) => data.incidents[code].distinct_agents))];
  const groups = new Map();
  all.forEach((a) => {
    const bits = sets.map((s) => s.has(a) ? "1" : "0").join("");
    groups.set(bits, (groups.get(bits) || 0) + 1);
  });
  return [...groups.entries()].sort((a, b) => b[1] - a[1]).map(([bits, value]) => ({ label: `${bits} (Hidden/Mellow/Swift)`, value, color: bits === "111" ? C.red : C.purple }));
})(), { h: 520, ml: 270 }));

async function main() {
  const edgePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
  for (const f of figures) {
    const page = await browser.newPage({ viewport: { width: 1300, height: 920 }, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0;background:white">${f.svg}</body>`);
    await page.locator("svg").screenshot({ path: path.join(OUT, `${f.id}.png`) });
    await fs.promises.writeFile(path.join(OUT, `${f.id}.svg`), f.svg, "utf8");
    await page.close();
  }
  await browser.close();
  const md = ["# MC2 Statistical Figure Gallery", "", `Generated ${figures.length} standalone PNG figures from mc2_viz_data.json.`, "", "This gallery emphasizes descriptive statistics and EDA-style charts: bars, histograms, line/area charts, heatmaps, dot plots, box plots, scatterplots, stacked bars, and matrices.", ""];
  for (const [group, title] of [["overview", "Overview/Baseline"], ["q1", "Q1 Mechanism"], ["q2", "Q2 Meaning/Provenance"], ["q3", "Q3 Recurrence/Intervention"]]) {
    md.push(`## ${title}`, "");
    figures.filter((f) => f.group === group).forEach((f) => md.push(`- ${f.id}.png - ${f.title}`));
    md.push("");
  }
  fs.writeFileSync(path.join(OUT, "FIGURE_INDEX.md"), md.join("\n"), "utf8");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MC2 Statistical Figure Gallery</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #172033; background: #f6f8fb; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 32px 0 14px; font-size: 20px; }
    p { margin: 0 0 18px; color: #526174; }
    figure { margin: 0 0 22px; padding: 14px; background: white; border: 1px solid #d8e1ec; border-radius: 8px; }
    figcaption { margin: 0 0 10px; font-weight: 700; color: #172033; }
    img { display: block; width: 100%; height: auto; border: 1px solid #edf2f7; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
  </style>
</head>
<body>
<main>
  <h1>MC2 Statistical Figure Gallery</h1>
  <p>36 PNG figures generated from <code>mc2_viz_data.json</code>. These emphasize descriptive statistics and EDA-style visual encodings.</p>
  ${[["overview", "Overview/Baseline"], ["q1", "Q1 Mechanism"], ["q2", "Q2 Meaning/Provenance"], ["q3", "Q3 Recurrence/Intervention"]].map(([group, title]) => `
  <section>
    <h2>${title}</h2>
    <div class="grid">
      ${figures.filter((f) => f.group === group).map((f) => `<figure><figcaption>${f.id}.png - ${esc(f.title)}</figcaption><img src="${f.id}.png" alt="${esc(f.title)}"></figure>`).join("\n      ")}
    </div>
  </section>`).join("\n")}
</main>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, "index.html"), html, "utf8");
  console.log(`Generated ${figures.length} PNG and ${figures.length} SVG files in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
