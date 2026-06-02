const Anthropic = require("@anthropic-ai/sdk")
const https = require("https")
const crypto = require("crypto")

const SYSTEM_PROMPT = `Je bent Mokum Bot, de digitale gast van Mokum Pool & Darts in Amsterdam Oost. Je helpt bezoekers snel aan de juiste informatie — zonder gedoe.

Je bent niet een stijve klantenservice-robot. Je bent meer die ene vaste gast die al jaren bij Mokum over de vloer komt, alles weet, en altijd even tijd heeft voor een goed antwoord. Behulpzaam en enthousiast, maar zonder het er dik bovenop te leggen.

Taal: pas je aan aan de taal van de gebruiker.
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
- Spelregels: leg de regels van pool (8-ball, 9-ball, 10-ball, straight pool, one pocket), darts (301, 501, cricket) en biljart (libre, band) volledig uit als ernaar gevraagd wordt. Dit is nuttige informatie voor bezoekers.`

const STORAGE_ACCOUNT = "mokumbotrg904a"

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
    if (!sasToken) {
      console.log("Geen SAS token gevonden")
      return
    }

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

    const result = await httpsRequest(options, content)
    console.log("Gesprek opgeslagen:", blobName, "status:", result.status)
  } catch (err) {
    console.log("Gesprek opslaan mislukt:", err.message, err.stack)
  }
}

async function saveTournaments(tournaments) {
  try {
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) {
      console.log("Geen SAS token gevonden voor table storage")
      return
    }

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

      const contentLength = Buffer.byteLength(entity)

      const options = {
        hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
        path: `/toernooistatistieken(PartitionKey='${partitionKey}',RowKey='${rowKey}')?${sasToken}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": contentLength,
          "Accept": "application/json;odata=nometadata",
          "x-ms-version": "2020-04-08",
        },
      }

      const result = await httpsRequest(options, entity)
      console.log("Toernooi opgeslagen:", t.name, "status:", result.status, "body:", result.body)
    }
  } catch (err) {
    console.log("Toernooien opslaan mislukt:", err.message, err.stack)
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
    console.log("Cuescore HTML lengte:", html.length)

    const upcoming = parseTournaments(html, today)
    upcoming.sort((a, b) => a.dateObj - b.dateObj)

    console.log("Toernooien gevonden:", upcoming.length)

    if (upcoming.length > 0) {
      saveTournaments(upcoming)
    }

    if (upcoming.length === 0) {
      return "Er zijn momenteel geen aankomende toernooien gepland. Kijk op [Cuescore](https://cuescore.com/mokumpooldarts/tournaments) voor de meest actuele planning."
    }

    const limited = upcoming.slice(0, 10)
    const byDate = {}
    for (const t of limited) {
      if (!byDate[t.date]) byDate[t.date] = []
      byDate[t.date].push(t)
    }

    let context = "ACTUELE TOERNOOI-INFO (aankomende toernooien):\n"
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

      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ""
      const isTournamentQuery =
        lastMessage.includes("toernooi") ||
        lastMessage.includes("tournament") ||
        lastMessage.includes("wanneer") ||
        lastMessage.includes("inschrijv") ||
        lastMessage.includes("ranking") ||
        lastMessage.includes("wedstrijd") ||
        lastMessage.includes("speeldag")

      let systemPrompt = SYSTEM_PROMPT
      if (isTournamentQuery) {
        const tournamentContext = await getTournamentContext()
        systemPrompt += `\n\n${tournamentContext}`
        console.log("Tournament context toegevoegd")
      }

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