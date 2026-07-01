// Kennisbronnen listen/verwijderen in Azure Blob Storage.
//
// Leest de SAS-token uit upload-kennisbronnen.ps1 (staat al in het repo) zodat de
// credential niet op de command line hoeft. Alleen 'verwijder' is destructief.
//
// Gebruik (vanuit projectmap):
//   node api/scripts/kennisbron-beheer.mjs list [zoekterm]     # toon (gefilterde) blobs
//   node api/scripts/kennisbron-beheer.mjs verwijder <blobnaam>  # verwijder één blob

import fs from "fs"

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"
const HOST = `${STORAGE_ACCOUNT}.blob.core.windows.net`
const API_VERSION = "2020-04-08"

// SAS uit het bestaande upload-script halen (of uit env KENNISBRON_SAS).
function leesSas() {
  if (process.env.KENNISBRON_SAS) return process.env.KENNISBRON_SAS
  const ps1 = fs.readFileSync("upload-kennisbronnen.ps1", "utf8")
  const m = ps1.match(/\$SasToken\s*=\s*"([^"]+)"/)
  if (!m) throw new Error("SAS-token niet gevonden in upload-kennisbronnen.ps1")
  return m[1]
}

const sas = leesSas()
const [cmd, arg] = process.argv.slice(2)

async function list(filter) {
  const res = await fetch(`https://${HOST}/${CONTAINER}?restype=container&comp=list&${sas}`, {
    headers: { "x-ms-version": API_VERSION },
  })
  const xml = await res.text()
  if (!res.ok) throw new Error(`List status ${res.status}: ${xml.slice(0, 200)}`)
  const namen = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1])
  const f = (filter || "").toLowerCase()
  const getoond = f ? namen.filter((n) => n.toLowerCase().includes(f)) : namen
  console.log(`${getoond.length} blob(s)${f ? ` met "${filter}"` : ""}:`)
  getoond.forEach((n) => console.log("  " + n))
  return getoond
}

async function verwijder(naam) {
  if (!naam) throw new Error("Geef de blobnaam mee.")
  const res = await fetch(`https://${HOST}/${CONTAINER}/${naam.split("/").map(encodeURIComponent).join("/")}?${sas}`, {
    method: "DELETE",
    headers: { "x-ms-version": API_VERSION },
  })
  if (res.status === 202) console.log(`✓ Verwijderd: ${naam}`)
  else console.log(`✗ Mislukt (${res.status}): ${naam}`)
}

if (cmd === "list") await list(arg)
else if (cmd === "verwijder") await verwijder(arg)
else console.log("Gebruik: node api/scripts/kennisbron-beheer.mjs list [zoekterm] | verwijder <blobnaam>")
