// Phase A travel links for the reading pane. Stay22 Allez only.
// Viator stays hidden until CONFIG.VIATOR_MCID is a real Selector value.
// Docs: https://dev.stay22.com/docs/allez/parameters
//       https://dev.stay22.com/docs/allez/quick-start
//       https://partnerresources.viator.com/travel-content/links/create-links/
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GRStay = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const FTC = 'We may earn a commission if you book through this link.';
  const AID = 'grhappenings';
  const VIATOR_PID = 'P00330732';
  // Public Grand Rapids tours page, confirmed 2026-11-09. Not used while mcid is empty.
  const VIATOR_PATH = '/Grand-Rapids/d50737-ttd';
  const BLOCKED_MCID = { '': 1, VIATOR_MCID: 1, REPLACE_FROM_SELECTOR: 1, '42383': 1 };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function isIso(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  }
  function addDays(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return dt.toISOString().slice(0, 10);
  }
  function isSymphony(title) {
    return /\bGR Symphony\b|\bGrand Rapids Symphony\b/i.test(String(title || ''));
  }
  // A title that merely contains "free" (Free Nights, Free Beer) is still a paid show.
  function hotelBook() {
    if (typeof STAY_HOTELS !== 'undefined' && STAY_HOTELS && STAY_HOTELS.STAY_HOTELS) return STAY_HOTELS;
    if (typeof require === 'function') {
      try { return require('./stay-hotels.js'); } catch (e) {}
    }
    return null;
  }
  function hotelFor(venue) {
    const book = hotelBook();
    const map = book && book.STAY_HOTELS;
    return map && venue && map[venue] ? map[venue] : null;
  }
  function resolveAddress(item, venues) {
    if (item && item.address) return String(item.address).trim();
    const map = venues || (typeof VENUES !== 'undefined' ? VENUES : null);
    const venue = item && item.venue;
    if (!map || !venue || !Object.prototype.hasOwnProperty.call(map, venue)) return '';
    return String(map[venue] || '').trim();
  }
  function decide(item) {
    const title = item.title || '';
    const venue = item.venue || '';
    const address = item.address || '';
    if (!address) return 'no-address';
    if (isSymphony(title)) return 'symphony';
    if (!isIso(item.date)) return 'no-date';
    return 'stay';
  }
  function placeToken(venue) {
    const v = String(venue || '').toLowerCase();
    if (v.includes('van andel')) return 'van_andel';
    if (v.includes('devos')) return 'devos';
    if (v.includes('glc live') || v.includes('20 monroe')) return 'glc';
    if (v.includes('meijer')) return 'meijer_gardens';
    if (v.includes('acrisure')) return 'acrisure';
    return v.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'venue';
  }
  function campaignFor(page, venue, date) {
    const p = String(page || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'page';
    return 'grh_' + p + '_' + placeToken(venue) + '_' + String(date).replace(/-/g, '_');
  }
  function stayHref(item) {
    if (decide(item) !== 'stay') return '';
    const hotel = hotelFor(item.venue);
    const address = hotel ? hotel.address : item.address;
    const checkin = item.date;
    const checkout = addDays(checkin, 1);
    const campaign = campaignFor(item.page, item.venue, checkin);
    if (/-/.test(campaign)) return '';
    let href = 'https://www.stay22.com/allez/roam?aid=' + encodeURIComponent(AID)
      + '&address=' + encodeURIComponent(address);
    if (hotel) href += '&hotelname=' + encodeURIComponent(hotel.hotel);
    return href
      + '&checkin=' + encodeURIComponent(checkin)
      + '&checkout=' + encodeURIComponent(checkout)
      + '&campaign=' + encodeURIComponent(campaign)
      + '&currency=USD';
  }
  function isGrandRapids(address) {
    const a = String(address || '');
    if (!/\bGrand Rapids\b/.test(a)) return false;
    return !/\b(Holland|Saugatuck|Douglas|Zeeland|Battle Creek|New Buffalo|Mount Pleasant|Mt\. Pleasant|Wayland|Lowell|Allendale|Fennville|Comstock Park)\b/.test(a);
  }
  function realMcid(value) {
    const m = String(value == null ? '' : value).trim();
    if (!m || BLOCKED_MCID[m]) return '';
    if (!/^[0-9]{4,12}$/.test(m)) return '';
    return m;
  }
  function viatorHref(item) {
    const mcid = realMcid(item.mcid);
    if (!mcid) return '';
    if (!isGrandRapids(item.address)) return '';
    if (decide(item) !== 'stay') return '';
    return 'https://www.viator.com' + VIATOR_PATH
      + '?pid=' + VIATOR_PID
      + '&mcid=' + encodeURIComponent(mcid)
      + '&medium=link';
  }
  function anchorHTML(href, label, kind) {
    return '<a class="b read-' + kind + '" href="' + escapeHtml(href) + '" target="_blank" rel="sponsored nofollow noopener">' + escapeHtml(label) + '</a>';
  }
  function stayBlock(listing) {
    const href = stayHref(listing);
    if (!href) return '';
    const hotel = hotelFor(listing.venue);
    const book = hotelBook();
    const ftc = '<p class="read-ftc">' + FTC + '</p>';
    if (!hotel) {
      return '<div class="read-travel-item">' + anchorHTML(href, 'Hotels near ' + (listing.venue || 'the venue'), 'stay') + ftc + '</div>';
    }
    const meta = book && book.distanceLabel ? book.distanceLabel(hotel.meters) : '';
    return '<div class="read-travel-item"><p class="read-stay-place">' + escapeHtml(hotel.hotel) + '</p><p class="read-stay-meta">' + escapeHtml(meta) + '</p>' + anchorHTML(href, 'Stay nearby', 'stay') + ftc + '</div>';
  }
  function buttonsHTML(item, venues, config) {
    const address = resolveAddress(item || {}, venues);
    const cfg = config || (typeof CONFIG !== 'undefined' ? CONFIG : {});
    const listing = {
      title: item && item.title,
      venue: item && item.venue,
      date: item && item.date,
      end: item && item.end,
      genre: item && item.genre,
      page: item && item.page,
      address: address,
      mcid: cfg.VIATOR_MCID
    };
    const stay = stayBlock(listing);
    const viaHref = viatorHref(listing);
    const via = viaHref ? '<div class="read-travel-item">' + anchorHTML(viaHref, 'Things to do in Grand Rapids', 'viator') + '<p class="read-ftc">' + FTC + '</p></div>' : '';
    if (!stay && !via) return '';
    return '<div class="read-travel">' + stay + via + '</div>';
  }

  return {
    FTC: FTC,
    VIATOR_PATH: VIATOR_PATH,
    decide: decide,
    campaignFor: campaignFor,
    stayHref: stayHref,
    viatorHref: viatorHref,
    realMcid: realMcid,
    isGrandRapids: isGrandRapids,
    resolveAddress: resolveAddress,
    hotelFor: hotelFor,
    buttonsHTML: buttonsHTML
  };
});
