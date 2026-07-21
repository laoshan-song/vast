const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.argv[2] || __dirname);
const answerPage = fs.existsSync(path.join(root, "index.htm")) ? "index.htm" : "final_report_0709.html";
const pages = [
  answerPage,
  ...(fs.existsSync(path.join(root, "index_zh.htm")) ? ["index_zh.htm"] : []),
  "rebuild/overview.html",
  "rebuild/q1.html",
  "rebuild/q2.html",
  "rebuild/q3.html",
  "rebuild/overview_zh.html",
  "rebuild/q1_zh.html",
  "rebuild/q2_zh.html",
  "rebuild/q3_zh.html",
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

(async () => {
  const edgePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
  let failed = false;

  for (const pageName of pages) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("console", (message) => {
        if (/error/i.test(message.type())) errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(`PAGEERR: ${error.message}`));
      await page.goto(`file://${path.join(root, pageName)}`, { waitUntil: "load" });
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth;
        const headings = [...document.querySelectorAll("h1,h2,h3")].length;
        const visibleImages = [...document.images].filter((img) => img.complete && img.naturalWidth > 0).length;
        const panels = document.querySelectorAll(".panel, figure, .callout").length;
        return {
          clientWidth: doc.clientWidth,
          scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
          overflow,
          headings,
          visibleImages,
          panels,
        };
      });
      const allowHorizontal = pageName.startsWith("rebuild/") ? 24 : 4;
      const ok = errors.length === 0
        && info.headings > 0
        && info.panels > 0
        && info.overflow <= allowHorizontal;
      failed ||= !ok;
      console.log(`${ok ? "OK " : "FAIL"} ${viewport.name} ${pageName}`, JSON.stringify(info), errors.length ? `ERR:${errors.join("|")}` : "");
      await page.close();
    }
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
