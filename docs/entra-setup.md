# Entra External ID opzetten (klik-voor-klik) — issue #42

Deze handleiding zet een **Microsoft Entra External ID**-tenant + app-registratie op voor het Mokum-dashboard. Aan het eind stuur je 4 waarden naar Claude, dan wordt de dual-mode login (Entra **naast** het huidige wachtwoord) ingebouwd.

- **Kosten:** €0 — eerste 50.000 maandelijkse actieve gebruikers gratis; jullie zitten daar ver onder.
- **AVG:** kies bij het aanmaken **Europa** als land/regio (EU-datalocatie).
- **Duur:** ± 30 min (tenant aanmaken kan even duren).

---

## Stap 1 — Externe tenant aanmaken
1. Ga naar **https://entra.microsoft.com** en log in met een account met een Azure-abonnement.
2. Links: **Entra ID → Overview → Manage tenants**.
3. Klik **Create** → kies **External** → **Continue**.
4. Tabblad **Basics**:
   - **Tenant name:** `Mokum` (of `Mokum Klanten`).
   - **Domain name:** bijv. `mokumpooldarts` (wordt `mokumpooldarts.onmicrosoft.com`).
   - **Country/Region:** **Netherlands** (of een ander EU-land) → EU-datalocatie.
5. Tabblad **Subscription**: kies je Azure-abonnement + resourcegroep (voor facturatie buiten de gratis laag).
6. **Review + create** → **Create**. Wachten tot de tenant klaar is (kan tot ~30 min duren).

## Stap 2 — Overschakelen naar de nieuwe tenant
1. Klik rechtsboven op het **instellingen-icoon (⚙)** → **Switch** → kies de nieuwe **Mokum** externe tenant.
2. Controleer linksboven dat je nu in de Mokum-tenant zit.

## Stap 3 — App registreren (SPA)
1. **Entra ID → App registrations → New registration**.
2. **Name:** `Mokum Dashboard`.
3. **Supported account types:** laat op de standaard (accounts in deze directory).
4. **Redirect URI:** kies platform **Single-page application (SPA)** en vul in:
   - `https://mokum-bot.pdscloud.nl/dashboard.html`
5. **Register**.
6. Ga daarna naar **Authentication** en voeg onder **Single-page application** nog een redirect-URI toe voor lokaal testen:
   - `http://localhost:5173/dashboard.html`
   - **Save**.

> Geen client-secret nodig — een SPA gebruikt PKCE.

## Stap 4 — De ID's noteren
Op de **Overview** van de app-registratie:
- **Application (client) ID** → dit is straks `clientId` (frontend) én `ENTRA_AUDIENCE` (backend).
- **Directory (tenant) ID** → `tenantId`.

## Stap 5 — Issuer + JWKS ophalen (belangrijk voor de backend)
Open in je browser de OIDC-metadata van de tenant (vervang `<domain>` en `<tenantId>`):

```
https://<domain>.ciamlogin.com/<tenantId>/v2.0/.well-known/openid-configuration
```

In de JSON die verschijnt vind je twee velden:
- **`issuer`** → dit is `ENTRA_ISSUER`.
- **`jwks_uri`** → dit is `ENTRA_JWKS_URI`.

## Stap 6 — Inloggen instellen (uitnodigen, geen open aanmelding)
1. **Entra ID → External Identities → User flows → New user flow**.
2. Type **Sign in** (of Sign up and sign in), naam bijv. `mokum-signin`, identiteitsprovider **Email + wachtwoord** (of Email one-time-passcode).
3. **Create**, open de user flow → **Applications** → **Add application** → kies **Mokum Dashboard**.
4. Nodig jezelf + Nick uit: **Entra ID → Users → New user → Invite external user** (of maak interne gebruikers aan in de tenant).

## Stap 7 — Dit stuur je naar Claude
Vier waarden (uit stap 4 en 5):

| Wat | Voorbeeld | Gebruikt voor |
|-----|-----------|---------------|
| Directory (tenant) ID | `xxxxxxxx-…` | frontend authority + issuer |
| Application (client) ID | `yyyyyyyy-…` | frontend `clientId` + backend `ENTRA_AUDIENCE` |
| `issuer` (uit metadata) | `https://mokumpooldarts.ciamlogin.com/<tenantId>/v2.0` | `ENTRA_ISSUER` |
| `jwks_uri` (uit metadata) | `https://…/discovery/v2.0/keys` | `ENTRA_JWKS_URI` |

Claude zet `ENTRA_ISSUER` / `ENTRA_AUDIENCE` / `ENTRA_JWKS_URI` als **Function App-instellingen** (Azure Portal → Function App `mokum-bot-api` → Configuration) en bouwt de frontend-login. Zolang die instellingen er niet zijn, blijft het dashboard gewoon op het gedeelde wachtwoord werken (dual-mode).

---

## Later — rollen (issue #43)
Voor admin/editor/lezer:
1. App-registratie → **App roles → Create app role** (Value: `admin`, `editor`, `lezer`).
2. **Enterprise applications → Mokum Dashboard → Users and groups**: wijs gebruikers een rol toe.
De rol komt dan als `roles`-claim in het token; de backend dwingt de rechten per endpoint af.

## Bronnen
- [Create an external tenant (Microsoft Learn)](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal)
- [Quickstart get started (Microsoft Learn)](https://learn.microsoft.com/en-us/entra/external-id/customers/quickstart-get-started-guide)
- [SPA sign-in quickstart (Microsoft Learn)](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-single-page-app-sign-in)
- [External ID pricing (Microsoft Learn)](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing)
