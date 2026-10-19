// ===== SPORTS "WHO IS THIS?" BIOS — shown by the "Who is this?" button on sports.html =====
// Key = team name EXACTLY as written in sports.js (TEAMS name, or a game's opponent). text = 2-3 plain sentences.
// source = page the facts came from. Game cards show the home team, then the opponent if it has an entry. No entry = no button.
const SW = 'https://en.wikipedia.org/wiki/';
const SPORTS_BIOS = {
  // --- home teams ---
  "Grand Rapids Griffins": { text: "The Griffins are Grand Rapids' professional ice hockey team in the American Hockey League (AHL), playing home games at Van Andel Arena. They're the top farm team of the NHL's Detroit Red Wings and won the Calder Cup in 2013 and 2017.", source: SW + "Grand_Rapids_Griffins" },
  "Grand Rapids Gold": { text: "The Gold are a professional basketball team in the NBA G League, affiliated with the Denver Nuggets and playing at Van Andel Arena. The franchise began as the Anaheim Arsenal in 2006, became the Springfield Armor, moved to Grand Rapids in 2014 as the Drive, and took the name Gold in 2021.", source: SW + "Grand_Rapids_Gold" },
  "Grand Rapids Rise": { text: "The Rise are a women's professional indoor volleyball team in Major League Volleyball (MLV). They began play in the league's inaugural 2024 season and play home games at Van Andel Arena.", source: SW + "Grand_Rapids_Rise" },
  "West Michigan Whitecaps": { text: "The Whitecaps are a Minor League Baseball team in the Midwest League and the High-A affiliate of the Detroit Tigers. They play at LMCU Ballpark in Comstock Park, a suburb of Grand Rapids.", source: SW + "West_Michigan_Whitecaps" },
  "AC Grand Rapids": { text: "AC Grand Rapids (Amway Corporation Grand Rapids) is a professional soccer team founded in 2024. The club plans to make its MLS Next Pro debut in 2027.", source: SW + "AC_Grand_Rapids" },
  // --- opponents: hockey (AHL) ---
  "Manitoba Moose": { text: "The Moose are an AHL hockey team based in Winnipeg and the affiliate of the NHL's Winnipeg Jets. They play home games at Canada Life Centre.", source: SW + "Manitoba_Moose" },
  "Cleveland Monsters": { text: "The Monsters are the AHL affiliate of the NHL's Columbus Blue Jackets, playing at Rocket Arena in downtown Cleveland. They won the Calder Cup in 2016.", source: SW + "Cleveland_Monsters" },
  "Texas Stars": { text: "The Stars are an AHL hockey team based in Cedar Park, Texas, and the affiliate of the NHL's Dallas Stars. They play home games at the H-E-B Center.", source: SW + "Texas_Stars" },
  "Milwaukee Admirals": { text: "The Admirals are an AHL hockey team based in Milwaukee and the affiliate of the NHL's Nashville Predators. They play at the UW–Milwaukee Panther Arena.", source: SW + "Milwaukee_Admirals" },
  "Rockford IceHogs": { text: "The IceHogs are an AHL hockey team from Rockford, Illinois, in the league since the 2007–08 season. They're the top minor league affiliate of the NHL's Chicago Blackhawks and play at the BMO Center.", source: SW + "Rockford_IceHogs" },
  "Iowa Wild": { text: "The Iowa Wild are an AHL hockey team based in Des Moines and the affiliate of the NHL's Minnesota Wild. They play home games at Casey's Center.", source: SW + "Iowa_Wild" },
  // --- opponents: basketball (NBA G League) ---
  "Sioux Falls Skyforce": { text: "The Skyforce are an NBA G League team from Sioux Falls, South Dakota, affiliated with the Miami Heat and playing at the Sanford Pentagon. They're the longest-running minor-league basketball team in the United States.", source: SW + "Sioux_Falls_Skyforce" },
  "Cleveland Charge": { text: "The Charge are an NBA G League team based in Cleveland and affiliated with the Cleveland Cavaliers. They play home games at Public Auditorium downtown.", source: SW + "Cleveland_Charge" },
  "Noblesville Boom": { text: "The Boom are an NBA G League team based in Noblesville, Indiana, affiliated with the Indiana Pacers. They play at Riverview Health Arena at Innovation Mile.", source: SW + "Noblesville_Boom" },
};
