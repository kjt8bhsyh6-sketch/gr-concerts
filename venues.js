// Map links (📍 Google Maps / Apple Maps on every card). Safe to edit.
// VENUES: verified street addresses for venues and seasonal locations across concerts.js, sports.js, and seasonal.js.
// Key = the venue/location text exactly as in concerts.js / sports.js / seasonal.js.
// Anything not listed is searched by name + ", Grand Rapids, MI" (unless the text already names a city or MI).
const VENUES = {
  // Concert & Sports venues
  "Van Andel Arena": "130 W Fulton St, Grand Rapids, MI 49503",
  "DeVos Performance Hall": "303 Monroe Ave NW, Grand Rapids, MI 49503",
  "GLC Live at 20 Monroe": "11 Ottawa Ave NW, Grand Rapids, MI 49503",
  "The Intersection (main room)": "The Intersection, 133 Cesar E. Chavez Ave SW, Grand Rapids, MI 49503",
  "The Stache (at The Intersection)": "The Intersection, 133 Cesar E. Chavez Ave SW, Grand Rapids, MI 49503",
  "Elevation (at The Intersection)": "The Intersection, 133 Cesar E. Chavez Ave SW, Grand Rapids, MI 49503",
  "The Mint (at The Intersection)": "The Intersection, 133 Cesar E. Chavez Ave SW, Grand Rapids, MI 49503",
  "The Pyramid Scheme": "68 Commerce Ave SW, Grand Rapids, MI 49503",
  "The Big Room": "975 Ottawa Ave NW, Grand Rapids, MI 49503",
  "Frederik Meijer Gardens & Sculpture Park": "1000 E Beltline Ave NE, Grand Rapids, MI 49525",
  "St. Cecilia Music Center": "24 Ransom Ave NE, Grand Rapids, MI 49503",
  "Speciation Artisan Ales": "928 Wealthy St SE, Grand Rapids, MI 49506",
  "Midtown GR (at Studio Park)": "Midtown at Studio Park, 123 Ionia Ave SW, Grand Rapids, MI 49503",
  "Calvin University Chapel": "3201 Burton St SE, Grand Rapids, MI 49546",
  "GVSU Haas Center for Performing Arts": "Haas Center for Performing Arts, 1 Campus Dr, Allendale, MI 49401",
  "Fountain Street Church": "24 Fountain St NE, Grand Rapids, MI 49503",
  "Lowell Arts at Sound Check": "Sound Check, 621 E Main St, Lowell, MI 49331",
  "GRCC Spectrum Theater": "Spectrum Theater, 160 Fountain St NE, Grand Rapids, MI 49503",
  "Dog Story Theater": "340 State St SE, Grand Rapids, MI 49503",
  "The Comedy Project": "540 Leonard St NW, Suite B, Grand Rapids, MI 49504",
  "Tip Top Deluxe Bar & Grill": "760 Butterworth St SW, Grand Rapids, MI 49504",
  "Wealthy Theatre": "1130 Wealthy St SE, Grand Rapids, MI 49506",
  "Grand Rapids Civic Theatre": "30 N Division Ave, Grand Rapids, MI 49503",
  "Dr. Grins (at The B.O.B.)": "The B.O.B., 20 Monroe Ave NW, Grand Rapids, MI 49503",
  "Acrisure Amphitheater": "201 Market Ave SW, Grand Rapids, MI 49503",
  "LMCU Ballpark": "4500 W River Dr NE, Comstock Park, MI 49321",
  "Amway Stadium": "230 Winter Ave NW, Grand Rapids, MI 49504",
  // Seasonal event locations
  "Lyon Square, 296 Lyon St NW": "Lyon Square, 296 Lyon St NW, Grand Rapids, MI 49503",
  "40 Monroe Center NW (outside Shinola)": "40 Monroe Center St NW, Grand Rapids, MI 49503",
  "Cannonsburg Ski Area, 6800 Cannonsburg Rd NE, Belmont": "Cannonsburg Ski Area, 6800 Cannonsburg Rd NE, Belmont, MI 49306",
  "John Ball Zoo, 1300 W Fulton St, Grand Rapids": "John Ball Zoo, 1300 W Fulton St, Grand Rapids, MI 49504",
  "4516 24th St, Dorr": "New Salem Corn Maze, 4516 24th St, Dorr, MI 49323",
  "Amway Grand Plaza, 187 Monroe Ave NW": "Amway Grand Plaza, 187 Monroe Ave NW, Grand Rapids, MI 49503",
  "Lena Meijer Children's Garden, Frederik Meijer Gardens, 1000 E Beltline Ave NE": "Frederik Meijer Gardens, 1000 E Beltline Ave NE, Grand Rapids, MI 49525",
  "19 downtown bars, Grand Rapids": "Ionia Ave SW, Grand Rapids, MI 49503",
  "Downtown Market, 435 Ionia Ave SW": "Grand Rapids Downtown Market, 435 Ionia Ave SW, Grand Rapids, MI 49503",
  "Studio Park Piazza, downtown": "Studio Park, 123 Ionia Ave SW, Grand Rapids, MI 49503",
  "Downtown Grand Rapids (tree lighting at Rosa Parks Circle)": "Rosa Parks Circle, 135 Monroe Center St NW, Grand Rapids, MI 49503",
  "Frederik Meijer Gardens, 1000 E Beltline Ave NE": "Frederik Meijer Gardens, 1000 E Beltline Ave NE, Grand Rapids, MI 49525",
  "LMCU Ballpark, 4500 W River Dr NE, Comstock Park": "LMCU Ballpark, 4500 W River Dr NE, Comstock Park, MI 49321",
  "Start at Van Andel Arena, 130 W Fulton St, Grand Rapids": "Van Andel Arena, 130 W Fulton St, Grand Rapids, MI 49503",
  "Downtown Lowell (S Broadway St to Main St)": "E Main St & S Broadway St, Lowell, MI 49331",
  "DeVos Performance Hall, 303 Monroe Ave NW, Grand Rapids": "DeVos Performance Hall, 303 Monroe Ave NW, Grand Rapids, MI 49503",
  "The Pyramid Scheme, 68 Commerce Dr SW": "The Pyramid Scheme, 68 Commerce Ave SW, Grand Rapids, MI 49503",
};
(function (root) {
  const NEAR = /\b(MI|Michigan|Grand Rapids|Grandville|Walker|Wyoming|Kentwood|Ada|Comstock Park|Rockford|Lowell|Allendale|Jenison|Hudsonville|Cascade|East Grand Rapids|Byron Center|Caledonia|Holland|Zeeland|Sparta|Cedar Springs|Belmont|Standale|Coopersville|Grand Haven|Dorr)\b/;
  function query(name) {
    name = String(name || '').trim();
    const V = (typeof VENUES !== 'undefined' && VENUES) || {};
    if (V[name]) {
      if (!/^\d/.test(V[name]) || /^\d/.test(name)) return V[name];
      return name.replace(/\s*\(.*?\)\s*/g, ' ').trim() + ', ' + V[name];
    }
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
