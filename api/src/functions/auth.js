// Dashboard-login (#71 — geëxtraheerd uit chat.js): verifieert het gedeelde wachtwoord
// server-side en geeft een tijdelijk sessietoken terug. De hash staat alleen op de server,
// nooit in de frontend. Deelt checkPwd/CORS via lib/.
const { app } = require("@azure/functions")
const crypto = require("crypto")
const { checkPwd } = require("./lib/auth")
const { dashboardCors } = require("./lib/cors")

app.http("auth", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    try {
      const body = await request.json()
      const { wachtwoord } = body

      if (!wachtwoord) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Geen wachtwoord opgegeven" }),
        }
      }

      if (checkPwd(wachtwoord)) {
        // Genereer een tijdelijk sessie token (geldig voor 8 uur)
        const token = crypto.randomBytes(32).toString("hex")
        const expiry = Date.now() + (8 * 60 * 60 * 1000)
        context.log("Dashboard login succesvol")
        return {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, token, expiry }),
        }
      } else {
        context.log("Dashboard login mislukt — verkeerd wachtwoord")
        return {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Verkeerd wachtwoord" }),
        }
      }
    } catch (error) {
      context.log("Auth error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: error.message }),
      }
    }
  },
})
