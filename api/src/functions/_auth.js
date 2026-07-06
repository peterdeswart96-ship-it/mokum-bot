// Dual-mode autorisatie voor de dashboard-endpoints (issue #42/#43).
//
// Accepteert twee manieren, zodat de overgang zonder verstoring kan:
//   1) Een geldig Microsoft Entra External ID-token (Bearer) — ALLEEN actief zodra
//      de ENTRA_*-env-vars zijn gezet.
//   2) Het bestaande gedeelde wachtwoord (legacy) — blijft werken tot het wordt
//      uitgefaseerd.
//
// Zonder Entra-config gedraagt dit zich exact als de huidige wachtwoord-check.
// Aangesloten op de dashboard-endpoints (dashboard.js/fotos.js/standaardvragen.js) — stap B.
// Entra-acceptatie activeert zodra de ENTRA_*-App-Settings in Azure zijn gezet.

const crypto = require("crypto")

// Dashboard-wachtwoord-hash uit de App Setting DASHBOARD_HASH in Azure (#68) — geen fallback in de repo.
const DASHBOARD_HASH = process.env.DASHBOARD_HASH

// Entra-config (in te vullen als App Settings ná de tenant/app-registratie):
const ENTRA_ISSUER = process.env.ENTRA_ISSUER || "" // bijv. https://<tenant>.ciamlogin.com/<tenantId>/v2.0
const ENTRA_AUDIENCE = process.env.ENTRA_AUDIENCE || "" // client-ID of api://<client-id>
const ENTRA_JWKS_URI = process.env.ENTRA_JWKS_URI || "" // <issuer>/discovery/v2.0/keys
const entraActief = () => !!(ENTRA_ISSUER && ENTRA_AUDIENCE && ENTRA_JWKS_URI)

// Allowlist (#91): alleen deze gebruikers mogen via Entra binnen. Komma-gescheiden
// e-mails/oid's in de App Setting ENTRA_ALLOWED_USERS. Secure-by-default: een lege/
// ongezette lijst = GEEN Entra-toegang (het wachtwoord-pad blijft werken, dus niemand
// raakt buitengesloten). Voorkomt dat elk zelf-geregistreerd CIAM-account admin wordt.
const ENTRA_ALLOWED = (process.env.ENTRA_ALLOWED_USERS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
function entraUserToegestaan(payload) {
  if (!ENTRA_ALLOWED.length) return false
  const ids = [payload && payload.preferred_username, payload && payload.email, payload && payload.oid]
    .filter(Boolean).map((s) => String(s).toLowerCase())
  return ids.some((id) => ENTRA_ALLOWED.includes(id))
}

// Rol-hiërarchie (#43): superuser ⊇ admin ⊇ users. De rollen komen uit de
// app-rol-claim (`roles`) van het Entra-token (app-rollen op de app-registratie).
const ROL_RANG = { users: 1, admin: 2, superuser: 3 }
function tokenRollen(payload) {
  const raw = Array.isArray(payload && payload.roles) ? payload.roles : (payload && payload.role ? [payload.role] : [])
  return raw.map((r) => String(r).toLowerCase()).filter((r) => ROL_RANG[r])
}
function rolRang(roles) {
  return Math.max(0, ...(Array.isArray(roles) ? roles : []).map((r) => ROL_RANG[String(r).toLowerCase()] || 0))
}
// True als de rollen minstens `minRol` halen (bijv. admin telt voor een users-check).
function magMinstens(roles, minRol) {
  return rolRang(roles) >= (ROL_RANG[minRol] || 99)
}

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
        const rollen = tokenRollen(p)
        if (rollen.length) {
          // Toegewezen app-rol(len) → dat is de gate én de rechten (#43).
          return { ok: true, methode: "entra", user: p.preferred_username || p.email || p.oid || "onbekend", roles: rollen }
        }
        // Geen bekende app-rol maar wél op de e-mail-allowlist → transitie: geef admin (#91).
        if (entraUserToegestaan(p)) {
          return { ok: true, methode: "entra", user: p.preferred_username || p.email || p.oid || "onbekend", roles: ["admin"] }
        }
        // geldig token, geen rol en niet op allowlist → val terug op wachtwoord-check
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

module.exports = { autoriseer, heeftRol, magMinstens, wachtwoordOk, entraActief, entraUserToegestaan, tokenRollen }
