// Calendar helpers shared by the web page (app.js) and scripts/build-ics.js. No need to edit.
(function (root) {
  const TZ = 'America/Detroit';
  function to24(t) { // "7:30 PM" -> [19,30]; unknown -> [19,0]
    const m = /(\d{1,2}):?(\d{2})?\s*([AP]M)/i.exec(t || '');
    if (!m) return [19, 0];
    let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return [h, +(m[2] || 0)];
  }
  const p = n => String(n).padStart(2, '0');
  function parts(c, addHours) { // local wall-clock start (or end) as {y,mo,d,h,mi}
    const [y, mo, d] = c.date.split('-').map(Number); let [h, mi] = to24(c.time);
    const dt = new Date(Date.UTC(y, mo - 1, d, h + (addHours || 0), mi));
    return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
  }
  const stamp = q => `${q.y}${p(q.mo)}${p(q.d)}T${p(q.h)}${p(q.mi)}00`;
  function offset(q) { // "-04:00" or "-05:00" for Detroit on that date
    const guess = new Date(Date.UTC(q.y, q.mo - 1, q.d, q.h + 5, q.mi));
    const s = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).format(guess);
    const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(s); return m ? `${m[1]}:${m[2] || '00'}` : '-05:00';
  }
  const iso = q => `${q.y}-${p(q.mo)}-${p(q.d)}T${p(q.h)}:${p(q.mi)}:00${offset(q)}`;
  const slugAll = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = s => slugAll(s).slice(0, 60);
  // short stable hash (FNV-1a, base36) so long titles cut at 60 chars stay unique
  const hash = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36).slice(0, 6); };
  // card / UID id. Short titles keep their old id; long ones get a hash of the full title + time.
  // A second show on the same date with the same title (matinee and evening) sets disambiguate
  // so the two cards, hash links, and calendar UIDs do not collapse into one.
  const id = c => {
    const extra = c.disambiguate && c.time ? '-' + c.time : '';
    const f = slugAll(c.date + '-' + c.artist + extra);
    return f.length <= 60 ? f : f.slice(0, 53).replace(/-$/, '') + '-' + hash(f + '|' + (c.time || ''));
  };
  function disambiguate(list) {
    const counts = {};
    (list || []).forEach(c => { const k = slugAll(c.date + '-' + c.artist); counts[k] = (counts[k] || 0) + 1; });
    (list || []).forEach(c => { if (counts[slugAll(c.date + '-' + c.artist)] > 1) c.disambiguate = true; });
    return list;
  }
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function fold(line) { const o = []; while (line.length > 74) { o.push(line.slice(0, 74)); line = ' ' + line.slice(74); } o.push(line); return o.join('\r\n'); }
  const VTZ = ['BEGIN:VTIMEZONE', 'TZID:America/Detroit', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500', 'TZNAME:EST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  // Personal marks (marks.js) for the per-card download / Google link only; subscribe feeds never pass a mark.
  const PREFIX = { going: '★ Going: ', interested: '♥ Interested: ' };
  const title = (c, mark) => (PREFIX[mark] || '') + c.artist;
  const markLines = mark => mark === 'going' ? ['STATUS:CONFIRMED'] : mark === 'interested' ? ['STATUS:TENTATIVE', 'TRANSP:TRANSPARENT'] : [];
  function vevent(c, mark) {
    return ['BEGIN:VEVENT', `UID:${id(c)}@gr-concerts`, `DTSTAMP:${(c.added || c.date).replace(/-/g, '')}T120000Z`,
      `DTSTART;TZID=${TZ}:${stamp(parts(c))}`, `DTEND;TZID=${TZ}:${stamp(parts(c, 3))}`,
      `SUMMARY:${esc(title(c, mark))}`, ...markLines(mark), `LOCATION:${esc(c.venue + ', Grand Rapids, MI')}`,
      `DESCRIPTION:${esc(`${c.genre}, ${c.time}. Tickets/info: ${c.link} (confirm details with the venue)`)}`,
      `URL:${c.link}`, 'END:VEVENT'];
  }
  function calendar(list, name, mark) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GR Concerts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(name || 'Grand Rapids Concerts')}`, `X-WR-TIMEZONE:${TZ}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
      ...VTZ, ...list.flatMap(c => vevent(c, mark)), 'END:VCALENDAR'];
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function google(c, mark) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: title(c, mark), dates: `${stamp(parts(c))}/${stamp(parts(c, 3))}`,
      ctz: TZ, location: c.venue + ', Grand Rapids, MI', details: `Tickets/info: ${c.link}` });
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  if (typeof CONCERTS !== 'undefined') disambiguate(CONCERTS);
  const api = { calendar, google, title, id, slug, disambiguate, startISO: c => iso(parts(c)), endISO: c => iso(parts(c, 3)), to24 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GRICS = api;
})(this);
