// Privacy-friendly outbound ticket/affiliate click log. No cookies, no IP, no user agent stored.
// POST /api/public/click  body: {e: event title/id, v: venue, u: destination URL, c: category, p: page}
const CATS = new Set(['tickets', 'affiliate', 'venue', 'outbound']);
const s = (x, n) => String(x ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const ok = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
export async function publicClick(req, env) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const o = req.headers.get('Origin');
  if (o && !/^https:\/\/(www\.)?grhappenings\.com$/.test(o)) return new Response(null, { status: 403 });
  const len = +(req.headers.get('Content-Length') || 0);
  if (len > 2048) return new Response(null, { status: 413 });
  let b;
  try { const t = await req.text(); if (t.length > 2048) return new Response(null, { status: 413 }); b = JSON.parse(t); } catch { return new Response(null, { status: 400 }); }
  if (!b || typeof b !== 'object') return new Response(null, { status: 400 });
  let u;
  try { u = new URL(s(b.u, 500)); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return new Response(null, { status: 400 }); }
  u.search = ''; u.hash = ''; // drop query strings (may carry tracking or personal params)
  const cat = CATS.has(b.c) ? b.c : 'outbound';
  if (!env.CLICKS) return ok();
  await env.CLICKS.prepare('INSERT INTO clicks (ts,page,event,venue,host,url,category) VALUES (?,?,?,?,?,?,?)')
    .bind(new Date().toISOString(), s(b.p, 40), s(b.e, 160), s(b.v, 120), u.hostname.slice(0, 120), u.toString().slice(0, 300), cat).run();
  return ok();
}
