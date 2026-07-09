const fs = require("fs");
const path = require("path");

const playwrightRoot = "/home/laoshansong/.npm/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(playwrightRoot);

const pages = [
  ["submission", "VAST_Challenge_2026_MC2/submission/index.html"],
  ["q1", "VAST_Challenge_2026_MC2/q1/index.html"],
  ["q2", "VAST_Challenge_2026_MC2/q2/index.html"],
  ["q3", "VAST_Challenge_2026_MC2/q3/index.html"],
];

(async () => {
  const outDir = __dirname;
  const browser = await chromium.launch({ headless: true });
  let failed = false;

  for (const [name, rel] of pages) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const logs = [];
    page.on("console", msg => logs.push(`${msg.type()}: ${msg.text()}`));
    page.on("pageerror", err => logs.push(`pageerror: ${err.message}`));

    await page.goto(`file://${path.resolve(rel)}`, { waitUntil: "load" });
    await page.waitForTimeout(name === "q1" ? 1000 : 300);

    const info = await page.evaluate(() => {
      const board = document.querySelector(".board");
      const svg = document.querySelector(".board svg");
      const copy = document.querySelector("[data-step-copy], #modeNarrative");
      const boardRect = board ? board.getBoundingClientRect() : null;
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      return {
        title: document.title,
        h1: document.querySelector("h1")?.textContent || "",
        activeNav: document.querySelector(".nav a.active")?.textContent || "",
        stepButtons: document.querySelectorAll(".step-list button").length,
        copyText: copy?.textContent?.trim().slice(0, 120) || "",
        board: boardRect ? { w: Math.round(boardRect.width), h: Math.round(boardRect.height) } : null,
        svg: svgRect ? { w: Math.round(svgRect.width), h: Math.round(svgRect.height) } : null,
      };
    });

    const screenshot = path.join(outDir, `${name}.png`);
    let screenshotError = "";
    try {
      await page.screenshot({ path: screenshot, fullPage: false });
    } catch (err) {
      screenshotError = err.message;
    }
    const badLogs = logs.filter(line => /error|pageerror/i.test(line));
    const shouldHaveSixSteps = name !== "q1";
    const ok = !badLogs.length && info.board && info.svg && (!shouldHaveSixSteps || info.stepButtons === 6);
    failed ||= !ok;

    console.log(JSON.stringify({
      name,
      ok,
      info,
      badLogs,
      screenshotError,
      screenshot,
    }, null, 2));

    await page.close();
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
