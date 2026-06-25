// KNBB Pool Rating scraper (issue #5)
//
// Leest players-meta.json (playerId -> {name, url}) uit de transform-stap en
// haalt per Mokum-speler de KNBB Pool Rating van de Cuescore-profielpagina.
// Schrijft players-rating.json met de spelers die een KNBB-rating hebben, voor
// de "top 20 op KNBB-rating" in de chatbot.
//
// Triggers:
//   - Timer: elke nacht 04:30 UTC (na sync 04:00 en transform 04:15)
//   - HTTP:  POST/GET /api/toernooi-ratings

const https = require("https")
const { app } = require("@azure/functions")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "toernooien-raw"
const META_BLOB = "players-meta.json"
const RATING_BLOB = "players-rating.json"
const API_VERSION = "2020-04-08"
const CONCURRENCY = 6

// --- HTTP helpers ------------------------------------------------------------

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => resolve({ status: res.statusCode, body: data }))
    })
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

function fetchPage(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 4) return resolve(null)
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MokumBot/1.0)" } }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          const loc = res.headers.location.startsWith("http")
            ? res.headers.location
            : `https://cuescore.com${res.headers.location}`
          return fetchPage(loc, depth + 1).then(resolve).catch(reject)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return resolve(null)
        }
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => resolve(data))
      })
      .on("error", reject)
  })
}

// --- Blob helpers ------------------------------------------------------------

async function getBlob(name, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${CONTAINER}/${encodeURIComponent(name)}?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  }
  const res = await httpsRequest(options)
  return res.status === 200 ? res.body : null
}

async function putBlob(name, content, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${CONTAINER}/${encodeURIComponent(name)}?${sasToken}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(content),
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": API_VERSION,
    },
  }
  const res = await httpsRequest(options, content)
  if (res.status !== 201) throw new Error(`PUT ${name} -> status ${res.status}`)
}

// --- Rating-parser -----------------------------------------------------------

// Haalt de KNBB Pool Rating uit de profiel-HTML (anker naar de KNBB Pool Rating-lijst).
function parseKnbbRating(html) {
  if (!html) return null
  const m = html.match(
    /<a[^>]*class="rating"[^>]*href="[^"]*KNBB\+Pool\+Rating[^"]*"[^>]*>([\s\S]*?)<\/a>/i
  )
  if (!m) return null
  const txt = m[1].replace(/<[^>]+>/g, " ")
  const num = txt.match(/\d{3,4}/)
  return num ? parseInt(num[0], 10) : null
}

// --- Kern --------------------------------------------------------------------

async function scrapeRatings(context) {
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
  if (!sasToken) throw new Error("Geen AZURE_STORAGE_SAS_TOKEN geconfigureerd")

  const metaRaw = await getBlob(META_BLOB, sasToken)
  if (!metaRaw) throw new Error("players-meta.json niet gevonden — draai eerst toernooi-transform")
  const meta = JSON.parse(metaRaw).players || {}
  const entries = Object.entries(meta).filter(([, m]) => m && m.url)

  context.log(`Rating-scrape gestart voor ${entries.length} spelers`)
  const result = { players: entries.length, withRating: 0, errors: 0 }
  const ratings = {} // playerId -> { name, rating }

  let i = 0
  async function worker() {
    while (i < entries.length) {
      const [pid, m] = entries[i++]
      try {
        const html = await fetchPage(m.url)
        const rating = parseKnbbRating(html)
        if (rating != null) {
          ratings[pid] = { name: m.name, rating }
          result.withRating++
        }
      } catch (err) {
        result.errors++
        context.log(`Rating ${pid} mislukt: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  await putBlob(
    RATING_BLOB,
    JSON.stringify(
      { updated: new Date().toISOString(), count: Object.keys(ratings).length, players: ratings },
      null,
      2
    ),
    sasToken
  )

  context.log(`Rating-scrape klaar: ${result.withRating} met KNBB-rating, ${result.errors} fouten`)
  return result
}

// --- Triggers ----------------------------------------------------------------

app.timer("toernooiRatingsTimer", {
  schedule: "0 30 4 * * *",
  handler: async (myTimer, context) => {
    try {
      await scrapeRatings(context)
    } catch (err) {
      context.log("Timer rating-scrape fout:", err.message)
    }
  },
})

app.http("toernooi-ratings", {
  methods: ["POST", "GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    try {
      const result = await scrapeRatings(context)
      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }
    } catch (error) {
      context.log("Rating endpoint fout:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      }
    }
  },
})
