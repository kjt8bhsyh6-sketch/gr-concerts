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
  const whoBtn = (id, team) => BIO[team] ? `<button type="button" class="b whois" data-id="${id}" aria-haspopup="dialog">Who is this?</button>` : '';
  const bioSec = t => BIO[t] && { title: t, text: BIO[t].text, source: BIO[t].source };
  const goBtn = id => Marks.buttons(id);
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
  function card(g) {
    const id = gid(g), title = `${gameTitle(g)}, ${fmt(g.date)}`;
    return `<article class="card agenda-row${isNew(g) ? ' is-new' : ''}${Marks.cardClass(id)}" id="${id}">
      ${timeCell(g.date, g.time)}
      <div class="row-body"><h4 class="row-title">${h(g.team)}${newBadge(g)}</h4><p class="card-opp"><strong>${h(oppLine(g))}</strong></p><p class="card-venue">${h(g.venue)}</p><p class="card-tags"><span class="tag">${h(sport(g.team))}</span></p>${addedLine(g)}</div>
      <div class="row-maps">${GRMAP.buttons(g.venue)}</div>
      <a class="b primary row-tickets" href="${h(g.link)}" target="_blank" rel="noopener" aria-label="Tickets"><span class="tk-full">Tickets</span><span class="tk-short">Tickets</span></a>
      <div class="actions row-actions${BIO[g.team] ? ' has-bio' : ''}">${whoBtn(id, g.team)}${goBtn(id)}<button type="button" class="b share" data-id="${id}" data-title="${h(title)}">Share</button>
      <button type="button" class="b ics" data-id="${id}" aria-label="Add to Apple Calendar" title="Add to Apple Calendar"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.4 6.6c-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.3 1.1-3 0 0 .1 0 .1-.1.8-.7 2.1-1.2 3.2-1.2.1 1.2-.3 2.3-1.5 3zm.6 1.6c-1.8-.1-3.3 1-4.1 1-.9 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.6 2.8-2 3.4-.5 8.4 1.4 11.2.9 1.4 2 2.9 3.4 2.8 1.4 0 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.7 1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-2.9-4.4 0-2.7 2.2-4 2.3-4.1-1.3-1.8-3.2-2.1-3.7-2.4z"/></svg></button><a class="b gcal" data-id="${id}" href="${h(GRICS.google(g.ev))}" target="_blank" rel="noopener" aria-label="Add to Google Calendar" title="Add to Google Calendar"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.3c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.6z"/><path fill="#EA4335" d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.8 14.7 2 12 2a10 10 0 0 0-8.9 5.7l3.3 2.6c.8-2.4 3-4.5 5.6-4.5z"/></svg></a></div></article>`;
  }
  function note(n) {
    const id = 'note-' + GRICS.slug(n.team);
    const who = whoBtn(id, n.team);
    const maps = n.venue ? `<div class="row-maps">${GRMAP.buttons(n.venue)}</div>` : '';
    return `<article class="card note-card agenda-row${isNew(n) ? ' is-new' : ''}">
      <div class="row-time"><span class="row-clock">Off season</span></div>
      <div class="row-body"><h3 class="row-title">${h(n.team)}${newBadge(n)}</h3><p class="card-tags"><span class="tag">${h(sport(n.team))}</span><span class="tag off">Off-season</span></p><p>${h(n.text)}</p>${addedLine(n)}</div>
      ${maps}
      <a class="b primary row-tickets" href="${h(n.link)}" target="_blank" rel="noopener" aria-label="Season info"><span class="tk-full">Season info</span><span class="tk-short">Info</span></a>
      ${who ? `<div class="actions row-actions has-bio">${who}</div>` : ''}</article>`;
  }
  const DR = DateRange.init({ today, lastDate: games.length ? games[games.length - 1].date : '', onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
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
      $('#range-list').innerHTML = l.length ? groupDays(l, g => g.date, card) : (all.length ? '<p class="few">No games match these filters.</p>' : '<p class="few">No home games listed in those dates yet. Schedules get added as teams release them, so check back soon.</p>');
    }
    // default view: this week and next week (today through the Sunday that ends next week)
    const all = inR ? [] : games.filter(g => g.date <= weekEnd), l = all.filter(ok); // empty while hidden: unique card ids
    if (inR) $('#games').innerHTML = ''; else $('#games').innerHTML = l.length ? groupDays(l, g => g.date, card) : (all.length ? '<p class="few">No games match these filters.</p>' : '<p class="few">No home games this week or next. Tap 📅 Pick dates to look further out.</p>');
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
