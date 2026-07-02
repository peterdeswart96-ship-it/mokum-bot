# Plan: Widget Customizer — Mokum Bot

**Repo:** `peterdeswart96-ship-it/mokum-bot`
**Datum:** 2 juli 2026
**Status:** Issues aangemaakt — #75 t/m #84 (label `epic:widget-customizer`)

---

## 1. Doel

Een nieuwe pagina in het Mokum Bot-dashboard waarmee per klant het uiterlijk en gedrag van de chatwidget wordt geconfigureerd:

- Chatbot-icoon: uploaden, kiezen uit een preset-bibliotheek, of AI-genereren (Claude → SVG)
- Tekstbubble: teksten en gedrag instellen
- Positie van de widget op de pagina: volledig vrij (x/y)
- Taalinstellingen: nl/en (huidige setup)
- Standaardteksten: welkomstbericht, bubble-teksten, topics + voorgestelde vragen

De output is een **klantconfiguratie** die herbruikbaar is voor verschillende klanten — het fundament voor de toekomstige white-label epic (AI Chat Agent voor Boei17-klanten).

## 2. Architectuurbeslissing: runtime config JSON

De klant plaatst één universeel embed-snippet met alleen een client-ID:

```html
<script src="https://mokum-bot.pdscloud.nl/widget.js" data-client="mokum" async defer></script>
```

Bij het laden leest `widget.js` het `data-client` attribuut en haalt de bijbehorende configuratie op van `/configs/{client}.json`. Ontbreekt het attribuut of faalt de fetch, dan valt de widget terug op `/configs/default.json` (= de huidige Mokum-waarden).

**Waarom deze keuze:**

1. Eén `widget.js` voor alle klanten — één codebase, bugfixes direct overal live
2. Configwijzigingen zonder actie van de klant — JSON bijwerken is voldoende
3. Nieuwe klant onboarden = nieuwe JSON + assets, geen code-wijziging
4. Lost de bestaande technische schuld (#73) op: de hardcoded duplicatie tussen `public/widget.js` en `src/config/` verdwijnt, omdat beide codepaden dezelfde JSON als bron gebruiken

**MVP-opslag:** configs en iconen als statische bestanden in de repo (`public/configs/`, `public/assets/clients/`), geserveerd via GitHub Pages. Het dashboard genereert de bestanden; Peter commit ze via de vaste deploy-workflow (develop → test → akkoord → main). In de white-label epic wordt dit vervangen door Azure Blob Storage + een write-API, zonder dat de widget-kant hoeft te veranderen.

## 3. Config-schema (concept)

```json
{
  "client": "mokum",
  "version": 1,
  "icon": {
    "type": "svg | image",
    "src": "/assets/clients/mokum/icon.svg"
  },
  "position": {
    "anchor": "bottom-right",
    "offsetX": 24,
    "offsetY": 24,
    "unit": "px"
  },
  "bubble": {
    "enabled": true,
    "texts": ["Vraag het Mokum Bot!", "Toernooi info? Klik hier."],
    "intervalSeconds": 8
  },
  "language": {
    "default": "nl",
    "available": ["nl", "en"]
  },
  "texts": {
    "nl": {
      "welcome": "...",
      "topics": [{ "id": "openingstijden", "emoji": "🕐", "label": "Openingstijden" }],
      "questions": { "openingstijden": ["Hoe laat open op zaterdag?"] }
    },
    "en": {
      "welcome": "...",
      "topics": [{ "id": "openingstijden", "emoji": "🕐", "label": "Opening hours" }],
      "questions": { "openingstijden": ["What time do you open on Saturday?"] }
    }
  },
  "theme": {
    "primaryColor": "#cc0000",
    "backgroundColor": "#111111"
  }
}
```

**Validatieregels (uit de mokum-vertaling werkwijze):** topic-`id`'s identiek in nl en en, zelfde aantal topics, elke topic-id heeft in beide talen een `questions`-lijst, alle verplichte sleutels (`welcome`, `placeholder`, `error`, etc.) in beide talen aanwezig.

**Over vrije positionering:** de positie wordt opgeslagen als anker + offset in plaats van absolute x/y-coördinaten. Absolute coördinaten breken op andere schermformaten (widget buiten beeld op mobiel). Het anker (een van de vier hoeken) plus offsets geeft in de praktijk volledige vrijheid, maar blijft responsive. De widget clampt de positie altijd binnen de viewport.

---

## 4. Issues

### Issue 1 — Refactor: één configbron voor widget.js én React-build (lost #73 op)
**Type:** refactor · **Omvang:** L · **Afhankelijkheden:** geen — dit is het fundament · **GitHub:** #75

Verplaats alle huidige teksten en instellingen naar `public/configs/default.json`. Zowel `public/widget.js` als de React-build (`src/config/translations.js`, `src/config/bubble-texts.js`) gebruiken dit bestand als enige bron. De hardcoded `TRANSLATIONS`- en `BUBBLE_TEXTS`-kopieën in `widget.js` vervallen.

**Acceptatiecriteria:**
- [ ] `public/configs/default.json` bevat alle huidige nl/en teksten, topics, vragen en bubble-teksten
- [ ] `widget.js` fetcht `default.json` en werkt identiek aan de huidige situatie
- [ ] React-build leest dezelfde JSON (import bij build of runtime fetch)
- [ ] Geen hardcoded tekstduplicatie meer tussen de twee codepaden
- [ ] Getest op develop (`mokum-bot.test.pdscloud.nl`): nl én en, alle topics, bubble-teksten
- [ ] GitHub #73 kan dicht

### Issue 2 — Config-loader: `data-client` support + fallback
**Type:** feature · **Omvang:** M · **Afhankelijkheden:** Issue 1 · **GitHub:** #76

`widget.js` leest `data-client` van zijn eigen script-tag en fetcht `/configs/{client}.json`. Geen attribuut of fetch-fout → fallback naar `default.json`. Configs worden met een korte cache-header geserveerd zodat wijzigingen snel doorkomen.

**Acceptatiecriteria:**
- [ ] `data-client="mokum"` laadt `configs/mokum.json`
- [ ] Zonder attribuut of bij 404 → `default.json`, zonder console-errors voor de bezoeker
- [ ] Config-versieveld (`version`) aanwezig voor toekomstige migraties
- [ ] JSON-schema gedocumenteerd in `docs/config-schema.md`

### Issue 3 — Dashboard: pagina "Widget Customizer" met live preview
**Type:** feature · **Omvang:** L · **Afhankelijkheden:** Issue 2 · **GitHub:** #77

Nieuwe route/pagina in het dashboard. Links een instellingenpaneel (tabbladen: Icoon, Bubble, Positie, Teksten), rechts een live preview die de widget rendert met de actuele (nog niet opgeslagen) config-state. De preview toont een dummy-webpagina zodat de positionering realistisch te beoordelen is.

**Acceptatiecriteria:**
- [ ] Nieuwe pagina bereikbaar vanuit het dashboard-menu
- [ ] Live preview reageert direct op elke wijziging (React state, geen opslag nodig)
- [ ] Klant-selector: bestaande config laden (`default.json` of klant-JSON) als startpunt
- [ ] Preview schakelbaar tussen desktop- en mobiel-formaat

### Issue 4 — Icoon: upload + preset-bibliotheek
**Type:** feature · **Omvang:** M · **Afhankelijkheden:** Issue 3 · **GitHub:** #78

Tabblad Icoon: eigen afbeelding uploaden (PNG/SVG/WebP, max. bijv. 100 KB, vierkant advies) of kiezen uit een preset-bibliotheek (start: Mokum 8-ball SVG + 4–6 generieke iconen). Upload wordt in de MVP als bestand klaargezet voor commit naar `public/assets/clients/{client}/`.

**Acceptatiecriteria:**
- [ ] Upload met validatie (formaat, bestandsgrootte) en directe preview
- [ ] Preset-bibliotheek met minimaal 5 iconen, waaronder het huidige Mokum-icoon
- [ ] Gekozen icoon zichtbaar in de live preview (gesloten widget-knop)
- [ ] Bestandsnamen lowercase-hyphen (Linux build-server is case-sensitive)

### Issue 5 — Icoon: AI-generatie via Claude (SVG)
**Type:** feature · **Omvang:** M · **Afhankelijkheden:** Issue 4 · **GitHub:** #79

Knop "Genereer met AI": Peter beschrijft het gewenste icoon, een Azure Function-endpoint laat Claude een standalone SVG genereren (zelfde aanpak als het Magic 8 Ball-icoon). Resultaat direct in preview, met "opnieuw genereren" en "verfijnen" (beschrijving aanpassen op basis van vorige versie).

**Acceptatiecriteria:**
- [ ] Nieuw endpoint in `mokum-bot-api` (let op: één Function App voor develop én productie — backend-change raakt beide)
- [ ] SVG-sanitization: geen `<script>`, geen event-handlers, geen externe verwijzingen
- [ ] Iteratief verfijnen mogelijk (vorige SVG + nieuwe instructie meesturen)
- [ ] Gegenereerde SVG opslaanbaar als klant-icoon (zelfde flow als Issue 4)
- [ ] API-key blijft in Azure App Settings, nooit in code

### Issue 6 — Tekstbubble-instellingen
**Type:** feature · **Omvang:** S · **Afhankelijkheden:** Issue 3 · **GitHub:** #80

Tabblad Bubble: bubble aan/uit, teksten toevoegen/verwijderen/herordenen, rotatie-interval instellen. Bubble-teksten verhuizen daarmee van hardcoded (`bubble-texts.js` / `BUBBLE_TEXTS`) naar de config — dit bouwt voort op Issue 1.

**Acceptatiecriteria:**
- [ ] Bubble-teksten volledig beheerbaar vanuit het dashboard
- [ ] Interval instelbaar, aan/uit-schakelaar werkt in preview
- [ ] Lege lijst = bubble automatisch uit

### Issue 7 — Vrije positionering (anker + offset)
**Type:** feature · **Omvang:** M · **Afhankelijkheden:** Issue 3 · **GitHub:** #81

Tabblad Positie: de widget in de live preview vrij verslepen; het dashboard vertaalt de positie naar anker (dichtstbijzijnde hoek) + offsets. Daarnaast numerieke invoervelden voor precisie. De widget clampt zichzelf binnen de viewport en respecteert een hoge z-index (9999) boven WordPress-elementen.

**Acceptatiecriteria:**
- [ ] Drag & drop in de preview werkt, numerieke velden synchroniseren mee
- [ ] Positie correct op zowel desktop- als mobiel-preview (clamping getest)
- [ ] Widget blijft boven cookie-consent banners en Flatsome-elementen (z-index)
- [ ] Config slaat anker + offset op, geen absolute coördinaten

### Issue 8 — Teksten-editor: welkomstbericht, topics & vragen (nl/en)
**Type:** feature · **Omvang:** L · **Afhankelijkheden:** Issue 3 · **GitHub:** #82

Tabblad Teksten met nl/en naast elkaar (twee kolommen), zodat vertalingen nooit half worden bijgewerkt. Bewerkbaar: welkomstbericht, topics (emoji + label per taal, gedeelde id) en voorgestelde vragen per topic. Validatie volgens de mokum-vertaling regels vóór opslaan.

**Acceptatiecriteria:**
- [ ] nl en en altijd samen zichtbaar en bewerkbaar
- [ ] Topics: toevoegen/verwijderen/herordenen; id automatisch gegenereerd en identiek in beide talen
- [ ] Validatie blokkeert opslaan bij: ontbrekende vertaling, ongelijke topic-structuur, lege verplichte velden
- [ ] Wijzigingen direct zichtbaar in de live preview (beide talen testbaar)

### Issue 9 — Export & opslaan: klantconfig + embed-snippet generator
**Type:** feature · **Omvang:** M · **Afhankelijkheden:** Issues 4–8 · **GitHub:** #83

Knop "Opslaan/Exporteren": genereert de klant-JSON (+ eventuele icoon-bestanden) en toont het bijbehorende embed-snippet met het juiste `data-client`. MVP: bestanden downloaden of klaarzetten om te committen; het dashboard toont exact welke bestanden waar in de repo horen.

**Acceptatiecriteria:**
- [ ] Valide JSON conform schema, inclusief `version`
- [ ] Embed-snippet met correcte `data-client` kopieerbaar
- [ ] Duidelijke instructie welke bestanden naar `public/configs/` en `public/assets/clients/{client}/` gaan
- [ ] Bestaande klantconfig opnieuw inladen en bewerken werkt (round-trip)

### Issue 10 — Documentatie & testronde
**Type:** docs/test · **Omvang:** S · **Afhankelijkheden:** Issue 9 · **GitHub:** #84

README en `docs/config-schema.md` bijwerken, onboarding-stappen voor een nieuwe klant documenteren, en een volledige testronde op develop: default-config (Mokum ongewijzigd), een test-klantconfig, beide talen, mobiel en desktop, incognito.

**Acceptatiecriteria:**
- [ ] Onboarding-doc: "nieuwe klant in 5 stappen"
- [ ] Regressietest: bestaande Mokum-widget gedraagt zich exact zoals vóór de feature
- [ ] Testconfig (`configs/test.json`) aanwezig op develop
- [ ] Pas na expliciet akkoord merge naar main

---

## 5. Volgorde & afhankelijkheden

```
Issue 1 (#75, fundament, lost #73 op)
  └─ Issue 2 (#76, config-loader)
       └─ Issue 3 (#77, dashboard-pagina + preview)
            ├─ Issue 4 (#78, icoon upload/presets) ─ Issue 5 (#79, AI-icoon)
            ├─ Issue 6 (#80, bubble)
            ├─ Issue 7 (#81, positie)
            └─ Issue 8 (#82, teksten-editor)
                 └─ Issue 9 (#83, export/opslaan)
                      └─ Issue 10 (#84, docs + test)
```

Issues 4 t/m 8 kunnen in willekeurige volgorde of parallel; 6 is de kleinste en een goede eerste "win" na de dashboard-pagina.

## 6. Aansluiting op de white-label epic (Boei17)

Deze feature is bewust zo ontworpen dat de epic er later bovenop past zonder herbouw:

- **Opslaglaag wisselbaar:** statische JSON in de repo (MVP) → Azure Blob Storage + write-API (epic). De widget merkt het verschil niet; alleen de config-URL verandert.
- **Multi-tenant vanaf dag één:** het `data-client` mechanisme en het schema zijn al per-klant opgezet.
- **Buiten scope, geparkeerd voor de epic:** authenticatie/self-service voor Boei17 of eindklanten, per-klant system prompts en kennisbronnen, per-klant API-keys en usage-tracking, extra talen, facturatie.

## 7. Vaste werkwijze (geldt voor élk issue)

Per feature: `feature/*` branch vanaf `develop` → lokaal testen → verificatie met `Select-String` vóór commit → push naar develop → testen op `mokum-bot.test.pdscloud.nl` (incognito) → expliciet akkoord van Peter → pas dan merge naar main. Backend-wijzigingen (Issue 5): let op dat er één Function App is voor develop én productie.
