/* GoatCounter event tracking: one delegated listener, no visible behavior changes. */
(function () {
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'; };
  var send = function (path, title) {
    try { if (window.goatcounter && typeof window.goatcounter.count === 'function') window.goatcounter.count({ path: path, title: title, event: true }); } catch (e) {}
  };
  var cardName = function (el) {
    var card = el.closest('article.card'), h = card && card.querySelector('h3');
    return (h && h.textContent.trim()) || el.getAttribute('data-title') || el.getAttribute('data-id') || '';
  };
  var ACTIONS = [['going', 'going'], ['interested', 'interested'], ['ics', 'apple-calendar'], ['gcal', 'google-calendar'], ['whois', 'bio'], ['share', 'share']];
  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target; if (!t || !t.closest) return;
      var sub = t.closest('#sub-webcal, #sub-google');
      if (sub) { var k = sub.id === 'sub-google' ? 'google' : 'apple'; send('tap/' + page + '/subscribe-calendar/' + k, 'Subscribe calendar (' + k + ')'); return; }
      var el = t.closest('article.card a.primary, article.card .b');
      if (!el) return;
      var name = cardName(el);
      if (el.matches('a.primary')) { send('tickets/' + page + '/' + slug(name), name); return; }
      for (var i = 0; i < ACTIONS.length; i++) if (el.classList.contains(ACTIONS[i][0])) { send('tap/' + page + '/' + ACTIONS[i][1] + '/' + slug(name), name); return; }
    } catch (e) {}
  }, true);
  document.addEventListener('submit', function (ev) {
    try { var f = ev.target; if (f && f.closest && f.closest('.signup') && f.querySelector('input[type=email]')) send('tap/' + page + '/email-signup/' + page, 'Email signup (' + page + ')'); } catch (e) {}
  }, true);
})();
