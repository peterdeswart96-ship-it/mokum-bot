// Fase 2 — Transform van raw toernooi-archief naar query-tables (issue #5)
//
// Leest de rauwe Cuescore-JSON uit blob-container `toernooien-raw` (bron van
// waarheid uit fase 1) en schrijft afgeleide, query-geoptimaliseerde data:
//
//   Table  Tournaments    PK=jaar,     RK=tournamentId        -> "wie won toernooi X?"
//   Table  PlayerResults  PK=playerId, RK=datum_tournamentId  -> "hoe deed speler X het?"
//   Blob   players-index.json   playerId -> naam   (voor naam-matching vanuit chat)
//
// Alleen afgeronde (Finished) toernooien leveren resultaten op.
//
// Trigger: POST/GET /api/toernooi-transform

const https = require("https")
const { app } = require("@azure/functions")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const RAW_CONTAINER = "toernooien-raw"
const INDEX_CONTAINER = "toernooien-raw" // players-index.json komt naast het archief
const MANIFEST_BLOB = "_manifest.json"
const API_VERSION = "2020-04-08"
const CONCURRENCY = 8

// --- HTTP helper -------------------------------------------------------------

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

// --- Encoding-fix ------------------------------------------------------------
// Cuescore levert namen aan als UTF-8 die als CP1252/Latin-1 is gedecodeerd
// (mojibake: "René" -> "RenÃ©"). We draaien dat terug. Alleen toepassen als de
// string er mojibaked uitziet, zodat correcte namen niet beschadigd raken.

const CP1252_REVERSE = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

function fixEncoding(s) {
  if (!s || !/[ÂÃâ]/.test(s)) return s
  try {
    const bytes = []
    for (const ch of s) {
      const cp = ch.codePointAt(0)
      if (cp <= 0xff) bytes.push(cp)
      else if (CP1252_REVERSE[cp] !== undefined) bytes.push(CP1252_REVERSE[cp])
      else return s // niet te mappen -> origineel laten
    }
    const decoded = Buffer.from(bytes).toString("utf8")
    if (decoded.includes("�")) return s // ongeldige utf8 -> origineel laten
    return decoded
  } catch {
    return s
  }
}

// --- Blob helpers ------------------------------------------------------------

async function listRawBlobs(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${RAW_CONTAINER}?restype=container&comp=list&maxresults=1000&${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  }
  const res = await httpsRequest(options)
  if (res.status !== 200) throw new Error(`Blobs listen mislukt (status ${res.status})`)
  const matches = [...res.body.matchAll(/<Name>([^<]+)<\/Name>/g)]
  return matches.map((m) => m[1]).filter((n) => n.endsWith(".json") && n !== MANIFEST_BLOB)
}

async function getBlob(name, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${RAW_CONTAINER}/${encodeURIComponent(name)}?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": API_VERSION },
  }
  const res = await httpsRequest(options)
  return res.status === 200 ? res.body : null
}

async function putBlob(container, name, content, sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/${container}/${encodeURIComponent(name)}?${sasToken}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(content),
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": API_VERSION,
    },
  }
  const res = await httpsRequest(options, content)
  if (res.status !== 201) throw new Error(`PUT blob ${name} -> status ${res.status}`)
}

// --- Table helpers -----------------------------------------------------------

async function ensureTable(name, sasToken) {
  const body = JSON.stringify({ TableName: name })
  const options = {
    hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
    path: `/Tables?${sasToken}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json;odata=nometadata",
      "x-ms-version": API_VERSION,
    },
  }
  const res = await httpsRequest(options, body)
  // 201 = aangemaakt, 409 = bestaat al
  if (res.status !== 201 && res.status !== 409) {
    console.log(`Table ${name} ensure gaf status ${res.status} (ga door)`)
  }
}

// Insert-or-replace (upsert) van één entity
async function upsertEntity(table, entity, sasToken) {
  const body = JSON.stringify(entity)
  const pk = encodeURIComponent(entity.PartitionKey)
  const rk = encodeURIComponent(entity.RowKey)
  const options = {
    hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
    path: `/${table}(PartitionKey='${pk}',RowKey='${rk}')?${sasToken}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json;odata=nometadata",
      "x-ms-version": API_VERSION,
    },
  }
  const res = await httpsRequest(options, body)
  if (res.status >= 300) throw new Error(`Upsert ${table} ${entity.RowKey} -> status ${res.status}`)
}

// --- Transform-logica --------------------------------------------------------

function safeName(p) {
  if (!p) return ""
  if (typeof p === "string") return fixEncoding(p)
  return fixEncoding(p.name || `${p.firstname || ""} ${p.lastname || ""}`.trim())
}

// Bepaalt winnaar + runner-up uit de Final-match, met fallback op round-robin.
function bepaalWinnaar(data) {
  const matches = data.matches || []
  const finale = matches.find(
    (m) => m.roundCode === "final" || m.roundName === "Final"
  )
  if (finale && (finale.scoreA != null || finale.scoreB != null)) {
    const aWint = Number(finale.scoreA) >= Number(finale.scoreB)
    return {
      winner: aWint ? finale.playerA : finale.playerB,
      runnerUp: aWint ? finale.playerB : finale.playerA,
    }
  }
  // Round-robin met één groep: positie 1 van groep 1
  const st = data.standings || {}
  const keys = Object.keys(st)
  if (keys.length === 1 && st[keys[0]].length) {
    const sorted = [...st[keys[0]]].sort((a, b) => a.position - b.position)
    return { winner: sorted[0]?.player, runnerUp: sorted[1]?.player || null }
  }
  return { winner: null, runnerUp: null }
}

// Diepste ronde die een speler bereikte (op naam, want matches gebruiken namen).
function diepsteRondePerSpeler(matches) {
  const best = {} // naam -> { round, roundName }
  for (const m of matches) {
    if (m.matchstatus !== "finished") continue
    for (const p of [m.playerA, m.playerB]) {
      const naam = safeName(p)
      if (!naam) continue
      if (!best[naam] || m.round > best[naam].round) {
        best[naam] = { round: m.round, roundName: m.roundName }
      }
    }
  }
  return best
}

// Bouwt alle afgeleide records voor één toernooi.
function transformTournament(data) {
  if (data.status !== "Finished") return null

  const tournamentId = String(data.tournamentId)
  const starttime = data.starttime || ""
  const datum = starttime ? starttime.split("T")[0] : "0000-00-00"
  const jaar = datum.slice(0, 4)
  const naam = fixEncoding(data.name || "")
  const discipline = data.discipline || "?"

  const { winner, runnerUp } = bepaalWinnaar(data)
  const winnerName = safeName(winner)
  const runnerUpName = safeName(runnerUp)
  const reached = diepsteRondePerSpeler(data.matches || [])

  // Spelers verzamelen uit de poule-standings (één entry per speler)
  const players = new Map() // playerId -> result
  const urls = {} // playerId -> profiel-URL (voor rating-scrape)
  const st = data.standings || {}
  for (const groep of Object.keys(st)) {
    for (const row of st[groep]) {
      const p = row.player
      if (!p || p.playerId == null) continue
      const pid = String(p.playerId)
      const naamSp = safeName(p)
      if (p.url) urls[pid] = p.url
      const r = reached[naamSp]
      players.set(pid, {
        PartitionKey: pid,
        RowKey: `${datum}_${tournamentId}`,
        playerId: pid,
        playerName: naamSp,
        tournamentId,
        tournamentName: naam,
        discipline,
        date: datum,
        groep,
        groupPosition: row.position ?? 0,
        played: row.played ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        frameWins: row.frameWins ?? 0,
        frameLosses: row.frameLosses ?? 0,
        points: row.points ?? 0,
        reachedRound: r ? r.roundName : "",
        isChampion: naamSp && naamSp === winnerName,
        isRunnerUp: naamSp && naamSp === runnerUpName,
      })
    }
  }

  const tournament = {
    PartitionKey: jaar,
    RowKey: tournamentId,
    tournamentId,
    name: naam,
    discipline,
    date: datum,
    starttime,
    status: data.status,
    winnerName,
    runnerUpName,
    participantCount: players.size,
    matchCount: (data.matches || []).length,
    url: data.url || "",
  }

  return { tournament, playerResults: [...players.values()], playerUrls: urls }
}

// --- Kern --------------------------------------------------------------------

async function transformAll(context) {
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
  if (!sasToken) throw new Error("Geen AZURE_STORAGE_SAS_TOKEN geconfigureerd")

  await ensureTable("Tournaments", sasToken)
  await ensureTable("PlayerResults", sasToken)

  const blobs = await listRawBlobs(sasToken)
  context.log(`Transform gestart: ${blobs.length} archief-blobs`)

  const result = { blobs: blobs.length, tournaments: 0, skipped: 0, playerResults: 0, errors: [] }
  const playersIndex = {} // playerId -> naam
  const playersMeta = {} // playerId -> { name, url }   (voor rating-scrape)

  let i = 0
  async function worker() {
    while (i < blobs.length) {
      const name = blobs[i++]
      try {
        const raw = await getBlob(name, sasToken)
        if (!raw) throw new Error("leeg")
        const data = JSON.parse(raw)
        const out = transformTournament(data)
        if (!out) {
          result.skipped++
          continue
        }
        await upsertEntity("Tournaments", out.tournament, sasToken)
        for (const pr of out.playerResults) {
          await upsertEntity("PlayerResults", pr, sasToken)
          playersIndex[pr.playerId] = pr.playerName
          if (!playersMeta[pr.playerId]) {
            playersMeta[pr.playerId] = { name: pr.playerName, url: out.playerUrls[pr.playerId] || "" }
          }
          result.playerResults++
        }
        result.tournaments++
      } catch (err) {
        result.errors.push({ blob: name, error: err.message })
        context.log(`Transform ${name} mislukt: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // players-index + players-meta wegschrijven
  await putBlob(
    INDEX_CONTAINER,
    "players-index.json",
    JSON.stringify({ updated: new Date().toISOString(), count: Object.keys(playersIndex).length, players: playersIndex }, null, 2),
    sasToken
  )
  await putBlob(
    INDEX_CONTAINER,
    "players-meta.json",
    JSON.stringify({ updated: new Date().toISOString(), count: Object.keys(playersMeta).length, players: playersMeta }, null, 2),
    sasToken
  )
  result.uniquePlayers = Object.keys(playersIndex).length

  context.log(
    `Transform klaar: ${result.tournaments} toernooien, ${result.playerResults} speler-resultaten, ${result.uniquePlayers} unieke spelers, ${result.errors.length} fouten`
  )
  return result
}

// --- Trigger -----------------------------------------------------------------

// Export van pure functies t.b.v. lokale tests (heeft geen effect op de host)
module.exports = { fixEncoding, bepaalWinnaar, transformTournament, diepsteRondePerSpeler }

// Nachtelijk, na de sync (04:00) -> tables vers houden
app.timer("toernooiTransformTimer", {
  schedule: "0 15 4 * * *",
  handler: async (myTimer, context) => {
    try {
      await transformAll(context)
    } catch (err) {
      context.log("Timer transform fout:", err.message)
    }
  },
})

app.http("toernooi-transform", {
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
      const result = await transformAll(context)
      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }
    } catch (error) {
      context.log("Transform endpoint fout:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      }
    }
  },
})
