/* ---- Events: auto-hide once an event's END time has passed in America/New_York ---- */
const EVENT_TZ = "America/New_York";
const tzOffsetMs = (t: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: EVENT_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(t).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - t;
};
/** Wall-clock time in New York → epoch ms (DST-aware). */
const nyToEpoch = (y: number, mo: number, d: number, h: number, mi: number) => {
  const guess = Date.UTC(y, mo, d, h, mi);
  let t = guess - tzOffsetMs(guess);
  const off2 = tzOffsetMs(t);
  if (guess - off2 !== t) t = guess - off2;
  return t;
};
/** "8:00 PM" → minutes after midnight. */
const clockMinutes = (s: string) => {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (!m) throw new Error(`Unrecognized event time "${s}" (use e.g. "8:00 PM")`);
  return ((+m[1] % 12) + (m[3].toLowerCase() === "p" ? 12 : 0)) * 60 + +(m[2] ?? 0);
};
/** Epoch ms when an event ends. `date` is the calendar day (stored as UTC midnight); an end at or before the start runs past midnight. */
export const eventEndsAt = (e: { date: Date; start: string; end: string }) => {
  const endMin = clockMinutes(e.end);
  const nextDay = endMin <= clockMinutes(e.start) ? 1 : 0;
  return nyToEpoch(e.date.getUTCFullYear(), e.date.getUTCMonth(), e.date.getUTCDate() + nextDay, Math.floor(endMin / 60), endMin % 60);
};
/** Build-time "now". EVENTS_NOW (ISO string) overrides it for testing only. */
export const buildNow = () => (process.env.EVENTS_NOW ? Date.parse(process.env.EVENTS_NOW) : Date.now());
/** Published events whose end time hasn't passed at build time, soonest first. */
export const upcomingEvents = <T extends { data: { date: Date; start: string; end: string } }>(events: T[]) => {
  const now = buildNow();
  return events.filter((e) => eventEndsAt(e.data) > now).sort((a, b) => +a.data.date - +b.data.date);
};
