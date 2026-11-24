// ===== SITE SETTINGS — safe to edit =====
// Leave a value as "" to keep that feature hidden on the site.
const CONFIG = {
  SITE_URL: "https://kjt8bhsyh6-sketch.github.io/gr-concerts/",
  NEW_DAYS: 7,              // how many days a show counts as NEW
  JUST_ANNOUNCED_MAX: 8,    // how many items in the Just Announced box
  // Submit an event (dedicated submit.html). false hides the entry points.
  // This staging branch turns it on. Production (main) must keep the flag false,
  // SUBMIT_API_URL "", and TURNSTILE_SITEKEY "" until Bill says to ship.
  SHOW_SUBMIT_EVENT: true,
  // Account subdomain is the one already serving grh-profiles.grhappenings.workers.dev.
  // The staging Worker (grh-profiles-staging) is not deployed by this change.
  STAGING_WORKER_HOST: "grh-profiles-staging.grhappenings.workers.dev",
  SUBMIT_API_URL: "https://grh-profiles-staging.grhappenings.workers.dev/submit-event",
  // Cloudflare's documented test sitekey. Always passes. Visible widget.
  TURNSTILE_SITEKEY: "1x00000000000000000000AA",
  // Comments (giscus): fill all four from https://giscus.app to show comments.
  GISCUS: { repo: "", repoId: "", category: "", categoryId: "" },
  // Viator Selector mcid for partner P00330732. Empty hides Things to do.
  // Do not put a sample or guessed value here. 42383 is a public example, not ours.
  VIATOR_MCID: "",
};
