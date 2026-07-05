// Standaardvragen per rubriek beheren + cachen (issue #33)
//
// Beheert een `standaardvragen`-container met één index-blob (_index.json): een
// lijst met per standaardvraag een vast (goedgekeurd) antwoord in NL + EN en
// eventueel gekoppelde foto's (bestandsnamen uit de fotos-catalogus).
//
// De widget laadt deze lijst dynamisch (voorbeeldvragen per rubriek); de chat
// serveert het vaste antwoord i.p.v. Claude aan te roepen (sneller + gratis).
//
// Endpoints (HTTP /api/standaardvragen):
//   GET                       -> index teruggeven (voor widget + dashboard)
//   POST {action:"save"}      -> één vraag toevoegen/bijwerken (wachtwoord)
//   POST {action:"delete"}    -> één vraag verwijderen (wachtwoord)
//   POST {action:"import"}    -> hele lijst vervangen, voor seeding (wachtwoord)

const crypto = require("crypto")
const { app } = require("@azure/functions")
const { STORAGE_ACCOUNT, httpsRequest, readBlobText } = require("./lib/storage")
const { autoriseer } = require("./_auth")

const CONTAINER = "standaardvragen"
const INDEX_BLOB = "_index.json"
const API_VERSION = "2020-04-08"
const RUBRIEKEN = ["toernooien", "spelen", "praktisch", "service", "overig"]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(status, obj) {
  return { status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) }
}

function host() {
  return `${STORAGE_ACCOUNT}.blob.core.windows.net`
}

async function ensureContainer(sasToken) {
  const res = await httpsRequest({
    hostname: host(),
    path: `/${CONTAINER}?restype=container&${sasToken}`,
    method: "PUT",
    headers: { "Content-Length": 0, "x-ms-version": API_VERSION },
  })
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Container borgen status ${res.status}: ${res.body.slice(0, 200)}`)
  }
}

async function getIndex(sasToken) {
  // #39 fase 1: lezen via managed identity i.p.v. SAS. De sasToken-param blijft (ongebruikt)
  // zodat de callers ongewijzigd blijven; wordt in de SAS-opruimfase verwijderd.
  const raw = await readBlobText(undefined, CONTAINER, INDEX_BLOB)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function putIndex(index, sasToken) {
  await ensureContainer(sasToken)
  const content = Buffer.from(JSON.stringify(index, null, 2), "utf-8")
  const res = await httpsRequest(
    {
      hostname: host(),
      path: `/${CONTAINER}/${INDEX_BLOB}?${sasToken}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": content.length,
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": API_VERSION,
      },
    },
    content
  )
  if (res.status !== 201) throw new Error(`Index opslaan status ${res.status}`)
}

// Normaliseert één binnenkomende entry tot het vaste schema.
function normEntry(raw, bestaand) {
  const e = raw || {}
  const src = bestaand || {}
  const asText = (v) => (v == null ? "" : String(v))
  const rubriek = RUBRIEKEN.includes(e.rubriek) ? e.rubriek : src.rubriek || "overig"
  const fotos = Array.isArray(e.fotos)
    ? e.fotos.map((f) => String(f).trim()).filter(Boolean)
    : Array.isArray(src.fotos)
      ? src.fotos
      : []
  // concept = klad (bot antwoordt live); goedgekeurd = vast antwoord dat gecachet wordt
  const statusIn = e.status !== undefined ? e.status : src.status
  return {
    id: src.id || e.id || `${(e.onderwerp || rubriek || "vraag")}-${crypto.randomBytes(3).toString("hex")}`,
    rubriek,
    onderwerp: asText(e.onderwerp ?? src.onderwerp),
    volgnummer: Number.isFinite(+e.volgnummer) ? +e.volgnummer : (src.volgnummer ?? 0),
    actief: e.actief === undefined ? (src.actief === undefined ? true : !!src.actief) : !!e.actief,
    status: statusIn === "goedgekeurd" ? "goedgekeurd" : "concept",
    // altijdLive: vraag gebruikt live data (bijv. Cuescore) → nooit cachen, altijd de bot laten antwoorden.
    altijdLive: e.altijdLive !== undefined ? !!e.altijdLive : !!src.altijdLive,
    vraag: {
      nl: asText(e.vraag?.nl ?? src.vraag?.nl),
      en: asText(e.vraag?.en ?? src.vraag?.en),
    },
    antwoord: {
      nl: asText(e.antwoord?.nl ?? src.antwoord?.nl),
      en: asText(e.antwoord?.en ?? src.antwoord?.en),
    },
    fotos,
  }
}

app.http("standaardvragen", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }

    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return json(500, { error: "Geen SAS token geconfigureerd" })

    try {
      if (request.method === "GET") {
        const index = await getIndex(sasToken)
        return json(200, { vragen: index })
      }

      const body = await request.json()
      const action = body.action || "save"

      if (!(await autoriseer(request, body)).ok) {
        return json(401, { error: "Onjuist wachtwoord" })
      }

      if (action === "save") {
        if (!body.entry) return json(400, { error: "entry is verplicht" })
        const index = await getIndex(sasToken)
        const id = body.entry.id
        const idx = id ? index.findIndex((v) => v.id === id) : -1
        const entry = normEntry(body.entry, idx >= 0 ? index[idx] : null)
        if (idx >= 0) index[idx] = entry
        else index.push(entry)
        await putIndex(index, sasToken)
        context.log(`Standaardvraag opgeslagen: ${entry.id} (${entry.rubriek}/${entry.onderwerp})`)
        return json(200, { success: true, entry })
      }

      if (action === "delete") {
        if (!body.id) return json(400, { error: "id is verplicht" })
        const index = await getIndex(sasToken)
        const next = index.filter((v) => v.id !== body.id)
        await putIndex(next, sasToken)
        return json(200, { success: true })
      }

      if (action === "import") {
        if (!Array.isArray(body.entries)) return json(400, { error: "entries array is verplicht" })
        const index = body.entries.map((e) => normEntry(e, null))
        await putIndex(index, sasToken)
        context.log(`Standaardvragen geïmporteerd: ${index.length} vragen`)
        return json(200, { success: true, aantal: index.length })
      }

      return json(400, { error: `Onbekende actie: ${action}` })
    } catch (error) {
      context.log("Standaardvragen endpoint fout:", error)
      return json(500, { error: error.message })
    }
  },
})
