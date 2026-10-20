// Quick check: per-card .ics + Google title for each mark state. Run: node scripts/test-mark-ics.js
const ics = require('../ics.js');
const c = { artist: 'Test Band', venue: 'The Intersection', date: '2026-11-07', time: '8:00 PM', genre: 'Rock', link: 'https://example.com' };
for (const m of ['', 'going', 'interested']) {
  const out = ics.calendar([c], c.artist, m).split('\r\n').filter(l => /^(SUMMARY|STATUS|TRANSP):/.test(l));
  console.log(`[${m || 'unmarked'}]`, out.join(' | '), '| google text=' + new URL(ics.google(c, m)).searchParams.get('text'));
}
