// Submit-an-event form. Posts JSON to CONFIG.SUBMIT_API_URL. Does not publish a listing.
(function () {
  var C = (typeof CONFIG !== "undefined" && CONFIG) || {};
  var form = document.getElementById("submit-form");
  var closed = document.getElementById("submit-closed");
  var intro = document.getElementById("submit-intro");
  if (!form) return;

  if (!C.SHOW_SUBMIT_EVENT || !C.SUBMIT_API_URL || !C.TURNSTILE_SITEKEY) {
    form.hidden = true;
    if (intro) intro.hidden = true;
    if (closed) closed.hidden = false;
    return;
  }

  var venue = document.getElementById("venue");
  var otherWrap = document.getElementById("venue-other-wrap");
  var otherInput = document.getElementById("venue-other");
  var otherOpt = venue.querySelector('option[value="__other__"]');
  var names = (typeof VENUES !== "undefined" && VENUES) ? Object.keys(VENUES) : [];
  names.sort(function (a, b) { return a.localeCompare(b, "en", { sensitivity: "base" }); });
  names.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    venue.insertBefore(opt, otherOpt);
  });

  function syncVenue() {
    var on = venue.value === "__other__";
    otherWrap.hidden = !on;
    venue.setAttribute("aria-expanded", on ? "true" : "false");
    otherInput.required = on;
    if (!on) {
      otherInput.value = "";
      clearField(otherInput, "err-venue-other");
    }
  }
  venue.addEventListener("change", syncVenue);
  syncVenue();

  var priceInput = document.getElementById("price");
  function syncPrice() {
    var paid = document.querySelector('input[name="price_type"]:checked').value === "paid";
    priceInput.disabled = !paid;
    if (!paid) priceInput.value = "";
  }
  document.querySelectorAll('input[name="price_type"]').forEach(function (r) {
    r.addEventListener("change", syncPrice);
  });
  syncPrice();

  var token = "";
  var widgetId = null;
  var retry = document.getElementById("turnstile-retry");
  var slot = document.getElementById("cf-turnstile");

  function turnstileError(message) {
    var el = document.getElementById("err-turnstile");
    if (message) {
      el.hidden = false;
      el.textContent = message;
      retry.hidden = false;
      slot.setAttribute("aria-invalid", "true");
      document.getElementById("turnstile-group").setAttribute("aria-describedby", "err-turnstile");
    } else {
      el.hidden = true;
      el.textContent = "";
      retry.hidden = true;
      slot.removeAttribute("aria-invalid");
      document.getElementById("turnstile-group").removeAttribute("aria-describedby");
    }
  }

  window.grhTurnstileLoad = function () {
    if (!window.turnstile || widgetId !== null) return;
    var narrow = window.matchMedia("(max-width: 380px)").matches;
    widgetId = window.turnstile.render("#cf-turnstile", {
      sitekey: C.TURNSTILE_SITEKEY,
      size: narrow ? "compact" : "normal",
      theme: "light",
      callback: function (value) {
        token = value || "";
        turnstileError("");
      },
      "expired-callback": function () {
        token = "";
        turnstileError("The spam check expired. Try it again.");
      },
      "error-callback": function () {
        token = "";
        turnstileError("The spam check didn't finish. Try it again.");
      }
    });
  };

  retry.addEventListener("click", function () {
    token = "";
    if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
  });

  var script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=grhTurnstileLoad";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  function clearField(input, errId) {
    var el = document.getElementById(errId);
    input.removeAttribute("aria-invalid");
    el.hidden = true;
    el.textContent = "";
    var field = input.closest(".field");
    if (field) field.classList.remove("invalid");
    var hint = input.getAttribute("data-hint");
    if (hint) input.setAttribute("aria-describedby", hint);
    else input.removeAttribute("aria-describedby");
  }

  function markField(input, errId, message) {
    var el = document.getElementById(errId);
    input.setAttribute("aria-invalid", "true");
    el.hidden = false;
    el.textContent = message;
    var field = input.closest(".field");
    if (field) field.classList.add("invalid");
    var hint = input.getAttribute("data-hint");
    input.setAttribute("aria-describedby", hint ? hint + " " + errId : errId);
  }

  function httpUrl(value) {
    try {
      var u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function emailOk(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  var summary = document.getElementById("form-summary");

  function showSummary(title, text) {
    document.getElementById("form-summary-title").textContent = title;
    document.getElementById("form-summary-text").textContent = text;
    summary.hidden = false;
    summary.scrollIntoView({ block: "nearest", behavior: "auto" });
  }

  function hideSummary() {
    summary.hidden = true;
    document.getElementById("form-summary-title").textContent = "";
    document.getElementById("form-summary-text").textContent = "";
  }

  var fields = {
    event: document.getElementById("event-name"),
    venue: venue,
    venueOther: otherInput,
    date: document.getElementById("date"),
    time: document.getElementById("time"),
    source: document.getElementById("source"),
    genre: document.getElementById("genre"),
    name: document.getElementById("submitter-name"),
    email: document.getElementById("submitter-email")
  };

  function validate() {
    var errors = [];
    function bad(input, errId, message) {
      markField(input, errId, message);
      errors.push(errId);
    }
    function ok(input, errId) { clearField(input, errId); }

    if (!fields.event.value.trim()) bad(fields.event, "err-event", "Enter the name of the show.");
    else ok(fields.event, "err-event");

    if (!fields.venue.value) bad(fields.venue, "err-venue", "Choose a venue, or Other / new venue.");
    else ok(fields.venue, "err-venue");

    if (fields.venue.value === "__other__") {
      if (!fields.venueOther.value.trim()) bad(fields.venueOther, "err-venue-other", "Enter the venue name.");
      else ok(fields.venueOther, "err-venue-other");
    } else ok(fields.venueOther, "err-venue-other");

    if (!fields.date.value) bad(fields.date, "err-date", "Enter the date of the show.");
    else ok(fields.date, "err-date");

    if (!fields.time.value) bad(fields.time, "err-time", "Enter the start time. Times are Eastern (America/Detroit).");
    else ok(fields.time, "err-time");

    var source = fields.source.value.trim();
    var sourceEmpty = !source;
    var sourceBad = false;
    if (!source) {
      bad(fields.source, "err-link", "Add a link to the venue or promoter page that lists this show. We verify every submission against a live source.");
      sourceBad = true;
    } else if (!httpUrl(source)) {
      bad(fields.source, "err-link", "Enter a full link that starts with http:// or https://.");
      sourceBad = true;
    } else ok(fields.source, "err-link");

    if (!fields.genre.value) bad(fields.genre, "err-genre", "Choose a genre.");
    else ok(fields.genre, "err-genre");

    if (!fields.name.value.trim()) bad(fields.name, "err-name", "Enter your name.");
    else ok(fields.name, "err-name");

    var emailBad = !emailOk(fields.email.value.trim());
    if (emailBad) bad(fields.email, "err-email", "Enter a valid email (for example name@example.com) so we can ask a follow-up if needed.");
    else ok(fields.email, "err-email");

    if (!token) {
      turnstileError("The spam check didn't finish. Try it again.");
      errors.push("err-turnstile");
    } else turnstileError("");

    if (!errors.length) {
      hideSummary();
      return true;
    }
    var text = "Your other answers are still here.";
    if (errors.length === 2 && sourceEmpty && emailBad) {
      text = "We need a primary-source link and a valid email. Your other answers are still here.";
    } else if (sourceBad && emailBad && errors.length === 2) {
      text = "We need a primary-source link and a valid email. Your other answers are still here.";
    }
    showSummary("Fix " + errors.length + (errors.length === 1 ? " item" : " items") + " before submitting", text);
    return false;
  }

  function showSuccess() {
    var status = document.getElementById("submit-status");
    if (intro) intro.hidden = true;
    form.hidden = true;
    status.hidden = false;
    status.innerHTML = '<div class="check" aria-hidden="true">\u2713</div>'
      + "<h3>Thanks \u2014 we review every submission before it goes live.</h3>"
      + "<p>Nothing auto-publishes. If we can verify the show on a live primary source, it will appear on Grand Rapids Happenings after our next update. We may email you if we have a question.</p>"
      + '<p class="form-actions"><a class="btn" href="index.html">Back to concerts</a> <a class="btn ghost" href="submit.html">Submit another</a></p>';
    // The form (and the focused Submit button) is now hidden, so move focus to the message instead of losing it to <body>.
    status.setAttribute("tabindex", "-1");
    status.focus();
  }

  var button = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (button.disabled) return;
    if (!validate()) return;
    button.disabled = true;
    var priceType = document.querySelector('input[name="price_type"]:checked').value;
    var body = {
      event: fields.event.value.trim(),
      venue: fields.venue.value,
      venueOther: fields.venue.value === "__other__" ? fields.venueOther.value.trim() : "",
      date: fields.date.value,
      time: fields.time.value,
      source: fields.source.value.trim(),
      genre: fields.genre.value,
      priceType: priceType,
      price: priceType === "paid" ? priceInput.value.trim() : "",
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      turnstileToken: token
    };
    fetch(C.SUBMIT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        showSuccess();
        return;
      }
      var message = (result.data && result.data.error) || "We couldn't save this submission. Nothing was posted. Please try again in a moment.";
      if (result.status === 400 && /spam check/i.test(message)) turnstileError(message);
      if (message.indexOf("Nothing was posted") === -1) message += " Nothing was posted. Your answers are still here.";
      showSummary("Not saved", message);
      button.disabled = false;
      if (window.turnstile && widgetId !== null) {
        token = "";
        window.turnstile.reset(widgetId);
      }
    }).catch(function () {
      showSummary("Not saved", "We couldn't save this submission. Nothing was posted. Please try again in a moment.");
      button.disabled = false;
    });
  });
})();
