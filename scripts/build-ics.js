// Regenerates concerts.ics (the subscribable all-shows calendar) from concerts.js.
// Usage: node scripts/build-ics.js
const fs = require('fs'), path = require('path');
const { loadData, ROOT } = require('./load-data');
const ics = require('../ics.js');
const { CONCERTS } = loadData();
ics.disambiguate(CONCERTS);
const list = CONCERTS.slice().sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(path.join(ROOT, 'concerts.ics'), ics.calendar(list, 'Grand Rapids Concerts'));
console.log(`Wrote concerts.ics (${list.length} shows)`);
// Sports home games -> sports.ics
const { GAMES, TEAMS } = loadData();
if (GAMES.length) {
  const sp = t => (TEAMS.find(x => x.name === t) || {}).sport || 'Sports';
  const hasVs = s => /^(vs\.|semifinal|championship|third-place|consolation)/i.test(s) || /\bvs\.\s/i.test(s);
  const ev = GAMES.slice().sort((a, b) => a.date.localeCompare(b.date)).map(g => ({ artist: hasVs(g.opponent) ? `${g.team} — ${g.opponent}` : `${g.team} vs. ${g.opponent}`, venue: g.venue, date: g.date, time: g.time, genre: sp(g.team), link: g.link, added: g.added }));
  fs.writeFileSync(path.join(ROOT, 'sports.ics'), ics.calendar(ev, 'Grand Rapids Sports'));
  console.log(`Wrote sports.ics (${ev.length} games)`);
}
// Seasonal events -> seasonal.ics (all-day; DTEND is the day after `end`, since all-day ends are exclusive)
const { SEASONAL } = loadData();
if (SEASONAL && SEASONAL.length) {
  const p = n => String(n).padStart(2, '0');
  const ymd = s => s.replace(/-/g, '');
  const nextDay = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`; };
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = l => { const o = []; while (l.length > 74) { o.push(l.slice(0, 74)); l = ' ' + l.slice(74); } o.push(l); return o.join('\r\n'); };
  const list = SEASONAL.slice().sort((a, b) => a.sort.localeCompare(b.sort));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GR Concerts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Grand Rapids Seasonal Events', 'X-WR-TIMEZONE:America/Detroit', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    ...list.flatMap(e => ['BEGIN:VEVENT', `UID:${ics.slug(e.sort + '-' + e.name)}@gr-seasonal`, `DTSTAMP:${ymd(e.added || e.sort)}T120000Z`,
      `DTSTART;VALUE=DATE:${ymd(e.sort)}`, `DTEND;VALUE=DATE:${nextDay(e.end || e.sort)}`,
      `SUMMARY:${esc(e.name)}`, `LOCATION:${esc(e.location + ', Grand Rapids, MI')}`,
      `DESCRIPTION:${esc(`${e.type}. ${e.when}. Info: ${e.link} (confirm details with the organizer)`)}`,
      ...(e.link ? [`URL:${e.link}`] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT']), 'END:VCALENDAR'];
  fs.writeFileSync(path.join(ROOT, 'seasonal.ics'), lines.map(fold).join('\r\n') + '\r\n');
  console.log(`Wrote seasonal.ics (${list.length} events)`);
}
