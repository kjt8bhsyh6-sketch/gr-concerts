# How to edit the site
**Concerts:** open `concerts.js` (on GitHub, click the pencil icon). Each show is one line in `{ }`. Change the words inside quotes. `week` is "this" or "next"; date is YYYY-MM-DD. To add a show, copy a line; to remove, delete it. Update `LAST_UPDATED` too. Click "Commit changes" — the site updates in a minute or two.
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
