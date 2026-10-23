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
  const SECTIONS = [['halloween', 'Halloween'], ['thanksgiving', 'Thanksgiving'], ['christmas', 'Christmas & Holiday'], ['other', 'Other Seasonal']];
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
  const grouped = l => SECTIONS.map(([k, label]) => { const x = l.filter(e => e.sec === k); return x.length ? `<h3 class="season-h" id="sec-${k}">${label} <span class="muted">(${x.length})</span></h3>` + x.map(card).join('') : ''; }).join('');
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
  function card(e) {
    const id = sid(e), nw = isNew(e);
    return `<article class="card${nw ? ' is-new' : ''}${Marks.cardClass(id)}" id="${id}" data-id="${id}"><div class="badges"><span class="tag">${h(e.type)}</span>${nw ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${h(e.name)}</h3><p>${h(e.location)}</p><p>${h(e.when)}</p>${nw ? `<p class="added-on">Added ${new Date(e.added + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
      <div class="actions"><a class="b primary" href="${h(e.link)}" target="_blank" rel="${e.c && e.c.affiliate ? 'sponsored noopener' : 'noopener'}">Info / tickets</a>
      ${Marks.buttons(id)}
      <button type="button" class="b share" data-id="${id}" data-title="${h(e.name)}">Share</button>
      <button type="button" class="b ics" data-id="${id}">Apple Cal</button><a class="b gcal" data-id="${id}" href="${h(calLink(e))}" target="_blank" rel="noopener">Google Cal</a>${GRMAP.buttons(e.location)}</div></article>`;
  }
  // an event runs from `sort` to `end` (optional; one-day event if missing)
  const overlaps = (e, f, t) => e.sort <= t && (e.end || e.sort) >= f;
  const DR = DateRange.init({ today, lastDate: list.map(e => e.end || e.sort).sort().pop(), onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  const weekEnd = DR.addD(today, 13 - ((new Date(today + 'T12:00').getDay() + 6) % 7));
  $('#f-type').insertAdjacentHTML('beforeend', [...new Set(list.map(e => e.type))].sort().map(t => `<option>${h(t)}</option>`).join(''));
  function render() {
    const t = $('#f-type').value, mine = $('#f-mine').value, nw = $('#f-new').checked;
    const ok = e => (!t || e.type === t) && Marks.match(sid(e), mine) && (!nw || isNew(e));
    const rg = range(), inR = !!rg;
    $('#seasonal-sec').hidden = inR; $('#range-sec').hidden = !inR;
    $('.subtitle').textContent = inR ? `Events from ${md(rg[0])} to ${md(rg[1])}` : 'Seasonal Events';
    if (inR) {
      const all = list.filter(e => overlaps(e, rg[0], rg[1])), l = all.filter(ok);
      $('#range-h').textContent = `Events from ${md(rg[0])} to ${md(rg[1])}`;
      $('#range-n').textContent = `${l.length} event${l.length === 1 ? '' : 's'}` + (l.length < all.length ? ` (of ${all.length}, filters on)` : '');
      $('#range-list').innerHTML = grouped(l) || (all.length ? '<p class="few">No events match these filters.</p>' : '<p class="few">No seasonal events listed in those dates yet. We add new ones as they\'re announced, so check back soon.</p>');
    }
    // default view: events ongoing or starting this week or next (today through the Sunday that ends next week)
    const all = inR ? [] : list.filter(e => overlaps(e, today, weekEnd)), l = all.filter(ok); // empty while hidden: unique card ids
    if (inR) $('#seasonal').innerHTML = ''; else $('#seasonal').innerHTML = grouped(l) || (all.length ? '<p class="few">Nothing matches.</p>' : '<p class="few">No seasonal events this week or next. Tap 📅 Pick dates to look further out.</p>');
    const n = list.filter(e => isNew(e) && (e.end || e.sort) >= today).length, el = $('#newcount'); el.hidden = !n;
    el.innerHTML = `<span class="new">NEW</span> <strong>${n}</strong> new listing${n === 1 ? '' : 's'} added this week`;
  }
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  $('#f-clear').addEventListener('click', () => { $('#f-type').value = ''; $('#f-mine').value = ''; $('#f-new').checked = false; render(); });
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
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { t.scrollIntoView(); t.classList.add('flash'); } }

  // ---- calendar subscribe links ----
  { const base = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/'), feed = base + 'seasonal.ics', wc = feed.replace(/^https?:/, 'webcal:');
    const w = document.getElementById('sub-webcal'), g = document.getElementById('sub-google'), u = document.getElementById('sub-url');
    if (w) w.href = wc; if (g) g.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(wc); if (u) u.textContent = feed; }
})();
