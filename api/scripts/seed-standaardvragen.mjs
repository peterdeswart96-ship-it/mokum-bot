// Seed de standaardvragen-index vanuit de bestaande widget-voorbeeldvragen (issue #33).
//
// Bouwt per rubriek → onderwerp → vraag een entry (NL + EN vraagtekst), met een
// LEEG antwoord (zodat de vraag gewoon door de bot beantwoord blijft worden totdat
// Nick een vast antwoord invult) en stuurt de hele lijst naar /api/standaardvragen.
//
// Gebruik (Node 18+):
//   node api/scripts/seed-standaardvragen.js <wachtwoord>
//   API_URL=https://... node api/scripts/seed-standaardvragen.js <wachtwoord>
//
// Draai dit ná het deployen van de standaardvragen-functie. Idempotent: 'import'
// vervangt de hele lijst, dus je kunt 'm veilig opnieuw draaien (overschrijft wel
// handmatig ingevulde antwoorden — draai daarna niet opnieuw als je al antwoorden hebt).

import translations from "../../src/config/translations.js"

const API_URL =
  process.env.API_URL || "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"
const wachtwoord = process.argv[2] || process.env.DASHBOARD_PWD
if (!wachtwoord) {
  console.error("Geef het dashboard-wachtwoord mee: node api/scripts/seed-standaardvragen.js <wachtwoord>")
  process.exit(1)
}

// Topic → rubriek (uit CATEGORIES in public/widget.js). Onderwerpen zonder eigen
// voorbeeldvragen (spelregels, anders) worden overgeslagen.
const CATEGORIES = [
  { id: "toernooien", topics: ["ledendag", "toernooien", "resultaten", "amsterdam-open"] },
  { id: "spelen", topics: ["pool", "darts", "spelregels", "gaming"] },
  { id: "praktisch", topics: ["openingstijden", "tarieven", "locatie", "eten-drinken", "sport"] },
  { id: "service", topics: ["keu-reparatie", "keu-shop", "clinics"] },
  { id: "overig", topics: ["intern", "anders"] },
]

const nl = translations.nl
const en = translations.en

const entries = []
for (const cat of CATEGORIES) {
  for (const onderwerp of cat.topics) {
    const nlVragen = (nl.questions && nl.questions[onderwerp]) || []
    const enVragen = (en.questions && en.questions[onderwerp]) || []
    nlVragen.forEach((vraag, i) => {
      entries.push({
        id: `${onderwerp}-${i + 1}`,
        rubriek: cat.id,
        onderwerp,
        volgnummer: i,
        actief: true,
        vraag: { nl: vraag, en: enVragen[i] || "" },
        antwoord: { nl: "", en: "" },
        fotos: [],
      })
    })
  }
}

console.log(`Seed: ${entries.length} standaardvragen samengesteld. Versturen naar ${API_URL} ...`)

const res = await fetch(`${API_URL}/api/standaardvragen`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "import", wachtwoord, entries }),
})
const data = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`Mislukt (${res.status}):`, data)
  process.exit(1)
}
console.log(`Klaar — ${data.aantal ?? entries.length} standaardvragen opgeslagen in de index.`)
