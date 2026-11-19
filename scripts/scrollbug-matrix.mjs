import { chromium, webkit } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2] || "/workspace/lachev208-demo/screens/scrollbug";
const url = (process.argv[3] || "http://127.0.0.1:4323/lachev208-demo/").replace(/\/?$/, "/");
const shotPrefix = process.argv[4] || "local-after";
const saveReloadShots = process.argv.includes("--reload-shots");
mkdirSync(out, { recursive: true });
const widths = [
  { w: 390, h: 844, mobile: true },
  { w: 820, h: 1180, mobile: false },
  { w: 1440, h: 900, mobile: false },
  { w: 1920, h: 1080, mobile: false },
];
const engines = { chromium, webkit };
const macUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

async function measure(page) {
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    hash: location.hash,
    restoration: history.scrollRestoration,
    heroTop: document.querySelector(".hero")?.getBoundingClientRect().top ?? null,
    aboutTop: document.querySelector("#about")?.getBoundingClientRect().top ?? null,
    visitTop: document.querySelector("#visit")?.getBoundingClientRect().top ?? null,
    active: document.activeElement ? `${document.activeElement.tagName}#${document.activeElement.id}` : null,
  }));
}

const results = [];
let failures = 0;
for (const [name, browserType] of Object.entries(engines)) {
  const browser = await browserType.launch({ headless: true, args: name === "chromium" ? ["--no-sandbox"] : [] });
  for (const { w, h, mobile } of widths) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? undefined : macUA,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    const load0 = await measure(page);
    if (shotPrefix) await page.screenshot({ path: `${out}/${shotPrefix}-${name}-${w}${shotPrefix === "after" ? "" : "-load"}.png` });
    await page.waitForTimeout(3000);
    const load3 = await measure(page);
    await page.reload({ waitUntil: "load", timeout: 60000 });
    const reload0 = await measure(page);
    if (saveReloadShots) await page.screenshot({ path: `${out}/${shotPrefix}-${name}-${w}-reload.png` });
    await page.waitForTimeout(3000);
    const reload3 = await measure(page);

    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.8)));
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: "load", timeout: 60000 });
    const midReload0 = await measure(page);
    await page.waitForTimeout(3000);
    const midReload3 = await measure(page);

    // hash should still land on the section, not the top
    await page.goto(url + "#about", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(400);
    const hashed = await measure(page);

    const points = { load0, load3, reload0, reload3, midReload0, midReload3 };
    const bad = Object.entries(points).filter(([, m]) => m.scrollY !== 0);
    const hashOk = hashed.aboutTop != null && hashed.aboutTop < (h * 0.5) && hashed.scrollY > 0;
    if (bad.length || !hashOk) failures++;
    const row = { engine: name, width: w, points: Object.fromEntries(Object.entries(points).map(([k,v]) => [k, v.scrollY])), restoration: load0.restoration, hashAbout: { scrollY: hashed.scrollY, aboutTop: hashed.aboutTop, ok: hashOk } };
    results.push(row);
    console.log(JSON.stringify(row));
    await ctx.close();
  }
  await browser.close();
}
writeFileSync(`${out}/${shotPrefix}-metrics.json`, JSON.stringify(results, null, 2));
if (failures) {
  console.error(`FAIL ${failures} cases`);
  process.exit(1);
}
console.log("PASS all scrollY=0; hash #about still works");
