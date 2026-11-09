// Pure checks for the Plan night helpers. No network and no production calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../plan-night.js');

test('Detroit wall time converts both sides of daylight saving', () => {
  assert.equal(new Date(P.zonedToMs(2026, 11, 8, 19, 0)).toISOString(), '2026-11-09T00:00:00.000Z');
  assert.equal(new Date(P.zonedToMs(2026, 7, 8, 19, 0)).toISOString(), '2026-07-08T23:00:00.000Z');
  assert.equal(P.formatStamp(P.zonedToMs(2026, 11, 8, 19, 0)), 'Nov 8, 2026 at 7:00 PM');
  assert.equal(P.stamp(P.zonedToMs(2026, 11, 8, 19, 0), "yyyy-MM-dd'T'HH:mm"), '2026-11-08T19:00');
  assert.equal(P.stamp(P.zonedToMs(2026, 11, 8, 19, 5), 'HHmm'), '1905');
});

test('dinner time follows the half-hour rule in PlanNightView', () => {
  const morning = P.zonedToMs(2026, 11, 10, 9, 0);
  const timed = P.initialDinner('2026-11-10', '8:00 PM', morning);
  assert.equal(timed.hasClock, true);
  assert.equal(timed.start, P.zonedToMs(2026, 11, 10, 20, 0));
  assert.equal(timed.dinnerAt, P.zonedToMs(2026, 11, 10, 18, 0));
  assert.equal(timed.end, P.zonedToMs(2026, 11, 10, 23, 0));
  assert.equal(timed.after, timed.end);
  assert.equal(P.dinnerHeading(timed.dinnerAt, timed.start), 'Dinner before, around 6:00 PM');
  assert.equal(P.drinksHeading(timed.after), 'Drinks around 11:00 PM');
  assert.equal(P.dinnerWarning(timed.dinnerAt, timed.start), '');
  assert.equal(P.drinksWarning(true, timed.end), P.DRINKS_ESTIMATE);
  const now = P.zonedToMs(2026, 11, 8, 19, 1);
  const start = P.zonedToMs(2026, 11, 8, 21, 1);
  assert.equal(P.dinnerAt(start, now), P.zonedToMs(2026, 11, 8, 19, 30));
  const exact = P.zonedToMs(2026, 11, 8, 19, 30);
  assert.equal(P.dinnerAt(exact + 2 * 3600000, exact), exact);
  const untimed = P.initialDinner('2026-11-10', 'Showtimes on venue site', morning);
  assert.equal(untimed.hasClock, false);
  assert.equal(untimed.start, null);
  assert.equal(untimed.dinnerAt, P.zonedToMs(2026, 11, 10, 17, 0));
  assert.equal(P.parseClock('7:30 PM').h, 19);
  assert.equal(P.parseClock('Time on ticket page'), null);
});

test('party, distance, and nearby limits match the app', () => {
  assert.equal(P.clampParty(0), 1);
  assert.equal(P.clampParty(2.6), 3);
  assert.equal(P.clampParty(40), 20);
  assert.equal(P.walkText(80), '1 min walk');
  assert.equal(P.walkText(1600), '20 min walk');
  assert.equal(P.walkText(1680), '1.0 mi');
  const rows = [
    { name: 'Far', distance: 4000, lat: 1, lon: 1 },
    { name: 'B', distance: 200, lat: 42.97, lon: -85.67 },
    { name: 'A', distance: 100, lat: 42.96, lon: -85.67 },
    { name: 'C', distance: 300, lat: 42.98, lon: -85.66 },
    { name: 'D', distance: 400, lat: 42.99, lon: -85.65 },
    { name: 'A', distance: 120, lat: 42.9601, lon: -85.6701 }
  ];
  const near = P.nearest(rows, 3);
  assert.deepEqual(near.map(item => item.name), ['A', 'B', 'C']);
  assert.equal(P.validCoord(42.96, -85.67), true);
  assert.equal(P.validCoord(48.85, 2.35), false);
  assert.equal(P.cityFromQuery('540 Leonard St NW, Grand Rapids, MI 49504'), 'Grand Rapids');
  assert.equal(P.cityFromQuery('Park Theatre, 248 S River Ave, Holland, MI 49423'), 'Holland');
  assert.equal(P.CENTERS['grand rapids'].lat, 42.96);
  assert.equal(P.CENTERS['grand rapids'].lon, -85.67);
});

test('booking and ride links carry the group, time, and destination', () => {
  const when = P.zonedToMs(2026, 11, 8, 18, 0);
  const spot = { name: 'Field & Fire', lat: 42.97, lon: -85.67, phone: '(616) 555-0100', website: 'https://example.com/menu', kind: 'dinner' };
  const links = P.bookingLinks(spot, 4, when, 'Grand Rapids');
  const byName = Object.fromEntries(links.map(link => [link.provider, new URL(link.href)]));
  assert.equal(byName.OpenTable.searchParams.get('covers'), '4');
  assert.equal(byName.OpenTable.searchParams.get('dateTime'), '2026-11-08T18:00');
  assert.equal(byName.OpenTable.searchParams.get('term'), 'Field & Fire Grand Rapids, MI');
  assert.equal(byName.Resy.pathname, '/cities/grand-rapids-mi/search');
  assert.equal(byName.Resy.searchParams.get('seats'), '4');
  assert.equal(byName.Resy.searchParams.get('query'), 'Field & Fire');
  assert.equal(byName.Yelp.searchParams.get('reservation_time'), '1800');
  assert.equal(byName.Yelp.searchParams.get('find_loc'), 'Grand Rapids, MI');
  assert.equal(byName.Phone.href, 'tel:6165550100');
  assert.equal(byName.Website.href, 'https://example.com/menu');
  assert.equal(byName.Directions.searchParams.get('travelmode'), 'driving');
  const rides = P.rideLinks(42.9634, -85.6681, 'DeVos Performance Hall');
  assert.equal(new URL(rides.uber).searchParams.get('pickup'), 'my_location');
  assert.equal(new URL(rides.uber).searchParams.get('dropoff[latitude]'), '42.9634');
  assert.equal(new URL(rides.uber).searchParams.get('dropoff[nickname]'), 'DeVos Performance Hall');
  assert.equal(new URL(rides.lyft).searchParams.get('destination[longitude]'), '-85.6681');
  assert.equal(P.safeHttp('javascript:alert(1)'), '');
  assert.equal(P.safeTel('nope'), '');
});

test('a saved record replaces the suggestion, and a past or duplicate record is refused', () => {
  const event = { id: 'show-1', title: 'All Get Out', when: 'Sunday, November 8, 2026 · 7:00 PM ET', venue: 'The Pyramid Scheme', city: 'Grand Rapids', url: 'https://example.com/tickets' };
  const dinnerAt = P.zonedToMs(2026, 11, 8, 17, 30);
  const suggested = P.shareText({ event: event, party: 2, dinnerAt: dinnerAt, selected: { name: 'Nonla' }, drinks: [{ name: 'The Tip Top' }] });
  assert.match(suggested, /^Night out: All Get Out\nSunday, November 8, 2026 · 7:00 PM ET\nThe Pyramid Scheme\nSuggested dinner \(not confirmed\): Nonla\nNov 8, 2026 at 5:30 PM, party of 2\nSuggested drinks after: The Tip Top\nhttps:\/\/example.com\/tickets$/);
  const none = P.shareText({ event: event, party: 3, dinnerAt: dinnerAt, dinner: [], drinks: [] });
  assert.match(none, /Dinner spot not selected; party of 3\./);
  const future = dinnerAt;
  const draft = { restaurant: 'Nonla', party: 2, time: future, event: event, provider: 'OpenTable', link: 'https://example.com/menu', kind: 'Dinner' };
  const saved = P.applySave([], draft, future - 60000, 'id-1');
  assert.equal(saved.saved, true);
  assert.match(P.shareText({ event: event, bookings: saved.bookings, party: 2, dinnerAt: dinnerAt }), /Reservation recorded by me; verify with OpenTable\./);
  const past = P.applySave([], draft, future + 1000, 'id-2');
  assert.equal(past.saved, false);
  assert.match(past.notice, /time has passed/);
  const again = P.applySave(saved.bookings, draft, future - 60000, 'id-3');
  assert.equal(again.saved, false);
  assert.match(again.notice, /already in My bookings/);
});

test('forecast uses the nearest hour and does not invent a value', () => {
  const target = 1_700_000_000;
  const hours = {
    time: [target - 7200, target - 400, target + 8000],
    temperature_2m: [30, 49.2, 70],
    precipitation_probability: [80, 0, 10],
    weather_code: [61, 0, 1]
  };
  const picked = P.forecastPick(hours, target);
  assert.equal(picked.temperature, 49.2);
  assert.equal(P.compactLabel(picked), '49°F · 0% rain');
  assert.equal(P.compactLabel({ temperature: 31.2, rain: 55 }), '31°F · 55% rain · Rain risk · Cold');
  assert.equal(P.forecastPick(hours, target + 20000), null);
  assert.equal(P.beyondRange(Date.parse('2026-12-20T00:00:00Z'), Date.parse('2026-11-08T22:00:00Z')), true);
});

test('a late dinner is not labeled before the show, and it uses the calendar end', () => {
  const qa = P.zonedToMs(2026, 11, 8, 18, 50);
  const plan = P.initialDinner('2026-11-08', '5:30 PM', qa);
  assert.equal(plan.start, P.zonedToMs(2026, 11, 8, 17, 30));
  assert.equal(plan.dinnerAt, P.zonedToMs(2026, 11, 8, 19, 0));
  assert.equal(plan.end, P.zonedToMs(2026, 11, 8, 20, 30));
  assert.equal(plan.after, plan.end);
  assert.equal(P.dinnerHeading(plan.dinnerAt, plan.start), 'Dinner around 7:00 PM');
  assert.equal(P.drinksHeading(plan.after), 'Drinks around 8:30 PM');
  assert.equal(P.dinnerWarning(plan.dinnerAt, plan.start), P.DINNER_NOT_BEFORE);
  assert.equal(P.drinksWarning(true, plan.end), P.DRINKS_ESTIMATE);
  assert.equal(P.dinnerWarning(null, null), P.DINNER_NO_CLOCK);
  assert.equal(P.drinksWarning(false, null), P.DRINKS_UNKNOWN);
  assert.equal(P.drinksHeading(null), 'Drinks');
  assert.equal(P.clockRange(plan.start, plan.end), '5:30 PM–8:30 PM ET');
  assert.equal(P.parseDinnerInputs('', '').ok, false);
  assert.equal(P.parseDinnerInputs('2026-02-31', '19:00').ok, false);
  assert.equal(P.parseDinnerInputs('2026-11-08', '19:00').ok, true);
  const early = P.initialDinner('2026-11-08', '5:30 PM', P.zonedToMs(2026, 11, 8, 10, 0));
  assert.equal(P.dinnerHeading(early.dinnerAt, early.start), 'Dinner before, around 3:30 PM');
});

test('the button escapes text and the three corridors call it', () => {
  const html = P.buttonHTML({ id: 'show-1', title: 'A & B <band>', date: '2026-11-08', time: '7:00 PM', venue: 'The "Pyramid"', url: 'javascript:alert(1)', when: 'Sunday' });
  assert.match(html, /Plan night/);
  assert.match(html, /A &amp; B &lt;band&gt;/);
  assert.match(html, /data-url=""/);
  assert.doesNotMatch(html, /javascript/);
  const root = path.join(__dirname, '..');
  ['app.js', 'sports-app.js', 'seasonal-app.js'].forEach(file => {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /GRPlan\.buttonHTML/);
  });
  assert.match(fs.readFileSync(path.join(root, 'pane.js'), 'utf8'), /dialog\[open\]/);
  ['index.html', 'sports.html', 'seasonal.html'].forEach(file => {
    const htmlFile = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(htmlFile, /plan-night\.js\?v=202611081926/);
    assert.match(htmlFile, /style\.css\?v=202611081935/);
    assert.match(htmlFile, /noindex,nofollow/);
  });
  assert.match(fs.readFileSync(path.join(root, 'sports-app.js'), 'utf8'), /function noteDetail/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'sports-app.js'), 'utf8').split('function noteDetail')[1], /GRPlan\.buttonHTML/);
});
