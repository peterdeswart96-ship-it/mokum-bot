// Prijslijsten beheren (#99): Shop, Eten/Drinken en Speel tarieven als één beheerbaar
// databestand in Blob Storage. De bot leest deze lijsten live (zie chat.js) en het
// dashboard beheert ze. Vervangt de statische menukaart-PDF + hardcoded tarieven.
//
// Endpoints (HTTP /api/prijslijsten):
//   GET                    -> het hele document teruggeven (bot + dashboard). Valt terug
//                             op de bundled default (data/prijslijsten-default.json) zolang
//                             er nog niets in blob staat.
//   POST {action:"save"}   -> het hele document vervangen (admin; server-side gevalideerd)
//   POST {action:"seed"}   -> (her)vul met de bundled default (admin)

const { app } = require("@azure/functions")
const { STORAGE_ACCOUNT, httpsRequest, readBlobText } = require("./lib/storage")
const { autoriseer, magMinstens } = require("./_auth")
const DEFAULT_DOC = require("./data/prijslijsten-default.json")

const CONTAINER = "prijslijsten"
const DOC_BLOB = "prijslijsten.json"
const API_VERSION = "2020-04-08"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Dashboard-Wachtwoord",
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

// Leest het document uit blob; valt terug op de bundled default zolang blob leeg is.
async function getDoc() {
  const raw = await readBlobText(undefined, CONTAINER, DOC_BLOB)
  if (!raw) return normDoc(DEFAULT_DOC)
  try {
    return normDoc(JSON.parse(raw))
  } catch {
    return normDoc(DEFAULT_DOC)
  }
}

async function putDoc(doc, sasToken) {
  await ensureContainer(sasToken)
  const content = Buffer.from(JSON.stringify(doc, null, 2), "utf-8")
  const res = await httpsRequest(
    {
      hostname: host(),
      path: `/${CONTAINER}/${DOC_BLOB}?${sasToken}`,
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
  if (res.status !== 201) throw new Error(`Document opslaan status ${res.status}`)
}

const asText = (v) => (v == null ? "" : String(v))
const asBool = (v, def = true) => (v === undefined ? def : !!v)
const asFotos = (v) => (Array.isArray(v) ? v.map((f) => String(f).trim()).filter(Boolean) : [])

function normItem(raw) {
  const e = raw || {}
  return {
    id: asText(e.id) || `item-${Math.abs(hash(asText(e.naam) + asText(e.categorie))).toString(36)}`,
    categorie: asText(e.categorie),
    naam: asText(e.naam),
    prijs: asText(e.prijs),
    ...(e.beschrijving ? { beschrijving: asText(e.beschrijving) } : {}),
    beschikbaar: asBool(e.beschikbaar),
    fotos: asFotos(e.fotos),
  }
}
function normTarief(raw) {
  const e = raw || {}
  return {
    id: asText(e.id) || `tarief-${Math.abs(hash(asText(e.naam))).toString(36)}`,
    naam: asText(e.naam),
    prijsTot19: asText(e.prijsTot19),
    prijsNa19: asText(e.prijsNa19),
    eenheid: asText(e.eenheid),
    perPersoon: asBool(e.perPersoon, false),
    notitie: asText(e.notitie),
    beschikbaar: asBool(e.beschikbaar),
  }
}
function normDoc(raw) {
  const d = raw || {}
  return {
    ...(d._meta ? { _meta: d._meta } : {}),
    etenDrinken: Array.isArray(d.etenDrinken) ? d.etenDrinken.map(normItem) : [],
    shop: Array.isArray(d.shop) ? d.shop.map(normItem) : [],
    tarieven: Array.isArray(d.tarieven) ? d.tarieven.map(normTarief) : [],
  }
}
function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

app.http("prijslijsten", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }

    try {
      if (request.method === "GET") {
        return json(200, await getDoc())
      }

      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) return json(500, { error: "Geen SAS token geconfigureerd" })

      const body = await request.json().catch(() => ({}))
      const action = body.action || "save"

      const auth = await autoriseer(request, body)
      if (!auth.ok) return json(401, { error: "Niet ingelogd" })
      // Prijslijsten bewerken = admin (#99).
      if (!magMinstens(auth.roles, "admin")) return json(403, { error: "Onvoldoende rechten voor deze actie" })

      if (action === "seed") {
        const doc = normDoc(DEFAULT_DOC)
        await putDoc(doc, sasToken)
        context.log("Prijslijsten geseed met bundled default")
        return json(200, { success: true, doc })
      }

      if (action === "save") {
        if (!body.doc || typeof body.doc !== "object") return json(400, { error: "doc is verplicht" })
        const doc = normDoc(body.doc)
        await putDoc(doc, sasToken)
        context.log(
          `Prijslijsten opgeslagen: ${doc.etenDrinken.length} eten/drinken, ${doc.shop.length} shop, ${doc.tarieven.length} tarieven`
        )
        return json(200, { success: true, doc })
      }

      return json(400, { error: `Onbekende actie: ${action}` })
    } catch (error) {
      context.log("Prijslijsten endpoint fout:", error)
      return json(500, { error: error.message })
    }
  },
})
