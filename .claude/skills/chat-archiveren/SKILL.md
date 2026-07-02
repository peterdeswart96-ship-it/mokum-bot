---
name: chat-archiveren
description: Rond een (bijna volle) chat af als naslagwerk zodat de volgende chat weet wat er al gedaan is. Archiveert de sessie uitgebreid in docs/sessions/, werkt docs/STATUS.md + het auto-geheugen bij, en commit/pusht naar main. Gebruik bij "chat is bijna vol", "archiveer deze chat/sessie", "rond de chat af", of "sla op wat we gedaan hebben voor de volgende keer".
---

# Chat archiveren (sessie-afronding & overdracht)

**Doel:** voorkomen dat een volgende Claude-sessie niet weet wat er al is gedaan. We leggen de sessie vast als naslagwerk én werken de bronnen bij die een nieuwe chat automatisch opmerkt (STATUS.md, auto-geheugen, project-`CLAUDE.md`).

## Wanneer
De gebruiker geeft aan dat de chat bijna vol is of afgerond mag worden. Voer dan onderstaande stappen uit.

## Stap 1 — Sessie samenvatten (uit je context + feiten)
Verzamel:
- **Wat is gedaan/gewijzigd** — haal commit-hashes op met `git log --oneline -30` (verzin ze NOOIT).
- **Issues** geopend/gesloten deze sessie (`gh issue list --state all --limit 60` als check).
- **Beslissingen + waarom**, overwogen **alternatieven** en **valkuilen** (uitgebreid archief).
- **Openstaande punten / next steps / wachtend-op** (bijv. "wacht op waarden van de gebruiker").

## Stap 2 — Uitgebreid sessie-archief schrijven
Schrijf `docs/sessions/JJJJ-MM-DD-<kort-onderwerp>.md` (datum = vandaag; bij meerdere sessies op één dag `-2`, `-3`). Gebruik deze structuur:

```markdown
# Sessie JJJJ-MM-DD — <onderwerp>

## Samenvatting
<2-4 zinnen: wat is er deze sessie bereikt>

## Doorgevoerde wijzigingen (live)
- <wat> — commit `<hash>` (+ PR #… indien van toepassing)

## Issues
- Gesloten: #.. (…), …
- Geopend: #.. (…), …

## Beslissingen (met onderbouwing)
- <beslissing> — waarom, welke alternatieven overwogen, valkuilen.

## Openstaande punten / next steps
- [ ] <taak> — wachtend op <…>

## Handig om te weten (valkuilen/details)
- <bv. scripts, env-vars, gotchas>
```

## Stap 3 — docs/STATUS.md bijwerken
Werk `docs/STATUS.md` bij naar de **actuele stand**: wat draait live, wat loopt/wacht, en de **volgende stap**. Kort houden (± één scherm) — dit is de go-to voor een nieuwe chat. Voeg een regel toe aan `docs/sessions/README.md` (index: datum + onderwerp + link).

## Stap 4 — Auto-geheugen bijwerken
Zet alleen **durende, hoog-signaal** zaken in `memory/` (nieuwe beslissingen, gewijzigde werkwijze, lopende taken/afhankelijkheden). **Niet** dupliceren wat git/issues/STATUS.md al vastleggen. Werk `MEMORY.md` (index) bij. Controleer bestaande memory-bestanden en update i.p.v. dupliceren.

## Stap 5 — Committen + pushen
`git add` de gewijzigde bestanden (docs/, CLAUDE.md, code) en commit + push **naar main** (dit project deployt direct naar main). Memory-bestanden staan buiten de repo en hoeven niet gecommit.

## Stap 6 — Afronden
Meld kort wat is vastgelegd (met paden) en adviseer een **nieuwe chat** te starten. Herinner: een nieuwe chat leest via `CLAUDE.md` automatisch `docs/STATUS.md` + git-log + open issues, dus die weet dan wat er al is gedaan.

## Belangrijk
- Verzin geen commit-hashes of issue-nummers — haal ze uit `git`/`gh`.
- Wees **eerlijk** over wat wél/niet af is (openstaande punten expliciet benoemen).
- Datum = vandaag (uit de sessiecontext).
