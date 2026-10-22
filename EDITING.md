# How to edit the site
**Concerts:** open `concerts.js` (on GitHub, click the pencil icon). Each show is one line in `{ }`. Change the words inside quotes. `week` is "this", "next" or "later" (anything after next week; shown under "Coming Up"); date is YYYY-MM-DD. To add a show, copy a line; to remove, delete it. Update `LAST_UPDATED` too. Click "Commit changes" — the site updates in a minute or two.
**Venues we cover** (the Venue filter is built automatically from the `venue` names in `concerts.js`, so spell them exactly like this): The Intersection (main room / The Stache / Elevation), The Pyramid Scheme, GLC Live at 20 Monroe (formerly 20 Monroe Live), Van Andel Arena (concerts and shows only; Griffins/Gold games go in `sports.js`), DeVos Performance Hall, Dr. Grins (at The B.O.B.) (comedy, genre "Comedy"), Grand Rapids Civic Theatre, Wealthy Theatre (1130 Wealthy St SE; also called "Wealthy Street Theatre"; one venue), St. Cecilia Music Center, Acrisure Amphitheater (summer season), Frederik Meijer Gardens & Sculpture Park (1000 E Beltline Ave NE; Fifth Third Bank Summer Concerts at the amphitheater, Autumn Weekends live music, jazz brunches and other ticketed shows; holiday events like ENLIGHTEN go in `seasonal.js`; calendar https://www.meijergardens.org/calendar/), The Big Room (975 Ottawa Ave NW; run with The Pyramid Scheme), Tip Top Deluxe Bar & Grill (760 Butterworth St SW; tickets via TicketWeb, listed at https://www.ticketmaster.com/tip-top-deluxe-bar-grill-tickets-grand-rapids/venue/341523), Midtown GR (at Studio Park) (123 Ionia Ave SW; calendar https://www.themidtowngr.com/shows-events), Speciation Artisan Ales (928 Wealthy St SE; free no-cover shows and Sunday jazz jam; calendar https://speciationartisanales.com/events), Calvin University Chapel / Covenant Fine Arts Center (3201 Burton St SE; calendar https://calvin.edu/arts/events), GVSU Haas Center for Performing Arts (Allendale; calendar https://www.gvsu.edu/mtd/events-7; student recitals and workshops are not listed), Fountain Street Church (24 Fountain St NE; its own events page shows a robot check to automated tools, so use https://www.ticketmaster.com/fountain-street-church-tickets-grand-rapids/venue/65615), Lowell Arts at Sound Check (621 E Main St, Lowell; Nov–Apr concert series; calendar https://www.lowellarts.org/music-concerts).
**Text:** headline, section titles and footer are in `index.html` — just change the words between tags.
**Colors:** top of `style.css`, the `:root` line. Replace the color codes (e.g. `#e4572e`).
**Seasonal Events** (ghost tours, Christmas markets, holiday lights) have their own page, `seasonal.html` (third segment of the Concerts | Sports | Seasonal toggle; logic in `seasonal-app.js`). They no longer appear on the Concerts page. To edit them open `seasonal.js`. Each event is one line in `{ }`: `type` is the tag, `name`, `location`, `when` is free text shown as written (e.g. "Nov 18–Dec 24 · Wed–Sun"), `sort` is the start date YYYY-MM-DD used for ordering, `end` (optional) is the last date YYYY-MM-DD, copied from the dates in `when` (leave it off for a one-day event), `link` is the event page. The page shows events running this week or next by default. Copy a line to add one; delete a line to remove it (e.g. remove ghost tours after Oct 31).

## New-show tracking (NEW badge + Just Announced)
Every show and seasonal event has `added:"YYYY-MM-DD"`, the day you put it on the site. **When you add a show, set `added` to today's date.** Anything added in the last 7 days gets a green **NEW** badge and is listed at the top under "Just Announced" (newest first). You can change the 7 days and the list length in `config.js` (`NEW_DAYS`, `JUST_ANNOUNCED_MAX`).

## Calendar feed, sharing, favorites, filters
These all work on their own. The page builds them from `concerts.js`:
- Each show has **I'm going** (saved only in the visitor's browser), **Share**, **Apple** (.ics download, was "+ Calendar") and **Google Cal** buttons. There are Venue / Genre / New only / My shows filters.
- `concerts.ics` is the all-shows calendar people can subscribe to. The nightly GitHub Action rebuilds it. If you edit shows and want it updated right away, go to the **Actions** tab, open **Nightly update**, and click **Run workflow**. (Or run `node scripts/build-ics.js` on a computer.)
- Google event info (schema.org JSON-LD) is added automatically.

## Weekly email (draft only — nothing is sent automatically)
Run `node scripts/weekly-email.js weekly-email.md` to get a markdown draft (Just announced / This week / Seasonal). Paste it into a new Buttondown email, check it, and send it yourself. Buttondown free covers 100 subscribers. Automatic RSS-to-email would cost $9/month, so it isn't used.

## Turning on "Submit an event" (free)
1. Create a Google Form (forms.google.com) with fields: Event name, Venue, Date, Time, Link, Your email.
2. Click **Send**, then the link icon, and copy the link.
3. In `config.js`, paste it: `SUBMIT_FORM_URL: "https://forms.gle/..."`, then commit. The section appears. Answers go to your Google account; add good ones to `concerts.js` yourself.

## Turning on comments (giscus, free; commenters need a GitHub account)
1. Repo **Settings**: tick **Features > Discussions**.
2. Install the giscus app on this repo: https://github.com/apps/giscus
3. Go to https://giscus.app, enter `kjt8bhsyh6-sketch/gr-concerts`, and pick category "Announcements" (or "General"). Copy `data-repo`, `data-repo-id`, `data-category` and `data-category-id` into `CONFIG.GISCUS` in `config.js`, then commit. Moderate comments in the repo's Discussions tab.

## Ticketmaster suggestions (free, review only)
Each night the **Nightly update** Action asks Ticketmaster (free API: 5,000 calls/day) for music events within 20 miles of Grand Rapids. It saves ones that aren't already on the site to `data/pending-shows.json`. **Nothing from there is shown on the site.** Check each one, then copy the good ones into `concerts.js` (add `week` and `added`). Without the key, the job just skips this step.
To turn it on:
1. Sign up free at https://developer-acct.ticketmaster.com/user/register, then open "My Apps" and copy the **Consumer Key**.
2. In the repo, go to **Settings > Secrets and variables > Actions > New repository secret**. Name it `TICKETMASTER_API_KEY` and paste the key.
3. Go to **Settings > Actions > General > Workflow permissions** and choose **Read and write** (needed so the job can save its files).
4. Run it once from the **Actions** tab to test. Follow Ticketmaster's terms: link to their ticket pages and don't copy their images.

## Legal pages and affiliate links
`privacy.html` and `terms.html` are linked from the footer on every page. The footer also has the line "Some ticket links may earn us a small commission at no extra cost to you." Edit the wording in those files directly, and update the "Last updated" date when you do. Privacy questions go to bill.jenkins+gr@mail.grokbot.com.

**Optional `affiliate` field** in `concerts.js`: add `affiliate:"https://..."` to a show. The Tickets button then uses that URL (marked `rel="sponsored"`). Without it, the button uses `link`. Right now no shows have one. Keep `link` as the plain official URL either way.
Rules:
1. **The official seller stays primary.** An affiliate URL must point to the same official seller/box office as `link` (e.g. a Ticketmaster or venue partner link for that same event), never to a different or more expensive seller.
2. **No resale links**, unless the show is sold out at the official seller. Then label it in the listing (e.g. add "(SOLD OUT – resale)" to the artist text).
3. **Grand Rapids Symphony shows always keep the Symphony box office link.** Never add an affiliate to them.
4. Commissions never decide which shows get listed.

## Sports page (sports.html)
Edit **`sports.js`**. The top nav and footer link Concerts and Sports on every page.
- **GAMES:** one line per HOME game: `team` (must match a name in `TEAMS`), `opponent`, `date` "YYYY-MM-DD", `time` "7:00 PM", `venue`, `link`, `added`. Set `added` to today so the game gets a NEW badge for 7 days. Past games hide themselves. Each card gets Tickets, I'm going, Share, + Calendar and Google buttons. There's also a Team filter.
- **Ticket links must be the team's official seller:**
  - Griffins: https://griffinshockey.evenue.net/events/S (the Buy Tickets link on griffinshockey.com/schedule/home-schedule)
  - Gold: the "Buy Tickets" link on grandrapids.gleague.nba.com/schedule (currently https://www.gofevo.com/group/2026274315?ref=W)
  - Never use resale sites.
- **SEASON_NOTES:** a short "Off-season" card for teams that aren't playing. When a schedule comes out, add its home games to `GAMES` and delete that team's note. Expected:
  - Rise: 2027 schedule (MLV said October), at Van Andel Arena
  - Whitecaps: 2027 schedule on milb.com/west-michigan
  - AC Grand Rapids: home opener Mar 19, 2027 at Amway Stadium; opponent TBA
- `SPORTS_UPDATED` is the date shown at the top.
- `node scripts/build-ics.js` (also run by the nightly job) also writes `sports.ics`, a calendar of all home games.

## "Who is this?" bios (bios.js)
Each concert card gets a **Who is this?** button next to Tickets when `bios.js` has an entry for that show. It opens a small pop-up with a 2–3 sentence summary (closes with ×, Esc, or a click outside).
- One line per act: `"Artist text": { text: "Summary…", source: "https://…" },`
- The key must match the `artist` text in `concerts.js` **exactly** (same dashes, punctuation, and "(Nov 5–7)" style notes). If you rename a show in `concerts.js`, rename its key in `bios.js` too, or the button disappears. Repeat shows with the same artist text share one bio.
- `source` (optional, recommended) is shown as a link at the bottom: Wikipedia, the artist's official site, or the venue's event page.
- **Fact rule:** only write what a real source says. Keep it short and conservative (genre, where they're from, best-known songs/albums; for comedy/theater/symphony/family shows, what the show is). If you can't find reliable info (small local or tribute acts, dance parties), leave the act out. No entry = no button.
- No photos — text only.

**Daily check for new shows without a bio:** after updating `concerts.js`, run `node scripts/pending-bios.js`. It writes `data/pending-bios.json`, listing every show with no `bios.js` entry (This Week and Next Week first). For each new listing there, look for a real source (the artist's official site, the venue's event page, Bandsintown, Songkick, AllMusic or Wikipedia) and add a short 1–2 sentence entry with its `source` URL. If nothing reliable turns up, or the name is ambiguous (e.g. two bands with the same name), leave it out. Skip theme dance parties. The file is only a checklist; nothing in it shows on the site.

## Sports "Who is this?" bios (sports-bios.js)
Every card on sports.html gets the same **Who is this?** button and pop-up as the concerts page, when `sports-bios.js` has an entry for that team.
- Keys are team names **exactly** as written in `sports.js` — the `TEAMS` names (home teams) and each game's `opponent`.
- Game cards show the home team's bio, then the opponent's bio below it (if the opponent has an entry). Off-season cards show the home team only.
- New opponent? Add one line for it (2–3 sentences, facts only from the linked `source` page). Without an entry the pop-up just shows the home team.
- The pop-up code itself is shared in `bio-modal.js` (loaded by both index.html and sports.html); styles are the `.bio-*` rules in `style.css`. You shouldn't need to edit either.

## NEW badges & "New this week" (all pages)
- A card is **NEW** when its `added` date is within the last `NEW_DAYS` days (config.js, default 7), counted in the visitor's browser against today's date in Grand Rapids time.
- NEW cards get a gold **NEW** pill in the top corner, a warm tinted background with a gold glow, and a small "Added Oct 19" line. Older cards stay plain. The badge is real text, so it doesn't rely on color alone.
- Above the filters, a line reads "**N** new listings added this week" with a **Show only new** button. The button toggles the same "New only" checkbox. The line is hidden when nothing is new.
- The Just Announced box works the same as before (newest `added` first) and now uses the same gold NEW pill.
- So the badge means something, set `added` to the real day you add each item. Don't bulk-update old items.
- **Testing only:** add `?today=2026-10-25` to the URL to pretend it's that day. Add `&demo=mix` to also back-date 2 of every 3 items by 30 days, in your browser only, so you can see NEW and older cards side by side. Example: `index.html?today=2026-10-21&demo=mix`. Visitors never see this unless they use those URLs.

## Concerts page: "This Week and Next" + date picker
- By default the concerts page shows only **This Week** and **Next Week**. The `later` shows ("Coming Up") stay hidden, but they're still in the data and show up when someone picks dates.
- Under the Concerts | Sports toggle there's a **"Looking for something further out?"** box with a **Pick dates** button. It opens From/To date fields (From defaults to the Monday after next week ends, To defaults to 30 days after that), quick chips (**Next 30 days**, **Next 3 months**, **Next 6 months**, then the current month (rest of it), next month and the month after; they roll forward on their own). The pickers stop at **today + 6 months** (worked out from today's date in `app.js`, nothing hard-coded), so add shows at least that far out, plus **Show shows** and **Back to this week** buttons.
- When a range is applied, one section "Shows from Nov 15 to Dec 15" lists every show dated in that range (any `week` value), sorted by date, with a count. The venue/genre/new/My shows filters still apply. If nothing is in range it says "Nothing listed in those dates yet; check back, we add shows daily."
- The range goes in the URL so you can share it: `index.html?from=2026-11-15&to=2026-12-15`. Seasonal Events are on their own page, so they're not affected.
- To add far-out shows, just give them the right `date` (use `week:"later"`). You don't need to change anything else.

## Far-out shows (added Oct 19, 2026)
- Shows through Apr 30, 2027 are in `concerts.js` with `week:"later"`. They appear when someone picks dates (the hidden "Coming Up" section no longer says "through December").
- `time:"Showtimes on venue site"` means the venue lists the dates but not a time for that show (multi-day runs, GR Symphony nights). `time:"Time on ticket page"` is for GLC Live, where the venue listing has no times. Swap in the real time when it's posted.
- Multi-day runs with no per-show times are one entry on the first night, with the dates in the name, e.g. "Monster Jam (Mar 12–14)".

## Toggle + ?v= stamps
- Every page's toggle is `Concerts | Sports | Seasonal`, and the footer links match. When you add a page, add it to the toggle and footer on **every** `.html` file.
- After changing any file, bump every `?v=YYYYMMDDHHMM` stamp in all `*.html` (`date +%Y%m%d%H%M`), so phones fetch the new files.

## Date picker ("Looking for something further out?")
All three pages (Concerts, Sports, Seasonal) share one picker in `date-range.js`; you don't need to edit it. Visitors pick From/To dates (up to 6 months ahead) or tap a chip (Next 30 days / 3 months / 6 months / month names). The range goes in the link as `?from=YYYY-MM-DD&to=YYYY-MM-DD`, so it can be shared. "Back to this week" goes back to the normal view. Filters still apply.
- Concerts: "Shows from X to Y" (uses `date`).
- Sports: normal view shows home games this week and next week, plus the off-season cards. The picker shows "Games from X to Y".
- Seasonal: normal view shows events running or starting this week or next. The picker shows "Events from X to Y": any event whose `sort`–`end` dates overlap the range. So keep `end` filled in.

## Email signup + calendar boxes (all pages, added Oct 19, 2026)
- Every page has the same two boxes at the bottom, above the footer: **Get weekly alerts by email** and **Every … in your calendar**.
- All email boxes use the one Buttondown list `grconcerts` (form action `https://buttondown.com/api/emails/embed-subscribe/grconcerts`). Don't create other lists; only the heading/blurb text changes per page.
- Calendar feeds: Concerts → `concerts.ics`, Sports → `sports.ics` (home games), Seasonal → `seasonal.ics`. The subscribe links are filled in by `app.js`, `sports-app.js` and `seasonal-app.js` from `CONFIG.SITE_URL`.
- `node scripts/build-ics.js` rebuilds all three. Seasonal events become all-day events from `sort` through `end`. The file's DTEND is the day after `end`, because calendar apps treat the end date as exclusive. Each event's description has the event's type, `when`, and `link`. Re-run the script after editing `concerts.js`, `sports.js` or `seasonal.js`.

## "I'm going" + "Interested" (all pages, added Oct 19, 2026)
- Every listing card has two buttons side by side: **☆ I'm going** (turns into a yellow **★ Going**) and **♡ Interested** (turns into a teal **♥ Interested**). They are exclusive: picking one clears the other. Each uses `aria-pressed`, and the text and icon change too, so it doesn't rely on color alone.
- Marked cards get a stripe down the left edge: violet = going, teal = interested. NEW cards keep their gold glow.
- Saved only in the visitor's browser: localStorage `grc-going` (same key as before, so old picks are kept) and `grc-interested`. The shared code lives in `marks.js`, loaded before `app.js` / `sports-app.js` / `seasonal-app.js`. You shouldn't need to edit it.
- The filter bar's **My shows / My games / My events** box is now a dropdown: Everything, Going + Interested, ★ Going only, ♥ Interested only.
- Buttons sit in a 2-column grid. If one is left over at the end (e.g. Google), it takes the full row so phones stay tidy.
- **Testing only:** `?demoMarks=1` marks the first listing Going and the second Interested for that page load. Nothing is saved, and the visitor's real picks aren't touched. Example: `index.html?demoMarks=1`.

## Calendar titles for marked shows (added Oct 19, 2026)
- On cards you've marked, the **Apple** (.ics, formerly "+ Calendar") download and the **Google** link title start with `★ Going: ` or `♥ Interested: `. Unmarked cards are unchanged. The title uses the mark at the moment you click (not when the page loaded).
- Going events get `STATUS:CONFIRMED`. Interested events get `STATUS:TENTATIVE` and `TRANSP:TRANSPARENT` (show as free/tentative).
- Code: `GRICS.calendar(list, name, mark)` / `GRICS.google(c, mark)` in `ics.js`, with `mark` = `Marks.state(id)`. The subscribe feeds (`concerts.ics`, `sports.ics`, `seasonal.ics`) never pass a mark, so they're the same for everyone.
- Hint line under the Concerts and Sports calendar boxes: "Marked shows are saved to your calendar labeled ★ Going or ♥ Interested." (Seasonal cards have no per-card calendar buttons.)
- Test: `node scripts/test-mark-ics.js` prints SUMMARY/STATUS lines for each state.

## App name + icon (bookmarks / home screen, added Oct 19, 2026)
- Page titles start with the site name: `Grand Rapids Happenings` (home), `Grand Rapids Happenings · Sports / · Seasonal / · Privacy / · Terms`. Bookmarks use the title.
- `manifest.webmanifest`: name "Grand Rapids Happenings", short_name "GR Happenings", start_url/scope `./`, standalone, theme/background navy `#1b1b2f`.
- Home-screen label: iOS uses `<meta name="apple-mobile-web-app-title">` and Android uses short_name. Both are "GR Happenings", because the full name gets cut off (iOS shows about 12–14 characters). `application-name` is the full name.
- Icons are in `icons/`: apple-touch-icon.png (180), icon-192.png, icon-512.png, icon-maskable-512.png, favicon-32.png, favicon.ico. Design: a navy rounded square with an orange (#e4572e) "GR" and a white "Happenings" (DejaVu Sans Bold). The favicons show "GR" only.
- Every page `<head>` has the same block: manifest, icon, apple-touch-icon, application-name, apple-mobile-web-app-title/capable, theme-color. If you add a page, copy that block and use relative paths.

## Visitor profiles (profiles.js + worker/)
- profiles.js adds the "Sign in / Create profile" pill, the sign-up/edit sheets and the "★ picks for you this week" strip on index/sports/seasonal. Its option lists (genres, venues, teams, event types) are at the top of the file.
- Sessions: on grhappenings.com the site calls the Worker same-origin at `/api/*` (Worker route in worker/wrangler.toml; the Worker strips `/api`). Sign-in sets a first-party HttpOnly cookie `grh_s` (Path=/api, SameSite=Lax, Secure, 1 year, renewed on use at most daily). The token is also kept in localStorage as a fallback and still works as a Bearer token on workers.dev. The email carries a 6-digit code as well as the link (`POST /auth/code {email,code}`, 15 min, 5 tries), because an iPhone home-screen app has its own storage, separate from Safari where email links open.
- Deploy order: deploy the Worker (with its route) BEFORE Pages, or the new profiles.js will call /api while it still returns the Pages index page.
- The backend is the Cloudflare Worker in worker/ (deployed as https://grh-profiles.grhappenings.workers.dev, KV namespace GRH_PROFILES). Deploy: `cd worker && npx wrangler deploy`.
- Email: sign-in links are sent by sendSignInEmail() in worker/src/index.js. Provider is picked by which Worker secrets exist (see `/health` → `emailMode`):
  - **Gmail relay (primary, ACTIVE — `/health` reports `emailMode: gmail-relay`)**: a Google Apps Script web app we own, deployed under grhappenings@gmail.com, sends via `MailApp.sendEmail` (name 'Grand Rapids Happenings'; ~100/day consumer quota). The Worker POSTs JSON `{secret,to,subject,html,text}` to it with `redirect: 'follow'` (Apps Script replies 302 → script.googleusercontent.com; the follow-up GET returns `{ok:true,remaining}`). Set with `npx wrangler secret put GMAIL_RELAY_URL` and `npx wrangler secret put GMAIL_RELAY_SECRET` (values in the business secrets file; never commit them). Testing with curl: use `curl -L --data @body.json` WITHOUT `-X POST` (forcing POST on the redirect yields a 405 page). Replaced Mailjet as primary because Gmail/iCloud rejected Mailjet mail From mail.grokbot.com (DMARC).
  - **Mailjet (fallback — used automatically if the Gmail relay fails, or alone if the relay secrets are unset)**: free plan, no card, 200/day & 6,000/month, no custom domain needed — verify ONE sender address (bill.jenkins@mail.grokbot.com) by clicking Mailjet's activation email. Then `npx wrangler secret put MAILJET_API_KEY` and `npx wrangler secret put MAILJET_SECRET_KEY` (from Mailjet → Account → API keys). Optional `SENDER_EMAIL` var overrides the From address (must be a Mailjet-verified sender).
  - **Brevo (legacy, not in use)**: used only if `BREVO_API_KEY` is set and neither the Gmail relay nor Mailjet secrets are.
  - **PREVIEW (no secrets)**: link is shown on screen and logged, not emailed. Insecure — do not merge to main while in preview mode.
  - Deliverability note: without our own domain there's no DKIM/SPF alignment for mail.grokbot.com, so some messages may land in spam. A ~$10–12/yr domain (e.g. .com at Cloudflare Registrar at-cost) would let us authenticate the domain and also unlock Resend (3,000/mo free), MailerSend, SMTP2GO, Postmark, or Cloudflare Email Service.
