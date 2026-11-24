# grh-profiles Worker

This directory is the Cloudflare Worker for Grand Rapids Happenings profiles, plus `POST /submit-event`.

**Do not deploy from this staging branch with a bare `wrangler deploy`.** That command publishes the top-level (production) Worker `grh-profiles` onto `grhappenings.com/api/*`. This branch is for the staging environment only.

## Staging deploy (for the box — not run by the form build)

The form on the staging site posts to `https://grh-profiles-staging.grhappenings.workers.dev/submit-event`. GitHub Pages does not run this Worker. Until the steps below succeed, the page can validate a submission but cannot store one.

1. Create a KV namespace for staging submissions. Copy its id over `REPLACE_STAGING_KV_ID` in `wrangler.toml` under `[env.staging]`. Do not point staging at the production profile KV.
2. Put the Turnstile **secret** (never commit it, never put it in `wrangler.toml`):

   ```sh
   wrangler secret put TURNSTILE_SECRET --env staging
   ```

   Staging uses Cloudflare’s documented test secret, which pairs with sitekey `1x00000000000000000000AA` (always passes):

   `1x0000000000000000000000000000000AA`

   Fail-path test pair (always fails, visible widget). Sitekey / secret:

   `2x00000000000000000000AB` / `2x0000000000000000000000000000000AA`

3. Deploy **only** the staging environment. `[env.staging]` sets `workers_dev = true`, `routes = []` (so the inheritable production route `grhappenings.com/api/*` is not taken), and its own `SUBMISSIONS` binding:

   ```sh
   wrangler deploy --env staging
   ```

Confirm the dry run shows worker name `grh-profiles-staging`, no route on `grhappenings.com`, and no production KV id.

## What `/submit-event` stores

KV binding `SUBMISSIONS`, key `pending:<America/Detroit ISO time>:<random id>`. Value: event fields, submitter name and email, `receivedAt` in America/Detroit, `status: "pending"`, and `turnstileSuccess: true`. The Turnstile token is not stored. The visitor IP is not stored; the rate-limit key is `rl:submit:` plus a SHA-256 of the IP, capped at 5 writes per hour. Siteverify is called without `remoteip`. There is no public list endpoint. No path writes `concerts.js` or sends mail.

Production’s top-level `SUBMISSIONS` binding stays commented out (`REPLACE_PRODUCTION_KV_ID`) until a production ship. `TURNSTILE_SECRET` stays a secret on both environments.

## Tests

```sh
node test/submit-event.test.mjs
```

Run from `worker/`. No npm packages. The older auth tests use Miniflare (`node test/auth.test.mjs` after a local `npm i --no-save miniflare@4`); that install is not required for the submit-event tests.
