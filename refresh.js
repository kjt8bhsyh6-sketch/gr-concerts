/* GR Happenings: refresh for home-screen (standalone) mode.
   - Header refresh button (all pages), pull-to-refresh at top of page, auto-reload after ~10 min hidden.
   - Fresh data: the HTML is re-fetched with cache:'reload' (bypasses the HTTP cache) before
     location.reload(); the new HTML carries new ?v= stamps, so updated data .js files load fresh.
   - Never touches localStorage or cookies (sign-in persists). External file: CSP-safe. */
(function () {
  "use strict";
  var STALE_MS = 10 * 60 * 1000, PULL_MAX = 110, PULL_TRIGGER = 70;
  var busy = false, hiddenAt = null, loadedAt = Date.now();

  function hardRefresh() {
    if (busy) return; busy = true;
    document.documentElement.classList.add("grh-refreshing");
    var done = function () { location.reload(); };
    try {
      var t = setTimeout(done, 4000); // never hang on a slow network
      fetch(location.href, { cache: "reload", credentials: "same-origin" })
        .then(function () { clearTimeout(t); done(); }, function () { clearTimeout(t); done(); });
    } catch (e) { done(); }
  }
  window.grhRefresh = hardRefresh;

  // Pull indicator (also used as spinner during refresh)
  var ind = document.createElement("div");
  ind.className = "ptr"; ind.setAttribute("aria-hidden", "true");
  ind.innerHTML = '<span class="ptr-spin"></span>';

  function addButton() {
    var h = document.querySelector("header");
    if (!h || h.querySelector(".refresh-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "refresh-btn";
    b.setAttribute("aria-label", "Refresh listings"); b.title = "Refresh listings";
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    b.addEventListener("click", hardRefresh);
    h.appendChild(b);
    document.body.appendChild(ind);
  }

  // Pull-to-refresh (touch only; only engages when already at the very top and pulling down)
  var startY = null, startX = 0, dist = 0, pulling = false;
  function top() { return (window.scrollY || document.documentElement.scrollTop || 0) <= 0; }
  function setPull(d) {
    ind.style.transform = "translate(-50%," + (d - 50) + "px) rotate(" + (d * 3) + "deg)";
    ind.style.opacity = Math.min(1, d / PULL_TRIGGER);
    ind.classList.toggle("ready", d >= PULL_TRIGGER);
  }
  function modalOpen() {
    var m = document.querySelectorAll("dialog[open], [aria-modal=true]");
    for (var i = 0; i < m.length; i++) if (m[i].getClientRects().length && getComputedStyle(m[i]).visibility !== "hidden") return true;
    return false;
  }
  document.addEventListener("touchstart", function (e) {
    if (busy || e.touches.length !== 1 || !top() || modalOpen()) { startY = null; return; }
    startY = e.touches[0].clientY; startX = e.touches[0].clientX; dist = 0; pulling = false;
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (startY === null) return;
    var dy = e.touches[0].clientY - startY, dx = Math.abs(e.touches[0].clientX - startX);
    if (!pulling) {
      if (dy > 8 && dy > dx && top()) { pulling = true; ind.classList.add("show"); }
      else if (dy < 0 || dx > 10) { startY = null; return; }
      else return;
    }
    dist = Math.min(PULL_MAX, Math.max(0, dy * 0.5));
    if (e.cancelable) e.preventDefault(); // stop iOS rubber-band only while pulling
    setPull(dist);
  }, { passive: false });
  function end() {
    if (startY === null) return;
    startY = null;
    if (!pulling) return;
    pulling = false;
    if (dist >= PULL_TRIGGER) { setPull(PULL_TRIGGER); ind.classList.add("spin"); hardRefresh(); }
    else { ind.classList.remove("show", "ready"); ind.style.opacity = 0; }
  }
  document.addEventListener("touchend", end, { passive: true });
  document.addEventListener("touchcancel", end, { passive: true });

  // Auto-refresh after being hidden > 10 minutes (app switch, bfcache restore)
  function maybeStale() {
    var since = hiddenAt || loadedAt;
    if (Date.now() - since > STALE_MS) hardRefresh();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else { maybeStale(); hiddenAt = null; }
  });
  window.addEventListener("pagehide", function () { hiddenAt = Date.now(); });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { busy = false; document.documentElement.classList.remove("grh-refreshing"); maybeStale(); hiddenAt = null; }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton);
  else addButton();
})();
