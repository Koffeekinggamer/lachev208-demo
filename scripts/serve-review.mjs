// Serve a built dir under the site base path for local review.
// Usage: node scripts/serve-review.mjs [dir=dist-mobile-polish] [port=4330]  ->  http://127.0.0.1:4330/lachev208-demo/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
const dir = resolve(process.argv[2] ?? "dist-mobile-polish");
const port = Number(process.argv[3] ?? 4330);
const BASE = "/lachev208-demo";
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain", ".mp4": "video/mp4", ".ico": "image/x-icon", ".xml": "application/xml" };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(302, { Location: BASE + "/" }); return res.end(); }
  p = p.slice(BASE.length) || "/";
  let f = join(dir, p);
  if (!f.startsWith(dir)) { res.writeHead(403); return res.end(); }
  try { if ((await stat(f)).isDirectory()) f = join(f, "index.html"); } catch { /* fall through */ }
  try {
    const body = await readFile(f);
    res.writeHead(200, { "Content-Type": types[extname(f)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Serving ${dir} at http://127.0.0.1:${port}${BASE}/`));
