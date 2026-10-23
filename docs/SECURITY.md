# Security notes (grhappenings.com)

## What's in place (branch security-fixes)
- `_headers` (Pages, every page): HSTS 1 year + includeSubDomains, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy, and a CSP shipped as **Content-Security-Policy-Report-Only** (logs violations in the browser console, blocks nothing).
- Worker (`worker/src/index.js`): JSON responses send `nosniff` + `Cache-Control: no-store`; sign-in rate limits in KV
  (per email: 1 request / 60 s and 5 / hour; per IP: 10 requests and 20 code checks / 10 min; 5 wrong codes lock that email for 15 min,
  and asking for a new code doesn't reset the count); honeypot field `website`; non-expiring KV sessions + 400-day sliding cookies; CORS/returnTo allowlist
  = grhappenings.com, www, github.io (localhost/pages.dev previews and preview mode only with `DEV=1`); preview mode without DEV -> 503;
  malformed returnTo -> 400.
- Front end: the session is persisted in the HttpOnly cookie (Path=/), localStorage, and IndexedDB with mutual self-healing;
  card/bio links must be http(s) or become `#`.

## Turning the CSP on for real
1. After deploy, open every page (Concerts, Sports, Seasonal, About, Privacy, Terms), signed out and signed in, on desktop and iPhone
   (also the home-screen app). Check the console for `[Report Only]` CSP messages.
2. If clean for about a week, in `_headers` rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` and redeploy Pages.
3. If the inline redirect `<script>` in any page's `<head>` changes, recompute its hash (command in `_headers`) first.
   Turning on giscus or the Cloudflare beacon is already allowed.

## Cloudflare WAF rate-limiting rule (free plan, do in the dashboard, not applied by us)
Free plan allows 1 rate-limiting rule, counted per IP over 10 seconds, blocking for 10 seconds.
1. dash.cloudflare.com -> select **grhappenings.com** -> **Security** -> **Security rules** (older UI: **Security -> WAF -> Rate limiting rules**)
   -> **Create rule** -> **Rate limiting rule**.
2. Rule name: `Sign-in throttle`.
3. If incoming requests match: **Edit expression** and paste:
   `(http.request.uri.path wildcard "/api/auth/*" and http.request.method eq "POST")`
   (or use the builder: URI Path *starts with* `/api/auth/` AND Request Method *equals* `POST`).
4. With the same characteristics: **IP** (the only choice on free).
5. When rate exceeds: **5** requests per **10 seconds**.
6. Then take action: **Block**, duration **10 seconds** (free-plan fixed). Response: default (429).
7. **Deploy**. Test: sign in normally once (should work), then Security -> Events should show nothing for that.
   This only stops bursts; the Worker's KV limits handle the slower abuse.

## Deploy steps (later, when Bill approves; Worker FIRST, then Pages)
1. Review/merge: `git checkout main && git merge security-fixes` (map-links can merge before or after; no overlapping hunks).
2. Tests: `cd worker && npm i --no-save miniflare@4 && node test/auth.test.mjs` (all pass).
3. Worker: `cd worker && npx wrangler deploy`. Do NOT set `DEV`. Check `curl -s https://grhappenings.com/api/health`
   -> `"emailMode":"gmail-relay"` and headers include `x-content-type-options: nosniff`, `cache-control: no-store`.
   Existing 1-year sessions keep working; they become 90-day on their next daily renewal.
4. Bump the `?v=` stamp in the HTML pages if profiles.js/app.js changed (so phones fetch the new JS), push main, then `scripts/deploy-pages.sh`.
5. Check: `curl -sI https://grhappenings.com/ | grep -iE 'strict|frame|permissions|content-security'`; sign in on desktop
   and on the iPhone home-screen app with the 6-digit code; reload, close and reopen: still signed in; DevTools -> Application ->
   Local Storage has no `grh-session` on grhappenings.com.
6. Optional HSTS preload later (hstspreload.org) only after confirming no subdomain needs plain http.

## Old GitHub Pages copy (kjt8bhsyh6-sketch.github.io/gr-concerts) - plan only, not done
Today it publishes the whole repo (including worker/, scripts/, EDITING.md) and full duplicate pages (200 + canonical + JS redirect).
Plan:
1. Make GitHub Pages publish from a separate branch `gh-pages` (Settings -> Pages -> Source: Deploy from branch `gh-pages` / root),
   instead of main.
2. That branch contains only stubs: for each of `index.html, sports.html, seasonal.html, about.html, privacy.html, terms.html`:
   `<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="https://grhappenings.com/PAGE">
   <meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=https://grhappenings.com/PAGE">
   <script>location.replace("https://grhappenings.com/PAGE"+location.search+location.hash)</script>
   <p>Moved to <a href="https://grhappenings.com/PAGE">grhappenings.com</a>.</p>` (PAGE = `` / `sports` / `seasonal` / ...),
   plus `404.html` that redirects to the home page, `concerts.ics`/`sports.ics`/`seasonal.ics` copies kept only if old calendar
   subscribers still pull them (check GoatCounter referrers first), and a `robots.txt` that ALLOWS crawling (so Google
   sees the noindex/refresh and drops the old URLs; `Disallow` would hide them).
3. After a few months with little traffic, remove `https://kjt8bhsyh6-sketch.github.io` from `ORIGINS` in the Worker and
   consider turning GitHub Pages off.

## Backups
`scripts/backup-kv.sh` exports profile keys (`p:*`) from the KV namespace to
`/home/box/business/backups/grhappenings/<YYYY-MM-DD>.json` (dir 700, file 600), keeping the newest 30.
Sessions, sign-in tokens and rate-limit keys are intentionally not exported (`PREFIX=""` exports everything).
Needs a Cloudflare token with Workers KV Storage: Read. Run daily from cron, e.g. `15 4 * * * /workspace/gr-concerts-site/scripts/backup-kv.sh`.

## Account security (Bill)
- Rotate the Cloudflare API token (scope: Account / Cloudflare Pages: Edit, Workers Scripts: Edit, Workers KV Storage: Edit;
  Zone grhappenings.com / Workers Routes: Edit); update the secrets file; revoke the old token.
- Rotate GoatCounter password + API token. Finish GitHub token change (fine-grained, this repo only, Contents + Workflows).
- 2FA (authenticator app or passkey, save recovery codes offline): Cloudflare, GitHub, grhappenings@gmail.com (most important: it sends
  every sign-in code), TikTok.
