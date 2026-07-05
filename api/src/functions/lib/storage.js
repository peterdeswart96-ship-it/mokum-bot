// Gedeelde Azure Blob/Table-storage-helpers (#71). Ge-require'd door de losse endpoint-modules
// (bijv. terugbel.js). Ligt bewust in lib/ zodat de Functions-host-glob (src/functions/*.js)
// dit bestand NIET als endpoint-module inleest. Groeit mee terwijl chat.js verder wordt opgesplitst.
const https = require("https")

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"

// Verzamelt de respons als Buffers en decodeert daarna pas naar UTF-8. Belangrijk: bij
// string-concatenatie per chunk kan een multi-byte teken (é, ë, …) dat over een chunk-grens
// valt corrupt raken; Buffer.concat voorkomt dat. (#71 — geünificeerd met fotos/standaardvragen.)
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") }))
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

// --- SDK + managed identity blob-laag (#39 fase 1) ---
// Benadert blobs via @azure/storage-blob + DefaultAzureCredential (managed identity in Azure,
// az-login lokaal) i.p.v. rauwe SAS-REST. Geparametriseerd op account → elke tenant kan zijn
// eigen storage-account krijgen (data-isolatie, #39). Lazy require + client-cache per account,
// zodat het requiren van deze module niet afhangt van de SDK en de bestaande SAS-helpers blijven werken.
const DEFAULT_ACCOUNT = STORAGE_ACCOUNT // mokumbotrg904a — Mokum is de default-tenant
const _serviceClients = new Map()

function serviceClient(account) {
  const acc = account || DEFAULT_ACCOUNT
  if (!_serviceClients.has(acc)) {
    const { BlobServiceClient } = require("@azure/storage-blob")
    const { DefaultAzureCredential } = require("@azure/identity")
    _serviceClients.set(acc, new BlobServiceClient(`https://${acc}.blob.core.windows.net`, new DefaultAzureCredential()))
  }
  return _serviceClients.get(acc)
}

function containerClient(account, container) {
  return serviceClient(account).getContainerClient(container)
}

// Leest een blob als UTF-8 tekst; null bij 404/leeg/fout.
async function readBlobText(account, container, blobPath) {
  try {
    const buf = await containerClient(account, container).getBlockBlobClient(blobPath).downloadToBuffer()
    return buf.toString("utf-8")
  } catch (err) {
    if (err && (err.statusCode === 404 || err.code === "BlobNotFound")) return null
    console.log(`readBlobText mislukt (${container}/${blobPath}):`, err.message)
    return null
  }
}

// Leest ruwe bytes + content-type (voor de foto-proxy). { status, buffer, contentType }.
async function readBlobBuffer(account, container, blobPath) {
  try {
    const dl = await containerClient(account, container).getBlockBlobClient(blobPath).download()
    const chunks = []
    for await (const c of dl.readableStreamBody) chunks.push(c)
    return { status: 200, buffer: Buffer.concat(chunks), contentType: dl.contentType || "application/octet-stream" }
  } catch (err) {
    if (err && (err.statusCode === 404 || err.code === "BlobNotFound")) return { status: 404, buffer: Buffer.alloc(0), contentType: "" }
    console.log(`readBlobBuffer mislukt (${container}/${blobPath}):`, err.message)
    return { status: err.statusCode || 502, buffer: Buffer.alloc(0), contentType: "" }
  }
}

// Lijst blobnamen (optioneel met prefix).
async function listBlobNames(account, container, prefix) {
  try {
    const names = []
    for await (const b of containerClient(account, container).listBlobsFlat(prefix ? { prefix } : undefined)) names.push(b.name)
    return names
  } catch (err) {
    console.log(`listBlobNames mislukt (${container}):`, err.message)
    return []
  }
}

// Schrijft (overschrijft) een blob. content = string of Buffer. Gooit bij falen.
async function writeBlob(account, container, blobPath, content, contentType) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf-8")
  const opts = contentType ? { blobHTTPHeaders: { blobContentType: contentType } } : undefined
  await containerClient(account, container).getBlockBlobClient(blobPath).upload(body, body.length, opts)
  return true
}

// Verwijdert een blob (idempotent). Geeft true (verwijderd of al weg).
async function deleteBlob(account, container, blobPath) {
  await containerClient(account, container).getBlockBlobClient(blobPath).deleteIfExists()
  return true
}

// Borgt dat een (privé) container bestaat.
async function ensureContainer(account, container) {
  await containerClient(account, container).createIfNotExists()
  return true
}

module.exports = {
  STORAGE_ACCOUNT, CONTAINER, httpsRequest, nieuweBlobNaam, fetchBlobContent, listAllBlobs,
  // SDK + managed identity (#39 fase 1):
  readBlobText, readBlobBuffer, listBlobNames, writeBlob, deleteBlob, ensureContainer,
}
