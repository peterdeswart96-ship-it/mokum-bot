// Kennisbronnen listen/verwijderen in Azure Blob Storage.
//
// Leest de SAS-token uit de omgevingsvariabele AZURE_STORAGE_SAS_TOKEN (nooit
// hardcoden). Alleen 'verwijder' is destructief.
//
// Gebruik (vanuit projectmap), zet eerst de token:
//   PowerShell:  $env:AZURE_STORAGE_SAS_TOKEN = "se=...&sig=..."
//   bash:        export AZURE_STORAGE_SAS_TOKEN="se=...&sig=..."
//   node api/scripts/kennisbron-beheer.mjs list [zoekterm]      # toon (gefilterde) blobs
//   node api/scripts/kennisbron-beheer.mjs verwijder <blobnaam>   # verwijder één blob

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"
const HOST = `${STORAGE_ACCOUNT}.blob.core.windows.net`
const API_VERSION = "2020-04-08"

// SAS-token uit de omgevingsvariabele (nooit hardcoden).
function leesSas() {
  const sas = process.env.AZURE_STORAGE_SAS_TOKEN || process.env.KENNISBRON_SAS
  if (!sas) {
    throw new Error(
      "Geen SAS-token. Zet 'm eerst — PowerShell: $env:AZURE_STORAGE_SAS_TOKEN = '<token>' | bash: export AZURE_STORAGE_SAS_TOKEN='<token>'"
    )
  }
  return sas
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
