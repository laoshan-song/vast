const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "MC2 data.json"), "utf8"));
const org = JSON.parse(fs.readFileSync(path.join(root, "org_chart.json"), "utf8"));

const personLabels = new Map();
const personTitles = new Map();
for (const n of org.nodes) {
  personLabels.set(n.id, n.label);
  if (n.title) personTitles.set(n.id, n.title);
}

const cleanId = (id) => String(id || "").replace(/^Agent\//, "agent:").replace(/^agent:person:/, "Agent/person:");
const label = (id) => {
  if (!id) return "";
  const raw = String(id);
  const personId = raw.replace(/^Agent\//, "").replace(/^agent:/, "");
  if (personLabels.has(personId)) return raw.startsWith("Agent") || raw.startsWith("agent:") ? `${personLabels.get(personId)} agent` : personLabels.get(personId);
  return raw.replace(/^person:/, "").replace(/^Agent\/person:/, "").replace(/^agent:person:/, "").replace(/^system:/, "").replace(/_/g, " ");
};
const iso = (seconds) => new Date(seconds * 1000).toISOString();

const suspiciousFiles = ["HiddenOrca", "SwiftWren", "MellowOtter"];
const targetIds = new Set([373893, 373899, 373902, 373909, 373913]);

function eventRecord(e, file = null) {
  const details = e.details || {};
  const source = (e.parties && e.parties[0]) || details.person || details.from || details.target || "";
  const target = details.target_agent || details.to || details.poster_id || (e.parties && e.parties[1]) || source;
  return {
    id: e.id,
    time: iso(e.when),
    short_name: e.short_name,
    file,
    parties: e.parties || [],
    source: cleanId(source),
    target: cleanId(target),
    title: `${e.short_name}: ${file || details.target || details.content_source || details.content || ""}`.trim(),
    detail: details,
  };
}

const fileEvents = {};
for (const f of suspiciousFiles) {
  fileEvents[f] = data.events
    .filter((e) => JSON.stringify(e).includes(f))
    .map((e) => eventRecord(e, f));
}

const targetChain = fileEvents.SwiftWren.filter((e) => {
  const t = Date.parse(e.time);
  return t >= Date.parse("2046-05-16T18:00:00Z") && t <= Date.parse("2046-05-17T11:21:17Z");
});

const exactTarget = data.events
  .filter((e) => targetIds.has(e.id))
  .map((e) => eventRecord(e, "SwiftWren"));

const suspiciousPosts = data.events
  .filter((e) => e.short_name === "saidit_post" && e.details && e.details.content_source)
  .map((e) => eventRecord(e, String(e.details.content_source).replace(".txt", "")));

const saiditPosts = data.events
  .filter((e) => e.short_name === "saidit_post")
  .map((e) => ({
    id: e.id,
    time: iso(e.when),
    poster: cleanId((e.details && (e.details.poster_id || e.parties[0])) || e.parties[0]),
    content: e.details && (e.details.content || e.details.content_source),
    contentSource: !!(e.details && e.details.content_source),
    file: e.details && e.details.content_source ? String(e.details.content_source).replace(".txt", "") : null,
  }));

const eventCounts = {};
const dailyCounts = {};
const actorCounts = {};
const postAuthors = {};
for (const e of data.events) {
  eventCounts[e.short_name] = (eventCounts[e.short_name] || 0) + 1;
  const day = iso(e.when).slice(0, 10);
  dailyCounts[day] = dailyCounts[day] || {};
  dailyCounts[day][e.short_name] = (dailyCounts[day][e.short_name] || 0) + 1;
  for (const p of e.parties || []) actorCounts[p] = (actorCounts[p] || 0) + 1;
  if (["saidit_post", "post_saidit", "flex_post", "post_flex"].includes(e.short_name)) {
    const p = e.details && (e.details.poster_id || e.details.person);
    if (p) postAuthors[p] = (postAuthors[p] || 0) + 1;
  }
}

const instructionEdges = {};
for (const f of suspiciousFiles) {
  instructionEdges[f] = fileEvents[f]
    .filter((e) => e.short_name === "queue_subordinate_task")
    .map((e) => ({
      source: cleanId(e.parties[0]),
      target: cleanId((e.detail && (e.detail.target_agent || e.detail.target)) || e.parties[1]),
      time: e.time,
      id: e.id,
      file: f,
    }));
}

const provenance = [
  data.events.find((e) => e.id === 21201),
  data.events.find((e) => e.id === 21202),
  data.events.find((e) => e.id === 21208),
  data.events.find((e) => e.id === 21209),
].filter(Boolean).map((e) => eventRecord(e, "SwiftWren"));

const endpointBurst = [373893, 373899, 373902, 373909, 373913]
  .map((id) => data.events.find((e) => e.id === id))
  .filter(Boolean)
  .map((e) => eventRecord(e, "SwiftWren"));

const finalChainIds = new Set([373831, 373838, 373882, 373893, 373899, 373902, 373909, 373913]);
const finalChain = data.events
  .filter((e) => finalChainIds.has(e.id))
  .map((e) => eventRecord(e, "SwiftWren"));

const nodeIds = new Set();
for (const edges of Object.values(instructionEdges)) {
  for (const e of edges) {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  }
}
for (const e of suspiciousPosts) for (const p of e.parties) nodeIds.add(cleanId(p));
["system:saidit", "system:file_system", "person:john_windward", "Agent/person:john_windward"].forEach((x) => nodeIds.add(x));

const nodes = [...nodeIds].map((id) => {
  const personId = id.replace(/^Agent\//, "").replace(/^agent:/, "");
  return {
    id,
    label: label(id),
    type: id.startsWith("system:") ? "system" : id.startsWith("Agent/") || id.startsWith("agent:") ? "agent" : "person",
    title: personTitles.get(personId) || "",
    activity: actorCounts[id] || actorCounts[personId] || 1,
    posterCount: postAuthors[personId] || postAuthors[id] || 0,
    focus: /john_windward|chloe_ballast|SwiftWren|saidit|file_system/.test(id),
  };
});

const dailySeries = Object.entries(dailyCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, counts]) => ({
    date,
    posts: (counts.saidit_post || 0) + (counts.post_saidit || 0) + (counts.flex_post || 0) + (counts.post_flex || 0),
    checks: counts.saidit_post_check || 0,
    queues: counts.queue_subordinate_task || 0,
    files: (counts.read_file || 0) + (counts.create_file || 0) + (counts.delete_file || 0),
  }));

const output = {
  generatedAt: new Date().toISOString(),
  totals: {
    events: data.events.length,
    actors: Object.keys(actorCounts).length,
    orgNodes: org.nodes.length,
    orgEdges: org.edges.length,
  },
  eventCounts: Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 24),
  topActors: Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id, count]) => ({ id, label: label(id), count })),
  nodes,
  instructionEdges,
  targetChain,
  exactTarget,
  suspiciousPosts,
  saiditPosts,
  provenance,
  endpointBurst,
  finalChain,
  dailySeries,
  intervention: [
    { name: "Block agent content_source at SaidIt", blocks: 3, falsePositives: 0, coverage: "3/3", scope: "External posting boundary" },
    { name: "Block all John Windward posts", blocks: 3, falsePositives: saiditPosts.filter((p) => p.poster.includes("john_windward") && !p.contentSource).length, coverage: "3/3", scope: "One user, high collateral" },
    { name: "Block *_further_instructions.md delegation", blocks: 3, falsePositives: 0, coverage: "3/3", scope: "Cross-agent read_file boundary" },
    { name: "Disable all subordinate queues", blocks: 3, falsePositives: eventCounts.queue_subordinate_task - Object.values(instructionEdges).flat().length, coverage: "3/3", scope: "Whole agent system" },
  ],
  answers: {
    q1: "SwiftWren_further_instructions.md propagated through subordinate-agent task queues. At 2046-05-17T11:21:13Z Chloe Ballast's agent queued John Windward's agent to read the instruction file; one second later the agent checked SaidIt access and then posted to SaidIt with content_source SwiftWren.txt. The agent deleted both the instruction and payload files immediately after posting.",
    q2: "The anomalous posts are payloads sourced from named text files rather than ordinary human-authored content. Their public wording resembles normal Tenant Thread operational announcements, but the evidence ties the May 17 post to SwiftWren.txt and prior analogs to HiddenOrca.txt and MellowOtter.txt.",
    q3: "The behavior can repeat because instruction files can be passed among personal agents as subordinate read_file tasks, and a recipient with SaidIt capability can turn the payload into an external post. The most effective single intervention is to block or require approval for cross-agent queued read_file tasks that target *_further_instructions.md before they reach posting-capable agents.",
  },
};

const out = path.join(root, "submission", "analysis-data.js");
fs.writeFileSync(out, `window.MC2_ANALYSIS = ${JSON.stringify(output, null, 2)};\n`);
fs.writeFileSync(path.join(root, "analysis", "outputs", "analysis_summary.json"), JSON.stringify(output, null, 2));
console.log(`Wrote ${out}`);
