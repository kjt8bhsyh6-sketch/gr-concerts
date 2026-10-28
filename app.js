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
  // Agenda row: clock (and ET) in the left column. The day lives in the group header. A multi-night end date stays on the clock.
  const shortMD = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  function timeCell(date, time, end) {
    const span = end && end > date;
    if (!time) return `<div class="row-time is-long"><time datetime="${h(date)}">${h(shortMD(date))}${span ? ` – ${h(shortMD(end))}` : ''}</time></div>`;
    const clock = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(time);
    let dt = date;
    if (clock) { let hh = +clock[1] % 12; if (/p/i.test(clock[3])) hh += 12; dt = `${date}T${String(hh).padStart(2, '0')}:${clock[2]}`; }
    const thru = span ? `<span class="row-thru">– ${h(shortMD(end))}</span>` : '';
    return `<div class="row-time${time.length > 8 ? ' is-long' : ''}"><time datetime="${h(dt)}">${h(time)}</time><span class="row-tz">ET</span>${thru}</div>`;
  }
  function groupDays(items, dateOf, renderItem, tag) {
    const t = tag || 'h3';
    let html = '', last = '', buf = '', label = '';
    const flush = () => { if (buf) html += `<section class="day"><${t} class="day-h">${h(label)}</${t}>${buf}</section>`; };
    items.forEach(item => {
      const d = dateOf(item);
      if (d !== last) {
        flush(); buf = ''; last = d;
        label = new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }
      buf += renderItem(item);
    });
    flush();
    return html;
  }
  function actions(id, title, cal, link, label, aff, artist, place) {
    const bio = artist && BIO[artist];
    const shortLabel = /ticket/i.test(label) ? 'Tickets' : 'Info';
    const tickets = `<a class="b primary row-tickets" href="${h(link)}" target="_blank" rel="${aff ? 'sponsored noopener' : 'noopener'}" aria-label="${h(label)}"><span class="tk-full">${h(label)}</span><span class="tk-short">${shortLabel}</span></a>`;
    const maps = place ? `<div class="row-maps">${GRMAP.buttons(place)}</div>` : '';
    const bar = `<div class="actions row-actions${bio ? ' has-bio' : ''}">
      ${bio ? `<button type="button" class="b whois" data-id="${id}" aria-haspopup="dialog">Who is this?</button>` : ''}
      ${Marks.buttons(id)}
      <button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>
      ${cal ? `<button type="button" class="b ics" data-id="${id}" aria-label="Add to Apple Calendar" title="Add to Apple Calendar"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.4 6.6c-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.3 1.1-3 0 0 .1 0 .1-.1.8-.7 2.1-1.2 3.2-1.2.1 1.2-.3 2.3-1.5 3zm.6 1.6c-1.8-.1-3.3 1-4.1 1-.9 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.6 2.8-2 3.4-.5 8.4 1.4 11.2.9 1.4 2 2.9 3.4 2.8 1.4 0 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.7 1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-2.9-4.4 0-2.7 2.2-4 2.3-4.1-1.3-1.8-3.2-2.1-3.7-2.4z"/></svg></button><a class="b gcal" data-id="${id}" href="${h(cal)}" target="_blank" rel="noopener" aria-label="Add to Google Calendar" title="Add to Google Calendar"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.3c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.6z"/><path fill="#EA4335" d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.8 14.7 2 12 2a10 10 0 0 0-8.9 5.7l3.3 2.6c.8-2.4 3-4.5 5.6-4.5z"/></svg></a>` : ''}
    </div>`;
    return { tickets, maps, bar };
  }
  function concertCard(c) {
    const id = cid(c);
    const end = endOf(c);
    const act = actions(id, c.artist + ' at ' + c.venue + ', ' + fmt(c.date), GRICS.google(c), c.affiliate || c.link, 'Tickets / info', !!c.affiliate, c.artist, c.venue);
    return `<article class="card agenda-row${isNew(c) ? ' is-new' : ''}${Marks.cardClass(id)}" id="${id}" data-venue="${h(c.venue)}" data-genre="${h(c.genre)}" data-id="${id}">
      ${timeCell(c.date, c.time, end > c.date ? end : '')}
      <div class="row-body"><h4 class="row-title">${h(c.artist)}${newBadge(c)}</h4><p class="card-venue">${h(c.venue)}</p><p class="card-tags"><span class="tag">${h(c.genre)}</span></p>${addedLine(c)}</div>
      ${act.maps}${act.tickets}${act.bar}</article>`;
  }
  // ---- Just Announced: newest additions first (upcoming shows; seasonal events live on seasonal.html) ----
  const recent = [...shows.filter(c => ago(c.date) <= 0).map(c => ({ k: c.added, t: c.artist, s: `${c.venue} · ${fmt(c.date)}`, id: cid(c), n: isNew(c) }))]
    .filter(x => x.k).sort((a, b) => b.k.localeCompare(a.k)).slice(0, C.JUST_ANNOUNCED_MAX || 8);
  $('#just').innerHTML = recent.length ? recent.map(x =>
    `<li><a href="#${x.id}">${h(x.t)}</a> <span class="muted">${h(x.s)} · added ${fmt(x.k)}</span>${x.n ? ' <span class="new">NEW</span>' : ''}</li>`).join('')
    : '<li>Nothing new yet.</li>';

  // ---- filters & search (normalizes "Saint"/"St.", apostrophes like "Cecilia's" -> "cecilia", and diacritics) ----
  const uniq = k => [...new Set(shows.map(c => c[k]))].sort();
  const fill = (sel, vals) => sel.insertAdjacentHTML('beforeend', vals.map(v => `<option>${h(v)}</option>`).join(''));
  fill($('#f-venue'), uniq('venue')); fill($('#f-genre'), uniq('genre'));
  const norm = s => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]s\b/g, '')
    .replace(/['’`´.]/g, '')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const searchBlob = c => {
    const bio = (BIO[c.artist] && BIO[c.artist].text) || '';
    const extra = /^(classical|orchestral)$/i.test(c.genre) ? ' classical orchestral symphony concerto philharmonic' : '';
    const vExtra = c.venue === 'St. Cecilia Music Center' ? ' saint cecilia royce auditorium' : '';
    return norm(c.artist + ' ' + c.venue + ' ' + c.genre + ' ' + bio + extra + vExtra);
  };
  const qEl = $('#f-q');
  if (qEl && qs.get('q')) qEl.value = qs.get('q');
  // Coming Up (#later-sec) stays hidden until a filter is on. A Just Announced click or
  // a #show- deep link to a card in that section pins it open so the target is on screen.
  // Cleared when the visitor changes filters or hits Clear (render() then hides it again).
  let pinLater = false;

  function render() {
    const v = $('#f-venue').value, g = $('#f-genre').value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const q = qEl ? norm(qEl.value) : '';
    const qFiltered = q ? q.split(' ').filter(w => w && !/^(a|an|the|at|in|on|of|for|to|tonight|today)$/.test(w)) : [];
    const qToks = qFiltered.length ? qFiltered : (q ? q.split(' ').filter(Boolean) : []);
    const genreOk = c => !g || c.genre === g || ((g === 'Classical' || g === 'Orchestral') && (c.genre === 'Classical' || c.genre === 'Orchestral'));
    const qOk = c => !qToks.length || (c._q || (c._q = searchBlob(c)), qToks.every(t => c._q.includes(t)));
    const ok = c => (!v || c.venue === v) && genreOk(c) && Marks.match(cid(c), mine) && (!nw || isNew(c)) && qOk(c);
    const rg = range(), inR = !!rg;
    document.querySelectorAll('section.wk').forEach(x => x.hidden = inR); $('#range-sec').hidden = !inR;
    $('.subtitle').textContent = inR ? `Shows from ${md(rg[0])} to ${md(rg[1])}` : 'Concerts, This Week and Next';
    if (inR) {
      const all = shows.filter(c => c.date <= rg[1] && endOf(c) >= rg[0]), l = all.filter(ok);
      $('#range-h').textContent = `Shows from ${md(rg[0])} to ${md(rg[1])}`;
      $('#range-n').textContent = `${l.length} show${l.length === 1 ? '' : 's'}` + (l.length < all.length ? ` (of ${all.length}, filters on)` : '');
      $('#range-list').innerHTML = l.length ? groupDays(l, c => c.date, concertCard) : (all.length ? '<p class="few">No shows match these filters.</p>' : '<p class="few">Nothing listed in those dates yet; check back, we add shows daily.</p>');
    }
    // week sections are hidden in range view; leave them empty so card ids stay unique (anchors, pick taps, marks)
    const hasFilter = !!(v || g || mine || nw || qToks.length);
    ['this', 'next', 'later'].forEach(w => {
      if (inR) { document.getElementById(w).innerHTML = ''; return; }
      const all = shows.filter(c => c.week === w && endOf(c) >= today), l = all.filter(ok), el = document.getElementById(w);
      el.innerHTML = l.length ? groupDays(l, c => c.date, concertCard) :
        '<p class="few">No shows match these filters.</p>';
      if (all.length < 3 && l.length === all.length && !hasFilter) el.insertAdjacentHTML('beforeend', '<p class="few">Few shows found this week.</p>');
    });
    const laterEl = document.getElementById('later-sec');
    if (laterEl) laterEl.hidden = inR || (!hasFilter && !pinLater);
    newCount(shows.filter(c => ago(c.date) <= 0 && isNew(c)).length, $('#f-new'));
  }
  // Scroll to a card. If it lives in hidden Coming Up, pin that section open and re-render
  // first — render() replaces the card nodes, so the scroll target is looked up again after.
  function openCard(id) {
    if (!id) return;
    const laterEl = document.getElementById('later-sec');
    let el = document.getElementById(id);
    if (el && laterEl && laterEl.contains(el) && laterEl.hidden) {
      pinLater = true;
      render();
      el = document.getElementById(id);
    }
    if (!el) return;
    el.scrollIntoView();
    el.classList.add('flash');
  }
  // ---- date range picker ("Looking for something further out?"): shared code in date-range.js ----
  const DR = DateRange.init({ today, lastDate: shows.map(endOf).sort().pop(), onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  const unpinLater = () => { pinLater = false; };
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', () => { unpinLater(); render(); }));
  if (qEl) qEl.addEventListener('input', () => { unpinLater(); render(); });
  $('#f-clear').addEventListener('click', () => { unpinLater(); $('#f-venue').value = $('#f-genre').value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; if (qEl) qEl.value = ''; render(); });
  $('#newcount') && $('#newcount').addEventListener('click', ev => { if (ev.target.closest('.newtoggle')) { unpinLater(); const cb = $('#f-new'); cb.checked = !cb.checked; render(); } });
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
    '@context': 'https://schema.org', '@type': /^(Theater|Comedy|Musical|Live Show|Family Show)$/.test(c.genre) ? 'Event' : 'MusicEvent', name: c.artist, startDate: GRICS.startISO(c),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: c.venue, address: { '@type': 'PostalAddress', ...((typeof VENUES !== 'undefined' && VENUES[c.venue]) ? { streetAddress: VENUES[c.venue] } : {}), addressLocality: 'Grand Rapids', addressRegion: 'MI', addressCountry: 'US' } },
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
  const just = $('#just');
  if (just) just.addEventListener('click', ev => {
    const a = ev.target.closest('a[href^="#"]'); if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1)); if (!id) return;
    ev.preventDefault();
    openCard(id);
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  });
  window.addEventListener('hashchange', () => { if (location.hash.length > 1) openCard(decodeURIComponent(location.hash.slice(1))); });
  if (location.hash.length > 1) openCard(decodeURIComponent(location.hash.slice(1)));
})();
