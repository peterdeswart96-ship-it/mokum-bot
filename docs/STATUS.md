# Projectstand — Mokum-bot

_Laatst bijgewerkt: 2026-07-05. Zie `docs/sessions/` voor uitgebreide logs per chat, en `git log` / gesloten issues voor details._

## Live op productie (recent gebouwd)
- **🔒 #42 Fase B — dual-mode auth (Entra + wachtwoord)** live: `autoriseer()` uit `_auth.js` op alle 9 beheer-checkpunten (dashboard 7×, fotos, standaardvragen); `auth.js` login houdt `checkPwd`. App Settings `ENTRA_ISSUER/AUDIENCE/JWKS_URI` gezet → Entra-token wordt geaccepteerd náást het wachtwoord (geen verstoring). Commit `3e7a32a`.
- **#79 backend — `/api/icoon-genereer`** live: Claude genereert een **gesaneerde SVG** (currentColor, geen script/handlers/externe refs), iteratief te verfijnen. Commit `c984809`. Frontend-knop + opslaan (na #78) = frontend-lane.
- **CORS** — dashboard-endpoints staan nu `Authorization` toe (prep #42 Fase C). Commit `0c552e2`.
- **Widget Customizer (frontend-lane)** — dashboardpagina + live preview (#77), icoon-tab preset+upload (#78), bubble-instellingen (#80), vrije positionering (#81). Commits `61cf2ba`/`75ba9c5`/`3eb2873`/`5cbbdc7`.
- Ouder: backend opgesplitst in modules + `lib/` (#71), respons-robuustheid + CORS (#72), rate-limit + input-cap (#67), AVG-terugbel (#74), config-loader `data-client` + fallback (#75/#76), dashboard-auth (#65/#66/#68), standaardvragen (#33), ranglijsten (#60), foto-nummering (#55/#58/#63).

## Loopt / wacht
- **#39 — multi-tenant white-label** (epic, **actief backend-track**). Ontwerp vastgelegd: `docs/multi-tenant-plan.md` (**eigen RG + storage account per klant**, **Managed Identity + RBAC** i.p.v. SAS, blob-registry, Mokum = default-tenant zonder migratie, toernooien uitgesteld).
  - **Fase 0 ✅** — managed identity op `mokum-bot-api` (`bdb7606c-…`) + RBAC `Storage Blob Data Contributor` op `mokumbotrg904a`; `@azure/storage-blob` + `@azure/identity` toegevoegd.
  - **Fase 1 ⏳ (gestart)** — SDK+MI blob-helper in `lib/storage.js` klaar + lokaal geverifieerd; **canary** `standaardvragen` GET leest nu via managed identity (live, 58 vragen). **Nog te doen:** overige lees- + alle schrijf-/delete-paden migreren, dan SAS uit de blob-callers. Zie de session-log 2026-07-05 voor de exacte lijst.
- **#42 — Entra auth**: Fase B (backend) ✅. **Fase C** (MSAL-login in `dashboard.html`) = **frontend-sessie**; daarna Fase D (`DASHBOARD_HASH` uitfaseren, backend) + **#43 rollen** (`autoriseer()` geeft al `roles` terug). Waarden/plan in de #42-comment.
- **Overige widget-customizer** (frontend): #82 teksten-editor, #83 export/embed, #84 docs/testronde.

## Open content-issues (input van gebruiker/Mokum nodig)
- **#87** verzamel-issue content (drankprijzen, keu-shop/-reparatie, arrangementen, oefeningen). · **#56** website poolen-amsterdam.nl · **#57** screenshots handleidingen.

## Volgende stap
**#39 Fase 1 voortzetten** (backend): de overige blob-leespaden + schrijf-/delete-paden naar de managed-identity-helper migreren (per stuk deployen + verifiëren; Mokum = default → nul gedragswijziging), daarna SAS uit de blob-callers. Details + valkuilen in `docs/sessions/2026-07-05-backend-auth-icoon-multitenant.md`. Parallel loopt de frontend-lane (#82/#83/#84 + #42 Fase C).

## Werkwijze (kort — zie ook CLAUDE.md)
- Deploy **direct naar main**; grote wijzigingen eerst lokaal-testen aanbieden. `develop` == `main` (zelfde Function App).
- Meerdere chats werken tegelijk (gedeelde working copy): check branch/tree vóór elke git-actie, stage alleen eigen bestanden, clobber geen vreemde wijzigingen.
- Geen grote Anthropic-runs zonder akkoord. Afgeronde issues sluiten met samenvatting.
- **Azure RBAC:** `az role assignment create` faalt hier (MissingSubscription) → gebruik ARM-PUT via `az rest` (zie geheugen).
