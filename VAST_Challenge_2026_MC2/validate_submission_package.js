const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const allowDraft = args.includes("--allow-draft");
const targetArg = args.find((arg) => arg !== "--allow-draft");
const root = path.resolve(targetArg || path.join(__dirname, "..", "final_submission"));

const requiredFiles = [
  "index.htm",
  "README.md",
  "rebuild/index.html",
  "rebuild/overview.html",
  "rebuild/q1.html",
  "rebuild/q2.html",
  "rebuild/q3.html",
  "rebuild/mc2_viz_data.js",
  "rebuild/mc2_viz_data.json",
  "rebuild/assets/app.css",
  "rebuild/assets/app.js",
  "rebuild/assets/overview.js",
  "rebuild/assets/q1.js",
  "rebuild/assets/q2.js",
  "rebuild/assets/q3.js",
  "rebuild/shot-overview.png",
  "rebuild/shot-q1.png",
  "rebuild/shot-q2.png",
  "rebuild/shot-q3.png",
];

const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function isExternal(value) {
  return /^(https?:|mailto:|tel:|#|data:)/i.test(value);
}

function checkHtml(file) {
  const html = fs.readFileSync(file, "utf8");
  const attrPattern = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    const value = match[1];
    if (isExternal(value)) continue;
    const clean = value.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    const fromRoot = path.relative(root, target);
    if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
      errors.push(`${relative(file)} link escapes package root: ${value}`);
    } else if (!fs.existsSync(target)) {
      errors.push(`${relative(file)} has broken link: ${value}`);
    }
  }
}

if (!fs.existsSync(root)) errors.push(`Package directory does not exist: ${root}`);
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`);
}

const files = walk(root);
for (const file of files) {
  const rel = relative(file);
  const name = path.basename(file).toLowerCase();
  const ext = path.extname(file).toLowerCase();
  if (name === "mc2 data.json" || name === "team_metadata.json") {
    errors.push(`Private or raw file included: ${rel}`);
  }
  if ([".ipynb", ".py", ".ps1"].includes(ext)) {
    errors.push(`Development source included: ${rel}`);
  }
  if (/q and a\.md$/i.test(rel)) errors.push(`Exploratory notes included: ${rel}`);
  if (/\.html?$/i.test(file)) checkHtml(file);
}

const indexPath = path.join(root, "index.htm");
if (fs.existsSync(indexPath)) {
  const index = fs.readFileSync(indexPath, "utf8");
  const placeholders = ["TEAM ACTION REQUIRED", "must be filled by the team before PCS/course submission"];
  const found = placeholders.filter((token) => index.includes(token));
  if (found.length && !allowDraft) {
    errors.push(`Unresolved final-answer placeholders: ${found.join(", ")}`);
  } else if (found.length) {
    warnings.push(`Draft placeholders retained: ${found.join(", ")}`);
  }
  const videoFiles = files.filter((file) => /\.(mp4|wmv)$/i.test(file));
  const videoRow = index.match(/<tr><td>Video link<\/td><td>(.*?)<\/td><\/tr>/i);
  const hasVideoUrl = videoRow && /https?:\/\/|\.mp4|\.wmv/i.test(videoRow[1])
    && !/TEAM ACTION REQUIRED/i.test(videoRow[1]);
  if (!hasVideoUrl && videoFiles.length === 0 && !allowDraft) errors.push("Missing final video URL or bundled video.");
  if (!hasVideoUrl && videoFiles.length === 0 && allowDraft) warnings.push("Draft package has no final video.");
}

const dataPath = path.join(root, "rebuild", "mc2_viz_data.json");
if (fs.existsSync(dataPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (data.total_events !== 185147) errors.push(`Unexpected total_events: ${data.total_events}`);
    if (!Array.isArray(data.anomalous_posts) || data.anomalous_posts.length !== 3) {
      errors.push("Visualization data must contain exactly three known anomalous posts.");
    }
    if (!data.source_files?.events?.sha256 || !data.source_files?.organization?.sha256) {
      errors.push("Visualization data is missing source-file SHA-256 provenance.");
    }
  } catch (error) {
    errors.push(`Invalid rebuild/mc2_viz_data.json: ${error.message}`);
  }
}

console.log("MC2 assembled-package validator");
console.log(`Package root: ${root}`);
console.log(`Files scanned: ${files.length}`);
for (const warning of warnings) console.log(`WARNING: ${warning}`);

if (errors.length) {
  console.log("\nFAIL:");
  for (const error of errors) console.log(`  - ${error}`);
  process.exit(1);
}

console.log(`\nPASS: ${allowDraft ? "draft" : "official"} package structure and links are valid.`);
