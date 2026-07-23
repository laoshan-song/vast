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

  const lightbox = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const lightboxErrors = [];
  lightbox.on("console", m => { if (/error/i.test(m.type())) lightboxErrors.push(m.text()); });
  lightbox.on("pageerror", e => lightboxErrors.push("PAGEERR: " + e.message));
  await lightbox.goto(`file://${path.resolve(__dirname, "q2.html")}?mode=review`, { waitUntil: "load" });
  await lightbox.waitForTimeout(500);
  await lightbox.locator(".eda-figure img").first().click();
  await lightbox.waitForTimeout(250);
  const lightboxOpen = await lightbox.evaluate(() => ({
    open: document.querySelector(".figure-lightbox")?.classList.contains("open"),
    visible: getComputedStyle(document.querySelector(".figure-lightbox")).display !== "none",
    hasImage: Boolean(document.querySelector(".figure-lightbox-stage img")?.getAttribute("src")),
    hasCaption: Boolean(document.querySelector(".figure-lightbox-caption")?.textContent?.trim()),
    closeText: document.querySelector(".figure-lightbox-close")?.textContent?.trim(),
  }));
  await lightbox.keyboard.press("Escape");
  await lightbox.waitForTimeout(250);
  const lightboxClosed = await lightbox.evaluate(() => ({
    open: document.querySelector(".figure-lightbox")?.classList.contains("open"),
    overflow: document.body.style.overflow,
  }));
  const lightboxOk = lightboxErrors.length === 0
    && lightboxOpen.open && lightboxOpen.visible && lightboxOpen.hasImage && lightboxOpen.hasCaption
    && lightboxOpen.closeText === "Close"
    && !lightboxClosed.open && lightboxClosed.overflow === "";
  bad ||= !lightboxOk;
  console.log(`${lightboxOk ? "OK " : "FAIL"} figure lightbox`, JSON.stringify({
    lightboxOpen, lightboxClosed,
  }), lightboxErrors.length ? "ERR:" + lightboxErrors.join("|") : "");
  await lightbox.close();

  const explorer = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const explorerErrors = [];
  explorer.on("console", m => { if (/error/i.test(m.type())) explorerErrors.push(m.text()); });
  explorer.on("pageerror", e => explorerErrors.push("PAGEERR: " + e.message));
  await explorer.goto(`file://${path.resolve(__dirname, "q3.html")}?mode=review`, { waitUntil: "load" });
  await explorer.waitForTimeout(500);
  const explorerInitial = await explorer.evaluate(() => ({
    controls: document.querySelectorAll(".figure-explorer").length,
    visibleFigures: [...document.querySelectorAll(".figure-grid .eda-figure")]
      .filter((fig) => !fig.hidden && getComputedStyle(fig).display !== "none").length,
    selected: document.querySelectorAll(".figure-grid .eda-figure.selected").length,
  }));
  await explorer.locator(".figure-explorer input").first().fill("gate");
  await explorer.waitForTimeout(150);
  const explorerFiltered = await explorer.evaluate(() => ({
    visibleFigures: [...document.querySelectorAll(".figure-grid .eda-figure")]
      .filter((fig) => !fig.hidden && getComputedStyle(fig).display !== "none").length,
    countText: document.querySelector(".figure-explorer-count")?.textContent?.trim(),
  }));
  await explorer.locator(".figure-explorer [data-action='next']").first().click();
  const explorerNext = await explorer.evaluate(() => ({
    selectedText: document.querySelector(".figure-grid .eda-figure.selected figcaption")?.textContent || "",
  }));
  await explorer.locator(".figure-explorer [data-action='all']").first().click();
  await explorer.waitForTimeout(150);
  const explorerReset = await explorer.evaluate(() => ({
    visibleFigures: [...document.querySelectorAll(".figure-grid .eda-figure")]
      .filter((fig) => !fig.hidden && getComputedStyle(fig).display !== "none").length,
    countText: document.querySelector(".figure-explorer-count")?.textContent?.trim(),
  }));
  const explorerOk = explorerErrors.length === 0
    && explorerInitial.controls >= 1 && explorerInitial.visibleFigures === 6 && explorerInitial.selected >= 1
    && explorerFiltered.visibleFigures > 0 && explorerFiltered.visibleFigures < 6
    && /gate/i.test(explorerNext.selectedText)
    && explorerReset.visibleFigures === 6;
  bad ||= !explorerOk;
  console.log(`${explorerOk ? "OK " : "FAIL"} figure explorer`, JSON.stringify({
    explorerInitial, explorerFiltered, explorerNext, explorerReset,
  }), explorerErrors.length ? "ERR:" + explorerErrors.join("|") : "");
  await explorer.close();

  const linkPages = ["q1.html", "q2.html", "q3.html", "q1_zh.html", "q2_zh.html", "q3_zh.html"];
  const linkResults = [];
  const figureLinkErrors = [];
  for (const linkPageName of linkPages) {
    const figureLink = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    figureLink.on("console", m => { if (/error/i.test(m.type())) figureLinkErrors.push(`${linkPageName}: ${m.text()}`); });
    figureLink.on("pageerror", e => figureLinkErrors.push(`${linkPageName}: PAGEERR: ${e.message}`));
    await figureLink.goto(`file://${path.resolve(__dirname, linkPageName)}?mode=review`, { waitUntil: "load" });
    await figureLink.waitForTimeout(850);
    const linkInitial = await figureLink.evaluate(() => ({
      lang: document.documentElement.lang,
      targetFigures: document.querySelectorAll(".eda-figure[data-target-panel]").length,
      jumpButtons: document.querySelectorAll(".eda-figure[data-target-panel] .figure-jump").length,
      firstTarget: document.querySelector(".eda-figure[data-target-panel]")?.dataset.targetPanel,
      firstText: document.querySelector(".eda-figure[data-target-panel] .figure-jump")?.textContent?.trim() || "",
    }));
    await figureLink.locator(".eda-figure[data-target-panel] .figure-jump").first().click();
    await figureLink.waitForTimeout(350);
    const linkAfter = await figureLink.evaluate(() => ({
      hash: location.hash,
      focused: document.querySelector(".panel.evidence-focus")?.id || "",
      mode: document.body.dataset.mode,
    }));
    linkResults.push({ page: linkPageName, linkInitial, linkAfter });
    await figureLink.close();
  }
  const figureLinkOk = figureLinkErrors.length === 0 && linkResults.every(({ page, linkInitial, linkAfter }) => {
    const shouldBeZh = /_zh\.html$/i.test(page);
    return linkInitial.targetFigures === 6
      && linkInitial.jumpButtons === 6
      && linkAfter.hash === `#${linkInitial.firstTarget}`
      && linkAfter.focused === linkInitial.firstTarget
      && linkAfter.mode === "review"
      && (shouldBeZh ? linkInitial.firstText === "查看对应证据视图" : linkInitial.firstText === "Open linked evidence view");
  });
  bad ||= !figureLinkOk;
  console.log(`${figureLinkOk ? "OK " : "FAIL"} figure evidence links`, JSON.stringify(linkResults),
    figureLinkErrors.length ? "ERR:" + figureLinkErrors.join("|") : "");

  const guide = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const guideErrors = [];
  guide.on("console", m => { if (/error/i.test(m.type())) guideErrors.push(m.text()); });
  guide.on("pageerror", e => guideErrors.push("PAGEERR: " + e.message));
  await guide.goto(`file://${path.resolve(__dirname, "q1.html")}?mode=review&incident=SwiftWren&walk=hop`, { waitUntil: "load" });
  await guide.waitForTimeout(500);
  const guideInitial = await guide.evaluate(() => ({
    panels: document.querySelectorAll(".guided-path").length,
    steps: document.querySelectorAll(".guided-steps button").length,
    activeText: document.querySelector(".guided-steps button.active")?.textContent?.trim() || "",
    mode: document.body.dataset.mode,
  }));
  await guide.locator(".guided-path [data-guide-next]").click();
  await guide.locator(".guided-path [data-guide-next]").click();
  await guide.locator(".guided-path [data-guide-next]").click();
  await guide.waitForTimeout(350);
  const guideAfter = await guide.evaluate(() => ({
    mode: document.body.dataset.mode,
    hash: location.hash,
    target: document.querySelector(".guided-target")?.id || "",
    contextCount: document.querySelectorAll(".guided-context").length,
    currentTitle: document.querySelector(".guided-current h3")?.textContent?.trim() || "",
  }));
  const guideOk = guideErrors.length === 0
    && guideInitial.panels === 1 && guideInitial.steps >= 5 && guideInitial.mode === "review"
    && guideAfter.mode === "explore" && guideAfter.hash === "#p-walk"
    && guideAfter.target === "p-walk" && guideAfter.contextCount > 0
    && /Trace task propagation/i.test(guideAfter.currentTitle);
  bad ||= !guideOk;
  console.log(`${guideOk ? "OK " : "FAIL"} guided analysis path`, JSON.stringify({
    guideInitial, guideAfter,
  }), guideErrors.length ? "ERR:" + guideErrors.join("|") : "");
  await guide.close();

  const zhLightbox = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const zhLightboxErrors = [];
  zhLightbox.on("console", m => { if (/error/i.test(m.type())) zhLightboxErrors.push(m.text()); });
  zhLightbox.on("pageerror", e => zhLightboxErrors.push("PAGEERR: " + e.message));
  await zhLightbox.goto(`file://${path.resolve(__dirname, "q2_zh.html")}?mode=review`, { waitUntil: "load" });
  await zhLightbox.waitForTimeout(500);
  await zhLightbox.locator(".eda-figure img").first().click();
  await zhLightbox.waitForTimeout(250);
  const zhLightboxOpen = await zhLightbox.evaluate(() => ({
    lang: document.documentElement.lang,
    open: document.querySelector(".figure-lightbox")?.classList.contains("open"),
    hasImage: Boolean(document.querySelector(".figure-lightbox-stage img")?.getAttribute("src")),
    hasCaption: Boolean(document.querySelector(".figure-lightbox-caption")?.textContent?.trim()),
    closeText: document.querySelector(".figure-lightbox-close")?.textContent?.trim(),
  }));
  await zhLightbox.keyboard.press("Escape");
  await zhLightbox.waitForTimeout(250);
  const zhLightboxClosed = await zhLightbox.evaluate(() => ({
    open: document.querySelector(".figure-lightbox")?.classList.contains("open"),
  }));
  const zhLightboxOk = zhLightboxErrors.length === 0
    && zhLightboxOpen.lang === "zh-CN" && zhLightboxOpen.open
    && zhLightboxOpen.hasImage && zhLightboxOpen.hasCaption
    && zhLightboxOpen.closeText === "关闭" && !zhLightboxClosed.open;
  bad ||= !zhLightboxOk;
  console.log(`${zhLightboxOk ? "OK " : "FAIL"} zh figure lightbox`, JSON.stringify({
    zhLightboxOpen, zhLightboxClosed,
  }), zhLightboxErrors.length ? "ERR:" + zhLightboxErrors.join("|") : "");
  await zhLightbox.close();

  await browser.close();
  process.exit(bad ? 1 : 0);
})();
