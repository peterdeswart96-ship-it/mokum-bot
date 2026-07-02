---
name: issues-plan
description: Toon de openstaande GitHub-issues van dit project (mokum-bot) gegroepeerd, en adviseer een concrete volgorde van oppakken op basis van waarde, inspanning, afhankelijkheden en labels. Gebruik bij vragen als "wat zijn de openstaande issues?", "wat kan ik het beste eerst oppakken?", "geef een plan/volgorde voor de issues".
---

# Issues-overzicht + geadviseerde volgorde

Haalt de open issues op, groepeert ze per thema en geeft een onderbouwde volgorde van oppakken.

## Stap 1 — Ophalen
```bash
gh issue list --state open --limit 100
```
Zet de werkmap desnoods eerst op de projectroot. Voor meer context bij twijfel: `gh issue view <nr>`.

## Stap 2 — Groeperen (per thema)
Deel de issues in herkenbare groepen in, en toon per issue `#nr — titel` (kort). Gebruikelijke thema's voor dit project:
- 🔴 **High-priority** (label `high-priority`)
- 📚 **Kennis/content aanvullen** (kennisbronnen, standaardvragen-antwoorden, nieuwe rubrieken)
- 📸 **Foto-tooling** (nummering, naamgeving, weergave, koppelen)
- 🏆 **Toernooien/ranglijsten**
- 🌐 **Website** (externe site poolen-amsterdam.nl)
- 🏗️ **Infra/auth/template** (auth, rollen, multi-tenant epic)
- 🔔 **Nice-to-have** (label `nice-to-have`)

## Stap 3 — Volgorde adviseren (rubriek)
Rangschik met deze principes, in deze prioriteitsvolgorde:

1. **High-priority eerst**, tenzij het een groot infra-blok is met afhankelijkheden (zet dat dan bij de fundering, punt 5).
2. **Waarde ÷ inspanning**: quick wins die op reeds-gebouwde systemen leunen bovenaan. Kennis/content aanvullen (kennisbronnen, standaardvragen-antwoorden, foto's koppelen) is meestal laag-risico en direct zichtbaar in de bot.
3. **Bundel gerelateerde issues** tot één blok als ze hetzelfde bestand/datamodel raken (bijv. foto-nummering + foto-naamgeving samen; website-punten samen).
4. **Respecteer afhankelijkheden**: fundering vóór wat erop bouwt. Bekend patroon: **auth (Entra) → rollen & autorisatie → white-label/multi-tenant epic**. Een epic knip je op in subtaken en pak je ná zijn fundering.
5. **Grote infra/fundering** (auth, rollen) na de quick wins: groter werk, meer risico, minder direct zichtbaar.
6. **Epics** als laatste grote blok, opgeknipt.
7. **Nice-to-have** als sluitpost.

Geef per stap kort de **waarom** (1 zin), en bied aan om er direct één op te pakken.

## Aandachtspunten voor dit project
- **Deploy**: wijzigingen gaan **direct naar `main`** (productie); de gebruiker kan de test-site niet gebruiken. Bied bij grote wijzigingen aan om eerst lokaal te testen. (Zie ook de projectvoorkeuren/geheugen.)
- **API-kosten**: geen grote/herhaalde Anthropic-runs zonder akkoord vooraf.
- Controleer of net-afgeronde issues nog open staan; stel voor die te sluiten.
- Verzin nooit issue-nummers; toon alleen wat `gh` teruggeeft.
