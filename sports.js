// ===== SPORTS — edit this file to change the games on sports.html =====
// GAMES: one { ... } line per HOME game. Copy a line to add one; delete a line to remove it.
//   team (must match a TEAMS name), opponent, date "YYYY-MM-DD", time "7:00 PM", venue,
//   link = the team's OFFICIAL ticket page, added = the date you added it (NEW badge for 7 days).
// SEASON_NOTES: teams not playing right now get a short note card instead of games.
// Remove a team's note once its games are listed in GAMES.
const SPORTS_UPDATED = "Oct 19, 2026";
const TEAMS = [
  { name:"Grand Rapids Griffins", sport:"Hockey (AHL)", site:"https://griffinshockey.com/schedule/home-schedule" },
  { name:"Grand Rapids Gold", sport:"Basketball (NBA G League)", site:"https://grandrapids.gleague.nba.com/schedule" },
  { name:"Grand Rapids Rise", sport:"Volleyball (MLV)", site:"https://provolleyball.com/teams/grand-rapids-rise" },
  { name:"West Michigan Whitecaps", sport:"Baseball (MiLB, High-A)", site:"https://www.milb.com/west-michigan/schedule" },
  { name:"AC Grand Rapids", sport:"Soccer (MLS NEXT Pro)", site:"https://www.acgrandrapids.com/" },
];
const GAMES = [
  { team:"Grand Rapids Griffins", opponent:"Manitoba Moose", date:"2026-10-21", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Cleveland Monsters", date:"2026-10-23", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Cleveland Monsters", date:"2026-10-24", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Texas Stars", date:"2026-11-04", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Milwaukee Admirals", date:"2026-11-06", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Rockford IceHogs", date:"2026-11-11", time:"11:00 AM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Manitoba Moose", date:"2026-11-18", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Iowa Wild", date:"2026-11-27", time:"7:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Griffins", opponent:"Iowa Wild", date:"2026-11-29", time:"4:00 PM", venue:"Van Andel Arena", link:"https://griffinshockey.evenue.net/events/S", added:"2026-10-19" },
  { team:"Grand Rapids Gold", opponent:"Sioux Falls Skyforce", date:"2026-11-07", time:"7:00 PM", venue:"Van Andel Arena", link:"https://www.gofevo.com/group/2026274315?ref=W", added:"2026-10-19" },
  { team:"Grand Rapids Gold", opponent:"Sioux Falls Skyforce", date:"2026-11-08", time:"3:00 PM", venue:"Van Andel Arena", link:"https://www.gofevo.com/group/2026274315?ref=W", added:"2026-10-19" },
  { team:"Grand Rapids Gold", opponent:"Cleveland Charge", date:"2026-11-20", time:"7:00 PM", venue:"Van Andel Arena", link:"https://www.gofevo.com/group/2026274315?ref=W", added:"2026-10-19" },
  { team:"Grand Rapids Gold", opponent:"Cleveland Charge", date:"2026-11-22", time:"3:00 PM", venue:"Van Andel Arena", link:"https://www.gofevo.com/group/2026274315?ref=W", added:"2026-10-19" },
  { team:"Grand Rapids Gold", opponent:"Noblesville Boom", date:"2026-11-28", time:"7:00 PM", venue:"Van Andel Arena", link:"https://www.gofevo.com/group/2026274315?ref=W", added:"2026-10-19" },
];
const SEASON_NOTES = [
  { team:"Grand Rapids Rise", text:"The 2027 season starts in January at Van Andel Arena. The full schedule hasn't been released yet.", link:"https://provolleyball.com/teams/grand-rapids-rise", added:"2026-10-19" },
  { team:"West Michigan Whitecaps", text:"The season is over. Baseball returns to LMCU Ballpark (Comstock Park) in spring 2027.", link:"https://www.milb.com/west-michigan/schedule", added:"2026-10-19" },
  { team:"AC Grand Rapids", text:"New pro soccer club (MLS NEXT Pro). The first home match is Friday, March 19, 2027, at the new Amway Stadium (230 Winter Ave NW, downtown Westside). Opponent TBA.", link:"https://www.acgrandrapids.com/friday-night-lights-inaugural-home-opener-set-for-friday-march-19-2027/", added:"2026-10-19" },
];
