// Layout QA + screenshots. Usage: node scripts/qa.mjs <baseUrl> <outDir> [--shots-only]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://127.0.0.1:4321/lachev208-demo").replace(/\/$/, "");
const out = process.argv[3] ?? "screens";
const shotsOnly = process.argv.includes("--shots-only");
mkdirSync(out, { recursive: true });
const pages = {
  home: "/",
  food: "/summerville-la-chev-208-food-menu/",
  drink: "/summerville-la-chev-208-drink-menu/",
  events: "/summerville-la-chev-208-events/",
  party: "/summerville-la-chev-208-party/",
  accessibility: "/accessibility-page-01/",
};
const widths = shotsOnly ? [390, 820, 1440] : [360, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const shotWidths = new Set([390, 820, 1440]);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const report = [];
const links = new Set();

for (const w of widths) {
  const touch = w <= 1024;
  const ctx = await browser.newContext({
    viewport: { width: w, height: w <= 430 ? 844 : w <= 1024 ? 1180 : 900 },
    deviceScaleFactor: 1, hasTouch: touch, isMobile: w <= 430,
  });
  for (const [name, path] of Object.entries(pages)) {
    const page = await ctx.newPage();
    const res = await page.goto(base + path, { waitUntil: "networkidle" });
    const status = res?.status();
    // scroll through to fire reveals + lazy images, then reveal everything for stable shots
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      scrollTo(0, 0);
      document.querySelectorAll("[data-reveal],[data-reveal-group]").forEach((e) => e.classList.add("is-in"));
      document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    });
    await page.waitForTimeout(1300);
    const r = await page.evaluate(({ w, touch }) => {
      const vw = document.documentElement.clientWidth;
      const issues = [];
      if (document.documentElement.scrollWidth > vw + 1) {
        const off = [...document.querySelectorAll("body *")].filter((e) => {
          const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          return b.width && b.right > vw + 1 && cs.position !== "fixed" && !e.closest(".menu-nav ul") && !e.closest("[aria-hidden=true]");
        }).slice(0, 5).map((e) => e.className || e.tagName);
        issues.push(`overflow ${document.documentElement.scrollWidth}>${vw}: ${off.join(", ")}`);
      }
      const visible = (e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !e.closest(".nav:not(.is-open)") || (e.closest(".nav") && getComputedStyle(e.closest(".nav")).visibility !== "hidden" && b.width > 0); };
      if (touch) {
        for (const e of document.querySelectorAll("a, button")) {
          if (!visible(e) || e.classList.contains("skip")) continue;
          const inline = e.closest("p, address, li.special, .menu-item__desc") && getComputedStyle(e).display === "inline";
          const b = e.getBoundingClientRect();
          if ((b.width < 44 || b.height < 44) && !inline) issues.push(`tap ${Math.round(b.width)}x${Math.round(b.height)} "${(e.textContent || "").trim().slice(0, 30)}"`);
        }
      }
      if (w <= 430) {
        for (const e of document.querySelectorAll("main p, main li, main dd, main dt, main address")) {
          if (!visible(e)) continue;
          const fs = parseFloat(getComputedStyle(e).fontSize);
          if (fs < 16 && (e.textContent || "").trim().length > 40) { issues.push(`small text ${fs}px "${e.textContent.trim().slice(0, 30)}"`); }
        }
      }
      for (const e of document.querySelectorAll("h1, h2, h3, p, a, span, dt, dd, li")) {
        const cs = getComputedStyle(e);
        if (e.closest(".sr-only")) continue;
        if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && e.scrollWidth > e.clientWidth + 1) issues.push(`clipped "${(e.textContent || "").trim().slice(0, 30)}"`);
        const b = e.getBoundingClientRect();
        if (b.width && (b.left < -1 || b.right > vw + 1) && !e.closest(".menu-nav") && !e.closest("[aria-hidden=true]") && getComputedStyle(e).position !== "fixed" && !e.closest(".nav:not(.is-open)") && !e.classList.contains("sr-only") && !e.closest(".sr-only")) issues.push(`offscreen "${(e.textContent || "").trim().slice(0, 30)}"`);
      }
      for (const g of document.querySelectorAll(".grid, .gallery, .visit, .footer-grid")) {
        const kids = [...g.children].filter((k) => getComputedStyle(k).display !== "none");
        const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length;
        const spanned = kids.some((k) => getComputedStyle(k).gridColumnStart === "1" && getComputedStyle(k).gridColumnEnd === "-1");
        if (cols > 1 && kids.length % cols !== 0 && !spanned) issues.push(`orphan: ${g.className} ${kids.length} items in ${cols} cols`);
      }
      const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.href);
      return { issues: [...new Set(issues)], hrefs };
    }, { w, touch });
    r.hrefs.forEach((h) => links.add(h.split("#")[0] + (h.includes("#") ? "#" + h.split("#")[1] : "")));
    if (status !== 200) r.issues.unshift(`status ${status}`);
    report.push({ w, name, status, issues: r.issues });
    if (shotWidths.has(w)) {
      await page.screenshot({ path: `${out}/${name}-${w}-fold.png` });
      await page.screenshot({ path: `${out}/${name}-${w}-full.png`, fullPage: true });
    }
    await page.close();
  }
  await ctx.close();
}

// link check (internal only, plus anchor targets)
const linkResults = [];
const ctx = await browser.newContext();
const origin = new URL(base).origin;
for (const h of links) {
  if (!h.startsWith(origin)) continue;
  const [u, hash] = h.split("#");
  const resp = await ctx.request.get(u);
  let anchorOk = true;
  if (hash) {
    const html = await resp.text();
    anchorOk = html.includes(`id="${hash}"`);
  }
  if (resp.status() !== 200 || !anchorOk) linkResults.push({ h, status: resp.status(), anchorOk });
}
const external = [...links].filter((h) => !h.startsWith(origin) && h.startsWith("http"));
await browser.close();
const summary = { base, checked: report.length, withIssues: report.filter((r) => r.issues.length), brokenInternal: linkResults, internalLinks: [...links].filter((h) => h.startsWith(origin)).length, external: [...new Set(external)] };
writeFileSync(`${out}/qa-report.json`, JSON.stringify({ summary, report }, null, 2));
console.log(JSON.stringify(summary, null, 2));
