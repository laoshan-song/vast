const path = require("path");
const pw = "/home/laoshansong/.npm/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(pw);

const pages = ["overview", "q1", "q2", "q3"];

(async () => {
  const browser = await chromium.launch({ headless: true });
  let bad = false;
  for (const name of pages) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = [];
    page.on("console", m => { if (/error/i.test(m.type())) errs.push(m.text()); });
    page.on("pageerror", e => errs.push("PAGEERR: " + e.message));
    await page.goto(`file://${path.resolve(__dirname, name + ".html")}`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40),
      svgs: document.querySelectorAll("svg").length,
      svgKids: [...document.querySelectorAll("svg")].reduce((s, x) => s + x.childElementCount, 0),
      nav: document.querySelector(".nav a.active")?.textContent?.trim(),
      panels: document.querySelectorAll(".panel").length,
    }));
    try { await page.screenshot({ path: path.join(__dirname, `shot-${name}.png`), fullPage: true }); }
    catch (e) { await page.screenshot({ path: path.join(__dirname, `shot-${name}.png`) }); }
    // q2 uses HTML flow diagrams (no SVG by design); others must render SVG
    const needsSvg = name !== "q2";
    const ok = errs.length === 0 && info.panels >= 3 && (!needsSvg || info.svgKids > 0);
    bad ||= !ok;
    console.log(`${ok ? "OK " : "FAIL"} ${name}`, JSON.stringify(info), errs.length ? "ERR:" + errs.join("|") : "");
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
