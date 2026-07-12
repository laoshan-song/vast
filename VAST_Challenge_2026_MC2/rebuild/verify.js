const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");

const pages = ["overview", "q1", "q2", "q3"];

(async () => {
  const edgePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
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

  const interaction = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const interactionErrors = [];
  interaction.on("console", m => { if (/error/i.test(m.type())) interactionErrors.push(m.text()); });
  interaction.on("pageerror", e => interactionErrors.push("PAGEERR: " + e.message));
  await interaction.goto(`file://${path.resolve(__dirname, "q1.html")}?mode=review&incident=SwiftWren&walk=hop`, { waitUntil: "load" });
  await interaction.waitForTimeout(500);

  const reviewState = await interaction.evaluate(() => ({
    mode: document.body.dataset.mode,
    hiddenExplore: [...document.querySelectorAll(".explore-only")]
      .every((node) => getComputedStyle(node).display === "none"),
  }));
  await interaction.click('[data-view-mode="explore"]');
  await interaction.click('#incsel button[data-c="MellowOtter"]');
  await interaction.click("#walk-time");
  await interaction.locator("#walk text.clickable-mark").first().click();
  const q1State = await interaction.evaluate(() => MC2.state());
  await interaction.click('a[data-page="q2.html"]');
  await interaction.waitForTimeout(500);
  const q2State = await interaction.evaluate(() => ({
    state: MC2.state(),
    mode: document.body.dataset.mode,
    selectedIncident: document.querySelector("#strength button.active")?.dataset.c,
  }));
  await interaction.click("[data-reset-view]");
  const resetState = await interaction.evaluate(() => ({
    state: MC2.state(),
    mode: document.body.dataset.mode,
    hiddenExplore: [...document.querySelectorAll(".explore-only")]
      .every((node) => getComputedStyle(node).display === "none"),
  }));
  await interaction.goto(`file://${path.resolve(__dirname, "overview.html")}?mode=review`, { waitUntil: "load" });
  await interaction.waitForTimeout(500);
  await interaction.locator(".panel.core .tooltip-mark").first().click();
  const pinned = await interaction.locator(".tooltip.pinned").evaluate((node) => getComputedStyle(node).opacity === "1");
  await interaction.keyboard.press("Escape");
  await interaction.waitForTimeout(250);
  const escaped = await interaction.locator(".tooltip").evaluate((node) => getComputedStyle(node).opacity === "0");

  const interactionOk = interactionErrors.length === 0
    && reviewState.mode === "review" && reviewState.hiddenExplore
    && q1State.mode === "explore" && q1State.incident === "MellowOtter"
    && q1State.walk === "time" && Boolean(q1State.agent)
    && q2State.mode === "explore" && q2State.state.incident === "MellowOtter"
    && q2State.state.walk === "time" && q2State.state.agent === q1State.agent
    && q2State.selectedIncident === "MellowOtter"
    && resetState.mode === "review" && resetState.hiddenExplore
    && resetState.state.incident === "SwiftWren" && resetState.state.walk === "hop" && !resetState.state.agent
    && pinned && escaped;
  bad ||= !interactionOk;
  console.log(`${interactionOk ? "OK " : "FAIL"} linked interactions`, JSON.stringify({
    reviewState, q1State, q2State, resetState, pinned, escaped,
  }), interactionErrors.length ? "ERR:" + interactionErrors.join("|") : "");
  await interaction.close();

  await browser.close();
  process.exit(bad ? 1 : 0);
})();
