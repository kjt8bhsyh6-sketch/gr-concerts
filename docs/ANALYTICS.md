# Analytics

Two free, cookieless tools. No personal data, no cookies, no ad trackers.

## 1. GoatCounter — pageviews + custom events
Dashboard: https://grhappenings.goatcounter.com (events show up as paths in the main list; filter by prefix).
Loaded on every page via `count.js`; events come from `track.js` (one delegated listener) and `profiles.js`.

| Event path | Meaning |
|---|---|
| `tickets/<page>/<show>` | Ticket / info link tapped (per show) |
| `tickets-venue/<page>/<venue>` | Same tap, rolled up per venue |
| `tap/<page>/bio/<show>` | "Who is this?" opened |
| `tap/<page>/apple-calendar/<show>`, `.../google-calendar/<show>` | Add one show to calendar |
| `tap/<page>/subscribe-calendar/apple\|google` | Subscribe to the whole calendar |
| `download/<page>/ics/<file>` | Any other `.ics` / webcal link clicked |
| `tap/<page>/share/<show>` | Share button |
| `tap/<page>/going\|interested/<show>` | Marked a show |
| `tap/<page>/email-signup-start/<page>` | Focused the alert email box (once per page load) |
| `tap/<page>/email-signup/<page>` | Submitted the alert sign-up form (Buttondown confirms by email; confirmed counts are in Buttondown) |
| `outbound/<page>/<host>` | Any other external link |
| `campaign/<source>/<medium>/<campaign>` | Arrived with `utm_source`/`ref`/`source` (once per session) |
| `referrer/<host>` | Arrived from another site (once per session) |
| `app/launch-standalone` | Opened as home-screen app |
| `profile/link-requested`, `profile/signin`, `profile/pick-open`, `profile/saved`, `profile/signout`, `profile/deleted` | Account events (profiles.js) |

Tip: tag links you share, e.g. `https://grhappenings.com/?utm_source=instagram&utm_medium=social&utm_campaign=halloween`.

## 2. Cloudflare Web Analytics — traffic, Core Web Vitals
Dashboard: Cloudflare → account → Analytics & Logs → Web Analytics → grhappenings.com.
The beacon is loaded by `track.js` only on grhappenings.com and only when `CF_BEACON_TOKEN` is set.

**Setup (one time):** the current API token can't create Web Analytics sites, so add it in the dashboard:
Web Analytics → Add a site → `grhappenings.com` → copy the `token` from the JS snippet → paste into
`CF_BEACON_TOKEN` in `track.js`. (Alternatively enable "automatic setup" for the Pages project, then leave the token empty to avoid double counting.)
