// @ts-check
import { defineConfig } from "astro/config";

// Concept preview hosted on GitHub Pages under /lachev208-demo.
// For a real launch at https://lachev208.com: set site to that origin, remove `base`,
// and drop the noindex meta + robots.txt Disallow (see README).
const BASE = "/lachev208-demo";
const r = (to) => `${BASE}${to}`;

export default defineConfig({
  site: "https://koffeekinggamer.github.io",
  base: BASE,
  trailingSlash: "ignore",
  build: { format: "directory", inlineStylesheets: "always" },
  image: { responsiveStyles: false },
  redirects: {
    "/-food-menu": r("/summerville-la-chev-208-food-menu"),
    "/food-menu": r("/summerville-la-chev-208-food-menu"),
    "/menu": r("/summerville-la-chev-208-food-menu"),
    "/-drink-menu": r("/summerville-la-chev-208-drink-menu"),
    "/drink-menu": r("/summerville-la-chev-208-drink-menu"),
    "/-events": r("/summerville-la-chev-208-events"),
    "/events": r("/summerville-la-chev-208-events"),
    "/specials": r("/summerville-la-chev-208-events#specials"),
    "/-specials": r("/summerville-la-chev-208-events#specials"),
    "/summerville-la-chev-208-happy-hours-specials": r("/summerville-la-chev-208-events#specials"),
    "/-party": r("/summerville-la-chev-208-party"),
    "/party": r("/summerville-la-chev-208-party"),
    "/catering": r("/summerville-la-chev-208-party#catering"),
    "/-catering": r("/summerville-la-chev-208-party#catering"),
    "/summerville-la-chev-208-catering": r("/summerville-la-chev-208-party#catering"),
    "/accessibility": r("/accessibility-page-01"),
    "/about": r("/#about"),
    "/reservations": r("/#reserve"),
    "/summerville-la-chev-208-reservations": r("/#reserve"),
    "/gift-cards": "https://www.toasttab.com/la-chev-208-208-e-1st-n-st/giftcards",
    "/jobs": "https://tmt.spotapps.co/job-listings?spot_id=406693",
  },
});
