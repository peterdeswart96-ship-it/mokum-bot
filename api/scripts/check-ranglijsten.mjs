// Lokale verificatie + diagnose voor de ranglijsten (issue #60).
//
// Draait de NIEUWE ranglijst-logica op de ECHTE data (Table Storage) zodat je
// vóór deploy kunt zien wat er verandert, en toont welke discipline-labels er in
// de data zitten (om mislabels op te sporen). Wijzigt niets — alleen lezen.
//
// Gebruik (vanuit projectmap), zet eerst de SAS-token:
//   PowerShell:  $env:AZURE_STORAGE_SAS_TOKEN = "se=...&sig=..."
//   node api/scripts/check-ranglijsten.mjs

const STORAGE_ACCOUNT = "mokumbotrg904a"
const sas = process.env.AZURE_STORAGE_SAS_TOKEN || process.env.KENNISBRON_SAS
if (!sas) {
  console.error("Geen SAS-token. Zet: $env:AZURE_STORAGE_SAS_TOKEN = '<token>'")
  process.exit(1)
}

// ---- Zelfde criteria als chat.js (issue #60) --------------------------------
const DISCIPLINES = ["8-Ball", "9-Ball", "10-Ball"]
const SCORING = { kampioen: 8, finalist: 5, halveFinale: 3, kwartFinale: 2, laatste16: 1, perGewonnenPartij: 0.2 }
const BEGINNERS_SERIES = new Set(["Fluke Ranking", "Handicap Madness"])
const MIN_APP_PERIODE = 3
const MIN_APP_ALLTIME = 5
const MAIN_SERIES = ["Fluke Ranking", "Handicap Madness", "MEGA Ranking", "MEGA Summer Ranking", "8/10ball Zaterdag", "OnePocket Monthly", "9 ball Sunday"]

function classifySeries(name) {
  const n = (name || "").toLowerCase()
  if (n.includes("fluke")) return "Fluke Ranking"
  if (n.includes("madness")) return "Handicap Madness"
  if (n.includes("mega") && n.includes("summer")) return "MEGA Summer Ranking"
  if (n.includes("mega")) return "MEGA Ranking"
  if (n.includes("8 & 10") || n.includes("& 10ball") || n.includes("8ball ranking") || n.includes("10ball ranking")) return "8/10ball Zaterdag"
  if (n.includes("onepocket") || n.includes("one pocket")) return "OnePocket Monthly"
  if (n.includes("sunday")) return "9 ball Sunday"
  return "Overig"
}

function buildLeaderboard(rows, key, minAppearances = 1) {
  const isDiscipline = DISCIPLINES.includes(key)
  const agg = {}
  for (const r of rows) {
    const serie = classifySeries(r.tournamentName)
    if (key === "all") { if (BEGINNERS_SERIES.has(serie)) continue }
    else if (isDiscipline) { if ((r.discipline || "") !== key) continue; if (BEGINNERS_SERIES.has(serie)) continue }
    else if (serie !== key) continue
    const pid = r.playerId
    if (!agg[pid]) agg[pid] = { name: r.playerName, score: 0, titles: 0, finals: 0, appearances: 0, wins: 0, losses: 0 }
    const a = agg[pid]
    const champ = r.isChampion === true || r.isChampion === "true"
    const runner = r.isRunnerUp === true || r.isRunnerUp === "true"
    let pts = champ ? SCORING.kampioen : runner ? SCORING.finalist
      : r.reachedRound === "Semi final" ? SCORING.halveFinale
      : r.reachedRound === "Quarter final" ? SCORING.kwartFinale
      : r.reachedRound === "Last sixteen" ? SCORING.laatste16 : 0
    pts += (Number(r.wins) || 0) * SCORING.perGewonnenPartij
    a.score += pts; a.appearances++; a.wins += Number(r.wins) || 0; a.losses += Number(r.losses) || 0
    if (champ) a.titles++
    if (champ || runner) a.finals++
  }
  let board = Object.values(agg)
  if (minAppearances > 1) { const g = board.filter((a) => a.appearances >= minAppearances); if (g.length) board = g }
  return board.sort((x, y) => y.titles - x.titles || y.finals - x.finals || y.score - x.score || y.wins - x.wins || y.appearances - x.appearances)
}

// ---- Table Storage ophalen (gepagineerd) ------------------------------------
async function tableAll(table) {
  let rows = [], npk = null, nrk = null, pages = 0
  do {
    const parts = []
    if (npk) parts.push(`NextPartitionKey=${encodeURIComponent(npk)}`)
    if (nrk) parts.push(`NextRowKey=${encodeURIComponent(nrk)}`)
    const qs = parts.length ? parts.join("&") + "&" : ""
    const res = await fetch(`https://${STORAGE_ACCOUNT}.table.core.windows.net/${table}()?${qs}${sas}`, {
      headers: { Accept: "application/json;odata=nometadata", "x-ms-version": "2020-04-08" },
    })
    if (!res.ok) { console.error(`${table} status ${res.status}`); break }
    const data = await res.json()
    rows = rows.concat(data.value || [])
    npk = res.headers.get("x-ms-continuation-nextpartitionkey")
    nrk = res.headers.get("x-ms-continuation-nextrowkey")
    pages++
  } while ((npk || nrk) && pages < 50)
  return rows
}

const fmt = (b) => b.map((a, i) => `   ${i + 1}. ${a.name} — ${a.titles} titel(s), ${a.finals} finale(s), ${a.appearances} toernooien, ${a.wins}W-${a.losses}V`).join("\n")

const results = await tableAll("PlayerResults")
console.log(`PlayerResults: ${results.length} rijen\n`)

// --- Fase 4: discipline-labels diagnose ---
const discCount = {}
for (const r of results) discCount[r.discipline || "(leeg)"] = (discCount[r.discipline || "(leeg)"] || 0) + 1
console.log("=== Discipline-labels in de data (Fase 4-diagnose) ===")
Object.entries(discCount).sort((a, b) => b[1] - a[1]).forEach(([d, n]) => console.log(`   ${JSON.stringify(d)} → ${n}`))
const bekend = new Set(DISCIPLINES)
const vreemd = Object.keys(discCount).filter((d) => d !== "(leeg)" && !bekend.has(d))
console.log(vreemd.length ? `   ⚠️ Labels die NIET matchen met ${DISCIPLINES.join("/")}: ${vreemd.map((d) => JSON.stringify(d)).join(", ")}` : "   ✓ Alle labels matchen 8-Ball/9-Ball/10-Ball.")

// --- reeks-verdeling (om Handicap Madness/Fluke te herkennen) ---
const serieCount = {}
for (const r of results) { const s = classifySeries(r.tournamentName); serieCount[s] = (serieCount[s] || 0) + 1 }
console.log("\n=== Reeks-classificatie (beginners worden uitgesloten uit overall/discipline) ===")
Object.entries(serieCount).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`   ${s}${BEGINNERS_SERIES.has(s) ? " (beginner → uitgesloten)" : ""} → ${n}`))

// --- Fase 0: nieuwe ranglijsten (aller tijden, drempel ≥5) ---
console.log(`\n=== NIEUW: Overall top 10 (aller tijden, ≥${MIN_APP_ALLTIME} toernooien, beginners uitgesloten) ===`)
console.log(fmt(buildLeaderboard(results, "all", MIN_APP_ALLTIME).slice(0, 10)))
console.log(`\n=== NIEUW: 9-Ball top 10 (aller tijden, ≥${MIN_APP_ALLTIME}) ===`)
console.log(fmt(buildLeaderboard(results, "9-Ball", MIN_APP_ALLTIME).slice(0, 10)))
console.log("\n=== NIEUW: Top 5 per toernooisoort (aller tijden) ===")
for (const s of MAIN_SERIES) {
  const b = buildLeaderboard(results, s, MIN_APP_ALLTIME).slice(0, 5)
  console.log(`\n ${s}:`)
  console.log(b.length ? fmt(b) : "   (geen resultaten boven de drempel)")
}
console.log("\nKlaar. Vergelijk dit met de huidige live-antwoorden om het effect te zien.")
