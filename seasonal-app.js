// Seasonal page logic (seasonal.html): renders seasonal.js events with NEW badges, a type filter, ★ going / ♥ interested and Share.
// You normally never need to edit this file — edit seasonal.js instead.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7, SITE = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/') + 'seasonal.html';
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // Security: card links must be http(s); anything else (e.g. javascript:) becomes '#'.
  [typeof SEASONAL !== 'undefined' && SEASONAL, typeof CONCERTS !== 'undefined' && CONCERTS].forEach(a => a && a.forEach(x => ['link', 'affiliate'].forEach(k => { if (x[k] && !/^https?:\/\//i.test(String(x[k]))) x[k] = '#'; })));
  const qs = new URLSearchParams(location.search), qt = qs.get('today');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(qt || '') ? qt : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
  const ago = d => (Date.parse(today) - Date.parse(d)) / 864e5;
  const isNew = x => x.added && ago(x.added) >= 0 && ago(x.added) < NEW_DAYS;
  // ---- season sections: automatic from the type tag + title keywords (see EDITING.md) ----
  const KW = {
    halloween: /halloween|\bghosts?\b|haunt|spooky|\bboo\b|\btrick\b|\btreat\b|nightmare|zombie|costume|pumpkin|harryween|scream|creepy|fright|(?!between\b)\w+ween\b/i,
    thanksgiving: /thanksgiving|turkey|harvest/i,
    christmas: /christmas|xmas|holiday|santa|christkindl|\blights\b|tree lighting|enlighten|nutcracker|\bnoel\b|\byule|hanukkah|new year/i };
  // A listing dated in October is Halloween-season if it matches ANY keyword (e.g. "Nightmare Before Christmas", Oct 30-31).
  // Nov-Feb listings check Christmas/Thanksgiving before Halloween (e.g. "The Ghosts of Christmas Eve" in December).
  // Season windows (concerts only must fall inside one; seasonal.js listings fall back to Other Seasonal):
  // Halloween Sep 1-Nov 2, Thanksgiving Nov, Christmas & Holiday Nov 1-Feb 28.
  const WIN = { halloween: d => d.slice(5) >= '09-01' && d.slice(5) <= '11-02', thanksgiving: d => d.slice(5, 7) === '11', christmas: d => d.slice(5) >= '11-01' || d.slice(5) <= '02-29' };
  function season(text, date) {
    const hits = Object.keys(KW).filter(k => KW[k].test(text));
    if (!hits.length) return null;
    if (date.slice(5, 7) === '10') return 'halloween';
    const order = ['christmas', 'thanksgiving', 'halloween'].filter(k => hits.includes(k) && WIN[k](date));
    return order[0] || 'outside';
  }
  const ALL_CONCERTS = typeof CONCERTS !== 'undefined' ? CONCERTS : [];
  const MON = 'JanFebMarAprMayJunJulAugSepOctNovDec'; // endOf: same multi-night logic as app.js (concerts page)
  const endOf = c => { if (/^\d{4}-\d{2}-\d{2}$/.test(c.end || '')) return c.end;
    const m = /\b([A-Z][a-z]{2})\s+(\d{1,2})\s*[–-]\s*(?:([A-Z][a-z]{2})\s+)?(\d{1,2})\)\s*$/.exec(c.artist); if (!m) return c.date;
    const em = MON.indexOf(m[3] || m[1]) / 3 + 1; if (em < 1) return c.date; const y = +c.date.slice(0, 4) + (em < +c.date.slice(5, 7) ? 1 : 0);
    const e = `${y}-${String(em).padStart(2, '0')}-${String(m[4]).padStart(2, '0')}`; return e > c.date ? e : c.date; };
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const sid = e => e.c ? 'show-' + GRICS.id(e.c) : 'ev-' + GRICS.slug(e.sort + '-' + e.name); // concerts keep their Concerts-page id (marks shared, no ev- collision)
  const events = SEASONAL.map(e => { const s = season(e.type + ' ' + e.name, e.sort); return Object.assign({}, e, { sec: s && s !== 'outside' ? s : 'other' }); });
  const concerts = ALL_CONCERTS.map(c => ({ c, sec: season(c.artist, c.date) })).filter(x => x.sec && x.sec !== 'outside' && endOf(x.c) >= today) // past shows hidden, as on the Concerts page
    .map(({ c, sec }) => ({ c, sec, type: 'Concert', name: c.artist, location: c.venue, when: `${fmt(c.date)} · ${c.time}`, sort: c.date, end: endOf(c) > c.date ? endOf(c) : undefined, link: c.affiliate || c.link, added: c.added }));
  const list = events.concat(concerts).sort((a, b) => a.sort.localeCompare(b.sort) || (a.c ? GRICS.startISO(a.c) : '').localeCompare(b.c ? GRICS.startISO(b.c) : ''));
  Marks.seedDemo(list.map(sid)); // going / interested marks: shared code in marks.js
  // ---- per-card calendar (all-day, spans sort..end; DTEND/Google end are exclusive, so the day after `end`) ----
  // seasonal.js has no structured time field, so events are all-day; the "when" text goes in the description.
  const byId = id => list.find(e => sid(e) === id);
  const ymd = s => s.replace(/-/g, '');
  const nextDay = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return t.toISOString().slice(0, 10).replace(/-/g, ''); };
  const PREFIX = { going: '★ Going: ', interested: '♥ Interested: ' };
  const ctitle = (e, mark) => (PREFIX[mark] || '') + e.name;
  const desc = e => `${e.type}. ${e.when}. Info: ${e.link} (confirm details with the organizer)`;
  function gcal(e, mark) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: ctitle(e, mark), dates: `${ymd(e.sort)}/${nextDay(e.end || e.sort)}`,
      ctz: 'America/Detroit', location: e.location + ', Grand Rapids, MI', details: desc(e) });
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  function icsFile(e, mark) {
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const fold = l => { const o = []; while (l.length > 74) { o.push(l.slice(0, 74)); l = ' ' + l.slice(74); } o.push(l); return o.join('\r\n'); };
    const st = mark === 'going' ? ['STATUS:CONFIRMED', 'TRANSP:OPAQUE'] : mark === 'interested' ? ['STATUS:TENTATIVE', 'TRANSP:TRANSPARENT'] : ['TRANSP:TRANSPARENT'];
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GR Concerts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(e.name)}`,
      'BEGIN:VEVENT', `UID:${GRICS.slug(e.sort + '-' + e.name)}@gr-seasonal`, `DTSTAMP:${ymd(e.added || e.sort)}T120000Z`,
      `DTSTART;VALUE=DATE:${ymd(e.sort)}`, `DTEND;VALUE=DATE:${nextDay(e.end || e.sort)}`, `SUMMARY:${esc(ctitle(e, mark))}`, ...st,
      `LOCATION:${esc(e.location + ', Grand Rapids, MI')}`, `DESCRIPTION:${esc(desc(e))}`, ...(e.link ? [`URL:${e.link}`] : []), 'END:VEVENT', 'END:VCALENDAR'];
    return L.map(fold).join('\r\n') + '\r\n';
  }
  // Google link: title reflects the current mark at click time (★ Going / ♥ Interested)
  const calLink = (e, mark) => e.c ? GRICS.google(e.c, mark) : gcal(e, mark);
  const gcalFix = ev => { const a = ev.target.closest('a.gcal'); if (!a || !a.dataset.id) return; const e = byId(a.dataset.id); if (e) a.href = calLink(e, Marks.state(a.dataset.id)); };
  document.addEventListener('click', gcalFix, true); document.addEventListener('auxclick', gcalFix, true); document.addEventListener('contextmenu', gcalFix, true);
  const BIO = (typeof BIOS !== 'undefined' && BIOS) || {};
  const bioKey = e => { const key = (e.c && e.c.artist) || ''; return key && BIO[key] ? key : ''; };
  const WEEKS = GRPane.weeks(today);
  const WEEK_NAME = { this: 'This Week', next: 'Next Week', later: 'Later' };
  const SEASON_LABEL = { halloween: 'Halloween', thanksgiving: 'Thanksgiving', christmas: 'Christmas & Holiday', other: 'Other Seasonal' };
  const alive = e => (e.end || e.sort) >= today;
  const eventWeeks = e => WEEKS.overlaps(e.sort, e.end || e.sort).filter(() => alive(e));
  function eventRow(e) {
    const time = e.c ? e.c.time : '';
    const end = e.end && e.end !== e.sort ? e.end : '';
    return GRPane.rowHTML(sid(e), GRPane.timeCell(e.sort, time, end), `${h(e.name)}${isNew(e) ? '<span class="new">NEW</span>' : ''}`, `${h(e.location)} · ${h(e.type)}`, isNew(e) ? ' is-new' : '');
  }
  function eventDetail(e) {
    if (!e) return '';
    const id = sid(e), end = e.end && e.end !== e.sort ? e.end : '', time = e.c ? e.c.time : '';
    const key = bioKey(e), bio = key && BIO[key], aff = !!(e.c && e.c.affiliate);
    const season = SEASON_LABEL[e.sec] || '';
    return `<article class="read-card">
      <h2 class="read-title" id="read-title">${h(e.name)}${isNew(e) ? '<span class="new">NEW</span>' : ''}</h2>
      <p class="read-when"><time datetime="${h(e.sort)}">${h(GRPane.whenLine(e.sort, time, end))}</time></p>
      ${e.c ? '' : `<p class="read-extra">${h(e.when)}</p>`}
      <p class="read-place">${h(e.location)}</p>
      <div class="read-maps">${GRMAP.buttons(e.location)}</div>
      <p class="read-tags"><span class="tag read-tag">${h(e.type)}</span>${season ? ` <span class="tag read-tag">${h(season)}</span>` : ''}</p>
      ${isNew(e) ? `<p class="added-on">Added ${new Date(e.added + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
      ${GRPane.bioHTML(bio ? [{ title: key, text: bio.text, source: bio.source }] : [])}
      <div class="read-actions">${Marks.buttons(id)}<button type="button" class="b share" data-id="${id}" data-title="${h(e.name)}">Share</button>${GRPane.calHTML(id, calLink(e))}</div>
      ${GRPane.ticketsHTML(e.link, 'Tickets', aff)}
    </article>`;
  }
  // an event runs from `sort` to `end` (optional; one-day event if missing)
  const overlaps = (e, f, t) => e.sort <= t && (e.end || e.sort) >= f;
  const DR = DateRange.init({ today, lastDate: list.map(e => e.end || e.sort).sort().pop(), onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  $('#f-type').insertAdjacentHTML('beforeend', [...new Set(list.map(e => e.type))].sort().map(t => `<option>${h(t)}</option>`).join(''));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const qEl = $('#f-q');
  if (qEl && qs.get('q')) qEl.value = qs.get('q');
  const qOk = e => { const q = qEl ? norm(qEl.value) : ''; if (!q) return true; const blob = norm([e.name, e.location, e.type, e.when].filter(Boolean).join(' ')); return q.split(' ').filter(Boolean).every(tok => blob.includes(tok)); };
  const upd = $('#updated');
  if (upd) { const latest = list.map(e => e.added).filter(Boolean).sort().pop(); if (latest) upd.textContent = 'Last updated ' + new Date(latest + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  let pane, booted = false, lockWeek = false;
  function render() {
    const t = $('#f-type').value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const ok = e => (!t || e.type === t) && Marks.match(sid(e), mine) && (!nw || isNew(e)) && qOk(e);
    const rg = range(), inR = !!rg, wk = pane.week();
    const live = list.filter(alive);
    const counts = {
      this: live.filter(e => eventWeeks(e).includes('this') && ok(e)).length,
      next: live.filter(e => eventWeeks(e).includes('next') && ok(e)).length,
      later: live.filter(e => eventWeeks(e).includes('later') && ok(e)).length
    };
    const all = inR ? live.filter(e => overlaps(e, rg[0], rg[1])) : live.filter(e => eventWeeks(e).includes(wk));
    const shown = all.filter(ok);
    if (!booted) {
      booted = true;
      if (!inR && !location.hash && !shown.length) {
        const jump = ['this', 'next', 'later'].find(w => counts[w]);
        if (jump && jump !== wk) { pane.setWeek(jump); render(); return; }
      }
    }
    $('.subtitle').textContent = inR ? `Events from ${md(rg[0])} to ${md(rg[1])}` : `Seasonal, ${WEEK_NAME[wk]}`;
    const note = $('#list-note');
    if (inR) {
      note.hidden = false;
      note.textContent = `${shown.length} event${shown.length === 1 ? '' : 's'}` + (shown.length < all.length ? ` (of ${all.length}, filters on)` : '') + ` from ${md(rg[0])} to ${md(rg[1])}`;
    } else note.hidden = true;
    const windowStart = inR ? rg[0] : WEEKS.ranges[wk][0];
    const ordered = shown.slice().sort((a, b) => GRPane.anchorDate(a.sort, a.end || a.sort, windowStart, today).localeCompare(GRPane.anchorDate(b.sort, b.end || b.sort, windowStart, today)) || a.sort.localeCompare(b.sort) || a.name.localeCompare(b.name));
    const empty = all.length ? 'No events match these filters.' : (inR ? 'No seasonal events listed in those dates yet. We add new ones as they\'re announced, so check back soon.' : (wk === 'this' ? 'No seasonal events this week.' : wk === 'next' ? 'No seasonal events next week.' : 'Nothing listed later yet.'));
    $('#agenda').innerHTML = ordered.length ? GRPane.groupDays(ordered, e => GRPane.anchorDate(e.sort, e.end || e.sort, windowStart, today), eventRow, today) : `<p class="few">${empty}</p>`;
    pane.setCounts(counts);
    pane.afterRender(ordered.map(sid));
    const n = live.filter(isNew).length, el = $('#newcount'); el.hidden = !n;
    el.innerHTML = `<span class="new">NEW</span> <strong>${n}</strong> new listing${n === 1 ? '' : 's'} added this week`;
  }
  pane = GRPane.attach({
    weekOf: id => { const e = byId(id); const ws = e && eventWeeks(e); return ws && ws[0] || null; },
    inRange: () => !!range(),
    clearRange() { lockWeek = true; $('#r-back').click(); lockWeek = false; },
    render,
    detail: id => eventDetail(byId(id)),
    emptyDetail: () => `<p class="read-empty">${range() ? 'Nothing in those dates to open.' : 'Nothing to open ' + WEEK_NAME[pane.week()].toLowerCase() + '.'}</p>`,
    listLabel: () => range() ? 'Events in the selected dates' : WEEK_NAME[pane.week()] + ' events'
  });
  $('#r-back').addEventListener('click', () => { if (!lockWeek) pane.setWeek('this'); }, true);
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  if (qEl) qEl.addEventListener('input', render);
  $('#f-clear').addEventListener('click', () => { $('#f-type').value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; if (qEl) qEl.value = ''; render(); });
  render();
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return; const id = b.dataset.id;
    if (Marks.handle(b)) {
      if ($('#f-mine').value) render();
    } else if (b.classList.contains('share')) {
      const url = SITE + '#' + id, title = b.dataset.title;
      if (navigator.share) { try { await navigator.share({ title, text: title + ' — Grand Rapids Happenings', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch (e) { window.prompt('Copy this link:', url); }
    } else if (b.classList.contains('ics')) {
      const e = byId(id); if (!e) return;
      const blob = new Blob([e.c ? GRICS.calendar([e.c], e.c.artist, Marks.state(id)) : icsFile(e, Marks.state(id))], { type: 'text/calendar' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = id + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
  // ---- calendar subscribe links ----
  { const base = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/'), feed = base + 'seasonal.ics', wc = feed.replace(/^https?:/, 'webcal:');
    const w = document.getElementById('sub-webcal'), g = document.getElementById('sub-google'), u = document.getElementById('sub-url');
    if (w) w.href = wc; if (g) g.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(wc); if (u) u.textContent = feed; }
})();
