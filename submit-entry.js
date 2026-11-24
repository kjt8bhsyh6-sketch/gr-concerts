// Shows the "Know a show we missed?" block and the footer link when CONFIG.SHOW_SUBMIT_EVENT is true.
// Both stay hidden when the flag is missing or false, which is how production keeps them off.
(function () {
  var C = (typeof CONFIG !== "undefined" && CONFIG) || {};
  if (!C.SHOW_SUBMIT_EVENT) return;
  var section = document.getElementById("submit");
  if (section) section.hidden = false;
  var link = document.getElementById("submit-link");
  if (link) {
    link.href = "submit.html";
    link.removeAttribute("target");
    link.removeAttribute("rel");
  }
  var foot = document.getElementById("foot-submit");
  if (foot) foot.hidden = false;
})();
