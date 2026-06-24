// Fase 1 — Ingestie & raw archief van Mokum toernooiresultaten (issue #5)
//
// Haalt via de Cuescore JSON API alle toernooien van Mokum Pool & Darts op en
// archiveert de rauwe respons per toernooi als blob in container `toernooien-raw`.
// Afgeronde (Finished) toernooien zijn immutable en worden via een manifest
// overgeslagen bij volgende runs -> incrementeel en snel.
//
// Triggers:
//   - Timer:  elke nacht 04:00 UTC (incrementeel)
//   - HTTP:   POST/GET /api/toernooi-sync  (handmatig; ?full=1 forceert alles opnieuw)

const https = require("https")
const { app } = require("@azure/functions")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const RAW_CONTAINER = "toernooien-raw"
const MANIFEST_BLOB = "_manifest.json"
const ORG_ID = 59097676 // Mokum Pool & Darts organisatie
const CONCURRENCY = 6
const API_VERSION = "2020-04-08"

// --- HTTP helpers -----------------------------------------------------------

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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "MokumBot/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject)
        }
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => resolve({ status: res.statusCode, body: data }))
      })
      .on("error", reject)
  })
}

// --- Blob helpers ------------------------------------------------------------

async function ensureContainer(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${RAW_CONTAINER}?restype=container&${sasToken}`,
    method: "PUT",
    headers: { "Content-Length": 0, "x-ms-version": API_VERSION },
  }
  const res = await httpsRequest(options)
  // 201 = aangemaakt, 409 = bestaat al -> beide prima
  if (res.status !== 201 && res.status !== 409) {
    console.log(`Container ensure gaf status ${res.status} (ga door)`)
  }
}

async function putBlob(name, content, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${RAW_CONTAINER}/${encodeURIComponent(name)}?${sasToken}`,
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

async function getBlob(name, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${RAW_CONTAINER}/${encodeURIComponent(name)}?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  }
  const res = await httpsRequest(options)
  if (res.status === 200) return res.body
  return null
}

// --- Kern --------------------------------------------------------------------

async function loadManifest(sasToken) {
  const raw = await getBlob(MANIFEST_BLOB, sasToken)
  if (!raw) return { finished: [], lastSync: null, total: 0 }
  try {
    const m = JSON.parse(raw)
    return { finished: m.finished || [], lastSync: m.lastSync || null, total: m.total || 0 }
  } catch {
    return { finished: [], lastSync: null, total: 0 }
  }
}

// Synchroniseert alle toernooien. Geeft een samenvatting terug.
async function syncTournaments(context, { full = false } = {}) {
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
  if (!sasToken) throw new Error("Geen AZURE_STORAGE_SAS_TOKEN geconfigureerd")

  await ensureContainer(sasToken)

  // 1. Master-index met alle toernooi-IDs ophalen
  const orgRes = await fetchUrl(`https://api.cuescore.com/organization/?id=${ORG_ID}`)
  if (orgRes.status !== 200) throw new Error(`Org-lijst ophalen mislukt (status ${orgRes.status})`)
  const allIds = JSON.parse(orgRes.body)
  if (!Array.isArray(allIds)) throw new Error("Org-respons is geen array")

  // 2. Manifest laden en bepalen wat we moeten ophalen
  const manifest = await loadManifest(sasToken)
  const finishedSet = new Set(manifest.finished)
  const todo = full ? allIds.slice() : allIds.filter((id) => !finishedSet.has(id))

  context.log(`Toernooien totaal: ${allIds.length}, te verwerken: ${todo.length} (full=${full})`)

  // 3. Per toernooi: raw JSON ophalen en archiveren (met begrensde concurrency)
  const result = { total: allIds.length, processed: 0, archived: 0, finished: 0, errors: [] }

  async function worker(queue) {
    while (queue.length) {
      const id = queue.shift()
      try {
        const res = await fetchUrl(`https://api.cuescore.com/tournament/?id=${id}`)
        if (res.status !== 200) throw new Error(`status ${res.status}`)
        // raw body verbatim opslaan = bron van waarheid
        await putBlob(`${id}.json`, res.body, sasToken)
        result.archived++
        const data = JSON.parse(res.body)
        if (data.status === "Finished" || data.statusCode === 2) {
          finishedSet.add(id)
          result.finished++
        }
      } catch (err) {
        result.errors.push({ id, error: err.message })
        context.log(`Toernooi ${id} mislukt: ${err.message}`)
      }
      result.processed++
    }
  }

  const queue = todo.slice()
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

  // 4. Manifest bijwerken
  const newManifest = {
    finished: [...finishedSet],
    total: allIds.length,
    lastSync: new Date().toISOString(),
  }
  await putBlob(MANIFEST_BLOB, JSON.stringify(newManifest, null, 2), sasToken)

  context.log(
    `Sync klaar: ${result.archived} gearchiveerd, ${result.finished} finished, ${result.errors.length} fouten`
  )
  return result
}

// --- Triggers ----------------------------------------------------------------

// Nachtelijk, incrementeel (alleen nieuwe + nog niet afgeronde toernooien)
app.timer("toernooiSyncTimer", {
  schedule: "0 0 4 * * *",
  handler: async (myTimer, context) => {
    try {
      await syncTournaments(context, { full: false })
    } catch (err) {
      context.log("Timer sync fout:", err.message)
    }
  },
})

// Handmatig aanroepbaar; ?full=1 forceert volledige backfill van alle toernooien
app.http("toernooi-sync", {
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
      const full = new URL(request.url).searchParams.get("full") === "1"
      const result = await syncTournaments(context, { full })
      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }
    } catch (error) {
      context.log("Sync endpoint fout:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      }
    }
  },
})
