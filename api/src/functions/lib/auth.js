// Gedeelde dashboard-wachtwoordcheck (#71/#68). De hash komt uit de App Setting DASHBOARD_HASH
// in Azure — geen fallback in de repo: ontbreekt de env-var, dan faalt elke check (fail-closed)
// i.p.v. terug te vallen op een hash in de code.
const crypto = require("crypto")

const DASHBOARD_HASH = process.env.DASHBOARD_HASH

function checkPwd(wachtwoord) {
  return crypto.createHash("sha256").update(wachtwoord || "").digest("hex") === DASHBOARD_HASH
}

module.exports = { checkPwd }
