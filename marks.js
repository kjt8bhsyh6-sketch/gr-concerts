// "I'm going" / "I'm interested" marks, shared by app.js, sports-app.js and seasonal-app.js.
// Saved only in this browser (localStorage keys grc-going and grc-interested). The two are exclusive:
// marking one clears the other for that listing. Testing only: ?demoMarks=1 marks the 1st listing Going and
// the 2nd Interested for that page load, without saving anything.
window.Marks = (function () {
  const KG = 'grc-going', KI = 'grc-interested';
  const load = k => { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch (e) { return new Set(); } };
  const going = load(KG), interested = load(KI);
  let demo = new URLSearchParams(location.search).get('demoMarks') === '1';
  const save = () => { if (demo) return; try { localStorage.setItem(KG, JSON.stringify([...going])); localStorage.setItem(KI, JSON.stringify([...interested])); } catch (e) {} };
  const state = id => going.has(id) ? 'going' : interested.has(id) ? 'interested' : '';
  const cardClass = id => { const s = state(id); return s ? ' mark-' + s : ''; };
  const label = (kind, on) => kind === 'going' ? (on ? '★ Going' : '☆ I\'m going') : (on ? '♥ Interested' : '♡ Interested');
  const btn = (id, kind) => { const on = state(id) === kind;
    return `<button type="button" class="b ${kind}${on ? ' on' : ''}" data-id="${id}" aria-pressed="${on}">${label(kind, on)}</button>`; };
  const buttons = id => btn(id, 'going') + btn(id, 'interested');
  function refresh(id) {
    const s = state(id);
    ['going', 'interested'].forEach(k => document.querySelectorAll(`button.${k}[data-id="${id}"]`).forEach(x => {
      const on = s === k; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); x.textContent = label(k, on); }));
    document.querySelectorAll(`article.card[id="${id}"]`).forEach(c => { c.classList.toggle('mark-going', s === 'going'); c.classList.toggle('mark-interested', s === 'interested'); });
  }
  // returns true if the click was a mark button (and handled it)
  function handle(b) {
    const k = b.classList.contains('going') ? 'going' : b.classList.contains('interested') ? 'interested' : '';
    if (!k || !b.dataset.id) return false;
    const id = b.dataset.id, mine = k === 'going' ? going : interested, other = k === 'going' ? interested : going;
    if (mine.has(id)) mine.delete(id); else { mine.add(id); other.delete(id); }
    save(); refresh(id); return true;
  }
  // filter select value: '' = everything, 'all' = going or interested, 'going', 'interested'
  const match = (id, mode) => !mode || (mode === 'all' ? !!state(id) : state(id) === mode);
  function seedDemo(ids) { if (!demo) return; going.clear(); interested.clear(); if (ids[0]) going.add(ids[0]); if (ids[1]) interested.add(ids[1]); }
  return { state, cardClass, buttons, handle, match, seedDemo };
})();
