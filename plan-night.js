// Plan night for the test site. Behavior follows ContentView.swift (prepared v14):
// PlanNightView, NightSpot, TransportButtons, NearbySpotMapView, NearbyParkingView,
// Store.saveBooking / planText, and VenueLookup / Open-Meteo helpers.
// MapKit, EventKit, and UserNotifications have no browser equivalent here.
// Places, geocoding, and forecasts come from keyless read-only services.
// Nothing is invented when those services fail.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.GRPlan = api;
    if (root.document) api.mount();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  const TZ = 'America/Detroit';
  const ORIGIN = { lat: 42.96, lon: -85.67 };
  const BOOK_KEY = 'gr.bookings.v6';
  const VENUE_KEY = 'gr.venueLocations.v13';
  const WEATHER_KEY = 'gr.locationWeather.v13';
  const CENTERS = {
    'grand rapids': { lat: 42.96, lon: -85.67, label: 'Grand Rapids' },
    'saugatuck': { lat: 42.655, lon: -86.202, label: 'Saugatuck' },
    'douglas': { lat: 42.643, lon: -86.200, label: 'Douglas' },
    'holland': { lat: 42.788, lon: -86.109, label: 'Holland' },
    'fennville': { lat: 42.594, lon: -86.102, label: 'Fennville' },
    'allendale': { lat: 42.972, lon: -85.954, label: 'Allendale' },
    'battle creek': { lat: 42.321, lon: -85.179, label: 'Battle Creek' },
    'comstock park': { lat: 43.039, lon: -85.670, label: 'Comstock Park' },
    'lowell': { lat: 42.933, lon: -85.341, label: 'Lowell' },
    'mt. pleasant': { lat: 43.598, lon: -84.768, label: 'Mt. Pleasant' },
    'mount pleasant': { lat: 43.598, lon: -84.768, label: 'Mount Pleasant' },
    'new buffalo': { lat: 41.794, lon: -86.744, label: 'New Buffalo' },
    'wayland': { lat: 42.674, lon: -85.644, label: 'Wayland' },
    'zeeland': { lat: 42.813, lon: -86.019, label: 'Zeeland' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function zonedParts(ms) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const bag = {};
    fmt.formatToParts(new Date(ms)).forEach(part => { if (part.type !== 'literal') bag[part.type] = part.value; });
    let h = +bag.hour;
    if (h === 24) h = 0;
    return { y: +bag.year, mo: +bag.month, d: +bag.day, h: h, mi: +bag.minute, s: +bag.second };
  }
  function zonedToMs(y, mo, d, h, mi) {
    let utc = Date.UTC(y, mo - 1, d, h + 5, mi, 0);
    for (let i = 0; i < 4; i++) {
      const p = zonedParts(utc);
      const delta = Date.UTC(y, mo - 1, d, h, mi, 0) - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
      if (!delta) return utc;
      utc += delta;
    }
    return utc;
  }
  function stamp(ms, format) {
    const p = zonedParts(ms);
    if (format === 'yyyy-MM-dd') return p.y + '-' + pad(p.mo) + '-' + pad(p.d);
    if (format === 'HHmm') return pad(p.h) + pad(p.mi);
    if (format === 'input-time') return pad(p.h) + ':' + pad(p.mi);
    return p.y + '-' + pad(p.mo) + '-' + pad(p.d) + 'T' + pad(p.h) + ':' + pad(p.mi);
  }
  function timeOnly(ms) {
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  }
  function formatStamp(ms) {
    const date = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
    return date + ' at ' + timeOnly(ms);
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const p = Math.PI / 180, R = 6371000;
    const a = Math.sin((lat2 - lat1) * p / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin((lon2 - lon1) * p / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function validCoord(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
    return haversine(ORIGIN.lat, ORIGIN.lon, lat, lon) <= 150000;
  }
  function walkText(meters) {
    const minutes = Math.max(1, Math.round(meters / 80));
    return minutes <= 20 ? minutes + ' min walk' : (meters / 1609).toFixed(1) + ' mi';
  }
  function straightLineLabel(meters, name, approximate) {
    const minutes = Math.max(1, Math.ceil((meters / 1.3) / 60));
    const length = meters < 160.9344 ? Math.round(meters) + ' m' : (meters / 1609.344).toFixed(1) + ' mi';
    const destination = approximate ? 'the approximate venue area' : 'the venue';
    return 'Straight-line estimate, not a walking route: ' + length + ' · about ' + minutes + ' min from ' + name + ' to ' + destination + '.';
  }
  function parseClock(time) {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i.exec(String(time || '').trim());
    if (!m) return null;
    let h = +m[1] % 12;
    if (/p/i.test(m[3])) h += 12;
    return { h: h, mi: +(m[2] || 0) };
  }
  function startMillis(date, time) {
    const clock = parseClock(time);
    if (!clock || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const parts = date.split('-').map(Number);
    return zonedToMs(parts[0], parts[1], parts[2], clock.h, clock.mi);
  }
  // PlanNightView: max(now, start - 2h), then the next half hour on the Detroit clock.
  function dinnerAt(startMs, nowMs) {
    const raw = Math.max(nowMs, startMs - 2 * 3600 * 1000);
    const p = zonedParts(raw);
    const hourMs = zonedToMs(p.y, p.mo, p.d, p.h, 0);
    const elapsed = Math.max(0, (raw - hourMs) / 1000);
    return hourMs + Math.ceil(elapsed / 1800 - 1e-9) * 1800 * 1000;
  }
  function roundHalfHour(ms) { return dinnerAt(ms + 2 * 3600 * 1000, ms); }
  // Same wall-clock plus three hours as ics.js parts(c, 3), which is the DTEND the site already serves.
  function calendarEnd(date, time) {
    const clock = parseClock(time);
    if (!clock || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const parts = date.split('-').map(Number);
    const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], clock.h + 3, clock.mi));
    return zonedToMs(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes());
  }
  function initialDinner(date, time, nowMs) {
    const start = startMillis(date, time);
    if (start != null) {
      const end = calendarEnd(date, time);
      const cap = start + 4 * 3600 * 1000;
      const after = end == null ? start + 2.5 * 3600 * 1000 : Math.min(end, cap);
      return { dinnerAt: dinnerAt(start, nowMs), start: start, end: end, after: after, hasClock: true };
    }
    let five = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      const parts = date.split('-').map(Number);
      five = zonedToMs(parts[0], parts[1], parts[2], 17, 0);
    }
    const raw = five == null ? nowMs : Math.max(nowMs, five);
    return { dinnerAt: roundHalfHour(raw), start: null, end: null, after: null, hasClock: false };
  }
  function dinnerHeading(dinnerMs, startMs) {
    const clock = timeOnly(dinnerMs);
    if (startMs != null && dinnerMs < startMs) return 'Dinner before, around ' + clock;
    return 'Dinner around ' + clock;
  }
  function drinksHeading(afterMs, startMs) {
    if (afterMs == null) return 'Drinks after the event';
    const clock = timeOnly(afterMs);
    if (startMs != null && afterMs < startMs) return 'Drinks around ' + clock;
    return 'Drinks after, around ' + clock;
  }
  function clockRange(startMs, endMs) {
    if (stamp(startMs, 'yyyy-MM-dd') === stamp(endMs, 'yyyy-MM-dd')) return timeOnly(startMs) + '–' + timeOnly(endMs) + ' ET';
    return formatStamp(startMs) + ' – ' + formatStamp(endMs);
  }
  function parseDinnerInputs(date, time) {
    if (!date || !time) return { ok: false, message: 'Enter a dinner date and time.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, message: 'Enter a dinner date and time.' };
    const dateParts = date.split('-').map(Number);
    const clock = time.split(':').map(Number);
    const y = dateParts[0], mo = dateParts[1], d = dateParts[2], h = clock[0], mi = clock[1];
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return { ok: false, message: 'That dinner date or time is not valid.' };
    const dinnerAtMs = zonedToMs(y, mo, d, h, mi);
    const back = zonedParts(dinnerAtMs);
    if (back.y !== y || back.mo !== mo || back.d !== d || back.h !== h || back.mi !== mi) {
      return { ok: false, message: 'That dinner date or time is not valid.' };
    }
    return { ok: true, dinnerAt: dinnerAtMs, message: '' };
  }
  function clampParty(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return 2;
    return Math.min(20, Math.max(1, n));
  }
  function cityFromQuery(query) {
    const text = String(query || '').toLowerCase();
    const names = Object.keys(CENTERS).sort((a, b) => b.length - a.length);
    for (let i = 0; i < names.length; i++) if (text.includes(names[i])) return CENTERS[names[i]].label;
    return 'Grand Rapids';
  }
  function cityLine(label) { return (label || 'Grand Rapids') + ', MI'; }
  function words(value) {
    const ignored = new Set(['the', 'and', 'at', 'for', 'grand', 'rapids', 'mi']);
    return new Set(String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !ignored.has(w)));
  }
  function venueMatch(name, item) {
    const expected = words(name);
    const actual = words((item && (item.name || '') + ' ' + (item.display_name || '')) || '');
    if (!expected.size) return false;
    let n = 0;
    expected.forEach(w => { if (actual.has(w)) n++; });
    return n >= Math.min(2, expected.size);
  }
  function nearest(rows, limit) {
    const kept = [];
    rows.slice().sort((a, b) => a.distance - b.distance).forEach(row => {
      if (row.distance > 3000) return;
      if (kept.some(other => other.name.toLowerCase() === row.name.toLowerCase() && haversine(other.lat, other.lon, row.lat, row.lon) < 40)) return;
      kept.push(row);
    });
    return kept.slice(0, limit);
  }
  function compactLabel(forecast) {
    const parts = [];
    if (forecast.temperature != null) parts.push(Math.round(forecast.temperature) + '°F');
    if (forecast.rain != null) parts.push(Math.round(forecast.rain) + '% rain');
    if ((forecast.rain || 0) >= 50) parts.push('Rain risk');
    if (forecast.temperature != null && forecast.temperature < 40) parts.push('Cold');
    return parts.join(' · ');
  }
  function forecastPick(hours, targetSec) {
    if (!hours || !hours.time || !hours.time.length) return null;
    let best = -1, bestAbs = Infinity;
    hours.time.forEach((t, i) => {
      const delta = Math.abs(t - targetSec);
      if (delta < bestAbs) { bestAbs = delta; best = i; }
    });
    if (best < 0 || bestAbs > 3600) return null;
    const temperature = hours.temperature_2m && hours.temperature_2m.length > best ? hours.temperature_2m[best] : null;
    const rain = hours.precipitation_probability && hours.precipitation_probability.length > best ? hours.precipitation_probability[best] : null;
    const code = hours.weather_code && hours.weather_code.length > best ? hours.weather_code[best] : null;
    if (temperature == null && rain == null) return null;
    return { temperature: temperature, rain: rain, code: code };
  }
  function beyondRange(targetMs, nowMs) {
    return targetMs > nowMs + 16 * 86400000 || targetMs < nowMs - 3600000;
  }
  function safeHttp(url) {
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    } catch (e) {}
    return '';
  }
  function safeTel(phone) {
    const raw = String(phone || '');
    const keep = raw.replace(/[^\d+]/g, '');
    const digits = keep.replace(/\D/g, '');
    if (digits.length < 7) return '';
    return 'tel:' + keep;
  }
  function withParams(base, pairs) {
    const u = new URL(base);
    pairs.forEach(pair => u.searchParams.set(pair[0], pair[1]));
    return u.toString();
  }
  function bookingLinks(spot, party, timeMs, city) {
    const place = cityLine(city);
    const links = [];
    if (spot.kind !== 'parking') {
      links.push({ provider: 'OpenTable', href: withParams('https://www.opentable.com/s', [
        ['covers', String(party)],
        ['dateTime', stamp(timeMs, "yyyy-MM-dd'T'HH:mm")],
        ['term', spot.name + ' ' + place]
      ]) });
      links.push({ provider: 'Resy', href: withParams('https://resy.com/cities/grand-rapids-mi/search', [
        ['date', stamp(timeMs, 'yyyy-MM-dd')],
        ['seats', String(party)],
        ['query', spot.name]
      ]) });
      links.push({ provider: 'Yelp', href: withParams('https://www.yelp.com/search', [
        ['find_desc', spot.name],
        ['find_loc', place],
        ['reservation_covers', String(party)],
        ['reservation_date', stamp(timeMs, 'yyyy-MM-dd')],
        ['reservation_time', stamp(timeMs, 'HHmm')]
      ]) });
      const tel = safeTel(spot.phone);
      if (tel) links.push({ provider: 'Phone', href: tel, label: 'Call ' + spot.phone });
      const site = safeHttp(spot.website);
      if (site) links.push({ provider: 'Website', href: site, label: 'Website' });
    }
    links.push({ provider: 'Directions', href: mapsDriving(spot.lat, spot.lon), label: 'Directions', maps: true });
    return links;
  }
  function mapsDriving(lat, lon) {
    return withParams('https://www.google.com/maps/dir/', [['api', '1'], ['destination', lat + ',' + lon], ['travelmode', 'driving']]);
  }
  function mapsAppleDriving(lat, lon) {
    return withParams('https://maps.apple.com/', [['daddr', lat + ',' + lon], ['dirflg', 'd']]);
  }
  function mapsWalking(from, to) {
    return withParams('https://www.google.com/maps/dir/', [
      ['api', '1'], ['origin', from.lat + ',' + from.lon], ['destination', to.lat + ',' + to.lon], ['travelmode', 'walking']
    ]);
  }
  function mapsAppleWalking(from, to) {
    return withParams('https://maps.apple.com/', [
      ['saddr', from.lat + ',' + from.lon], ['daddr', to.lat + ',' + to.lon], ['dirflg', 'w']
    ]);
  }
  function rideLinks(lat, lon, nickname) {
    return {
      uber: withParams('https://m.uber.com/ul/', [
        ['action', 'setPickup'], ['pickup', 'my_location'],
        ['dropoff[latitude]', String(lat)], ['dropoff[longitude]', String(lon)],
        ['dropoff[nickname]', nickname]
      ]),
      lyft: withParams('https://www.lyft.com/ride', [
        ['id', 'lyft'], ['destination[latitude]', String(lat)], ['destination[longitude]', String(lon)]
      ])
    };
  }
  function shareText(model) {
    const event = model.event;
    const related = (model.bookings || []).filter(item => item.event && item.event.id === event.id).sort((a, b) => a.time - b.time);
    if (related.length) return related.map(bookingShare).join('\n\n');
    let text = 'Night out: ' + event.title + '\n' + (event.when || '') + '\n' + (event.venue || event.city || 'Grand Rapids');
    const spot = model.selected || (model.dinner && model.dinner[0]);
    if (spot) text += '\nSuggested dinner (not confirmed): ' + spot.name + '\n' + formatStamp(model.dinnerAt) + ', party of ' + model.party;
    else text += '\nDinner spot not selected; party of ' + model.party + '.';
    if (model.drinks && model.drinks[0]) text += '\nSuggested drinks after: ' + model.drinks[0].name;
    if (event.url) text += '\n' + event.url;
    return text;
  }
  function bookingShare(booking) {
    const event = booking.event || {};
    let text = 'Our night out\n' + booking.kind + ': ' + booking.restaurant;
    text += '\n' + formatStamp(booking.time) + ', party of ' + booking.party;
    text += '\nEvent: ' + (event.title || '');
    text += '\n' + (event.when || '');
    text += '\n' + (event.venue || event.city || 'Grand Rapids');
    text += '\nReservation recorded by me; verify with ' + booking.provider + '.';
    if (event.url) text += '\n' + event.url;
    return text;
  }
  function applySave(bookings, draft, nowMs, id) {
    const list = bookings || [];
    if (!(draft.time > nowMs)) {
      return { bookings: list, saved: false, notice: 'That reservation time has passed. Choose a future time before saving.' };
    }
    const duplicate = list.some(item => item.event && item.event.id === draft.event.id && item.restaurant === draft.restaurant
      && Math.abs(item.time - draft.time) < 60000 && item.party === draft.party);
    if (duplicate) return { bookings: list, saved: false, notice: 'This booking is already in My bookings.' };
    const booking = {
      id: id || ('web-' + nowMs),
      restaurant: draft.restaurant,
      party: draft.party,
      time: draft.time,
      event: {
        id: draft.event.id, title: draft.event.title, when: draft.event.when,
        venue: draft.event.venue, city: draft.event.city, url: draft.event.url
      },
      provider: draft.provider,
      link: draft.link || '',
      savedAt: nowMs,
      kind: draft.kind
    };
    return { bookings: list.concat(booking), saved: true, notice: '' };
  }
  function worldPoint(lat, lon, zoom) {
    const n = 2 ** zoom;
    const x = (lon + 180) / 360 * n;
    const rad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
    return { x: x, y: y };
  }
  function buttonHTML(event) {
    const fields = {
      'data-id': event.id, 'data-title': event.title, 'data-date': event.date || '',
      'data-end': event.end || '', 'data-time': event.time || '', 'data-venue': event.venue || '',
      'data-category': event.category || '', 'data-url': safeHttp(event.url || ''), 'data-when': event.when || ''
    };
    const attrs = Object.keys(fields).map(key => key + '="' + escapeHtml(fields[key]) + '"').join(' ');
    return '<button type="button" class="b primary plan-night" ' + attrs + ' aria-label="Plan night for ' + escapeHtml(event.title) + '">Plan night</button>';
  }

  function mount() {
    if (mount.done) return;
    mount.done = true;
    const dialog = document.createElement('dialog');
    dialog.className = 'plan-dialog';
    dialog.setAttribute('aria-labelledby', 'plan-title');
    dialog.innerHTML = [
      '<div class="plan-head"><h2 id="plan-title" tabindex="-1">Plan my night</h2><button type="button" class="b" id="plan-done">Done</button></div>',
      '<div class="plan-body">',
      '<section class="plan-sec"><h3>The show</h3><p id="plan-show-title" class="plan-strong"></p><p id="plan-show-when" class="plan-note"></p><p id="plan-show-span" class="plan-note" hidden></p><p id="plan-show-venue" class="plan-note"></p></section>',
      '<p id="plan-notice" class="plan-note" role="status" hidden></p>',
      '<section class="plan-sec"><h3>Your group</h3>',
      '<div class="plan-stepper"><button type="button" class="b" id="plan-less" aria-label="Fewer people">−</button>',
      '<label>Party of <input id="plan-party" type="number" min="1" max="20" step="1" inputmode="numeric" value="2"></label>',
      '<button type="button" class="b" id="plan-more" aria-label="More people">+</button></div>',
      '<div class="plan-when"><label>Dinner at <input id="plan-date" type="date" required aria-describedby="plan-dinner-error"></label><label>Time (ET) <input id="plan-time" type="time" step="1800" required aria-describedby="plan-dinner-error"></label></div>',
      '<p id="plan-dinner-error" class="plan-error" role="alert" hidden></p>',
      '<p class="plan-note">Book opens a reservation provider. It may retain your group and date; verify all details there. We cannot see live tables or confirm reservations.</p></section>',
      '<p id="plan-weather" class="plan-note">Forecast temporarily unavailable</p>',
      '<div class="plan-transport" id="plan-transport">',
      '<button type="button" class="b" id="plan-parking">Parking</button>',
      '<button type="button" class="b" id="plan-uber">Uber</button>',
      '<button type="button" class="b" id="plan-lyft">Lyft</button></div>',
      '<div id="plan-pending" hidden><button type="button" class="b" id="plan-pending-btn"></button>',
      '<p class="plan-note">Only save after the provider confirms. Nothing is booked by this app.</p></div>',
      '<p id="plan-loc" class="plan-note" hidden></p>',
      '<div id="plan-spots" aria-busy="false"></div>',
      '<section class="plan-sec"><h3>Your plan</h3><div class="plan-transport">',
      '<button type="button" class="b ics" id="plan-cal">Calendar</button>',
      '<a class="b gcal" id="plan-gcal" href="#" target="_blank" rel="noopener noreferrer">Google</a>',
      '<button type="button" class="b" id="plan-share">Share plan</button></div>',
      '<p id="plan-share-box" class="plan-copy" hidden></p></section>',
      '<p id="plan-record-note" class="plan-note">Your own reservation records. Book with the provider first, then save here. Removing a record does not cancel the restaurant reservation. This test site does not schedule reminders.</p>',
      '<section class="plan-sec" id="plan-records" hidden><h3>Saved on this browser</h3><div id="plan-record-list"></div></section>',
      '<p id="plan-attr" class="plan-note" hidden></p>',
      '</div>'
    ].join('');
    const ask = document.createElement('dialog');
    ask.className = 'plan-ask';
    ask.setAttribute('aria-labelledby', 'plan-ask-title');
    ask.innerHTML = '<h2 id="plan-ask-title">Did you book?</h2><p id="plan-ask-msg"></p><div class="row"><button type="button" class="b primary" id="plan-ask-yes">Yes, save my booking</button><button type="button" class="b" id="plan-ask-no">Not yet</button></div>';
    document.body.appendChild(dialog);
    document.body.appendChild(ask);
    ask.addEventListener('keydown', ev => { if (ev.key === 'Escape') ev.stopPropagation(); });

    const $ = id => document.getElementById(id);
    const state = { event: null, party: 2, dinnerAt: Date.now(), start: null, after: null, hasClock: false, venue: null, dinner: [], drinks: [], parking: [], parkingShown: 3, loading: false, failed: false, preview: '', book: '', selected: null, pending: null, notice: '', opener: null, gen: 0, weatherNote: '' };
    let spotCache = new Map();
    let lastNom = 0;

    function setNotice(text) {
      state.notice = text || '';
      const node = $('plan-notice');
      node.hidden = !state.notice;
      node.textContent = state.notice;
    }
    function readParty() {
      state.party = clampParty($('plan-party').value);
      $('plan-party').value = String(state.party);
      return state.party;
    }
    function applyDinnerInputs() {
      const parsed = parseDinnerInputs($('plan-date').value, $('plan-time').value);
      const error = $('plan-dinner-error');
      $('plan-date').setAttribute('aria-invalid', parsed.ok ? 'false' : 'true');
      $('plan-time').setAttribute('aria-invalid', parsed.ok ? 'false' : 'true');
      error.hidden = parsed.ok;
      error.textContent = parsed.ok ? '' : parsed.message;
      state.dinnerOk = parsed.ok;
      if (parsed.ok) state.dinnerAt = parsed.dinnerAt;
      return parsed.ok;
    }
    function writeDinnerInputs() {
      $('plan-date').value = stamp(state.dinnerAt, 'yyyy-MM-dd');
      $('plan-time').value = stamp(state.dinnerAt, 'input-time');
    }
    function eventFromButton(button) {
      const url = safeHttp(button.getAttribute('data-url') || '');
      return {
        id: button.getAttribute('data-id') || '',
        title: button.getAttribute('data-title') || '',
        date: button.getAttribute('data-date') || '',
        end: button.getAttribute('data-end') || '',
        time: button.getAttribute('data-time') || '',
        venue: button.getAttribute('data-venue') || '',
        category: button.getAttribute('data-category') || '',
        url: url,
        when: button.getAttribute('data-when') || ''
      };
    }
    function loadJSON(key) {
      try { return JSON.parse(localStorage.getItem(key) || ''); } catch (e) { return null; }
    }
    function bookings() {
      const value = loadJSON(BOOK_KEY);
      return Array.isArray(value) ? value : [];
    }
    function venueQuery(name) {
      const maps = window.GRMAP;
      return maps && maps.query ? maps.query(name) : (name ? name + ', Grand Rapids, MI' : 'Grand Rapids, MI');
    }
    function offlineVenue(cityLabel) {
      const key = String(cityLabel || '').toLowerCase();
      const known = CENTERS[key];
      const point = known || CENTERS['grand rapids'];
      const area = known ? known.label + ' city center' : 'Grand Rapids regional center';
      return {
        lat: point.lat, lon: point.lon, approximate: true,
        label: 'Approximate location — ' + area + '; verify the venue address before traveling'
      };
    }
    async function fetchJSON(url, options, timeout) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout || 18000);
      try {
        const res = await fetch(url, Object.assign({ signal: ctrl.signal }, options || {}));
        if (!res.ok) throw new Error(String(res.status));
        return await res.json();
      } finally { clearTimeout(timer); }
    }
    function acceptPlace(item, mode, name) {
      if (!item) return null;
      const lat = +item.lat, lon = +item.lon;
      if (!validCoord(lat, lon)) return null;
      const addr = item.address || {};
      const road = addr.road || addr.pedestrian || addr.footway || '';
      const bare = ['city', 'town', 'village', 'administrative', 'state', 'county', 'postcode', 'country'];
      if (mode === 'address') {
        if (!road && !addr.house_number) return null;
        return { lat: lat, lon: lon, approximate: false, label: 'Located: ' + (item.display_name || name || '') };
      }
      if (bare.includes(item.addresstype) || bare.includes(item.type)) return null;
      if (!venueMatch(name, item)) return null;
      return { lat: lat, lon: lon, approximate: false, label: 'Located: ' + (item.name || item.display_name || name) };
    }
    async function nominatimGet(params) {
      const waitFor = 1100 - (Date.now() - lastNom);
      if (lastNom && waitFor > 0) await new Promise(resolve => setTimeout(resolve, waitFor));
      lastNom = Date.now();
      const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams(params);
      return fetchJSON(url, { headers: { Accept: 'application/json' } }, 12000);
    }
    async function nominatim(query) {
      const data = await nominatimGet({ format: 'jsonv2', q: query, limit: '1', addressdetails: '1', countrycodes: 'us' });
      return Array.isArray(data) ? data[0] : null;
    }
    async function resolveVenue(event) {
      const query = venueQuery(event.venue);
      const city = cityFromQuery(query + ' ' + event.venue);
      const key = [event.venue, query, city].join('|').toLowerCase();
      const cache = loadJSON(VENUE_KEY) || {};
      const hit = cache[key];
      if (hit && Number.isFinite(hit.lat) && Date.now() - hit.resolvedAt < (hit.approximate ? 600000 : 7 * 86400000)) {
        return { lat: hit.lat, lon: hit.lon, approximate: !!hit.approximate, label: hit.label, city: city };
      }
      const name = String(event.venue || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      const street = (query.match(/\b\d+\s+.*$/) || [])[0] || '';
      const tries = [];
      if (street) tries.push({ q: street, mode: 'address', name: name });
      else if (/\d/.test(query)) tries.push({ q: query, mode: 'address', name: name });
      if (name) tries.push({ q: name + ', ' + city + ', MI', mode: 'venue', name: name });
      let found = null;
      for (let i = 0; i < tries.length && !found; i++) {
        try {
          const item = await nominatim(tries[i].q);
          found = acceptPlace(item, tries[i].mode, tries[i].name);
          if (found) found.label = found.approximate ? found.label : 'Located: ' + tries[i].q;
        } catch (e) { found = null; }
      }
      const result = found || offlineVenue(city);
      result.city = city;
      result.resolvedAt = Date.now();
      try {
        cache[key] = { lat: result.lat, lon: result.lon, approximate: result.approximate, label: result.label, resolvedAt: result.resolvedAt };
        localStorage.setItem(VENUE_KEY, JSON.stringify(cache));
      } catch (e) {}
      return result;
    }
    async function searchSpots(origin) {
      const cacheKey = Math.round(origin.lat * 1000) + '|' + Math.round(origin.lon * 1000);
      const cached = spotCache.get(cacheKey);
      if (cached && Date.now() - cached.at < 600000) return cached.value;
      const dLat = 1600 / 111320;
      const dLon = 1600 / (111320 * Math.cos(origin.lat * Math.PI / 180));
      const viewbox = [origin.lon - dLon, origin.lat + dLat, origin.lon + dLon, origin.lat - dLat].join(',');
      const kinds = [['restaurant', 'dinner'], ['bar', 'drinks'], ['parking', 'parking']];
      const grouped = { dinner: [], drinks: [], parking: [] };
      let failed = 0;
      for (let i = 0; i < kinds.length; i++) {
        const kind = kinds[i][1];
        try {
          const data = await nominatimGet({
            format: 'jsonv2', q: kinds[i][0], limit: '10', addressdetails: '1', extratags: '1', bounded: '1', viewbox: viewbox
          });
          (Array.isArray(data) ? data : []).forEach(item => {
            const lat = +item.lat, lon = +item.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            const tags = item.extratags || {};
            const addr = item.address || {};
            const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
            const name = item.name || (kind === 'parking' ? 'Parking' : '');
            if (!name) return;
            grouped[kind].push({
              name: name, detail: street, distance: haversine(origin.lat, origin.lon, lat, lon),
              lat: lat, lon: lon, phone: tags.phone || tags['contact:phone'] || '',
              website: tags.website || tags['contact:website'] || '', kind: kind
            });
          });
        } catch (e) { failed++; }
      }
      const value = {
        dinner: nearest(grouped.dinner, 3),
        drinks: nearest(grouped.drinks, 3),
        parking: nearest(grouped.parking, 8),
        failed: failed === kinds.length
      };
      spotCache.set(cacheKey, { at: Date.now(), value: value });
      return value;
    }
    function weatherKey(lat, lon) {
      return Math.round(lat * 100) + '|' + Math.round(lon * 100);
    }
    async function loadWeather(origin, event) {
      const target = state.hasClock ? state.start : null;
      const node = $('plan-weather');
      if (target == null) {
        node.textContent = 'Forecast needs a start time. This listing does not include one.';
        return;
      }
      if (beyondRange(target, Date.now())) {
        node.textContent = target > Date.now() ? 'Forecast available closer to date' : 'Forecast temporarily unavailable';
        return;
      }
      node.textContent = 'Loading local forecast…';
      const key = weatherKey(origin.lat, origin.lon);
      const store = loadJSON(WEATHER_KEY) || {};
      let cache = store[key];
      if (!cache || Date.now() - cache.fetchedAt >= 3600000) {
        try {
          const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
            latitude: String(origin.lat), longitude: String(origin.lon),
            hourly: 'temperature_2m,precipitation_probability,weather_code',
            temperature_unit: 'fahrenheit', timeformat: 'unixtime', timezone: 'America/Detroit', forecast_days: '16'
          });
          const payload = await fetchJSON(url, {}, 15000);
          cache = { fetchedAt: Date.now(), payload: payload };
          store[key] = cache;
          const keys = Object.keys(store).sort((a, b) => (store[b].fetchedAt || 0) - (store[a].fetchedAt || 0)).slice(0, 32);
          const trimmed = {};
          keys.forEach(item => { trimmed[item] = store[item]; });
          localStorage.setItem(WEATHER_KEY, JSON.stringify(trimmed));
        } catch (e) { cache = cache && Date.now() - cache.fetchedAt < 6 * 3600000 ? cache : null; }
      }
      if (!cache || Date.now() - cache.fetchedAt >= 6 * 3600000) {
        node.textContent = 'Forecast temporarily unavailable';
        $('plan-attr').hidden = true;
        return;
      }
      const hours = cache.payload && cache.payload.hourly;
      const picked = forecastPick(hours, Math.round(target / 1000));
      if (!picked) {
        node.textContent = 'Forecast temporarily unavailable';
        return;
      }
      const suffix = origin.approximate ? ' · area estimate' : '';
      node.textContent = compactLabel(picked) + suffix;
      const attr = $('plan-attr');
      attr.hidden = false;
      const updated = formatStamp(cache.fetchedAt);
      attr.innerHTML = '<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather: Open-Meteo · CC BY 4.0</a> · Forecast data · latest update ' + escapeHtml(updated);
    }
    function spotTime(kind) {
      return kind === 'drinks' && state.after != null ? state.after : state.dinnerAt;
    }
    function renderSpots() {
      const box = $('plan-spots');
      if (state.loading) {
        box.setAttribute('aria-busy', 'true');
        box.innerHTML = '<p class="plan-loading" role="status"><span class="plan-spin" aria-hidden="true"></span>Locating the venue and finding nearby places…</p>';
        return;
      }
      box.setAttribute('aria-busy', 'false');
      const dinnerTitle = state.dinnerOk ? dinnerHeading(state.dinnerAt, state.start) : 'Dinner';
      const blocks = [
        ['dinner', dinnerTitle, state.dinner, 3],
        ['drinks', drinksHeading(state.after, state.start), state.drinks, 3],
        ['parking', 'Parking near the venue', state.parking, state.parkingShown]
      ];
      box.innerHTML = blocks.map(block => sectionHTML(block[0], block[1], block[2], block[3])).join('');
    }
    function sectionHTML(kind, title, rows, limit) {
      const shown = (rows || []).slice(0, limit);
      const empty = state.failed
        ? 'Nearby search is unavailable right now. Try again when you\'re online.'
        : 'Nothing found nearby.';
      const note = kind === 'parking' ? '<p class="plan-note">Tap a parking spot to compare it with the event venue. Prices and open spaces are not verified.</p>' : '';
      const body = shown.length ? shown.map((spot, index) => spotHTML(kind, spot, index)).join('') : '<p class="plan-note">' + empty + '</p>';
      return '<section class="plan-sec" id="plan-sec-' + kind + '"><h3>' + escapeHtml(title) + '</h3>' + note + body + '</section>';
    }
    function spotHTML(kind, spot, index) {
      const open = state.preview === kind + ':' + index;
      const selected = state.selected && state.selected.kind === kind && state.selected.index === index;
      const detail = spot.detail ? '<span class="plan-meta">' + escapeHtml(spot.detail) + '</span>' : '';
      const map = open && state.venue ? mapHTML(spot) : '';
      const book = kind === 'parking' ? '' : bookHTML(spot, kind, index);
      return '<div class="plan-spot"><button type="button" class="plan-pick" data-kind="' + kind + '" data-index="' + index + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="plan-name">' + escapeHtml(spot.name) + (selected ? ' · Selected' : '') + '</span>' + detail +
        '<span class="plan-meta">' + escapeHtml(walkText(spot.distance) + ' · straight-line estimate') + '</span>' +
        '<span class="plan-linkish">Show venue + spot on map</span></button>' + map + book + '</div>';
    }
    function bookHTML(spot, kind, index) {
      const key = kind + ':' + index;
      const open = state.book === key;
      const links = open ? '<div class="plan-links">' + bookingLinks(spot, readParty(), spotTime(kind), state.venue && state.venue.city).map(link => {
        const label = link.label || link.provider;
        return '<a class="b' + (link.provider === 'Directions' ? '' : ' primary') + '" href="' + escapeHtml(link.href) + '" target="_blank" rel="noopener noreferrer" data-provider="' + escapeHtml(link.provider) + '" data-kind="' + kind + '" data-index="' + index + '">' + escapeHtml(label) + '</a>';
      }).join('') + '<a class="b" href="' + escapeHtml(mapsAppleDriving(spot.lat, spot.lon)) + '" target="_blank" rel="noopener noreferrer">Apple Maps directions</a></div>' : '';
      return '<button type="button" class="b primary plan-book" aria-expanded="' + (open ? 'true' : 'false') + '" data-kind="' + kind + '" data-index="' + index + '">Book</button>' + links;
    }
    function mapHTML(spot) {
      const venue = state.venue;
      const grid = tileHTML(venue, spot);
      const walkG = mapsWalking(spot, venue);
      const walkA = mapsAppleWalking(spot, venue);
      const driveG = mapsDriving(spot.lat, spot.lon);
      const driveA = mapsAppleDriving(spot.lat, spot.lon);
      const walkLabel = venue.approximate ? 'Walk to approximate venue area' : 'Walking directions to the venue';
      const routeNote = (venue.approximate ? venue.label + '. ' : '') + 'Walking route unavailable. Showing a straight-line estimate; actual walking distance may be longer.';
      return '<div class="plan-compare"><p class="plan-strong">Venue + selected spot</p>' + grid +
        '<p class="plan-pin-legend"><span class="swatch venue"></span>Event venue: ' + escapeHtml(state.event.venue || state.event.title) + '</p>' +
        '<p class="plan-pin-legend"><span class="swatch spot"></span>Selected spot: ' + escapeHtml(spot.name) + '</p>' +
        '<p class="plan-note">' + escapeHtml(straightLineLabel(haversine(venue.lat, venue.lon, spot.lat, spot.lon), spot.name, venue.approximate)) + '</p>' +
        '<p class="plan-note">' + escapeHtml(routeNote) + '</p>' +
        '<div class="plan-links"><a class="b" href="' + escapeHtml(walkG) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(walkLabel) + ' (Google Maps)</a>' +
        '<a class="b" href="' + escapeHtml(walkA) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(walkLabel) + ' (Apple Maps)</a>' +
        '<a class="b" href="' + escapeHtml(driveG) + '" target="_blank" rel="noopener noreferrer">Directions to ' + escapeHtml(spot.name) + ' (Google Maps)</a>' +
        '<a class="b" href="' + escapeHtml(driveA) + '" target="_blank" rel="noopener noreferrer">Directions to ' + escapeHtml(spot.name) + ' (Apple Maps)</a></div></div>';
    }
    function tileHTML(venue, spot) {
      let zoom = 15;
      for (let z = 16; z >= 13; z--) {
        const a = worldPoint(venue.lat, venue.lon, z);
        const b = worldPoint(spot.lat, spot.lon, z);
        if (Math.abs(a.x - b.x) <= 1.4 && Math.abs(a.y - b.y) <= 1.4) { zoom = z; break; }
      }
      const a = worldPoint(venue.lat, venue.lon, zoom);
      const b = worldPoint(spot.lat, spot.lon, zoom);
      const cx = Math.floor((a.x + b.x) / 2);
      const cy = Math.floor((a.y + b.y) / 2);
      const originX = cx - 1, originY = cy - 1;
      let imgs = '';
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const tx = originX + x, ty = originY + y;
        imgs += '<img alt="" width="256" height="256" src="https://tile.openstreetmap.org/' + zoom + '/' + tx + '/' + ty + '.png">';
      }
      const pin = point => {
        const left = (point.x - originX) / 3 * 100;
        const top = (point.y - originY) / 3 * 100;
        return 'left:' + Math.min(96, Math.max(4, left)).toFixed(2) + '%;top:' + Math.min(96, Math.max(4, top)).toFixed(2) + '%';
      };
      return '<figure class="plan-map"><div class="plan-map-grid">' + imgs + '</div>' +
        '<span class="plan-pin venue" style="' + pin(a) + '">Event venue</span>' +
        '<span class="plan-pin spot" style="' + pin(b) + '">Selected spot</span>' +
        '<figcaption><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a></figcaption></figure>';
    }
    function renderRecords() {
      const mine = bookings().filter(item => item.event && item.event.id === state.event.id).sort((a, b) => a.time - b.time);
      const section = $('plan-records');
      section.hidden = !mine.length;
      $('plan-record-list').innerHTML = mine.map(item => {
        const site = safeHttp(item.link || '');
        return '<article class="plan-record"><p class="plan-strong">' + escapeHtml(item.restaurant) + '</p>' +
          '<p class="plan-note">' + escapeHtml(formatStamp(item.time)) + '</p>' +
          '<p class="plan-note">' + escapeHtml(item.kind + ' · Party of ' + item.party + ' · ' + item.provider) + '</p>' +
          '<p class="plan-note">Saved by you, not verified with the restaurant.</p>' +
          '<div class="plan-transport"><button type="button" class="b plan-record-share" data-record="' + escapeHtml(item.id) + '">Share</button>' +
          (site ? '<a class="b" href="' + escapeHtml(site) + '" target="_blank" rel="noopener noreferrer">Website</a>' : '') +
          '<button type="button" class="b plan-record-remove" data-record="' + escapeHtml(item.id) + '">Remove record</button></div></article>';
      }).join('');
    }
    function paintPending() {
      const box = $('plan-pending');
      box.hidden = !state.pending;
      if (state.pending) $('plan-pending-btn').textContent = 'Did you book ' + state.pending.restaurant + '?';
    }
    function openAsk() {
      if (!state.pending || ask.open) return;
      const draft = state.pending;
      $('plan-ask-msg').textContent = 'Save ' + draft.restaurant + ', party of ' + draft.party + ', ' + formatStamp(draft.time) + '? This is your own record, not a provider confirmation.';
      ask.showModal();
    }
    function savePending() {
      if (!state.pending) return;
      const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('web-' + Date.now());
      const result = applySave(bookings(), state.pending, Date.now(), id);
      if (!result.saved) { setNotice(result.notice); return; }
      const kept = storeBookings(result.bookings);
      state.pending = null;
      paintPending();
      renderRecords();
      setNotice(kept ? 'Saved on this browser. Saved by you, not verified with the restaurant.' : 'This browser did not keep the record. It will disappear when you leave the page.');
    }
    function storeBookings(list) {
      try { localStorage.setItem(BOOK_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
    }
    function begin(kind, index, provider, href) {
      const list = kind === 'drinks' ? state.drinks : state.dinner;
      const spot = list[index];
      if (!spot || provider === 'Directions') return;
      if (kind === 'dinner') state.selected = Object.assign({ kind: kind, index: index }, spot);
      state.pending = {
        restaurant: spot.name, party: readParty(), time: spotTime(kind), event: state.event,
        provider: provider, link: safeHttp(spot.website || ''), kind: kind === 'drinks' ? 'Drinks' : 'Dinner'
      };
      paintPending();
      if (provider === 'Phone' || provider === 'Website' || provider === 'OpenTable' || provider === 'Resy' || provider === 'Yelp') {
        /* The anchor navigates. The question is asked when this page is visible again. */
      }
      if (!href) return;
    }
    async function loadAll() {
      const token = ++state.gen;
      state.loading = true;
      state.failed = false;
      renderSpots();
      const started = performance.now();
      try {
        const venue = await resolveVenue(state.event);
        if (token !== state.gen) return;
        state.venue = venue;
        const loc = $('plan-loc');
        if (venue.approximate) { loc.hidden = false; loc.textContent = venue.label; }
        else loc.hidden = true;
        const spots = await searchSpots(venue);
        if (token !== state.gen) return;
        state.dinner = spots.dinner;
        state.drinks = spots.drinks;
        state.parking = spots.parking;
        state.failed = !!spots.failed;
        state.loading = false;
        renderSpots();
        const timing = { ms: Math.round(performance.now() - started), failed: state.failed, dinner: state.dinner.length, drinks: state.drinks.length, parking: state.parking.length };
        if (typeof window !== 'undefined' && window.GRPlan) window.GRPlan.lastTiming = timing;
        loadWeather(venue, state.event);
      } catch (e) {
        if (token !== state.gen) return;
        state.loading = false;
        state.failed = true;
        renderSpots();
        $('plan-weather').textContent = 'Forecast temporarily unavailable';
      }
    }
    function open(button) {
      state.opener = button;
      state.event = eventFromButton(button);
      const plan = initialDinner(state.event.date, state.event.time, Date.now());
      state.dinnerAt = plan.dinnerAt;
      state.start = plan.start;
      state.end = plan.end;
      state.after = plan.after;
      state.hasClock = plan.hasClock;
      state.dinnerOk = true;
      state.party = 2;
      state.venue = null;
      state.dinner = [];
      state.drinks = [];
      state.parking = [];
      state.parkingShown = 3;
      state.preview = '';
      state.book = '';
      state.selected = null;
      state.pending = null;
      state.notice = '';
      $('plan-party').value = '2';
      writeDinnerInputs();
      $('plan-show-title').textContent = state.event.title;
      $('plan-show-when').textContent = state.event.when;
      const span = $('plan-show-span');
      if (plan.hasClock && plan.end != null) {
        span.hidden = false;
        span.textContent = 'Calendar event: ' + clockRange(plan.start, plan.end) + '.';
      } else { span.hidden = true; span.textContent = ''; }
      $('plan-show-venue').textContent = state.event.venue;
      $('plan-cal').dataset.id = state.event.id;
      $('plan-gcal').dataset.id = state.event.id;
      const listed = document.querySelector('.read-actions a.gcal');
      const listedHref = listed && listed.getAttribute('href');
      $('plan-gcal').href = listedHref && listedHref !== '#' ? listed.href : '#';
      $('plan-dinner-error').hidden = true;
      $('plan-dinner-error').textContent = '';
      $('plan-date').setAttribute('aria-invalid', 'false');
      $('plan-time').setAttribute('aria-invalid', 'false');
      $('plan-share-box').hidden = true;
      setNotice('');
      paintPending();
      $('plan-attr').hidden = true;
      $('plan-loc').hidden = true;
      renderRecords();
      if (!dialog.open) dialog.showModal();
      $('plan-title').focus();
      loadAll();
    }
    function openTab(url) {
      const popup = window.open(url, '_blank');
      if (popup) { try { popup.opener = null; } catch (e) {} return true; }
      return false;
    }
    document.addEventListener('click', ev => {
      const opener = ev.target.closest && ev.target.closest('button.plan-night');
      if (!opener) return;
      ev.preventDefault();
      open(opener);
    });
    $('plan-done').addEventListener('click', () => dialog.close());
    const restoreOpener = () => {
      state.gen++;
      const opener = state.opener;
      if (!opener || !opener.isConnected) return;
      const guard = ev => { if (ev.target !== opener) opener.focus(); };
      document.addEventListener('focusin', guard, true);
      opener.focus();
      setTimeout(() => { document.removeEventListener('focusin', guard, true); if (opener.isConnected) opener.focus(); }, 0);
    };
    dialog.addEventListener('cancel', restoreOpener);
    dialog.addEventListener('close', restoreOpener);
    $('plan-less').addEventListener('click', () => { $('plan-party').value = String(clampParty(readParty() - 1)); renderSpots(); });
    $('plan-more').addEventListener('click', () => { $('plan-party').value = String(clampParty(readParty() + 1)); renderSpots(); });
    $('plan-party').addEventListener('change', () => { readParty(); renderSpots(); });
    ['plan-date', 'plan-time'].forEach(id => {
      const onEdit = () => { if (!applyDinnerInputs()) state.book = ''; renderSpots(); };
      $(id).addEventListener('change', onEdit);
      $(id).addEventListener('input', onEdit);
    });
    $('plan-parking').addEventListener('click', () => {
      state.parkingShown = 8;
      renderSpots();
      const heading = document.getElementById('plan-sec-parking');
      if (heading) heading.scrollIntoView({ block: 'nearest' });
      if (!state.loading && !state.parking.length) {
        setNotice(state.failed ? 'Parking search failed. Try again when you are online.' : 'No nearby parking results. Check the venue\'s parking information.');
      }
    });
    function ride(which) {
      if (!state.venue) { setNotice('Still locating the venue.'); return; }
      if (state.venue.approximate) setNotice(state.venue.label + '. Verify the venue address before traveling.');
      const links = rideLinks(state.venue.lat, state.venue.lon, state.event.venue || state.event.title);
      const provider = which === 'uber' ? 'Uber' : 'Lyft';
      if (!openTab(links[which])) setNotice('Couldn\'t open ' + provider + '. Open the provider app and verify the venue address.');
    }
    $('plan-uber').addEventListener('click', () => ride('uber'));
    $('plan-lyft').addEventListener('click', () => ride('lyft'));
    $('plan-spots').addEventListener('click', ev => {
      const book = ev.target.closest('button.plan-book');
      if (book) {
        if (!applyDinnerInputs()) return;
        const key = book.getAttribute('data-kind') + ':' + book.getAttribute('data-index');
        state.book = state.book === key ? '' : key;
        renderSpots();
        return;
      }
      const pick = ev.target.closest('button.plan-pick');
      if (pick) {
        const key = pick.getAttribute('data-kind') + ':' + pick.getAttribute('data-index');
        const kind = pick.getAttribute('data-kind');
        const index = +pick.getAttribute('data-index');
        state.preview = state.preview === key ? '' : key;
        if (kind === 'dinner' && state.dinner[index]) state.selected = Object.assign({ kind: kind, index: index }, state.dinner[index]);
        renderSpots();
        return;
      }
      const link = ev.target.closest('a[data-provider]');
      if (!link || link.getAttribute('data-provider') === 'Directions') return;
      if (!applyDinnerInputs()) { ev.preventDefault(); return; }
      begin(link.getAttribute('data-kind'), +link.getAttribute('data-index'), link.getAttribute('data-provider'), link.getAttribute('href'));
    });
    $('plan-pending-btn').addEventListener('click', openAsk);
    $('plan-ask-yes').addEventListener('click', () => { savePending(); ask.close(); });
    $('plan-ask-no').addEventListener('click', () => { state.pending = null; paintPending(); ask.close(); });
    ask.addEventListener('cancel', () => { state.pending = null; paintPending(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.pending && dialog.open) openAsk();
    });
    $('plan-share').addEventListener('click', async () => {
      readParty();
      const savedForEvent = bookings().some(item => item.event && item.event.id === state.event.id);
      if (!savedForEvent && !applyDinnerInputs()) return;
      const text = shareText({
        event: state.event, party: state.party, dinnerAt: state.dinnerAt, selected: state.selected,
        dinner: state.dinner, drinks: state.drinks, bookings: bookings()
      });
      if (navigator.share) {
        try { await navigator.share({ title: 'Plan my night', text: text }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(text); setNotice('Plan copied.'); return; } catch (e) {}
      const box = $('plan-share-box');
      box.hidden = false;
      box.textContent = text;
    });
    $('plan-record-list').addEventListener('click', async ev => {
      const button = ev.target.closest('button[data-record]');
      if (!button) return;
      const id = button.getAttribute('data-record');
      if (button.classList.contains('plan-record-remove')) {
        storeBookings(bookings().filter(item => item.id !== id));
        renderRecords();
        return;
      }
      const item = bookings().find(record => record.id === id);
      if (!item) return;
      const text = bookingShare(item);
      if (navigator.share) {
        try { await navigator.share({ title: item.restaurant, text: text }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(text); setNotice('Plan copied.'); } catch (e) {
        $('plan-share-box').hidden = false;
        $('plan-share-box').textContent = text;
      }
    });
    $('plan-spots').addEventListener('error', ev => {
      const img = ev.target;
      if (!img || img.tagName !== 'IMG') return;
      img.dataset.bad = '1';
      img.style.visibility = 'hidden';
      const figure = img.closest('.plan-map');
      if (!figure || figure.dataset.dead) return;
      const imgs = figure.querySelectorAll('img');
      if (![...imgs].every(item => item.dataset.bad)) return;
      figure.dataset.dead = '1';
      const grid = figure.querySelector('.plan-map-grid');
      if (grid) grid.remove();
      figure.querySelectorAll('.plan-pin').forEach(pin => pin.remove());
      const note = document.createElement('p');
      note.className = 'plan-note';
      note.textContent = 'Map image unavailable. Use the direction links.';
      figure.prepend(note);
    }, true);
  }

  return {
    buttonHTML: buttonHTML, mount: mount, escapeHtml: escapeHtml, haversine: haversine, validCoord: validCoord,
    walkText: walkText, straightLineLabel: straightLineLabel, parseClock: parseClock, startMillis: startMillis,
    dinnerAt: dinnerAt, initialDinner: initialDinner, calendarEnd: calendarEnd, dinnerHeading: dinnerHeading,
    drinksHeading: drinksHeading, parseDinnerInputs: parseDinnerInputs, clockRange: clockRange, clampParty: clampParty, cityFromQuery: cityFromQuery,
    stamp: stamp, formatStamp: formatStamp, timeOnly: timeOnly, nearest: nearest, compactLabel: compactLabel,
    forecastPick: forecastPick, beyondRange: beyondRange, bookingLinks: bookingLinks, rideLinks: rideLinks,
    shareText: shareText, bookingShare: bookingShare, applySave: applySave, worldPoint: worldPoint,
    CENTERS: CENTERS, safeHttp: safeHttp, safeTel: safeTel, venueMatch: venueMatch, zonedToMs: zonedToMs
  };
});
