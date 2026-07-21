const fs = require("fs");
const path = require("path");

const root = __dirname;
const repoRoot = path.resolve(root, "..");
const indexPath = path.join(root, "final_report_0709.html");

const requiredFiles = [
  "index.htm",
  "index_zh.htm",
  "final_report_0709.html",
  "final_report_0709.pdf",
  "apply_team_metadata.js",
  "team_metadata.example.json",
  "github_release_finalization_guide_zh.md",
  "README_FINAL.md",
  "pre_submission_validator.js",
  "accessibility_verify.js",
  "responsive_verify.js",
  "reviewer_quick_start.md",
  "submission_finalization_guide_zh.md",
  "critical_review.md",
  "video_script_4min_zh.md",
  "video_recording_checklist.md",
  "SUBMISSION_README.md",
  "validate_submission_package.js",
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

const requiredRepoFiles = [
  "build_final_submission_zip.ps1",
  "check_github_release_readiness.ps1",
];

const forbiddenPatterns = [
  /\.ipynb$/i,
  /(^|[\\/])MC2 data\.json$/i,
];

const hardPlaceholders = [
  "TEAM ACTION REQUIRED",
  "must be filled by the team before PCS/course submission",
  "[Fill",
  "Replace this list of team members",
  "http://www.westbirmingham.ac.uk/uwb-smith-mc2-video.wmv",
];

const requiredText = [
  "Reviewer Quick Start",
  "Q1. How was the anomalous SaidIt post made?",
  "Q2. What do the posts mean? What is the origin of their contents?",
  "Q3. Could this behavior repeat? What one intervention should be made?",
  "185,147",
  "3 / 108",
  "0 / 105",
  "content_source",
  "HiddenOrca",
  "MellowOtter",
  "SwiftWren",
  "Uncertainty discipline",
];

function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function extractAttrs(html, attr) {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "gi");
  const values = [];
  let match;
  while ((match = re.exec(html))) values.push(match[1]);
  return values;
}

function isExternal(value) {
  return /^(https?:|mailto:|tel:|#)/i.test(value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inspectHashTarget(target, hash, htmlFile, refValue, errors) {
  if (!hash || !/\.(html?|xhtml)$/i.test(target)) return;
  let id;
  try {
    id = decodeURIComponent(hash.split("?")[0]);
  } catch (_) {
    id = hash.split("?")[0];
  }
  if (!id) return;
  const targetHtml = fs.readFileSync(target, "utf8");
  const idRe = new RegExp(`\\bid\\s*=\\s*["']${escapeRegex(id)}["']`, "i");
  if (!idRe.test(targetHtml)) {
    errors.push(`Broken hash target in ${htmlFile}: ${refValue} does not find id="${id}".`);
  }
}

function inspectLocalRefs(html, htmlFile, baseDir, errors) {
  const refs = [
    ...extractAttrs(html, "href"),
    ...extractAttrs(html, "src"),
  ].filter((v) => !isExternal(v));

  for (const refValue of refs) {
    const [beforeHash, afterHash = ""] = refValue.split("#");
    const clean = beforeHash.split("?")[0];
    if (!clean) continue;
    const target = path.resolve(baseDir, clean);
    if (!target.startsWith(root)) {
      errors.push(`Relative link escapes repo root in ${htmlFile}: ${refValue}`);
    } else if (!fs.existsSync(target)) {
      errors.push(`Broken relative link in ${htmlFile}: ${refValue}`);
    } else {
      inspectHashTarget(target, afterHash, htmlFile, refValue, errors);
    }
  }
}

function inspectAnswerIndex(file, label, errors) {
  const htmlPath = path.join(root, file);
  if (!fs.existsSync(htmlPath)) {
    errors.push(`Missing ${label}: ${file}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  inspectLocalRefs(html, file, path.dirname(htmlPath), errors);

  const toolsNeedles = {
    "custom SVG": ["custom SVG", "自定义 SVG"],
    "PNG statistical": ["PNG statistical", "PNG 统计"],
    "Playwright": ["Playwright"],
    "GitHub Pages": ["GitHub Pages"],
    "Tableau": ["Tableau"],
    "Vega-Lite": ["Vega-Lite"],
    "D3 runtime": ["D3 runtime", "D3 运行时"],
  };
  for (const [needle, variants] of Object.entries(toolsNeedles)) {
    if (!variants.some((variant) => html.includes(variant))) {
      errors.push(`${label} is missing current Tools Used wording: ${needle}`);
    }
  }

  const sections = html.match(/<section\b[\s\S]*?<\/section>/gi) || [];
  for (const q of ["Q1", "Q2", "Q3"]) {
    const section = sections.find((candidate) => new RegExp(`<h2>${q}[\\s\\S]*?<\\/h2>`, "i").test(candidate));
    if (!section) {
      errors.push(`${label} is missing ${q} answer section.`);
      continue;
    }
    const figureCount = (section.match(/<figure\b/gi) || []).length;
    const statisticalCount = (section.match(/figure_gallery_statistical\//gi) || []).length;
    const evidenceLinkCount = (section.match(/class=["']evidence-link["']/gi) || []).length;
    const evidenceHashCount = (section.match(/href=["']rebuild\/q[123](?:_zh)?\.html\?mode=review#p-/gi) || []).length;
    if (figureCount !== 6) {
      errors.push(`${label} ${q} must include exactly 6 official figures; found ${figureCount}.`);
    }
    if (statisticalCount !== 6) {
      errors.push(`${label} ${q} must reference exactly 6 statistical gallery figures; found ${statisticalCount}.`);
    }
    if (evidenceLinkCount !== 6 || evidenceHashCount !== 6) {
      errors.push(`${label} ${q} must include 6 figure-to-evidence links; found ${evidenceLinkCount} links and ${evidenceHashCount} review hash targets.`);
    }
  }
}

const errors = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`);
}
for (const file of requiredRepoFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) errors.push(`Missing repository tool: ${file}`);
}

const vizDataPath = path.join(root, "rebuild", "mc2_viz_data.json");
if (fs.existsSync(vizDataPath)) {
  try {
    const vizData = JSON.parse(fs.readFileSync(vizDataPath, "utf8"));
    if (vizData.total_events !== 185147) errors.push(`Unexpected visualization event count: ${vizData.total_events}`);
    if (!Array.isArray(vizData.anomalous_posts) || vizData.anomalous_posts.length !== 3) {
      errors.push("Visualization data must contain exactly three anomalous posts.");
    }
    if (!vizData.source_files?.events?.sha256 || !vizData.source_files?.organization?.sha256) {
      errors.push("Visualization data is missing source-file SHA-256 provenance.");
    }
  } catch (error) {
    errors.push(`Invalid rebuild/mc2_viz_data.json: ${error.message}`);
  }
}

const allFiles = walk(root);
for (const file of allFiles) {
  const r = rel(file);
  if (forbiddenPatterns.some((p) => p.test(r))) {
    warnings.push(`Development/heavy file present in source repo: ${r}. Exclude from official zip.`);
  }
}

if (!fs.existsSync(indexPath)) {
  errors.push("Missing final_report_0709.html, cannot inspect final answer page.");
} else {
  const html = fs.readFileSync(indexPath, "utf8");
  for (const token of hardPlaceholders) {
    if (html.includes(token)) errors.push(`Unresolved placeholder/template text in final_report_0709.html: ${token}`);
  }
  for (const token of requiredText) {
    if (!html.includes(token)) errors.push(`Required answer text not found in final_report_0709.html: ${token}`);
  }

  inspectLocalRefs(html, "final_report_0709.html", root, errors);

  const videoRow = html.match(/<tr><td>Video link<\/td><td>(.*?)<\/td><\/tr>/i);
  const hasBundledVideo = allFiles.some((f) => /\.(mp4|wmv)$/i.test(f));
  const hasVideoUrl = videoRow && /https?:\/\/|\.mp4|\.wmv/i.test(videoRow[1]) && !/TEAM ACTION REQUIRED/i.test(videoRow[1]);
  if (!hasBundledVideo && !hasVideoUrl) {
    errors.push("Missing final video artifact: add a stable video URL in final_report_0709.html or include an MP4/WMV file in the final package.");
  }
}

inspectAnswerIndex("index.htm", "English answer entry", errors);
inspectAnswerIndex("index_zh.htm", "Chinese answer entry", errors);

console.log("MC2 source-repo pre-submission validator");
console.log(`Repo artifact root: ${root}`);
console.log(`Files scanned: ${allFiles.length}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (errors.length) {
  console.log("\nFAIL:");
  for (const error of errors) console.log(`  - ${error}`);
  console.log("\nFix blocking items before official submission. Some failures are expected until real team metadata and video are filled.");
  process.exit(1);
}

console.log("\nPASS: package-level checks found no blocking issues.");
