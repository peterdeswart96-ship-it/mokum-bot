const Anthropic = require("@anthropic-ai/sdk")
const https = require("https")

const SYSTEM_PROMPT = `Je bent Mokum Bot, de digitale gast van Mokum Pool & Darts in Amsterdam Oost. Je helpt bezoekers snel aan de juiste informatie — zonder gedoe.

Je bent niet een stijve klantenservice-robot. Je bent meer die ene vaste gast die al jaren bij Mokum over de vloer komt, alles weet, en altijd even tijd heeft voor een goed antwoord. Behulpzaam en enthousiast, maar zonder het er dik bovenop te leggen.

Taal: antwoord ALTIJD in de taal waarin de gebruiker schrijft, ongeacht de ingestelde taal van de interface. Schrijft iemand in het Engels? Antwoord in het Engels. In het Nederlands? Nederlands. In het Spaans? Spaans.
Toon: informeel, relaxed, direct. Geen "Geachte bezoeker". Gewoon normaal doen.

OPMAAK (BELANGRIJK — geldt voor ELK antwoord): zet nooit alles in één lange lap tekst. Gebruik:
- korte alinea's met een witregel ertussen;
- bullets (-) zodra je meerdere dingen, opties of stappen noemt;
- **vetgedrukte** kernwoorden waar dat het scannen helpt — spaarzaam, niet overdrijven.
Houd elk antwoord luchtig, overzichtelijk en makkelijk scanbaar.

OVER MOKUM POOL & DARTS:
Adres: Nobelweg 2, 1097 AR Amsterdam (Amsterdam Oost, vlak bij Amstel Station)
Email: info@pooleninmokum.com
Website: https://poolen-amsterdam.nl
Betaling: PIN en contant geld worden beide geaccepteerd

OPENINGSTIJDEN:
- Maandag t/m donderdag: 14:00 - 01:00
- Vrijdag & zaterdag: 12:00 - 02:00
- Zondag: 12:00 - 01:00

TARIEVEN (BELANGRIJK: alle speeltarieven gelden PER TAFEL/BAAN/BORD — de speelplek — NIET per persoon. De prijs is hetzelfde, of je nu met 1, 2, 3 of meer mensen speelt; bereken het tarief dus NOOIT per persoon en vermenigvuldig het NOOIT met het aantal spelers):
- Pool (American & English): €15,00/uur per tafel tot 19:00, €19,00/uur per tafel na 19:00
- Biljart: €15,00/uur per tafel tot 19:00, €19,00/uur per tafel na 19:00
- Darts: €8,50/uur per bord (hele dag)
- Shuffleboard: €14,50/uur per baan tot 19:00, €18,50/uur per baan na 19:00
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
- Gebruik maximaal 1 emoji per antwoord, alleen als het echt past. Geen emoji's in gewone lijsten of tabellen. UITZONDERING: medailles 🥇🥈🥉 gebruik je UITSLUITEND in echte ranglijsten/top-lijsten waar spelers op prestatie of rating gerangschikt staan (🥇 plek 1, 🥈 plek 2, 🥉 plek 3). Gebruik NOOIT medailles bij andere opsommingen — zoals een lijst van toernooien, openingstijden, tarieven of voorbeeldvragen.
- Zet openingstijden altijd op aparte regels per dag/daggroep in een lijst
- Zet tarieven altijd op aparte regels per activiteit in een lijst
- Prijzen voor pool, biljart, darts en shuffleboard zijn ALTIJD per tafel/bord/baan (je huurt de speelplek), NOOIT per persoon. Vermenigvuldig een speeltarief dus nooit met het aantal spelers en zeg nooit dat het per persoon is, ook niet als de bezoeker dat in de vraag suggereert.
- Sluit antwoorden af met een natuurlijke vervolgvraag in volledige zinnen. Geen informele afkortingen.
- Zet links altijd als klikbare markdown: [tekst](url). Nooit als platte URL.
- Voor toernooi-info: geef altijd de aanmeldlink als [Inschrijven via Cuescore](https://cuescore.com/mokumpooldarts/tournaments)
- Bij elke vraag over het Amsterdam Open (of de Go Customs Amsterdam Open / Qualifier Amsterdam Open): vermeld altijd de link [Go Customs Amsterdam Open](https://cuescore.com/KNBB/posts/Go+Customs+Amsterdam+Open/84039961)
- Vraagt iemand welke toernooien er zijn: geef ALLE soorten toernooien als bulletpoints (één toernooi per bullet, met korte kerninfo), ZONDER medailles of andere emoji's in de lijst.
- Sluit ELK antwoord over toernooien af met precies 5 goede vervolgvragen die de bezoeker nog kan stellen, als genummerde multiple choice (1 t/m 5), en voeg als laatste optie "6) Anders, namelijk…" toe zodat de bezoeker ook zelf iets kan invullen. Geef daarna bij een gekozen vraag alle beschikbare details (format, kosten, handicap, prijzengeld, tijden, contact etc.).
- Bij vragen over coaching, clinic, lessen, training of privéles: verwijs altijd door naar [nickvandenberg.com](https://nickvandenberg.com/) — dit is de website van Nick van den Berg voor pool clinics en privélessen.
- Bij vragen over eten, drinken, het menu, vegetarische opties, allergenen of specifieke gerechten: geef altijd de link naar de menukaart mee via [Bekijk de menukaart (PDF)](https://poolen-amsterdam.nl/wp-content/uploads/Mokum-menu-3.pdf) en beantwoord de vraag op basis van de beschikbare menu-informatie.
- Spelregels: leg de regels van pool (8-ball, 9-ball, 10-ball, straight pool, one pocket), darts (301, 501, cricket) en biljart (libre, band) volledig uit als ernaar gevraagd wordt. Dit is nuttige informatie voor bezoekers.

KENNISBRON INSTRUCTIE:
Als er een KENNISBRON sectie aanwezig is in deze prompt, gebruik die dan als primaire bron. De kennisbron is altijd leidend boven de informatie hierboven. Als de kennisbron informatie bevat die afwijkt van bovenstaande instructies, volg dan de kennisbron.

TOERNOOI-RESULTATEN & SPELERSDATA (BELANGRIJK — deze data heb je WEL):
Je hebt toegang tot de volledige uitslagen-database van Mokum: alle gespeelde toernooien, winnaars en spelersprestaties. Je kunt o.a. deze vragen beantwoorden:
- Wie heeft een bepaald (recent) toernooi gewonnen?
- Hoe heeft een specifieke speler het de laatste tijd gedaan?
- Wie zijn de beste spelers — per toernooisoort (Fluke Ranking, MEGA Ranking, MEGA Summer Ranking, 8/10ball Zaterdag, OnePocket Monthly, 9 ball Sunday), per discipline (8-ball, 9-ball, 10-ball), of over alle toernooien gecombineerd?
- Top 10 spelers per toernooisoort.
- Over een gekozen periode: dit jaar, afgelopen 3 maanden, een specifiek jaar, of aller tijden.
- De top 20 op KNBB Pool Rating van Mokum-spelers.

AANPAK bij vragen over speler- of toernooiresultaten: toon EERST kort bovenstaand overzicht van wat je kunt laten zien (zodat de gebruiker weet wat er mogelijk is), en stel DAARNA verduidelijkende filtervragen om het resultaat te verfijnen: welke speler, welke periode, welk type toernooi of discipline, of alles gecombineerd. Geef pas concrete cijfers/ranglijsten als die filters duidelijk zijn. UITZONDERING: als er al een concrete data-sectie is meegegeven (SPELER-RESULTATEN, RECENTE TOERNOOI-WINNAARS, BESTE SPELERS, TOP 10 ..., TOP 20 KNBB POOL RATING) of de gebruiker stelt al een volledige, specifieke vraag, beantwoord die dan direct met de data. Vraagt iemand "welke vragen kan ik stellen over resultaten?", noem dan bovenstaande voorbeelden.
Zeg NOOIT dat je geen toegang hebt tot uitslagen, rankings of spelersstatistieken — die heb je wel. Is er voor een concrete vraag geen data meegegeven, vraag dan kort om verduidelijking (welke speler / toernooisoort / periode) in plaats van te weigeren of iets te verzinnen. Voor de allerlaatste live-standen mag je daarnaast naar Cuescore verwijzen.

BELANGRIJK — afsluiting bij resultaten: heb je net een antwoord gegeven met toernooi-resultaten, spelersprestaties, winnaars of een ranglijst? Sluit dan ALTIJD af met de vraag of de gebruiker ook de top 20 op KNBB-rating van Mokum-spelers wil zien (ja/nee). Antwoordt de gebruiker bevestigend, dan krijg je een sectie TOP 20 KNBB POOL RATING aangeleverd om te tonen.

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
    // Blobnaam in Amsterdam-tijd (sorteerbaar) zodat de naam in Azure de NL-tijd toont.
    // sv-SE geeft "YYYY-MM-DD HH:MM:SS"; omzetten naar "YYYY-MM-DDTHH-MM-SS".
    const amsTijd = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Amsterdam",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date()).replace(" ", "T").replace(/:/g, "-")
    const random = Math.random().toString(36).substring(2, 8)
    const blobName = `${amsTijd}-${random}.json`
    // timestamp-veld blijft UTC ISO — het dashboard rekent dat zelf om naar Amsterdam-tijd
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

// players-rating.json: playerId -> { name, rating } (KNBB Pool Rating, gescraped)
async function fetchRatings(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/toernooien-raw/players-rating.json?${sasToken}`,
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

// --- Series-leaderboards (beste spelers per reeks + periode) ------------------

const SERIES_OPTIONS = [
  "Fluke Ranking",
  "MEGA Ranking",
  "MEGA Summer Ranking",
  "8/10ball Zaterdag",
  "OnePocket Monthly",
  "9 ball Sunday",
  "Alle toernooien",
]

const DISCIPLINES = ["8-Ball", "9-Ball", "10-Ball"]

// Classificeert een toernooinaam naar een terugkerende reeks.
function classifySeries(name) {
  const n = (name || "").toLowerCase()
  if (n.includes("fluke")) return "Fluke Ranking"
  if (n.includes("mega") && n.includes("summer")) return "MEGA Summer Ranking"
  if (n.includes("mega")) return "MEGA Ranking"
  if (
    n.includes("8 & 10") ||
    n.includes("& 10ball") ||
    n.includes("8ball ranking") ||
    n.includes("10ball ranking")
  )
    return "8/10ball Zaterdag"
  if (n.includes("onepocket") || n.includes("one pocket")) return "OnePocket Monthly"
  if (n.includes("sunday")) return "9 ball Sunday"
  return "Overig"
}

// Leidt een discipline af uit de vraag (8/9/10-ball), of null.
function parseDiscipline(text) {
  const n = normalizeText(text)
  if (/\b10\s*ball\b|\b10ball\b/.test(n)) return "10-Ball"
  if (/\b9\s*ball\b|\b9ball\b/.test(n)) return "9-Ball"
  if (/\b8\s*ball\b|\b8ball\b/.test(n)) return "8-Ball"
  return null
}

// Leidt de gevraagde reeks af uit (genormaliseerde) vraagtekst, of null.
function parseSeries(text) {
  const n = normalizeText(text)
  if (/\bfluke\b/.test(n)) return "Fluke Ranking"
  if (/\bmega\b/.test(n) && /summer|zomer/.test(n)) return "MEGA Summer Ranking"
  if (/\bmega\b/.test(n)) return "MEGA Ranking"
  if (/onepocket|one pocket|one-pocket/.test(n)) return "OnePocket Monthly"
  if (/sunday|zondag/.test(n)) return "9 ball Sunday"
  if (/zaterdag|8 10ball|8 en 10|8 & 10/.test(n)) return "8/10ball Zaterdag"
  if (
    /\ballemaal\b|\balle\b|\balles\b|all toernooi|alle toernooien|gecombineerd|alle drie|iedereen|overall|in totaal|elk toernooi/.test(
      n
    )
  )
    return "all"
  return null
}

// Leidt een periode af uit de vraag. Geeft {start,end,label} of {all,label} of null.
function parsePeriod(text, today) {
  const n = normalizeText(text)
  const now = today || new Date()
  const iso = (d) => d.toISOString().split("T")[0]
  const daysAgo = (days) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return iso(d)
  }
  const ym = n.match(/\b(20\d{2})\b/)
  if (ym) return { start: `${ym[1]}-01-01`, end: `${ym[1]}-12-31`, label: ym[1] }
  if (/dit jaar|deze jaargang/.test(n)) {
    const y = now.getFullYear()
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` }
  }
  if (/vorig jaar/.test(n)) {
    const y = now.getFullYear() - 1
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` }
  }
  if (/dit seizoen|huidig seizoen|seizoen/.test(n)) {
    const sy = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
    return { start: `${sy}-09-01`, end: iso(now), label: `seizoen ${sy}/${sy + 1}` }
  }
  if (/laatste maand|afgelopen maand|vorige maand|deze maand/.test(n))
    return { start: daysAgo(31), end: iso(now), label: "afgelopen maand" }
  if (/3 maanden|drie maanden|kwartaal/.test(n))
    return { start: daysAgo(92), end: iso(now), label: "afgelopen 3 maanden" }
  if (/half jaar|halfjaar|6 maanden|zes maanden/.test(n))
    return { start: daysAgo(183), end: iso(now), label: "afgelopen half jaar" }
  if (/laatste jaar|afgelopen jaar|12 maanden|twaalf maanden/.test(n))
    return { start: daysAgo(365), end: iso(now), label: "afgelopen 12 maanden" }
  if (/aller tijden|all time|ooit|altijd|hele historie|complete historie/.test(n))
    return { all: true, label: "aller tijden" }
  return null
}

// Gepagineerde table-query (volgt continuation tokens).
function httpsGetWithHeaders(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
    })
    req.on("error", reject)
    req.end()
  })
}

async function tableQueryPaged(table, filter, sasToken, cap = 8) {
  let rows = []
  let npk = null
  let nrk = null
  let pages = 0
  do {
    const parts = []
    if (filter) parts.push(`$filter=${encodeURIComponent(filter)}`)
    if (npk) parts.push(`NextPartitionKey=${encodeURIComponent(npk)}`)
    if (nrk) parts.push(`NextRowKey=${encodeURIComponent(nrk)}`)
    const qs = parts.length ? parts.join("&") + "&" : ""
    const r = await httpsGetWithHeaders({
      hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
      path: `/${table}()?${qs}${sasToken}`,
      method: "GET",
      headers: { Accept: "application/json;odata=nometadata", "x-ms-version": "2020-04-08" },
    })
    if (r.status !== 200) break
    try {
      rows = rows.concat(JSON.parse(r.body).value || [])
    } catch {
      break
    }
    npk = r.headers["x-ms-continuation-nextpartitionkey"]
    nrk = r.headers["x-ms-continuation-nextrowkey"]
    pages++
  } while ((npk || nrk) && pages < cap)
  return rows
}

// Aggregeert speler-resultaten tot een ranglijst op basis van toernooiprestaties.
// Medaille-prefix voor de top 3 in ranglijsten.
function medalPrefix(i) {
  return i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""
}

function buildLeaderboard(rows, key) {
  const isDiscipline = DISCIPLINES.includes(key)
  const agg = {}
  for (const r of rows) {
    if (key !== "all") {
      if (isDiscipline) {
        if ((r.discipline || "") !== key) continue
      } else if (classifySeries(r.tournamentName) !== key) continue
    }
    const pid = r.playerId
    if (!agg[pid]) agg[pid] = { name: r.playerName, score: 0, titles: 0, finals: 0, appearances: 0, wins: 0, losses: 0 }
    const a = agg[pid]
    const champ = r.isChampion === true || r.isChampion === "true"
    const runner = r.isRunnerUp === true || r.isRunnerUp === "true"
    let pts = champ ? 8 : runner ? 5
      : r.reachedRound === "Semi final" ? 3
      : r.reachedRound === "Quarter final" ? 2
      : r.reachedRound === "Last sixteen" ? 1
      : 0
    pts += (Number(r.wins) || 0) * 0.2
    a.score += pts
    a.appearances++
    a.wins += Number(r.wins) || 0
    a.losses += Number(r.losses) || 0
    if (champ) a.titles++
    if (champ || runner) a.finals++
  }
  return Object.values(agg).sort(
    (x, y) => y.score - x.score || y.titles - x.titles || y.finals - x.finals || y.appearances - x.appearances
  )
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

  // --- KNBB Pool Rating top 20 -----------------------------------------------
  // Expliciet gevraagd, of "ja" na een aanbod om de KNBB top 20 te tonen.
  const prevAssistant =
    [...messages].reverse().find((m) => m.role === "assistant")?.content || ""
  const affirmative = /^(ja|jawel|jazeker|graag|zeker|doe maar|yes|prima|ok|oke|okay|ja graag)\b/.test(
    lower.trim()
  )
  const offeredKnbb = /knbb|top 20/.test(normalizeText(prevAssistant))
  const knbbExplicit = /knbb/.test(lower) || (/rating/.test(lower) && /top|20|hoogste|beste/.test(lower))
  if (knbbExplicit || (affirmative && offeredKnbb)) {
    const ratings = await fetchRatings(sasToken)
    if (!ratings || !Object.keys(ratings).length) {
      return "---\nGEEN DATA: de KNBB-ratings zijn nog niet beschikbaar (worden nog opgehaald). Meld dit eerlijk en verwijs eventueel naar Cuescore.\n---"
    }
    const top = Object.values(ratings)
      .filter((r) => r && r.rating)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)
    const lines = top.map((r, i) => `  ${medalPrefix(i)}${i + 1}. ${r.name} — ${r.rating}`).join("\n")
    return (
      "---\nTOP 20 KNBB POOL RATING (Mokum-spelers, bron Cuescore; gebruik dit om te antwoorden, met 🥇🥈🥉 voor de top 3):\n\n" +
      lines +
      "\n---"
    )
  }

  // --- Leaderboard-intentie: beste spelers per reeks + periode ---------------
  // Anker op het laatste user-bericht met leaderboard-intentie en verzamel reeks
  // + periode vanaf daar. Zo blijft een verduidelijking over willekeurig veel
  // beurten werken (vraag -> periode -> type -> "allemaal"), zonder ver terug te lekken.
  const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content || "")
  const lbKeywords = [
    "beste speler", "beste spelers", "sterkste speler", "sterkste spelers",
    "top speler", "top spelers", "best presterend", "wie doet het goed",
    "wie doen het goed", "wie presteer", "ranglijst", "wie is de beste",
    "wie zijn de beste", "spelers doen het goed", "goed bezig",
    "meeste titels", "meeste gewonnen", "wie wint het meest",
  ]
  const isLbIntent = (n) =>
    lbKeywords.some((w) => n.includes(w)) ||
    /top\s*\d+\s*speler/.test(n) ||
    /per (toernooisoort|soort|type|reeks)/.test(n)
  let lbAnchor = -1
  for (let i = userTexts.length - 1; i >= 0; i--) {
    if (isLbIntent(normalizeText(userTexts[i]))) {
      lbAnchor = i
      break
    }
  }
  // Alleen behandelen als de intentie recent is (binnen een lopende verduidelijking)
  const leaderboardIntent = lbAnchor !== -1 && lbAnchor >= userTexts.length - 6

  if (leaderboardIntent) {
    const flowText = userTexts.slice(lbAnchor).join(" \n ")
    const flowNorm = normalizeText(flowText)
    const perSeries =
      /per (toernooisoort|soort|type|reeks)|elke (toernooisoort|soort|reeks)|alle soorten|per categorie/.test(flowNorm)
    const series = parseSeries(flowText)
    const period = parsePeriod(flowText)
    const discipline = parseDiscipline(flowText)
    const MAIN_SERIES = [
      "Fluke Ranking",
      "MEGA Ranking",
      "MEGA Summer Ranking",
      "8/10ball Zaterdag",
      "OnePocket Monthly",
      "9 ball Sunday",
    ]

    // Modus: top 10 per toernooisoort
    if (perSeries) {
      if (!period) {
        return (
          "---\nINSTRUCTIE: De gebruiker wil de beste spelers per toernooisoort, maar de periode ontbreekt nog. " +
          "Stel EERST kort de vraag over welke periode het gaat (bijv. dit jaar 2026, afgelopen 3 maanden, een specifiek jaar, of aller tijden). Verzin geen resultaten.\n---"
        )
      }
      const filter = period.all ? null : `date ge '${period.start}' and date le '${period.end}'`
      const rows = await tableQueryPaged("PlayerResults", filter, sasToken)
      const blocks = MAIN_SERIES.map((s) => {
        const board = buildLeaderboard(rows, s).slice(0, 10)
        if (!board.length) return `${s}: (geen resultaten in deze periode)`
        const lines = board
          .map(
            (a, i) =>
              `  ${medalPrefix(i)}${i + 1}. ${a.name} — ${a.titles} titel(s), ${a.finals} finale(s), ${a.appearances} toernooien`
          )
          .join("\n")
        return `${s}:\n${lines}`
      }).join("\n\n")
      return (
        `---\nTOP 10 SPELERS PER TOERNOOISOORT — ${period.label} (uit Mokum data; presenteer netjes per toernooisoort, met 🥇🥈🥉 voor de top 3):\n\n` +
        blocks +
        "\n---"
      )
    }

    // Modus: één reeks of discipline (of alle gecombineerd)
    const filterKey = series ? (series === "all" ? "all" : series) : discipline
    const filterLabel = series === "all" ? "Alle toernooien" : series || discipline
    if (!filterKey || !period) {
      const missing = []
      if (!filterKey)
        missing.push(
          `het type toernooi of discipline (opties: ${SERIES_OPTIONS.join(", ")}, of 8-ball / 9-ball / 10-ball)`
        )
      if (!period)
        missing.push("de periode (bijv. dit jaar 2026, afgelopen 3 maanden, een specifiek jaar, of aller tijden)")
      return (
        "---\nINSTRUCTIE: De gebruiker vraagt naar de beste/best presterende spelers, maar deze info ontbreekt nog: " +
        missing.join(" en ") +
        ". Stel EERST een korte, vriendelijke verduidelijkende vraag waarin je deze opties als keuzes aanbiedt, vóór je een ranglijst geeft. Verzin zelf geen resultaten.\n---"
      )
    }

    const filter = period.all ? null : `date ge '${period.start}' and date le '${period.end}'`
    const rows = await tableQueryPaged("PlayerResults", filter, sasToken)
    const board = buildLeaderboard(rows, filterKey)
    if (!board.length) {
      return `---\nGEEN DATA: er zijn geen resultaten voor ${filterLabel} in periode ${period.label}. Meld dit eerlijk en stel eventueel een andere periode of ander type voor.\n---`
    }
    const lines = board
      .slice(0, 10)
      .map(
        (a, i) =>
          `  ${medalPrefix(i)}${i + 1}. ${a.name} — ${a.titles} titel(s), ${a.finals} finale(s), ${a.appearances} toernooien, ${a.wins}W-${a.losses}V`
      )
      .join("\n")
    return (
      `---\nBESTE SPELERS (top 10) — ${filterLabel} — ${period.label} (gerangschikt op toernooiprestaties uit Mokum data; ` +
      `gebruik dit om de vraag te beantwoorden, noem de top spelers met hun titels/finales, met 🥇🥈🥉 voor de top 3):\n\n` +
      lines +
      "\n---"
    )
  }

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
module.exports = { matchPlayers, normalizeText, parseSeries, parsePeriod, classifySeries, buildLeaderboard }

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
      // Statische system prompt apart houden zodat hij gecachet kan worden;
      // wisselende context (kennisbron, toernooidata) komt ná de cache-breakpoint.
      const dynamicParts = []
      if (kennisbronContext) dynamicParts.push(kennisbronContext)
      if (tournamentContext) dynamicParts.push(tournamentContext)
      if (resultatenContext) dynamicParts.push(resultatenContext)
      const systemBlocks = [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ]
      if (dynamicParts.length) systemBlocks.push({ type: "text", text: dynamicParts.join("\n\n") })
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1600,
        system: systemBlocks,
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
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      // Opschonen — verwijdert gesprekken vóór een datum. Beveiligd met dashboard-wachtwoord.
      if (action === "cleanup" && request.method === "POST") {
        const crypto = require("crypto")
        let cbody = {}
        try { cbody = await request.json() } catch {}
        const { wachtwoord, voor, dryrun } = cbody
        const DASHBOARD_HASH = "e76ba1957d8c978fc25c9ca24af6280569876436d3fe9ca6418a43144f2f7265"
        const hash = wachtwoord ? crypto.createHash("sha256").update(wachtwoord).digest("hex") : ""
        if (hash !== DASHBOARD_HASH) {
          return { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Onjuist wachtwoord" }) }
        }
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