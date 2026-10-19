// Regenerates concerts.ics (the subscribable all-shows calendar) from concerts.js.
// Usage: node scripts/build-ics.js
const fs = require('fs'), path = require('path');
const { loadData, ROOT } = require('./load-data');
const ics = require('../ics.js');
const { CONCERTS } = loadData();
const list = CONCERTS.slice().sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(path.join(ROOT, 'concerts.ics'), ics.calendar(list, 'Grand Rapids Concerts'));
console.log(`Wrote concerts.ics (${list.length} shows)`);
// Sports home games -> sports.ics
const { GAMES, TEAMS } = loadData();
if (GAMES.length) {
  const sp = t => (TEAMS.find(x => x.name === t) || {}).sport || 'Sports';
  const ev = GAMES.slice().sort((a, b) => a.date.localeCompare(b.date)).map(g => ({ artist: `${g.team} vs. ${g.opponent}`, venue: g.venue, date: g.date, time: g.time, genre: sp(g.team), link: g.link, added: g.added }));
  fs.writeFileSync(path.join(ROOT, 'sports.ics'), ics.calendar(ev, 'Grand Rapids Sports'));
  console.log(`Wrote sports.ics (${ev.length} games)`);
}
