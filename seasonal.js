// ===== SEASONAL EVENTS — ghost tours, Christmas markets, light displays =====
// Each event is one { ... } line. Copy a line to add one; delete a line to remove it.
// "when" is plain text shown as-is. "sort" is the start date "YYYY-MM-DD" (used for ordering).
// "type" is the little tag (e.g. "Ghost Tour", "Christmas Market", "Holiday Lights").
// "added" is the date you added it, "YYYY-MM-DD" (drives the NEW badge / Just Announced).
const SEASONAL = [
  { type:"Ghost Tour", name:"Grand Rapids Ghost Tour (Tours Around Michigan)", location:"Lyon Square, 296 Lyon St NW", when:"Daily through Oct 31 (runs year-round) · evening tours, see site for times", sort:"2026-10-19", link:"https://toursaroundmichigan.com/tour/grand-rapids-ghost-tour/", added:"2026-10-19" },
  { type:"Ghost Tour", name:"Grand Rapids Ghost Hunt Tour (Tours Around Michigan)", location:"40 Monroe Center NW (outside Shinola)", when:"Daily through Oct 31 (runs year-round) · see site for times", sort:"2026-10-19", link:"https://toursaroundmichigan.com/tour/grand-rapids-ghost-hunt-tour/", added:"2026-10-19" },
  { type:"Ghost Tour", name:"Ghosts of the Grand – Paranormal Indoor Walking Tour (21+)", location:"Amway Grand Plaza, 187 Monroe Ave NW", when:"Oct 28–29 · tours 5:30–8:30 PM", sort:"2026-10-28", link:"https://www.eventbrite.com/e/ghosts-of-the-grand-a-paranormal-indoor-walking-tour-tickets-2002647431377", added:"2026-10-19" },
  { type:"Christmas Market", name:"Grand Rapids Christkindl Markt", location:"Downtown Market, 435 Ionia Ave SW", when:"Nov 18–Dec 24 · Wed–Sun (closed Mon/Tue & Thanksgiving)", sort:"2026-11-18", link:"https://christkindlmarktgr.com/", added:"2026-10-19" },
  { type:"Christmas Market", name:"Holiday Market at Studio Park", location:"Studio Park Piazza, downtown", when:"Nov 18–Dec 23 · Wed–Sun (closed Mon/Tue & Thanksgiving)", sort:"2026-11-18", link:"https://www.studioparkgr.com/holiday-market", added:"2026-10-19" },
  { type:"Holiday Lights", name:"ENLIGHTEN at Meijer Gardens", location:"Frederik Meijer Gardens, 1000 E Beltline Ave NE", when:"Select nights Nov 23–Jan 10 · 5:30–8:30 PM, timed tickets", sort:"2026-11-23", link:"https://www.meijergardens.org/enlighten/", added:"2026-10-19" },
  { type:"Holiday Lights", name:"Christmas Lite Show (drive-thru)", location:"LMCU Ballpark, 4500 W River Dr NE, Comstock Park", when:"Nov 25–Jan 2 · Sun–Thu 5:30–9 PM, Fri–Sat 5:30–10 PM", sort:"2026-11-25", link:"https://christmasliteshow.com/drive-thru/", added:"2026-10-19" },
];
