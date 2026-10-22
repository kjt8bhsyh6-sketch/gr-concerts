// Map links (📍 Google Maps / Apple Maps on every card). Safe to edit.
// VENUES: optional street addresses for venues whose names search poorly. Key = the venue/location text exactly as in
// concerts.js / sports.js / seasonal.js. Only add addresses checked on the venue's own website. Anything not listed
// is searched by name + ", Grand Rapids, MI" (unless the text already names a city or MI).
const VENUES = {
  "Van Andel Arena": "130 W Fulton St, Grand Rapids, MI 49503",               // vanandelarena.com footer
  "DeVos Performance Hall": "303 Monroe Ave NW, Grand Rapids, MI 49503",      // devosperformancehall.com
  "GLC Live at 20 Monroe": "11 Ottawa Ave NW, Grand Rapids, MI 49503",        // glcliveat20monroe.com
  "The Pyramid Scheme": "68 Commerce Dr SW, Grand Rapids, MI 49503",          // pyramidschemebar.com
  "Frederik Meijer Gardens & Sculpture Park": "1000 E Beltline Ave NE, Grand Rapids, MI 49525", // meijergardens.org
  "St. Cecilia Music Center": "24 Ransom Ave NE, Grand Rapids, MI 49503",     // scmc-online.org
  "Speciation Artisan Ales": "928 Wealthy St SE, Grand Rapids, MI 49506",     // speciationartisanales.com
  "Midtown GR (at Studio Park)": "123 Ionia Ave SW, Grand Rapids, MI 49503",  // themidtowngr.com
  "Calvin University Chapel": "3201 Burton St SE, Grand Rapids, MI 49546",    // calvin.edu/arts
  "Wealthy Theatre": "1130 Wealthy St SE, Grand Rapids, MI 49506",            // grcmc.org/wealthy-theatre
  "Grand Rapids Civic Theatre": "30 Division Ave N, Grand Rapids, MI 49503",  // grct.org
  "Dr. Grins (at The B.O.B.)": "20 Monroe Ave NW, Grand Rapids, MI 49503",    // thebob.com
  "Acrisure Amphitheater": "201 Market Ave SW, Grand Rapids, MI 49503",       // acrisureamphitheater.com
};
(function (root) {
  const NEAR = /\b(MI|Michigan|Grand Rapids|Grandville|Walker|Wyoming|Kentwood|Ada|Comstock Park|Rockford|Lowell|Allendale|Jenison|Hudsonville|Cascade|East Grand Rapids|Byron Center|Caledonia|Holland|Zeeland|Sparta|Cedar Springs|Belmont|Standale|Coopersville|Grand Haven)\b/;
  function query(name) {
    name = String(name || '').trim();
    const V = (typeof VENUES !== 'undefined' && VENUES) || {};
    if (V[name]) return name.replace(/\s*\(.*?\)\s*/g, ' ').trim() + ', ' + V[name];
    // "Elevation (at The Intersection)" -> "The Intersection"; other notes like "(main room)" dropped
    const at = /\(at ([^)]+)\)/i.exec(name); let q = at ? at[1] : name.replace(/\s*\([^)]*\)/g, '').trim();
    return NEAR.test(q) ? q : q + ', Grand Rapids, MI';
  }
  const google = n => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query(n));
  const apple = n => 'https://maps.apple.com/?q=' + encodeURIComponent(query(n));
  const h = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const buttons = n => `<a class="b map" href="${h(google(n))}" target="_blank" rel="noopener">📍 Google Maps</a><a class="b map" href="${h(apple(n))}" target="_blank" rel="noopener">📍 Apple Maps</a>`;
  const api = { query, google, apple, buttons };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GRMAP = api;
})(this);
