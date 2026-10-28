// Shared Outlook-style list + reading pane for concerts, sports, and seasonal.
// The list is only time, title, and a one-line preview. Tickets, maps, bios, and calendars live in the reading pane.
(function () {
  const mq = window.matchMedia('(min-width: 900px)');
  const desktop = () => mq.matches;
  const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const addD = (d, n) => { const t = new Date(d + 'T12:00'); t.setDate(t.getDate() + n); return t.toLocaleDateString('en-CA'); };
  function weeks(today) {
    const dow = (new Date(today + 'T12:00').getDay() + 6) % 7; // Monday = 0
    const thisMon = addD(today, -dow), nextMon = addD(thisMon, 7), laterMon = addD(thisMon, 14);
    const ranges = { this: [thisMon, addD(nextMon, -1)], next: [nextMon, addD(laterMon, -1)], later: [laterMon, '9999-12-31'] };
    const ofDate = date => date < nextMon ? 'this' : date < laterMon ? 'next' : 'later';
    const overlaps = (start, end) => { end = end || start; return ['this', 'next', 'later'].filter(w => start <= ranges[w][1] && end >= ranges[w][0]); };
    return { ranges, ofDate, overlaps, addD };
  }
  // First day to print in the visible window. An event already underway lands under Today.
  function anchorDate(start, end, windowStart, today) {
    let from = start < windowStart ? windowStart : start;
    if (today >= windowStart && from <= today && (end || start) >= today) return today;
    return from;
  }
  function dayLabel(d, today) {
    if (d === today) return 'Today';
    const dt = new Date(d + 'T12:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function groupDays(items, dateOf, renderItem, today) {
    let html = '', last = '', buf = '', label = '', n = 0;
    const flush = () => {
      if (!buf) return;
      const id = 'daylab-' + (++n);
      html += `<section class="day" role="group" aria-labelledby="${id}"><h3 class="day-h" id="${id}">${escape(label)}</h3>${buf}</section>`;
    };
    items.forEach(item => {
      const d = dateOf(item);
      if (d !== last) { flush(); buf = ''; last = d; label = dayLabel(d, today); }
      buf += renderItem(item);
    });
    flush();
    return html;
  }
  const clock = t => /^(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(t || '');
  function timeCell(date, time, end) {
    const span = end && end > date;
    const shortMD = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!time) {
      const label = span ? 'Multi-day' : 'All day';
      return `<span class="row-time"><time datetime="${escape(date)}">${escape(label)}</time></span>`;
    }
    const m = clock(time);
    let dt = date;
    if (m && time.length <= 8) { let hh = +m[1] % 12; if (/p/i.test(m[3])) hh += 12; dt = date + 'T' + String(hh).padStart(2, '0') + ':' + m[2]; }
    const thru = span ? `<span class="row-thru">– ${escape(shortMD(end))}</span>` : '';
    const tz = m ? '<span class="row-tz">ET</span>' : '';
    return `<span class="row-time${time.length > 8 ? ' is-long' : ''}"><time datetime="${escape(dt)}">${escape(time)}</time>${tz}${thru}</span>`;
  }
  function whenLine(date, time, end) {
    const long = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    let s = long(date);
    if (end && end > date) s += ' – ' + long(end);
    if (time) s += ' · ' + time + (clock(time) ? ' ET' : '');
    return s;
  }
  function rowHTML(id, timeHTML, titleHTML, previewHTML, extra) {
    const mark = (window.Marks && Marks.cardClass(id)) || '';
    return `<button type="button" class="agenda-row${extra || ''}${mark}" id="${escape(id)}" role="option" aria-selected="false" tabindex="-1">${timeHTML}<span class="row-body"><span class="row-title">${titleHTML}</span><span class="row-preview">${previewHTML}</span></span></button>`;
  }
  function srcLine(u) {
    if (!u || !/^https?:\/\//i.test(String(u))) return '';
    let host = u;
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    return `<p class="bio-src">Source: <a href="${escape(u)}" target="_blank" rel="noopener">${escape(host)}</a></p>`;
  }
  function bioHTML(sections) {
    const list = (sections || []).filter(s => s && s.text);
    if (!list.length) return '';
    return `<section class="read-bio">${list.map(s => `<h3>${escape(s.title || 'About')}</h3><p>${escape(s.text)}</p>${srcLine(s.source)}`).join('')}</section>`;
  }
  const APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.4 6.6c-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.3 1.1-3 0 0 .1 0 .1-.1.8-.7 2.1-1.2 3.2-1.2.1 1.2-.3 2.3-1.5 3zm.6 1.6c-1.8-.1-3.3 1-4.1 1-.9 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.6 2.8-2 3.4-.5 8.4 1.4 11.2.9 1.4 2 2.9 3.4 2.8 1.4 0 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.7 1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-2.9-4.4 0-2.7 2.2-4 2.3-4.1-1.3-1.8-3.2-2.1-3.7-2.4z"/></svg>';
  const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.3c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.6z"/><path fill="#EA4335" d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.8 14.7 2 12 2a10 10 0 0 0-8.9 5.7l3.3 2.6c.8-2.4 3-4.5 5.6-4.5z"/></svg>';
  function calHTML(id, href) {
    return `<div class="read-cals"><button type="button" class="b ics" data-id="${escape(id)}" aria-label="Add to Apple Calendar" title="Add to Apple Calendar">${APPLE}<span>Apple</span></button><a class="b gcal" data-id="${escape(id)}" href="${escape(href || '#')}" target="_blank" rel="noopener" aria-label="Add to Google Calendar" title="Add to Google Calendar">${GOOGLE}<span>Google</span></a></div>`;
  }
  function ticketsHTML(href, label, affiliate) {
    const rel = affiliate ? 'sponsored noopener' : 'noopener';
    const note = affiliate ? '<p class="read-ftc">Affiliate link. We may earn a small commission at no extra cost to you. <a href="about.html#disclosure">Learn more</a>.</p>' : '';
    return `<p class="read-cta"><a class="b primary read-tickets" href="${escape(href)}" target="_blank" rel="${rel}">${escape(label || 'Tickets')}</a></p>${note}`;
  }
  function scrollRowInto(row) {
    const pane = row.closest('.listpane');
    if (!pane || pane.scrollHeight <= pane.clientHeight + 4) {
      row.scrollIntoView({ block: 'nearest' });
      return;
    }
    const pr = pane.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (rr.top < pr.top) pane.scrollTop -= pr.top - rr.top;
    else if (rr.bottom > pr.bottom) pane.scrollTop += rr.bottom - pr.bottom;
  }
  function attach(opts) {
    const workspace = document.getElementById('workspace');
    const agenda = document.getElementById('agenda');
    const read = document.getElementById('read-body');
    const back = document.getElementById('read-back');
    const rail = document.querySelector('.rail');
    let week = 'this', selected = '', detailOpen = false;
    const flashed = new Set();
    const hashNow = () => location.hash.replace(/^#/, '');
    const opening = hashNow();
    if (opening && opts.weekOf && opts.weekOf(opening)) {
      week = opts.weekOf(opening);
      selected = opening;
      detailOpen = true;
    }
    function paintRail() {
      const inR = !!(opts.inRange && opts.inRange());
      rail.querySelectorAll('.rail-btn').forEach(b => {
        b.setAttribute('aria-pressed', !inR && b.dataset.week === week ? 'true' : 'false');
      });
    }
    function showDetail() {
      const reading = !desktop() && detailOpen && !!selected;
      document.body.classList.toggle('is-reading', reading);
    }
    function markRows() {
      agenda.querySelectorAll('.agenda-row').forEach(r => {
        const on = r.id === selected;
        r.setAttribute('aria-selected', on ? 'true' : 'false');
        r.tabIndex = on ? 0 : -1;
      });
    }
    function writeDetail() {
      const html = selected && opts.detail ? opts.detail(selected) : '';
      read.innerHTML = html || (opts.emptyDetail ? opts.emptyDetail() : '<p class="read-empty">Select a listing.</p>');
    }
    function setHash(id) {
      const next = id ? '#' + id : '';
      if (location.hash === next) return;
      history.replaceState(null, '', location.pathname + location.search + next);
    }
    function select(id, o) {
      o = o || {};
      selected = id || '';
      if (o.open === true) detailOpen = true;
      if (o.open === false) detailOpen = false;
      markRows();
      writeDetail();
      showDetail();
      if (o.hash) setHash(selected);
      const row = selected && document.getElementById(selected);
      if (o.scroll && row) scrollRowInto(row);
      if (o.focus === 'row' && row) row.focus({ preventScroll: true });
      if (o.focus === 'back' && !desktop() && back) back.focus();
    }
    function openId(id) {
      if (!id || !opts.weekOf || !opts.weekOf(id)) return false;
      if (!document.getElementById(id)) {
        const inR = !!(opts.inRange && opts.inRange());
        week = opts.weekOf(id);
        selected = id;
        detailOpen = true;
        if (inR && opts.clearRange) opts.clearRange();
        else if (opts.render) opts.render();
        if (!document.getElementById(id)) return false;
      }
      select(id, { open: true, hash: true, scroll: true, focus: desktop() ? 'row' : 'back' });
      return true;
    }
    rail.addEventListener('click', ev => {
      const b = ev.target.closest('.rail-btn');
      if (!b) return;
      const next = b.dataset.week;
      const inR = !!(opts.inRange && opts.inRange());
      if (!inR && next === week) return;
      week = next;
      selected = '';
      detailOpen = false;
      const list = document.querySelector('.listpane');
      if (list) list.scrollTop = 0;
      if (inR && opts.clearRange) opts.clearRange();
      else if (opts.render) opts.render();
    });
    agenda.addEventListener('click', ev => {
      const row = ev.target.closest('.agenda-row');
      if (!row) return;
      select(row.id, { open: true, hash: true, scroll: desktop(), focus: desktop() ? 'row' : 'back' });
    });
    agenda.addEventListener('keydown', ev => {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const rows = [...agenda.querySelectorAll('.agenda-row')];
      if (!rows.length) return;
      const i = rows.findIndex(r => r.id === selected);
      let n = i;
      if (ev.key === 'ArrowDown') n = Math.min(rows.length - 1, (i < 0 ? -1 : i) + 1);
      else if (ev.key === 'ArrowUp') n = Math.max(0, i < 0 ? 0 : i - 1);
      else if (ev.key === 'Home') n = 0;
      else if (ev.key === 'End') n = rows.length - 1;
      else return;
      ev.preventDefault();
      if (!rows[n]) return;
      if (rows[n].id !== selected) select(rows[n].id, { hash: true, focus: 'row', scroll: true });
      else rows[n].focus({ preventScroll: true });
    });
    if (back) back.addEventListener('click', () => {
      detailOpen = false;
      showDetail();
      const row = selected && document.getElementById(selected);
      if (row) row.focus();
    });
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape' || desktop() || !document.body.classList.contains('is-reading')) return;
      if (document.querySelector('.mp-sheet, .bio-overlay:not([hidden])')) return;
      ev.preventDefault();
      if (back) back.click();
    });
    mq.addEventListener('change', () => showDetail());
    window.addEventListener('hashchange', () => {
      const id = hashNow();
      if (!id) return;
      if (id === selected && document.getElementById(id)) {
        if (!desktop() && !detailOpen) select(id, { open: true, focus: 'back' });
        return;
      }
      openId(id);
    });
    function afterRender(ids) {
      paintRail();
      if (opts.listLabel) agenda.setAttribute('aria-label', opts.listLabel());
      if (!selected || ids.indexOf(selected) === -1) {
        const hash = hashNow();
        if (hash && ids.indexOf(hash) !== -1) { selected = hash; detailOpen = true; }
        else selected = ids[0] || '';
      }
      markRows();
      writeDetail();
      showDetail();
      const hash = hashNow();
      if (hash && hash === selected && !flashed.has(hash)) {
        flashed.add(hash);
        const row = document.getElementById(selected);
        if (row) { row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 2200); }
      }
    }
    function setCounts(map) {
      document.querySelectorAll('[data-count]').forEach(el => { el.textContent = String(map[el.dataset.count] || 0); });
    }
    const api = {
      week: () => week,
      setWeek: w => { week = w; },
      selected: () => selected,
      afterRender,
      openId,
      setCounts
    };
    window.GRPane.openId = openId;
    return api;
  }
  window.GRPane = { attach, weeks, anchorDate, groupDays, dayLabel, timeCell, whenLine, rowHTML, bioHTML, calHTML, ticketsHTML, escape };
})();
