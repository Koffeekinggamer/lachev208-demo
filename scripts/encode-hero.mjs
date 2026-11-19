import sharp from "sharp";
import { writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const dir = "/workspace/lachev208-demo/src/assets/hero-enhanced";
// Committed masters only (high-quality 4:4:4 JPG), so a re-encode reproduces the shipped derivatives.
const masters = Object.fromEntries(
  ["house-and-patio", "patio-table", "kitchen-team-wide"].map((n) => [n, path.join(dir, `${n}.jpg`)]),
);
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
const only = process.argv.slice(2);
for (const [name, src] of Object.entries(masters)) {
  if (only.length && !only.includes(name)) continue;
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
    if (w === 1640) writeFileSync(path.join(dir, `${name}-1640.jpg`), await sharp(src).resize({ width: 1640, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
    const row = { name, w, avifQ, avifKB: +(avifBuf.length/1024).toFixed(1), webpQ, webpKB: +(webpBuf.length/1024).toFixed(1) };
    report.push(row);
    console.log(row);
  }
}
writeFileSync(path.join(os.tmpdir(), "encode-report.json"), JSON.stringify(report, null, 2));
console.log("done");
