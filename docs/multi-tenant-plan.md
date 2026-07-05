# Multi-tenant plan (#39) — data-isolatie per klant

_Ontwerp vastgelegd 2026-07-05. Bouwt op de auth-fundering #42 (dual-mode) / #43 (rollen) en de config-loader #76._

## Centrale invariant
> **Klant A kan nooit bij data van klant B.** Elke storage-toegang wordt server-side geschaald op een **gevalideerde** client-id; ruwe client-input vormt nooit zelf een account-, container- of pad-segment.

## Vastgelegde beslissingen
| # | Keuze | Waarom |
|---|-------|--------|
| Toernooien | **Uitgesteld** — blijft Mokum-only (Table Storage in Mokums account) | Pool/darts-toernooien zijn Mokum-specifiek; toekomstige klanten hebben dit niet |
| Afzondering | **Eigen resource group + eigen storage account per klant** | Harde Azure-grens (AVG); geen gedeelde storage tussen klanten |
| Registry | **Blob**, centraal in de control-plane | Simpel; past bij de bestaande blob-helpers |
| Credentials | **Managed Identity + RBAC** (geen secrets) | Geen SAS-beheer/rotatie/lek-risico; grootste veiligheidswinst |

## Architectuur
```
Control-plane  (RG: mokum-bot-rg)
  ├─ Function App  mokum-bot-api   ← system-assigned managed identity
  └─ Centraal account              → registry-blob  tenants/<client>.json

Per klant  (RG: mokum-bot-<client>-rg)
  └─ Storage account <client>…     → containers: kennisbronnen, fotos,
                                                  gesprekken, standaardvragen
                                     (namen IDENTIEK per klant; isolatie zit
                                      op account-niveau)

Function App managed identity  ──RBAC: Storage Blob Data Contributor──▶
   ├─ mokumbotrg904a   (tenant: mokum / default)
   ├─ <klant-a>store   (tenant: klant-a)
   └─ <klant-b>store   (tenant: klant-b)
```
- Storage-accountnamen zijn globaal uniek: 3–24 tekens, lowercase alfanumeriek.
- **Geen secrets, geen SAS-in-URL.** De foto-proxy (`/api/foto/<naam>`) haalt bytes server-side op via de managed identity en serveert ze — client ziet nooit een credential.
- Kosten verwaarloosbaar: lege RG's en storage-accounts kosten niets; je betaalt alleen gebruik.

## Tenant-herkenning
- **Publieke widget-calls** (`chat`, `fotos` GET, `standaardvragen` GET, `terugbel`): tenant uit **`?client=<id>`**. De widget stuurt de client-id nu alleen naar zijn eigen config — hij moet 'm óók naar de backend gaan meesturen (**frontend-coördinatiepunt**).
- **Beheer-calls** (dashboard): tenant uit de **Entra-groep/app-rol** van de gebruiker (koppelt aan #42/#43), niet uit client-input. Legacy-wachtwoordfase = alleen de `default`-tenant (Mokum).
- **Sanitatie server-side**, identiek aan de frontend: `^[a-z0-9-]{1,40}$`. Faalt → `default` (publiek) of `400` (beheer). Verhuist naar `lib/tenant.js` — dit is de path-traversal-gate.

## Tenant-registry (bron van waarheid)
Private blob `tenants/<client>.json` in het centrale account. Per klant:
```jsonc
{ "client": "klant-a", "resourceGroup": "mokum-bot-klant-a-rg",
  "storageAccount": "klantabotstore", "entraGroupId": "…", "status": "actief" }
```
De backend mag **niet** voor een willekeurige client-string een account benaderen/aanmaken — onbekende/ongeldige client ⇒ `404`. `mokum`/`default` → bestaand account `mokumbotrg904a` (zie migratie).

## Storage-laag refactor (de kern van de bouw)
Nu hardcoded: `STORAGE_ACCOUNT` + één `AZURE_STORAGE_SAS_TOKEN` + rauwe `https`-REST met SAS-queryparam. Wordt:
- **`@azure/storage-blob`-SDK met `DefaultAzureCredential`** (managed identity) i.p.v. `https`+SAS.
- Parameteriseren op **account** (containernamen blijven gelijk).
- Raakt: `lib/storage.js`, `fotos.js`, `standaardvragen.js`, `chat.js`, `dashboard.js`.
- `@azure/storage-blob` toevoegen aan `api/package.json` (deploy-workflow doet `npm install`).

## Migratie van Mokum
**Geen dataverplaatsing.** Registry-entry `mokum`/`default` wijst naar het bestaande account `mokumbotrg904a`; de managed identity krijgt daar RBAC op. Nul downtime.

## Onboarding nieuwe klant (scripten)
Eén script (Bicep/ARM of `az`): RG + storage account + containers + RBAC-grant (Storage Blob Data Contributor voor de Function App-identity) + registry-entry. Daarna `configs/<client>.json` (frontend, bestaand mechanisme) + de embed-tag met `data-client="<client>"`.

## Gefaseerde uitrol (elke stap veilig deploybaar)
0. **Azure-prep** (vgl. #42 Fase A): system-assigned managed identity aanzetten op `mokum-bot-api`; RBAC `Storage Blob Data Contributor` op `mokumbotrg904a`; `@azure/storage-blob` toevoegen.
1. **Storage-laag → SDK + managed identity**, tegen Mokums bestaande account. Mokum = default → **nul gedragswijziging**; deploybaar en te verifiëren (chat/fotos/standaardvragen blijven werken).
2. **`lib/tenant.js` + registry**; **leespaden** tenant-scopen (chat-kennisbron, fotos GET, standaardvragen GET). Default = mokum.
3. **Schrijf-/beheerpaden** tenant-scopen + **tenant-lidmaatschap afdwingen** (koppelt #42/#43). Widget gaat `client` meesturen (frontend).
4. **Onboarding-script + tweede echte tenant** als end-to-end validatie.
5. **Hardening**: expliciete **cross-tenant-isolatietest** (tenant A → B's account lezen/schrijven ⇒ moet falen), fuzz op de client-id-sanitizer, per-endpoint tenant-enforcement review.

## Bewust uitgesteld / later
- **Toernooien** per-tenant (Mokum-only gelaten).
- **Data-residency per regio**: registry kan later `account → regio` mappen (elke tenant eigen account maakt dit triviaal).
- **Per-tenant Entra-tenants/groepen**: detail bij #43.

## Risico's / aandachtspunten
- RBAC-propagatie op een nieuw account kan enkele minuten duren vóór de identity toegang heeft.
- Lokaal draaien gebruikt `DefaultAzureCredential` (az login / VS Code-credential); in Azure de managed identity — geen codeverschil, wel even testen.
- Fase 1 is een storage-laag-refactor met breed bereik: eerst lokaal/tegen Mokum verifiëren vóór productie.
