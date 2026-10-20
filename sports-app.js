// Page logic for sports.html. Edit sports.js (not this file) to change games.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7;
  const SITE = (C.SITE_URL || location.href.replace(/[^/]*$/, '')).replace(/\/?$/, '/') + 'sports.html';
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // Testing only: ?today=YYYY-MM-DD pretends it's that day; ?demo=mix also back-dates 2 of every 3 items by 30 days (in this browser only) so NEW and older cards can be compared.
  const qs = new URLSearchParams(location.search), qt = qs.get('today');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(qt || '') ? qt : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
  if (qs.get('demo') === 'mix') [GAMES, SEASON_NOTES].forEach(a => a.forEach((x, i) => { if (i % 3 && x.added) x.added = new Date(Date.parse(x.added) - 30 * 864e5).toISOString().slice(0, 10); }));
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
  const sport = t => (TEAMS.find(x => x.name === t) || {}).sport || 'Sports';
  // shape each game like a concert so the shared calendar helpers (ics.js) work
  const asEvent = g => ({ artist: `${g.team} vs. ${g.opponent}`, venue: g.venue, date: g.date, time: g.time, genre: sport(g.team), link: g.link, added: g.added });
  const key = g => g.date + String(GRICS.to24(g.time)[0]).padStart(2, '0');
  const games = GAMES.filter(g => ago(g.date) <= 0).sort((a, b) => key(a).localeCompare(key(b))).map(g => Object.assign({}, g, { ev: asEvent(g) }));
  const gid = g => 'game-' + GRICS.id(g.ev);
  Marks.seedDemo(games.map(gid)); // going / interested marks: shared code in marks.js
  $('#updated').textContent = 'Home games around Grand Rapids · Last updated ' + SPORTS_UPDATED;

  const BIO = (typeof SPORTS_BIOS !== 'undefined' && SPORTS_BIOS) || {};
  const whoBtn = (id, team) => BIO[team] ? `<button type="button" class="b whois" data-id="${id}" aria-haspopup="dialog">Who is this?</button>` : '';
  const bioSec = t => BIO[t] && { title: t, text: BIO[t].text, source: BIO[t].source };
  const goBtn = id => Marks.buttons(id);
  function card(g) {
    const id = gid(g), title = `${g.team} vs. ${g.opponent}, ${fmt(g.date)}`;
    return `<article class="card${isNew(g) ? ' is-new' : ''}${Marks.cardClass(id)}" id="${id}">
      <div class="badges"><span class="tag">${h(sport(g.team))}</span>${newBadge(g)}</div>
      <h3>${h(g.team)}</h3><p><strong>vs. ${h(g.opponent)}</strong></p><p>${h(g.venue)}</p><p>${fmt(g.date)} · ${h(g.time)}</p>${addedLine(g)}
      <div class="actions${BIO[g.team] ? ' has-bio' : ''}"><a class="b primary" href="${h(g.link)}" target="_blank" rel="noopener">Tickets</a>
      ${whoBtn(id, g.team)}${goBtn(id)}<button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>
      <button type="button" class="b ics" data-id="${id}">Apple</button><a class="b gcal" data-id="${id}" href="${h(GRICS.google(g.ev))}" target="_blank" rel="noopener">Google</a></div></article>`;
  }
  function note(n) {
    return `<article class="card note-card${isNew(n) ? ' is-new' : ''}"><div class="badges"><span class="tag">${h(sport(n.team))}</span><span class="tag off">Off-season</span>${newBadge(n)}</div>
      <h3>${h(n.team)}</h3><p>${h(n.text)}</p>${addedLine(n)}<div class="actions${BIO[n.team] ? ' has-bio' : ''}"><a class="b primary" href="${h(n.link)}" target="_blank" rel="noopener">Season info</a>${whoBtn('note-' + GRICS.slug(n.team), n.team)}</div></article>`;
  }
  const DR = DateRange.init({ today, onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  const weekEnd = DR.addD(today, 13 - ((new Date(today + 'T12:00').getDay() + 6) % 7));
  const sel = $('#f-team');
  sel.insertAdjacentHTML('beforeend', TEAMS.map(t => `<option>${h(t.name)}</option>`).join(''));
  function render() {
    const t = sel.value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const ok = g => (!t || g.team === t) && Marks.match(gid(g), mine) && (!nw || isNew(g));
    const rg = range(), inR = !!rg;
    $('#games-sec').hidden = inR; $('#range-sec').hidden = !inR;
    $('.subtitle').textContent = inR ? `Games from ${md(rg[0])} to ${md(rg[1])}` : 'Sports';
    if (inR) {
      const all = games.filter(g => g.date >= rg[0] && g.date <= rg[1]), l = all.filter(ok);
      $('#range-h').textContent = `Games from ${md(rg[0])} to ${md(rg[1])}`;
      $('#range-n').textContent = `${l.length} game${l.length === 1 ? '' : 's'}` + (l.length < all.length ? ` (of ${all.length}, filters on)` : '');
      $('#range-list').innerHTML = l.map(card).join('') || (all.length ? '<p class="few">No games match these filters.</p>' : '<p class="few">No home games listed in those dates yet. Schedules get added as teams release them, so check back soon.</p>');
    }
    // default view: this week and next week (today through the Sunday that ends next week)
    const all = games.filter(g => g.date <= weekEnd), l = all.filter(ok);
    $('#games').innerHTML = l.map(card).join('') || (all.length ? '<p class="few">No games match these filters.</p>' : '<p class="few">No home games this week or next. Tap 📅 Pick dates to look further out.</p>');
    const ns = SEASON_NOTES.filter(n => !t || n.team === t);
    $('#notes-wrap').hidden = !ns.length; $('#notes').innerHTML = ns.map(note).join('');
    newCount(games.filter(isNew).length + SEASON_NOTES.filter(isNew).length, $('#f-new'));
  }
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  $('#f-clear').addEventListener('click', () => { sel.value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; render(); });
  $('#newcount') && $('#newcount').addEventListener('click', ev => { if (ev.target.closest('.newtoggle')) { const cb = $('#f-new'); cb.checked = !cb.checked; render(); } });
  render();

  function toast(m) { const e = $('#toast'); e.textContent = m; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2500); }
  // Google link: title reflects the current mark at click time (★ Going / ♥ Interested)
  const gcalFix = ev => { const a = ev.target.closest('a.gcal'); if (!a || !a.dataset.id) return; const g = games.find(x => gid(x) === a.dataset.id); if (g) a.href = GRICS.google(g.ev, Marks.state(a.dataset.id)); };
  document.addEventListener('click', gcalFix, true); document.addEventListener('auxclick', gcalFix, true); document.addEventListener('contextmenu', gcalFix, true);
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b || !b.dataset.id) return;
    const id = b.dataset.id, g = games.find(x => gid(x) === id);
    if (b.classList.contains('whois')) {
      const team = g ? g.team : (SEASON_NOTES.find(n => 'note-' + GRICS.slug(n.team) === id) || {}).team;
      BioModal.open([bioSec(team), g && bioSec(g.opponent)], b); return;
    }
    if (Marks.handle(b)) {
      if ($('#f-mine').value) render();
    } else if (b.classList.contains('share')) {
      const url = SITE + '#' + id, title = b.dataset.title;
      if (navigator.share) { try { await navigator.share({ title, text: title + ' — GR Sports', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch (e) { window.prompt('Copy this link:', url); }
    } else if (b.classList.contains('ics') && g) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([GRICS.calendar([g.ev], g.ev.artist, Marks.state(id))], { type: 'text/calendar' }));
      a.download = GRICS.id(g.ev) + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    }
  });
  const ld = games.map(g => ({ '@context': 'https://schema.org', '@type': 'SportsEvent', name: g.ev.artist, startDate: GRICS.startISO(g.ev),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    homeTeam: { '@type': 'SportsTeam', name: g.team }, awayTeam: { '@type': 'SportsTeam', name: g.opponent },
    location: { '@type': 'Place', name: g.venue, address: { '@type': 'PostalAddress', addressLocality: 'Grand Rapids', addressRegion: 'MI', addressCountry: 'US' } },
    url: g.link, offers: { '@type': 'Offer', url: g.link } }));
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
  if (location.hash) { const e = document.getElementById(location.hash.slice(1)); if (e) { e.scrollIntoView(); e.classList.add('flash'); } }

  // ---- calendar subscribe links ----
  { const base = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/'), feed = base + 'sports.ics', wc = feed.replace(/^https?:/, 'webcal:');
    const w = document.getElementById('sub-webcal'), g = document.getElementById('sub-google'), u = document.getElementById('sub-url');
    if (w) w.href = wc; if (g) g.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(wc); if (u) u.textContent = feed; }
})();
