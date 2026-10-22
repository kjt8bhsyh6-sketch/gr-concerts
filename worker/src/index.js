// grh-profiles: visitor profiles for Grand Rapids Happenings (Cloudflare Workers free plan + KV).
// KV keys: p:<email> profile JSON · t:<token> magic link (15 min TTL) · c:<email> 6-digit code for that link (15 min, 5 tries)
//          s:<session> {email,at} session (1 year, rolling: TTL renewed at most once a day on use)
// Served two ways: https://grhappenings.com/api/* (Worker route, first-party; sets HttpOnly cookie grh_s) and
// https://grh-profiles.grhappenings.workers.dev/* (legacy; Bearer token only). The /api prefix is stripped.
import { loadData, matchPicks, renderEmail, listProfiles, unsubSig, unsubUrl, checkLinks, venuePage } from "./alerts.js";
// Production origins. github.io stays while the old GitHub Pages copy still forwards visitors (legacy, Bearer token only).
const ORIGINS = [/^https:\/\/(www\.)?grhappenings\.com$/, /^https:\/\/kjt8bhsyh6-sketch\.github\.io$/];
// Previews and local dev: only when the Worker var DEV is "1" (wrangler dev --var DEV:1). Never set DEV in production.
const DEV_ORIGINS = [/^https:\/\/([a-z0-9-]+\.)?grhappenings\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const isDev = env => String(env.DEV || "") === "1";
const originOk = (env, o) => ORIGINS.some(r => r.test(o)) || (isDev(env) && DEV_ORIGINS.some(r => r.test(o)));
const LINK_TTL = 900, SESSION_TTL = 60 * 60 * 24 * 90, RENEW_AFTER = 60 * 60 * 24 * 1000, CODE_TRIES = 5; // 90-day sliding session
// Sign-in rate limits (KV fixed windows; KV is eventually consistent, so these are approximate; the WAF rule is the hard limit).
const EMAIL_COOLDOWN = 60, EMAIL_HOURLY = 5, IP_REQ = { n: 10, win: 600 }, IP_CODE = { n: 20, win: 600 };
const COOKIE = "grh_s";
// First-party cookie only when the browser talks to the Worker on the site's own host (grhappenings.com/api or localhost dev).
const firstParty = (req, url, env) => { const o = req.headers.get("Origin"); return (!o || o === url.origin) && (url.hostname === "grhappenings.com" || (isDev(env) && (url.hostname === "localhost" || url.hostname === "127.0.0.1"))); };
const setCookie = (sid, url, maxAge = SESSION_TTL) => `${COOKIE}=${sid}; Max-Age=${maxAge}; Path=/api; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`;
const code6 = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
const LIST = (a, n = 40) => Array.isArray(a) ? a.filter(x => typeof x === "string").map(x => x.trim().slice(0, 60)).filter(Boolean).slice(0, n) : [];

function cors(req, env) {
  const o = req.headers.get("Origin") || "";
  const ok = originOk(env, o);
  return ok ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Vary": "Origin", "Access-Control-Max-Age": "86400" } : null;
}
const json = (h, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
// Fixed-window counter in KV. Returns seconds to wait (0 = allowed). KV's minimum TTL is 60s.
async function limited(env, key, max, win) {
  const now = Math.floor(Date.now() / 1000);
  let v = null; try { v = JSON.parse((await env.KV.get(key)) || "null"); } catch {}
  if (!v || !(v.exp > now)) v = { n: 0, exp: now + win };
  if (v.n >= max) return v.exp - now;
  v.n++; await env.KV.put(key, JSON.stringify(v), { expirationTtl: Math.max(v.exp - now, 0) + 61 }); // KV needs TTL >= 60s; +61 avoids the edge
  return 0;
}
const waitMsg = s => `Too many sign-in attempts. Please wait ${s >= 90 ? Math.ceil(s / 60) + " minutes" : s + " seconds"} and try again.`;
const tooMany = (h, s) => new Response(JSON.stringify({ error: waitMsg(s), retryAfter: s }), { status: 429, headers: { ...h, "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Retry-After": String(s) } });
const rand = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
const validEmail = e => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function clean(p) {
  p = p || {};
  const al = p.alerts || {};
  return {
    concerts: { genres: LIST(p.concerts?.genres), venues: LIST(p.concerts?.venues), artists: LIST(p.concerts?.artists) },
    sports: { teams: LIST(p.sports?.teams), gameTypes: LIST(p.sports?.gameTypes) },
    seasonal: { types: LIST(p.seasonal?.types) },
    alerts: { on: !!al.on, freq: ["weekly", "daily", "announced"].includes(al.freq) ? al.freq : "weekly" },
  };
}

// The one email sender. Provider is chosen by which secret is set:
//   GMAIL_RELAY_URL + GMAIL_RELAY_SECRET  -> Google Apps Script relay, sends from grhappenings@gmail.com (primary)
//   MAILJET_API_KEY + MAILJET_SECRET_KEY -> Mailjet Send API v3.1 (fallback, free 200/day, 6,000/mo)
//   BREVO_API_KEY                         -> Brevo (legacy, optional)
//   none                                  -> PREVIEW mode (link shown on screen; insecure, testing only)
function emailMode(env) {
  if (isDev(env) && env.FORCE_PREVIEW === "1") return "preview";
  if (env.GMAIL_RELAY_URL && env.GMAIL_RELAY_SECRET) return "gmail-relay";
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) return "mailjet";
  if (env.BREVO_API_KEY) return "brevo";
  return "preview";
}
async function sendSignInEmail(env, email, link, code) {
  let mode = emailMode(env);
  if (mode === "preview") { console.log(`[preview] sign-in for ${email}: code ${code} link ${link}`); return { preview: true }; }
  const from = env.SENDER_EMAIL || "bill.jenkins@mail.grokbot.com";
  const name = "Grand Rapids Happenings";
  const subject = `${code} is your Grand Rapids Happenings sign-in code`;
  const html = `<p>Your sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p><p>Type it on the sign-in screen (handy if you use the site from your home screen), or tap the link:</p><p><a href="${link}">Sign in to Grand Rapids Happenings</a></p><p>The code and link work for 15 minutes, once. If you didn't ask for this, ignore this email.</p>`;
  const text = `Your Grand Rapids Happenings sign-in code: ${code}\n\nType it on the sign-in screen, or open this link:\n${link}\n\nThe code and link work for 15 minutes, once. If you didn't ask for this, ignore this email.`;
  let r;
  if (mode === "gmail-relay") {
    try {
      // Apps Script answers POST with a 302 to script.googleusercontent.com; following it (as GET) returns doPost output.
      const g = await fetch(env.GMAIL_RELAY_URL, { method: "POST", redirect: "follow", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: env.GMAIL_RELAY_SECRET, to: email, subject, html, text }) });
      const body = await g.text();
      let d = null; try { d = JSON.parse(body); } catch {}
      if (g.ok && d && d.ok) return { preview: false };
      console.log(`[gmail-relay] send failed ${g.status}: ${body.slice(0, 200)}`);
    } catch (e) { console.log(`[gmail-relay] error: ${e}`); }
    if (!(env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY)) throw new Error("email send failed (gmail-relay)");
    mode = "mailjet"; // fallback
  }
  if (mode === "mailjet") {
    r = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`), "Content-Type": "application/json" },
      body: JSON.stringify({ Messages: [{ From: { Email: from, Name: name }, To: [{ Email: email }], Subject: subject, TextPart: text, HTMLPart: html, TrackClicks: "disabled", TrackOpens: "disabled" }] }),
    });
  } else {
    r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name, email: from }, to: [{ email }], subject, htmlContent: html, textContent: text }),
    });
  }
  if (!r.ok) { console.log(`[${mode}] send failed ${r.status}: ${(await r.text()).slice(0, 300)}`); throw new Error("email send failed " + r.status); }
  return { preview: false };
}

// Generic send through the Gmail Apps Script relay only (used for alert emails; Mailjet is useless for outside inboxes).
async function relaySend(env, to, subject, html, text) {
  if (!(env.GMAIL_RELAY_URL && env.GMAIL_RELAY_SECRET)) throw new Error("gmail relay not configured");
  const g = await fetch(env.GMAIL_RELAY_URL, { method: "POST", redirect: "follow", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.GMAIL_RELAY_SECRET, to, subject, html, text }) });
  const body = await g.text(); let d = null; try { d = JSON.parse(body); } catch {}
  return { ok: !!(g.ok && d && d.ok), status: g.status, relay: d || body.slice(0, 200) };
}
const page = (title, body, status = 200) => new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:3rem auto;padding:0 1rem;line-height:1.5"><h2>${title}</h2>${body}</body>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
const safeEq = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

async function alertsOff(req, env, url) {
  const e = String(url.searchParams.get("e") || "").toLowerCase(), k = String(url.searchParams.get("k") || "");
  if (!env.ADMIN_KEY || !validEmail(e) || !safeEq(k, await unsubSig(env, e))) return page("Link not valid", "<p>This unsubscribe link is not valid. Sign in on the site and turn alerts off under your profile.</p>", 400);
  const site = env.SITE_URL;
  if (req.method === "GET") return page("Turn off alert emails?", `<p>Stop "Your Grand Rapids picks this week" emails to <b>${e.replace(/</g, "&lt;")}</b>?</p><form method="post"><button style="font:inherit;padding:.6rem 1.2rem;border-radius:99px;border:0;background:#b45309;color:#fff;cursor:pointer">Turn off alerts</button></form><p><a href="${site}">Back to Grand Rapids Happenings</a> (sign in to edit your picks or turn alerts back on).</p>`);
  const raw = await env.KV.get("p:" + e);
  if (raw) { const p = JSON.parse(raw); p.alerts = { ...(p.alerts || {}), on: false }; p.alertsOffAt = new Date().toISOString(); await env.KV.put("p:" + e, JSON.stringify(p)); }
  return page("Alerts turned off", `<p>You won't get alert emails at <b>${e.replace(/</g, "&lt;")}</b> anymore. Your profile and picks are kept; delete them anytime from your profile.</p><p><a href="${site}">Back to Grand Rapids Happenings</a></p>`);
}

async function adminAlerts(req, env, url) {
  if (!env.ADMIN_KEY || !safeEq(req.headers.get("X-Admin-Key") || "", env.ADMIN_KEY)) return json({}, { error: "forbidden" }, 403);
  const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const q = k => b[k] ?? url.searchParams.get(k);
  const dryRun = String(q("dryRun") ?? "true") !== "false";
  const to = q("to") ? String(q("to")).trim().toLowerCase() : null;     // override: send only to this address
  const only = q("only") ? String(q("only")).trim().toLowerCase() : null; // limit to one profile's picks
  const confirm = q("confirm") === "SEND-TO-ALL";
  const includeHtml = String(q("html") ?? "true") !== "false";
  const data = await loadData(env, b.data);
  const base = url.origin;
  const all = await listProfiles(env);
  const eligible = [], notOpted = [];
  for (const p of all) {
    if (!validEmail(p.email) || !p.lastSignIn) continue; // verified = completed a magic-link sign-in
    (p.alerts && p.alerts.on ? eligible : notOpted).push(p);
  }
  let list = only ? eligible.filter(p => p.email === only) : eligible;
  if (only && !list.length) { const p = all.find(x => x.email === only); if (p) list = [p]; } // preview a non-opted profile's picks (override only)
  // Pre-send link check over every link any recipient would get (+ venue fallbacks for dead ones).
  const matched = list.map(p => [p, matchPicks(p, data)]);
  const fresh = String(q("fresh") ?? "false") === "true";
  let lc = await checkLinks(env, matched.flatMap(([, ps]) => ps.map(e => e.link)), { fresh });
  const deadUrls = Object.keys(lc).filter(u => lc[u].status === "dead");
  const fb = [...new Set(matched.flatMap(([, ps]) => ps.filter(e => deadUrls.includes(e.link)).map(e => venuePage(e.venue)).filter(Boolean)))];
  if (fb.length) lc = { ...lc, ...(await checkLinks(env, fb)) };
  const isOk = u => u && lc[u] && !["dead", "unchecked"].includes(lc[u].status);
  const dropped = [], swapped = [];
  for (const m of matched) m[1] = m[1].flatMap(e => {
    if (!e.link || lc[e.link]?.status !== "dead") return [e];
    const v = venuePage(e.venue);
    if (v && isOk(v)) { swapped.push({ title: e.title, from: e.link, to: v }); return [{ ...e, link: v, venueLink: true }]; }
    dropped.push({ title: e.title, link: e.link }); return [];
  });
  const vals = Object.values(lc), cnt = st => vals.filter(x => x.status === st).length;
  const linkCheck = { checked: vals.length, ok: cnt("ok"), okBotBlock: cnt("ok-botblock"), suspect: cnt("suspect"), timeout: cnt("timeout"), dead: cnt("dead"), unchecked: cnt("unchecked"),
    cachedResults: vals.filter(x => x.cached).length, swappedToVenuePage: swapped, droppedShows: dropped,
    problems: Object.entries(lc).filter(([, r]) => !["ok", "ok-botblock"].includes(r.status)).map(([u, r]) => ({ url: u, ...r })) };
  const recips = [], skipped = [];
  for (const [p, picks] of matched) {
    if (!picks.length) { skipped.push({ email: p.email, matches: 0 }); continue; }
    const off = await unsubUrl(env, base, p.email);
    recips.push({ email: p.email, freq: p.alerts?.freq || "weekly", matches: picks.length, picks, ...renderEmail(env, p.email, picks, off, p.alerts?.freq) });
  }
  const summary = { profilesTotal: all.length, verifiedWithEmail: eligible.length + notOpted.length, optedIn: eligible.length, notOptedIn: notOpted.length,
    optInField: "alerts.on (explicit toggle in profile)", linkCheck, wouldSend: recips.length, skippedZeroMatches: skipped.length,
    data: { concerts: data.concerts.length, games: data.games.length, seasonal: data.seasonal.length } };
  const view = r => ({ email: r.email, freq: r.freq, matches: r.matches, subject: r.subject, ...(includeHtml ? { html: r.html } : {}), picks: r.picks.map(e => `${e.date} ${e.time} ${e.title} @ ${e.venue}`) });
  if (dryRun) return json({}, { dryRun: true, ...summary, recipients: recips.map(view), skipped });
  if (to) {
    if (!validEmail(to)) return json({}, { error: "bad to" }, 400);
    if (!recips.length) return json({}, { error: "no recipient with matches to preview (use only=<email>)" }, 400);
    const r = recips[0], res = await relaySend(env, to, "[PREVIEW for " + r.email + "] " + r.subject, r.html, r.text);
    return json({}, { dryRun: false, override: to, previewOf: r.email, matches: r.matches, result: res });
  }
  if (linkCheck.unchecked) return json({}, { error: `${linkCheck.unchecked} links not yet checked (subrequest limit); run dryRun again, then send`, linkCheck }, 409);
  if (!confirm) return json({}, { error: "real send to all recipients requires confirm=SEND-TO-ALL" }, 400);
  const results = [];
  for (const r of recips) { const res = await relaySend(env, r.email, r.subject, r.html, r.text); results.push({ email: r.email, matches: r.matches, ok: res.ok }); if (!res.ok) results[results.length - 1].err = res.relay; }
  return json({}, { dryRun: false, sent: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length, ...summary, results });
}

// Candidate session ids: first-party cookie first, then Bearer token (localStorage fallback / workers.dev).
function sessionIds(req) {
  const c = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  const m = (req.headers.get("Authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  return [...new Set([c && c[1], m && m[1]].filter(Boolean))];
}
const sessionId = req => sessionIds(req)[0] || null;
async function session(req, env) {
  const c = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  for (const sid of sessionIds(req)) { const s = await session1(env, sid); if (s) { s.viaCookie = !!(c && c[1] === sid); return s; } }
  return null;
}
async function session1(env, sid) {
  const raw = await env.KV.get("s:" + sid);
  if (!raw) return null;
  let v; try { v = JSON.parse(raw); } catch { v = null; }
  if (!v || typeof v !== "object") v = { email: raw, at: 0 }; // old format: plain email (30-day sessions)
  // A deleted account invalidates every session for that email (profile must still exist).
  if (!(await env.KV.get("p:" + v.email))) { await env.KV.delete("s:" + sid); return null; }
  let renewed = false;
  if (Date.now() - (v.at || 0) > RENEW_AFTER) { await env.KV.put("s:" + sid, JSON.stringify({ email: v.email, at: Date.now() }), { expirationTtl: SESSION_TTL }); renewed = true; }
  return { sid, email: v.email, renewed };
}
async function startSession(env, email, draft) {
  let prof = JSON.parse((await env.KV.get("p:" + email)) || "null");
  if (!prof) prof = { email, created: new Date().toISOString(), ...clean(draft) };
  prof.lastSignIn = new Date().toISOString();
  await env.KV.put("p:" + email, JSON.stringify(prof));
  const sid = rand();
  await env.KV.put("s:" + sid, JSON.stringify({ email, at: Date.now() }), { expirationTtl: SESSION_TTL });
  return { sid, prof };
}

export default {
  async fetch(req, env) {
    const res = await handle(req, env);
    return res;
  },
};
async function handle(req, env) {
    const h0 = cors(req, env);
    const url = new URL(req.url), path = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
    const fp = firstParty(req, url, env);
    // Same-origin calls (grhappenings.com/api) send no Origin on GET; allow them as first-party.
    const h = h0 || (fp ? {} : null);
    if (h0) h0["Access-Control-Allow-Credentials"] = "true";
    if (req.method === "OPTIONS") return h ? new Response(null, { status: 204, headers: h }) : new Response(null, { status: 403 });
    if (path === "/" || path === "/health") return json(h || {}, { ok: true, service: "grh-profiles", emailMode: emailMode(env) });
    if (path === "/alerts/off" && (req.method === "GET" || req.method === "POST")) return alertsOff(req, env, url);
    if (path === "/admin/alerts" && (req.method === "GET" || req.method === "POST")) { try { return await adminAlerts(req, env, url); } catch (e) { return json({}, { error: String(e.message || e) }, 500); } }
    if (!h) return json({}, { error: "origin not allowed" }, 403);
    try {
      if (path === "/auth/request" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const email = String(b.email || "").trim().toLowerCase();
        if (!validEmail(email)) return json(h, { error: "Enter a valid email." }, 400);
        let ret = String(b.returnTo || env.SITE_URL), u;
        try { u = new URL(ret); } catch { return json(h, { error: "Bad return address." }, 400); }
        if (!originOk(env, u.origin)) u = new URL(env.SITE_URL);
        // Honeypot: a hidden "website" field only bots fill in. Answer exactly like a real send, do nothing.
        if (String(b.website || "").trim()) return json(h, { ok: true });
        if (emailMode(env) === "preview" && !isDev(env)) return json(h, { error: "Sign-in email is temporarily unavailable. Please try again later." }, 503);
        const ip = req.headers.get("CF-Connecting-IP") || "unknown";
        let w = await limited(env, "rl:ip:" + ip, IP_REQ.n, IP_REQ.win);
        if (!w) w = await limited(env, "rl:em1:" + email, 1, EMAIL_COOLDOWN);
        if (!w) w = await limited(env, "rl:emh:" + email, EMAIL_HOURLY, 3600);
        if (w) return tooMany(h, w);
        const old = JSON.parse((await env.KV.get("c:" + email)) || "null");
        if (old && (old.n || 0) >= CODE_TRIES) return json(h, { error: "Too many wrong codes. Wait 15 minutes, then request a new code." }, 429);
        if (old && old.tok) await env.KV.delete("t:" + old.tok); // newest request wins; old link stops working
        const tok = rand(), code = code6();
        await env.KV.put("t:" + tok, JSON.stringify({ email, draft: b.profile ? clean(b.profile) : null }), { expirationTtl: LINK_TTL });
        // Wrong-code count carries over while a code is live, so asking for a new code doesn't reset the 5 tries.
        await env.KV.put("c:" + email, JSON.stringify({ code, tok, n: old ? Math.min(old.n || 0, CODE_TRIES) : 0 }), { expirationTtl: LINK_TTL });
        u.searchParams.set("signin", tok);
        const sent = await sendSignInEmail(env, email, u.toString(), code);
        return json(h, sent.preview ? { ok: true, preview: true, link: u.toString(), code } : { ok: true });
      }
      if (path === "/auth/verify" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const tok = String(b.token || "");
        if (!/^[a-f0-9]{64}$/.test(tok)) return json(h, { error: "Bad link." }, 400);
        const raw = await env.KV.get("t:" + tok);
        if (!raw) return json(h, { error: "This link expired or was already used. Request a new one." }, 400);
        await env.KV.delete("t:" + tok);
        const { email, draft } = JSON.parse(raw);
        const c = JSON.parse((await env.KV.get("c:" + email)) || "null");
        if (c && c.tok === tok) await env.KV.delete("c:" + email);
        const { sid, prof } = await startSession(env, email, draft);
        return withCookie(json(h, { ok: true, session: sid, profile: prof }), fp && setCookie(sid, url));
      }
      if (path === "/auth/code" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const email = String(b.email || "").trim().toLowerCase(), code = String(b.code || "").replace(/\D/g, "");
        if (!validEmail(email) || code.length !== 6) return json(h, { error: "Enter your email and the 6-digit code." }, 400);
        const iw = await limited(env, "rl:ipc:" + (req.headers.get("CF-Connecting-IP") || "unknown"), IP_CODE.n, IP_CODE.win);
        if (iw) return tooMany(h, iw);
        const c = JSON.parse((await env.KV.get("c:" + email)) || "null");
        const bad = "That code isn't right, or it expired. Check the newest email or request a new code.";
        if (!c) return json(h, { error: bad }, 400);
        const locked = "Too many wrong codes. Wait 15 minutes, then request a new code (or tap the link in the email).";
        if ((c.n || 0) >= CODE_TRIES) return json(h, { error: locked }, 429);
        if (!safeEq(code, c.code)) {
          // Lock: keep c: (with n at the limit) until it expires, so a fresh request can't reset the count.
          if (++c.n >= CODE_TRIES) { await env.KV.put("c:" + email, JSON.stringify({ n: c.n }), { expirationTtl: LINK_TTL }); await env.KV.delete("t:" + c.tok); return json(h, { error: locked }, 429); }
          await env.KV.put("c:" + email, JSON.stringify(c), { expirationTtl: LINK_TTL });
          return json(h, { error: bad }, 400);
        }
        const raw = await env.KV.get("t:" + c.tok);
        await env.KV.delete("c:" + email); await env.KV.delete("t:" + c.tok);
        if (!raw) return json(h, { error: bad }, 400);
        const { sid, prof } = await startSession(env, email, JSON.parse(raw).draft);
        return withCookie(json(h, { ok: true, session: sid, profile: prof }), fp && setCookie(sid, url));
      }
      const s = await session(req, env);
      if (!s) return withCookie(json(h, { error: "Not signed in." }, 401), fp && sessionId(req) && setCookie("", url, 0));
      // Renew the cookie on daily renewal, or move an old Bearer-only session (localStorage) into the cookie.
      const renew = fp && (s.renewed || !s.viaCookie) ? setCookie(s.sid, url) : null;
      if (path === "/profile" && req.method === "GET") {
        return withCookie(json(h, { profile: JSON.parse((await env.KV.get("p:" + s.email)) || "null") || { email: s.email, ...clean() } }), renew);
      }
      if (path === "/profile" && (req.method === "PUT" || req.method === "POST")) {
        const old = JSON.parse((await env.KV.get("p:" + s.email)) || "{}");
        const prof = { ...old, email: s.email, ...clean(await req.json().catch(() => ({}))), updated: new Date().toISOString() };
        await env.KV.put("p:" + s.email, JSON.stringify(prof));
        return withCookie(json(h, { ok: true, profile: prof }), renew);
      }
      if (path === "/auth/signout" && req.method === "POST") { await env.KV.delete("s:" + s.sid); return withCookie(json(h, { ok: true }), fp && setCookie("", url, 0)); }
      if (path === "/account" && req.method === "DELETE") {
        await env.KV.delete("p:" + s.email); await env.KV.delete("s:" + s.sid);
        return withCookie(json(h, { ok: true, deleted: true }), fp && setCookie("", url, 0));
      }
      return json(h, { error: "not found" }, 404);
    } catch (e) { console.log("error", e.message); return json(h, { error: "Server error." }, 500); }
}
function withCookie(res, c) { if (c) res.headers.append("Set-Cookie", c); return res; }
