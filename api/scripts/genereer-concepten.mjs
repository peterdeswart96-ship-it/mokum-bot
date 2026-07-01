// Genereert concept-antwoorden voor de standaardvragen (issue #33).
//
// Roept voor elke vraag de LIVE bot (/api/chat) aan, zodat het concept exact de
// bestaande kennisbronnen + toon van de bot volgt, en slaat het resultaat op als
// vast antwoord met status "concept" (dus NIET meteen live — jij keurt het daarna
// goed in het dashboard). Kost Anthropic-API-credits (1 call per vraag per taal).
//
// Gebruik (Node 18+), vanuit de projectmap:
//   node api/scripts/genereer-concepten.mjs <wachtwoord>              # NL + EN
//   node api/scripts/genereer-concepten.mjs <wachtwoord> --nl         # alleen NL
//   node api/scripts/genereer-concepten.mjs <wachtwoord> --force      # ook al gevulde overschrijven
//
// Standaard worden vragen met een al ingevuld antwoord OVERGESLAGEN (veilig her-draaien).

const API_URL =
  process.env.API_URL || "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"
const args = process.argv.slice(2)
const wachtwoord = args.find((a) => !a.startsWith("--")) || process.env.DASHBOARD_PWD
const talen = args.includes("--nl") ? ["nl"] : args.includes("--en") ? ["en"] : ["nl", "en"]
const force = args.includes("--force")

if (!wachtwoord) {
  console.error("Geef het dashboard-wachtwoord mee: node api/scripts/genereer-concepten.mjs <wachtwoord>")
  process.exit(1)
}

const slaap = (ms) => new Promise((r) => setTimeout(r, ms))

// Verwijdert foto-markdown die de bot zelf toevoegt (foto's koppel je apart in het dashboard).
function schoon(tekst) {
  return String(tekst || "")
    .replace(/!\[[^\]]*\]\([^)]*\/api\/foto\/[^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\/api\/foto\/[^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function vraagBot(vraag) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: vraag }] }),
  })
  if (!res.ok) throw new Error("chat HTTP " + res.status)
  const data = await res.json()
  if (!data || typeof data.reply !== "string") throw new Error("geen antwoord")
  return schoon(data.reply)
}

async function bewaar(entry) {
  const res = await fetch(`${API_URL}/api/standaardvragen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", wachtwoord, entry }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error("opslaan mislukt: " + (data.error || res.status))
  return data.entry
}

console.log(`Concepten genereren (talen: ${talen.join("+")}${force ? ", force" : ""}) via ${API_URL} ...`)
const lijst = (await (await fetch(`${API_URL}/api/standaardvragen`)).json()).vragen || []
console.log(`${lijst.length} standaardvragen gevonden.\n`)

let gedaan = 0, overgeslagen = 0, fouten = 0
for (const entry of lijst) {
  const antwoord = { ...(entry.antwoord || {}) }
  let gewijzigd = false
  for (const lang of talen) {
    const vraag = entry.vraag && entry.vraag[lang]
    if (!vraag) continue
    if (!force && (antwoord[lang] || "").trim()) { overgeslagen++; continue }
    try {
      process.stdout.write(`• [${lang}] ${entry.id}: "${vraag.slice(0, 50)}" ... `)
      antwoord[lang] = await vraagBot(vraag)
      gewijzigd = true
      gedaan++
      console.log("ok")
      await slaap(600) // rustig aan tegen cold starts
    } catch (e) {
      fouten++
      console.log("FOUT:", e.message)
    }
  }
  if (gewijzigd) {
    try {
      await bewaar({ ...entry, antwoord, status: "concept" })
    } catch (e) {
      fouten++
      console.log(`  ! opslaan ${entry.id} mislukt:`, e.message)
    }
  }
}

console.log(`\nKlaar. Gegenereerd: ${gedaan} · overgeslagen (al gevuld): ${overgeslagen} · fouten: ${fouten}`)
console.log("Alles staat als CONCEPT — controleer/verbeter in het dashboard en zet op 'Definitief' om live te gaan.")
