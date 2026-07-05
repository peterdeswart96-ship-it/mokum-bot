---
name: project-intelligence-pipeline
description: >
  Gebruik deze skill aan het begin en einde van elke werksessie om de projectstatus bij te werken,
  bestanden op te halen en het Claude project te syncen. Herbruikbaar voor alle projecten.
  Trigger wanneer: sessie begint of eindigt, status moet worden bijgewerkt, bestanden moeten worden
  opgehaald, of iemand vraagt naar de werkwijze of pipeline.
---

# Project Intelligence Pipeline — SKILL.md

## Doel
Na elke werksessie de projectstatus bijwerken, de wiki bijwerken, relevante bestanden ophalen
en het Claude project syncen. Herbruikbaar voor alle projecten op peterdeswart96-ship-it.

## Tools

| Script | Locatie | Doel |
|--------|---------|------|
| `Update-ProjectStatus.ps1` | `C:\Projects\tools\` | Genereert `PROJECT_STATUS.md` vanuit GitHub |
| `Haal-Projectbestanden-Op.ps1` | `C:\Projects\tools\` | Haalt gewijzigde bestanden op uit repo |
| `Git-Commit-En-Push.ps1` | `C:\Projects\tools\` | Commit, push en monitor GitHub Actions |
| `Test-CvOptimizer.ps1` | `C:\Projects\tools\` | Smoke test voor CV Optimizer deployments |
| `Invoke-WikiLint.ps1` | `C:\Projects\tools\` | Wekelijkse wiki gezondheidscheck (headless) |

---

## Werkwijze — Einde van elke sessie

### Stap 1: Wiki bijwerken (ALTIJD EERST)
Voer in Claude Code `/wiki-update` uit. Dit verwerkt besluiten, lessen en
statuswijzigingen van de sessie in `wiki/` en logt één regel in `wiki/log.md`.

Daarna de wiki-wijzigingen committen en pushen naar Azure DevOps:
```powershell
cd C:\Projects\<projectnaam>\wiki
git add .
git commit -m "docs: wiki-update na werksessie $(Get-Date -Format 'yyyy-MM-dd')"
git push
```

Periodiek (na een grotere mijlpaal): voer ook `/wiki-sync-master` uit om
projectoverstijgende kennis naar `C:\Projects\master-wiki` te schuiven.
Start Claude Code daarvoor met `--add-dir C:\Projects\master-wiki`.

### Stap 2: Status genereren
```powershell
C:\Projects\tools\Update-ProjectStatus.ps1 `
  -Repo "mokum-bot" `
  -ProjectNaam "Mokum Bot" `
  -Beschrijving "Claude API chatbot voor Mokum Pool & Darts" `
  -OutputPad "C:\Projects\mokum-bot\PROJECT_STATUS.md"
```

### Stap 3: Status committen
```powershell
cd C:\Projects\mokum-bot
C:\Projects\tools\Git-Commit-En-Push.ps1 -Bericht "docs: PROJECT_STATUS.md bijgewerkt"
```

### Stap 4: Gewijzigde bestanden ophalen
```powershell
C:\Projects\tools\Haal-Projectbestanden-Op.ps1 -Repo "mokum-bot" -AllesVanLaatsteCommit
```

### Stap 5: Claude project syncen
Upload naar het Claude project:
- `PROJECT_STATUS.md` — altijd
- Gewijzigde bestanden uit `C:\Projects\mokum-bot-bestanden\`
- `CLAUDE.md` als die is bijgewerkt
- Deze `SKILL.md` als die is bijgewerkt

---

## Werkwijze — Begin van elke sessie

```powershell
C:\Projects\tools\Haal-Projectbestanden-Op.ps1 -Repo "mokum-bot" -AllesVanLaatsteCommit
```

Start elke sessie met:
1. De SessionStart hook laadt `wiki/index.md` en de recente `wiki/log.md`
   automatisch in de context — controleer of dit is gebeurd. Zo niet, lees `wiki/index.md` handmatig.
2. Bekijk `PROJECT_STATUS.md` voor de actuele issues en workflows.
3. Bekijk `wiki/gaps.md` voor open vragen die je deze sessie kunt beantwoorden.
4. Kies één issue om op te pakken.
5. Werk het af inclusief verificatie.
6. Sluit het GitHub Issue pas na handmatig testen in de browser.

---

## Agile werkwijze

### Spelregels
- Eén ding tegelijk — nooit meerdere grote wijzigingen tegelijk
- Na elke deployment: verificatiescript uitvoeren vóór je verdergaat
- Issues pas sluiten NADAT: (1) workflow groen, (2) verificatiescript 10/10, (3) handmatig getest
- Nooit een issue sluiten direct na deployment

### GitHub Issues labels
| Label | Betekenis |
|-------|-----------|
| `prioriteit:hoog` | Moet snel opgepakt worden |
| `prioriteit:normaal` | Normale prioriteit |
| `prioriteit:laag` | Nice-to-have |
| `type:bug` | Iets werkt niet correct |
| `type:feature` | Nieuwe functionaliteit |
| `type:ux` | UI/UX verbetering |
| `type:security` | Beveiliging |
| `area:frontend` | Frontend wijziging |
| `area:backend` | Backend wijziging |

---

## Hergebruik voor andere projecten

```powershell
# Mokum Streams
C:\Projects\tools\Update-ProjectStatus.ps1 `
  -Repo "mokum-streams" `
  -ProjectNaam "Mokum Streams" `
  -Beschrijving "YouTube livestream automatisering voor Mokum Pool & Darts" `
  -OutputPad "C:\Projects\mokum-streams\PROJECT_STATUS.md"

C:\Projects\tools\Haal-Projectbestanden-Op.ps1 -Repo "mokum-streams" -AllesVanLaatsteCommit
```

Wiki-commando's per project:
```powershell
# Mokum Bot wiki
cd C:\Projects\mokum-bot\wiki && git add . && git commit -m "docs: wiki-update" && git push

# Mokum Streams wiki
cd C:\Projects\mokum-streams\wiki && git add . && git commit -m "docs: wiki-update" && git push

# Master wiki (na /wiki-sync-master)
cd C:\Projects\master-wiki && git add . && git commit -m "docs: master wiki sync" && git push
```

---

## Kritieke werkwijze regels (geheugen)

1. **Altijd live versie ophalen** vóór patchen:
```powershell
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/peterdeswart96-ship-it/mokum-bot/main/[bestand]" -OutFile "C:\Projects\mokum-bot-bestanden\[bestand]"
```
   Gebruik NOOIT een eerder geüploade versie als basis.

2. **GitHub Issues pas sluiten** NADAT:
   - Workflow groen is
   - Verificatiescript 10/10 geeft (waar van toepassing)
   - Fix handmatig getest is in de browser

3. **Bij problemen**: eerst terugdraaien (`git revert HEAD`), dan debuggen.

4. **Wiki-discipline**: PROJECT_STATUS.md is de momentopname (issues, workflows,
   commits); de wiki is het geheugen (besluiten, patronen, waarom). Besluiten die
   alleen in de chat zijn genomen bestaan niet — ze bestaan pas als ze in
   `wiki/decisions.md` staan.

5. **Wekelijkse lint is verplicht**: drift is de grootste faalmodus van het
   wiki-patroon. De Taakplanner-taak `WikiLint-mokum-bot` draait automatisch
   elke zondag om 09:00. Controleer na elke run het logbestand:
```powershell
   Get-Content C:\Projects\mokum-bot\.claude\wiki-lint-laatste-run.log -Tail 20
```

6. **Repo-naam**: de mokum-bot GitHub-repo heet `mokum-bot` (niet `cuescore`).

---

## PROJECT_STATUS.md structuur

Het gegenereerde bestand bevat altijd:
- Deployment status (laatste workflow runs)
- Open issues gesorteerd op prioriteit
- Recente commits (laatste 5)
- Claude project sync checklist
