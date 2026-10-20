// Seasonal page logic (seasonal.html): renders seasonal.js events with NEW badges, a type filter, ★ going and Share.
// You normally never need to edit this file — edit seasonal.js instead.
(function () {
  const C = (typeof CONFIG !== 'undefined' && CONFIG) || {}, NEW_DAYS = C.NEW_DAYS || 7, SITE = (C.SITE_URL || location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')).replace(/\/?$/, '/') + 'seasonal.html';
  const $ = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const qs = new URLSearchParams(location.search), qt = qs.get('today');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(qt || '') ? qt : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
  const ago = d => (Date.parse(today) - Date.parse(d)) / 864e5;
  const isNew = x => x.added && ago(x.added) >= 0 && ago(x.added) < NEW_DAYS;
  const sid = e => 'ev-' + GRICS.slug(e.sort + '-' + e.name);
  const KEY = 'grc-going';
  let going; try { going = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { going = new Set(); }
  const saveGoing = () => { try { localStorage.setItem(KEY, JSON.stringify([...going])); } catch (e) {} };
  const list = SEASONAL.slice().sort((a, b) => a.sort.localeCompare(b.sort));
  function card(e) {
    const id = sid(e), on = going.has(id), nw = isNew(e);
    return `<article class="card${nw ? ' is-new' : ''}" id="${id}" data-id="${id}"><div class="badges"><span class="tag">${h(e.type)}</span>${nw ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${h(e.name)}</h3><p>${h(e.location)}</p><p>${h(e.when)}</p>${nw ? `<p class="added-on">Added ${new Date(e.added + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
      <div class="actions"><a class="b primary" href="${h(e.link)}" target="_blank" rel="noopener">Info / tickets</a>
      <button type="button" class="b going${on ? ' on' : ''}" data-id="${id}" aria-pressed="${on}">${on ? '★ Going' : '☆ I\'m going'}</button>
      <button type="button" class="b share" data-id="${id}" data-title="${h(e.name)}">Share</button></div></article>`;
  }
  // an event runs from `sort` to `end` (optional; one-day event if missing)
  const overlaps = (e, f, t) => e.sort <= t && (e.end || e.sort) >= f;
  const DR = DateRange.init({ today, onChange: () => render(), toast: m => toast(m) }), range = DR.range, md = DR.md;
  const weekEnd = DR.addD(today, 13 - ((new Date(today + 'T12:00').getDay() + 6) % 7));
  $('#f-type').insertAdjacentHTML('beforeend', [...new Set(list.map(e => e.type))].sort().map(t => `<option>${h(t)}</option>`).join(''));
  function render() {
    const t = $('#f-type').value, mine = $('#f-mine').checked, nw = $('#f-new').checked;
    const ok = e => (!t || e.type === t) && (!mine || going.has(sid(e))) && (!nw || isNew(e));
    const rg = range(), inR = !!rg;
    $('#seasonal-sec').hidden = inR; $('#range-sec').hidden = !inR;
    $('.subtitle').textContent = inR ? `Events from ${md(rg[0])} to ${md(rg[1])}` : 'Seasonal Events';
    if (inR) {
      const all = list.filter(e => overlaps(e, rg[0], rg[1])), l = all.filter(ok);
      $('#range-h').textContent = `Events from ${md(rg[0])} to ${md(rg[1])}`;
      $('#range-n').textContent = `${l.length} event${l.length === 1 ? '' : 's'}` + (l.length < all.length ? ` (of ${all.length}, filters on)` : '');
      $('#range-list').innerHTML = l.map(card).join('') || (all.length ? '<p class="few">No events match these filters.</p>' : '<p class="few">No seasonal events listed in those dates yet. We add new ones as they\'re announced, so check back soon.</p>');
    }
    // default view: events ongoing or starting this week or next (today through the Sunday that ends next week)
    const all = list.filter(e => overlaps(e, today, weekEnd)), l = all.filter(ok);
    $('#seasonal').innerHTML = l.map(card).join('') || (all.length ? '<p class="few">Nothing matches.</p>' : '<p class="few">No seasonal events this week or next. Tap 📅 Pick dates to look further out.</p>');
    const n = list.filter(isNew).length, el = $('#newcount'); el.hidden = !n;
    el.innerHTML = `<span class="new">NEW</span> <strong>${n}</strong> new listing${n === 1 ? '' : 's'} added this week`;
  }
  document.querySelectorAll('.filters select, .filters input').forEach(x => x.addEventListener('change', render));
  $('#f-clear').addEventListener('click', () => { $('#f-type').value = ''; $('#f-mine').checked = $('#f-new').checked = false; render(); });
  render();
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return; const id = b.dataset.id;
    if (b.classList.contains('going')) {
      going.has(id) ? going.delete(id) : going.add(id); saveGoing();
      if ($('#f-mine').checked) render(); else { const on = going.has(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.textContent = on ? '★ Going' : '☆ I\'m going'; }
    } else if (b.classList.contains('share')) {
      const url = SITE + '#' + id, title = b.dataset.title;
      if (navigator.share) { try { await navigator.share({ title, text: title + ' — Grand Rapids Happenings', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch (e) { window.prompt('Copy this link:', url); }
    }
  });
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { t.scrollIntoView(); t.classList.add('flash'); } }
})();
