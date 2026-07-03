// Terugbelverzoeken (#71 — geëxtraheerd uit chat.js): het publieke endpoint waar een bezoeker
// naam + telefoon achterlaat, de NTFY-notificatie, en de dagelijkse AVG-opschoning (#74).
// Deelt de blob-helpers via lib/storage.js.
const { app } = require("@azure/functions")
const { STORAGE_ACCOUNT, httpsRequest, nieuweBlobNaam } = require("./lib/storage")

// Stuurt een NTFY-push + e-mail (via NTFY-forwarding) met alle terugbelgegevens.
// No-op als de NTFY-config (env-vars) ontbreekt, zodat deployen kan vóór de config.
async function stuurTerugbelNotificatie(d) {
  try {
    const base = process.env.NTFY_URL
    const topic = process.env.NTFY_TOPIC
    if (!base || !topic) return { skipped: "NTFY_URL/NTFY_TOPIC ontbreekt" }
    const regels = [
      `Naam: ${d.naam || "-"}`,
      `Telefoon: ${d.telefoon || "-"}`,
      d.onderwerp ? `Onderwerp: ${d.onderwerp}` : null,
      d.voorkeurstijd ? `Voorkeur: ${d.voorkeurstijd}` : null,
      `Aangevraagd: ${d.aangevraagdOp || new Date().toISOString()}`,
    ].filter(Boolean)
    const body = regels.join("\n")
    const u = new URL(base)
    const baseHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      "Title": "Nieuw terugbelverzoek - Mokum",
      "Priority": "high",
      "Tags": "telephone",
    }
    if (process.env.NTFY_TOKEN) baseHeaders["Authorization"] = `Bearer ${process.env.NTFY_TOKEN}`
    const opts = { hostname: u.hostname, port: u.port || 443, path: `/${encodeURIComponent(topic)}`, method: "POST" }
    // Push + e-mail in één publish. Mislukt dat (bijv. e-mailadres niet geverifieerd → 40052),
    // stuur dan de push alsnog zonder e-mail, zodat de melding zelf nooit verloren gaat.
    const metEmail = { ...baseHeaders }
    if (process.env.CONTACT_EMAIL) metEmail["Email"] = process.env.CONTACT_EMAIL // NTFY stuurt dan ook een e-mail
    const r = await httpsRequest({ ...opts, headers: metEmail }, body)
    if (r.status >= 200 && r.status < 300) return { ok: true, status: r.status, email: !!process.env.CONTACT_EMAIL }
    console.log("Terugbel-notificatie (met e-mail) faalde:", r.status, r.body)
    if (!process.env.CONTACT_EMAIL) return { ok: false, status: r.status, body: String(r.body || "").slice(0, 300) }
    const r2 = await httpsRequest({ ...opts, headers: baseHeaders }, body)
    if (r2.status >= 200 && r2.status < 300) return { ok: true, status: r2.status, email: false, emailFaalde: { status: r.status, body: String(r.body || "").slice(0, 300) } }
    console.log("Terugbel-push (zonder e-mail) faalde:", r2.status, r2.body)
    return { ok: false, status: r.status, body: String(r.body || "").slice(0, 300), retryStatus: r2.status, retryBody: String(r2.body || "").slice(0, 300) }
  } catch (err) {
    console.log("Terugbel-notificatie mislukt:", err.message)
    return { error: err.message }
  }
}

// Endpoint: bezoeker laat een terugbelverzoek achter (naam + telefoon verplicht).
// Slaat het op het gesprek-blob op (zodat het in het dashboard verschijnt) en stuurt meldingen.
app.http("terugbelverzoek", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const json = (status, obj) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) })
    try {
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) return json(500, { error: "Geen SAS token" })
      const body = await request.json()
      const cap = (v, n) => (v == null ? "" : String(v).trim().slice(0, n))
      const naam = cap(body.naam, 120)
      const telefoon = cap(body.telefoon, 40)
      const onderwerp = cap(body.onderwerp, 500)
      const voorkeurstijd = cap(body.voorkeurstijd, 200)
      if (!naam || !telefoon) return json(400, { error: "Naam en telefoonnummer zijn verplicht" })

      const aangevraagdOp = new Date().toISOString()
      const terugbelData = { naam, telefoon, onderwerp, voorkeurstijd, aangevraagdOp, status: "nieuw" }

      // Koppel aan een bestaand gesprek als er een geldig conversationId is; anders een nieuw blob.
      let convId = cap(body.conversationId, 80)
      if (convId && (convId.includes("/") || convId.includes(".."))) convId = ""
      const host = `${STORAGE_ACCOUNT}.blob.core.windows.net`
      let data = null
      if (convId) {
        try {
          const got = await httpsRequest({ hostname: host, path: `/gesprekken/${encodeURIComponent(convId)}?${sasToken}`, method: "GET", headers: { "x-ms-version": "2020-04-08" } })
          if (got.status === 200) { try { data = JSON.parse(got.body) } catch {} }
        } catch {}
      }
      let blobName = convId
      if (!data) {
        // Geen (geldig) gesprek gevonden → nieuw minimaal gesprek aanmaken zodat het in de lijst verschijnt.
        blobName = nieuweBlobNaam()
        data = { timestamp: aangevraagdOp, messages: [{ role: "user", content: onderwerp || "Terugbelverzoek" }], reply: "", isTest: !!body.isTest }
      }
      data.terugbelVerzoek = true
      data.terugbelAfgehandeld = false
      data.terugbelData = terugbelData

      const content = JSON.stringify(data, null, 2)
      await httpsRequest({
        hostname: host,
        path: `/gesprekken/${encodeURIComponent(blobName)}?${sasToken}`,
        method: "PUT",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(content), "x-ms-blob-type": "BlockBlob", "x-ms-version": "2020-04-08" },
      }, content)

      // Meldingen (NTFY-push + e-mail). Await zodat het in Azure Functions zeker afrondt
      // vóór de response (en de status gelogd wordt); blokkeert het opslaan verder niet.
      await stuurTerugbelNotificatie(terugbelData)

      return json(200, { success: true })
    } catch (error) {
      context.log("terugbelverzoek error:", error)
      return json(500, { error: error.message })
    }
  },
})

// Dagelijkse AVG-opschoning: verwijdert de persoonsgegevens van terugbelverzoeken ouder dan 30 dagen.
app.timer("terugbelOpschonen", {
  schedule: "0 0 3 * * *", // elke dag om 03:00 (Amsterdam ~ UTC; exacte tijd niet kritisch)
  handler: async (myTimer, context) => {
    try {
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) return
      const host = `${STORAGE_ACCOUNT}.blob.core.windows.net`
      const grens = Date.now() - 30 * 24 * 60 * 60 * 1000
      let marker = ""
      let geredigeerd = 0
      do {
        const listPath = `/gesprekken?restype=container&comp=list&maxresults=500${marker ? `&marker=${encodeURIComponent(marker)}` : ""}&${sasToken}`
        const res = await httpsRequest({ hostname: host, path: listPath, method: "GET", headers: { "x-ms-version": "2020-04-08" } })
        const namen = [...res.body.matchAll(/<Name>([^<]+)<\/Name>/g)].map(m => m[1])
        marker = (res.body.match(/<NextMarker>([^<]*)<\/NextMarker>/) || [])[1] || ""
        for (const naam of namen) {
          try {
            const got = await httpsRequest({ hostname: host, path: `/gesprekken/${encodeURIComponent(naam)}?${sasToken}`, method: "GET", headers: { "x-ms-version": "2020-04-08" } })
            if (got.status !== 200) continue
            let data; try { data = JSON.parse(got.body) } catch { continue }
            const td = data && data.terugbelData
            if (!td || td.verlopen) continue
            const aangevraagd = Date.parse(td.aangevraagdOp || data.timestamp || "")
            if (!aangevraagd || aangevraagd > grens) continue
            // Persoonsgegevens redigeren, het gesprek zelf behouden.
            data.terugbelData = { aangevraagdOp: td.aangevraagdOp, status: td.status || "verlopen", verlopen: true }
            // Bij een terugbel-only gesprek (geen echte chat) staat de vrije tekst 'onderwerp' ook in
            // messages[0] — die kopie ook redigeren, anders blijft PII na 30 dagen achter (#74).
            // Echte chats (reply gevuld of meerdere berichten) laten we ongemoeid.
            if (data.terugbelVerzoek && !data.reply && Array.isArray(data.messages) && data.messages.length === 1) {
              data.messages = [{ role: "user", content: "[terugbelverzoek — persoonsgegevens verwijderd]" }]
            }
            const content = JSON.stringify(data, null, 2)
            await httpsRequest({ hostname: host, path: `/gesprekken/${encodeURIComponent(naam)}?${sasToken}`, method: "PUT", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(content), "x-ms-blob-type": "BlockBlob", "x-ms-version": "2020-04-08" } }, content)
            geredigeerd++
          } catch {}
        }
      } while (marker)
      context.log(`Terugbel-opschoning: ${geredigeerd} verzoek(en) geredigeerd (>30 dagen).`)
    } catch (err) {
      context.log("Terugbel-opschoning mislukt:", err.message)
    }
  },
})
