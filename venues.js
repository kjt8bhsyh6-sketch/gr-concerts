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
  "Gezon Auditorium (Calvin University)": "Spoelhof University Center, 3201 Burton St SE, Grand Rapids, MI 49546",
  "Lab Theatre, Spoelhof University Center (Calvin University)": "Spoelhof University Center, 3201 Burton St SE, Grand Rapids, MI 49546",
  "Covenant Fine Arts Center (Calvin University)": "Covenant Fine Arts Center, 1795 Knollcrest Cir SE, Grand Rapids, MI 49546",
  "Mayflower Congregational Church": "2345 Robinson Rd SE, Grand Rapids, MI 49506",
  "Park Congregational Church": "10 E Park Pl NE, Grand Rapids, MI 49503",
  "Second Reformed Church (Zeeland)": "Second Reformed Church, 225 E Central Ave, Zeeland, MI 49464",
  "Northview Performing Arts Center": "4451 Hunsberger Ave NE, Grand Rapids, MI 49525",
  "GVSU Haas Center for Performing Arts": "Haas Center for Performing Arts, 1 Campus Dr, Allendale, MI 49401",
  "Fountain Street Church": "24 Fountain St NE, Grand Rapids, MI 49503",
  "Lowell Arts at Sound Check": "Sound Check, 621 E Main St, Lowell, MI 49331",
  "GRCC Spectrum Theater": "Spectrum Theater, 160 Fountain St NE, Grand Rapids, MI 49503",
  "GRCC Albert P. Smith Music Center": "Albert P. Smith Music Center, 142 Ransom Ave NE, Grand Rapids, MI 49503",
  "Dog Story Theater": "340 State St SE, Grand Rapids, MI 49503",
  "The Comedy Project": "540 Leonard St NW, Suite B, Grand Rapids, MI 49504",
  "Tip Top Deluxe Bar & Grill": "760 Butterworth St SW, Grand Rapids, MI 49504",
  "Wealthy Theatre": "1130 Wealthy St SE, Grand Rapids, MI 49506",
  "Grand Rapids Civic Theatre": "30 N Division Ave, Grand Rapids, MI 49503",
  "Dr. Grins (at The B.O.B.)": "The B.O.B., 20 Monroe Ave NW, Grand Rapids, MI 49503",
  "Acrisure Amphitheater": "201 Market Ave SW, Grand Rapids, MI 49503",
  "LMCU Ballpark": "4500 W River Dr NE, Comstock Park, MI 49321",
  "Amway Stadium": "230 Winter Ave NW, Grand Rapids, MI 49504",
  "Park Theatre (Holland)": "Park Theatre, 248 S River Ave, Holland, MI 49423",
  "Jack H. Miller Center for Musical Arts": "Jack H. Miller Center for Musical Arts, 221 Columbia Ave, Holland, MI 49423",
  "Knickerbocker Theatre (Hope College)": "Knickerbocker Theatre, 86 E 8th St, Holland, MI 49423",
  "Dimnent Memorial Chapel (Hope College)": "Dimnent Memorial Chapel, 277 College Ave, Holland, MI 49423",
  "Holland Civic Center Place": "Holland Civic Center Place, 150 W 8th St, Holland, MI 49423",
  "Holland Community Theatre": "Holland Community Theatre, 50 W 9th St, Holland, MI 49423",
  "Saugatuck Center for the Arts": "Saugatuck Center for the Arts, 400 Culver St, Saugatuck, MI 49453",
  "Gun Lake Casino Resort": "Gun Lake Casino Resort, 1123 129th Ave, Wayland, MI 49348",
  "FireKeepers Casino Event Center": "FireKeepers Casino Hotel, 11177 E Michigan Ave, Battle Creek, MI 49014",
  "Soaring Eagle Casino & Resort": "Soaring Eagle Casino & Resort, 6800 Soaring Eagle Blvd, Mt. Pleasant, MI 48858",
  "Four Winds Silver Creek Event Center": "Four Winds Casino New Buffalo, 11111 Wilson Rd, New Buffalo, MI 49117",
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
  "High Tea GR, 1522 Wealthy St SE": "High Tea GR, 1522 Wealthy St SE, Grand Rapids, MI 49506",
  "Harmony Brewing & Wealthy St SE, 1551 Lake Dr SE, Eastown": "Harmony Brewing Company, 1551 Lake Dr SE, Grand Rapids, MI 49506",
  "Wicks Park & Corner of Butler & Mason St, Saugatuck": "Wicks Park, 449 Water St, Saugatuck, MI 49453",
  "Felt Estate, 6597 138th Ave, Holland": "The Felt Estate, 6597 138th Ave, Holland, MI 49423",
  "Downtown Douglas, 130 W Center St, Douglas": "Downtown Douglas, 130 W Center St, Douglas, MI 49406",
  "8th Street Marketplace, 150 W 8th St, Holland": "8th Street Market Place, 150 W 8th St, Holland, MI 49423",
  "Wicks Park Gazebo, 449 Water St, Saugatuck": "Wicks Park, 449 Water St, Saugatuck, MI 49453",
  "Beery Field, 86 Center St, Downtown Douglas": "Beery Field, 86 Center St, Douglas, MI 49406",
  "Downtown Holland, 8th St from Columbia Ave to 150 W 8th St": "E 8th St & Columbia Ave, Holland, MI 49423",
  "Downtown Holland & Tulip Time Office, 42 W 8th St, Holland": "Tulip Time Office, 42 W 8th St, Holland, MI 49423",
  "Windmill Island Gardens, 1 Lincoln Ave, Holland": "Windmill Island Gardens, 1 Lincoln Ave, Holland, MI 49423",
  "Downtown Fennville, E Main St, Fennville": "Downtown Fennville, 100 E Main St, Fennville, MI 49408",
  "Saugatuck Center for the Arts, 400 Culver St, Saugatuck": "Saugatuck Center for the Arts, 400 Culver St, Saugatuck, MI 49453",
  "Downtown Saugatuck, 102 Butler St, Saugatuck": "Downtown Saugatuck, 102 Butler St, Saugatuck, MI 49453",
  "Downtown Fennville, 100 S Maple St, Fennville": "Downtown Fennville, 100 S Maple St, Fennville, MI 49408",
  "Eastown Community Association office, 415 Ethel Ave SE, Eastown": "Eastown Community Association, 415 Ethel Ave SE, Grand Rapids, MI 49506",
};
(function (root) {
  const NEAR = /\b(MI|Michigan|Grand Rapids|Grandville|Walker|Wyoming|Kentwood|Ada|Comstock Park|Rockford|Lowell|Allendale|Jenison|Hudsonville|Cascade|East Grand Rapids|Byron Center|Caledonia|Holland|Zeeland|Sparta|Cedar Springs|Belmont|Standale|Coopersville|Grand Haven|Dorr|Saugatuck|Douglas|Fennville|Wayland|Battle Creek|New Buffalo|Mt\.? Pleasant|Mount Pleasant)\b/;
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
