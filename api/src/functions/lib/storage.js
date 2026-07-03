// Gedeelde Azure Blob/Table-storage-helpers (#71). Ge-require'd door de losse endpoint-modules
// (bijv. terugbel.js). Ligt bewust in lib/ zodat de Functions-host-glob (src/functions/*.js)
// dit bestand NIET als endpoint-module inleest. Groeit mee terwijl chat.js verder wordt opgesplitst.
const https = require("https")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"

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

// Sorteerbare blobnaam in Amsterdam-tijd: "YYYY-MM-DDTHH-MM-SS-<random>.json"
// sv-SE geeft "YYYY-MM-DD HH:MM:SS"; omzetten naar "YYYY-MM-DDTHH-MM-SS".
function nieuweBlobNaam() {
  const amsTijd = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Amsterdam",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T").replace(/:/g, "-")
  const random = Math.random().toString(36).substring(2, 8)
  return `${amsTijd}-${random}.json`
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

module.exports = { STORAGE_ACCOUNT, CONTAINER, httpsRequest, nieuweBlobNaam, fetchBlobContent, listAllBlobs }
