// POST /submit-event — private pending queue. Nothing here publishes a listing or notifies anyone.
// The Worker entrypoint strips a leading /api prefix before this runs.
import { VENUE_KEYS } from "./venue-keys.js";

export const GENRES = ["Rock", "Jazz", "Blues", "Hip-Hop", "Country", "Folk", "Electronic", "Classical", "Comedy", "Open Mic", "Other"];
export const SUBMIT_ORIGINS = [
  "https://grhappenings.com",
  "https://www.grhappenings.com",
  "https://kjt8bhsyh6-sketch.github.io",
];
const ORIGIN_OK = new Set(SUBMIT_ORIGINS);
const RATE_MAX = 5;
const RATE_WIN = 3600;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const clip = (v, max) => (typeof v === "string" ? v.trim().slice(0, max + 1) : "");
const tooLong = (v, max) => v.length > max;

export function detroitISO(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(date).map(p => [p.type, p.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const off = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(parts.timeZoneName || "");
  if (!off || !hour) throw new Error("Could not format America/Detroit time");
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${off[1]}${off[2].padStart(2, "0")}:${(off[3] || "00").padStart(2, "0")}`;
}

function lookupVenue(name) {
  if (VENUE_KEYS.includes(name)) return name;
  const lower = name.toLowerCase();
  return VENUE_KEYS.find(k => k.toLowerCase() === lower) || "";
}

export function normalizeVenue(venue, venueOther) {
  const raw = clip(venue, 160);
  if (tooLong(raw, 160)) return { error: "Venue name is too long." };
  if (raw === "__other__" || raw.toLowerCase() === "other / new venue") {
    const name = clip(venueOther, 160).replace(/\s+/g, " ");
    if (!name) return { error: "Enter the venue name." };
    if (tooLong(name, 160)) return { error: "Venue name is too long." };
    const canon = lookupVenue(name);
    return canon ? { venue: canon, venueIsNew: false } : { venue: name, venueIsNew: true };
  }
  const canon = lookupVenue(raw);
  if (!canon) return { error: "Choose a venue from the list, or Other / new venue." };
  return { venue: canon, venueIsNew: false };
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function validHttpUrl(s) {
  if (typeof s !== "string" || s.length < 8 || s.length > 2000) return false;
  let u;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (!u.hostname || u.username || u.password) return false;
  return true;
}

const validEmail = e => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function validate(b) {
  if (!b || typeof b !== "object") return { error: "Submission could not be read." };
  const event = clip(b.event, 120);
  if (!event) return { error: "Enter the name of the show." };
  if (tooLong(event, 120)) return { error: "Event name is too long." };
  const venue = normalizeVenue(b.venue, b.venueOther);
  if (venue.error) return venue;
  const date = clip(b.date, 10);
  if (!validDate(date)) return { error: "Enter the date of the show." };
  const time = clip(b.time, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: "Enter the start time." };
  const source = typeof b.source === "string" ? b.source.trim() : "";
  if (!source) return { error: "Add a link to the venue or promoter page that lists this show." };
  if (!validHttpUrl(source)) return { error: "Enter a full link that starts with http:// or https://." };
  const genre = clip(b.genre, 40);
  if (!GENRES.includes(genre)) return { error: "Choose a genre." };
  const priceType = b.priceType === "paid" ? "paid" : (b.priceType === "free" ? "free" : "");
  if (!priceType) return { error: "Choose free or ticketed." };
  const price = priceType === "paid" ? clip(b.price, 80) : "";
  if (tooLong(price, 80)) return { error: "Price is too long." };
  const name = clip(b.name, 80);
  if (!name) return { error: "Enter your name." };
  if (tooLong(name, 80)) return { error: "Name is too long." };
  const email = clip(b.email, 254);
  if (!validEmail(email)) return { error: "Enter a valid email (for example name@example.com)." };
  const token = typeof b.turnstileToken === "string" ? b.turnstileToken.trim() : "";
  if (!token || token.length > 2048) return { error: "The spam check didn't finish. Try it again." };
  return { event, venue: venue.venue, venueIsNew: venue.venueIsNew, date, time, source, genre, priceType, price, name, email, token };
}

function corsHeaders(origin) {
  if (!ORIGIN_OK.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(headers, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(headers || {}),
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Fixed window, 5 accepted submissions per hashed IP per hour. The key and value hold no raw IP.
async function rateLimit(kv, hash, nowSec) {
  const key = "rl:submit:" + hash;
  let v = null;
  try { v = JSON.parse((await kv.get(key)) || "null"); } catch { v = null; }
  if (!v || typeof v.n !== "number" || !(v.exp > nowSec)) v = { n: 0, exp: nowSec + RATE_WIN };
  if (v.n >= RATE_MAX) return { wait: v.exp - nowSec, key };
  v.n += 1;
  await kv.put(key, JSON.stringify({ n: v.n, exp: v.exp }), { expirationTtl: Math.max(v.exp - nowSec, 0) + 61 });
  return { wait: 0, key };
}

async function siteverify(token, secret, fetchImpl) {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const res = await fetchImpl(SITEVERIFY, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: !!(res.ok && data && data.success === true), sent: body.toString() };
}

export async function handleSubmitEvent(req, env, deps = {}) {
  const origin = req.headers.get("Origin") || "";
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") {
    return headers ? new Response(null, { status: 204, headers }) : new Response(null, { status: 403 });
  }
  if (!headers) return json(null, { error: "origin not allowed" }, 403);
  if (req.method !== "POST") return json(headers, { error: "Method not allowed." }, 405);

  const now = deps.now ? deps.now() : new Date();
  const fetchImpl = deps.fetch || fetch;
  let raw = "";
  try { raw = await req.text(); } catch { raw = ""; }
  if (raw.length > 20000) return json(headers, { error: "Submission is too large." }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return json(headers, { error: "Submission could not be read." }, 400); }
  const fields = validate(body);
  if (fields.error) return json(headers, { error: fields.error }, 400);

  if (!env.TURNSTILE_SECRET) return json(headers, { error: "Spam check is not configured." }, 500);
  let checked;
  try {
    checked = await siteverify(fields.token, env.TURNSTILE_SECRET, fetchImpl);
  } catch {
    return json(headers, { error: "The spam check didn't finish. Try it again." }, 400);
  }
  if (!checked.ok) return json(headers, { error: "The spam check didn't accept this submission. Try it again." }, 400);

  const kv = env.SUBMISSIONS;
  if (!kv) return json(headers, { error: "Submissions are not available." }, 500);
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const hash = await sha256hex(ip);
  const limit = await rateLimit(kv, hash, Math.floor(now.getTime() / 1000));
  if (limit.wait > 0) {
    return json(
      { ...headers, "Retry-After": String(limit.wait) },
      { error: "Too many submissions from this network. Please wait about an hour and try again." },
      429,
    );
  }

  const receivedAt = detroitISO(now);
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
  const record = {
    event: fields.event,
    venue: fields.venue,
    venueIsNew: fields.venueIsNew,
    date: fields.date,
    time: fields.time,
    source: fields.source,
    genre: fields.genre,
    priceType: fields.priceType,
    price: fields.price,
    name: fields.name,
    email: fields.email,
    receivedAt,
    status: "pending",
    turnstileSuccess: true,
  };
  await kv.put("pending:" + receivedAt + ":" + id, JSON.stringify(record));
  return json(headers, { ok: true }, 200);
}
