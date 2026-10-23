// Local tests for grh-profiles auth/security. No network, no production: Miniflare with an in-memory KV and a mocked email relay.
// Run: cd worker && npm i --no-save miniflare@4 && node test/auth.test.mjs
import { Miniflare } from "miniflare";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../src/", import.meta.url));
const sent = [];
function mf(bindings = {}) {
  return new Miniflare({
    modules: true, modulesRules: [{ type: "ESModule", include: ["**/*.js"] }], modulesRoot: root, scriptPath: root + "index.js", compatibilityDate: "2026-08-01" /* test runtime may lag the deploy date */,
    kvNamespaces: ["KV"],
    bindings: { SITE_URL: "https://grhappenings.com/", GMAIL_RELAY_URL: "https://relay.test/send", GMAIL_RELAY_SECRET: "test", ...bindings },
    outboundService: async req => { sent.push(await req.json()); return new Response(JSON.stringify({ ok: true })); },
  });
}
const SITE = "https://grhappenings.com", O = { Origin: SITE, "Content-Type": "application/json" };
let ip = 0; const nextIp = () => "203.0.113." + (++ip);
const post = (m, path, body, h = {}) => m.dispatchFetch(SITE + "/api" + path, { method: "POST", headers: { ...O, "CF-Connecting-IP": h.ip || nextIp(), ...h }, body: JSON.stringify(body) });
const lastCode = () => /(\d{6}) is your/.exec(sent.at(-1).subject)[1];
let pass = 0; const t = async (name, fn) => { await fn(); pass++; console.log("ok -", name); };

const m = mf();
await t("json responses carry nosniff + no-store", async () => {
  const r = await m.dispatchFetch(SITE + "/api/health");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.headers.get("cache-control"), "no-store");
});
await t("request ok, second request for same email within 60s -> 429 with Retry-After", async () => {
  let r = await post(m, "/auth/request", { email: "a@example.com", returnTo: SITE + "/" });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); assert.equal(sent.length, 1);
  r = await post(m, "/auth/request", { email: "a@example.com", returnTo: SITE + "/" });
  assert.equal(r.status, 429); const j = await r.json();
  assert.match(j.error, /wait \d+ seconds/); assert.ok(j.retryAfter > 0 && j.retryAfter <= 60); assert.ok(+r.headers.get("retry-after") > 0);
  assert.equal(sent.length, 1);
});
await t("code verify -> session, cookie HttpOnly Secure SameSite=Lax Path=/ Max-Age=400d, profile returns session for self-healing", async () => {
  const r = await post(m, "/auth/code", { email: "a@example.com", code: lastCode() });
  assert.equal(r.status, 200); const j = await r.json(); assert.match(j.session, /^[a-f0-9]{64}$/);
  const c = r.headers.get("set-cookie");
  for (const p of ["grh_s=" + j.session, "Max-Age=34560000", "Path=/;", "HttpOnly", "SameSite=Lax", "Secure"]) assert.ok(c.includes(p), p + " in " + c);
  const p = await m.dispatchFetch(SITE + "/api/profile", { headers: { Cookie: "grh_s=" + "0".repeat(64) + "; grh_s=" + j.session } });
  assert.equal(p.status, 200);
  const pj = await p.json();
  assert.equal(pj.profile.email, "a@example.com");
  assert.equal(pj.session, j.session);
});
await t("old Bearer-only session on grhappenings.com gets moved into the cookie", async () => {
  await post(m, "/auth/request", { email: "bearer@example.com" });
  const j = await (await post(m, "/auth/code", { email: "bearer@example.com", code: lastCode() })).json();
  const p = await m.dispatchFetch(SITE + "/api/profile", { headers: { Authorization: "Bearer " + j.session } });
  assert.equal(p.status, 200); assert.ok((p.headers.get("set-cookie") || "").includes("grh_s=" + j.session));
  const p2 = await m.dispatchFetch(SITE + "/api/profile", { headers: { Cookie: "grh_s=" + j.session } });
  assert.equal(p2.status, 200); assert.equal(p2.headers.get("set-cookie"), null);
});
await t("wrong code 5x locks; a new request doesn't reset the count", async () => {
  await post(m, "/auth/request", { email: "lock@example.com" }); const good = lastCode();
  const bad = good === "000000" ? "111111" : "000000";
  for (let i = 1; i <= 4; i++) assert.equal((await post(m, "/auth/code", { email: "lock@example.com", code: bad })).status, 400);
  assert.equal((await post(m, "/auth/code", { email: "lock@example.com", code: bad })).status, 429);
  assert.equal((await post(m, "/auth/code", { email: "lock@example.com", code: good })).status, 429);
  const r = await post(m, "/auth/request", { email: "lock@example.com" }); // cooldown (60s) -> 429 either way
  assert.equal(r.status, 429);
});
await t("tries carry over to a fresh code (simulated after cooldown)", async () => {
  const m2 = mf(); const e = "carry@example.com";
  await post(m2, "/auth/request", { email: e }); const c1 = lastCode(), bad = c1 === "000000" ? "111111" : "000000";
  for (let i = 0; i < 3; i++) await post(m2, "/auth/code", { email: e, code: bad });
  const kv = await m2.getKVNamespace("KV"); await kv.delete("rl:em1:" + e); // pretend 60s passed
  assert.equal((await post(m2, "/auth/request", { email: e })).status, 200);
  assert.equal(JSON.parse(await kv.get("c:" + e)).n, 3);
  await m2.dispose();
});
await t("per-email hourly cap of 5", async () => {
  const m2 = mf(); const kv = await m2.getKVNamespace("KV"), e = "hour@example.com";
  for (let i = 0; i < 5; i++) { assert.equal((await post(m2, "/auth/request", { email: e })).status, 200); await kv.delete("rl:em1:" + e); }
  const r = await post(m2, "/auth/request", { email: e }); assert.equal(r.status, 429); assert.match((await r.json()).error, /minutes/);
  await m2.dispose();
});
await t("per-IP cap: 10 requests / 10 min", async () => {
  const m2 = mf();
  for (let i = 0; i < 10; i++) assert.equal((await post(m2, "/auth/request", { email: `ip${i}@example.com` }, { ip: "198.51.100.7" })).status, 200);
  assert.equal((await post(m2, "/auth/request", { email: "ip99@example.com" }, { ip: "198.51.100.7" })).status, 429);
  await m2.dispose();
});
await t("honeypot filled -> same ok response, no email, no KV writes", async () => {
  const n = sent.length;
  const r = await post(m, "/auth/request", { email: "bot@example.com", website: "http://spam" });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); assert.equal(sent.length, n);
  assert.equal(await (await m.getKVNamespace("KV")).get("c:bot@example.com"), null);
});
await t("malformed returnTo -> 400; foreign returnTo -> falls back to SITE_URL", async () => {
  let r = await post(m, "/auth/request", { email: "r@example.com", returnTo: "not a url" }); assert.equal(r.status, 400);
  r = await post(m, "/auth/request", { email: "r2@example.com", returnTo: "https://evil.example/x" }); assert.equal(r.status, 200);
  assert.ok(sent.at(-1).text.includes("https://grhappenings.com/?signin="));
});
await t("CORS: localhost rejected without DEV; pages.dev & github.io allowed", async () => {
  for (const o of ["http://localhost:8788", "http://127.0.0.1:3000"]) {
    const r = await m.dispatchFetch("https://grh-profiles.grhappenings.workers.dev/auth/request", { method: "POST", headers: { Origin: o, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(r.status, 403, o); assert.equal(r.headers.get("access-control-allow-origin"), null);
  }
  for (const o of ["https://kjt8bhsyh6-sketch.github.io", "https://grhappenings.pages.dev", "https://abc.grhappenings.pages.dev"]) {
    const r = await m.dispatchFetch("https://grh-profiles.grhappenings.workers.dev/health", { method: "OPTIONS", headers: { Origin: o } });
    assert.equal(r.status, 204, o); assert.equal(r.headers.get("access-control-allow-origin"), o);
  }
  const x = await m.dispatchFetch(SITE + "/api/profile", { method: "OPTIONS", headers: { Origin: "https://evil.example" } }); assert.equal(x.status, 403);
});
await t("DEV=1 allows localhost; preview only with DEV", async () => {
  const d = mf({ DEV: "1", GMAIL_RELAY_URL: "", GMAIL_RELAY_SECRET: "" });
  const r = await d.dispatchFetch("http://localhost:8787/api/auth/request", { method: "POST", headers: { Origin: "http://localhost:8788", "Content-Type": "application/json" }, body: JSON.stringify({ email: "dev@example.com", returnTo: "http://localhost:8788/" }) });
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.preview, true); assert.match(j.code, /^\d{6}$/);
  await d.dispose();
  const p = mf({ GMAIL_RELAY_URL: "", GMAIL_RELAY_SECRET: "" });
  const r2 = await post(p, "/auth/request", { email: "prod@example.com" }); assert.equal(r2.status, 503); assert.equal((await r2.json()).code, undefined);
  await p.dispose();
});
await m.dispose();
console.log(`\n${pass} passed`);
