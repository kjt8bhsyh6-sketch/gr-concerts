// Page logic for sports.html. Edit sports.js (not this file) to change games.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7;
  const SITE = (C.SITE_URL || location.href.replace(/[^/]*$/, '')).replace(/\/?$/, '/') + 'sports.html';
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // Security: card links must be http(s); anything else (e.g. javascript:) becomes '#'.
  [GAMES, SEASON_NOTES].forEach(a => a && a.forEach(x => ['link', 'affiliate'].forEach(k => { if (x[k] && !/^https?:\/\//i.test(String(x[k]))) x[k] = '#'; })));
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
  const hasVs = s => /^(vs\.|semifinal|championship|third-place|consolation)/i.test(s) || /\bvs\.\s/i.test(s);
  const oppLine = g => hasVs(g.opponent) ? g.opponent : 'vs. ' + g.opponent;
  const gameTitle = g => hasVs(g.opponent) ? `${g.team} — ${g.opponent}` : `${g.team} vs. ${g.opponent}`;
  // shape each game like a concert so the shared calendar helpers (ics.js) work
  const asEvent = g => ({ artist: gameTitle(g), venue: g.venue, date: g.date, time: g.time, genre: sport(g.team), link: g.link, added: g.added });
  const key = g => g.date + String(GRICS.to24(g.time)[0]).padStart(2, '0');
  const games = GAMES.filter(g => ago(g.date) <= 0).sort((a, b) => key(a).localeCompare(key(b))).map(g => Object.assign({}, g, { ev: asEvent(g) }));
  const gid = g => 'game-' + GRICS.id(g.ev);
  Marks.seedDemo(games.map(gid)); // going / interested marks: shared code in marks.js
  $('#updated').textContent = 'Home games around Grand Rapids · Last updated ' + SPORTS_UPDATED;

  const BIO = (typeof SPORTS_BIOS !== 'undefined' && SPORTS_BIOS) || {};
  const bioSec = t => BIO[t] && { title: t, text: BIO[t].text, source: BIO[t].source };
  const WEEKS = GRPane.weeks(today);
  const WEEK_NAME = { this: 'This Week', next: 'Next Week', later: 'Later' };
  const noteId = n => 'note-' + GRICS.slug(n.team);
  function gameRow(g) {
    return GRPane.rowHTML(gid(g), GRPane.timeCell(g.date, g.time), `${h(gameTitle(g))}${newBadge(g)}`, `${h(g.venue)} · ${h(sport(g.team))}`, isNew(g) ? ' is-new' : '');
  }
  function noteRow(n) {
    return GRPane.rowHTML(noteId(n), '<span class="row-time is-long"><span>Off season</span></span>', `${h(n.team)}${newBadge(n)}`, `${h(sport(n.team))} · Off-season`, isNew(n) ? ' is-new' : '');
  }
  function gameDetail(g) {
    const id = gid(g), title = `${gameTitle(g)}, ${fmt(g.date)}`;
    const bios = [bioSec(g.team), bioSec(g.opponent)].filter(Boolean);
    return `<article class="read-card">
      <h2 class="read-title" id="read-title">${h(gameTitle(g))}${newBadge(g)}</h2>
      <p class="read-when"><time datetime="${h(g.date)}">${h(GRPane.whenLine(g.date, g.time))}</time></p>
      <p class="read-place">${h(g.venue)}</p>
      <div class="read-maps">${GRMAP.buttons(g.venue)}</div>
      <p class="read-tags"><span class="tag read-tag">${h(sport(g.team))}</span></p>
      ${addedLine(g)}
      ${GRPane.bioHTML(bios)}
      <div class="read-actions">${Marks.buttons(id)}<button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>${GRPane.calHTML(id, GRICS.google(g.ev))}</div>
      ${GRPane.ticketsHTML(g.link, 'Tickets', false)}
    </article>`;
  }
  function noteDetail(n) {
    const bio = bioSec(n.team);
    return `<article class="read-card">
      <h2 class="read-title" id="read-title">${h(n.team)}${newBadge(n)}</h2>
      <p class="read-when">Off-season</p>
      ${n.venue ? `<p class="read-place">${h(n.venue)}</p><div class="read-maps">${GRMAP.buttons(n.venue)}</div>` : ''}
      <p class="read-tags"><span class="tag read-tag">${h(sport(n.team))}</span> <span class="tag read-tag off">Off-season</span></p>
      <p class="read-extra">${h(n.text)}</p>
      ${addedLine(n)}
      ${GRPane.bioHTML(bio ? [bio] : [])}
      ${GRPane.ticketsHTML(n.link, 'Season info', false)}
    </article>`;
  }
  const DR = DateRange.init({ today, lastDate: games.length ? games[games.length - 1].date : '', onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  const sel = $('#f-team');
  sel.insertAdjacentHTML('beforeend', TEAMS.map(t => `<option>${h(t.name)}</option>`).join(''));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const qEl = $('#f-q');
  if (qEl && qs.get('q')) qEl.value = qs.get('q');
  const qOk = (...parts) => { const q = qEl ? norm(qEl.value) : ''; if (!q) return true; const blob = norm(parts.filter(Boolean).join(' ')); return q.split(' ').filter(Boolean).every(tok => blob.includes(tok)); };
  const teamNotes = () => SEASON_NOTES.filter(n => (!sel.value || n.team === sel.value) && qOk(n.team, n.venue, n.text, sport(n.team)));
  let pane, booted = false, lockWeek = false;
  function render() {
    const t = sel.value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const ok = g => (!t || g.team === t) && Marks.match(gid(g), mine) && (!nw || isNew(g)) && qOk(g.team, g.opponent, g.venue, sport(g.team));
    const rg = range(), inR = !!rg, wk = pane.week();
    const notes = teamNotes();
    const counts = {
      this: games.filter(g => WEEKS.ofDate(g.date) === 'this' && ok(g)).length,
      next: games.filter(g => WEEKS.ofDate(g.date) === 'next' && ok(g)).length,
      later: games.filter(g => WEEKS.ofDate(g.date) === 'later' && ok(g)).length + notes.length
    };
    const all = inR ? games.filter(g => g.date >= rg[0] && g.date <= rg[1]) : games.filter(g => WEEKS.ofDate(g.date) === wk);
    const list = all.filter(ok);
    const showNotes = !inR && wk === 'later' ? notes : [];
    if (!booted) {
      booted = true;
      if (!inR && !location.hash && !list.length && !showNotes.length) {
        const jump = ['this', 'next', 'later'].find(w => counts[w]);
        if (jump && jump !== wk) { pane.setWeek(jump); render(); return; }
      }
    }
    $('.subtitle').textContent = inR ? `Games from ${md(rg[0])} to ${md(rg[1])}` : `Sports, ${WEEK_NAME[wk]}`;
    const note = $('#list-note');
    if (inR) {
      note.hidden = false;
      note.textContent = `${list.length} game${list.length === 1 ? '' : 's'}` + (list.length < all.length ? ` (of ${all.length}, filters on)` : '') + ` from ${md(rg[0])} to ${md(rg[1])}`;
    } else note.hidden = true;
    const windowStart = inR ? rg[0] : WEEKS.ranges[wk][0];
    const empty = all.length ? 'No games match these filters.' : (inR ? 'No home games listed in those dates yet. Schedules get added as teams release them, so check back soon.' : (wk === 'this' ? 'No home games this week.' : wk === 'next' ? 'No home games next week.' : 'No home games later yet.'));
    let html = list.length ? GRPane.groupDays(list, g => GRPane.anchorDate(g.date, g.date, windowStart, today), gameRow, today) : '';
    if (showNotes.length) html += `<section class="day" role="group" aria-labelledby="day-off"><h3 class="day-h" id="day-off">Off-season</h3>${showNotes.map(noteRow).join('')}</section>`;
    $('#agenda').innerHTML = html || `<p class="few">${empty}</p>`;
    pane.setCounts(counts);
    pane.afterRender(list.map(gid).concat(showNotes.map(noteId)));
    newCount(games.filter(isNew).length + SEASON_NOTES.filter(isNew).length, $('#f-new'));
  }
  pane = GRPane.attach({
    weekOf: id => id.indexOf('note-') === 0 ? 'later' : ((games.find(g => gid(g) === id) || {}).date ? WEEKS.ofDate(games.find(g => gid(g) === id).date) : null),
    inRange: () => !!range(),
    clearRange() { lockWeek = true; $('#r-back').click(); lockWeek = false; },
    render,
    detail: id => {
      const g = games.find(x => gid(x) === id);
      if (g) return gameDetail(g);
      const n = SEASON_NOTES.find(x => noteId(x) === id);
      return n ? noteDetail(n) : '';
    },
    emptyDetail: () => `<p class="read-empty">${range() ? 'Nothing in those dates to open.' : 'Nothing to open ' + WEEK_NAME[pane.week()].toLowerCase() + '.'}</p>`,
    listLabel: () => range() ? 'Games in the selected dates' : WEEK_NAME[pane.week()] + ' games'
  });
  $('#r-back').addEventListener('click', () => { if (!lockWeek) pane.setWeek('this'); }, true);
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  if (qEl) qEl.addEventListener('input', render);
  $('#f-clear').addEventListener('click', () => { sel.value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; if (qEl) qEl.value = ''; render(); });
  $('#newcount') && $('#newcount').addEventListener('click', ev => { if (ev.target.closest('.newtoggle')) { const cb = $('#f-new'); cb.checked = !cb.checked; render(); } });
  render();

  function toast(m) { const e = $('#toast'); e.textContent = m; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2500); }
  // Google link: title reflects the current mark at click time (★ Going / ♥ Interested)
  const gcalFix = ev => { const a = ev.target.closest('a.gcal'); if (!a || !a.dataset.id) return; const g = games.find(x => gid(x) === a.dataset.id); if (g) a.href = GRICS.google(g.ev, Marks.state(a.dataset.id)); };
  document.addEventListener('click', gcalFix, true); document.addEventListener('auxclick', gcalFix, true); document.addEventListener('contextmenu', gcalFix, true);
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b || !b.dataset.id) return;
    const id = b.dataset.id, g = games.find(x => gid(x) === id);
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
  // ---- calendar subscribe links ----
  { const base = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/'), feed = base + 'sports.ics', wc = feed.replace(/^https?:/, 'webcal:');
    const w = document.getElementById('sub-webcal'), g = document.getElementById('sub-google'), u = document.getElementById('sub-url');
    if (w) w.href = wc; if (g) g.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(wc); if (u) u.textContent = feed; }
})();
