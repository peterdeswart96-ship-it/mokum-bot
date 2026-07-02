// Dual-mode autorisatie voor de dashboard-endpoints (issue #42/#43).
//
// Accepteert twee manieren, zodat de overgang zonder verstoring kan:
//   1) Een geldig Microsoft Entra External ID-token (Bearer) — ALLEEN actief zodra
//      de ENTRA_*-env-vars zijn gezet.
//   2) Het bestaande gedeelde wachtwoord (legacy) — blijft werken tot het wordt
//      uitgefaseerd.
//
// Zonder Entra-config gedraagt dit zich exact als de huidige wachtwoord-check.
// Deze helper is nog NIET op de endpoints aangesloten; dat gebeurt in stap B van
// het implementatieplan (na de Azure/Entra-setup), zodat we het eerst kunnen testen.

const crypto = require("crypto")

// sha256("mkm!") — zelfde gedeelde dashboard-wachtwoord als nu
const DASHBOARD_HASH = "e76ba1957d8c978fc25c9ca24af6280569876436d3fe9ca6418a43144f2f7265"

// Entra-config (in te vullen als App Settings ná de tenant/app-registratie):
const ENTRA_ISSUER = process.env.ENTRA_ISSUER || "" // bijv. https://<tenant>.ciamlogin.com/<tenantId>/v2.0
const ENTRA_AUDIENCE = process.env.ENTRA_AUDIENCE || "" // client-ID of api://<client-id>
const ENTRA_JWKS_URI = process.env.ENTRA_JWKS_URI || "" // <issuer>/discovery/v2.0/keys
const entraActief = () => !!(ENTRA_ISSUER && ENTRA_AUDIENCE && ENTRA_JWKS_URI)

function wachtwoordOk(wachtwoord) {
  return crypto.createHash("sha256").update(wachtwoord || "").digest("hex") === DASHBOARD_HASH
}

// Leest een header uit een Azure Functions v4-request (Headers-achtig) of een plat object.
function header(request, naam) {
  try {
    if (request && request.headers && typeof request.headers.get === "function") return request.headers.get(naam)
    return request && request.headers && (request.headers[naam] || request.headers[naam.toLowerCase()])
  } catch { return null }
}

let _jwks
function verifyJwt(token) {
  const jwt = require("jsonwebtoken")
  const jwksClient = require("jwks-rsa")
  if (!_jwks) _jwks = jwksClient({ jwksUri: ENTRA_JWKS_URI, cache: true, rateLimit: true })
  const getKey = (h, cb) => _jwks.getSigningKey(h.kid, (e, key) => cb(e, key && key.getPublicKey()))
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      { issuer: ENTRA_ISSUER, audience: ENTRA_AUDIENCE, algorithms: ["RS256"] },
      (err, payload) => (err ? reject(err) : resolve(payload))
    )
  })
}

// Retourneert { ok, methode, user, roles } of { ok:false }.
// roles: array met bijv. "admin" | "editor" | "lezer" (voor #43).
async function autoriseer(request, body) {
  // 1) Entra-token (alleen als geconfigureerd)
  if (entraActief()) {
    const authz = header(request, "authorization")
    const m = authz && /^Bearer\s+(.+)$/i.exec(authz)
    if (m) {
      try {
        const p = await verifyJwt(m[1])
        const roles = p.roles || (p.role ? [p.role] : [])
        return { ok: true, methode: "entra", user: p.preferred_username || p.email || p.oid || "onbekend", roles: roles.length ? roles : ["admin"] }
      } catch {
        // ongeldig token → val terug op wachtwoord-check
      }
    }
  }
  // 2) Legacy gedeeld wachtwoord (dual-mode). Legacy = volledige rechten (admin).
  if (wachtwoordOk(body && body.wachtwoord)) {
    return { ok: true, methode: "wachtwoord", user: "gedeeld", roles: ["admin"] }
  }
  return { ok: false }
}

// Rol-check voor #43 (server-side afdwingen per endpoint).
function heeftRol(roles, ...toegestaan) {
  return Array.isArray(roles) && roles.some((r) => toegestaan.includes(r))
}

module.exports = { autoriseer, heeftRol, wachtwoordOk, entraActief }
