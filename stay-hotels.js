// Curated hotel for each venues.js key that has a verified hotel within 8 miles.
// Straight-line meters are a haversine of Nominatim points for the venues.js
// address and the hotel street address, checked 2026-11-09. Not a routed walk.
// Stay22 has no property id: https://dev.stay22.com/docs/allez/parameters
(function (root) {
  const CHECKED = '2026-11-09';
  const HOTELS = {
    courtyard: {
      hotel: 'Courtyard by Marriott Grand Rapids Downtown',
      address: '11 Monroe Avenue NW, Grand Rapids, MI 49503',
      source: 'https://www.marriott.com/en-us/hotels/grrdt-courtyard-grand-rapids-downtown/overview/'
    },
    amway: {
      hotel: 'Amway Grand Plaza',
      address: '187 Monroe Avenue NW, Grand Rapids, MI 49503',
      source: 'https://amwaygrand.com/contact'
    },
    cityflats: {
      hotel: 'CityFlatsHotel Grand Rapids',
      address: '83 Monroe Center St NW, Grand Rapids, MI 49503',
      source: 'https://cityflatshotel.com/grand-rapids/dine/'
    },
    springhill: {
      hotel: 'SpringHill Suites by Marriott Grand Rapids North',
      address: '450 Center Drive, Grand Rapids, MI 49544',
      source: 'https://www.marriott.com/en-us/hotels/grrsh-springhill-suites-grand-rapids-north/overview/'
    },
    haworth: {
      hotel: 'Haworth Hotel',
      address: '225 College Ave, Holland, MI 49423',
      source: 'https://haworthhotel.com/'
    },
    wickwood: {
      hotel: 'Wickwood Inn',
      address: '510 Butler Street, Saugatuck, MI 49453',
      source: 'https://wickwoodinn.com/'
    },
    sleepinn: {
      hotel: 'Sleep Inn & Suites Allendale',
      address: '4869 Becker Drive, Allendale, MI 49401',
      source: 'https://www.choicehotels.com/michigan/allendale/sleep-inn-hotels/mi214'
    },
    gunlake: {
      hotel: 'Gun Lake Casino Resort',
      address: '1123 129th Avenue, Wayland, MI 49348',
      source: 'https://gunlakecasino.com/wp-content/uploads/2026/01/GLC-022-623-25_BUS-FLYER-1.pdf'
    },
    firekeepers: {
      hotel: 'FireKeepers Casino Hotel',
      address: '11177 Michigan Avenue, Battle Creek, MI 49014',
      source: 'https://firekeeperscasino.com/wp-content/uploads/2026/04/2026-NARM-Vendor-Application-int.pdf'
    },
    soaring: {
      hotel: 'Soaring Eagle Casino & Resort',
      address: '6800 Soaring Eagle Blvd, Mount Pleasant, MI 48858',
      source: 'https://soaringeaglecasino.com/wp-content/uploads/2026/03/SECR_Brochure_Digital.pdf'
    },
    fourwinds: {
      hotel: 'Four Winds Hotel',
      address: '11111 Wilson Rd, New Buffalo, MI 49117',
      source: 'https://fourwindscasino.com/map-and-directions/'
    }
  };
  const PICKS = {
    'Van Andel Arena': ['courtyard', 258],
    'DeVos Performance Hall': ['amway', 304],
    'GLC Live at 20 Monroe': ['courtyard', 144],
    'The Intersection': ['courtyard', 470],
    'The Intersection (main room)': ['courtyard', 470],
    'The Stache (at The Intersection)': ['courtyard', 470],
    'Elevation (at The Intersection)': ['courtyard', 470],
    'The Mint (at The Intersection)': ['courtyard', 470],
    'The Pyramid Scheme': ['cityflats', 342],
    'The Big Room': ['amway', 1527],
    'Frederik Meijer Gardens & Sculpture Park': ['cityflats', 6660],
    'St. Cecilia Music Center': ['cityflats', 409],
    'Speciation Artisan Ales': ['cityflats', 2233],
    'Midtown GR (at Studio Park)': ['courtyard', 493],
    'Calvin University Chapel': ['cityflats', 7999],
    'Gezon Auditorium (Calvin University)': ['cityflats', 7999],
    'Lab Theatre, Spoelhof University Center (Calvin University)': ['cityflats', 7999],
    'Covenant Fine Arts Center (Calvin University)': ['cityflats', 7811],
    'Mayflower Congregational Church': ['cityflats', 3149],
    'Park Congregational Church': ['cityflats', 361],
    'Second Reformed Church (Zeeland)': ['haworth', 7722],
    'Northview Performing Arts Center': ['springhill', 5414],
    'GVSU Haas Center for Performing Arts': ['sleepinn', 1985],
    'Fountain Street Church': ['cityflats', 248],
    'GRCC Spectrum Theater': ['cityflats', 439],
    'GRCC Albert P. Smith Music Center': ['cityflats', 420],
    'Dog Story Theater': ['cityflats', 929],
    'The Comedy Project': ['amway', 2260],
    'Tip Top Deluxe Bar & Grill': ['courtyard', 1238],
    'Wealthy Theatre': ['cityflats', 2595],
    'Grand Rapids Civic Theatre': ['cityflats', 174],
    'Dr. Grins (at The B.O.B.)': ['courtyard', 86],
    'Acrisure Amphitheater': ['courtyard', 598],
    'LMCU Ballpark': ['springhill', 3393],
    'Amway Stadium': ['courtyard', 743],
    'Park Theatre (Holland)': ['haworth', 512],
    'Jack H. Miller Center for Musical Arts': ['haworth', 287],
    'Knickerbocker Theatre (Hope College)': ['haworth', 112],
    'Dimnent Memorial Chapel (Hope College)': ['haworth', 212],
    'Holland Civic Center Place': ['haworth', 901],
    'Holland Community Theatre': ['haworth', 530],
    'Saugatuck Center for the Arts': ['wickwood', 441],
    "Saugatuck Woman's Club": ['wickwood', 221],
    'Coral Gables (Saugatuck)': ['wickwood', 339],
    'Gun Lake Casino Resort': ['gunlake', 0],
    'FireKeepers Casino Event Center': ['firekeepers', 0],
    'Soaring Eagle Casino & Resort': ['soaring', 0],
    'Four Winds Silver Creek Event Center': ['fourwinds', 0],
    'Lyon Square, 296 Lyon St NW': ['amway', 177],
    '40 Monroe Center NW (outside Shinola)': ['cityflats', 150],
    'John Ball Zoo, 1300 W Fulton St, Grand Rapids': ['courtyard', 2166],
    'Amway Grand Plaza, 187 Monroe Ave NW': ['amway', 0],
    'Lena Meijer Children\'s Garden, Frederik Meijer Gardens, 1000 E Beltline Ave NE': ['cityflats', 6660],
    '19 downtown bars, Grand Rapids': ['courtyard', 733],
    'Downtown Market, 435 Ionia Ave SW': ['courtyard', 1054],
    'Studio Park Piazza, downtown': ['courtyard', 493],
    'Downtown Grand Rapids (tree lighting at Rosa Parks Circle)': ['cityflats', 123],
    'Frederik Meijer Gardens, 1000 E Beltline Ave NE': ['cityflats', 6660],
    'LMCU Ballpark, 4500 W River Dr NE, Comstock Park': ['springhill', 3393],
    'Start at Van Andel Arena, 130 W Fulton St, Grand Rapids': ['courtyard', 258],
    'DeVos Performance Hall, 303 Monroe Ave NW, Grand Rapids': ['amway', 304],
    'The Pyramid Scheme, 68 Commerce Ave SW': ['cityflats', 342],
    'High Tea GR, 1522 Wealthy St SE': ['cityflats', 3245],
    'Harmony Brewing & Wealthy St SE, 1551 Lake Dr SE, Eastown': ['cityflats', 3356],
    'Wicks Park & Corner of Butler & Mason St, Saugatuck': ['wickwood', 107],
    'Downtown Douglas, 130 W Center St, Douglas': ['wickwood', 1694],
    '8th Street Marketplace, 150 W 8th St, Holland': ['haworth', 901],
    'Wicks Park Gazebo, 449 Water St, Saugatuck': ['wickwood', 107],
    'Beery Field, 86 Center St, Downtown Douglas': ['wickwood', 1644],
    'Downtown Holland, 8th St from Columbia Ave to 150 W 8th St': ['haworth', 901],
    'Downtown Holland & Tulip Time Office, 42 W 8th St, Holland': ['haworth', 531],
    'Windmill Island Gardens, 1 Lincoln Ave, Holland': ['haworth', 1284],
    'Downtown Fennville, E Main St, Fennville': ['wickwood', 10899],
    'Saugatuck Center for the Arts, 400 Culver St, Saugatuck': ['wickwood', 441],
    'Downtown Saugatuck, 102 Butler St, Saugatuck': ['wickwood', 423],
    'Wick\'s Park Bar & Grille, 449 Water St, Saugatuck': ['wickwood', 107],
    'Riverside Pavilion, 48 Water St, Saugatuck': ['wickwood', 1815],
    'Downtown Fennville, 100 S Maple St, Fennville': ['wickwood', 10885],
    'Eastown Community Association office, 415 Ethel Ave SE, Eastown': ['cityflats', 3164]
  };
  const STAY_HOTELS = {};
  Object.keys(PICKS).forEach(venue => {
    const pick = PICKS[venue];
    const hotel = HOTELS[pick[0]];
    STAY_HOTELS[venue] = {
      hotel: hotel.hotel,
      address: hotel.address,
      meters: pick[1],
      source: hotel.source,
      checked: CHECKED
    };
  });
  function distanceLabel(meters) {
    const n = Number(meters);
    if (!isFinite(n) || n < 0) return '';
    if (n < 80) return 'At the venue';
    if (n <= 1200) return 'About ' + Math.max(1, Math.round(n / 80)) + ' min walk';
    const miles = n / 1609.344;
    return 'About ' + (miles < 10 ? miles.toFixed(1) : String(Math.round(miles))) + ' mi away';
  }
  const api = { STAY_HOTELS: STAY_HOTELS, HOTELS: HOTELS, CHECKED: CHECKED, distanceLabel: distanceLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.STAY_HOTELS = api;
})(typeof window !== 'undefined' ? window : this);
