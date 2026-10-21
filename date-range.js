// Shared "Looking for something further out?" date-range picker (used by index.html, sports.html, seasonal.html).
// Needs the #range markup (r-open, r-panel, r-from, r-to, r-chips, r-go, r-back). Range is kept in the URL as ?from=&to=.
// DateRange.init({ today, onChange, toast }) returns { range, md, addD } where range() is [from, to] or null.
(function () {
  const $ = s => document.querySelector(s);
  const md = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const addD = (d, n) => { const t = new Date(d + 'T12:00'); t.setDate(t.getDate() + n); return t.toLocaleDateString('en-CA'); };
  const addM = (d, n) => { const t = new Date(d + 'T12:00'); const day = t.getDate(); t.setDate(1); t.setMonth(t.getMonth() + n); t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return t.toLocaleDateString('en-CA'); };
  const isD = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '');
  function init(o) {
    const today = o.today, qs = new URLSearchParams(location.search), onChange = o.onChange, toast = o.toast || (m => alert(m));
    const dow = new Date(today + 'T12:00').getDay(), defFrom = addD(today, 14 - ((dow + 6) % 7)); // Monday after next week ends
    let rFrom = qs.get('from'), rTo = qs.get('to');
    const range = () => isD(rFrom) && isD(rTo) && rFrom <= rTo ? [rFrom, rTo] : null;
    const rf = $('#r-from'), rt = $('#r-to');
    rf.min = rt.min = today; rf.value = range() ? rFrom : defFrom; rt.value = range() ? rTo : addD(rf.value, 30);
    rf.addEventListener('change', () => { if (rt.value < rf.value) rt.value = addD(rf.value, 30); rt.min = rf.value; });
    const y = +today.slice(0, 4), mo = +today.slice(5, 7), monEnd = (yy, m) => new Date(yy, m, 0).toLocaleDateString('en-CA');
    // Max pickable date = today + 6 months (computed, never hard-coded).
    // ...or the last listed date if the data runs further (so late listings are never unpickable).
    const maxD = [addM(today, 6), o.lastDate].filter(isD).sort().pop(); rf.max = rt.max = maxD; rt.min = rf.value;
    const clampD = d => d > maxD ? maxD : d;
    const chips = [['Next 30 days', today, addD(today, 30)], ['Next 3 months', today, addM(today, 3)], ['Next 6 months', today, clampD(addM(today, 6))]];
    for (let i = 0; i <= 2; i++) { const m = mo + i, yy = y + Math.floor((m - 1) / 12), mm = (m - 1) % 12 + 1, st = `${yy}-${String(mm).padStart(2, '0')}-01`;
      chips.push([new Date(st + 'T12:00').toLocaleDateString('en-US', { month: 'long' }), i ? st : today, clampD(monEnd(yy, mm))]); }
    $('#r-chips').innerHTML = chips.map(c => `<button type="button" class="chip" data-f="${c[1]}" data-t="${c[2]}">${c[0]}</button>`).join('');
    const openP = on => { $('#r-panel').hidden = !on; $('#r-open').setAttribute('aria-expanded', on); };
    function applyRange(f, t) {
      rFrom = f; rTo = t; const u = new URL(location.href);
      if (range()) { u.searchParams.set('from', f); u.searchParams.set('to', t); } else { u.searchParams.delete('from'); u.searchParams.delete('to'); }
      history.replaceState(null, '', u); onChange();
    }
    $('#r-open').addEventListener('click', () => openP($('#r-panel').hidden));
    $('#r-chips').addEventListener('click', ev => { const c = ev.target.closest('.chip'); if (!c) return; rf.value = c.dataset.f; rt.value = c.dataset.t; rt.min = rf.value; applyRange(c.dataset.f, c.dataset.t); });
    $('#r-go').addEventListener('click', () => { if (rf.value && rt.value && rf.value <= rt.value) applyRange(rf.value, rt.value); else toast('Pick a From date before the To date.'); });
    $('#r-back').addEventListener('click', () => { applyRange(null, null); openP(false); rf.value = defFrom; rt.value = addD(defFrom, 30); rt.min = defFrom; });
    if (range()) openP(true);
    return { range, md, addD };
  }
  window.DateRange = { init, md, addD };
})();
