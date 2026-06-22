const Anthropic = require("@anthropic-ai/sdk")
const https = require("https")

const SYSTEM_PROMPT = `Je bent Mokum Bot, de digitale gast van Mokum Pool & Darts in Amsterdam Oost. Je helpt bezoekers snel aan de juiste informatie — zonder gedoe.

Je bent niet een stijve klantenservice-robot. Je bent meer die ene vaste gast die al jaren bij Mokum over de vloer komt, alles weet, en altijd even tijd heeft voor een goed antwoord. Behulpzaam en enthousiast, maar zonder het er dik bovenop te leggen.

Taal: antwoord ALTIJD in de taal waarin de gebruiker schrijft, ongeacht de ingestelde taal van de interface. Schrijft iemand in het Engels? Antwoord in het Engels. In het Nederlands? Nederlands. In het Spaans? Spaans.
Toon: informeel, relaxed, direct. Geen "Geachte bezoeker". Gewoon normaal doen.

OVER MOKUM POOL & DARTS:
Adres: Nobelweg 2, 1097 AR Amsterdam (Amsterdam Oost, vlak bij Amstel Station)
Email: info@pooleninmokum.com
Website: https://poolen-amsterdam.nl
Betaling: uitsluitend PIN — geen contant geld

OPENINGSTIJDEN:
- Maandag t/m donderdag: 14:00 - 01:00
- Vrijdag & zaterdag: 12:00 - 02:00
- Zondag: 12:00 - 01:00

TARIEVEN:
- Pool (American & English): €15,00/uur tot 19:00, €19,00/uur na 19:00
- Biljart: €15,00/uur tot 19:00, €19,00/uur na 19:00
- Darts: €8,50/uur (hele dag)
- Shuffleboard: €14,50/uur tot 19:00, €18,50/uur na 19:00
- Parkeren: €2,20 per uur bij minimale besteding van €15

OPRICHTERS:
- Nick van den Berg (professioneel poolspeler, meerdere Europese titels)
- Mark van den Berg (ondernemer, gastvrijheid)

REGELS:
- Geen garanties geven over beschikbaarheid
- Geen betalingen of persoonlijke data verwerken
- Off-topic vragen beantwoord je met: "Daar kan ik je niet mee helpen, maar Google wel 👉 https://lmgtfy.app/?q=[zoekterm]"
- Bij grote groepen of bedrijfsuitjes doorverwijzen naar info@pooleninmokum.com
- Eerlijk zijn dat je een AI bent als ernaar gevraagd wordt
- Gebruik maximaal 1 emoji per antwoord, alleen als het echt past. Geen emoji's in lijsten of tabellen.
- Zet openingstijden altijd op aparte regels per dag/daggroep in een lijst
- Zet tarieven altijd op aparte regels per activiteit in een lijst
- Sluit antwoorden af met een natuurlijke vervolgvraag in volledige zinnen. Geen informele afkortingen.
- Zet links altijd als klikbare markdown: [tekst](url). Nooit als platte URL.
- Voor toernooi-info: geef altijd de aanmeldlink als [Inschrijven via Cuescore](https://cuescore.com/mokumpooldarts/tournaments)
- Na elk antwoord over toernooien: vraag of de gebruiker uitgebreidere info wil over een specifiek toernooi. Vraag dan welk toernooi en geef daarna alle beschikbare details (format, kosten, handicap, prijzengeld, tijden, contact etc.)
- Bij vragen over coaching, clinic, lessen, training of privéles: verwijs altijd door naar [nickvandenberg.com](https://nickvandenberg.com/) — dit is de website van Nick van den Berg voor pool clinics en privélessen.
- Bij vragen over eten, drinken, het menu, vegetarische opties, allergenen of specifieke gerechten: geef altijd de link naar de menukaart mee via [Bekijk de menukaart (PDF)](https://poolen-amsterdam.nl/wp-content/uploads/Mokum-menu-3.pdf) en beantwoord de vraag op basis van de beschikbare menu-informatie.
- Spelregels: leg de regels van pool (8-ball, 9-ball, 10-ball, straight pool, one pocket), darts (301, 501, cricket) en biljart (libre, band) volledig uit als ernaar gevraagd wordt. Dit is nuttige informatie voor bezoekers.

KENNISBRON INSTRUCTIE:
Als er een KENNISBRON sectie aanwezig is in deze prompt, gebruik die dan als primaire bron. De kennisbron is altijd leidend boven de informatie hierboven. Als de kennisbron informatie bevat die afwijkt van bovenstaande instructies, volg dan de kennisbron.

TOERNOOIEN:
Mokum organiseert meerdere wekelijkse toernooien. Aanmelden en actuele datums via [Cuescore](https://cuescore.com/mokumpooldarts/tournaments).

Mokum 8 & 10ball Ranking — elke zaterdag
- Om de week 8-ball, om de week 10-ball. Eerstvolgende (13 juni 2026) is 8-ball.
- Start: 12:30, zaal open vanaf 12:00. Inloop tot 12:45 mits gemeld in Cuescore comments vóór 12:30.
- Inschrijfgeld: €10,00 (€2,50 naar eindpot)
- Max 32 spelers. Geen handicap.
- Opzet: poules van 8, daarna laatste 16 enkel knock-out, race naar de 3
- Prijzengeld: eerste 8 bij 25+ deelnemers, eerste 4 bij 24 of minder
- Top 32 van de ranking plaatst zich voor eindtoernooi op 5 september 2026
- Voor alle niveaus

Mokum MEGA Summer Ranking — elke maandag én woensdag (9-ball)
- Start: 19:15 (loting en direct starten). Inloop tot 19:30 mits gemeld in Cuescore comments vóór 19:15 — wordt streng gecontroleerd, anders uitsluiting.
- Inschrijfgeld: €15,00 (€5,00 naar eindtoernooi-prijzengeld, €1,00 naar Jackpot)
- Max 32–40 spelers per avond. Geen handicap. Winnaar breakt, 9 op de spot.
- Opzet: poules, daarna knock-out
- Prijzengeld vanaf 24 deelnemers: eerste 8 plekken (1e 30%, 2e 20%, 3/4e 12%, 5/8e 6,5%)
- Prijzengeld onder 24 deelnemers: eerste 4 plekken (1e 40%, 2e 30%, 3/4e 15%)
- Ranking punten: 1e=100, 2e=82, 3e=70, 5e=55, 9e=40, 17e=30, 25e=22, 33e=15
- Sommige toernooien leveren dubbele punten op. Opgave tijdens poulefase = -50 punten.
- JACKPOT: elke avond worden 3 spelers getrokken voor een 9-ball break-and-run met huiskeu — lukt het, dan win je 50% van de jackpot
- Eindtoernooi: 30 augustus 2026, alleen top 48 (minimaal 8 deelnames vereist), gegarandeerd €4.000 prijzengeld, 1e plaats €1.000
- Mix van beginners en gevorderde spelers

Fluke Ranking — elke dinsdag (9-ball, seizoen 3)
- Voor beginners en recreatieve spelers — spelers uit de 1e klasse/divisie mogen NIET meedoen. 2e klasse spelers met rating 1175 of hoger ook niet.
- Start: 19:30 (wees op tijd). Inschrijfgeld: €7,50 (€2,50 naar eindtoernooi).
- Max 32–40 spelers (afhankelijk van teamcompetitie die avond). Geen handicap.
- Format: 9-ball, alternate break, 9 op de spot, Double KO tot de laatste 8, race naar de 2
- Prijzengeld: top 8 bij 24+ deelnemers, anders top 4
- Top 32 van de ranking plaatst zich voor eindtoernooi op zondag 6 september 2026
- Geen minimale deelname vereist voor kwalificatie
- Erg populair en gezellig — ideaal als je net begint of voor de combo chasers en lucky flukers

Mokum Handicap Madness — zondag (9-ball, met handicap)
- Voor beginners én gevorderde spelers — het speelveld wordt gelijkgetrokken via een race-based handicapsysteem
- Start: 19:00. Inschrijfgeld: €5,00. Geen ranking. Volledige pot wordt uitbetaald.
- Max 32 spelers. Winnaar breakt. Standaard race naar de 6, maar je handicap past je racelengte aan.
- Handicapniveaus (H4 t/m H-2): H4 = beginnende spelers, H0 = top 1e klasse, H-2 = Eredivisie/nationale top
- Praktisch voorbeeld: H3 vs H3 = race naar 3, H0 vs H0 = race naar 6, H-2 vs H-2 = race naar 8
- Handicaps worden bepaald door de organisatie, zijn altijd actief en kunnen tussen toernooien worden bijgesteld
- Format afhankelijk van deelnemers: minder dan 12 of 12–23 spelers = Double KO naar halve finales, 24+ = nader bepaald
- Prijzengeld: top 2 bij minder dan 12 spelers, top 4 bij 12–24, top 8 bij 24+
- Contact: Michelle Konynenberg-Harrison — 06 25 52 04 06
- Toernooireglement: [poolen-amsterdam.nl](https://poolen-amsterdam.nl/toernooireglement-organisatie-gedrag/)

'GO Customs' Amsterdam Open @ Mokum — eenmalig groot toernooi (9-ball)
- Bijzonder evenement met €5.000 added prijzengeld. 1e plaats: €3.000. Top 32 krijgt prijzengeld.
- Max 48 spelers per qualifier. 16 spelers kwalificeren zich voor de Final Day.
- Final Day: zaterdag 12 juli 2026, start 10:30
- Format: Double Elimination tot de laatste 16, race naar de 7, 9 op de spot, alternate break. Geen handicap.
- Inschrijfgeld: €40,00 (jeugd onder 18: €25,00). Betaling via Cuescore. Uitschrijven kost €8,00.
- Wie zich niet kwalificeert kan een rebuy doen voor een volgende qualifier.
- Qualifier 1 — zaterdag 4 juli 2026 (open voor iedereen) → [Inschrijven](https://cuescore.com/tournament/Qualifer+1+%27GO+Customs%27+Amsterdam+Open+%40Mokum+%28priority+for+members+of+Mokum%29/77888677)
- Qualifier 2 — vrijdag 10 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+2+GO+Customs+Amsterdam+Open+%40Mokum/77722138)
- Qualifier 3 — zaterdag 11 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+3+GO+Customs+Amsterdam+Open+%40Mokum/77888701)
- Qualifier 4 — zaterdag 11 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+4+GO+Customs+Amsterdam+Open+%40Mokum/77888743)
- Toernooireglement: [poolen-amsterdam.nl](https://poolen-amsterdam.nl/toernooireglement-organisatie-gedrag/)

Bij twijfel of een toernooi bij je niveau past: mail naar info@pooleninmokum.com`

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"

const BEVEILIGDE_MAPPEN = ["intern"]

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => resolve({ status: res.statusCode, body: data }))
    })
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

async function saveConversation(messages, reply) {
  try {
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const random = Math.random().toString(36).substring(2, 8)
    const blobName = `${timestamp}-${random}.json`
    const content = JSON.stringify({ timestamp: new Date().toISOString(), messages, reply }, null, 2)
    const contentLength = Buffer.byteLength(content)
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/gesprekken/${blobName}?${sasToken}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": contentLength,
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": "2020-04-08",
      },
    }
    await httpsRequest(options, content)
  } catch (err) {
    console.log("Gesprek opslaan mislukt:", err.message)
  }
}

async function saveTournaments(tournaments) {
  try {
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return
    for (const t of tournaments) {
      const partitionKey = t.dateObj.toISOString().split("T")[0]
      const rowKey = t.id
      const entity = JSON.stringify({
        PartitionKey: partitionKey,
        RowKey: rowKey,
        name: t.name,
        date: t.date,
        scraped_at: new Date().toISOString(),
      })
      const options = {
        hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
        path: `/toernooistatistieken(PartitionKey='${partitionKey}',RowKey='${rowKey}')?${sasToken}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(entity),
          "Accept": "application/json;odata=nometadata",
          "x-ms-version": "2020-04-08",
        },
      }
      await httpsRequest(options, entity)
    }
  } catch (err) {
    console.log("Toernooien opslaan mislukt:", err.message)
  }
}

async function fetchBlobContent(blobPath, sasToken) {
  try {
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}/${blobPath}?${sasToken}`,
      method: "GET",
      headers: { "x-ms-version": "2020-04-08" },
    }
    const result = await httpsRequest(options)
    if (result.status === 200) return result.body
    return null
  } catch (err) {
    console.log(`Blob ophalen mislukt (${blobPath}):`, err.message)
    return null
  }
}

async function listAllBlobs(sasToken) {
  try {
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}?restype=container&comp=list&${sasToken}`,
      method: "GET",
      headers: { "x-ms-version": "2020-04-08" },
    }
    const result = await httpsRequest(options)
    if (result.status !== 200) return []
    const matches = [...result.body.matchAll(/<Name>([^<]+)<\/Name>/g)]
    return matches.map(m => m[1])
  } catch (err) {
    console.log("Blobs listen mislukt:", err.message)
    return []
  }
}

async function getKennisbronContext(messages, sasToken) {
  if (!sasToken) {
    console.log("Geen SAS token — kennisbron overgeslagen")
    return null
  }
  const allText = messages.map(m => m.content || "").join(" ").toLowerCase()
  const internOntgrendeld = allText.includes("intern") && allText.includes("internal")
  try {
    const alleBlobs = await listAllBlobs(sasToken)
    if (alleBlobs.length === 0) {
      console.log("Geen bestanden gevonden in kennisbronnen container")
      return null
    }
    const sections = []
    for (const blobPath of alleBlobs) {
      const mapNaam = blobPath.split("/")[0]
      if (BEVEILIGDE_MAPPEN.includes(mapNaam) && !internOntgrendeld) {
        console.log(`Beveiligde map overgeslagen: ${blobPath}`)
        continue
      }
      if (!blobPath.endsWith(".txt") && !blobPath.endsWith(".md")) {
        console.log(`Niet-tekstbestand overgeslagen: ${blobPath}`)
        continue
      }
      const content = await fetchBlobContent(blobPath, sasToken)
      if (content && content.trim().length > 0) {
        sections.push(`### ${blobPath}\n\n${content}`)
        console.log(`Kennisbron geladen: ${blobPath}`)
      }
    }
    if (sections.length === 0) return null
    console.log(`Totaal ${sections.length} kennisbron bestanden geladen`)
    return `---\nKENNISBRON (deze informatie is leidend boven de instructies hierboven):\n\n${sections.join("\n\n---\n\n")}\n---`
  } catch (err) {
    console.log("Kennisbron ophalen mislukt:", err.message)
    return null
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      let data = ""
      res.on("data", (chunk) => data += chunk)
      res.on("end", () => resolve(data))
    }).on("error", reject)
  })
}

function parseTournaments(html, today) {
  const upcoming = []
  const dateBlocks = html.split(/class="daterow"/)
  for (let i = 1; i < dateBlocks.length; i++) {
    const block = dateBlocks[i]
    const dateMatch = block.match(/((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+ \d{1,2},\s+\d{4})/)
    if (!dateMatch) continue
    const dateStr = dateMatch[1]
    const dateStrClean = dateStr.replace(/^[A-Za-z]+,\s*/, "")
    const dateObj = new Date(dateStrClean)
    if (isNaN(dateObj)) continue
    if (dateObj < today) continue
    const tournamentRegex = /href="\/\/cuescore\.com\/tournament\/[^"]+\/(\d+)"[^>]*>([^<]+)</g
    let match
    while ((match = tournamentRegex.exec(block)) !== null) {
      const id = match[1]
      const name = match[2].trim()
      if (name && id) {
        upcoming.push({ date: dateStr, dateObj, name, id })
      }
    }
  }
  return upcoming
}

async function getTournamentContext() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const html = await fetchUrl("https://cuescore.com/mokumpooldarts/tournaments?q=&d=0&season=0&s=0")
    const upcoming = parseTournaments(html, today)
    upcoming.sort((a, b) => a.dateObj - b.dateObj)
    if (upcoming.length > 0) saveTournaments(upcoming)
    if (upcoming.length === 0) {
      return "Er zijn momenteel geen aankomende toernooien gepland. Kijk op [Cuescore](https://cuescore.com/mokumpooldarts/tournaments) voor de meest actuele planning."
    }
    const limited = upcoming.slice(0, 10)
    const byDate = {}
    for (const t of limited) {
      if (!byDate[t.date]) byDate[t.date] = []
      byDate[t.date].push(t)
    }
    let context = "ACTUELE TOERNOOI-INFO (aankomende toernooien van Cuescore):\n"
    for (const [date, tournaments] of Object.entries(byDate)) {
      context += `\n**${date}**\n`
      for (const t of tournaments) {
        context += `- ${t.name} → [Inschrijven](https://cuescore.com/mokumpooldarts/tournaments)\n`
      }
    }
    return context
  } catch (err) {
    console.log("Cuescore fout:", err.message)
    return "Toernooi-info tijdelijk niet beschikbaar. Kijk op [Cuescore](https://cuescore.com/mokumpooldarts/tournaments) voor de actuele planning."
  }
}

const { app } = require("@azure/functions")

app.http("chat", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    try {
      const body = await request.json()
      const { messages } = body
      if (!messages || !Array.isArray(messages)) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "messages array required" }),
        }
      }
      const lastMessage = messages[messages.length - 1]?.content || ""
      const lastMessageLower = lastMessage.toLowerCase()
      const isTournamentQuery =
        lastMessageLower.includes("toernooi") ||
        lastMessageLower.includes("tournament") ||
        lastMessageLower.includes("wanneer") ||
        lastMessageLower.includes("inschrijv") ||
        lastMessageLower.includes("ranking") ||
        lastMessageLower.includes("wedstrijd") ||
        lastMessageLower.includes("speeldag")
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      let kennisbronContext = null
      try {
        kennisbronContext = await getKennisbronContext(messages, sasToken)
        if (kennisbronContext) console.log("Kennisbron context toegevoegd aan prompt")
      } catch (err) {
        console.log("Kennisbron ophalen mislukt:", err.message)
      }
      let tournamentContext = null
      if (isTournamentQuery) {
        tournamentContext = await getTournamentContext()
        console.log("Toernooi context toegevoegd")
      }
      let systemPrompt = SYSTEM_PROMPT
      if (kennisbronContext) systemPrompt += `\n\n${kennisbronContext}`
      if (tournamentContext) systemPrompt += `\n\n${tournamentContext}`
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      })
      const reply = response.content[0].text
      saveConversation(messages, reply)
      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      }
    } catch (error) {
      context.log("Error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      }
    }
  },
})

app.http("gesprekken", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
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
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    try {
      const body = await request.json()
      const { gesprekken, type } = body
      if (!gesprekken || !Array.isArray(gesprekken)) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "gesprekken array required" }),
        }
      }

      // Bouw gespreksdata op voor de AI
      const vragenTekst = gesprekken.slice(0, 50).map((g, i) => {
        const vragen = (g.messages || []).filter(m => m.role === "user").map(m => m.content).join(" | ")
        const antwoord = (g.reply || "").substring(0, 200)
        return `${i + 1}. VRAAG: ${vragen} | ANTWOORD: ${antwoord}`
      }).join("\n")

      const systemMark = `Je bent een data-analist voor Mokum Pool & Darts chatbot. Analyseer de gesprekken en geef PRAKTISCH advies om de bot te verbeteren. Antwoord UITSLUITEND in geldig JSON zonder markdown of backticks:
{"inzicht":"Korte samenvatting in 2-3 zinnen over wat opvalt in de gesprekken","veelgesteld":[{"vraag":"Exacte of samengevatte vraag","count":3,"onderwerp":"Toernooien"}],"fouten_of_verbeteringen":[{"probleem":"Beschrijving van probleem of onduidelijkheid in bot antwoord","suggestie":"Concrete verbetering"}],"nieuwe_rubrieken":["Rubriek die ontbreekt maar veel gevraagd wordt"],"kennisbron_tips":["Specifieke tip: voeg dit toe aan kennisbron X"],"prioriteit":"hoog/middel/laag"}`

      const systemSander = `Je bent een UX-analist voor de website poolen-amsterdam.nl. Analyseer chatbot gesprekken om te bepalen welke informatie ontbreekt of onduidelijk is op de website. Antwoord UITSLUITEND in geldig JSON zonder markdown of backticks:
{"inzicht":"Korte samenvatting wat bezoekers zoeken maar niet vinden op de website","ontbrekende_info":[{"onderwerp":"Onderwerp","beschrijving":"Welke info mist op de site","prioriteit":"hoog/middel/laag"}],"pagina_verbeteringen":[{"pagina":"Welke pagina of sectie","verbetering":"Concrete suggestie voor verbetering"}],"veel_gestelde_vragen":[{"vraag":"Vraag die bezoekers stellen","antwoord_aanwezig_op_site":true}],"samenvatting":"Drie concrete actiepunten voor Sander om de website te verbeteren"}`

      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: type === "sander" ? systemSander : systemMark,
        messages: [{ role: "user", content: `Analyseer deze ${Math.min(gesprekken.length, 50)} gesprekken van de Mokum Bot:\n\n${vragenTekst}` }],
      })

      const text = response.content[0].text
      const analyse = JSON.parse(text.replace(/```json|```/g, "").trim())

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