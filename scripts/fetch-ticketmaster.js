// Nightly: asks the Ticketmaster Discovery API (free tier) for upcoming Grand Rapids music events
// and writes ones NOT already on the site to data/pending-shows.json for Bill to review.
// It never edits concerts.js. Needs env TICKETMASTER_API_KEY; without it, it exits cleanly.
const fs = require('fs'), path = require('path');
const { loadData, ROOT } = require('./load-data');
const KEY = process.env.TICKETMASTER_API_KEY;
const OUT = path.join(ROOT, 'data', 'pending-shows.json');
if (!KEY) { console.log('TICKETMASTER_API_KEY not set — skipping Ticketmaster fetch.'); process.exit(0); }

const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const t12 = hm => { if (!hm) return 'TBA'; let [h, m] = hm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };

(async () => {
  const { CONCERTS } = loadData();
  const known = CONCERTS.map(c => ({ d: c.date, a: norm(c.artist) }));
  const onSite = (date, name) => { const n = norm(name); return known.some(k => k.d === date && (k.a.includes(n) || n.includes(k.a))); };
  const start = new Date(), end = new Date(Date.now() + 60 * 864e5);
  const z = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const found = [];
  for (let page = 0; page < 5; page++) {
    const q = new URLSearchParams({ apikey: KEY, classificationName: 'music', latlong: '42.9634,-85.6681', radius: '20', unit: 'miles',
      startDateTime: z(start), endDateTime: z(end), size: '100', page: String(page), sort: 'date,asc' });
    const r = await fetch('https://app.ticketmaster.com/discovery/v2/events.json?' + q);
    if (!r.ok) { console.error('Ticketmaster API error', r.status, (await r.text()).slice(0, 200)); process.exit(r.status === 401 ? 1 : 0); }
    const j = await r.json(), evs = (j._embedded && j._embedded.events) || [];
    for (const e of evs) {
      const v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
      const date = e.dates && e.dates.start && e.dates.start.localDate; if (!date) continue;
      const genre = (e.classifications && e.classifications[0] && e.classifications[0].genre && e.classifications[0].genre.name) || 'Music';
      found.push({ artist: e.name, venue: v.name || '', city: (v.city && v.city.name) || '', date, time: t12(e.dates.start.localTime),
        genre: genre === 'Undefined' ? 'Music' : genre, link: e.url, ticketmaster_id: e.id, status: e.dates.status && e.dates.status.code,
        on_site: onSite(date, e.name) });
    }
    if (!j.page || page + 1 >= j.page.totalPages) break;
    await new Promise(r => setTimeout(r, 600)); // stay well under the rate limit
  }
  const seen = new Set();
  const candidates = found.filter(c => !c.on_site && !seen.has(c.ticketmaster_id) && seen.add(c.ticketmaster_id)).map(({ on_site, ...c }) => c);
  // keep stable output (only the date stamp changes) so nightly commits stay small
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const same = JSON.stringify(prev.candidates) === JSON.stringify(candidates);
  if (same) { console.log('No change in pending shows.'); return; }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    note: 'UNVERIFIED candidates from Ticketmaster. NOT shown on the site. Check each one, then copy good ones into concerts.js (add week + added date).',
    fetched: new Date().toISOString(), source: 'Ticketmaster Discovery API', candidates }, null, 2) + '\n');
  console.log(`Wrote ${candidates.length} candidate shows to data/pending-shows.json (${found.length} fetched).`);
})().catch(e => { console.error('Fetch failed:', e.message); process.exit(0); });
