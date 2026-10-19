# How to edit the site
**Concerts:** open `concerts.js` (on GitHub, click the pencil icon). Each show is one line in `{ }`. Change the words inside quotes. `week` is "this" or "next"; date is YYYY-MM-DD. To add a show, copy a line; to remove, delete it. Update `LAST_UPDATED` too. Click "Commit changes" — the site updates in a minute or two.
**Text:** headline, section titles and footer are in `index.html` — just change the words between tags.
**Colors:** top of `style.css`, the `:root` line. Replace the color codes (e.g. `#e4572e`).
**Seasonal Events** (ghost tours, Christmas markets, holiday lights): open `seasonal.js`. Each event is one line in `{ }`: `type` is the tag, `name`, `location`, `when` is free text shown as written (e.g. "Nov 18–Dec 24 · Wed–Sun"), `sort` is the start date YYYY-MM-DD used for ordering, `link` is the event page. Copy a line to add one; delete a line to remove it (e.g. remove ghost tours after Oct 31).
