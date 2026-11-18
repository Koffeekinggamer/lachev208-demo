// millerbilt-style motion: scroll reveal, gentle parallax, progress line.
// No libraries. Everything is skipped or flattened under prefers-reduced-motion.

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
{
  const id = location.hash ? location.hash.slice(1) : "";
  let hasTarget = false;
  if (id) {
    try { hasTarget = Boolean(document.getElementById(decodeURIComponent(id))); } catch { hasTarget = false; }
  }
  if (!hasTarget) scrollTo(0, 0);
}

const root = document.documentElement;
const reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduce = reduceQ.matches;

/* Mobile nav */
const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const nav = document.querySelector<HTMLElement>("#site-nav");
const desktopQ = window.matchMedia("(min-width: 1024px)");
const siteHeader = document.querySelector<HTMLElement>(".site-header");
/* Below 1024px the nav is a full-height sheet, so expose it as a modal dialog; on desktop it is plain navigation. */
const syncNavRole = () => {
  if (!nav) return;
  if (desktopQ.matches) { nav.removeAttribute("role"); nav.removeAttribute("aria-modal"); nav.setAttribute("aria-label", "Main"); }
  else { nav.setAttribute("role", "dialog"); nav.setAttribute("aria-modal", "true"); nav.setAttribute("aria-label", "Menu"); }
};
syncNavRole();
const menuOpen = () => toggle?.getAttribute("aria-expanded") === "true";
const setMenu = (open: boolean) => {
  if (!toggle || !nav) return;
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  root.classList.toggle("menu-open", open);
  // While the sheet is open, the page behind it is inert (no tab stops, no taps). Header + nav stay live.
  document.querySelectorAll<HTMLElement>("main, .site-footer, .actionbar, .skip").forEach((el) => { if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
  if (open) nav.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
};
desktopQ.addEventListener("change", (e) => { syncNavRole(); if (e.matches) setMenu(false); });
toggle?.addEventListener("click", () => setMenu(!menuOpen()));
nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => !desktopQ.matches && setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (!menuOpen() || desktopQ.matches) return;
  if (e.key === "Escape") { setMenu(false); toggle?.focus(); return; }
  if (e.key !== "Tab" || !siteHeader) return;
  // Trap Tab inside header + nav: logo, (Reserve at tablet width), toggle, nav links.
  const stops = Array.from(siteHeader.querySelectorAll<HTMLElement>("a[href], button")).filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
  if (!stops.length) return;
  const first = stops[0], last = stops[stops.length - 1], active = document.activeElement as HTMLElement | null;
  if (!active || !siteHeader.contains(active)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
});
document.addEventListener("click", (e) => {
  if (!toggle || !nav || !menuOpen()) return;
  const t = e.target as Node;
  if (!nav.contains(t) && !toggle.contains(t)) setMenu(false);
});

/* In-page anchors: JS smooth scroll (not CSS), auto under reduced motion */
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest?.("a");
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const href = a.getAttribute("href") || "";
  if (!href.startsWith("#") || href.length < 2) return;
  const el = document.getElementById(decodeURIComponent(href.slice(1)));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.pushState(null, "", href);
});

/* Open / closed status line (America/New_York). Static text is the no-JS fallback. */
const HOURS: Record<number, [number, number]> = { 0: [600, 1260], 1: [660, 1320], 2: [660, 1320], 3: [660, 1320], 4: [660, 1320], 5: [660, 1380], 6: [660, 1380] };
const clock = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "a.m." : "p.m."}`; };
function paintStatus() {
  const els = document.querySelectorAll<HTMLElement>("[data-open-status]");
  if (!els.length) return;
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
    .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const now = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  const [open, close] = HOURS[day];
  let isOpen = false, text: string;
  if (now >= open && now < close) { isOpen = true; text = close - now <= 60 ? `Open now · closes at ${clock(close)}` : `Open now · until ${clock(close)}`; }
  else if (now < open) text = `Closed · opens today at ${clock(open)}`;
  else { const next = (day + 1) % 7; text = `Closed · opens tomorrow at ${clock(HOURS[next][0])}`; }
  els.forEach((el) => { el.classList.toggle("is-open", isOpen); const t = el.querySelector(".status__text"); if (t) t.textContent = text; });
}
const whenIdle = (fn: () => void) => {
  const run = () => ("requestIdleCallback" in window ? (window as any).requestIdleCallback(fn, { timeout: 800 }) : setTimeout(fn, 200));
  if (document.readyState === "complete") run(); else addEventListener("load", run, { once: true });
};
whenIdle(() => { paintStatus(); setInterval(paintStatus, 60000); });

/* Header state */
const header = document.querySelector(".site-header");

/* Reveal: in-view items appear immediately; nothing stays hidden if IO is late */
const revealables = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-group]"));
document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((list) => {
  const step = Number(list.dataset.stagger) || 70;
  Array.from(list.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--d", `${Math.min(i, 6) * step}ms`));
});
const revealInView = () => {
  const h = window.innerHeight;
  revealables.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < h && r.bottom > 0) el.classList.add("is-in");
  });
};
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io!.unobserve(en.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
  : null;
revealables.forEach((el) => (io ? io.observe(el) : el.classList.add("is-in")));
revealInView();
requestAnimationFrame(() => requestAnimationFrame(revealInView));
// Safety net: anything on screen that IO missed is revealed (with its normal transition).
// Off-screen sections keep waiting for their scroll reveal; only a missing IntersectionObserver reveals everything.
if (!io) root.classList.add("reveal-failsafe");
setTimeout(revealInView, 1500);

/* Parallax paint: writes CSS variables only */
const media = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
const heroCopy = document.querySelector<HTMLElement>(".hero__copy");
const progress = document.querySelector<HTMLElement>(".progress");
let ticking = false;
const speed = () => (window.innerWidth >= 1040 ? 0.11 : window.innerWidth >= 760 ? 0.07 : 0.045);
const cap = () => (window.innerWidth >= 1040 ? 34 : window.innerWidth >= 760 ? 20 : 12);
function paint() {
  ticking = false;
  header?.classList.toggle("is-scrolled", scrollY > 8);
  revealInView();
  if (reduce) return;
  const max = document.documentElement.scrollHeight - innerHeight;
  progress?.style.setProperty("--scroll-p", String(max > 0 ? Math.min(1, scrollY / max) : 0));
  const vh = innerHeight, s = speed(), c = cap();
  for (const el of media) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) continue;
    const d = (r.top + r.height / 2 - vh / 2) * s;
    el.style.setProperty("--py", `${Math.max(-c, Math.min(c, -d)).toFixed(1)}px`);
  }
  if (heroCopy) {
    const amp = innerWidth >= 1040 ? 16 : 6;
    heroCopy.style.setProperty("--copy-y", `${(Math.min(1, scrollY / vh) * amp).toFixed(1)}px`);
  }
}
const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
// Parallax / progress / header state start after load so they never compete with the first paint.
whenIdle(() => {
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  paint();
});

/* Hero stills: Ken Burns is CSS; additional slides load after `load` and crossfade */
/* Hero rotation. WCAG 2.2.2: a visible pause/play button, plus automatic pause while the pointer is over the
   hero (hover devices) or keyboard focus is inside it. Reduced motion never starts rotation or shows the button. */
const heroSection = document.querySelector<HTMLElement>(".hero:not(.page-hero)");
const pauseBtn = document.querySelector<HTMLButtonElement>("[data-hero-pause]");
let heroStarted = false;
let userPaused = false;
let hoverPaused = false;
let focusPaused = false;
let heroTimer: number | undefined;
let heroIndex = 0;
const heroSlides = () => Array.from(document.querySelectorAll<HTMLElement>("[data-hero-slides] .hero__slide"));
const heroPaused = () => userPaused || hoverPaused || focusPaused;

function heroAdvance() {
  const s = heroSlides();
  if (s.length < 2) return;
  // Outgoing slide stays fully opaque underneath while the next one fades in on top (no dip to the background).
  const out = s[heroIndex];
  out.classList.remove("is-current");
  out.classList.add("is-leaving");
  out.setAttribute("aria-hidden", "true");
  setTimeout(() => out.classList.remove("is-leaving"), 1800);
  heroIndex = (heroIndex + 1) % s.length;
  s[heroIndex].classList.add("is-current");
  s[heroIndex].removeAttribute("aria-hidden");
}

function heroSchedule() {
  window.clearTimeout(heroTimer);
  heroTimer = undefined;
  if (!heroStarted || reduce || heroPaused()) return;
  // ~6.5 s per slide, slow 1.6 s crossfade (CSS). A hidden tab skips its turn; resuming restarts the full dwell.
  heroTimer = window.setTimeout(() => {
    if (!reduce && !document.hidden && !heroPaused()) heroAdvance();
    heroSchedule();
  }, 6500);
}

function heroSync() {
  heroSection?.classList.toggle("is-paused", heroPaused());
  heroSchedule();
}

function setPauseLabel() {
  if (!pauseBtn) return;
  pauseBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
  pauseBtn.dataset.state = userPaused ? "paused" : "playing";
}

function startHeroSlides() {
  const rootSlides = document.querySelector("[data-hero-slides]");
  const tpl = document.querySelector<HTMLTemplateElement>("template[data-hero-more]");
  if (!rootSlides || reduce || heroStarted) return;
  if (tpl?.content) rootSlides.append(tpl.content.cloneNode(true));
  if (heroSlides().length < 2) return;
  // Only the visible slide is announced to screen readers; the rest are hidden until their turn.
  heroSlides().forEach((el) => { if (!el.classList.contains("is-current")) el.setAttribute("aria-hidden", "true"); });
  heroIndex = 0;
  heroStarted = true;
  if (pauseBtn) { pauseBtn.hidden = false; setPauseLabel(); }
  heroSync();
}

function stopHeroSlides() {
  heroStarted = false;
  window.clearTimeout(heroTimer);
  heroTimer = undefined;
  heroSection?.classList.remove("is-paused");
  if (pauseBtn) pauseBtn.hidden = true;
}

pauseBtn?.addEventListener("click", () => {
  userPaused = !userPaused;
  setPauseLabel();
  heroSync();
});
if (heroSection) {
  const canHover = matchMedia("(hover: hover) and (pointer: fine)");
  heroSection.addEventListener("mouseover", (e) => {
    if (!canHover.matches) return;
    // The button itself is the user's control, so pointing at it must not read as "pause for hover".
    hoverPaused = !(e.target as Element).closest("[data-hero-pause]");
    heroSync();
  });
  heroSection.addEventListener("mouseleave", () => { hoverPaused = false; heroSync(); });
  heroSection.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement;
    focusPaused = !t.closest("[data-hero-pause]") && t.matches(":focus-visible");
    heroSync();
  });
  heroSection.addEventListener("focusout", () => { focusPaused = false; heroSync(); });
}
document.addEventListener("visibilitychange", heroSync);
addEventListener("load", () => startHeroSlides(), { once: true });

/* Drink/food sticky nav: fade + arrow when more items are off to the right */
function hintMenuNav() {
  const scroller = document.querySelector<HTMLElement>(".menu-nav ul");
  const wrap = scroller?.closest(".wrap") ?? scroller?.parentElement;
  if (!scroller || !wrap) return;
  const update = () => {
    const can = scroller.scrollWidth > scroller.clientWidth + 2;
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
    wrap.classList.toggle("has-more", can && !atEnd);
  };
  scroller.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
}
hintMenuNav();

/* Active section in the sticky menu nav */
const menuLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".menu-nav a"));
if (menuLinks.length && "IntersectionObserver" in window) {
  const map = new Map(menuLinks.map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) {
      menuLinks.forEach((l) => l.classList.remove("is-active"));
      map.get(en.target.id)?.classList.add("is-active");
    }
  }, { rootMargin: "-30% 0px -60% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}

/* Reduced-motion switch mid-session */
reduceQ.addEventListener("change", (e) => {
  reduce = e.matches;
  root.classList.toggle("reduce-motion", reduce);
  if (reduce) {
    revealables.forEach((el) => el.classList.add("is-in"));
    media.forEach((el) => el.style.removeProperty("--py"));
    heroCopy?.style.removeProperty("--copy-y");
    stopHeroSlides();
    document.querySelectorAll(".hero__slide:not(.is-current)").forEach((el) => el.remove());
  } else { request(); startHeroSlides(); }
});
