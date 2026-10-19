// Regenerates concerts.ics (the subscribable all-shows calendar) from concerts.js.
// Usage: node scripts/build-ics.js
const fs = require('fs'), path = require('path');
const { loadData, ROOT } = require('./load-data');
const ics = require('../ics.js');
const { CONCERTS } = loadData();
const list = CONCERTS.slice().sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(path.join(ROOT, 'concerts.ics'), ics.calendar(list, 'Grand Rapids Concerts'));
console.log(`Wrote concerts.ics (${list.length} shows)`);
