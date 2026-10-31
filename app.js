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
  Marks.seedDemo(shows.filter(c => c.week === 'this' && endOf(c) >= today).map(cid));

  $('#updated').textContent = 'Last updated ' + LAST_UPDATED;

  const BIO = (typeof BIOS !== 'undefined' && BIOS) || {};
  const WEEKS = GRPane.weeks(today);
  const WEEK_NAME = { this: 'This Week', next: 'Next Week', later: 'Later' };
  function concertRow(c) {
    const end = endOf(c);
    return GRPane.rowHTML(cid(c), GRPane.timeCell(c.date, c.time, end > c.date ? end : ''), `${h(c.artist)}${newBadge(c)}`, `${h(c.venue)} · ${h(c.genre)}`, isNew(c) ? ' is-new' : '');
  }
  function detailHTML(c) {
    if (!c) return '';
    const id = cid(c), end = endOf(c), bio = BIO[c.artist], aff = !!c.affiliate;
    const share = c.artist + ' at ' + c.venue + ', ' + fmt(c.date);
    return `<article class="read-card">
      <h2 class="read-title" id="read-title">${h(c.artist)}${newBadge(c)}</h2>
      <p class="read-when"><time datetime="${h(c.date)}">${h(GRPane.whenLine(c.date, c.time, end > c.date ? end : ''))}</time></p>
      <p class="read-place">${h(c.venue)}</p>
      <div class="read-maps">${GRMAP.buttons(c.venue)}</div>
      <p class="read-tags"><span class="tag read-tag">${h(c.genre)}</span></p>
      ${addedLine(c)}
      ${GRPane.ticketsHTML(c.affiliate || c.link, 'Tickets', aff)}
      ${GRPane.bioHTML(bio ? [{ title: c.artist, text: bio.text, source: bio.source }] : [])}
      <div class="read-actions">${Marks.buttons(id)}<button type="button" class="b share" data-id="${id}" data-title="${h(share)}">Share</button>${GRPane.calHTML(id, GRICS.google(c))}</div>
    </article>`;
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

  let pane, booted = false, lockWeek = false;
  function render() {
    const v = $('#f-venue').value, g = $('#f-genre').value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const q = qEl ? norm(qEl.value) : '';
    const qFiltered = q ? q.split(' ').filter(w => w && !/^(a|an|the|at|in|on|of|for|to|tonight|today)$/.test(w)) : [];
    const qToks = qFiltered.length ? qFiltered : (q ? q.split(' ').filter(Boolean) : []);
    const genreOk = c => !g || c.genre === g || ((g === 'Classical' || g === 'Orchestral') && (c.genre === 'Classical' || c.genre === 'Orchestral'));
    const qOk = c => !qToks.length || (c._q || (c._q = searchBlob(c)), qToks.every(t => c._q.includes(t)));
    const ok = c => (!v || c.venue === v) && genreOk(c) && Marks.match(cid(c), mine) && (!nw || isNew(c)) && qOk(c);
    const rg = range(), inR = !!rg, wk = pane.week();
    const hasFilter = !!(v || g || mine || nw || qToks.length);
    const upcoming = w => shows.filter(c => c.week === w && endOf(c) >= today);
    const counts = { this: upcoming('this').filter(ok).length, next: upcoming('next').filter(ok).length, later: upcoming('later').filter(ok).length };
    const all = inR ? shows.filter(c => c.date <= rg[1] && endOf(c) >= rg[0]) : upcoming(wk);
    const list = all.filter(ok);
    if (!booted) {
      booted = true;
      if (!inR && !location.hash && !list.length) {
        const jump = ['this', 'next', 'later'].find(w => counts[w]);
        if (jump && jump !== wk) { pane.setWeek(jump); render(); return; }
      }
    }
    $('.subtitle').textContent = inR ? `Shows from ${md(rg[0])} to ${md(rg[1])}` : `Concerts, ${WEEK_NAME[wk]}`;
    const note = $('#list-note');
    if (inR) {
      note.hidden = false;
      note.textContent = `${list.length} show${list.length === 1 ? '' : 's'}` + (list.length < all.length ? ` (of ${all.length}, filters on)` : '') + ` from ${md(rg[0])} to ${md(rg[1])}`;
    } else note.hidden = true;
    const windowStart = inR ? rg[0] : WEEKS.ranges[wk][0];
    const empty = all.length ? 'No shows match these filters.' : (inR ? 'Nothing listed in those dates yet; check back, we add shows daily.' : (wk === 'this' ? 'No shows this week.' : wk === 'next' ? 'No shows next week.' : 'Nothing listed later yet.'));
    const agenda = $('#agenda');
    agenda.innerHTML = list.length ? GRPane.groupDays(list, c => GRPane.anchorDate(c.date, endOf(c), windowStart, today), concertRow, today) : `<p class="few">${empty}</p>`;
    if (!inR && wk === 'this' && list.length && list.length === all.length && all.length < 3 && !hasFilter) agenda.insertAdjacentHTML('beforeend', '<p class="few">Few shows found this week.</p>');
    pane.setCounts(counts);
    pane.afterRender(list.map(cid));
    newCount(shows.filter(c => ago(c.date) <= 0 && isNew(c)).length, $('#f-new'));
  }
  // ---- date range picker ("Looking for something further out?"): shared code in date-range.js ----
  const DR = DateRange.init({ today, lastDate: shows.map(endOf).sort().pop(), onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  pane = GRPane.attach({
    weekOf: id => { const c = shows.find(c => cid(c) === id); return c ? c.week : null; },
    inRange: () => !!range(),
    clearRange() { lockWeek = true; $('#r-back').click(); lockWeek = false; },
    render,
    detail: id => detailHTML(shows.find(c => cid(c) === id)),
    emptyDetail: () => `<p class="read-empty">${range() ? 'Nothing in those dates to open.' : 'Nothing to open ' + (WEEK_NAME[pane.week()] || 'here').toLowerCase() + '.'}</p>`,
    listLabel: () => range() ? 'Shows in the selected dates' : WEEK_NAME[pane.week()] + ' shows'
  });
  $('#r-back').addEventListener('click', () => { if (!lockWeek) pane.setWeek('this'); }, true);
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  if (qEl) qEl.addEventListener('input', render);
  $('#f-clear').addEventListener('click', () => { $('#f-venue').value = $('#f-genre').value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; if (qEl) qEl.value = ''; render(); });
  $('#newcount') && $('#newcount').addEventListener('click', ev => { if (ev.target.closest('.newtoggle')) { const cb = $('#f-new'); cb.checked = !cb.checked; render(); } });
  $('#just').addEventListener('click', ev => {
    const a = ev.target.closest('a[href^="#"]'); if (!a) return;
    if (pane.openId(a.getAttribute('href').slice(1), { toTop: true })) ev.preventDefault();
  });
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
    } else if (b.classList.contains('ics')) {
      const c = byId(id); if (!c) return;
      const blob = new Blob([GRICS.calendar([c], c.artist, Marks.state(id))], { type: 'text/calendar' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = GRICS.id(c) + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });

  // Bios render in the reading pane (bios.js). bio-modal.js stays available if a page still opens it.

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
    performer: { '@type': 'PerformingGroup', name: c.artist }, url: c.link,
    ...GRICS.eventLd(c, BIO[c.artist] && BIO[c.artist].text)
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
})();
