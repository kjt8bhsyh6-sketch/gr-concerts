/* Visitor profiles: sign in by emailed link, pick interests, see "picks for you this week".
   Backend: Cloudflare Worker grh-profiles (see EDITING.md). Session token kept in localStorage "grh-session". */
(function () {
  const API = "https://grh-profiles.grhappenings.workers.dev";
  const KS = "grh-session", KP = "grh-profile";
  const hdr = document.querySelector("body > header, header"); if (!hdr) return;
  const INFO = /privacy|terms/.test(location.pathname);
  const pg = /sports/.test(location.pathname) ? "sports" : /seasonal/.test(location.pathname) ? "seasonal" : "concerts";
  const OPT = {
    genres: ["Rock", "Indie", "Comedy", "Country", "Folk", "Punk", "Metal", "Electronic", "Hip-Hop", "Jazz", "Classical", "Musical"],
    venues: ["Pyramid Scheme", "Intersection", "GLC Live", "Van Andel", "DeVos", "Wealthy Theatre", "Dr. Grins", "St. Cecilia", "Civic Theatre", "Big Room"],
    teams: ["Griffins", "Gold", "Rise", "Whitecaps", "AC Grand Rapids"],
    gameTypes: ["Weekend", "Weeknight", "Matinee", "Home openers"],
    types: ["Holiday Lights", "Christmas Market", "Holiday Market", "Holiday Parade", "Holiday Exhibit", "Ghost Tour"],
  };
  const FREQ = [["weekly", "Weekly"], ["daily", "Daily"], ["announced", "Just announced"]];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lc = s => String(s || "").toLowerCase();
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const blank = () => ({ concerts: { genres: [], venues: [], artists: [] }, sports: { teams: [], gameTypes: [] }, seasonal: { types: [] }, alerts: { on: false, freq: "weekly" } });
  const track = (p, t) => { try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: "profile/" + p, title: t || p, event: true }); } catch (e) {} };

  async function api(path, method, body) {
    const s = get(KS), h = { "Content-Type": "application/json" };
    if (s) h.Authorization = "Bearer " + s;
    const r = await fetch(API + path, { method: method || "GET", headers: h, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { put(KS, null); put(KP, null); }
    if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
    return j;
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
header{position:relative}
.mp-pill{position:absolute;top:10px;right:10px;margin:0;min-height:40px;padding:.36rem .96rem;border-radius:99px;font-size:.96rem;font-weight:600;line-height:1.2;background:#fff;border:1px solid var(--line);color:var(--text);cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap}
.mp-pill:hover{filter:brightness(.95)}
.mp-pill.mp-av{width:42px;height:42px;min-height:42px;padding:0;font-weight:700;font-size:1.15rem;background:var(--accent);color:#fff;border-color:#fff}
@media (max-width:640px){header.mp-has{padding-top:3.7rem}}
.mp-back{position:fixed;inset:0;background:#0006;z-index:50}.mp-sheet{position:fixed;left:0;right:0;bottom:0;max-width:640px;margin:0 auto;background:#fff;border-radius:18px 18px 0 0;padding:1rem 1.2rem 1.4rem;z-index:51;max-height:88vh;overflow:auto;box-shadow:0 -4px 20px #0002}
.mp-sheet h3{margin:.2rem 0 1rem;font-size:1.15rem;display:flex;justify-content:space-between;align-items:center}.mp-x{background:none;border:0;min-height:0;padding:0;font-size:1.3rem;cursor:pointer}
.mp-l{font-size:.8rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:1rem 0 .4rem}.mp-h{font-weight:700;margin:.9rem 0 0}
.mp-c{display:inline-block;padding:.35rem .75rem;margin:0 .3rem .4rem 0;border:1px solid var(--line);border-radius:99px;font-size:.88rem;background:#fff;color:var(--text);min-height:0;cursor:pointer}.mp-c.on{background:var(--accent);border-color:var(--accent);color:#fff}
details.mp-d{border-top:1px solid var(--line);margin-top:1rem;padding-top:.7rem}details.mp-d summary{font-weight:600;font-size:.92rem;cursor:pointer}
.mp-in{font:inherit;width:100%;box-sizing:border-box;padding:.45rem;border:1px solid var(--line);border-radius:8px;margin-top:.5rem}
.mp-step{border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;margin:.7rem 0}.mp-n{display:inline-block;width:1.4rem;height:1.4rem;border-radius:99px;background:var(--accent);color:#fff;text-align:center;font-size:.8rem;line-height:1.4rem;margin-right:.4rem}
.mp-ok{color:var(--new);font-size:.85rem;margin:.5rem 0 0}.mp-err{color:#b91c1c;font-size:.85rem;margin:.5rem 0 0}.mp-prev{font-size:.8rem;background:#fffbea;border:1px dashed #e7b900;border-radius:8px;padding:.5rem;margin:.5rem 0 0;word-break:break-all}
.mp-sw{float:right;width:2.6rem;height:1.5rem;border-radius:99px;background:#ccc;position:relative;border:0;padding:0;min-height:0;cursor:pointer}.mp-sw.on{background:var(--new)}.mp-sw:after{content:"";position:absolute;left:3px;top:3px;width:1.1rem;height:1.1rem;border-radius:99px;background:#fff;transition:left .15s}.mp-sw.on:after{left:calc(100% - 1.1rem - 3px)}
.mp-off .mp-c{opacity:.45}.mp-save{display:flex;justify-content:center;width:100%;margin-top:1.2rem}.mp-links{text-align:center;margin:.8rem 0 0;font-size:.85rem}.mp-links a{margin:0 .6rem}
.mp-strip{margin:0 0 1rem;border:1px solid #e7b900;background:#fffbea;border-radius:10px}.mp-strip summary{padding:.55rem .9rem;font-weight:600;font-size:.92rem;cursor:pointer;list-style:none}
.mp-strip ul{margin:0;padding:0 .9rem .6rem;list-style:none}.mp-strip li{padding:.4rem 0;border-top:1px solid #f0e2a8;font-size:.9rem}.mp-strip li span{display:block;color:var(--muted);font-size:.8rem}.mp-strip a{color:inherit}
</style>`);

  const pill = document.createElement("button"); pill.type = "button"; pill.className = "mp-pill"; hdr.classList.add("mp-has"); hdr.appendChild(pill);
  let strip = null;

  function close() { document.querySelectorAll(".mp-back,.mp-sheet").forEach(e => e.remove()); }
  function sheet(html) {
    close();
    document.body.insertAdjacentHTML("beforeend", `<div class="mp-back"></div><div class="mp-sheet" role="dialog" aria-modal="true">${html}</div>`);
    const s = document.querySelector(".mp-sheet");
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
<button class="mp-save mp-go" type="button">Email me a sign-in link</button><div class="mp-msg"></div>
<p class="mp-links"><a href="privacy.html#profiles">What we store</a></p>`);
    s.querySelector(".mp-go").onclick = async () => {
      const b = s.querySelector(".mp-go"), m = s.querySelector(".mp-msg"), email = s.querySelector(".mp-em").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.innerHTML = `<p class="mp-err">Enter a valid email address.</p>`; return; }
      b.disabled = true; b.textContent = "Sending…";
      try {
        const ret = location.origin + location.pathname;
        const r = await api("/auth/request", "POST", { email, profile: read(s), returnTo: ret });
        track("link-requested", "Profile: sign-in link requested");
        m.innerHTML = `<p class="mp-ok">✓ Sign-in link sent to ${esc(email)}. It works for 15 minutes.</p>` +
          (r.preview ? `<p class="mp-prev"><b>Preview mode</b> (email sending not set up yet): <a class="mp-plink" href="${esc(r.link)}">open your sign-in link</a></p>` : "");
        b.textContent = "Send again";
      } catch (e) { m.innerHTML = `<p class="mp-err">${esc(e.message)}</p>`; b.textContent = "Email me a sign-in link"; }
      b.disabled = false;
    };
  }

  function openProfile() {
    const p = Object.assign(blank(), get(KP) || {});
    const s = sheet(`<h3>Your profile <button type="button" class="mp-x" aria-label="Close">✕</button></h3><p class="muted" style="margin:-.6rem 0 .4rem">${esc(p.email || "")}</p>
${interests(p)}<div style="border-top:1px solid var(--line);margin-top:1rem">${alertsUI(p)}</div>
<button class="mp-save mp-sv" type="button">Save</button><div class="mp-msg"></div>
<p class="mp-links"><a href="#" class="mp-out">Sign out</a><a href="#" class="mp-del">Delete my account</a></p>`);
    const m = s.querySelector(".mp-msg");
    s.querySelector(".mp-sv").onclick = async () => {
      try { const r = await api("/profile", "PUT", read(s)); put(KP, r.profile); track("saved", "Profile: saved"); refresh(); close(); toast("Profile saved"); }
      catch (e) { m.innerHTML = `<p class="mp-err">${esc(e.message)}</p>`; if (!get(KS)) refresh(); }
    };
    s.querySelector(".mp-out").onclick = async e => { e.preventDefault(); try { await api("/auth/signout", "POST"); } catch (x) {} put(KS, null); put(KP, null); track("signout", "Profile: signed out"); refresh(); close(); toast("Signed out"); };
    s.querySelector(".mp-del").onclick = async e => {
      e.preventDefault(); if (!confirm("Delete your profile and email address from our records? This can't be undone.")) return;
      try { await api("/account", "DELETE"); put(KS, null); put(KP, null); track("deleted", "Profile: deleted"); refresh(); close(); toast("Account deleted"); }
      catch (x) { m.innerHTML = `<p class="mp-err">${esc(x.message)}</p>`; }
    };
  }

  function toast(msg) { const t = document.getElementById("toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }

  // ---- matching: uses the existing data fields only ----
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const T0 = new Date(), today = iso(T0), wkEnd = iso(new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + 6));
  const dfmt = s => { const d = new Date(s + "T12:00:00"); return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + (d.getMonth() + 1) + "/" + d.getDate(); };
  const has = (list, val) => list.some(x => lc(val).includes(lc(x)) && x);
  const hour = t => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ""); return m ? (+m[1] % 12) + (/PM/i.test(m[3]) ? 12 : 0) : 19; };
  function picks(p) {
    const out = [];
    if (pg === "concerts" && typeof CONCERTS !== "undefined") {
      const c = p.concerts; if (!c.genres.length && !c.venues.length && !c.artists.length) return out;
      CONCERTS.filter(e => e.date >= today && e.date <= wkEnd).forEach(e => {
        if (has(c.genres, e.genre) || has(c.venues, e.venue) || c.artists.some(a => a.length > 1 && lc(e.artist).includes(lc(a))))
          out.push([e.artist, dfmt(e.date) + " · " + e.time + " · " + e.venue]);
      });
    } else if (pg === "sports" && typeof GAMES !== "undefined") {
      const s = p.sports; if (!s.teams.length && !s.gameTypes.length) return out;
      const first = {}; GAMES.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(g => { first[g.team] = first[g.team] || g.date; });
      GAMES.filter(g => g.date >= today && g.date <= wkEnd).forEach(g => {
        const dow = new Date(g.date + "T12:00:00").getDay(), h = hour(g.time);
        const types = { Weekend: dow === 0 || dow === 6 || (dow === 5 && h >= 17), Weeknight: dow >= 1 && dow <= 4 && h >= 17, Matinee: h < 17, "Home openers": first[g.team] === g.date };
        const teamOk = !s.teams.length || has(s.teams, g.team), typeOk = !s.gameTypes.length || s.gameTypes.some(t => types[t]);
        if (teamOk && typeOk) out.push([g.team.replace(/^(Grand Rapids|West Michigan) /, "") + " vs. " + g.opponent, dfmt(g.date) + " · " + g.time + " · " + g.venue]);
      });
    } else if (pg === "seasonal" && typeof SEASONAL !== "undefined") {
      const t = p.seasonal.types; if (!t.length) return out;
      SEASONAL.filter(e => e.sort <= wkEnd && (e.end || e.sort) >= today && has(t, e.type)).forEach(e => out.push([e.name, e.when]));
    }
    return out;
  }

  function refresh() {
    const p = get(KP), signed = !!get(KS) && p;
    pill.classList.toggle("mp-av", !!signed);
    pill.textContent = signed ? (p.email || "?")[0].toUpperCase() : "Sign in / Create profile";
    pill.setAttribute("aria-label", signed ? "Your profile (" + p.email + ")" : "Sign in or create a profile");
    pill.onclick = signed ? openProfile : openSignup;
    if (strip) { strip.remove(); strip = null; }
    if (!signed || INFO) return;
    const list = picks(Object.assign(blank(), p)), main = document.querySelector("main"); if (!main) return;
    strip = document.createElement("details"); strip.className = "mp-strip";
    strip.innerHTML = list.length ? `<summary>★ ${list.length} pick${list.length === 1 ? "" : "s"} for you this week ▾</summary><ul>${list.slice(0, 12).map(e => `<li>${esc(e[0])}<span>${esc(e[1])}</span></li>`).join("")}</ul>`
      : `<summary>★ No picks for you this week. <a href="#" class="mp-edit">Edit interests</a></summary>`;
    main.prepend(strip);
    const ed = strip.querySelector(".mp-edit"); if (ed) ed.onclick = e => { e.preventDefault(); openProfile(); };
  }

  async function boot() {
    const q = new URLSearchParams(location.search), tok = q.get("signin");
    if (tok) {
      q.delete("signin"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
      try { const r = await api("/auth/verify", "POST", { token: tok }); put(KS, r.session); put(KP, r.profile); track("signin", "Profile: signed in"); toast("You're signed in"); }
      catch (e) { toast(e.message); }
    } else if (get(KS)) {
      api("/profile").then(r => { put(KP, r.profile); refresh(); }).catch(() => refresh());
    }
    refresh();
  }
  boot();
})();
