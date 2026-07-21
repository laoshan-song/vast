const fs = require("fs");
const path = require("path");

const root = __dirname;
const metadataPath = path.resolve(root, process.argv[2] || "team_metadata.json");
const htmlPath = path.join(root, "final_report_0709.html");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function requireString(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) fail(`${label} is empty.`);
  if (/TEAM ACTION REQUIRED|TODO|TBD|REPLACE_ME|待定/i.test(trimmed)) {
    fail(`${label} still looks like a placeholder.`);
  }
  return trimmed;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceRow(html, label, value) {
  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<tr><td>${safeLabel}<\\/td><td>[\\s\\S]*?<\\/td><\\/tr>`);
  if (!re.test(html)) fail(`Could not find table row: ${label}`);
  return html.replace(re, `<tr><td>${label}</td><td>${value}</td></tr>`);
}

function replaceStatus(html) {
  const re = /<div class="todo"><b>Final-submission status:<\/b>[\s\S]*?<\/div>/;
  if (!re.test(html)) fail("Could not find final-submission status box.");
  const replacement = '<div class="todo"><b>Final-submission status:</b> team metadata and video information have been filled from team-provided values. Run <code>node pre_submission_validator.js</code> on the final package before upload.</div>';
  return html.replace(re, replacement);
}

if (!fs.existsSync(metadataPath)) {
  fail(`Missing ${metadataPath}. Create team_metadata.json first.`);
}
if (!fs.existsSync(htmlPath)) {
  fail(`Missing ${htmlPath}.`);
}

let metadata;
try {
  metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
} catch (error) {
  fail(`Invalid JSON in ${metadataPath}: ${error.message}`);
}

const entryName = requireString(metadata.entry_name, "entry_name");
const totalHours = requireString(String(metadata.total_hours ?? ""), "total_hours");
if (!/^\d+(\.\d+)?$/.test(totalHours) || Number(totalHours) <= 0) {
  fail("total_hours must be a positive number.");
}

const publicPermission = requireString(metadata.public_repository_permission, "public_repository_permission").toUpperCase();
if (!["YES", "NO"].includes(publicPermission)) {
  fail("public_repository_permission must be YES or NO.");
}

const studentTeam = requireString(metadata.student_team || "YES", "student_team").toUpperCase();
if (!["YES", "NO"].includes(studentTeam)) {
  fail("student_team must be YES or NO.");
}

const toolsUsed = requireString(
  metadata.tools_used || "Python data extraction from MC2 data.json and org_chart.json; HTML/CSS/vanilla JavaScript with custom SVG; PNG statistical EDA figure generation; Playwright/Microsoft Edge screenshot and interaction verification; Git/GitHub Pages. The final rebuild does not require Tableau, Vega-Lite, or a D3 runtime.",
  "tools_used"
);

if (!Array.isArray(metadata.team_members) || metadata.team_members.length === 0) {
  fail("team_members must be a non-empty array.");
}

const primaryMembers = metadata.team_members.filter((member) => member && member.primary_contact === true);
if (primaryMembers.length !== 1) {
  fail("Exactly one team member must have primary_contact: true.");
}

const membersHtml = metadata.team_members.map((member, index) => {
  const name = requireString(member.name, `team_members[${index}].name`);
  const affiliation = requireString(member.affiliation, `team_members[${index}].affiliation`);
  const email = requireString(member.email, `team_members[${index}].email`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`team_members[${index}].email does not look like an email address.`);
  }
  const primary = member.primary_contact === true ? " <b>(primary contact)</b>" : "";
  return `${escapeHtml(name)}, ${escapeHtml(affiliation)}, ${escapeHtml(email)}${primary}`;
}).join("; ");

let videoValue = "";
if (metadata.video_link) {
  videoValue = requireString(metadata.video_link, "video_link");
  if (!/^https?:\/\//i.test(videoValue) && !/\.(mp4|wmv)$/i.test(videoValue)) {
    fail("video_link must be an http(s) URL or an MP4/WMV filename.");
  }
} else if (metadata.video_file) {
  videoValue = requireString(metadata.video_file, "video_file");
  if (!/\.(mp4|wmv)$/i.test(videoValue)) {
    fail("video_file must end with .mp4 or .wmv.");
  }
  if (!fs.existsSync(path.join(root, videoValue))) {
    fail(`video_file was specified but not found in this directory: ${videoValue}`);
  }
} else {
  fail("Provide either video_link or video_file.");
}

let html = fs.readFileSync(htmlPath, "utf8");
html = replaceRow(html, "Entry name", escapeHtml(entryName));
html = replaceRow(html, "Team members", membersHtml);
html = replaceRow(html, "Student team", escapeHtml(studentTeam));
html = replaceRow(html, "Tools used", escapeHtml(toolsUsed));
html = replaceRow(html, "Total hours", escapeHtml(totalHours));
html = replaceRow(html, "Video link", escapeHtml(videoValue));
html = replaceRow(html, "Public repository permission", escapeHtml(publicPermission));
html = replaceStatus(html);

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`Updated ${htmlPath}`);
console.log("Next: run node pre_submission_validator.js");
