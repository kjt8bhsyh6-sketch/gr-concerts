// Filter event paths that track.js would send on production.
// Location is the staging host, so loading track.js hits the same early return
// as the live test site and does not register listeners or call the network.
global.location = { hostname: 'kjt8bhsyh6-sketch.github.io' };

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const T = require('../track.js');

function fakeDoc() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, target) { (listeners[type] || []).forEach(fn => fn({ target: target })); }
  };
}

function fakeTimers() {
  const pending = [];
  return {
    delay: T.SEARCH_DEBOUNCE_MS,
    pending: pending,
    schedule(fn, ms) {
      const timer = { fn: fn, ms: ms, cancelled: false, ran: false };
      pending.push(timer);
      return timer;
    },
    cancel(timer) { timer.cancelled = true; },
    runDue() {
      pending.filter(timer => !timer.cancelled && !timer.ran).forEach(timer => {
        timer.ran = true;
        timer.fn();
      });
    }
  };
}

test('the staging host returns before any analytics side effect', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'track.js'), 'utf8');
  const guard = src.indexOf('if (location.hostname === "kjt8bhsyh6-sketch.github.io") return;');
  const bind = src.indexOf('bindFilterEvents(document, send, null);');
  const beacon = src.indexOf('static.cloudflareinsights.com');
  const click = src.indexOf("navigator.sendBeacon('/api/public/click'");
  assert.ok(guard > 0 && bind > guard && beacon > guard && click > guard);
  assert.equal(T.SEARCH_DEBOUNCE_MS, 400);
  assert.deepEqual(Object.keys(T.FILTER_CONTROLS).sort(), ['f-genre', 'f-mine', 'f-new', 'f-venue']);
  assert.doesNotMatch(src.slice(0, guard), /stay22|viator/i);
  assert.match(src.slice(guard), /stay22\|viator/);
});

test('production filter paths omit search text', () => {
  const secret = 'jane.doe@example.com ?utm_source=secret&q=hidden';
  const paths = [
    T.filterPath('search', 'Jazz at St. Cecilia'),
    T.filterPath('search', secret),
    T.filterPath('venue', 'St. Cecilia Music Center'),
    T.filterPath('genre', 'Hip-Hop'),
    T.filterPath('genre', 'R&B'),
    T.filterPath('new', 'on'),
    T.filterPath('new', 'off'),
    T.filterPath('mine', 'everything'),
    T.filterPath('mine', 'all'),
    T.filterPath('mine', 'going'),
    T.filterPath('mine', 'interested'),
    T.filterPath('clear', ''),
    T.filterPath('venue', 'All venues'),
    T.filterPath('genre', 'All genres'),
    T.filterPath('venue', 'A'.repeat(200))
  ].map(ev => {
    assert.ok(ev && ev.path);
    console.debug('[grh] filter', ev.path);
    assert.equal(ev.path.includes('@'), false);
    assert.equal(ev.path.includes('jane'), false);
    assert.equal(ev.path.includes('utm_source'), false);
    assert.equal(ev.path.includes(' '), false);
    assert.equal(ev.title.includes('jane'), false);
    assert.equal(ev.title.includes('utm_source'), false);
    return ev.path;
  });
  assert.deepEqual(paths, [
    'filter/search',
    'filter/search',
    'filter/venue/st-cecilia-music-center',
    'filter/genre/hip-hop',
    'filter/genre/r-b',
    'filter/new/on',
    'filter/new/off',
    'filter/mine/everything',
    'filter/mine/all',
    'filter/mine/going',
    'filter/mine/interested',
    'filter/clear',
    'filter/venue/all-venues',
    'filter/genre/all-genres',
    'filter/venue/' + 'a'.repeat(80)
  ]);
  assert.equal(T.filterPath('search', '   ...   '), null);
  assert.equal(T.filterPath('', 'jazz'), null);
  assert.equal(T.filterPath('search', secret).title, 'Search');
});

test('search settles once, and only the concerts controls emit', () => {
  const sent = [];
  const logs = [];
  const timers = fakeTimers();
  const doc = fakeDoc();
  const orig = console.debug;
  console.debug = function () { logs.push(Array.prototype.join.call(arguments, ' ')); };
  try {
    T.bindFilterEvents(doc, (eventPath, title) => sent.push([eventPath, title]), timers);
    const box = { id: 'f-q', value: 'j' };
    doc.dispatch('input', box);
    box.value = 'ja';
    doc.dispatch('input', box);
    box.value = 'Jazz!';
    doc.dispatch('input', box);
    assert.equal(sent.length, 0);
    const waiting = timers.pending.filter(timer => !timer.cancelled);
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0].ms, 400);
    timers.runDue();
    assert.deepEqual(sent, [['filter/search', 'Search']]);

    box.value = 'jazz';
    doc.dispatch('input', box);
    timers.runDue();
    assert.equal(sent.length, 1);

    box.value = 'blues night';
    doc.dispatch('input', box);
    doc.dispatch('search', box);
    assert.deepEqual(sent, [['filter/search', 'Search'], ['filter/search', 'Search']]);
    assert.equal(timers.pending.filter(timer => !timer.cancelled && !timer.ran).length, 0);
    timers.runDue();
    assert.equal(sent.length, 2);

    box.value = '   ';
    doc.dispatch('input', box);
    timers.runDue();
    assert.equal(sent.length, 2);

    doc.dispatch('change', { id: 'f-venue', type: 'select-one', value: '20 Monroe Live' });
    doc.dispatch('change', { id: 'f-genre', type: 'select-one', value: 'Hip-Hop' });
    doc.dispatch('change', { id: 'f-new', type: 'checkbox', checked: true, value: 'on' });
    doc.dispatch('change', { id: 'f-mine', type: 'select-one', value: 'going' });
    doc.dispatch('change', {
      id: 'f-venue', type: 'select-one', value: '', selectedIndex: 0, options: [{ text: 'All venues' }]
    });
    doc.dispatch('change', { id: 'f-team', type: 'select-one', value: 'Griffins' });
    doc.dispatch('change', { id: 'f-type', type: 'select-one', value: 'Holiday' });
    doc.dispatch('change', { id: 'r-from', type: 'date', value: '2026-11-20' });
    const clear = { id: 'f-clear' };
    clear.closest = sel => (sel === '#f-clear' ? clear : null);
    doc.dispatch('click', clear);

    assert.deepEqual(sent.slice(2), [
      ['filter/venue/20-monroe-live', 'Filter: venue'],
      ['filter/genre/hip-hop', 'Filter: genre'],
      ['filter/new/on', 'Filter: new'],
      ['filter/mine/going', 'Filter: mine'],
      ['filter/venue/all-venues', 'Filter: venue'],
      ['filter/clear', 'Clear filters']
    ]);
    assert.deepEqual(logs, sent.map(row => '[grh] filter ' + row[0]));
    sent.forEach(row => {
      assert.equal(row[0].includes('jazz'), false);
      assert.equal(row[0].includes('blues'), false);
    });
  } finally {
    console.debug = orig;
  }
});
