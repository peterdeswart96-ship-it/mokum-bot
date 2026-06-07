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
- Spelregels: leg de regels van pool (8-ball, 9-ball, 10-ball, straight pool, one pocket), darts (301, 501, cricket) en biljart (libre, band) volledig uit als ernaar gevraagd wordt. Dit is nuttige informatie voor bezoekers.

KENNISBRON INSTRUCTIE:
Als er een KENNISBRON sectie aanwezig is in deze prompt, gebruik die dan als primaire bron. De kennisbron is altijd leidend boven de informatie hierboven. Als de kennisbron informatie bevat die afwijkt van bovenstaande instructies, volg dan de kennisbron.`

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"

// Mapping van vraagonderwerpen naar kennisbron mappen
const TOPIC_MAP = [
  {
    folders: ["spelregels/pool"],
    keywords: ["8-ball", "8ball", "9-ball", "9ball", "10-ball", "10ball", "straight pool", "one pocket", "pool regel", "pool rules"],
  },
  {
    folders: ["spelregels/english-pool"],
    keywords: ["english pool", "blackball", "engels pool"],
  },
  {
    folders: ["spelregels/darts"],
    keywords: ["501", "301", "cricket", "darts regel", "darts rules", "checkout", "finish"],
  },
  {
    folders: ["spelregels/biljart"],
    keywords: ["libre", "bandstoten", "driebanden", "biljart regel", "billiard rule", "carom"],
  },
  {
    folders: ["spelregels/shuffleboard"],
    keywords: ["shuffleboard regel", "shuffleboard rule", "shuffleboard spel"],
  },
  {
    folders: ["toernooien"],
    keywords: ["toernooi", "tournament", "ranking", "inschrijv", "fluke", "mega", "handicap madness", "amsterdam open", "go customs", "wedstrijd", "speeldag"],
  },
  {
    folders: ["openingstijden"],
    keywords: ["open", "gesloten", "tijden", "hours", "feestdag", "holiday", "wanneer", "hoe laat"],
  },
  {
    folders: ["tarieven"],
    keywords: ["prijs", "tarief", "kost", "euro", "betaal", "price", "rate", "cost", "goedkoop", "duur"],
  },
  {
    folders: ["locatie"],
    keywords: ["adres", "address", "route", "parkeer", "parking", "ov", "trein", "tram", "bus", "amstel", "fiets", "rijden", "komen"],
  },
  {
    folders: ["pool-biljart"],
    keywords: ["tafel", "keu", "reserveer", "reserve", "pool tafel", "biljart tafel", "beschikbaar"],
  },
  {
    folders: ["algemeen"],
    keywords: ["mokum", "oprichter", "nick", "mark", "over ons", "about", "faciliteit", "bedrijfsuitje", "clinic", "les"],
  },
]

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

async function listBlobsInFolder(folder, sasToken) {
  try {
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}?restype=container&comp=list&prefix=${encodeURIComponent(folder + "/")}&${sasToken}`,
      method: "GET",
      headers: { "x-ms-version": "2020-04-08" },
    }
    const result = await httpsRequest(options)
    if (result.status !== 200) return []

    const matches = [...result.body.matchAll(/<Name>([^<]+)<\/Name>/g)]
    return matches.map(m => m[1])
  } catch (err) {
    console.log(`Blobs listen mislukt (${folder}):`, err.message)
    return []
  }
}

async function getKennisbronContext(message, sasToken) {
  if (!sasToken) {
    console.log("Geen SAS token — kennisbron overgeslagen")
    return null
  }

  const msgLower = message.toLowerCase()

  // Bepaal welke mappen relevant zijn
  const relevanteFolders = new Set()
  for (const topic of TOPIC_MAP) {
    if (topic.keywords.some(kw => msgLower.includes(kw))) {
      topic.folders.forEach(f => relevanteFolders.add(f))
    }
  }

  if (relevanteFolders.size === 0) {
    console.log("Geen relevante kennisbron mappen gevonden voor:", message)
    return null
  }

  console.log("Relevante kennisbron mappen:", [...relevanteFolders])

  // Haal alle relevante bestanden op
  const sections = []
  for (const folder of relevanteFolders) {
    const blobs = await listBlobsInFolder(folder, sasToken)
    for (const blobPath of blobs) {
      const content = await fetchBlobContent(blobPath, sasToken)
      if (content) {
        sections.push(`### Kennisbron: ${blobPath}\n\n${content}`)
        console.log(`Kennisbron geladen: ${blobPath}`)
      }
    }
  }

  if (sections.length === 0) return null

  return `---\nKENNISBRON (deze informatie is leidend boven de instructies hierboven — als er een conflict is, volg dan de kennisbron en log dit):\n\n${sections.join("\n\n---\n\n")}\n---`
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

      // Kennisbron ophalen
      let kennisbronContext = null
      try {
        kennisbronContext = await getKennisbronContext(lastMessage, sasToken)
        if (kennisbronContext) {
          console.log("Kennisbron context toegevoegd aan prompt")
        }
      } catch (err) {
        console.log("Kennisbron ophalen mislukt:", err.message)
      }

      // Toernooi live data ophalen
      let tournamentContext = null
      if (isTournamentQuery) {
        tournamentContext = await getTournamentContext()
        console.log("Toernooi context toegevoegd")
      }

      // System prompt samenstellen
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

      // Log conflicten tussen kennisbron en system prompt
      if (kennisbronContext && reply.toLowerCase().includes("conflict")) {
        console.warn("⚠️ KENNISBRON CONFLICT gedetecteerd in antwoord:", reply.substring(0, 200))
      }

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