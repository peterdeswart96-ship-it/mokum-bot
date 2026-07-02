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
const META_BLOB = "_meta.json"
const API_VERSION = "2020-04-08"
// Foto's worden via de Functie geserveerd (proxy met server-side SAS) — de
// container is niet publiek toegankelijk. Absolute URL zodat de afbeelding ook
// vanaf de klant-website (embed-widget) laadt.
const FUNC_BASE = "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"
// sha256("mkm!") — zelfde dashboard-wachtwoord als de auth/cleanup endpoints
const DASHBOARD_HASH = process.env.DASHBOARD_HASH || "e76ba1957d8c978fc25c9ca24af6280569876436d3fe9ca6418a43144f2f7265"

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

// Foto's worden geserveerd via de proxy-route /api/foto/<bestand> (SAS server-side).
function proxyUrl(name) {
  return `${FUNC_BASE}/api/foto/${encodeURIComponent(name)}`
}

// Borgt dat de container bestaat (privé; toegang loopt via de proxy-Functie).
async function ensureContainer(sasToken) {
  const res = await httpsRequest({
    hostname: host(),
    path: `/${FOTOS_CONTAINER}?restype=container&${sasToken}`,
    method: "PUT",
    headers: { "Content-Length": 0, "x-ms-version": API_VERSION },
  })
  // 201 = aangemaakt, 409 = bestaat al — beide prima
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Container borgen status ${res.status}: ${res.body.slice(0, 200)}`)
  }
  return { ok: true }
}

// Haalt de ruwe bytes van een blob op (voor de proxy-route).
function getBlobBytes(name, sasToken) {
  return new Promise((resolve, reject) => {
    https
      .get(
        { hostname: host(), path: `/${FOTOS_CONTAINER}/${encodeURIComponent(name)}?${sasToken}`, headers: { "x-ms-version": API_VERSION } },
        (res) => {
          const chunks = []
          res.on("data", (c) => chunks.push(c))
          res.on("end", () =>
            resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "application/octet-stream" })
          )
        }
      )
      .on("error", reject)
  })
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

// --- Vast referentienummer per foto (issue #55): "Pool-03", per categorie ---
// Prefix uit de categorie (eerste woord, alfanumeriek). Wordt één keer toegekend
// en blijft daarna vast (ook als de categorie later wijzigt).
function refPrefix(categorie) {
  const eerste = String(categorie || "Overig").split(/[&,/]/)[0].trim()
  const clean = eerste.replace(/[^a-zA-Z0-9]/g, "")
  const p = clean || "Overig"
  return p.charAt(0).toUpperCase() + p.slice(1)
}

// _meta.json houdt per prefix de laatst uitgegeven teller bij (nooit hergebruikt).
async function getMeta(sasToken) {
  const res = await httpsRequest({
    hostname: host(),
    path: `/${FOTOS_CONTAINER}/${META_BLOB}?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  })
  if (res.status === 200) {
    try { const m = JSON.parse(res.body); return m && m.counters ? m : { counters: {} } } catch { return { counters: {} } }
  }
  return { counters: {} }
}

async function putMeta(meta, sasToken) {
  const content = Buffer.from(JSON.stringify(meta, null, 2), "utf-8")
  await httpsRequest({
    hostname: host(),
    path: `/${FOTOS_CONTAINER}/${META_BLOB}?${sasToken}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": content.length,
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": API_VERSION,
    },
  }, content)
}

// Geeft het volgende referentienummer voor deze categorie en verhoogt de teller.
function nextRef(meta, categorie) {
  const p = refPrefix(categorie)
  const n = (meta.counters[p] || 0) + 1
  meta.counters[p] = n
  return `${p}-${String(n).padStart(2, "0")}`
}

app.http("fotos", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }

    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return json(500, { error: "Geen SAS token geconfigureerd" })

    try {
      // GET -> catalogus teruggeven (zonder de verborgen 'echte gezichten'-bestandsnaam)
      if (request.method === "GET") {
        const catalog = await getCatalog(sasToken)
        const veilig = catalog.map(({ bestandEcht, ...rest }) => rest)
        return json(200, { fotos: veilig })
      }

      const body = await request.json()
      const action = body.action || "upload"

      // Alle muterende acties zijn wachtwoord-gated
      if (!checkPwd(body.wachtwoord)) {
        return json(401, { error: "Onjuist wachtwoord" })
      }

      if (action === "ensure") {
        const r = await ensureContainer(sasToken)
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
        const ct = contentType || "application/octet-stream"
        await ensureContainer(sasToken)

        async function putBlob(naam, b64) {
          const bytes = Buffer.from(b64, "base64")
          const res = await httpsRequest({
            hostname: host(),
            path: `/${FOTOS_CONTAINER}/${encodeURIComponent(naam)}?${sasToken}`,
            method: "PUT",
            headers: { "Content-Type": ct, "Content-Length": bytes.length, "x-ms-blob-type": "BlockBlob", "x-ms-version": API_VERSION },
          }, bytes)
          return res.status === 201
        }

        // Bevat de foto gezichten én is er een smiley-versie meegestuurd? Dan bewaren
        // we beide: smiley = standaard getoond (publieke naam), origineel = verborgen
        // (willekeurige naam, alleen getoond als de beheerder 'echte gezichten' aanzet).
        const heeftGezichten = !!body.heeftGezichten && !!body.contentBase64Smiley
        let entry
        if (heeftGezichten) {
          const dot = veilig.lastIndexOf(".")
          const base = dot > 0 ? veilig.slice(0, dot) : veilig
          const ext = dot > 0 ? veilig.slice(dot) : ".jpg"
          const echtNaam = `${base}-echt-${crypto.randomBytes(4).toString("hex")}${ext}`
          const okSmiley = await putBlob(veilig, body.contentBase64Smiley)
          const okEcht = await putBlob(echtNaam, body.contentBase64)
          if (!okSmiley || !okEcht) return json(500, { error: "Upload mislukt" })
          entry = {
            bestand: veilig, url: proxyUrl(veilig), bestandEcht: echtNaam,
            heeftGezichten: true, toonEcht: false,
            categorie: categorie || "Overig", onderschrift: onderschrift || "", triggerWords, weergave,
            actief: body.actief === undefined ? true : !!body.actief,
          }
        } else {
          const ok = await putBlob(veilig, body.contentBase64)
          if (!ok) return json(500, { error: "Upload mislukt" })
          entry = {
            bestand: veilig, url: proxyUrl(veilig),
            heeftGezichten: false, toonEcht: true,
            categorie: categorie || "Overig", onderschrift: onderschrift || "", triggerWords, weergave,
            actief: body.actief === undefined ? true : !!body.actief,
          }
        }
        const catalog = await getCatalog(sasToken)
        const idx = catalog.findIndex((f) => f.bestand === veilig)
        if (idx >= 0) {
          // Her-upload van dezelfde bestandsnaam: ref blijft behouden (entry heeft geen ref-key).
          catalog[idx] = { ...catalog[idx], ...entry }
          if (!catalog[idx].ref) {
            const meta = await getMeta(sasToken)
            catalog[idx].ref = nextRef(meta, catalog[idx].categorie)
            await putMeta(meta, sasToken)
          }
          entry.ref = catalog[idx].ref
        } else {
          const meta = await getMeta(sasToken)
          entry.ref = nextRef(meta, entry.categorie)
          await putMeta(meta, sasToken)
          catalog.push(entry)
        }
        await putCatalog(catalog, sasToken)

        context.log(`Foto geupload: ${veilig} (${weergave}, gezichten=${heeftGezichten}, ref=${entry.ref})`)
        const { bestandEcht, ...veiligEntry } = entry
        return json(200, { success: true, foto: veiligEntry })
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
        if (body.gelabeldDoorClaude !== undefined) catalog[idx].gelabeldDoorClaude = !!body.gelabeldDoorClaude
        // Echte gezichten tonen i.p.v. smilies (alleen mogelijk als er een verborgen origineel is)
        if (body.toonEcht !== undefined && catalog[idx].bestandEcht) {
          catalog[idx].toonEcht = !!body.toonEcht
          catalog[idx].url = catalog[idx].toonEcht ? proxyUrl(catalog[idx].bestandEcht) : proxyUrl(catalog[idx].bestand)
        }
        await putCatalog(catalog, sasToken)
        const { bestandEcht, ...veiligEntry } = catalog[idx]
        return json(200, { success: true, foto: veiligEntry })
      }

      if (action === "delete") {
        const { bestand } = body
        if (!bestand) return json(400, { error: "bestand is verplicht" })
        const catalog = await getCatalog(sasToken)
        const entry = catalog.find((f) => f.bestand === bestand)
        async function delBlob(naam) {
          if (!naam) return
          await httpsRequest({
            hostname: host(),
            path: `/${FOTOS_CONTAINER}/${encodeURIComponent(naam)}?${sasToken}`,
            method: "DELETE",
            headers: { "x-ms-version": API_VERSION },
          })
        }
        await delBlob(bestand)
        if (entry && entry.bestandEcht) await delBlob(entry.bestandEcht) // ook het verborgen origineel
        const next = catalog.filter((f) => f.bestand !== bestand)
        await putCatalog(next, sasToken)
        return json(200, { success: true })
      }

      // Kent vaste referentienummers toe aan alle foto's die er nog geen hebben (issue #55).
      if (action === "assign-refs") {
        const catalog = await getCatalog(sasToken)
        const meta = await getMeta(sasToken)
        let toegekend = 0
        for (const f of catalog) {
          if (!f.ref) { f.ref = nextRef(meta, f.categorie); toegekend++ }
        }
        await putMeta(meta, sasToken)
        await putCatalog(catalog, sasToken)
        context.log(`Referentienummers toegekend: ${toegekend}/${catalog.length}`)
        return json(200, { success: true, toegekend, totaal: catalog.length })
      }

      return json(400, { error: `Onbekende actie: ${action}` })
    } catch (error) {
      context.log("Fotos endpoint fout:", error)
      return json(500, { error: error.message })
    }
  },
})

// Proxy-route: serveert een foto/PDF uit de privé-container met de server-side SAS.
app.http("foto-file", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "foto/{name}",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return { status: 500, body: "Geen SAS token" }
    try {
      const name = request.params.name
      // Interne bestanden (catalogus e.d.) nooit publiek serveren
      if (!name || name.startsWith("_")) return { status: 404, headers: corsHeaders, body: "Niet gevonden" }
      const blob = await getBlobBytes(name, sasToken)
      if (blob.status !== 200) {
        return { status: blob.status === 404 ? 404 : 502, headers: corsHeaders, body: "Foto niet gevonden" }
      }
      return {
        status: 200,
        headers: {
          "Content-Type": blob.contentType,
          "Content-Length": blob.buffer.length,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
        body: blob.buffer,
      }
    } catch (error) {
      context.log("Foto-proxy fout:", error)
      return { status: 500, headers: corsHeaders, body: "Fout bij ophalen foto" }
    }
  },
})
