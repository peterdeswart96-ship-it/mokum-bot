// Gedeelde CORS voor dashboard-endpoints (#72/#71): alleen de dashboard-origin, niet '*'.
// Reflecteert de origin als die op de allowlist staat, anders de canonieke productie-origin —
// zo blokkeert de browser een niet-toegestane cross-origin respons. Publieke widget-endpoints
// (chat, terugbelverzoek) houden bewust '*'. NB: CORS beschermt alleen browser-verkeer; de
// echte gate op deze endpoints is autoriseer() (Entra-token óf gedeeld wachtwoord — #42).
const DASHBOARD_ORIGINS = [
  "https://mokum-bot.pdscloud.nl", // productie-dashboard (GitHub Pages, main-CNAME)
  "http://localhost:5173",         // lokale dev (Vite)
]

function dashboardCors(request, methods) {
  const origin = request.headers.get("origin") || ""
  const allow = DASHBOARD_ORIGINS.includes(origin) ? origin : DASHBOARD_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": methods,
    // Authorization toestaan zodat Fase C (MSAL) een Bearer-token cross-origin kan meesturen (#42/#79).
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  }
}

module.exports = { DASHBOARD_ORIGINS, dashboardCors }
