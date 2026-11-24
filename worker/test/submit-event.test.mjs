// Submit-event tests. No network, no Miniflare, no npm packages.
// Run from worker/: node test/submit-event.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";
import { handleSubmitEvent, detroitISO, SUBMIT_ORIGINS, GENRES } from "../src/submit-event.js";
import { VENUE_KEYS } from "../src/venue-keys.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = "https://kjt8bhsyh6-sketch.github.io";
const TOKEN = "tok-GOOD-xyz-not-stored";
const IP = "203.0.113.50";
const NOW = new Date("2026-11-24T11:47:00.000Z");

function memoryKV() {
  const map = new Map();
  const puts = [];
  return {
    puts,
    map,
    async get(k) { return map.has(k) ? map.get(k) : null; },
    async put(k, v, opts) { map.set(k, v); puts.push({ key: k, value: v, opts }); },
  };
}

function envWith(kv, extra = {}) {
  return { TURNSTILE_SECRET: "test-secret", SUBMISSIONS: kv, ...extra };
}

function fetchMock(result = { success: true }) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), method: init.method, body: String(init.body), headers: init.headers });
    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { impl, calls };
}

function payload(over = {}) {
  return {
    event: "Open Mic with Adam",
    venue: "Mulligan's Pub",
    venueOther: "",
    date: "2026-12-03",
    time: "21:00",
    source: "https://mulliganspubgr.com/",
    genre: "Open Mic",
    priceType: "free",
    price: "",
    name: "Chris Jenkins",
    email: "chris@example.com",
    turnstileToken: TOKEN,
    ...over,
  };
}

function request(body, { method = "POST", origin = ORIGIN, ip = IP, path = "/submit-event" } = {}) {
  return new Request("https://grh-profiles-staging.grhappenings.workers.dev" + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    body: body == null || method === "GET" || method === "OPTIONS" ? undefined : JSON.stringify(body),
  });
}

const pending = kv => kv.puts.filter(p => p.key.startsWith("pending:"));

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok -", name); };

await t("detroit stamp uses America/Detroit with an offset", () => {
  assert.equal(detroitISO(NOW), "2026-11-24T06:47:00-05:00");
});

await t("bad token gives 400 and no write", async () => {
  const kv = memoryKV();
  const net = fetchMock({ success: false });
  const res = await handleSubmitEvent(request(payload()), envWith(kv), { fetch: net.impl, now: () => NOW });
  assert.equal(res.status, 400);
  assert.equal(kv.puts.length, 0);
  assert.equal(net.calls.length, 1);
  const params = new URLSearchParams(net.calls[0].body);
  assert.equal(params.get("response"), TOKEN);
  assert.equal(params.get("secret"), "test-secret");
  assert.equal(params.has("remoteip"), false);
  assert.equal(net.calls[0].body.includes("remoteip"), false);
});

await t("missing token gives 400, does not call siteverify, and does not write", async () => {
  const kv = memoryKV();
  const net = fetchMock();
  const res = await handleSubmitEvent(request(payload({ turnstileToken: "" })), envWith(kv), { fetch: net.impl, now: () => NOW });
  assert.equal(res.status, 400);
  assert.equal(net.calls.length, 0);
  assert.equal(kv.puts.length, 0);
});

await t("good token gives 200 and a pending write", async () => {
  const kv = memoryKV();
  const net = fetchMock({ success: true, hostname: "example", action: "should-not-be-stored" });
  const res = await handleSubmitEvent(request(payload({ venue: "mulligan's pub" })), envWith(kv), { fetch: net.impl, now: () => NOW });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const rows = pending(kv);
  assert.equal(rows.length, 1);
  assert.match(rows[0].key, /^pending:2026-11-24T06:47:00-05:00:[0-9a-f]{16}$/);
  const stored = JSON.parse(rows[0].value);
  assert.equal(stored.status, "pending");
  assert.equal(stored.turnstileSuccess, true);
  assert.equal(stored.receivedAt, "2026-11-24T06:47:00-05:00");
  assert.equal(stored.venue, "Mulligan's Pub");
  assert.equal(stored.venueIsNew, false);
  assert.equal(stored.event, "Open Mic with Adam");
  assert.equal(stored.genre, "Open Mic");
  assert.equal(stored.email, "chris@example.com");
  assert.equal(stored.name, "Chris Jenkins");
  assert.equal(stored.source, "https://mulliganspubgr.com/");
  assert.equal(Object.hasOwn(stored, "turnstileToken"), false);
  assert.equal(Object.hasOwn(stored, "token"), false);
  assert.equal(JSON.stringify(stored).includes(TOKEN), false);
  assert.equal(JSON.stringify(stored).includes("should-not-be-stored"), false);
  assert.equal(JSON.stringify(kv.puts).includes(IP), false);
  assert.equal(rows[0].key.includes(IP), false);
  const rl = kv.puts.find(p => p.key.startsWith("rl:submit:"));
  assert.ok(rl);
  assert.equal(rl.key.includes(IP), false);
  assert.equal(rl.value.includes(IP), false);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(IP)))].map(b => b.toString(16).padStart(2, "0")).join("");
  assert.equal(rl.key, "rl:submit:" + hash);
  assert.equal(net.calls[0].body.includes("remoteip"), false);
  assert.equal(new URLSearchParams(net.calls[0].body).has("remoteip"), false);
});

await t("bad URL gives 400 and does not verify or write", async () => {
  for (const source of ["notaurl", "javascript:alert(1)", "ftp://example.com/show", "http://user:pass@example.com/"]) {
    const kv = memoryKV();
    const net = fetchMock();
    const res = await handleSubmitEvent(request(payload({ source })), envWith(kv), { fetch: net.impl, now: () => NOW });
    assert.equal(res.status, 400, source);
    assert.equal(net.calls.length, 0, source);
    assert.equal(kv.puts.length, 0, source);
  }
});

await t("rate limit is 5 pending writes per hashed IP per hour", async () => {
  const kv = memoryKV();
  const net = fetchMock();
  for (let i = 0; i < 5; i++) {
    const res = await handleSubmitEvent(request(payload(), { ip: IP }), envWith(kv), { fetch: net.impl, now: () => new Date(NOW.getTime() + i * 1000) });
    assert.equal(res.status, 200, "try " + i);
  }
  const blocked = await handleSubmitEvent(request(payload(), { ip: IP }), envWith(kv), { fetch: net.impl, now: () => new Date(NOW.getTime() + 60000) });
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).error, /Too many submissions/);
  assert.equal(pending(kv).length, 5);
  const other = await handleSubmitEvent(request(payload(), { ip: "203.0.113.99" }), envWith(kv), { fetch: net.impl, now: () => new Date(NOW.getTime() + 120000) });
  assert.equal(other.status, 200);
  assert.equal(pending(kv).length, 6);
  assert.equal(JSON.stringify(kv.puts).includes(IP), false);
  assert.equal(JSON.stringify(kv.puts).includes("203.0.113.99"), false);
});

await t("GET does not list submissions", async () => {
  const kv = memoryKV();
  await handleSubmitEvent(request(payload()), envWith(kv), { fetch: fetchMock().impl, now: () => NOW });
  const res = await handleSubmitEvent(request(null, { method: "GET" }), envWith(kv), { fetch: fetchMock().impl, now: () => NOW });
  assert.equal(res.status, 405);
  const text = await res.text();
  assert.equal(text.includes("Open Mic"), false);
  assert.equal(text.includes("chris@example.com"), false);
});

await t("disallowed origin is rejected before any write", async () => {
  const kv = memoryKV();
  const net = fetchMock();
  const res = await handleSubmitEvent(request(payload(), { origin: "https://evil.example" }), envWith(kv), { fetch: net.impl, now: () => NOW });
  assert.equal(res.status, 403);
  assert.equal(kv.puts.length, 0);
  assert.equal(net.calls.length, 0);
});

await t("the worker route accepts /submit-event and /api/submit-event", async () => {
  const kv = memoryKV();
  const orig = globalThis.fetch;
  globalThis.fetch = fetchMock().impl;
  try {
    for (const p of ["/submit-event", "/api/submit-event"]) {
      const res = await worker.fetch(request(payload({ event: "Route check " + p }), { path: p }), envWith(kv));
      assert.equal(res.status, 200, p);
    }
  } finally {
    globalThis.fetch = orig;
  }
  assert.equal(pending(kv).length, 2);
  assert.equal(JSON.stringify(kv.puts).includes(TOKEN), false);
});

await t("new venue names are kept and known names are normalized", async () => {
  const kv = memoryKV();
  const res = await handleSubmitEvent(
    request(payload({ venue: "__other__", venueOther: "  The New Room  " })),
    envWith(kv),
    { fetch: fetchMock().impl, now: () => NOW },
  );
  assert.equal(res.status, 200);
  const stored = JSON.parse(pending(kv)[0].value);
  assert.equal(stored.venue, "The New Room");
  assert.equal(stored.venueIsNew, true);
});

await t("venue keys match venues.js and genres include Open Mic", () => {
  const src = fs.readFileSync(path.join(root, "venues.js"), "utf8");
  const start = src.indexOf("const VENUES = {");
  const end = src.indexOf("\n};", start);
  const body = src.slice(start, end);
  const keys = [];
  const re = /^\s*"((?:\\.|[^"\\])*)"\s*:/gm;
  let m;
  while ((m = re.exec(body))) keys.push(JSON.parse('"' + m[1] + '"'));
  assert.deepEqual(VENUE_KEYS, keys);
  assert.ok(GENRES.includes("Open Mic"));
  assert.ok(Math.max(...keys.map(k => k.length)) <= 160);
});

await t("submit.html keeps the approved notice, genres, noindex, and the github.io guard", () => {
  const html = fs.readFileSync(path.join(root, "submit.html"), "utf8");
  assert.ok(html.includes('We use your name and email only to verify or clarify this listing. See our <a href="privacy.html">Privacy Policy</a>.'));
  assert.ok(html.includes("<title>Submit an event | Grand Rapids Happenings</title>"));
  assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
  assert.ok(html.includes('if(h==="kjt8bhsyh6-sketch.github.io")return;'));
  for (const g of GENRES) assert.ok(html.includes(">" + g + "</option>"), g);
  assert.equal(html.includes("fonts.googleapis"), false);
  assert.equal(html.includes("bill.jenkins"), false);
});

await t("submit handler never publishes listings or sends the visitor IP to Siteverify", () => {
  const src = fs.readFileSync(path.join(root, "worker/src/submit-event.js"), "utf8");
  assert.equal(src.includes("concerts.js"), false);
  assert.equal(src.includes("env.KV"), false);
  assert.equal(src.includes("remoteip"), false);
  assert.ok(SUBMIT_ORIGINS.includes("https://grhappenings.com"));
  assert.ok(SUBMIT_ORIGINS.includes("https://kjt8bhsyh6-sketch.github.io"));
  assert.equal(SUBMIT_ORIGINS.some(o => o.includes("*")), false);
});

await t("privacy.html has Sue's event-submissions text before Other sites, and Children under 13 stays below", () => {
  const html = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(html, /Last updated Oct 30, 2026/);
  assert.equal(html.includes("Google Forms"), false);
  const eventAt = html.indexOf("<h2>Event submissions</h2>");
  const otherAt = html.indexOf("<h2>Other sites</h2>");
  const kidsAt = html.indexOf("<h2>Children under 13</h2>");
  assert.ok(eventAt > 0 && otherAt > eventAt && kidsAt > otherAt);
  const p1 = 'If you use "Submit your event," we receive the event details you enter (name, venue, date, time, genre, and whether it\'s free or the price), a required link to the venue or promoter page that lists the show, and your name and email. We use the link to check the show against that live source before anything is added to our calendar. We use your name and email only to ask you a question about the listing, such as a wrong date, a duplicate, or a missing cover charge. We don\'t use them for marketing, and we don\'t sell them. We don\'t accept photos.';
  const p2 = 'To reduce spam, the form uses Cloudflare Turnstile, which checks that a visitor is likely human. For that check, Cloudflare may process technical signals such as your IP address, TLS fingerprint, and browser User-Agent. Turnstile doesn\'t read the event details you type. See Cloudflare\'s <a href="https://www.cloudflare.com/turnstile-privacy-policy/">Turnstile privacy addendum</a>.';
  const p3 = 'Submissions go into a private review queue on our Cloudflare hosting, not a public file, and nothing is published automatically. Only The Canasta Club team members who review the queue can see it. Your submission isn\'t shared with affiliates or added to our email list unless you sign up for email alerts separately. After we publish or decline a submission, we delete your name, email, and any other contact details within 30 days. Published event details stay on the site as calendar listings. Obvious spam may be kept up to 7 days to block repeats, then deleted.';
  const p4 = 'To see, correct, or delete your submission contact details, email <a href="mailto:grhappenings@gmail.com">grhappenings@gmail.com</a> or write to The Canasta Club LLC, P.O. Box 140186, Grand Rapids, MI 49504. The form isn\'t meant for children under 13 (see "Children under 13" below); if a parent or guardian tells us a child submitted an event, we\'ll delete the child\'s contact details.';
  const other = "Ticket, venue and calendar links go to other websites, each with its own privacy policy. If we turn on optional features like comments (giscus/GitHub), those services handle what you choose to send them.";
  for (const part of [p1, p2, p3, p4, other]) assert.ok(html.includes(part), part.slice(0, 48));
});

console.log("\n" + pass + " passed");
