// One-time importer: turns Daedra's menu-items.csv export into the JSON
// files under src/content/menus/ that the site and Decap CMS read.
// Usage: npm run menu:import -- /path/to/menu-items.csv
// After launch, staff edit menus in /admin; do not re-run over their edits.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const csvPath = process.argv[2] ?? "/workspace/lachev208-review/raw/menu-items.csv";
const outDir = new URL("../src/content/menus/", import.meta.url);
mkdirSync(outDir, { recursive: true });

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; if (row.some((f) => f !== "")) rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// "$12.00/6oz  $18.00/9oz  $48.00/BTL" -> [{amount:"12", unit:"6oz"}, ...]
function parsePrices(raw) {
  return [...raw.matchAll(/\$\s*([\d.,]+)\s*(?:\/\s*([^$]+?))?\s*(?=\$|$)/g)].map((m) => ({
    amount: m[1].replace(/\.00$/, ""),
    unit: (m[2] ?? "").trim(),
  }));
}

const tidy = (s) => s.replace(/\s*[❘|]\s*/g, " · ").replace(/\s{2,}/g, " ").trim();
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Section notes that live in the live menu HTML but not in the CSV.
const sectionNotes = {
  "Lunch/Soups & Salads": "Half and half available.",
  "Lunch/Handhelds": "Served with choice of side.",
};
const advisory =
  "Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.";

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const menus = new Map();
for (const r of rows) {
  const key = `${r.page}/${r.meal_or_category}`;
  if (!menus.has(key)) {
    menus.set(key, {
      page: r.page === "food-menu" ? "food" : "drink",
      title: ({ NA: "Zero proof", Coffee: "Coffee & tea" })[r.meal_or_category] ?? r.meal_or_category,
      order: menus.size + 1,
      note: r.page === "food-menu" ? `*${advisory}` : "",
      sections: [],
    });
  }
  const menu = menus.get(key);
  let section = menu.sections.find((s) => s.title === r.section);
  if (!section) {
    section = { title: r.section, note: sectionNotes[`${r.meal_or_category}/${r.section}`] ?? "", items: [] };
    menu.sections.push(section);
  }
  section.items.push({
    name: tidy(r.name),
    description: tidy(r.description),
    prices: parsePrices(r.price),
  });
}

let total = 0;
for (const [key, menu] of menus) {
  const file = `${menu.page}-${slug(menu.title)}.json`;
  menu.sections.forEach((s) => (total += s.items.length));
  writeFileSync(new URL(file, outDir), JSON.stringify(menu, null, 2) + "\n");
  console.log(`${file}: ${menu.sections.reduce((n, s) => n + s.items.length, 0)} items`);
}
console.log(`total ${total} items from ${rows.length} rows`);
