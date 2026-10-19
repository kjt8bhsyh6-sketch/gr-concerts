// Page logic: renders shows, NEW badges, Just Announced, filters, favorites, calendar, sharing.
// You normally never need to edit this file — edit concerts.js, seasonal.js or config.js instead.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7, SITE = C.SITE_URL || location.href.split('#')[0];
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
  const ago = d => (Date.parse(today) - Date.parse(d)) / 864e5;
  const isNew = x => x.added && ago(x.added) >= 0 && ago(x.added) < NEW_DAYS;
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const sid = e => 'ev-' + GRICS.slug(e.sort + '-' + e.name);
  const cid = c => 'show-' + GRICS.id(c);
  const sortKey = c => c.date + String(GRICS.to24(c.time)[0]).padStart(2, '0') + String(GRICS.to24(c.time)[1]).padStart(2, '0');
  const shows = CONCERTS.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // ---- favorites ("I'm going"), stored only in this browser ----
  const KEY = 'grc-going';
  let going; try { going = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { going = new Set(); }
  const saveGoing = () => { try { localStorage.setItem(KEY, JSON.stringify([...going])); } catch (e) {} };

  $('#updated').textContent = 'Last updated ' + LAST_UPDATED;

  const BIO = (typeof BIOS !== 'undefined' && BIOS) || {};
  function actions(id, title, cal, link, label, aff, artist) {
    const bio = artist && BIO[artist];
    return `<div class="actions${bio ? ' has-bio' : ''}">
      <a class="b primary" href="${h(link)}" target="_blank" rel="${aff ? 'sponsored noopener' : 'noopener'}">${label}</a>
      ${bio ? `<button type="button" class="b whois" data-id="${id}" aria-haspopup="dialog">Who is this?</button>` : ''}
      <button type="button" class="b going${going.has(id) ? ' on' : ''}" data-id="${id}" aria-pressed="${going.has(id)}">${going.has(id) ? '★ Going' : '☆ I\'m going'}</button>
      <button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>
      ${cal ? `<button type="button" class="b ics" data-id="${id}">+ Calendar</button><a class="b gcal" href="${h(cal)}" target="_blank" rel="noopener">Google</a>` : ''}
    </div>`;
  }
  function concertCard(c) {
    const id = cid(c);
    return `<article class="card${isNew(c) ? ' is-new' : ''}" id="${id}" data-venue="${h(c.venue)}" data-genre="${h(c.genre)}" data-id="${id}">
      <div class="badges"><span class="tag">${h(c.genre)}</span>${isNew(c) ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${h(c.artist)}</h3><p>${h(c.venue)}</p><p>${fmt(c.date)} · ${h(c.time)}</p>
      ${actions(id, c.artist + ' at ' + c.venue + ', ' + fmt(c.date), GRICS.google(c), c.affiliate || c.link, 'Tickets / info', !!c.affiliate, c.artist)}</article>`;
  }
  function seasonalCard(e) {
    const id = sid(e);
    return `<article class="card${isNew(e) ? ' is-new' : ''}" id="${id}" data-id="${id}"><div class="badges"><span class="tag">${h(e.type)}</span>${isNew(e) ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${h(e.name)}</h3><p>${h(e.location)}</p><p>${h(e.when)}</p>
      ${actions(id, e.name, null, e.link, 'Info / tickets')}</article>`;
  }

  // ---- Just Announced: newest additions first (upcoming shows + seasonal) ----
  const recent = [...shows.filter(c => ago(c.date) <= 0).map(c => ({ k: c.added, t: c.artist, s: `${c.venue} · ${fmt(c.date)}`, id: cid(c), n: isNew(c) })),
    ...SEASONAL.map(e => ({ k: e.added, t: e.name, s: e.when, id: sid(e), n: isNew(e) }))]
    .filter(x => x.k).sort((a, b) => b.k.localeCompare(a.k)).slice(0, C.JUST_ANNOUNCED_MAX || 8);
  $('#just').innerHTML = recent.length ? recent.map(x =>
    `<li><a href="#${x.id}">${h(x.t)}</a> <span class="muted">${h(x.s)} · added ${fmt(x.k)}</span>${x.n ? ' <span class="new">NEW</span>' : ''}</li>`).join('')
    : '<li>Nothing new yet.</li>';

  // ---- filters ----
  const uniq = k => [...new Set(shows.map(c => c[k]))].sort();
  const fill = (sel, vals) => sel.insertAdjacentHTML('beforeend', vals.map(v => `<option>${h(v)}</option>`).join(''));
  fill($('#f-venue'), uniq('venue')); fill($('#f-genre'), uniq('genre'));

  function render() {
    const v = $('#f-venue').value, g = $('#f-genre').value, mine = $('#f-mine').checked, nw = $('#f-new').checked;
    const ok = c => (!v || c.venue === v) && (!g || c.genre === g) && (!mine || going.has(cid(c))) && (!nw || isNew(c));
    ['this', 'next', 'later'].forEach(w => {
      const all = shows.filter(c => c.week === w), l = all.filter(ok), el = document.getElementById(w);
      el.innerHTML = l.map(concertCard).join('') ||
        '<p class="few">No shows match these filters.</p>';
      if (all.length < 3 && l.length === all.length) el.insertAdjacentHTML('beforeend', '<p class="few">Few shows found this week.</p>');
    });
    const se = SEASONAL.slice().sort((a, b) => a.sort.localeCompare(b.sort)).filter(e => (!mine || going.has(sid(e))) && (!nw || isNew(e)));
    $('#seasonal').innerHTML = se.map(seasonalCard).join('') || '<p class="few">Nothing matches.</p>';
  }
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  $('#f-clear').addEventListener('click', () => { $('#f-venue').value = $('#f-genre').value = ''; $('#f-mine').checked = $('#f-new').checked = false; render(); });
  render();

  // ---- buttons (event delegation) ----
  const byId = id => shows.find(c => cid(c) === id);
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const id = b.dataset.id;
    if (b.classList.contains('going')) {
      going.has(id) ? going.delete(id) : going.add(id); saveGoing();
      document.querySelectorAll(`button.going[data-id="${id}"]`).forEach(x => { const on = going.has(id); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); x.textContent = on ? '★ Going' : '☆ I\'m going'; });
      if ($('#f-mine').checked) render();
    } else if (b.classList.contains('share')) {
      const url = SITE + '#' + id, title = b.dataset.title;
      if (navigator.share) { try { await navigator.share({ title, text: title + ' — Grand Rapids Concerts', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch (e) { window.prompt('Copy this link:', url); }
    } else if (b.classList.contains('whois')) {
      const c = byId(id); if (c) openBio(c, b);
    } else if (b.classList.contains('ics')) {
      const c = byId(id); if (!c) return;
      const blob = new Blob([GRICS.calendar([c], c.artist)], { type: 'text/calendar' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = GRICS.id(c) + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });

  // ---- "Who is this?" dialog (text from bios.js) ----
  const dlg = document.createElement('div');
  dlg.className = 'bio-overlay'; dlg.hidden = true;
  dlg.innerHTML = `<div class="bio-box" role="dialog" aria-modal="true" aria-labelledby="bio-title" tabindex="-1">
    <button type="button" class="bio-x" aria-label="Close">×</button>
    <h2 id="bio-title"></h2><p id="bio-text"></p><p class="bio-src"></p></div>`;
  document.body.appendChild(dlg);
  let bioOpener = null;
  function openBio(c, opener) {
    const bio = BIO[c.artist]; if (!bio) return;
    dlg.querySelector('#bio-title').textContent = c.artist;
    dlg.querySelector('#bio-text').textContent = bio.text;
    dlg.querySelector('.bio-src').innerHTML = bio.source ? `Source: <a href="${h(bio.source)}" target="_blank" rel="noopener">${h(new URL(bio.source).hostname.replace(/^www\./, ''))}</a>` : '';
    bioOpener = opener; dlg.hidden = false; document.body.classList.add('bio-open');
    dlg.querySelector('.bio-x').focus();
  }
  function closeBio() { if (dlg.hidden) return; dlg.hidden = true; document.body.classList.remove('bio-open'); if (bioOpener) bioOpener.focus(); }
  dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('.bio-x')) { ev.stopPropagation(); closeBio(); } });
  document.addEventListener('keydown', ev => {
    if (dlg.hidden) return;
    if (ev.key === 'Escape') closeBio();
    else if (ev.key === 'Tab') { // keep focus inside the dialog
      const f = [...dlg.querySelectorAll('button, a[href]')], first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });

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
