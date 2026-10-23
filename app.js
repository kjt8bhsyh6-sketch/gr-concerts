// Page logic: renders shows, NEW badges, Just Announced, filters, favorites, calendar, sharing.
// You normally never need to edit this file — edit concerts.js or config.js (seasonal events: seasonal.js + seasonal-app.js) instead.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7, SITE = C.SITE_URL || location.href.split('#')[0];
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // Security: card links must be http(s); anything else (e.g. javascript:) becomes '#'.
  [CONCERTS].forEach(a => a && a.forEach(x => ['link', 'affiliate'].forEach(k => { if (x[k] && !/^https?:\/\//i.test(String(x[k]))) x[k] = '#'; })));
  // Testing only: ?today=YYYY-MM-DD pretends it's that day; ?demo=mix also back-dates 2 of every 3 items by 30 days (in this browser only) so NEW and older cards can be compared.
  const qs = new URLSearchParams(location.search), qt = qs.get('today');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(qt || '') ? qt : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
  if (qs.get('demo') === 'mix') [CONCERTS].forEach(a => a.forEach((x, i) => { if (i % 3 && x.added) x.added = new Date(Date.parse(x.added) - 30 * 864e5).toISOString().slice(0, 10); }));
  const ago = d => (Date.parse(today) - Date.parse(d)) / 864e5;
  const isNew = x => x.added && ago(x.added) >= 0 && ago(x.added) < NEW_DAYS;
  const newBadge = x => isNew(x) ? `<span class="new">NEW</span>` : '';
  const addedLine = x => isNew(x) ? `<p class="added-on">Added ${new Date(x.added + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : '';
  function newCount(n, cb) {
    const el = $('#newcount'); if (!el) return;
    el.hidden = !n;
    el.innerHTML = `<span class="new">NEW</span> <strong>${n}</strong> new listing${n === 1 ? '' : 's'} added this week <button type="button" class="b newtoggle" aria-pressed="${cb.checked}">${cb.checked ? 'Show all' : 'Show only new'}</button>`;
  }
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const cid = c => 'show-' + GRICS.id(c);
  const sortKey = c => c.date + String(GRICS.to24(c.time)[0]).padStart(2, '0') + String(GRICS.to24(c.time)[1]).padStart(2, '0');
  // last night of a multi-night run: optional end:"YYYY-MM-DD", else read from a title like "(Nov 5–7)", "(…, Jan 15–24)", "(Nov 20–Dec 20)"
  const MON = 'JanFebMarAprMayJunJulAugSepOctNovDec';
  const endOf = c => { if (/^\d{4}-\d{2}-\d{2}$/.test(c.end || '')) return c.end;
    const m = /\b([A-Z][a-z]{2})\s+(\d{1,2})\s*[–-]\s*(?:([A-Z][a-z]{2})\s+)?(\d{1,2})\)\s*$/.exec(c.artist); if (!m) return c.date;
    const em = MON.indexOf(m[3] || m[1]) / 3 + 1; if (em < 1) return c.date; const y = +c.date.slice(0, 4) + (em < +c.date.slice(5, 7) ? 1 : 0);
    const e = `${y}-${String(em).padStart(2, '0')}-${String(m[4]).padStart(2, '0')}`; return e > c.date ? e : c.date; };
  const shows = CONCERTS.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // ---- favorites ("I'm going" / "I'm interested"): shared code in marks.js, stored only in this browser ----
  Marks.seedDemo(shows.filter(c => c.week === 'this').map(cid));

  $('#updated').textContent = 'Last updated ' + LAST_UPDATED;

  const BIO = (typeof BIOS !== 'undefined' && BIOS) || {};
  function actions(id, title, cal, link, label, aff, artist, place) {
    const bio = artist && BIO[artist];
    return `<div class="actions${bio ? ' has-bio' : ''}">
      <a class="b primary" href="${h(link)}" target="_blank" rel="${aff ? 'sponsored noopener' : 'noopener'}">${label}</a>
      ${bio ? `<button type="button" class="b whois" data-id="${id}" aria-haspopup="dialog">Who is this?</button>` : ''}
      ${Marks.buttons(id)}
      <button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>
      ${cal ? `<button type="button" class="b ics" data-id="${id}">Apple Cal</button><a class="b gcal" data-id="${id}" href="${h(cal)}" target="_blank" rel="noopener">Google Cal</a>` : ''}
      ${place ? GRMAP.buttons(place) : ''}
    </div>`;
  }
  function concertCard(c) {
    const id = cid(c);
    return `<article class="card${isNew(c) ? ' is-new' : ''}${Marks.cardClass(id)}" id="${id}" data-venue="${h(c.venue)}" data-genre="${h(c.genre)}" data-id="${id}">
      <div class="badges"><span class="tag">${h(c.genre)}</span>${newBadge(c)}</div>
      <h3>${h(c.artist)}</h3><p>${h(c.venue)}</p><p>${fmt(c.date)} · ${h(c.time)}</p>${addedLine(c)}
      ${actions(id, c.artist + ' at ' + c.venue + ', ' + fmt(c.date), GRICS.google(c), c.affiliate || c.link, 'Tickets / info', !!c.affiliate, c.artist, c.venue)}</article>`;
  }
  // ---- Just Announced: newest additions first (upcoming shows; seasonal events live on seasonal.html) ----
  const recent = [...shows.filter(c => ago(c.date) <= 0).map(c => ({ k: c.added, t: c.artist, s: `${c.venue} · ${fmt(c.date)}`, id: cid(c), n: isNew(c) }))]
    .filter(x => x.k).sort((a, b) => b.k.localeCompare(a.k)).slice(0, C.JUST_ANNOUNCED_MAX || 8);
  $('#just').innerHTML = recent.length ? recent.map(x =>
    `<li><a href="#${x.id}">${h(x.t)}</a> <span class="muted">${h(x.s)} · added ${fmt(x.k)}</span>${x.n ? ' <span class="new">NEW</span>' : ''}</li>`).join('')
    : '<li>Nothing new yet.</li>';

  // ---- filters ----
  const uniq = k => [...new Set(shows.map(c => c[k]))].sort();
  const fill = (sel, vals) => sel.insertAdjacentHTML('beforeend', vals.map(v => `<option>${h(v)}</option>`).join(''));
  fill($('#f-venue'), uniq('venue')); fill($('#f-genre'), uniq('genre'));

  function render() {
    const v = $('#f-venue').value, g = $('#f-genre').value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const ok = c => (!v || c.venue === v) && (!g || c.genre === g) && Marks.match(cid(c), mine) && (!nw || isNew(c));
    const rg = range(), inR = !!rg;
    document.querySelectorAll('section.wk').forEach(x => x.hidden = inR); $('#range-sec').hidden = !inR;
    $('.subtitle').textContent = inR ? `Shows from ${md(rg[0])} to ${md(rg[1])}` : 'Concerts, This Week and Next';
    if (inR) {
      const all = shows.filter(c => c.date <= rg[1] && endOf(c) >= rg[0]), l = all.filter(ok);
      $('#range-h').textContent = `Shows from ${md(rg[0])} to ${md(rg[1])}`;
      $('#range-n').textContent = `${l.length} show${l.length === 1 ? '' : 's'}` + (l.length < all.length ? ` (of ${all.length}, filters on)` : '');
      $('#range-list').innerHTML = l.map(concertCard).join('') || (all.length ? '<p class="few">No shows match these filters.</p>' : '<p class="few">Nothing listed in those dates yet; check back, we add shows daily.</p>');
    }
    // week sections are hidden in range view; leave them empty so card ids stay unique (anchors, pick taps, marks)
    ['this', 'next', 'later'].forEach(w => {
      if (inR) { document.getElementById(w).innerHTML = ''; return; }
      const all = shows.filter(c => c.week === w), l = all.filter(ok), el = document.getElementById(w);
      el.innerHTML = l.map(concertCard).join('') ||
        '<p class="few">No shows match these filters.</p>';
      if (all.length < 3 && l.length === all.length) el.insertAdjacentHTML('beforeend', '<p class="few">Few shows found this week.</p>');
    });
    newCount(shows.filter(c => ago(c.date) <= 0 && isNew(c)).length, $('#f-new'));
  }
  // ---- date range picker ("Looking for something further out?"): shared code in date-range.js ----
  const DR = DateRange.init({ today, lastDate: shows.map(endOf).sort().pop(), onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  $('#f-clear').addEventListener('click', () => { $('#f-venue').value = $('#f-genre').value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; render(); });
  $('#newcount') && $('#newcount').addEventListener('click', ev => { if (ev.target.closest('.newtoggle')) { const cb = $('#f-new'); cb.checked = !cb.checked; render(); } });
  render();

  // ---- buttons (event delegation) ----
  const byId = id => shows.find(c => cid(c) === id);
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }
  // Google link: title reflects the current mark at click time (★ Going / ♥ Interested)
  const gcalFix = ev => { const a = ev.target.closest('a.gcal'); if (!a || !a.dataset.id) return; const c = byId(a.dataset.id); if (c) a.href = GRICS.google(c, Marks.state(a.dataset.id)); };
  document.addEventListener('click', gcalFix, true); document.addEventListener('auxclick', gcalFix, true); document.addEventListener('contextmenu', gcalFix, true);
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const id = b.dataset.id;
    if (Marks.handle(b)) {
      if ($('#f-mine').value) render();
    } else if (b.classList.contains('share')) {
      const url = SITE + '#' + id, title = b.dataset.title;
      if (navigator.share) { try { await navigator.share({ title, text: title + ' — Grand Rapids Happenings', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch (e) { window.prompt('Copy this link:', url); }
    } else if (b.classList.contains('whois')) {
      const c = byId(id); if (c) openBio(c, b);
    } else if (b.classList.contains('ics')) {
      const c = byId(id); if (!c) return;
      const blob = new Blob([GRICS.calendar([c], c.artist, Marks.state(id))], { type: 'text/calendar' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = GRICS.id(c) + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });

  // ---- "Who is this?" pop-up: shared code in bio-modal.js, text from bios.js ----
  function openBio(c, opener) { const bio = BIO[c.artist]; if (bio) BioModal.open([{ title: c.artist, text: bio.text, source: bio.source }], opener); }

  // ---- calendar subscribe links ----
  const feed = SITE.replace(/\/?$/, '/') + 'concerts.ics';
  $('#sub-webcal').href = feed.replace(/^https?:/, 'webcal:');
  $('#sub-google').href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(feed.replace(/^https?:/, 'webcal:'));
  $('#sub-url').textContent = feed;

  // ---- schema.org Event JSON-LD (helps Google show these as events) ----
  const ld = shows.filter(c => ago(c.date) <= 0).map(c => ({
    '@context': 'https://schema.org', '@type': 'MusicEvent', name: c.artist, startDate: GRICS.startISO(c),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: c.venue, address: { '@type': 'PostalAddress', addressLocality: 'Grand Rapids', addressRegion: 'MI', addressCountry: 'US' } },
    performer: { '@type': 'PerformingGroup', name: c.artist }, url: c.link, offers: { '@type': 'Offer', url: c.link }
  }));
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);

  // ---- optional: Submit-an-event form + giscus comments (hidden until set in config.js) ----
  if (C.SUBMIT_FORM_URL) { $('#submit').hidden = false; $('#submit-link').href = C.SUBMIT_FORM_URL; }
  const G = C.GISCUS || {};
  if (G.repo && G.repoId && G.category && G.categoryId) {
    $('#comments').hidden = false;
    const gs = document.createElement('script'); gs.src = 'https://giscus.app/client.js'; gs.async = true; gs.crossOrigin = 'anonymous';
    Object.entries({ repo: G.repo, 'repo-id': G.repoId, category: G.category, 'category-id': G.categoryId, mapping: 'pathname',
      'reactions-enabled': '1', 'input-position': 'top', theme: 'light', lang: 'en', loading: 'lazy' }).forEach(([k, v]) => gs.setAttribute('data-' + k, v));
    $('#giscus').appendChild(gs);
  }
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { t.scrollIntoView(); t.classList.add('flash'); } }
})();
