/* Analytics: GoatCounter events (one delegated listener, no visible behavior changes)
   + optional Cloudflare Web Analytics beacon. See docs/ANALYTICS.md. */
(function () {
  /* Cloudflare Web Analytics site token (public, safe to commit). Empty = beacon off.
     Get it from Cloudflare dashboard > Web Analytics > grhappenings.com > Manage site. */
  var CF_BEACON_TOKEN = '';
  try {
    if (CF_BEACON_TOKEN && /(^|\.)grhappenings\.com$/.test(location.hostname)) {
      var b = document.createElement('script');
      b.defer = true; b.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      b.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }));
      document.head.appendChild(b);
    }
  } catch (e) {}

  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'; };
  var queue = [];
  var send = function (path, title) {
    try {
      if (window.goatcounter && typeof window.goatcounter.count === 'function') window.goatcounter.count({ path: path, title: title, event: true });
      else if (queue.length < 20) queue.push([path, title]);
    } catch (e) {}
  };
  /* flush events fired before count.js finished loading */
  var flush = function () { if (window.goatcounter && window.goatcounter.count) { var q = queue; queue = []; q.forEach(function (x) { send(x[0], x[1]); }); return true; } };
  var tries = 0, iv = setInterval(function () { if (flush() || ++tries > 20) clearInterval(iv); }, 500);

  /* Campaign / referrer capture (once per session). GoatCounter already records
     the referrer and utm_source/ref on the pageview; these events add medium/campaign. */
  try {
    var qs = new URLSearchParams(location.search), ss = window.sessionStorage;
    if (!ss.getItem('grh_src')) {
      ss.setItem('grh_src', '1');
      var src = qs.get('utm_source') || qs.get('ref') || qs.get('source');
      if (src) send('campaign/' + slug(src) + '/' + slug(qs.get('utm_medium') || 'none') + '/' + slug(qs.get('utm_campaign') || 'none'),
        'Campaign: ' + [src, qs.get('utm_medium'), qs.get('utm_campaign')].filter(Boolean).join(' / '));
      var ref = document.referrer && new URL(document.referrer).hostname;
      if (ref && ref !== location.hostname) send('referrer/' + slug(ref.replace(/^www\./, '')), 'Referrer: ' + ref);
      if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) send('app/launch-standalone', 'Opened as home-screen app');
    }
  } catch (e) {}

  var card = function (el) { return el.closest('article.card'); };
  var cardName = function (el) {
    var c = card(el), h = c && c.querySelector('h3');
    return (h && h.textContent.trim()) || el.getAttribute('data-title') || el.getAttribute('data-id') || '';
  };
  var cardVenue = function (el) {
    var c = card(el); if (!c) return '';
    var v = c.getAttribute('data-venue'); if (v) return v;
    var p = c.querySelector('h3 + p'); return p ? p.textContent.trim() : '';
  };
  var ACTIONS = [['going', 'going'], ['interested', 'interested'], ['ics', 'apple-calendar'], ['gcal', 'google-calendar'], ['whois', 'bio'], ['share', 'share']];
  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target; if (!t || !t.closest) return;
      var sub = t.closest('#sub-webcal, #sub-google');
      if (sub) { var k = sub.id === 'sub-google' ? 'google' : 'apple'; send('tap/' + page + '/subscribe-calendar/' + k, 'Subscribe calendar (' + k + ')'); return; }
      var el = t.closest('article.card a.primary, article.card .b');
      if (el) {
        var name = cardName(el), venue = cardVenue(el);
        if (el.matches('a.primary')) {
          send('tickets/' + page + '/' + slug(name), name);
          send('tickets-venue/' + page + '/' + slug(venue), 'Tickets: ' + (venue || 'unknown venue'));
          return;
        }
        for (var i = 0; i < ACTIONS.length; i++) if (el.classList.contains(ACTIONS[i][0])) { send('tap/' + page + '/' + ACTIONS[i][1] + '/' + slug(name), name); return; }
      }
      var ics = t.closest('a[href$=".ics"], a[href*=".ics?"], a[href^="webcal:"]');
      if (ics) { send('download/' + page + '/ics/' + slug(ics.getAttribute('href').split('/').pop().split('?')[0]), 'Calendar download'); return; }
      var a = t.closest('a[href]');
      if (a && /^https?:/.test(a.href)) {
        var host = new URL(a.href).hostname;
        if (host && host !== location.hostname) send('outbound/' + page + '/' + slug(host.replace(/^www\./, '')), 'Outbound: ' + host);
      }
    } catch (e) {}
  }, true);

  /* alert sign-up: start = first focus on the email field, complete = form submitted */
  var started = {};
  document.addEventListener('focusin', function (ev) {
    try { var f = ev.target && ev.target.closest && ev.target.closest('.signup form'); if (f && ev.target.type === 'email' && !started[page]) { started[page] = 1; send('tap/' + page + '/email-signup-start/' + page, 'Email signup started (' + page + ')'); } } catch (e) {}
  }, true);
  document.addEventListener('submit', function (ev) {
    try { var f = ev.target; if (f && f.closest && f.closest('.signup') && f.querySelector('input[type=email]')) send('tap/' + page + '/email-signup/' + page, 'Email signup (' + page + ')'); } catch (e) {}
  }, true);
})();
