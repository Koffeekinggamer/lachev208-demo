import sharp from "sharp";
import { writeFileSync } from "node:fs";
import path from "node:path";

const dir = "/workspace/lachev208-demo/src/assets/hero-enhanced";
const masters = {
  "house-and-patio": "/tmp/hero-work/house-and-patio.master.png",
  "patio-table": "/tmp/hero-work/patio-table.master.png",
  "kitchen-team-wide": "/tmp/hero-work/kitchen-team-wide.master.png",
};
const targetWidths = {
  "house-and-patio": [780, 1640, 2880, 3840],
  "patio-table": [780, 1640, 2880, 3200],
  "kitchen-team-wide": [780, 1640, 2880, 3840],
};

async function encodeAvif(input, width, quality) {
  return sharp(input).rotate().resize({ width, withoutEnlargement: true }).avif({ quality, effort: 6, chromaSubsampling: "4:2:0" }).toBuffer();
}
async function encodeWebp(input, width, quality) {
  return sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer();
}

const report = [];
for (const [name, src] of Object.entries(masters)) {
  const meta = await sharp(src).metadata();
  for (const w of targetWidths[name]) {
    if (w > meta.width) continue;
    // For 780 (mobile LCP), search the highest quality that stays <= 120 KB
    let avifQ, avifBuf;
    if (w === 780) {
      avifQ = 52;
      avifBuf = await encodeAvif(src, w, avifQ);
      while (avifBuf.length > 120 * 1024 && avifQ > 32) {
        avifQ -= 2;
        avifBuf = await encodeAvif(src, w, avifQ);
      }
      // if lots of headroom, bump quality back up
      if (avifBuf.length < 90 * 1024 && avifQ < 56) {
        const trial = avifQ + 2;
        const buf = await encodeAvif(src, w, trial);
        if (buf.length <= 120 * 1024) { avifQ = trial; avifBuf = buf; }
      }
    } else {
      avifQ = 50;
      avifBuf = await encodeAvif(src, w, avifQ);
      // keep large files reasonable (under ~280KB for mid, ~400KB for huge)
      const cap = w >= 2880 ? 420 * 1024 : 280 * 1024;
      while (avifBuf.length > cap && avifQ > 36) {
        avifQ -= 2;
        avifBuf = await encodeAvif(src, w, avifQ);
      }
    }
    const webpQ = Math.min(avifQ + 8, 68);
    const webpBuf = await encodeWebp(src, w, webpQ);
    const avifPath = path.join(dir, `${name}-${w}.avif`);
    const webpPath = path.join(dir, `${name}-${w}.webp`);
    writeFileSync(avifPath, avifBuf);
    writeFileSync(webpPath, webpBuf);
    const row = { name, w, avifQ, avifKB: +(avifBuf.length/1024).toFixed(1), webpQ, webpKB: +(webpBuf.length/1024).toFixed(1) };
    report.push(row);
    console.log(row);
  }
}
writeFileSync("/tmp/hero-work/encode-report.json", JSON.stringify(report, null, 2));
console.log("done");
