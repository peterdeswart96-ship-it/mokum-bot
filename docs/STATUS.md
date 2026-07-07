# Projectstand — Mokum-bot

_Laatst bijgewerkt: 2026-07-07. Zie `docs/sessions/` voor uitgebreide logs per chat, en `git log` / gesloten issues voor details._

## Live op productie (recent gebouwd)
- **🔒 Auth compleet (Entra External ID + rollen)** — dual-mode (Entra-token óf gedeeld wachtwoord) op alle beheer-endpoints. **#42 Fase C** (MSAL-login "Inloggen met Microsoft") live & geverifieerd. **#91** allowlist + default-deny (`ENTRA_ALLOWED_USERS`). **#43** rol-hiërarchie superuser⊇admin⊇users (`magMinstens()` per endpoint → 403). **#93** gesprekken `list`/`get` nu óók achter auth (PII/AVG-gat dicht; wachtwoord via header `X-Dashboard-Wachtwoord`). Rollen komen uit Entra security-groepen → app-rollen.
- **🎨 #92 Mokum-branding** — dashboard: logo op login+header (donkere schijf, werkt in beide thema's), favicon met de drie Amsterdamse kruisen, tab-titel. **Entra-loginscherm** via de portal gebrand (donkere paginakleur, sfeerachtergrond, badge-logo, donkere wordmark, sign-in-tekst). Herbruikbare assets in `brand-assets/`.
- **🤖 Botkwaliteit** — **#97** scherpere foto-triggers (`selecteerFotos`: woordgrens + AND + generiek-onderdrukking + cap 3). **#90** fuzzy disciplinenamen (`canoniekeDisciplines()` in de standaardvragen-match + promptregel). **#94/#95** header toont ingelogd account + rol; duidelijke 403-toast. **#96** tooltips op (bijna) alle knoppen (centrale injector).
- Ouder: Widget Customizer-epic (#75–#84) compleet; backend modules + `lib/` (#71); standaardvragen (#33); ranglijsten (#60).

## Loopt / wacht
- **#39 — multi-tenant white-label** (epic, grootste openstaande backend-track). `docs/multi-tenant-plan.md`: eigen RG+storage per klant, Managed Identity + RBAC i.p.v. SAS. **Fase 0 ✅**; **Fase 1 ⏳** — canary `standaardvragen` leest via MI; nog te doen: overige lees- + alle schrijf-/delete-paden migreren, dan SAS eruit.
- **#42 Fase D** — wachtwoord uitfaseren; **bewust uitgesteld** tot alle ~11 gebruikers (Nick/Mark=admin, 8× personeel=users) via Entra binnen zijn.
- **#88** designsysteem (mooiere iconen, vormen, effecten) · **#89** content-verzamelissue (input Mokum, o.a. met Nick).

## Direct oppakken / bevestigen
- **#93 sluiten** zodra bevestigd dat de gesprekkenlijst laadt (laadt al als users-account → waarschijnlijk oké).
- **#92 Entra-banner** in incognito bevestigen (donkere wordmark / CDN-cache); paginakleur donker houden.
- **Games-foto's hertaggen** in het dashboard (nu `games`-only → specifieker), anders tonen ze nooit meer (gevolg van #97). Past bij de content-sessie met Nick.
- **Entra-onboarding:** 8 personeelsleden in `Mokum-Users`, admin-consent verlenen.
- **#98** admin-only knoppen per rol verbergen/uitschakelen (frontend kent de rol nu).

## Volgende grote stap
**#39 Fase 1 voortzetten** (backend, MI-migratie) óf **#88 designsysteem** (frontend) — afhankelijk van prioriteit. Auth + branding + botkwaliteit-sprints zijn afgerond.

## Werkwijze (kort — zie ook CLAUDE.md / wiki)
- Deploy **direct naar main**; grote wijzigingen eerst lokaal-testen aanbieden. `develop` == `main`.
- Gedeelde working copy, meerdere chats: stage alleen eigen bestanden, push de commit-SHA rechtstreeks na een ff-check. **Twee backend-commits vlak na elkaar kunnen elkaars deploy annuleren** → wacht op groen of `gh run rerun`.
- Geen grote Anthropic-runs zonder akkoord. Issues sluiten met samenvatting na groene deploy + test.
- **Azure RBAC:** `az role assignment create` faalt hier (MissingSubscription) → ARM-PUT via `az rest`.
- **Geen ImageMagick/sharp** — beeldbewerking via Playwright (headless Chromium).
