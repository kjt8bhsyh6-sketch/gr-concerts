// Public read-only events feed: GET /api/public/events (for Bill's "Local event planner" iPhone app).
// Same data visitors already see (concerts.js, sports.js, seasonal.js, venues.js), upcoming only, no user/profile data.
import { parseArr, isoDet } from "./alerts.js";

const HDR = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
const TTL = 600;

// venues.js: one `"Name": "street, City, MI zip",` per line. Parsed without eval.
function parseVenues(src) {
  const out = {}, re = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  for (const line of src.split("\n")) { const m = re.exec(line); if (m) out[m[1].replace(/\\(.)/g, "$1")] = m[2].replace(/\\(.)/g, "$1"); }
  return out;
}
const cityOf = (venues, v) => { const m = /,\s*([^,]+?),\s*MI\b/.exec(venues[v] || ""); return m ? m[1].trim() : null; };

// America/Detroit UTC offset ("-05:00" / "-04:00") at a local date+time.
function offset(date, h, mi) {
  const guess = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h + 5, mi));
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess).map(x => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const off = Math.round((local - guess.getTime()) / 6e4), a = Math.abs(off);
  return (off < 0 ? "-" : "+") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
}
// "7:30 PM" -> start time; "Doors 7:00 PM, show 8:00 PM" -> show time; no clock time -> all-day (local midnight).
function iso(date, timeText) {
  const t = String(timeText || ""), m = /show\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t) || /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t);
  const h = m ? (+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0) : 0, mi = m ? +m[2] : 0;
  return { start: `${date}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00${offset(date, h, mi)}`, allDay: !m };
}
async function hashId(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function buildEvents(src, now = new Date()) {
  const today = isoDet(now), venues = parseVenues(src.venues), out = [];
  for (const e of parseArr(src.concerts, "CONCERTS")) {
    if (!e.date || e.date < today) continue;
    const t = iso(e.date, e.time);
    out.push({ kind: "concert", title: e.artist, ...t, venue: e.venue, city: cityOf(venues, e.venue), url: e.affiliate || e.link || null, category: e.genre || "Concert", timeText: e.time || null });
  }
  for (const g of parseArr(src.sports, "GAMES")) {
    if (!g.date || g.date < today) continue;
    const t = iso(g.date, g.time);
    out.push({ kind: "sports", title: `${g.team} vs. ${g.opponent}`, ...t, venue: g.venue, city: cityOf(venues, g.venue), url: g.link || null, category: "Sports", timeText: g.time || null });
  }
  for (const z of parseArr(src.seasonal, "SEASONAL")) {
    if (!z.sort || (z.end || z.sort) < today) continue;
    const ev = { kind: "seasonal", title: z.name, start: iso(z.sort, "").start, allDay: true, venue: z.location, city: cityOf(venues, z.location), url: z.link || null, category: "Seasonal", timeText: z.when || null };
    if (z.end && z.end !== z.sort) ev.end = iso(z.end, "").start.replace("T00:00:00", "T23:59:59");
    out.push(ev);
  }
  for (const e of out) { e.id = await hashId([e.kind, e.title, e.start, e.venue].join("|")); delete e.kind; }
  out.sort((a, b) => a.start.slice(0, 10) < b.start.slice(0, 10) ? -1 : a.start.slice(0, 10) > b.start.slice(0, 10) ? 1 : a.start < b.start ? -1 : a.start > b.start ? 1 : a.title < b.title ? -1 : 1);
  return out.map(({ id, title, start, end, allDay, venue, city, url, category, timeText }) => ({ id, title, start, ...(end ? { end } : {}), allDay, venue, city, url, category, timeText }));
}

export async function publicEvents(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HDR });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...HDR, Allow: "GET, OPTIONS", "Content-Type": "application/json" } });
  const cache = caches.default, key = new Request(new URL(req.url).origin + "/api/public/events", { method: "GET" });
  let res = await cache.match(key);
  if (!res) {
    const base = env.SITE_URL, get = async f => { const r = await fetch(base + f, { cf: { cacheTtl: 60 } }); if (!r.ok) throw new Error(f + " " + r.status); return r.text(); };
    let body;
    try {
      const [concerts, sports, seasonal, venues] = await Promise.all(["concerts.js", "sports.js", "seasonal.js", "venues.js"].map(get));
      body = JSON.stringify(await buildEvents({ concerts, sports, seasonal, venues }));
    } catch (e) {
      return new Response(JSON.stringify({ error: "Events temporarily unavailable" }), { status: 502, headers: { ...HDR, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    res = new Response(body, { headers: { ...HDR, "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${TTL}`, "X-Content-Type-Options": "nosniff" } });
    await cache.put(key, res.clone());
  }
  res = new Response(res.body, res); res.headers.set("Cache-Control", `public, max-age=${TTL}`); // cache hits come back with the zone browser TTL; restore ours
  return req.method === "HEAD" ? new Response(null, { status: res.status, headers: res.headers }) : res;
}
