// Icoon-generator via Claude (#79 — onderdeel van de widget-customizer-epic).
//
// Endpoint (HTTP /api/icoon-genereer):
//   POST {beschrijving}                       -> genereer een standalone SVG-icoon
//   POST {vorigeSvg, verfijning}              -> verfijn een eerder gegenereerd icoon
//
// De SVG wordt server-side gesaneerd: geen <script>, geen event-handlers, geen
// externe verwijzingen (zie saneerSvg). Beheer-gated via autoriseer() (dual-mode:
// Entra-token óf gedeeld wachtwoord — #42) en dashboard-CORS.
//
// NB: er is één Function App (mokum-bot-api) voor develop én productie — deze
// backend-change raakt beide zodra gedeployed. API-key blijft in de App Setting
// CLAUDE_API_KEY, nooit in code.
const { app } = require("@azure/functions")
const Anthropic = require("@anthropic-ai/sdk")
const { autoriseer } = require("./_auth")
const { dashboardCors } = require("./lib/cors")
const { leesClaudeTekst } = require("./lib/claude")

// Saneert een door Claude gegenereerde SVG tot een veilige, standalone SVG.
// Regex-sanitization is defense-in-depth (de frontend hoort bij het renderen
// óók te saneren); bij iets verdachts dat niet weg te strippen is → null (afkeuren).
function saneerSvg(raw) {
  if (!raw) return null
  // Pak alleen het <svg>…</svg>-fragment (Claude kan er tekst/markdown omheen zetten).
  const m = /<svg[\s\S]*<\/svg>/i.exec(raw)
  if (!m) return null
  let svg = m[0]

  svg = svg
    .replace(/<!--[\s\S]*?-->/g, "")                          // comments
    .replace(/<\?[\s\S]*?\?>/g, "")                           // processing instructions (<?xml?>)
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")                      // doctype/DTD
    .replace(/<!ENTITY[\s\S]*?>/gi, "")                       // entity-declaraties
    .replace(/<script[\s\S]*?<\/script>/gi, "")               // scripts
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "") // willekeurige HTML/JS
    .replace(/<image\b[\s\S]*?(?:\/>|<\/image>)/gi, "")       // externe/raster afbeeldingen
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")                   // on*-handlers ("...")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")                   // on*-handlers ('...')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")                   // on*-handlers (unquoted)
    // Externe verwijzingen in href/xlink:href/src → attribuut verwijderen
    .replace(/\s(?:xlink:href|href|src)\s*=\s*"\s*(?:https?:|\/\/|javascript:|data:text\/html)[^"]*"/gi, "")
    .replace(/\s(?:xlink:href|href|src)\s*=\s*'\s*(?:https?:|\/\/|javascript:|data:text\/html)[^']*'/gi, "")
    .replace(/url\(\s*['"]?\s*(?:https?:|\/\/)[^)]*\)/gi, "none") // externe url() in style/attributen
    .replace(/@import[^;]*;?/gi, "")                          // css @import

  // Eindcontrole — zit er nog iets verdachts in, dan afkeuren i.p.v. half-gesaneerd terugsturen.
  if (/<script|<foreignObject|<!ENTITY|javascript:|\son\w+\s*=/i.test(svg)) return null
  if (/(?:xlink:href|href|src)\s*=\s*["']?\s*(?:https?:|\/\/)/i.test(svg)) return null
  if (svg.length > 100000) return null
  return svg.trim()
}

app.http("icoon-genereer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const json = (status, obj) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) })
    try {
      const body = await request.json()
      if (!(await autoriseer(request, body)).ok) return json(401, { error: "Onjuist wachtwoord" })

      const beschrijving = (body.beschrijving || "").toString().trim()
      const vorigeSvg = (body.vorigeSvg || "").toString().trim()
      const verfijning = (body.verfijning || "").toString().trim()
      const bedrijf = (body.bedrijf || "deze zaak").toString().trim()
      if (!beschrijving && !verfijning) return json(400, { error: "beschrijving vereist" })

      const system = `Je genereert één standalone SVG-icoon voor de chatbot-widget van ${bedrijf}.

Eisen aan de SVG:
- Geef ALLEEN de SVG-code terug: begin met <svg en eindig met </svg>. Geen uitleg, geen markdown, geen code-fences.
- Gebruik één viewBox (bijvoorbeeld "0 0 24 24") en GEEN vaste width/height, zodat het icoon meeschaalt.
- Monochroom en thema-neutraal: gebruik fill="currentColor" en/of stroke="currentColor" zodat het icoon de kleur van de widget overneemt. Gebruik GEEN vaste kleuren (geen hex, geen rgb(), geen kleurnamen), behalve "none" waar nodig.
- Alleen deze elementen: <path>, <circle>, <ellipse>, <rect>, <line>, <polygon>, <polyline>, <g>, <defs>, <clipPath>, <linearGradient>/<radialGradient> met currentColor-stops.
- VERBODEN: <script>, <foreignObject>, <image>, event-handlers (on...), externe verwijzingen (http/https), en <style> met @import.
- Maak een strak, herkenbaar, minimalistisch icoon dat ook klein (24px) goed leesbaar is.`

      const userMsg = vorigeSvg
        ? `Hier is de vorige versie van het icoon:\n\n${vorigeSvg}\n\nPas dit icoon aan volgens deze instructie:\n${verfijning || beschrijving}\n\nGeef de volledige, nieuwe SVG terug.`
        : `Beschrijving van het gewenste icoon:\n${beschrijving}\n\nGenereer nu de SVG.`

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        // Icoon-generatie is zeldzaam (beheerder in het dashboard) en profiteert van
        // sterk instructie-volgen/ruimtelijk redeneren → Opus. Kleine output, dus goedkoop.
        model: "claude-opus-4-8",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: userMsg }],
      })

      const svg = saneerSvg(leesClaudeTekst(response))
      if (!svg) return json(502, { error: "Kon geen geldige SVG genereren; probeer een andere beschrijving." })
      return json(200, { svg })
    } catch (error) {
      context.log("icoon-genereer error:", error)
      return json(500, { error: error.message })
    }
  },
})

module.exports = { saneerSvg }
