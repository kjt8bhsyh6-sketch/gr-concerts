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
  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const id = c => slug(c.date + '-' + c.artist);
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function fold(line) { const o = []; while (line.length > 74) { o.push(line.slice(0, 74)); line = ' ' + line.slice(74); } o.push(line); return o.join('\r\n'); }
  const VTZ = ['BEGIN:VTIMEZONE', 'TZID:America/Detroit', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500', 'TZNAME:EST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  function vevent(c) {
    return ['BEGIN:VEVENT', `UID:${id(c)}@gr-concerts`, `DTSTAMP:${(c.added || c.date).replace(/-/g, '')}T120000Z`,
      `DTSTART;TZID=${TZ}:${stamp(parts(c))}`, `DTEND;TZID=${TZ}:${stamp(parts(c, 3))}`,
      `SUMMARY:${esc(c.artist)}`, `LOCATION:${esc(c.venue + ', Grand Rapids, MI')}`,
      `DESCRIPTION:${esc(`${c.genre}, ${c.time}. Tickets/info: ${c.link} (confirm details with the venue)`)}`,
      `URL:${c.link}`, 'END:VEVENT'];
  }
  function calendar(list, name) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GR Concerts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(name || 'Grand Rapids Concerts')}`, `X-WR-TIMEZONE:${TZ}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
      ...VTZ, ...list.flatMap(vevent), 'END:VCALENDAR'];
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function google(c) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: c.artist, dates: `${stamp(parts(c))}/${stamp(parts(c, 3))}`,
      ctz: TZ, location: c.venue + ', Grand Rapids, MI', details: `Tickets/info: ${c.link}` });
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  const api = { calendar, google, id, slug, startISO: c => iso(parts(c)), endISO: c => iso(parts(c, 3)), to24 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GRICS = api;
})(this);
