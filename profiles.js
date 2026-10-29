/* Visitor profiles: sign in by emailed link, pick interests, see "picks for you this week".
   Backend: Cloudflare Worker grh-profiles (see EDITING.md). Sessions stay active until Sign out (or Delete my account).
   Triple-redundant persistence: first-party HttpOnly cookie (Path=/, 400-day renewed daily) + localStorage + IndexedDB ("grh-auth"),
   with self-healing across all three layers on every load so iOS Safari, PWAs, and transient network glitches never log users out. */
(function () {
  const API = /^(www\.)?grhappenings\.com$/.test(location.hostname) ? "/api" : (window.GRH_API || "https://grh-profiles.grhappenings.workers.dev");
  const KS = "grh-session", KP = "grh-profile";
  const hdr = document.querySelector("body > header, header"); if (!hdr) return;
  const INFO = /privacy|terms/.test(location.pathname);
  const pg = /sports/.test(location.pathname) ? "sports" : /seasonal/.test(location.pathname) ? "seasonal" : "concerts";
  const OPT = {
    genres: ["Rock", "Indie", "Comedy", "Country", "Folk", "Punk", "Metal", "Electronic", "Hip-Hop", "Jazz", "Classical", "Musical", "Theater"],
    venues: ["Pyramid Scheme", "Intersection", "GLC Live", "Van Andel", "DeVos", "Wealthy Theatre", "Dr. Grins", "St. Cecilia", "Civic Theatre", "Big Room", "Meijer Gardens", "Tip Top", "Midtown", "Speciation", "Calvin", "Fountain Street", "GRCC Spectrum", "GRCC Albert P. Smith", "Dog Story", "Comedy Project", "Lowell Arts", "GVSU Haas", "Acrisure", "Park Theatre", "Jack H. Miller", "Knickerbocker", "Holland Civic Center", "Holland Community Theatre", "Saugatuck Center", "Gun Lake Casino", "FireKeepers", "Soaring Eagle", "Four Winds"],
    teams: ["Griffins", "Gold", "Rise", "Whitecaps", "AC Grand Rapids"],
    gameTypes: ["Weekend", "Weeknight", "Matinee", "Home openers"],
    types: ["Holiday Lights", "Christmas Market", "Holiday Market", "Holiday Parade", "Holiday Exhibit", "Holiday Tea", "Santa Visit", "Ghost Tour"],
  };
  const FREQ = [["weekly", "Weekly"], ["daily", "Daily"], ["announced", "Just announced"]];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lc = s => String(s || "").toLowerCase();
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let memS = get(KS), memP = get(KP);
  function openIdb() {
    return new Promise(ok => {
      try {
        const q = indexedDB.open("grh-auth", 1);
        q.onupgradeneeded = () => q.result.createObjectStore("kv");
        q.onsuccess = () => ok(q.result);
        q.onerror = q.onblocked = () => ok(null);
      } catch (e) { ok(null); }
    });
  }
  const idbGet = k => openIdb().then(db => !db ? null : new Promise(ok => {
    try { const r = db.transaction("kv", "readonly").objectStore("kv").get(k); r.onsuccess = () => ok(r.result ?? null); r.onerror = () => ok(null); } catch (e) { ok(null); }
  }));
  const idbPut = (k, v) => openIdb().then(db => !db ? null : new Promise(ok => {
    try { const tx = db.transaction("kv", "readwrite"), st = tx.objectStore("kv"); v == null ? st.delete(k) : st.put(v, k); tx.oncomplete = tx.onerror = () => ok(); } catch (e) { ok(); }
  }));
  function saveAuth(session, profile) {
    if (session) { memS = session; put(KS, session); idbPut(KS, session); }
    if (profile) { memP = profile; put(KP, profile); idbPut(KP, profile); }
  }
  function clearAuth() {
    memS = null; memP = null;
    put(KS, null); put(KP, null);
    idbPut(KS, null); idbPut(KP, null);
  }
  const blank = () => ({ concerts: { genres: [], venues: [], artists: [] }, sports: { teams: [], gameTypes: [] }, seasonal: { types: [] }, alerts: { on: false, freq: "weekly" } });
  const track = (p, t) => { try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: "profile/" + p, title: t || p, event: true }); } catch (e) {} };

  const FP = API[0] === "/"; // same-origin /api sends & renews the first-party HttpOnly cookie
  async function api(path, method, body, tokOverride) {
    const s = tokOverride || get(KS) || memS, h = { "Content-Type": "application/json" };
    if (s) h.Authorization = "Bearer " + s;
    const send = (base, cred) => fetch(base + path, { method: method || "GET", headers: h, credentials: cred, body: body ? JSON.stringify(body) : undefined });
    let r, viaFallback = false;
    try {
      r = await send(API, FP ? "same-origin" : "omit");
    } catch (e1) {
      await new Promise(ok => setTimeout(ok, 150));
      try {
        r = await send(API, FP ? "same-origin" : "omit");
      } catch (e2) {
        try {
          r = await send(API === "/api" ? "https://grh-profiles.grhappenings.workers.dev" : "https://grhappenings.com/api", "omit");
          viaFallback = true;
        } catch (e3) {
          throw new Error("Couldn't reach the sign-in server. Please check your connection and try again.");
        }
      }
    }
    const j = await r.json().catch(() => ({}));
    if (viaFallback) j.viaFallback = true;
    if (!r.ok) { const e = new Error(j.error || (r.status === 429 ? "Too many tries. Please wait a few minutes and try again." : "Something went wrong. Try again.")); e.status = r.status; e.viaFallback = viaFallback; e.retryAfter = +j.retryAfter || 0; throw e; }
    return j;
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
header{position:relative}
.mp-pill{position:absolute;top:10px;right:10px;margin:0;height:44px;min-height:44px;padding:0 .7rem;border-radius:99px;font-size:.78rem;font-weight:700;line-height:1;background:#fff;border:1px solid var(--line);color:var(--text);cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap}
.mp-pill:hover{filter:brightness(.95)}
.mp-pill.mp-av{width:44px;height:44px;min-height:44px;padding:0;font-weight:700;font-size:1rem;background:var(--accent);color:#fff;border-color:#fff}
.mp-back{position:fixed;inset:0;background:#0006;z-index:50}.mp-sheet{position:fixed;left:0;right:0;bottom:0;max-width:640px;margin:0 auto;background:#fff;border-radius:18px 18px 0 0;padding:1rem 1.2rem 1.4rem;z-index:51;max-height:88vh;overflow:auto;box-shadow:0 -4px 20px #0002}
.mp-sheet h3{margin:.2rem 0 1rem;font-size:1.15rem;display:flex;justify-content:space-between;align-items:center}.mp-x{background:none;border:0;min-height:0;padding:0;font-size:1.3rem;cursor:pointer}
.mp-l{font-size:.8rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:1rem 0 .4rem}.mp-h{font-weight:700;margin:.9rem 0 0}
.mp-c{display:inline-block;padding:.35rem .75rem;margin:0 .3rem .4rem 0;border:1px solid var(--line);border-radius:99px;font-size:.88rem;background:#fff;color:var(--text);min-height:0;cursor:pointer}.mp-c.on{background:var(--accent);border-color:var(--accent);color:#fff}
details.mp-d{border-top:1px solid var(--line);margin-top:1rem;padding-top:.7rem}details.mp-d summary{font-weight:600;font-size:.92rem;cursor:pointer}
.mp-in{font:inherit;width:100%;box-sizing:border-box;padding:.45rem;border:1px solid var(--line);border-radius:8px;margin-top:.5rem}
.mp-step{border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;margin:.7rem 0}.mp-n{display:inline-block;width:1.4rem;height:1.4rem;border-radius:99px;background:var(--accent);color:#fff;text-align:center;font-size:.8rem;line-height:1.4rem;margin-right:.4rem}
.mp-ok{color:var(--new);font-size:.85rem;margin:.5rem 0 0}.mp-err{color:#b91c1c;font-size:.85rem;margin:.5rem 0 0}.mp-wait{color:var(--navy);background:#eef0f6;border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;font-size:.85rem;margin:.5rem 0 0}.mp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.mp-prev{font-size:.8rem;background:var(--going);border:1px dashed var(--going-line);border-radius:8px;padding:.5rem;margin:.5rem 0 0;word-break:break-all}
.mp-sw{float:right;width:2.6rem;height:1.5rem;border-radius:99px;background:#ccc;position:relative;border:0;padding:0;min-height:0;cursor:pointer}.mp-sw.on{background:var(--new)}.mp-sw:after{content:"";position:absolute;left:3px;top:3px;width:1.1rem;height:1.1rem;border-radius:99px;background:#fff;transition:left .15s}.mp-sw.on:after{left:calc(100% - 1.1rem - 3px)}
.mp-off .mp-c{opacity:.45}.mp-save{display:flex;justify-content:center;width:100%;margin-top:1.2rem}.mp-links{text-align:center;margin:.8rem 0 0;font-size:.85rem}.mp-links a{margin:0 .6rem}
.mp-strip{margin:0 0 1rem;border:1px solid var(--going-line);background:var(--going);border-radius:10px}.mp-strip summary{padding:.55rem .9rem;font-weight:600;font-size:.92rem;cursor:pointer;list-style:none}
.mp-strip ul{margin:0;padding:0 .9rem .6rem;list-style:none}.mp-strip li{padding:.4rem 0;border-top:1px solid color-mix(in srgb,var(--going-line) 35%,white);font-size:.9rem}.mp-strip li span{display:block;color:var(--muted);font-size:.8rem}.mp-strip a{color:inherit}
.mp-strip li.mp-pk{padding:0}.mp-pk a{display:flex;align-items:center;gap:.6rem;padding:.5rem .3rem;margin:0 -.3rem;border-radius:8px;text-decoration:none;color:inherit;min-height:44px;box-sizing:border-box}
.mp-pk a:hover{background:color-mix(in srgb,var(--going) 28%,white)}.mp-pk a:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.mp-pk b{display:block;font-weight:600}.mp-pk i{margin-left:auto;font-style:normal;color:var(--muted);font-size:1.2rem;line-height:1}
.card.mp-hl,.agenda-row.mp-hl{animation:mp-hl 2.4s ease-out}@keyframes mp-hl{0%,35%{box-shadow:0 0 0 4px var(--accent),0 6px 22px #0003;background:#eef1f8}100%{box-shadow:0 2px 8px #0000000d}}
@media (prefers-reduced-motion:reduce){.card.mp-hl,.agenda-row.mp-hl{animation:none;box-shadow:0 0 0 4px var(--accent)}}
</style>`);

  const pill = document.createElement("button"); pill.type = "button"; pill.className = "mp-pill"; hdr.classList.add("mp-has"); hdr.appendChild(pill);
  let strip = null;

  function close() { document.querySelectorAll(".mp-back,.mp-sheet").forEach(e => e.remove()); }
  function sheet(html) {
    close();
    document.body.insertAdjacentHTML("beforeend", `<div class="mp-back mp-backdrop open"></div><div class="mp-sheet mp-modal" role="dialog" aria-modal="true">${html}</div>`);
    const s = document.querySelector(".mp-sheet");
    s.setAttribute("aria-modal", "true");
    document.querySelector(".mp-back").onclick = close; s.querySelector(".mp-x").onclick = close;
    s.addEventListener("click", e => {
      const c = e.target.closest(".mp-c"); if (c) { if (c.dataset.one) s.querySelectorAll(`.mp-c[data-g="${c.dataset.g}"]`).forEach(x => x.classList.toggle("on", x === c)); else c.classList.toggle("on"); }
      const w = e.target.closest(".mp-sw"); if (w) { w.classList.toggle("on"); w.setAttribute("aria-checked", w.classList.contains("on")); s.querySelector(".mp-freq").classList.toggle("mp-off", !w.classList.contains("on")); }
    });
    return s;
  }
  const chips = (g, on, one) => OPT[g] ? OPT[g].map(c => `<button type="button" class="mp-c${on.includes(c) ? " on" : ""}" data-g="${g}">${esc(c)}</button>`).join("")
    : FREQ.map(([v, t]) => `<button type="button" class="mp-c${on.includes(v) ? " on" : ""}" data-g="${g}" data-v="${v}" data-one="1">${t}</button>`).join("");
  function interests(p) {
    return `<p class="mp-h">Concerts</p><div class="mp-l">Genres</div>${chips("genres", p.concerts.genres)}
<details class="mp-d"${p.concerts.venues.length || p.concerts.artists.length ? " open" : ""}><summary>Venues &amp; artists</summary><div class="mp-l">Venues</div>${chips("venues", p.concerts.venues)}
<div class="mp-l">Artists you follow</div><input class="mp-in mp-art" placeholder="e.g. Mt. Joy, Hozier (comma-separated)" value="${esc(p.concerts.artists.join(", "))}"></details>
<p class="mp-h">Sports</p><div class="mp-l">Teams</div>${chips("teams", p.sports.teams)}<div class="mp-l">Game types</div>${chips("gameTypes", p.sports.gameTypes)}
<p class="mp-h">Seasonal</p><div class="mp-l">Event types</div>${chips("types", p.seasonal.types)}`;
  }
  const alertsUI = p => `<div class="mp-l">Email alerts <button type="button" class="mp-sw${p.alerts.on ? " on" : ""}" role="switch" aria-checked="${p.alerts.on}" aria-label="Email alerts"></button></div>
<div class="mp-freq${p.alerts.on ? "" : " mp-off"}">${chips("freq", [p.alerts.freq])}</div>`;
  function read(s) {
    const on = g => [...s.querySelectorAll(`.mp-c.on[data-g="${g}"]`)].map(b => b.textContent);
    const f = s.querySelector('.mp-c.on[data-g="freq"]');
    return { concerts: { genres: on("genres"), venues: on("venues"), artists: s.querySelector(".mp-art").value.split(",").map(x => x.trim()).filter(Boolean) },
      sports: { teams: on("teams"), gameTypes: on("gameTypes") }, seasonal: { types: on("types") },
      alerts: { on: s.querySelector(".mp-sw").classList.contains("on"), freq: f ? f.dataset.v : "weekly" } };
  }

  function openSignup() {
    const p = blank(); p.alerts.freq = "weekly";
    const s = sheet(`<h3>Create profile <button type="button" class="mp-x" aria-label="Close">✕</button></h3>
<p class="muted" style="margin:-.6rem 0 .2rem">Already have one? Just enter your email and tap the button.</p>
<div class="mp-step"><span class="mp-n">1</span><b>Your email</b><input class="mp-in mp-em" type="email" autocomplete="email" placeholder="you@example.com"><p class="muted" style="margin:.4rem 0 0">We'll email you a sign-in link. No password needed.</p></div>
<div class="mp-step"><span class="mp-n">2</span><b>What do you like?</b>${interests(p)}</div>
<div class="mp-step"><span class="mp-n">3</span><b>Alerts</b>${alertsUI(p)}</div>
<div class="mp-hp" aria-hidden="true"><label>Leave this empty<input class="mp-web" type="text" name="website" tabindex="-1" autocomplete="off"></label></div><button class="mp-save mp-go" type="button">Email me a sign-in code</button><div class="mp-msg"></div>
<div class="mp-step mp-codebox" hidden><b>Enter the 6-digit code from the email</b><input class="mp-in mp-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="123456"><button class="mp-save mp-cgo" type="button">Sign in</button><p class="muted" style="margin:.4rem 0 0">Or tap the link in the email. Using the site from your home screen? Type the code here instead.</p></div>
<p class="mp-links"><a href="privacy.html#profiles">What we store</a></p>`);
    s.querySelector(".mp-go").onclick = async () => {
      const b = s.querySelector(".mp-go"), m = s.querySelector(".mp-msg"), email = s.querySelector(".mp-em").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.innerHTML = `<p class="mp-err">Enter a valid email address.</p>`; return; }
      b.disabled = true; b.textContent = "Sending…";
      try {
        const ret = location.origin + location.pathname;
        const r = await api("/auth/request", "POST", { email, profile: read(s), returnTo: ret, website: s.querySelector(".mp-web").value });
        track("link-requested", "Profile: sign-in link requested");
        m.innerHTML = `<p class="mp-ok">✓ Sign-in code sent to ${esc(email)}. It works for 15 minutes.</p>` +
          (r.preview ? `<p class="mp-prev"><b>Preview mode</b> (email sending not set up yet): code <b>${esc(r.code || "")}</b> or <a class="mp-plink" href="${esc(r.link)}">open your sign-in link</a></p>` : "");
        b.textContent = "Send a new code"; s.querySelector(".mp-codebox").hidden = false; s.querySelector(".mp-code").focus();
      } catch (e) {
        m.innerHTML = `<p class="${e.status === 429 ? "mp-wait" : "mp-err"}">${e.status === 429 ? "⏳ " : ""}${esc(e.message)}</p>`; b.textContent = "Email me a sign-in code";
        if (e.status === 429 && e.retryAfter) { // keep the button off until the wait is over
          let left = Math.min(e.retryAfter, 3600); const lbl = b.textContent;
          const t = setInterval(() => { if (--left <= 0 || !b.isConnected) { clearInterval(t); b.disabled = false; b.textContent = lbl; } else b.textContent = `Try again in ${left > 90 ? Math.ceil(left / 60) + " min" : left + "s"}`; }, 1000);
          return;
        }
      }
      b.disabled = false;
    };
    const ci = s.querySelector(".mp-code"), cb = s.querySelector(".mp-cgo");
    const submit = async () => {
      const m = s.querySelector(".mp-msg"), email = s.querySelector(".mp-em").value.trim(), code = ci.value.replace(/\D/g, "");
      if (code.length !== 6) { m.innerHTML = `<p class="mp-err">Enter the 6-digit code.</p>`; return; }
      cb.disabled = true;
      try { const r = await api("/auth/code", "POST", { email, code }); signedIn(r); close(); }
      catch (e) { m.innerHTML = `<p class="${e.status === 429 ? "mp-wait" : "mp-err"}">${e.status === 429 ? "⏳ " : ""}${esc(e.message)}</p>`; }
      cb.disabled = false;
    };
    cb.onclick = submit; ci.oninput = () => { if (ci.value.replace(/\D/g, "").length === 6) submit(); };
  }
  function signedIn(r) { saveAuth(r.session, r.profile); track("signin", "Profile: signed in"); refresh(); toast("You're signed in"); }

  function openProfile() {
    const p = Object.assign(blank(), get(KP) || memP || {});
    const s = sheet(`<h3>Your profile <button type="button" class="mp-x" aria-label="Close">✕</button></h3><p class="muted" style="margin:-.6rem 0 .4rem">${esc(p.email || "")}</p>
${interests(p)}<div style="border-top:1px solid var(--line);margin-top:1rem">${alertsUI(p)}</div>
<button class="mp-save mp-sv" type="button">Save</button><div class="mp-msg"></div>
<p class="mp-links"><a href="#" class="mp-out">Sign out</a><a href="#" class="mp-del">Delete my account</a></p>`);
    const m = s.querySelector(".mp-msg");
    s.querySelector(".mp-sv").onclick = async () => {
      try { const r = await api("/profile", "PUT", read(s)); saveAuth(r.session, r.profile); track("saved", "Profile: saved"); refresh(); close(); toast("Profile saved"); }
      catch (e) { m.innerHTML = `<p class="mp-err">${esc(e.message)}</p>`; if (!get(KP) && !memP) refresh(); }
    };
    s.querySelector(".mp-out").onclick = async e => { e.preventDefault(); try { await api("/auth/signout", "POST"); } catch (x) {} clearAuth(); track("signout", "Profile: signed out"); refresh(); close(); toast("Signed out"); };
    s.querySelector(".mp-del").onclick = async e => {
      e.preventDefault(); if (!confirm("Delete your profile and email address from our records? This can't be undone.")) return;
      try { await api("/account", "DELETE"); clearAuth(); track("deleted", "Profile: deleted"); refresh(); close(); toast("Account deleted"); }
      catch (x) { m.innerHTML = `<p class="mp-err">${esc(x.message)}</p>`; }
    };
  }

  function toast(msg) { const t = document.getElementById("toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }

  // ---- matching: uses the existing data fields only ----
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const T0 = new Date(), today = iso(T0), wkEnd = iso(new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + 6));
  const dfmt = s => { const d = new Date(s + "T12:00:00"); return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + (d.getMonth() + 1) + "/" + d.getDate(); };
  const norm = s => lc(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’`´]s\b/g, "").replace(/['’`´.]/g, "").replace(/\bsaint\b/g, "st").replace(/[^a-z0-9]+/g, " ").trim();
  const has = (list, val) => list.some(x => x && (norm(val).includes(norm(x)) || (x === "Classical" && /^(orchestral|choral)$/i.test(val))));
  const hour = t => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ""); return m ? (+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0) : 19; };
  const tkey = t => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ""); return m ? String((+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0)).padStart(2, "0") + m[2] : "99"; };
  function picks(p) {
    const out = [];
    if (pg === "concerts" && typeof CONCERTS !== "undefined") {
      const c = p.concerts; if (!c.genres.length && !c.venues.length && !c.artists.length) return out;
      CONCERTS.filter(e => e.date >= today && e.date <= wkEnd).forEach(e => {
        if (has(c.genres, e.genre) || has(c.venues, e.venue) || c.artists.some(a => { const na = norm(a); return na.length > 1 && norm(e.artist + " " + e.venue + " " + e.genre).includes(na); }))
          out.push([e.artist, dfmt(e.date) + " · " + e.time + " · " + e.venue, "show-" + GRICS.id(e), e.date + " " + tkey(e.time)]);
      });
      out.sort((x, y) => x[3] < y[3] ? -1 : x[3] > y[3] ? 1 : 0); // data isn't in date order: sort so same-day showtimes sit together
    } else if (pg === "sports" && typeof GAMES !== "undefined") {
      const s = p.sports; if (!s.teams.length && !s.gameTypes.length) return out;
      const first = {}; GAMES.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(g => { first[g.team] = first[g.team] || g.date; });
      GAMES.filter(g => g.date >= today && g.date <= wkEnd).forEach(g => {
        const dow = new Date(g.date + "T12:00:00").getDay(), h = hour(g.time);
        const types = { Weekend: dow === 0 || dow === 6 || (dow === 5 && h >= 17), Weeknight: dow >= 1 && dow <= 4 && h >= 17, Matinee: h < 17, "Home openers": first[g.team] === g.date };
        const teamOk = !s.teams.length || has(s.teams, g.team), typeOk = !s.gameTypes.length || s.gameTypes.some(t => types[t]);
        const hv = /^(vs\.|semifinal|championship|third-place|consolation)/i.test(g.opponent) || /\bvs\.\s/i.test(g.opponent);
        if (teamOk && typeOk) out.push([g.team.replace(/^(Grand Rapids|West Michigan) /, "") + (hv ? " — " : " vs. ") + g.opponent, dfmt(g.date) + " · " + g.time + " · " + g.venue, "game-" + GRICS.id({ date: g.date, artist: g.team + (hv ? " — " : " vs. ") + g.opponent, time: g.time })]);
      });
    } else if (pg === "seasonal" && typeof SEASONAL !== "undefined") {
      const t = p.seasonal.types; if (!t.length) return out;
      SEASONAL.filter(e => e.sort <= wkEnd && (e.end || e.sort) >= today && has(t, e.type)).forEach(e => out.push([e.name, e.when, "ev-" + GRICS.slug(e.sort + "-" + e.name)]));
    }
    return out;
  }

  function refresh() {
    const p = get(KP) || memP, signed = !!(p && p.email);
    pill.classList.toggle("mp-av", !!signed);
    pill.textContent = signed ? (p.email || "?")[0].toUpperCase() : "Sign in";
    pill.setAttribute("aria-label", signed ? "Your profile (" + p.email + ")" : "Sign in or create a profile");
    pill.onclick = signed ? openProfile : openSignup;
    if (strip) { strip.remove(); strip = null; }
    if (!signed || INFO) return;
    const list = picks(Object.assign(blank(), p)), main = document.querySelector("main"); if (!main) return;
    strip = document.createElement("details"); strip.className = "mp-strip";
    strip.innerHTML = list.length ? `<summary>★ ${list.length} pick${list.length === 1 ? "" : "s"} for you this week ▾</summary><ul>${list.map(e => `<li class="mp-pk"><a href="${PAGE}#${esc(e[2])}" data-id="${esc(e[2])}"><span><b>${esc(e[0])}</b>${esc(e[1])}</span><i aria-hidden="true">›</i></a></li>`).join("")}</ul>`
      : `<summary>★ No picks for you this week. <a href="#" class="mp-edit">Edit interests</a></summary>`;
    main.prepend(strip);
    strip.querySelectorAll(".mp-pk a").forEach(a => a.onclick = e => {
      if (window.GRPane && GRPane.openId(a.dataset.id)) { e.preventDefault(); strip.open = false; track("pick-open", "Profile: pick tapped"); return; }
      const c = document.getElementById(a.dataset.id); if (!c) return; // not rendered here (other page / filtered): follow the link
      e.preventDefault(); strip.open = false; track("pick-open", "Profile: pick tapped");
      history.replaceState(null, "", "#" + a.dataset.id); focusCard(c);
    });
    const ed = strip.querySelector(".mp-edit"); if (ed) ed.onclick = e => { e.preventDefault(); openProfile(); };
  }

  const PAGE = { concerts: "index.html", sports: "sports.html", seasonal: "seasonal.html" }[pg];
  // scroll a card into view, flash it, and move keyboard focus to it
  function focusCard(c) {
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    c.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "center" });
    if (!c.hasAttribute("tabindex")) c.setAttribute("tabindex", "-1");
    c.focus({ preventScroll: true });
    c.classList.remove("mp-hl"); void c.offsetWidth; c.classList.add("mp-hl");
    clearTimeout(focusCard.t); focusCard.t = setTimeout(() => c.classList.remove("mp-hl"), 2600);
  }
  // arriving via page.html#card-id (e.g. a pick link from another page): highlight once the cards are rendered
  if (/^#(show|game|ev|note)-/.test(location.hash)) setTimeout(() => {
    const id = location.hash.slice(1);
    if (window.GRPane && GRPane.openId(id)) return;
    const c = document.getElementById(id); if (c) focusCard(c);
  }, 150);

  async function syncAuth() {
    let lsS = get(KS) || memS, lsP = get(KP) || memP;
    if (!lsS || !lsP) {
      const [idbS, idbP] = await Promise.all([idbGet(KS), idbGet(KP)]);
      if (!lsS && idbS) { lsS = idbS; memS = idbS; put(KS, idbS); }
      if (!lsP && idbP) { lsP = idbP; memP = idbP; put(KP, idbP); refresh(); }
    } else {
      idbPut(KS, lsS); idbPut(KP, lsP);
    }
    if (!FP && !lsS && !lsP) return;
    try {
      const r = await api("/profile");
      if (r && r.profile) { saveAuth(r.session || lsS, r.profile); refresh(); }
    } catch (e) {
      if (e && e.status === 401 && !e.viaFallback) {
        const idbS = await idbGet(KS);
        if (idbS && idbS !== lsS) {
          try {
            const r2 = await api("/profile", "GET", null, idbS);
            if (r2 && r2.profile) { saveAuth(r2.session || idbS, r2.profile); refresh(); return; }
          } catch (e2) {
            if (!e2 || e2.status !== 401 || e2.viaFallback) return;
          }
        }
        clearAuth(); refresh();
      }
    }
  }

  async function boot() {
    refresh();
    const q = new URLSearchParams(location.search), tok = q.get("signin");
    if (tok) {
      q.delete("signin"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
      try { signedIn(await api("/auth/verify", "POST", { token: tok })); return; }
      catch (e) { toast(e.message); }
    }
    await syncAuth();
  }
  boot();
  addEventListener("pageshow", e => { if (e.persisted) syncAuth(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && (!get(KS) || !get(KP))) syncAuth(); });
})();
