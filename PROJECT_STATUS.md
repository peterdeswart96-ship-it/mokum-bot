# Mokum Bot — Project Status

> Gegenereerd op: 02-07-2026 11:01
> Repo: https://github.com/peterdeswart96-ship-it/mokum-bot
## Over dit project

Claude API chatbot voor Mokum Pool & Darts
## Deployment Status

- ✅ **gh-pages** — pages build and deployment (02-07-2026 08:49)
- ✅ **main** — security: wachtwoord-gate op 5 dashboard-endpoints (#65 #66) (02-07-2026 08:52)
- ✅ **develop** — security: wachtwoord-gate op 5 dashboard-endpoints (#65 #66) (02-07-2026 08:41)

## Open Issues

**Totaal open: 17 issues**

### 🟢 Lage prioriteit / nice-to-have

- **#74** AVG-aandachtspunten terugbelverzoeken (input voor epic #39) `nice-to-have, security`
- **#28** Rubriek: Oefeningen toevoegen met foto's `enhancement`
- **#36** Website + kennisbron voor keu reparatie `enhancement`
- **#39** Epic: Mokum-bot ombouwen tot herbruikbaar white-label chatbot-template (multi-tenant) `enhancement, epic`
- **#42** Fase 3 ΓÇö Auth: Microsoft Entra External ID i.p.v. gedeeld wachtwoord `enhancement, infrastructure, high-priority`
- **#43** Fase 4 ΓÇö Rollen & autorisatie: admin/editor/lezer, acties afschermen `enhancement, infrastructure`
- **#49** Kennis aanvullen: drankprijzen, keu-shop assortiment, clinics (uit QA #48) `enhancement`
- **#27** Rubriek: Arrangementen toevoegen `enhancement`
- **#56** Website (poolen-amsterdam.nl): 2 verbeterpunten `enhancement`
- **#67** Security/kosten: geen server-side rate limiting of input-cap op /api/chat `high-priority, security`
- **#68** Security: dashboard-hash hardcoded in publieke repo + zwak wachtwoord + cosmetisch token `high-priority, security`
- **#70** .env uit repo halen + toevoegen aan .gitignore `infrastructure, security`
- **#71** Refactor: chat.js (1962 regels) opsplitsen in modules + checkPwd/DASHBOARD_HASH dedupliceren `enhancement, infrastructure`
- **#72** Robuustheid: Claude-respons filteren op text-block + CORS beperken op dashboard-endpoints `enhancement`
- **#73** Onderhoud: config-duplicatie tussen public/widget.js en src (BUBBLE_TEXTS + TRANSLATIONS) `enhancement, nice-to-have`
- **#57** Screenshots toevoegen bij handleidingen (voor Peter) `documentation`
- **#12** NTFY Pro toernooi push notifications toevoegen als informationele rubriek `enhancement, nice-to-have`

## Recente Commits

- `43c5d8b` security: wachtwoord-gate op 5 dashboard-endpoints (#65 #66) (02-07-2026 08:48)
- `8649aa9` security: wachtwoord-gate op 5 dashboard-endpoints (#65 #66) (02-07-2026 08:38)
- `ae7bf91` docs: STATUS.md bijwerken met security/techniek-cluster (#65-#74) (02-07-2026 08:27)
- `1791b54` chore: dual-mode auth-helper voorbereiden (#42) ΓÇö nog niet aangesloten (02-07-2026 07:58)
- `3a7bdc4` chore: overdracht-systeem tegen kennisverlies tussen chats (02-07-2026 07:58)

## Claude Project Sync

Upload deze bestanden naar het Claude project na elke sessie:

- [ ] `PROJECT_STATUS.md` (dit bestand)
- [ ] Aangepaste frontend bestanden (zie recente commits)
- [ ] Aangepaste backend bestanden (zie recente commits)

> Tip: gebruik `Haal-Projectbestanden-Op.ps1` om bestanden automatisch op te halen.

