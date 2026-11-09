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
  function isFreeListing(title, genre) {
    const t = String(title || '');
    const g = String(genre || '');
    if (/^free\b/i.test(t)) return true;
    if (/^free$/i.test(g.trim())) return true;
    return /\bfree admission\b|\bno cover\b|\bno charge\b|\badmission is free\b/i.test(t + ' ' + g);
  }
  function isChurch(venue, address) {
    return /\b(church|chapel|congregational)\b/i.test(String(venue || '') + ' ' + String(address || ''));
  }
  function isSchool(venue, address) {
    return /\b(university|college|school|grcc|gvsu|calvin)\b|haas center|knickerbocker|dimnent|covenant fine arts|gezon auditorium|spoelhof|northview performing|jack h\. miller|hope college/i.test(String(venue || '') + ' ' + String(address || ''));
  }
  // Spec names plus Acrisure, the arena-scale outdoor room. Calvin is a school and is excluded above.
  function isNamedStay(venue, address) {
    return /van andel arena|devos performance hall|glc live at 20 monroe|meijer gardens|acrisure amphitheater/i.test(String(venue || '') + ' ' + String(address || ''));
  }
  function isMultiDay(date, end) {
    return isIso(date) && isIso(end) && end > date;
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
    if (isFreeListing(title, item.genre)) return 'free';
    if (isChurch(venue, address)) return 'church';
    if (isSchool(venue, address)) return 'school';
    if (!isIso(item.date)) return 'no-date';
    if (isNamedStay(venue, address)) return 'named-venue';
    if (isMultiDay(item.date, item.end)) return 'multi-day';
    return 'not-overnight';
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
    const address = item.address || '';
    if (decide(item) !== 'named-venue' && decide(item) !== 'multi-day') return '';
    const checkin = item.date;
    const checkout = addDays(checkin, 1);
    const campaign = campaignFor(item.page, item.venue, checkin);
    if (/-/.test(campaign)) return '';
    return 'https://www.stay22.com/allez/roam?aid=' + encodeURIComponent(AID)
      + '&address=' + encodeURIComponent(address)
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
    if (decide(item) !== 'named-venue' && decide(item) !== 'multi-day') return '';
    return 'https://www.viator.com' + VIATOR_PATH
      + '?pid=' + VIATOR_PID
      + '&mcid=' + encodeURIComponent(mcid)
      + '&medium=link';
  }
  function linkHTML(href, label, kind) {
    return '<div class="read-travel-item"><a class="b read-' + kind + '" href="' + escapeHtml(href) + '" target="_blank" rel="sponsored nofollow noopener">' + escapeHtml(label) + '</a><p class="read-ftc">' + FTC + '</p></div>';
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
    const stay = stayHref(listing);
    const via = viatorHref(listing);
    if (!stay && !via) return '';
    return '<div class="read-travel">' + (stay ? linkHTML(stay, 'Stay nearby', 'stay') : '') + (via ? linkHTML(via, 'Things to do in Grand Rapids', 'viator') : '') + '</div>';
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
    buttonsHTML: buttonsHTML
  };
});
