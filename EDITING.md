# How to edit the site
**Concerts:** open `concerts.js` (on GitHub, click the pencil icon). Each show is one line in `{ }`. Change the words inside quotes. `week` is "this", "next" or "later" (anything after next week; shown under "Coming Up"); date is YYYY-MM-DD. To add a show, copy a line; to remove, delete it. Update `LAST_UPDATED` too. Click "Commit changes" — the site updates in a minute or two.
**Venues we cover** (the Venue filter is built automatically from the `venue` names in `concerts.js`, so spell them exactly like this): The Intersection (main room / The Stache / Elevation), The Pyramid Scheme, GLC Live at 20 Monroe (formerly 20 Monroe Live), Van Andel Arena (concerts and shows only; Griffins/Gold games go in `sports.js`), DeVos Performance Hall, Dr. Grins (at The B.O.B.) (comedy, genre "Comedy"), Grand Rapids Civic Theatre, Wealthy Theatre (1130 Wealthy St SE; also called "Wealthy Street Theatre"; one venue), St. Cecilia Music Center, Acrisure Amphitheater (summer season), Frederik Meijer Gardens Amphitheater (summer series).
**Text:** headline, section titles and footer are in `index.html` — just change the words between tags.
**Colors:** top of `style.css`, the `:root` line. Replace the color codes (e.g. `#e4572e`).
**Seasonal Events** (ghost tours, Christmas markets, holiday lights): open `seasonal.js`. Each event is one line in `{ }`: `type` is the tag, `name`, `location`, `when` is free text shown as written (e.g. "Nov 18–Dec 24 · Wed–Sun"), `sort` is the start date YYYY-MM-DD used for ordering, `link` is the event page. Copy a line to add one; delete a line to remove it (e.g. remove ghost tours after Oct 31).

## New-show tracking (NEW badge + Just Announced)
Every show and seasonal event has `added:"YYYY-MM-DD"`, the day you put it on the site. **When you add a show, set `added` to today's date.** Anything added in the last 7 days gets a green **NEW** badge and is listed at the top under "Just Announced" (newest first). You can change the 7 days and the list length in `config.js` (`NEW_DAYS`, `JUST_ANNOUNCED_MAX`).

## Calendar feed, sharing, favorites, filters
These all work on their own. The page builds them from `concerts.js`:
- Each show has **I'm going** (saved only in the visitor's browser), **Share**, **+ Calendar** (.ics download) and **Google Cal** buttons. There are Venue / Genre / New only / My shows filters.
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
