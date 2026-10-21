// grh-profiles: visitor profiles for Grand Rapids Happenings (Cloudflare Workers free plan + KV).
// KV keys: p:<email> profile JSON · t:<token> magic link (15 min TTL) · s:<session> session (30 days)
const ORIGINS = [/^https:\/\/kjt8bhsyh6-sketch\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
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
//   MAILJET_API_KEY + MAILJET_SECRET_KEY -> Mailjet Send API v3.1 (preferred, free 200/day, 6,000/mo)
//   BREVO_API_KEY                         -> Brevo (legacy, optional)
//   none                                  -> PREVIEW mode (link shown on screen; insecure, testing only)
function emailMode(env) {
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) return "mailjet";
  if (env.BREVO_API_KEY) return "brevo";
  return "preview";
}
async function sendSignInEmail(env, email, link) {
  const mode = emailMode(env);
  if (mode === "preview") { console.log(`[preview] sign-in link for ${email}: ${link}`); return { preview: true }; }
  const from = env.SENDER_EMAIL || "bill.jenkins@mail.grokbot.com";
  const name = "Grand Rapids Happenings";
  const subject = "Your sign-in link for Grand Rapids Happenings";
  const html = `<p>Tap to sign in (link works for 15 minutes, once):</p><p><a href="${link}">Sign in to Grand Rapids Happenings</a></p><p>If you didn't ask for this, ignore this email.</p>`;
  const text = `Sign in to Grand Rapids Happenings (works for 15 minutes, once):\n${link}\n\nIf you didn't ask for this, ignore this email.`;
  let r;
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
