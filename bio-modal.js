// Shared "Who is this?" pop-up, used by index.html (app.js) and sports.html (sports-app.js).
// BioModal.open([{ title, text, source }, ...], openerButton) — one or more sections. Closes with ×, Esc, or a click outside.
(function () {
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const dlg = document.createElement('div');
  dlg.className = 'bio-overlay'; dlg.hidden = true;
  dlg.innerHTML = `<div class="bio-box" role="dialog" aria-modal="true" aria-labelledby="bio-title" tabindex="-1">
    <button type="button" class="bio-x" aria-label="Close">×</button><div class="bio-body"></div></div>`;
  document.body.appendChild(dlg);
  const src = u => u ? `<p class="bio-src">Source: <a href="${h(u)}" target="_blank" rel="noopener">${h(new URL(u).hostname.replace(/^www\./, ''))}</a></p>` : '';
  let opener = null;
  function open(sections, btn) {
    sections = (sections || []).filter(s => s && s.text); if (!sections.length) return;
    dlg.querySelector('.bio-body').innerHTML = sections.map((s, i) =>
      `${i ? `<h3>${h(s.title)}</h3>` : `<h2 id="bio-title">${h(s.title)}</h2>`}<p${i ? '' : ' id="bio-text"'}>${h(s.text)}</p>${src(s.source)}`).join('');
    opener = btn; dlg.hidden = false; document.body.classList.add('bio-open');
    dlg.querySelector('.bio-x').focus();
  }
  function close() { if (dlg.hidden) return; dlg.hidden = true; document.body.classList.remove('bio-open'); if (opener) opener.focus(); }
  dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('.bio-x')) { ev.stopPropagation(); close(); } });
  document.addEventListener('keydown', ev => {
    if (dlg.hidden) return;
    if (ev.key === 'Escape') close();
    else if (ev.key === 'Tab') { // keep focus inside the dialog
      const f = [...dlg.querySelectorAll('button, a[href]')], first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });
  window.BioModal = { open, close };
})();
