// Usage: node scripts/shots390.mjs <baseUrl> <outDir> <prefix>
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const base = process.argv[2].replace(/\/$/, ""); const out = process.argv[3]; const prefix = process.argv[4];
mkdirSync(out, { recursive: true });
const pages = { home: "/", food: "/summerville-la-chev-208-food-menu/", drink: "/summerville-la-chev-208-drink-menu/", events: "/summerville-la-chev-208-events/", party: "/summerville-la-chev-208-party/", accessibility: "/accessibility-page-01/" };
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const [n, p] of Object.entries(pages)) {
  const page = await ctx.newPage();
  await page.goto(base + p + (base.includes("github.io") ? `?v=${Date.now()}` : ""), { waitUntil: "load" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${prefix}-${n}-390.png` });
  await page.close();
}
await b.close();
