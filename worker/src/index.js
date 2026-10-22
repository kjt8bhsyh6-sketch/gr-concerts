// grh-profiles: visitor profiles for Grand Rapids Happenings (Cloudflare Workers free plan + KV).
// KV keys: p:<email> profile JSON · t:<token> magic link (15 min TTL) · s:<session> session (30 days)
import { loadData, matchPicks, renderEmail, listProfiles, unsubSig, unsubUrl, checkLinks, venuePage } from "./alerts.js";
const ORIGINS = [/^https:\/\/kjt8bhsyh6-sketch\.github\.io$/, /^https:\/\/(www\.)?grhappenings\.com$/, /^https:\/\/([a-z0-9-]+\.)?grhappenings\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const LINK_TTL = 900, SESSION_TTL = 60 * 60 * 24 * 30;
const LIST = (a, n = 40) => Array.isArray(a) ? a.filter(x => typeof x === "string").map(x => x.trim().slice(0, 60)).filter(Boolean).slice(0, n) : [];

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const ok = ORIGINS.some(r => r.test(o));
  return ok ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Vary": "Origin", "Access-Control-Max-Age": "86400" } : null;
}
const json = (h, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });
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
  if (env.GMAIL_RELAY_URL && env.GMAIL_RELAY_SECRET) return "gmail-relay";
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) return "mailjet";
  if (env.BREVO_API_KEY) return "brevo";
  return "preview";
}
async function sendSignInEmail(env, email, link) {
  let mode = emailMode(env);
  if (mode === "preview") { console.log(`[preview] sign-in link for ${email}: ${link}`); return { preview: true }; }
  const from = env.SENDER_EMAIL || "bill.jenkins@mail.grokbot.com";
  const name = "Grand Rapids Happenings";
  const subject = "Your sign-in link for Grand Rapids Happenings";
  const html = `<p>Tap to sign in (link works for 15 minutes, once):</p><p><a href="${link}">Sign in to Grand Rapids Happenings</a></p><p>If you didn't ask for this, ignore this email.</p>`;
  const text = `Sign in to Grand Rapids Happenings (works for 15 minutes, once):\n${link}\n\nIf you didn't ask for this, ignore this email.`;
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

async function session(req, env) {
  const m = (req.headers.get("Authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return null;
  const email = await env.KV.get("s:" + m[1]);
  if (!email) return null;
  // A deleted account invalidates every session for that email (profile must still exist).
  if (!(await env.KV.get("p:" + email))) { await env.KV.delete("s:" + m[1]); return null; }
  return { sid: m[1], email };
}

export default {
  async fetch(req, env) {
    const h = cors(req);
    const url = new URL(req.url), path = url.pathname;
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
        let ret = String(b.returnTo || env.SITE_URL);
        if (!ORIGINS.some(r => r.test(new URL(ret).origin))) ret = env.SITE_URL;
        const tok = rand();
        await env.KV.put("t:" + tok, JSON.stringify({ email, draft: b.profile ? clean(b.profile) : null }), { expirationTtl: LINK_TTL });
        const u = new URL(ret); u.searchParams.set("signin", tok);
        const sent = await sendSignInEmail(env, email, u.toString());
        return json(h, sent.preview ? { ok: true, preview: true, link: u.toString() } : { ok: true });
      }
      if (path === "/auth/verify" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const tok = String(b.token || "");
        if (!/^[a-f0-9]{64}$/.test(tok)) return json(h, { error: "Bad link." }, 400);
        const raw = await env.KV.get("t:" + tok);
        if (!raw) return json(h, { error: "This link expired or was already used. Request a new one." }, 400);
        await env.KV.delete("t:" + tok);
        const { email, draft } = JSON.parse(raw);
        let prof = JSON.parse((await env.KV.get("p:" + email)) || "null");
        if (!prof) prof = { email, created: new Date().toISOString(), ...clean(draft) };
        prof.lastSignIn = new Date().toISOString();
        await env.KV.put("p:" + email, JSON.stringify(prof));
        const sid = rand();
        await env.KV.put("s:" + sid, email, { expirationTtl: SESSION_TTL });
        return json(h, { ok: true, session: sid, profile: prof });
      }
      const s = await session(req, env);
      if (!s) return json(h, { error: "Not signed in." }, 401);
      if (path === "/profile" && req.method === "GET") {
        return json(h, { profile: JSON.parse((await env.KV.get("p:" + s.email)) || "null") || { email: s.email, ...clean() } });
      }
      if (path === "/profile" && (req.method === "PUT" || req.method === "POST")) {
        const old = JSON.parse((await env.KV.get("p:" + s.email)) || "{}");
        const prof = { ...old, email: s.email, ...clean(await req.json().catch(() => ({}))), updated: new Date().toISOString() };
        await env.KV.put("p:" + s.email, JSON.stringify(prof));
        return json(h, { ok: true, profile: prof });
      }
      if (path === "/auth/signout" && req.method === "POST") { await env.KV.delete("s:" + s.sid); return json(h, { ok: true }); }
      if (path === "/account" && req.method === "DELETE") {
        await env.KV.delete("p:" + s.email); await env.KV.delete("s:" + s.sid);
        return json(h, { ok: true, deleted: true });
      }
      return json(h, { error: "not found" }, 404);
    } catch (e) { console.log("error", e.message); return json(h, { error: "Server error." }, 500); }
  },
};
