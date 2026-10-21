#!/usr/bin/env node
// Lists concerts.js shows whose `artist` has no entry in bios.js (no "Who is this?" button)
// and writes them to data/pending-bios.json for review. Nothing here is shown on the site.
// Usage: node scripts/pending-bios.js   (run from repo root or anywhere)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
for (const f of ['concerts.js', 'bios.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^\s*(const|let) /gm, 'var '), ctx);
}
const BIOS = ctx.BIOS || {};
const byArtist = new Map();
for (const s of ctx.CONCERTS || []) {
  const b = BIOS[s.artist];
  if (b && b.text && b.text.trim()) continue;
  const e = byArtist.get(s.artist) || { artist: s.artist, week: s.week, dates: [], venue: s.venue, link: s.link, added: s.added };
  e.dates.push(s.date);
  if (['this', 'next', 'later'].indexOf(s.week) < ['this', 'next', 'later'].indexOf(e.week)) e.week = s.week;
  byArtist.set(s.artist, e);
}
const order = { this: 0, next: 1, later: 2 };
const pending = [...byArtist.values()].sort((a, b) => (order[a.week] ?? 3) - (order[b.week] ?? 3) || a.dates[0].localeCompare(b.dates[0]));
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'pending-bios.json'),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: pending.length, pending }, null, 2) + '\n');
const soon = pending.filter(p => p.week === 'this' || p.week === 'next').length;
console.log(`pending-bios: ${pending.length} shows without a bio (${soon} this/next week) -> data/pending-bios.json`);
