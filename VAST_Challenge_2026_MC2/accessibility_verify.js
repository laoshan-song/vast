const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.argv[2] || __dirname);
const answerPage = fs.existsSync(path.join(root, "index.htm")) ? "index.htm" : "final_report_0709.html";
const pages = [
  answerPage,
  "rebuild/overview.html",
  "rebuild/q1.html",
  "rebuild/q2.html",
  "rebuild/q3.html",
];

(async () => {
  const edgePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
  let failed = false;

  for (const pageName of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const runtimeErrors = [];
    page.on("console", (message) => {
      if (/error/i.test(message.type())) runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(`PAGEERR: ${error.message}`));

    await page.goto(`file://${path.join(root, pageName)}`, { waitUntil: "load" });
    await page.waitForTimeout(700);

    const info = await page.evaluate(() => {
      const text = (node) => (node.textContent || "").trim();
      const imageIssues = [...document.images]
        .filter((img) => !img.hasAttribute("alt"))
        .map((img) => img.getAttribute("src") || "(inline image)");
      const svgIssues = [...document.querySelectorAll("svg")]
        .filter((svg) => !svg.getAttribute("aria-label") && !svg.querySelector("title"))
        .map((svg) => svg.id || "(unnamed svg)");
      const clickableIssues = [...document.querySelectorAll(".clickable-mark")]
        .filter((node) => node.getAttribute("tabindex") !== "0"
          || node.getAttribute("role") !== "button"
          || !node.getAttribute("aria-label"))
        .map((node) => node.getAttribute("aria-label") || node.id || node.tagName);
      const buttonIssues = [...document.querySelectorAll("button")]
        .filter((button) => !text(button) && !button.getAttribute("aria-label"))
        .map((button) => button.id || button.className || "(button)");
      return {
        images: document.images.length,
        svgs: document.querySelectorAll("svg").length,
        clickableMarks: document.querySelectorAll(".clickable-mark").length,
        buttons: document.querySelectorAll("button").length,
        imageIssues,
        svgIssues,
        clickableIssues,
        buttonIssues,
      };
    });

    const issues = [
      ...runtimeErrors.map((x) => `runtime: ${x}`),
      ...info.imageIssues.map((x) => `image missing alt: ${x}`),
      ...info.svgIssues.map((x) => `svg missing accessible name: ${x}`),
      ...info.clickableIssues.map((x) => `clickable mark missing keyboard/ARIA support: ${x}`),
      ...info.buttonIssues.map((x) => `button missing accessible name: ${x}`),
    ];
    const ok = issues.length === 0;
    failed ||= !ok;
    console.log(`${ok ? "OK " : "FAIL"} ${pageName}`, JSON.stringify({
      images: info.images,
      svgs: info.svgs,
      clickableMarks: info.clickableMarks,
      buttons: info.buttons,
    }), issues.length ? `ISSUES: ${issues.join(" | ")}` : "");
    await page.close();
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
