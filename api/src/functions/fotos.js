// Foto's voor bot-antwoorden (issue #26 / #29)
//
// Beheert een publieke `fotos`-container + een catalogus (_catalog.json) met per
// foto: categorie, onderschrift, trigger words en weergave-modus
// ("inline" = klein in het botvenster, "venster" = grote afbeelding/PDF die in
// een apart venster opent). De chatbot leest de catalogus en toont de juiste
// foto bij matchende trigger words; het dashboard beheert en uploadt foto's.
//
// Endpoints (HTTP /api/fotos):
//   GET                      -> catalogus teruggeven (voor dashboard + bot)
//   POST {action:"ensure"}   -> publieke container aanmaken/borgen (wachtwoord)
//   POST {action:"upload"}   -> foto uploaden + catalogus bijwerken (wachtwoord)
//   POST {action:"update"}   -> catalogus-entry bewerken (wachtwoord)
//   POST {action:"delete"}   -> foto + entry verwijderen (wachtwoord)

const https = require("https")
const crypto = require("crypto")
const { app } = require("@azure/functions")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const FOTOS_CONTAINER = "fotos"
const CATALOG_BLOB = "_catalog.json"
const API_VERSION = "2020-04-08"
// sha256("mkm!") — zelfde dashboard-wachtwoord als de auth/cleanup endpoints
const DASHBOARD_HASH = "e76ba1957d8c978fc25c9ca24af6280569876436d3fe9ca6418a43144f2f7265"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(status, obj) {
  return { status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) }
}

function checkPwd(wachtwoord) {
  return crypto.createHash("sha256").update(wachtwoord || "").digest("hex") === DASHBOARD_HASH
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") }))
    })
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

function host() {
  return `${STORAGE_ACCOUNT}.blob.core.windows.net`
}

function publicUrl(name) {
  return `https://${host()}/${FOTOS_CONTAINER}/${encodeURIComponent(name)}`
}

// Maakt de container aan met publieke blob-toegang; bestaat-ie al, dan de ACL
// borgen op "blob" (alleen-lezen via directe URL, geen listing).
async function ensurePublicContainer(sasToken) {
  const createOpts = {
    hostname: host(),
    path: `/${FOTOS_CONTAINER}?restype=container&${sasToken}`,
    method: "PUT",
    headers: { "Content-Length": 0, "x-ms-version": API_VERSION, "x-ms-blob-public-access": "blob" },
  }
  const res = await httpsRequest(createOpts)
  if (res.status === 201) return { created: true, public: true }
  if (res.status === 409) {
    // bestaat al -> ACL op publiek-blob zetten
    const aclOpts = {
      hostname: host(),
      path: `/${FOTOS_CONTAINER}?restype=container&comp=acl&${sasToken}`,
      method: "PUT",
      headers: { "Content-Length": 0, "x-ms-version": API_VERSION, "x-ms-blob-public-access": "blob" },
    }
    const aclRes = await httpsRequest(aclOpts)
    return { created: false, public: aclRes.status === 200, aclStatus: aclRes.status }
  }
  throw new Error(`Container aanmaken status ${res.status}: ${res.body.slice(0, 200)}`)
}

async function getCatalog(sasToken) {
  const res = await httpsRequest({
    hostname: host(),
    path: `/${FOTOS_CONTAINER}/${CATALOG_BLOB}?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  })
  if (res.status === 200) {
    try { return JSON.parse(res.body) } catch { return [] }
  }
  return []
}

async function putCatalog(catalog, sasToken) {
  const content = Buffer.from(JSON.stringify(catalog, null, 2), "utf-8")
  const res = await httpsRequest({
    hostname: host(),
    path: `/${FOTOS_CONTAINER}/${CATALOG_BLOB}?${sasToken}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": content.length,
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": API_VERSION,
    },
  }, content)
  if (res.status !== 201) throw new Error(`Catalogus opslaan status ${res.status}`)
}

function normTriggers(triggerWords) {
  let arr = triggerWords
  if (typeof arr === "string") arr = arr.split(",")
  if (!Array.isArray(arr)) arr = []
  return arr.map((t) => String(t).trim()).filter(Boolean)
}

app.http("fotos", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }

    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return json(500, { error: "Geen SAS token geconfigureerd" })

    try {
      // GET -> catalogus teruggeven
      if (request.method === "GET") {
        const catalog = await getCatalog(sasToken)
        return json(200, { fotos: catalog })
      }

      const body = await request.json()
      const action = body.action || "upload"

      // Alle muterende acties zijn wachtwoord-gated
      if (!checkPwd(body.wachtwoord)) {
        return json(401, { error: "Onjuist wachtwoord" })
      }

      if (action === "ensure") {
        const r = await ensurePublicContainer(sasToken)
        return json(200, { success: true, container: r })
      }

      if (action === "upload") {
        const { bestandsnaam, categorie, onderschrift, contentType } = body
        const weergave = body.weergave === "venster" ? "venster" : "inline"
        const triggerWords = normTriggers(body.triggerWords)
        if (!bestandsnaam || !body.contentBase64) {
          return json(400, { error: "bestandsnaam en contentBase64 zijn verplicht" })
        }
        const veilig = bestandsnaam.replace(/[^a-zA-Z0-9\-_.]/g, "-").toLowerCase()
        const bytes = Buffer.from(body.contentBase64, "base64")

        await ensurePublicContainer(sasToken)

        const putRes = await httpsRequest({
          hostname: host(),
          path: `/${FOTOS_CONTAINER}/${encodeURIComponent(veilig)}?${sasToken}`,
          method: "PUT",
          headers: {
            "Content-Type": contentType || "application/octet-stream",
            "Content-Length": bytes.length,
            "x-ms-blob-type": "BlockBlob",
            "x-ms-version": API_VERSION,
          },
        }, bytes)
        if (putRes.status !== 201) return json(500, { error: `Upload mislukt: HTTP ${putRes.status}` })

        const catalog = await getCatalog(sasToken)
        const entry = {
          bestand: veilig,
          url: publicUrl(veilig),
          categorie: categorie || "Overig",
          onderschrift: onderschrift || "",
          triggerWords,
          weergave,
          actief: true,
        }
        const idx = catalog.findIndex((f) => f.bestand === veilig)
        if (idx >= 0) catalog[idx] = { ...catalog[idx], ...entry }
        else catalog.push(entry)
        await putCatalog(catalog, sasToken)

        context.log(`Foto geupload: ${veilig} (${weergave})`)
        return json(200, { success: true, foto: entry })
      }

      if (action === "update") {
        const { bestand } = body
        if (!bestand) return json(400, { error: "bestand is verplicht" })
        const catalog = await getCatalog(sasToken)
        const idx = catalog.findIndex((f) => f.bestand === bestand)
        if (idx < 0) return json(404, { error: "Foto niet gevonden" })
        if (body.categorie !== undefined) catalog[idx].categorie = body.categorie
        if (body.onderschrift !== undefined) catalog[idx].onderschrift = body.onderschrift
        if (body.triggerWords !== undefined) catalog[idx].triggerWords = normTriggers(body.triggerWords)
        if (body.weergave !== undefined) catalog[idx].weergave = body.weergave === "venster" ? "venster" : "inline"
        if (body.actief !== undefined) catalog[idx].actief = !!body.actief
        await putCatalog(catalog, sasToken)
        return json(200, { success: true, foto: catalog[idx] })
      }

      if (action === "delete") {
        const { bestand } = body
        if (!bestand) return json(400, { error: "bestand is verplicht" })
        await httpsRequest({
          hostname: host(),
          path: `/${FOTOS_CONTAINER}/${encodeURIComponent(bestand)}?${sasToken}`,
          method: "DELETE",
          headers: { "x-ms-version": API_VERSION },
        })
        const catalog = await getCatalog(sasToken)
        const next = catalog.filter((f) => f.bestand !== bestand)
        await putCatalog(next, sasToken)
        return json(200, { success: true })
      }

      return json(400, { error: `Onbekende actie: ${action}` })
    } catch (error) {
      context.log("Fotos endpoint fout:", error)
      return json(500, { error: error.message })
    }
  },
})
