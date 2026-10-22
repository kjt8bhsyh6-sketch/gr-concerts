// Personalized "Your Grand Rapids picks this week" alert emails (admin-only; nothing sends without ADMIN_KEY).
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const lc = s => String(s || "").toLowerCase();
const has = (list, val) => list.some(x => x && lc(val).includes(lc(x)));
const hour = t => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ""); return m ? (+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0) : 19; };
// Detroit local date as YYYY-MM-DD
const isoDet = d => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dfmt = s => { const d = new Date(s + "T12:00:00Z"); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }); };

// Parse the one-object-per-line data files (const NAME = [ { k:"v", ... }, ... ]) without eval.
function parseArr(src, name) {
  const i = src.indexOf("const " + name); if (i < 0) return [];
  const body = src.slice(i, src.indexOf("];", i));
  const out = [];
  for (const line of body.split("\n")) {
    if (!/^\s*\{/.test(line)) continue;
    const o = {}; let m; const re = /(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    while ((m = re.exec(line))) o[m[1]] = m[2].replace(/\\(.)/g, "$1");
    if (Object.keys(o).length) out.push(o);
  }
  return out;
}
export async function loadData(env, posted) {
  if (posted && (posted.concerts || posted.games || posted.seasonal)) return { concerts: posted.concerts || [], games: posted.games || [], seasonal: posted.seasonal || [] };
  const base = env.SITE_URL, get = async f => { const r = await fetch(base + f + "?v=" + Date.now(), { cf: { cacheTtl: 0 } }); if (!r.ok) throw new Error(f + " " + r.status); return r.text(); };
  const [c, s, z] = await Promise.all([get("concerts.js"), get("sports.js"), get("seasonal.js")]);
  return { concerts: parseArr(c, "CONCERTS"), games: parseArr(s, "GAMES"), seasonal: parseArr(z, "SEASONAL") };
}

// Same rules as the site's "picks for you" strip (profiles.js), over this week + next week (today .. today+13).
export function matchPicks(p, data, now = new Date()) {
  const today = isoDet(now), end = isoDet(new Date(now.getTime() + 13 * 864e5));
  const out = [];
  const c = p.concerts || {}, g = c.genres || [], v = c.venues || [], a = c.artists || [];
  if (g.length || v.length || a.length) data.concerts.filter(e => e.date >= today && e.date <= end).forEach(e => {
    if (has(g, e.genre) || has(v, e.venue) || a.some(x => x.length > 1 && lc(e.artist).includes(lc(x))))
      out.push({ kind: "Concert", title: e.artist, venue: e.venue, date: e.date, when: dfmt(e.date), time: e.time, link: e.affiliate || e.link });
  });
  const s = p.sports || {}, t = s.teams || [], gt = s.gameTypes || [];
  if (t.length || gt.length) {
    const first = {}; data.games.slice().sort((x, y) => x.date < y.date ? -1 : 1).forEach(x => { first[x.team] = first[x.team] || x.date; });
    data.games.filter(x => x.date >= today && x.date <= end).forEach(x => {
      const dow = new Date(x.date + "T12:00:00Z").getUTCDay(), h = hour(x.time);
      const types = { Weekend: dow === 0 || dow === 6 || (dow === 5 && h >= 17), Weeknight: dow >= 1 && dow <= 4 && h >= 17, Matinee: h < 17, "Home openers": first[x.team] === x.date };
      if ((!t.length || has(t, x.team)) && (!gt.length || gt.some(k => types[k])))
        out.push({ kind: "Game", title: x.team.replace(/^(Grand Rapids|West Michigan) /, "") + " vs. " + x.opponent, venue: x.venue, date: x.date, when: dfmt(x.date), time: x.time, link: x.link });
    });
  }
  const st = (p.seasonal || {}).types || [];
  if (st.length) data.seasonal.filter(e => e.sort <= end && (e.end || e.sort) >= today && has(st, e.type))
    .forEach(e => out.push({ kind: e.type, title: e.name, venue: e.location, date: e.sort < today ? today : e.sort, when: e.when, time: "", link: e.link, seasonal: true }));
  return out.sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
export const unsubSig = (env, email) => hmac(env.ADMIN_KEY, "alerts-off:" + email);
export async function unsubUrl(env, base, email) { return `${base}/alerts/off?e=${encodeURIComponent(email)}&k=${await unsubSig(env, email)}`; }

export const SUBJECTS = { weekly: "Your Grand Rapids picks this week", daily: "Your Grand Rapids picks: today's update", announced: "Just announced in Grand Rapids: your picks" };
export const SENDER_NAME = "Grand Rapids Happenings";
export const mailingAddress = env => env.MAILING_ADDRESS || "[Mailing address coming soon]";
export function renderEmail(env, email, picks, offUrl, freq = "weekly") {
  const site = env.SITE_URL, page = k => k === "Concert" ? site : k === "Game" ? site + "sports.html" : site + "seasonal.html";
  const rows = picks.map(e => `<tr><td style="padding:12px 0;border-top:1px solid #e5e7eb">
<div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">${esc(e.kind)}</div>
<div style="font-size:17px;font-weight:700;color:#111827;margin:2px 0">${esc(e.title)}</div>
<div style="font-size:14px;color:#374151">${esc(e.when)}${e.time ? " · " + esc(e.time) : ""}${e.venue ? " · " + esc(e.venue) : ""}</div>
${e.link ? `<a href="${esc(e.link)}" style="display:inline-block;margin-top:6px;padding:6px 14px;background:#b45309;color:#fff;border-radius:99px;text-decoration:none;font-size:14px;font-weight:600">${e.seasonal ? "Details" : e.venueLink ? "Venue page" : "Tickets"}</a>` : `<a href="${esc(page(e.kind))}" style="font-size:14px">Details</a>`}
</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;padding:24px">
<tr><td><div style="font-size:13px;color:#b45309;font-weight:700">GRAND RAPIDS HAPPENINGS</div>
<h1 style="font-size:24px;margin:6px 0 4px;color:#111827">Your Grand Rapids picks this week</h1>
<p style="margin:0 0 12px;color:#4b5563;font-size:15px">${picks.length} event${picks.length === 1 ? "" : "s"} matching your picks, this week and next.</p></td></tr>
${rows}
<tr><td style="padding:18px 0 4px;border-top:1px solid #e5e7eb;text-align:center"><a href="${esc(site)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:99px;text-decoration:none;font-weight:600">See all on Grand Rapids Happenings</a></td></tr>
<tr><td style="padding-top:16px;font-size:12px;color:#6b7280;text-align:center">You get this because you turned on alerts in your Grand Rapids Happenings profile (${esc(email)}).<br>
<a href="${esc(offUrl)}" style="color:#6b7280">Unsubscribe / manage alerts</a> · <a href="${esc(site)}" style="color:#6b7280">Edit your picks</a><br><br>${esc(SENDER_NAME)} · ${esc(mailingAddress(env))}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Your Grand Rapids picks this week\n\n` + picks.map(e => `- ${e.title} | ${e.when}${e.time ? " " + e.time : ""} | ${e.venue || ""}\n  ${e.link || page(e.kind)}`).join("\n") +
    `\n\nSee all on Grand Rapids Happenings: ${site}\nUnsubscribe / manage alerts: ${offUrl}\n\n--\n${SENDER_NAME}\n${mailingAddress(env)}\n`;
  return { subject: SUBJECTS[freq] || SUBJECTS.weekly, html, text };
}

export async function listProfiles(env) {
  const out = []; let cursor;
  do { const r = await env.KV.list({ prefix: "p:", cursor }); cursor = r.list_complete ? null : r.cursor;
    for (const k of r.keys) { const v = await env.KV.get(k.name); if (v) try { out.push(JSON.parse(v)); } catch {} } } while (cursor);
  return out;
}

// ---- Pre-send link check ----
// Dead = 404/410, DNS/connection failure (or Cloudflare 530). Bot-blocking answers (401/403/202/429, also 999) count as OK.
// Results cached in KV (lc:<url>, 6 h) because a free-plan Worker gets only ~50 subrequests per run; a run checks at most
// MAX_CHECKS new URLs, and a real send refuses to go out while any link is still unchecked.
export const VENUE_PAGES = [
  [/pyramid scheme/i, "https://pyramidschemebar.com/"],
  [/intersection|stache|elevation/i, "https://www.sectionlive.com/the-intersection/events"],
  [/van andel/i, "https://www.vanandelarena.com/events"],
  [/devos/i, "https://www.devosperformancehall.com/events"],
  [/glc live|20 monroe/i, "https://www.glcliveat20monroe.com/events"],
  [/wealthy theatre/i, "https://grcmc.org/theatre"],
  [/st\.? cecilia/i, "https://www.scmc-online.org/"],
  [/dr\.? grins|b\.o\.b/i, "https://www.thebob.com/drgrins/"],
  [/civic theatre/i, "https://grct.org/"],
];
const UA = "GRHappeningsLinkCheck/1.0 (+https://grhappenings.com)";
// Never fetched automatically: links to these sites stay in emails but are skipped by the link check.
const NO_FETCH = /^https?:\/\/([^/]*\.)?(bandsintown\.com|songkick\.com)(\/|$)/i;
const BOT_OK = new Set([401, 403, 202, 429, 999]);
const MAX_CHECKS = 30, TIMEOUT = 6000;
async function checkOne(url) {
  const t0 = Date.now(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    let r = await fetch(url, { method: "GET", redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
    try { r.body && r.body.cancel(); } catch {}
    const s = r.status;
    const status = s === 404 || s === 410 || s === 530 ? "dead" : s < 400 ? "ok" : BOT_OK.has(s) ? "ok-botblock" : "suspect";
    return { status, http: s, ms: Date.now() - t0 };
  } catch (e) {
    const timeout = e.name === "AbortError";
    return { status: timeout ? "timeout" : "dead", error: timeout ? "timeout" : String(e.message || e).slice(0, 120), ms: Date.now() - t0 };
  } finally { clearTimeout(tm); }
}
export async function checkLinks(env, urls, { fresh = false } = {}) {
  const res = {}, todo = [];
  for (const u of [...new Set(urls.filter(Boolean))]) {
    const c = !fresh && await env.KV.get("lc:" + u);
    if (NO_FETCH.test(u)) { res[u] = { status: "skipped", reason: "not auto-fetched" }; continue; }
    if (c) res[u] = { ...JSON.parse(c), cached: true }; else todo.push(u);
  }
  const now = todo.slice(0, MAX_CHECKS);
  for (let i = 0; i < now.length; i += 6) {
    const batch = await Promise.all(now.slice(i, i + 6).map(checkOne));
    for (let j = 0; j < batch.length; j++) {
      const u = now[i + j], r = { ...batch[j], at: new Date().toISOString() }; res[u] = r;
      if (r.status !== "timeout") await env.KV.put("lc:" + u, JSON.stringify(r), { expirationTtl: 6 * 3600 });
    }
  }
  for (const u of todo.slice(MAX_CHECKS)) res[u] = { status: "unchecked" };
  return res;
}
export const venuePage = v => (VENUE_PAGES.find(([re]) => re.test(v || "")) || [])[1] || null;
