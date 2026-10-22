// Builds a DRAFT weekly email (markdown) from the site data. It never sends anything.
// Usage: node scripts/weekly-email.js [output.md] [YYYY-MM-DD today]
// Paste the output into a new Buttondown email by hand and review before sending.
const fs = require('fs');
const { loadData } = require('./load-data');
const { CONCERTS, SEASONAL, CONFIG } = loadData();
const out = process.argv[2];
const today = process.argv[3] || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
const days = (a, b) => (Date.parse(a) - Date.parse(b)) / 864e5;
const fmt = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const site = (CONFIG.SITE_URL || 'https://grhappenings.com/');
const shows = CONCERTS.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
const upcoming = shows.filter(c => days(c.date, today) >= 0);
const fresh = upcoming.filter(c => days(today, c.added) <= 7);
const thisWeek = upcoming.filter(c => days(c.date, today) < 7);
const line = c => `- **${c.artist}** · ${c.venue} · ${fmt(c.date)}, ${c.time} · [Tickets/info](${c.link})`;
let md = `<!-- DRAFT generated ${today} from site data. Review, then paste into Buttondown. Not sent. -->\n`;
md += `Subject: This week in Grand Rapids live music (${fmt(today)})\n\n`;
md += `Hi friends! Here's what's on around Grand Rapids. Full list, filters and calendar links: ${site}\n\n`;
md += `## 🆕 Just announced\n${fresh.length ? fresh.slice(0, 10).map(line).join('\n') : '_No new shows added this week._'}\n\n`;
md += `## 🎸 This week\n${thisWeek.map(line).join('\n') || '_Quiet week!_'}\n\n`;
md += `## 🎄 Seasonal events\n${SEASONAL.slice().sort((a, b) => a.sort.localeCompare(b.sort)).map(e => `- **${e.name}** · ${e.location} · ${e.when} · [Info](${e.link})`).join('\n')}\n\n`;
md += `📅 Put every show in your calendar: subscribe to ${site}concerts.ics\n\n`;
md += `Know a show we missed? Reply to this email.\n\n— The Canasta Club\n\n_Always confirm details with the venue._\n`;
if (out) { fs.writeFileSync(out, md); console.log('Wrote', out); } else process.stdout.write(md);
