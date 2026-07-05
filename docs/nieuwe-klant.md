# Nieuwe klant toevoegen — in 5 stappen

De **Widget Customizer** in het dashboard (tab **🎨 Widget**) laat je een klant volledig visueel configureren en exporteren. Alles gebeurt lokaal: je downloadt de bestanden en commit ze in de repo.

> Achtergrond over het configformaat: **[config-schema.md](config-schema.md)**. Voorbeeld-klant om mee te testen: `configs/test.json` (laad via `data-client="test"`).

## Stap 1 — Startpunt kiezen
Open het dashboard → tab **🎨 Widget**. Kies bij **"Startpunt: klant-config"** een basis (bijv. *Standaard (Mokum)*). Wil je een bestaande klant verder bewerken? Gebruik dan **💾 Opslaan → "Bestaande config bewerken"** en laad diens `<client>.json`.

## Stap 2 — Widget aanpassen
Loop de vier tabs langs; alles is direct zichtbaar in de **live preview** rechts:
- **🎱 Icoon** — kies een preset (o.a. de Mokum 8-bal) of upload een eigen icoon (PNG/SVG/WebP, max 100 KB). Stel ook de launcher-grootte in.
- **💬 Bubble** — tekstballon aan/uit, teksten (toevoegen/herordenen), rotatie-interval.
- **📐 Positie** — verankeren in een hoek (of sleep de widget in de preview) + marges + breedte.
- **✏️ Teksten** — welkomstbericht, rubrieken en topics (emoji + label **nl/en**) en de voorbeeldvragen per topic.

Test beide talen met de **NL/EN**-schakelaar en beide formaten met **Desktop/Mobiel** in de preview-balk.

## Stap 3 — Exporteren
Ga naar tab **💾 Opslaan**:
1. Vul een **klant-id** in (kleine letters/cijfers/koppeltekens, bijv. `poolcafe-x`).
2. Controleer dat de validatie **groen** is (⚠ meldingen los je op in de **Teksten**-tab — bij fouten wordt exporteren geblokkeerd).
3. **Download de JSON** (en, als je een eigen icoon uploadde, het **icoon-bestand**).
4. **Kopieer het embed-snippet** (staat klaar met het juiste `data-client`).

## Stap 4 — Committen in de repo
Zet de gedownloade bestanden op de plek die het dashboard toont:
- `public/configs/<client>.json`
- (alleen bij een geüpload icoon) `public/assets/clients/<client>/<icoon>`

Commit en push naar **`main`**. Vite kopieert `public/` → `dist/` → GitHub Pages; binnen ~1 minuut is de config live op `https://mokum-bot.pdscloud.nl/configs/<client>.json`.

## Stap 5 — Embed op de klantsite
Plak het embed-snippet op de website van de klant (WordPress: plugin **WPCode** → *Headers & Footers* → **Body/Footer**):

```html
<script src="https://mokum-bot.pdscloud.nl/loader.js" data-client="<client>" async defer></script>
```

De widget haalt nu automatisch `configs/<client>.json` op. Klaar. 🎱

---

### Goed om te weten
- **Fallback-keten:** een ontbrekende `<client>.json` valt stil terug op `default.json`, en desnoods op een minimaal inline vangnet — de widget opent altijd. (Zie [config-schema.md](config-schema.md).)
- **Round-trip:** een geëxporteerde `<client>.json` kun je later terugladen in de Customizer om verder te bewerken.
- **Mokum zelf** gebruikt `default.json` (geen aparte `mokum.json`) — pas die aan om de Mokum-widget te wijzigen.
