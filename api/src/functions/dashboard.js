// Dashboard-endpoints (#71 — geëxtraheerd uit chat.js): beheer van gesprekken + de Claude-
// ondersteunde beheeracties (analyse, kennisbron-upload/-suggestie, foto-suggestie, vertaal).
// Alle beheer-beveiligd via autoriseer() — dual-mode: Entra-token óf gedeeld wachtwoord (#42) — en met dashboard-CORS. Deelt helpers via lib/.
const { app } = require("@azure/functions")
const Anthropic = require("@anthropic-ai/sdk")
const { STORAGE_ACCOUNT, CONTAINER, httpsRequest, fetchBlobContent, listAllBlobs } = require("./lib/storage")
const { autoriseer, magMinstens } = require("./_auth")
const { dashboardCors } = require("./lib/cors")
const { leesClaudeTekst } = require("./lib/claude")

app.http("gesprekken", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "GET, POST, OPTIONS")
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    try {
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) {
        return {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Geen SAS token geconfigureerd" }),
        }
      }
      const action = new URL(request.url).searchParams.get("action") || "list"
      const blobName = new URL(request.url).searchParams.get("blob")
      if (action === "list") {
        const options = {
          hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
          path: `/gesprekken?restype=container&comp=list&maxresults=500&${sasToken}`,
          method: "GET",
          headers: { "x-ms-version": "2020-04-08" },
        }
        const result = await httpsRequest(options)
        const matches = [...result.body.matchAll(/<Name>([^<]+)<\/Name>/g)]
        const namen = matches.map(m => m[1])
        return {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ namen }),
        }
      }
      if (action === "get" && blobName) {
        const options = {
          hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
          path: `/gesprekken/${encodeURIComponent(blobName)}?${sasToken}`,
          method: "GET",
          headers: { "x-ms-version": "2020-04-08" },
        }
        const result = await httpsRequest(options)
        return {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: result.body,
        }
      }
      // Eén gesprek verwijderen of als testvraag (de)markeren. Beveiligd met dashboard-wachtwoord.
      if ((action === "delete" || action === "mark") && request.method === "POST") {
        let cbody = {}
        try { cbody = await request.json() } catch {}
        const auth = await autoriseer(request, cbody)
        if (!auth.ok) return { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onjuist wachtwoord" }) }
        // Verwijderen = superuser; markeren (triage) = users (#43).
        if (!magMinstens(auth.roles, action === "delete" ? "superuser" : "users")) return { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onvoldoende rechten voor deze actie" }) }
        const naam = cbody.blob
        if (!naam || naam.includes("/") || naam.includes("..")) {
          return { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Ongeldige blobnaam" }) }
        }
        if (action === "delete") {
          const delOpts = {
            hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
            path: `/gesprekken/${encodeURIComponent(naam)}?${sasToken}`,
            method: "DELETE",
            headers: { "x-ms-version": "2020-04-08" },
          }
          const r = await httpsRequest(delOpts)
          return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ success: r.status === 202 }) }
        }
        // action === "mark": lees het gesprek, zet isTest, schrijf terug
        const getOpts = {
          hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
          path: `/gesprekken/${encodeURIComponent(naam)}?${sasToken}`,
          method: "GET",
          headers: { "x-ms-version": "2020-04-08" },
        }
        const got = await httpsRequest(getOpts)
        let data = {}
        try { data = JSON.parse(got.body) } catch {}
        // Alleen meegestuurde vlaggen wijzigen (zodat OK-markering de test-vlag niet wist, en omgekeerd)
        if (cbody.isTest !== undefined) data.isTest = !!cbody.isTest
        if (cbody.afgehandeld !== undefined) data.afgehandeld = !!cbody.afgehandeld
        if (cbody.teReviewen !== undefined) data.teReviewen = !!cbody.teReviewen
        if (cbody.fotoNodig !== undefined) data.fotoNodig = !!cbody.fotoNodig
        if (cbody.terugbelAfgehandeld !== undefined) data.terugbelAfgehandeld = !!cbody.terugbelAfgehandeld
        const newContent = JSON.stringify(data, null, 2)
        const putOpts = {
          hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
          path: `/gesprekken/${encodeURIComponent(naam)}?${sasToken}`,
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(newContent),
            "x-ms-blob-type": "BlockBlob",
            "x-ms-version": "2020-04-08",
          },
        }
        await httpsRequest(putOpts, newContent)
        return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ success: true, isTest: data.isTest, afgehandeld: data.afgehandeld, teReviewen: data.teReviewen, fotoNodig: data.fotoNodig, terugbelAfgehandeld: data.terugbelAfgehandeld }) }
      }
      // Opschonen — verwijdert gesprekken vóór een datum. Beveiligd met dashboard-wachtwoord.
      if (action === "cleanup" && request.method === "POST") {
        let cbody = {}
        try { cbody = await request.json() } catch {}
        const { voor, dryrun } = cbody
        const auth = await autoriseer(request, cbody)
        if (!auth.ok) return { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onjuist wachtwoord" }) }
        // Bulk verwijderen = superuser (#43).
        if (!magMinstens(auth.roles, "superuser")) return { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onvoldoende rechten voor deze actie" }) }
        if (!voor || !/^\d{4}-\d{2}-\d{2}(T\d{2}-\d{2}(-\d{2})?)?$/.test(voor)) {
          return { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Geef 'voor' op als YYYY-MM-DD of YYYY-MM-DDThh-mm (zoals de tijd in de blobnaam staat; nieuwe gesprekken staan in Amsterdam-tijd)" }) }
        }
        // Alle blobs listen (met paginatie via NextMarker)
        const namen = []
        let marker = ""
        do {
          const listOpts = {
            hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
            path: `/gesprekken?restype=container&comp=list&maxresults=5000${marker ? `&marker=${encodeURIComponent(marker)}` : ""}&${sasToken}`,
            method: "GET",
            headers: { "x-ms-version": "2020-04-08" },
          }
          const res = await httpsRequest(listOpts)
          namen.push(...[...res.body.matchAll(/<Name>([^<]+)<\/Name>/g)].map(m => m[1]))
          const nm = res.body.match(/<NextMarker>([^<]*)<\/NextMarker>/)
          marker = nm ? nm[1] : ""
        } while (marker)
        // Naam begint met de ISO-datum (YYYY-MM-DD); verwijder alles vóór 'voor'
        const teVerwijderen = namen.filter((n) => n.slice(0, voor.length) < voor)
        if (dryrun) {
          return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ dryrun: true, totaal: namen.length, zou_verwijderen: teVerwijderen.length, behoudt: namen.length - teVerwijderen.length, voorbeeld: teVerwijderen.slice(0, 5) }) }
        }
        let verwijderd = 0
        let fouten = 0
        for (const n of teVerwijderen) {
          const delOpts = {
            hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
            path: `/gesprekken/${encodeURIComponent(n)}?${sasToken}`,
            method: "DELETE",
            headers: { "x-ms-version": "2020-04-08" },
          }
          const r = await httpsRequest(delOpts)
          if (r.status === 202) verwijderd++
          else fouten++
        }
        return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ verwijderd, fouten, behouden: namen.length - teVerwijderen.length }) }
      }
      return {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Ongeldige actie" }),
      }
    } catch (error) {
      context.log("Gesprekken error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      }
    }
  },
})

// Analyse endpoint — voor het dashboard
// Ontvangt gesprekken van de frontend en roept Claude aan via de server (geen CORS problemen)
app.http("analyse", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    try {
      const body = await request.json()
      const auth = await autoriseer(request, body)
      if (!auth.ok) return { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onjuist wachtwoord" }) }
      // AI-analyse genereren (Claude, kost geld) = admin (#43).
      if (!magMinstens(auth.roles, "admin")) return { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onvoldoende rechten voor deze actie" }) }
      const { gesprekken, type } = body
      if (!gesprekken || !Array.isArray(gesprekken)) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "gesprekken array required" }),
        }
      }

      // Bouw gespreksdata op voor de AI — bewust kort houden
      const vragenTekst = gesprekken.slice(0, 30).map((g, i) => {
        const vragen = (g.messages || []).filter(m => m.role === "user").map(m => m.content?.substring(0, 80)).join(" | ")
        return `${i + 1}. ${vragen}`
      }).join("\n")

      const systemMark = `Analyseer chatbot gesprekken van Mokum Pool & Darts. Geef advies in het Nederlands. Antwoord ALLEEN in geldig JSON zonder markdown:
{"inzicht":"2 zinnen samenvatting","veelgesteld":[{"vraag":"vraag","count":1,"onderwerp":"onderwerp"}],"fouten_of_verbeteringen":[{"probleem":"probleem","suggestie":"suggestie"}],"nieuwe_rubrieken":["rubriek"],"kennisbron_tips":["tip"],"prioriteit":"hoog"}`

      const systemSander = `Analyseer chatbot gesprekken. Bepaal welke info ontbreekt op poolen-amsterdam.nl. Antwoord ALLEEN in geldig JSON zonder markdown:
{"inzicht":"2 zinnen samenvatting","ontbrekende_info":[{"onderwerp":"onderwerp","beschrijving":"beschrijving","prioriteit":"hoog"}],"pagina_verbeteringen":[{"pagina":"pagina","verbetering":"verbetering"}],"veel_gestelde_vragen":[{"vraag":"vraag","antwoord_aanwezig_op_site":true}],"samenvatting":"3 actiepunten"}`

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: type === "sander" ? systemSander : systemMark,
        messages: [{ role: "user", content: `Analyseer deze ${Math.min(gesprekken.length, 50)} gesprekken van de Mokum Bot:\n\n${vragenTekst}` }],
      })

      const text = leesClaudeTekst(response)
      let analyse
      try {
        // Probeer direct te parsen
        analyse = JSON.parse(text.replace(/```json|```/g, "").trim())
      } catch (parseErr) {
        // JSON afgekapt — probeer te repareren door af te sluiten
        context.log("JSON parse fout, poging tot herstel:", parseErr.message)
        let cleaned = text.replace(/```json|```/g, "").trim()
        // Sluit openstaande strings en objecten
        const openBraces = (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length
        const openBrackets = (cleaned.match(/\[/g) || []).length - (cleaned.match(/\]/g) || []).length
        if (cleaned.endsWith(",")) cleaned = cleaned.slice(0, -1)
        for (let i = 0; i < openBrackets; i++) cleaned += "]"
        for (let i = 0; i < openBraces; i++) cleaned += "}"
        try {
          analyse = JSON.parse(cleaned)
          context.log("JSON hersteld na reparatie")
        } catch (e2) {
          // Geef fallback terug als alles mislukt
          analyse = {
            inzicht: "Analyse gedeeltelijk gelukt — te veel data voor volledige verwerking. Probeer met een kleinere periode.",
            veelgesteld: [], fouten_of_verbeteringen: [], nieuwe_rubrieken: [], kennisbron_tips: [], prioriteit: "laag",
            ontbrekende_info: [], pagina_verbeteringen: [], veel_gestelde_vragen: [], samenvatting: "Probeer opnieuw met een kortere periode."
          }
        }
      }

      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ analyse }),
      }
    } catch (error) {
      context.log("Analyse error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      }
    }
  },
})

// Kennisbron upload endpoint — voor de upload wizard in het dashboard
app.http("kennisbron-upload", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "GET, POST, OPTIONS")
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    // GET: bestaande kennisbron lezen (?pad=map/bestand.txt) of lijst (?list=1)
    if (request.method === "GET") {
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) return { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Geen SAS token" }) }
      const url = new URL(request.url)
      if (url.searchParams.get("list") === "1") {
        const blobs = await listAllBlobs(sasToken)
        return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ bestanden: blobs }) }
      }
      const pad = url.searchParams.get("pad")
      if (!pad) return { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Geef ?pad=map/bestand.txt of ?list=1" }) }
      const inhoud = await fetchBlobContent(pad, sasToken)
      if (inhoud === null) return { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Niet gevonden" }) }
      return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ pad, inhoud }) }
    }
    try {
      const body = await request.json()
      const auth = await autoriseer(request, body)
      if (!auth.ok) return { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onjuist wachtwoord" }) }
      // Kennisbron uploaden = admin (#43).
      if (!magMinstens(auth.roles, "admin")) return { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onvoldoende rechten voor deze actie" }) }
      const { bestandsnaam, map, inhoud } = body

      if (!bestandsnaam || !map || !inhoud) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "bestandsnaam, map en inhoud zijn verplicht" }),
        }
      }

      // Valideer bestandsnaam — alleen letters, cijfers, koppeltekens en punt
      const veiligBestandsnaam = bestandsnaam.replace(/[^a-zA-Z0-9\-_.]/g, "-").toLowerCase()
      const blobPath = `${map}/${veiligBestandsnaam}`

      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) {
        return {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Geen SAS token geconfigureerd" }),
        }
      }

      const contentBytes = Buffer.from(inhoud, "utf-8")
      const options = {
        hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
        path: `/${CONTAINER}/${encodeURIComponent(map)}/${encodeURIComponent(veiligBestandsnaam)}?${sasToken}`,
        method: "PUT",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Length": contentBytes.length,
          "x-ms-blob-type": "BlockBlob",
          "x-ms-version": "2020-04-08",
        },
      }

      const result = await httpsRequest(options, contentBytes)

      if (result.status === 201) {
        context.log(`Kennisbron geupload: ${blobPath}`)
        return {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, pad: blobPath }),
        }
      } else {
        context.log(`Upload mislukt (${result.status}):`, result.body)
        return {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Upload mislukt: HTTP ${result.status}` }),
        }
      }
    } catch (error) {
      context.log("Upload error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      }
    }
  },
})

// AI-suggestie voor de geleide kennis-wizard: stelt titel + categorie + concept-inhoud voor.
// Verzint nooit feiten; ontbrekende info wordt een [VUL AAN: ...]-placeholder.
app.http("kennis-suggestie", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const json = (status, obj) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) })
    try {
      const body = await request.json()
      const auth = await autoriseer(request, body)
      if (!auth.ok) return json(401, { error: "Onjuist wachtwoord" })
      // AI kennis-suggestie (Claude) = admin (#43).
      if (!magMinstens(auth.roles, "admin")) return json(403, { error: "Onvoldoende rechten voor deze actie" })
      const omschrijving = (body.omschrijving || "").toString().trim()
      const vraag = (body.vraag || "").toString().trim()
      const antwoord = (body.antwoord || "").toString().trim()
      const categorieen = Array.isArray(body.categorieen) && body.categorieen.length ? body.categorieen : ["algemeen"]
      const bedrijf = (body.bedrijf || "deze zaak").toString().trim()
      if (!omschrijving && !vraag) return json(400, { error: "omschrijving of vraag vereist" })

      const system = `Je helpt een beheerder kennis toe te voegen aan de chatbot van ${bedrijf}. Op basis van de input stel je voor: een korte duidelijke TITEL, de best passende CATEGORIE (kies er exact één uit de gegeven lijst), een kebab-case BESTANDSNAAM (kleine letters, koppeltekens, eindigend op .txt), en een nette concept-INHOUD voor de kennisbron in helder Nederlands.

Regels voor de inhoud:
- Baseer je UITSLUITEND op de gegeven informatie. Verzin GEEN feiten (prijzen, tijden, namen, aantallen).
- Ontbreekt concrete info? Zet dan een duidelijke placeholder zoals "[VUL AAN: ...]" zodat de beheerder het invult.
- Schrijf feitelijke kennis (geen chat-antwoord), kort en gestructureerd, eventueel met opsommingen.

Antwoord ALLEEN met geldig JSON, zonder markdown:
{"titel":"...","categorie":"één-uit-de-lijst","bestandsnaam":"kebab-naam.txt","inhoud":"..."}`

      const userMsg = `Toegestane categorieën: ${categorieen.join(", ")}

${vraag ? `Een bezoeker stelde deze vraag aan de bot:\n"${vraag}"\n` : ""}${antwoord ? `\nDe bot antwoordde nu (mogelijk onvolledig/onjuist):\n"${antwoord.substring(0, 600)}"\n` : ""}
Omschrijving van wat de beheerder wil toevoegen:
${omschrijving || "(geen extra omschrijving — leid het af uit de vraag)"}`

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        // Zeldzaam + hoogwaardig (admin voegt kennis toe) → sterker model dan de bot (Haiku).
        // Kosten verwaarloosbaar bij lage frequentie; veel betere structuur/instructie-naleving.
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMsg }],
      })

      let text = leesClaudeTekst(response).replace(/```json|```/g, "").trim()
      let suggestie
      try {
        suggestie = JSON.parse(text)
      } catch (e) {
        let c = text
        if (c.endsWith(",")) c = c.slice(0, -1)
        const ob = (c.match(/\{/g) || []).length - (c.match(/\}/g) || []).length
        for (let i = 0; i < ob; i++) c += "}"
        try { suggestie = JSON.parse(c) } catch (e2) { suggestie = null }
      }
      if (!suggestie || !suggestie.titel) return json(502, { error: "AI-suggestie kon niet worden gelezen" })

      // Normaliseer: geldige categorie + nette .txt-bestandsnaam
      if (!categorieen.includes(suggestie.categorie)) suggestie.categorie = categorieen[0]
      let bn = (suggestie.bestandsnaam || suggestie.titel || "kennis").toString().toLowerCase().replace(/\.txt$/i, "")
      bn = bn.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "kennis"
      suggestie.bestandsnaam = bn + ".txt"
      return json(200, { suggestie })
    } catch (error) {
      context.log("kennis-suggestie error:", error)
      return json(500, { error: error.message })
    }
  },
})

// AI-suggestie voor de foto-wizard: bekijkt de foto (vision) en stelt
// categorie + onderschrift + trigger words voor. Verzint niets.
app.http("foto-suggestie", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const json = (status, obj) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) })
    try {
      const body = await request.json()
      const auth = await autoriseer(request, body)
      if (!auth.ok) return json(401, { error: "Onjuist wachtwoord" })
      // AI foto-suggestie (Claude) = users — personeel mag de fotohulp gebruiken (#43).
      if (!magMinstens(auth.roles, "users")) return json(403, { error: "Onvoldoende rechten voor deze actie" })
      const b64 = body.contentBase64
      const mediaType = body.contentType || "image/jpeg"
      const categorieen = Array.isArray(body.categorieen) && body.categorieen.length ? body.categorieen : ["Overig"]
      const bedrijf = (body.bedrijf || "deze zaak").toString().trim()
      if (!b64) return json(400, { error: "contentBase64 vereist" })

      const system = `Je helpt een beheerder een foto labelen voor de chatbot van ${bedrijf}. Bekijk de foto en stel voor:
- CATEGORIE: kies exact één uit de gegeven lijst die het beste past bij wat je ziet.
- ONDERSCHRIFT: een korte, natuurlijke beschrijving in het Nederlands (bijv. "De dartborden bij Mokum").
- TRIGGERWORDS: woorden/zinnen waarbij de bot deze foto moet tonen, in het Nederlands ÉN Engels, komma-gescheiden (bijv. "dartbord, dartborden, darts, dartboard").

Baseer je UITSLUITEND op wat je echt op de foto ziet — verzin geen details.
Antwoord ALLEEN met geldig JSON, zonder markdown:
{"categorie":"één-uit-de-lijst","onderschrift":"...","triggerWords":"komma,gescheiden,woorden"}`

      const userContent = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
        { type: "text", text: `Toegestane categorieën: ${categorieen.join(", ")}\n\nLabel deze foto volgens de instructies.` },
      ]

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: userContent }],
      })

      let text = leesClaudeTekst(response).replace(/```json|```/g, "").trim()
      let s
      try {
        s = JSON.parse(text)
      } catch (e) {
        let c = text
        if (c.endsWith(",")) c = c.slice(0, -1)
        const ob = (c.match(/\{/g) || []).length - (c.match(/\}/g) || []).length
        for (let i = 0; i < ob; i++) c += "}"
        try { s = JSON.parse(c) } catch (e2) { s = null }
      }
      if (!s || !s.categorie) return json(502, { error: "AI-suggestie kon niet worden gelezen" })
      // Foto-categorieën zijn vrije tekst — Claude mag een bestaande categorie kiezen of een passende nieuwe voorstellen.
      if (Array.isArray(s.triggerWords)) s.triggerWords = s.triggerWords.join(", ")
      return json(200, { suggestie: s })
    } catch (error) {
      context.log("foto-suggestie error:", error)
      return json(500, { error: error.message })
    }
  },
})

// Vertaalt een kennisbron naar een andere taal en slaat 'm op als <basis>.en.txt.
// Zo krijgt een EN-bezoeker direct de EN-versie i.p.v. een live-vertaling.
app.http("kennisbron-vertaal", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = dashboardCors(request, "POST, OPTIONS")
    if (request.method === "OPTIONS") return { status: 204, headers: corsHeaders }
    const json = (status, obj) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(obj) })
    try {
      const body = await request.json()
      const auth = await autoriseer(request, body)
      if (!auth.ok) return json(401, { error: "Onjuist wachtwoord" })
      // AI kennisbron-vertaling (Claude) = admin (#43).
      if (!magMinstens(auth.roles, "admin")) return json(403, { error: "Onvoldoende rechten voor deze actie" })
      const pad = (body.pad || "").toString().trim()
      const doel = (body.doelTaal || "en").toString().trim()
      if (!pad || /\.en\.(txt|md)$/i.test(pad)) return json(400, { error: "geldig bron-pad vereist (geen .en-bestand)" })
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      if (!sasToken) return json(500, { error: "Geen SAS token" })
      const inhoud = await fetchBlobContent(pad, sasToken)
      if (inhoud === null || !inhoud.trim()) return json(404, { error: "Bron niet gevonden of leeg" })

      const taalNaam = doel === "en" ? "Engels" : doel
      const system = `Je bent een professionele vertaler voor de chatbot van Mokum Pool & Darts. Vertaal de gegeven kennisbron-tekst naar het ${taalNaam}.
Regels:
- Behoud de structuur exact: markdown-koppen (#), opsommingen (-, *), lege regels en scheidingslijnen (---).
- Vertaal NIET: eigennamen/merknamen (Mokum, pomerans, Winmau, straat- en persoonsnamen), prijzen, tijden, getallen, URL's en e-mailadressen.
- Vertaal natuurlijk en VOLLEDIG — laat geen woorden in de brontaal staan.
- Geef ALLEEN de vertaalde tekst terug, zonder uitleg en zonder markdown-codeblokken.`

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: inhoud }],
      })
      const vertaald = leesClaudeTekst(response).trim()
      if (!vertaald) return json(502, { error: "Lege vertaling" })

      const enPad = pad.replace(/\.(txt|md)$/i, ".en.$1")
      const encodedPath = enPad.split("/").map(s => encodeURIComponent(s)).join("/")
      const contentBytes = Buffer.from(vertaald, "utf-8")
      const result = await httpsRequest({
        hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
        path: `/${CONTAINER}/${encodedPath}?${sasToken}`,
        method: "PUT",
        headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Length": contentBytes.length, "x-ms-blob-type": "BlockBlob", "x-ms-version": "2020-04-08" },
      }, contentBytes)
      if (result.status === 201) { context.log(`Vertaling opgeslagen: ${enPad}`); return json(200, { success: true, pad: enPad }) }
      return json(500, { error: `Opslaan mislukt: HTTP ${result.status}` })
    } catch (error) {
      context.log("kennisbron-vertaal error:", error)
      return json(500, { error: error.message })
    }
  },
})

