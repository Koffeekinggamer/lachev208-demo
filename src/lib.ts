import site from "./data/site.json";
export { site };
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Prefix an internal path with the deploy base (/lachev208-demo on the preview, "" at launch). */
export const url = (path = "/") => `${base}${path.startsWith("/") ? path : `/${path}`}`;
export const pages = {
  home: "/",
  food: "/summerville-la-chev-208-food-menu",
  drink: "/summerville-la-chev-208-drink-menu",
  events: "/summerville-la-chev-208-events",
  party: "/summerville-la-chev-208-party",
  accessibility: "/accessibility-page-01",
} as const;
export const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unitLabel: Record<string, string> = { BTL: "Bottle", btl: "Bottle", Cup: "Cup", Bowl: "Bowl" };
export const fmtUnit = (u: string) => unitLabel[u] ?? u.replace(/^(\d+)\s*oz$/i, "$1 oz");
export const fmtAmount = (a: string) => `$${a}`;
