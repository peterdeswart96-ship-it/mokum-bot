# Widget-config schema & `data-client` (multi-tenant)

De chatwidget haalt al zijn teksten/instellingen uit één JSON-bestand. Dit is het fundament van de Widget Customizer-track (issues #75–#84).

- **Bron:** `public/configs/<client>.json` (bijv. `default.json`). Wordt door Vite naar `dist/` gekopieerd en door GitHub Pages geserveerd op `https://mokum-bot.pdscloud.nl/configs/<client>.json`.
- **`widget.js`** (embed op de klantsite) fetcht de config **at runtime**.
- De **React-build** (`src/`) importeert `default.json` **at build-time** (`src/config/translations.js` + `bubble-texts.js`).

## Client kiezen: `data-client`

De embed geeft optioneel een client-id mee. Beide embed-vormen werken:

```html
<!-- Aanbevolen: via de loader (cache-buster) -->
<script src="https://mokum-bot.pdscloud.nl/loader.js" data-client="mokum" async defer></script>

<!-- Of rechtstreeks -->
<script src="https://mokum-bot.pdscloud.nl/widget.js" data-client="mokum" async defer></script>
```

- `loader.js` leest `data-client` en geeft 'm door aan `widget.js` als `&client=<id>`.
- `widget.js` leest de client uit het `data-client`-attribuut óf de `?client=`-queryparam.
- De client-id wordt **gesanitized** tot `^[a-z0-9-]{1,40}$` (voorkomt path-traversal in de config-URL). Ongeldig → als geen client.

## Fallback-keten (in `widget.js` → `loadConfig`)

1. **`configs/<client>.json`** — als een geldige `data-client` is opgegeven (één poging; een 404 valt **stil** door — geen console-error voor de bezoeker).
2. **`configs/default.json`** — de basis (Mokum). Met 1 retry voor tijdelijke hikken.
3. **Inline `FALLBACK`** in `widget.js` — minimaal vangnet als álles faalt: de 8-bal opent nog steeds en vrij typen/versturen werkt, alleen zonder topic-chips.

> **Mokum gebruikt `default.json`** (geen aparte `mokum.json`). `data-client="mokum"` geeft een 404 op `mokum.json` en valt netjes terug op `default.json` — dat is bewust, om configduplicatie te voorkomen.

## Caching

GitHub Pages serveert met een vaste `max-age=600` (10 min) en staat geen custom cache-headers toe. Daarom hangen zowel `loader.js` als de config-fetch er een **cache-buster** `?v=<minuut>` aan, zodat een gewijzigde config binnen ~1 minuut live is.

## Schema (velden in `configs/<client>.json`)

```jsonc
{
  "client": "mokum",              // id, informatief
  "version": 1,                   // schema-versie (voor toekomstige migraties)
  "language": { "default": "nl", "available": ["nl", "en"] },
  "position": {                   // zwevende launcher
    "anchor": "bottom-right",
    "offsetX": 24, "offsetY": 24, "unit": "px",
    "width": "440px",             // breedte open chatvenster (desktop)
    "launcherScale": 1.5          // schaal 8-bal + tekstballon
  },
  "bubble": {
    "intervalSeconds": 15,        // (nog niet door widget.js gelezen; #80)
    "texts": ["…"]                // roterende tekstballon-teksten
  },
  "categories": [                 // rubrieken-groepering in "Voorbeeldvragen per rubriek"
    { "id": "toernooien", "emoji": "🏆",
      "topics": ["toernooien", "resultaten", "amsterdam-open"],
      "newTopics": ["resultaten"],      // NEW-badge (optioneel)
      "starTopics": ["amsterdam-open"] } // ★-badge (optioneel)
  ],
  "texts": {
    "nl": { /* zie hieronder */ },
    "en": { /* spiegelbeeld: identieke topic-ids en questions-keys */ }
  }
}
```

Verplichte sleutels per taal onder `texts.<lang>`: `welcome, typing, placeholder, error, duplicateMsg, rateLimitMsg` (met `{s}`-placeholder), `backToTopics, backButton, askOther, spelregelsIntro, spelregelsBack, internPwdPrompt, internPwdError, internPwdBtn, cbCta, cbTitle, cbName, cbPhone, cbTopic, cbWhen, cbPrivacy, cbSubmit, cbThanks, cbRequired, cbError, hoverTitle, examplesBtn`; plus de structuren `hoverInfo` (array), `catTitles` (object), `topics` (array `{id, emoji, label}`), `questions` (object `topic-id → [vragen]`), `spelregelsDisciplines` (array `{id, emoji, label}`), `spelregelsQuestions` (object `discipline-id → [vragen]`).

**Validatieregels:** `topics`-ids identiek in nl en en, gelijk aantal topics, elke topic-id heeft in beide talen een `questions`-lijst, en alle verplichte sleutels in beide talen aanwezig.

**Runtime-override:** het dashboard-endpoint `/api/standaardvragen` overschrijft ná het laden alléén `questions` per onderwerp/taal (issue #33). De rest van de config is statisch.

**In code (bewust NIET in de config):** kleuren, rate-limits, `INTERN_HASH`, `API_URL`, bubble-timing.

## Nieuwe klant toevoegen (3 stappen)

1. Kopieer `public/configs/default.json` naar `public/configs/<client>.json` en pas teksten/topics/positie aan (houd de validatieregels aan).
2. Zet op de klantsite: `<script src="https://mokum-bot.pdscloud.nl/loader.js" data-client="<client>" async defer></script>`.
3. Commit naar `main` (Vite kopieert `public/configs/` → `dist/` → gh-pages). Binnen ~1 min live.
