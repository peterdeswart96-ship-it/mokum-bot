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
Betaling: PIN en contant geld worden beide geaccepteerd

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
- Off-topic vragen beantwoord je met: "Daar kan ik je niet mee helpen, maar Google wel 👉 https://www.google.com/search?q=[zoekterm]"
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
    // Encode de bestandsnaam correct — spaties en speciale tekens in bestandsnamen
    const encodedPath = blobPath.split("/").map(segment => encodeURIComponent(segment)).join("/")
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}/${encodedPath}?${sasToken}`,
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

// === Fase 3: toernooi-resultaten uit de query-tables (issue #5) ===============

const NAME_PARTICLES = new Set([
  "van", "de", "den", "der", "het", "ter", "te", "von", "la", "el", "y",
  "of", "the", "'t", "di", "da", "do", "dos",
])

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function textTokens(s) {
  return normalizeText(s).split(" ").filter(Boolean)
}

async function fetchPlayersIndex(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/toernooien-raw/players-index.json?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": "2020-04-08" },
  }
  const r = await httpsRequest(options)
  if (r.status !== 200) return null
  try {
    return JSON.parse(r.body).players || null
  } catch {
    return null
  }
}

async function tableQuery(table, filter, sasToken) {
  const q = filter ? `$filter=${encodeURIComponent(filter)}&` : ""
  const options = {
    hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
    path: `/${table}()?${q}${sasToken}`,
    method: "GET",
    headers: {
      Accept: "application/json;odata=nometadata",
      "x-ms-version": "2020-04-08",
    },
  }
  const r = await httpsRequest(options)
  if (r.status !== 200) return []
  try {
    return JSON.parse(r.body).value || []
  } catch {
    return []
  }
}

// Matcht spelernamen uit de vraag tegen de players-index. Voorkomt false
// positives op veelvoorkomende voornamen via tokenfrequentie.
function matchPlayers(question, index) {
  const qTokens = new Set(textTokens(question))
  if (qTokens.size === 0) return []
  const qNorm = normalizeText(question)

  // tokenfrequentie over alle namen
  const freq = {}
  const prepared = []
  for (const [pid, name] of Object.entries(index)) {
    const sig = textTokens(name).filter((t) => !NAME_PARTICLES.has(t) && t.length >= 2)
    if (!sig.length) continue
    for (const t of sig) freq[t] = (freq[t] || 0) + 1
    prepared.push({ pid, name, sig })
  }

  const candidates = []
  for (const { pid, name, sig } of prepared) {
    const matched = sig.filter((t) => qTokens.has(t))
    if (!matched.length) continue
    const full = normalizeText(name)
    const fullHit = full.length > 3 && qNorm.includes(full)
    const lastName = sig[sig.length - 1]
    const lastHit = qTokens.has(lastName)
    const uniqueHit = matched.length === 1 && matched[0].length >= 4 && freq[matched[0]] <= 2
    const qualifies =
      fullHit || matched.length >= 2 || (lastHit && lastName.length >= 4) || uniqueHit
    if (!qualifies) continue
    const score = matched.length + (fullHit ? 3 : 0) + (lastHit ? 1 : 0)
    candidates.push({ playerId: pid, name, score })
  }
  if (!candidates.length) return []
  candidates.sort((a, b) => b.score - a.score)
  const max = candidates[0].score
  return candidates.filter((c) => c.score === max).slice(0, 4)
}

function resultLabel(r) {
  const champ = r.isChampion === true || r.isChampion === "true"
  const runner = r.isRunnerUp === true || r.isRunnerUp === "true"
  if (champ) return "1e (winnaar)"
  if (runner) return "2e (finale)"
  if (r.reachedRound) return `tot ${r.reachedRound}`
  return `poule positie ${r.groupPosition}`
}

async function getResultatenContext(messages, sasToken) {
  if (!sasToken) return null
  const lastMsg = messages[messages.length - 1]?.content || ""
  const lower = normalizeText(lastMsg)
  const winnerWords = ["winnaar", "won", "gewonnen", "kampioen", "champion", "winner"]
  const asksWinner = winnerWords.some((w) => lower.includes(w))

  const index = await fetchPlayersIndex(sasToken)
  if (!index) return null
  const players = matchPlayers(lastMsg, index)
  if (!players.length && !asksWinner) return null

  let ctx = ""

  if (players.length) {
    const parts = []
    for (const p of players.slice(0, 3)) {
      const rows = await tableQuery("PlayerResults", `PartitionKey eq '${p.playerId}'`, sasToken)
      if (!rows.length) continue
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      const titels = rows.filter((r) => r.isChampion === true || r.isChampion === "true").length
      const recent = rows
        .slice(0, 8)
        .map(
          (r) =>
            `  - ${r.date} | ${r.tournamentName} (${r.discipline}): ${resultLabel(r)}, ${r.wins}W-${r.losses}V`
        )
        .join("\n")
      parts.push(
        `Speler: ${p.name}\nTotaal toernooien (afgerond): ${rows.length}, toernooizeges: ${titels}\nRecente resultaten:\n${recent}`
      )
    }
    if (parts.length) ctx += "SPELER-RESULTATEN:\n\n" + parts.join("\n\n")
  }

  if (asksWinner && !players.length) {
    const tours = await tableQuery("Tournaments", null, sasToken)
    tours.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    const recent = tours
      .slice(0, 12)
      .map((t) => `  - ${t.date} | ${t.name} (${t.discipline}): winnaar ${t.winnerName || "?"}`)
      .join("\n")
    if (recent) ctx += (ctx ? "\n\n" : "") + "RECENTE TOERNOOI-WINNAARS:\n" + recent
  }

  if (!ctx) return null
  return (
    "---\nTOERNOOI-RESULTATEN DATA (gebruik dit om vragen over eerdere toernooien en spelersprestaties te beantwoorden; " +
    "matchen meerdere spelers, noem ze of vraag om de achternaam):\n\n" +
    ctx +
    "\n---"
  )
}

// Export t.b.v. lokale tests (geen effect op de host)
module.exports = { matchPlayers, normalizeText }

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
      let resultatenContext = null
      try {
        resultatenContext = await getResultatenContext(messages, sasToken)
        if (resultatenContext) console.log("Resultaten-context toegevoegd")
      } catch (err) {
        console.log("Resultaten ophalen mislukt:", err.message)
      }
      let systemPrompt = SYSTEM_PROMPT
      if (kennisbronContext) systemPrompt += `\n\n${kennisbronContext}`
      if (tournamentContext) systemPrompt += `\n\n${tournamentContext}`
      if (resultatenContext) systemPrompt += `\n\n${resultatenContext}`
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

      const text = response.content[0].text
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

// Auth endpoint — wachtwoord verificatie server-side
// Hash staat alleen op de server, nooit in de frontend
app.http("auth", {
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
      const { wachtwoord } = body

      if (!wachtwoord) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Geen wachtwoord opgegeven" }),
        }
      }

      // Hash het wachtwoord server-side
      const crypto = require("crypto")
      const hash = crypto.createHash("sha256").update(wachtwoord).digest("hex")

      // Enige geldige hash — mkm!
      const DASHBOARD_HASH = "e76ba1957d8c978fc25c9ca24af6280569876436d3fe9ca6418a43144f2f7265"

      if (hash === DASHBOARD_HASH) {
        // Genereer een tijdelijk sessie token (geldig voor 8 uur)
        const token = crypto.randomBytes(32).toString("hex")
        const expiry = Date.now() + (8 * 60 * 60 * 1000)
        context.log("Dashboard login succesvol")
        return {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, token, expiry }),
        }
      } else {
        context.log("Dashboard login mislukt — verkeerd wachtwoord")
        return {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Verkeerd wachtwoord" }),
        }
      }
    } catch (error) {
      context.log("Auth error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: error.message }),
      }
    }
  },
})