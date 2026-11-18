// Astro's static redirect pages ship with robots "noindex" only.
// Preview policy is noindex,nofollow — match the canonical pages.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Optional first argument: output dir (default ./dist).
const dist = process.argv[2] ? new URL(process.argv[2].replace(/\/?$/, ""), `file://${process.cwd()}/`).pathname : new URL("../dist", import.meta.url).pathname;
const files = [];
async function walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) await walk(p);
    else if (ent.name === "index.html") files.push(p);
  }
}
await walk(dist);
let n = 0;
for (const f of files) {
  let html = await readFile(f, "utf8");
  if (!html.includes('http-equiv="refresh"') && !html.includes("http-equiv='refresh'")) continue;
  const next = html.replace(/content="noindex"/g, 'content="noindex, nofollow"').replace(/content='noindex'/g, "content='noindex, nofollow'");
  if (next !== html) {
    await writeFile(f, next);
    n++;
  }
}
console.log(`Patched ${n} alias page(s) to noindex,nofollow`);
