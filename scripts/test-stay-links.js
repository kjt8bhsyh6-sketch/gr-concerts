// Stay22 / Viator placement and the click-log path. No network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Stay = require('../stay-links.js');

const DEVOS = '303 Monroe Ave NW, Grand Rapids, MI 49503';
const VAN_ANDEL = '130 W Fulton St, Grand Rapids, MI 49503';
const GLC = '11 Ottawa Ave NW, Grand Rapids, MI 49503';

function listing(extra) {
  return Object.assign({
    title: 'Scott Bradlee\'s Postmodern Jukebox',
    venue: 'DeVos Performance Hall',
    address: DEVOS,
    date: '2026-11-08',
    genre: 'Jazz/Pop',
    page: 'concerts'
  }, extra);
}

test('Stay22 URL uses the documented Allez shape', () => {
  const href = Stay.stayHref(listing());
  const url = new URL(href);
  assert.equal(url.origin + url.pathname, 'https://www.stay22.com/allez/roam');
  assert.equal(url.searchParams.get('aid'), 'grhappenings');
  assert.equal(url.searchParams.get('address'), DEVOS);
  assert.equal(url.searchParams.get('checkin'), '2026-11-08');
  assert.equal(url.searchParams.get('checkout'), '2026-11-09');
  assert.equal(url.searchParams.get('campaign'), 'grh_concerts_devos_2026_11_08');
  assert.equal(url.searchParams.get('currency'), 'USD');
  assert.equal(url.searchParams.get('lat'), null);
  assert.equal(url.searchParams.get('lng'), null);
  assert.equal(url.searchParams.get('utm_source'), null);
  assert.equal(href.includes('checkin=&'), false);
  assert.equal(/-/.test(url.searchParams.get('campaign')), false);
  assert.match(href, /address=303%20Monroe%20Ave%20NW%2C%20Grand%20Rapids%2C%20MI%2049503/);
});

test('placement skips symphony, free, church, school, clubs, and missing addresses', () => {
  assert.equal(Stay.stayHref(listing({ title: 'GR Symphony: Midori Plays Shostakovich', genre: 'Classical' })), '');
  assert.equal(Stay.stayHref(listing({ title: 'Free Play 55: A/B Duo', venue: 'GVSU Haas Center for Performing Arts', address: 'Haas Center for Performing Arts, 1 Campus Dr, Allendale, MI 49401' })), '');
  assert.equal(Stay.stayHref(listing({ title: 'Choir concert', venue: 'Fountain Street Church', address: '24 Fountain St NE, Grand Rapids, MI 49503' })), '');
  assert.equal(Stay.stayHref(listing({ title: 'Student recital', venue: 'Calvin University Chapel', address: '3201 Burton St SE, Grand Rapids, MI 49546' })), '');
  assert.equal(Stay.stayHref(listing({ title: 'All Get Out', venue: 'The Pyramid Scheme', address: '68 Commerce Ave SW, Grand Rapids, MI 49503' })), '');
  assert.equal(Stay.stayHref(listing({ address: '', venue: 'Somewhere new' })), '');
  const paid = Stay.stayHref(listing({ title: 'Iliza Shlesinger – Free Nights & Weekends', date: '2027-04-08' }));
  assert.match(paid, /checkin=2027-04-08/);
  assert.match(paid, /checkout=2027-04-09/);
  const multi = Stay.stayHref(listing({
    title: 'Raanan Hershberg (Nov 5–7)',
    venue: 'Dr. Grins (at The B.O.B.)',
    address: 'The B.O.B., 20 Monroe Ave NW, Grand Rapids, MI 49503',
    date: '2026-11-05',
    end: '2026-11-07'
  }));
  assert.match(multi, /campaign=grh_concerts_dr_grins_at_the_b_o_b_2026_11_05/);
  assert.equal(Stay.decide(listing({ venue: 'Van Andel Arena', address: VAN_ANDEL })), 'named-venue');
  assert.equal(Stay.decide(listing({ venue: 'GLC Live at 20 Monroe', address: GLC })), 'named-venue');
  assert.equal(Stay.decide(listing({ venue: 'Acrisure Amphitheater', address: '201 Market Ave SW, Grand Rapids, MI 49503' })), 'named-venue');
});

test('buttons stay out of the Tickets control and hide Viator without a real mcid', () => {
  const html = Stay.buttonsHTML(listing(), null, { VIATOR_MCID: '' });
  assert.match(html, /class="b read-stay"/);
  assert.match(html, />Stay nearby</);
  assert.match(html, /rel="sponsored nofollow noopener"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, new RegExp(Stay.FTC.replace(/[.]/g, '\\.')));
  assert.equal(html.includes('read-tickets'), false);
  assert.equal(html.includes('viator.com'), false);
  assert.equal(html.includes('Things to do'), false);
  assert.equal(Stay.viatorHref(listing({ mcid: '' })), '');
  assert.equal(Stay.viatorHref(listing({ mcid: 'VIATOR_MCID' })), '');
  assert.equal(Stay.viatorHref(listing({ mcid: '42383' })), '');
  assert.equal(Stay.viatorHref(listing({ mcid: 'REPLACE_FROM_SELECTOR' })), '');
  const away = Stay.viatorHref(listing({
    mcid: '10001',
    venue: 'Park Theatre (Holland)',
    address: 'Park Theatre, 248 S River Ave, Holland, MI 49423'
  }));
  assert.equal(away, '');
  const ready = Stay.viatorHref(listing({ mcid: '10001' }));
  const via = new URL(ready);
  assert.equal(via.pathname, Stay.VIATOR_PATH);
  assert.equal(via.searchParams.get('pid'), 'P00330732');
  assert.equal(via.searchParams.get('mcid'), '10001');
  assert.equal(via.searchParams.get('medium'), 'link');
  assert.equal(via.searchParams.get('utm_source'), null);
  const shown = Stay.buttonsHTML(listing(), null, { VIATOR_MCID: '10001' });
  assert.match(shown, /class="b read-viator"/);
  assert.match(shown, />Things to do in Grand Rapids</);
  assert.equal((shown.match(/We may earn a commission if you book through this link\./g) || []).length, 2);
});

test('listing data does not put hotel or tour URLs in affiliate or link', () => {
  const concerts = fs.readFileSync(path.join(__dirname, '..', 'concerts.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.equal(concerts.includes('stay22.com'), false);
  assert.equal(concerts.includes('viator.com'), false);
  assert.match(app, /GRPane\.ticketsHTML\(c\.affiliate \|\| c\.link, 'Tickets'/);
  assert.match(app, /GRStay\.buttonsHTML\(\{ title: c\.artist/);
});

test('named venues in venues.js resolve without inventing a city', () => {
  const ctx = { module: { exports: {} }, exports: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'venues.js'), 'utf8') + '\nthis.VENUES = VENUES;', ctx);
  assert.equal(Stay.resolveAddress({ venue: 'DeVos Performance Hall' }, ctx.VENUES), DEVOS);
  assert.equal(Stay.resolveAddress({ venue: 'Not a real room' }, ctx.VENUES), '');
  const html = Stay.buttonsHTML({
    title: 'Gabriel Iglesias – The 1976 Tour',
    venue: 'Van Andel Arena',
    date: '2026-11-13',
    genre: 'Comedy',
    page: 'concerts'
  }, ctx.VENUES, { VIATOR_MCID: '' });
  assert.match(html, /address=130%20W%20Fulton%20St/);
  assert.equal(html.includes('viator.com'), false);
});

function loadTrack(hostname) {
  const counts = [];
  const beacons = [];
  const listeners = [];
  const card = {
    getAttribute(name) { return name === 'data-venue' ? 'GLC Live at 20 Monroe' : null; },
    querySelector(sel) {
      if (sel === '.read-title, h3') return { textContent: 'Trivium' };
      if (sel === '.read-place, h3 + p') return { textContent: 'GLC Live at 20 Monroe' };
      return null;
    }
  };
  function anchor(href) {
    return {
      href,
      classList: { contains() { return false; } },
      matches() { return false; },
      getAttribute(name) { return name === 'rel' ? 'sponsored nofollow noopener' : null; },
      closest(sel) {
        if (sel === 'a[href]') return anchor(href);
        if (sel === 'article.read-card' || sel === 'article.card') return card;
        return null;
      }
    };
  }
  const location = {
    hostname,
    pathname: '/index.html',
    search: '',
    href: 'https://' + hostname + '/index.html'
  };
  const document = {
    referrer: '',
    head: { appendChild() {} },
    createElement() { return { setAttribute() {} }; },
    addEventListener(type, fn) { listeners.push({ type, fn }); }
  };
  const window = {
    location,
    document,
    goatcounter: { count(entry) { counts.push(entry); } },
    sessionStorage: { getItem() { return '1'; }, setItem() {} },
    matchMedia() { return { matches: false }; }
  };
  const navigator = {
    sendBeacon(url, body) { beacons.push({ url, body }); return true; }
  };
  const context = vm.createContext({
    window, document, location, navigator,
    URL, URLSearchParams, Blob,
    setInterval() { return 0; },
    clearInterval() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'track.js'), 'utf8'), context);
  return { counts, beacons, listeners, anchor };
}

test('Stay22 and Viator hosts match TICKET_HOST and staging does not send', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'track.js'), 'utf8');
  const early = source.indexOf('location.hostname === "kjt8bhsyh6-sketch.github.io"');
  const hostAt = source.indexOf('var TICKET_HOST');
  assert.ok(early > 0 && early < hostAt);
  const hostLine = source.slice(hostAt).split('\n')[0];
  const expr = hostLine.replace(/^[^=]+=\s*/, '').replace(/;\s*$/, '');
  const TICKET_HOST = vm.runInNewContext(expr);
  assert.equal(TICKET_HOST.test('www.stay22.com'), true);
  assert.equal(TICKET_HOST.test('www.viator.com'), true);
  assert.equal(TICKET_HOST.test('example.com'), false);

  const staging = loadTrack('kjt8bhsyh6-sketch.github.io');
  assert.equal(staging.listeners.length, 0);
  assert.equal(staging.beacons.length, 0);
  assert.equal(staging.counts.length, 0);

  const live = loadTrack('grhappenings.com');
  const href = 'https://www.stay22.com/allez/roam?aid=grhappenings&address=11%20Ottawa%20Ave%20NW&checkin=2026-11-08&checkout=2026-11-09&campaign=grh_concerts_glc_2026_11_08&currency=USD';
  const target = live.anchor(href);
  live.listeners.filter(item => item.type === 'click').forEach(item => item.fn({ target }));
  assert.equal(live.counts.length, 1);
  assert.equal(live.counts[0].path, 'outbound/index/stay22-com');
  assert.equal(live.beacons.length, 1);
  assert.equal(live.beacons[0].url, '/api/public/click');
  const payload = JSON.parse(await live.beacons[0].body.text());
  assert.equal(payload.u, href);
  assert.equal(payload.c, 'affiliate');
  assert.equal(payload.p, 'index');
  assert.equal(payload.e, 'Trivium');

  const via = live.anchor('https://www.viator.com/Grand-Rapids/d50737-ttd?pid=P00330732&mcid=10001&medium=link');
  live.listeners.filter(item => item.type === 'click').forEach(item => item.fn({ target: via }));
  assert.equal(live.counts[1].path, 'outbound/index/viator-com');
  assert.equal(live.beacons[1].url, '/api/public/click');
});
