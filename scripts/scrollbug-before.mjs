import { chromium, webkit } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const out = "/workspace/lachev208-demo/screens/scrollbug";
mkdirSync(out, { recursive: true });
const url = "https://koffeekinggamer.github.io/lachev208-demo/";
const widths = [
  { w: 390, h: 844, mobile: true },
  { w: 820, h: 1180, mobile: false },
  { w: 1440, h: 900, mobile: false },
  { w: 1920, h: 1080, mobile: false },
];
const engines = { chromium, webkit };

async function measure(page, label) {
  const data = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    pageYOffset: window.pageYOffset,
    docScrollTop: document.documentElement.scrollTop,
    bodyScrollTop: document.body.scrollTop,
    hash: location.hash,
    href: location.href,
    active: document.activeElement ? `${document.activeElement.tagName}#${document.activeElement.id}.${document.activeElement.className}` : null,
    heroH: document.querySelector(".hero")?.getBoundingClientRect().height ?? null,
    heroTop: document.querySelector(".hero")?.getBoundingClientRect().top ?? null,
    mainTop: document.querySelector("#main")?.getBoundingClientRect().top ?? null,
    scrollH: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    restoration: history.scrollRestoration,
    hasFailsafe: document.documentElement.classList.contains("reveal-failsafe"),
  }));
  return { label, ...data };
}

const results = [];
for (const [name, browserType] of Object.entries(engines)) {
  const browser = await browserType.launch({ headless: true, args: name === "chromium" ? ["--no-sandbox"] : [] });
  for (const { w, h, mobile } of widths) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      // Mac-like UA for the laptop sizes
      userAgent: mobile
        ? undefined
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    const load0 = await measure(page, "load+0s");
    await page.screenshot({ path: `${out}/before-${name}-${w}-load.png` });
    await page.waitForTimeout(2500);
    const load3 = await measure(page, "load+2.5s");
    // reload
    await page.reload({ waitUntil: "load", timeout: 60000 });
    const reload0 = await measure(page, "reload+0s");
    await page.screenshot({ path: `${out}/before-${name}-${w}-reload.png` });
    await page.waitForTimeout(2500);
    const reload3 = await measure(page, "reload+2.5s");

    // diagnostic: scroll mid-page then reload (browser restoration)
    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.8)));
    await page.waitForTimeout(300);
    const mid = await measure(page, "scrolled");
    await page.reload({ waitUntil: "load", timeout: 60000 });
    const midReload0 = await measure(page, "scroll-reload+0s");
    await page.waitForTimeout(2500);
    const midReload3 = await measure(page, "scroll-reload+2.5s");

    results.push({ engine: name, width: w, height: h, load0, load3, reload0, reload3, mid, midReload0, midReload3 });
    console.log(JSON.stringify({
      engine: name, w,
      load: [load0.scrollY, load3.scrollY],
      reload: [reload0.scrollY, reload3.scrollY],
      afterScrollReload: [midReload0.scrollY, midReload3.scrollY],
      hash: load0.hash, active: load0.active, heroTop: load0.heroTop, restoration: load0.restoration,
    }));
    await ctx.close();
  }
  await browser.close();
}
writeFileSync(`${out}/before-metrics.json`, JSON.stringify(results, null, 2));
console.log("wrote", `${out}/before-metrics.json`);
