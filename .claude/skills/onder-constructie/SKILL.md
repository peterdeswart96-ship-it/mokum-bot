---
name: onder-constructie
description: Zet een pagina/tab van het Mokum-dashboard (public/dashboard.html) tijdelijk "onder constructie" — een geel-zwart afzetlint bovenaan + de inhoud blokkeren (gedimd en onklikbaar). Of haal die status er weer af. Gebruik bij het verbouwen van een dashboard-onderdeel, bijv. "zet Handleiding onder constructie" of "haal het bouw-lint van Foto's".
---

# Onder constructie (bouw-lint + blokkeren)

Zet een onderdeel van `public/dashboard.html` tijdelijk in onderhoud, of geef het weer vrij.

## Wanneer gebruiken
De gebruiker wil één tab/pagina van het dashboard tijdelijk markeren én afsluiten tijdens een verbouwing. Bijvoorbeeld: "zet de Handleiding onder constructie", "blokkeer de Foto's-tab", "haal de constructie van Analyse af".

## Vraag eerst (als niet gegeven)
- **Welke tab/pagina?** De content-divs heten `#tab-<naam>`. Huidige namen: `mark` (Analyse-overzicht), `sander` (Website), `gesprekken` (Vragen), `fotos` (Foto's), `handleiding`, `upload` (kennis-wizard).
- **Aan of uit?** (onder constructie zetten of weer vrijgeven)
- **Eigen bannertekst?** (anders de standaardtekst gebruiken)

## Stap 0 — Zorg dat de CSS bestaat (eenmalig)
Controleer of deze regels in het `<style>`-blok van `public/dashboard.html` staan; voeg ze toe als ze ontbreken:
```css
@keyframes lintScroll { from { background-position: 0 0; } to { background-position: 113px 0; } }
.bouw-lint { position: sticky; top: 0; z-index: 900; padding: 7px 10px;
  background: repeating-linear-gradient(45deg, #f4d000 0 20px, #141414 20px 40px);
  background-size: 113px 100%; animation: lintScroll 3.5s linear infinite;
  box-shadow: 0 3px 12px rgba(0,0,0,0.45); }
.bouw-lint .label { display: block; max-width: 1320px; margin: 0 auto; text-align: center;
  background: rgba(10,10,10,0.9); color: #f4d000; font-weight: 800; letter-spacing: 0.04em;
  text-transform: uppercase; font-size: 13px; line-height: 1.4; padding: 7px 16px; border-radius: 9px;
  border: 1px solid rgba(244,208,0,0.55); }
@media (max-width: 700px) { .bouw-lint .label { font-size: 10.5px; padding: 6px 10px; } }
.uc-blocked { pointer-events: none; opacity: 0.4; filter: grayscale(0.4); user-select: none; }
```

## AANZETTEN (onder constructie)
In de doel-tab `#tab-<naam>`:
1. Voeg **direct ná de openingstag** `<div id="tab-<naam>" class="tab-content">` (dus vóór de `<main>`) het lint toe:
   ```html
   <div class="bouw-lint"><span class="label">🚧 Onder constructie — Peter &amp; Claude verbouwen het dashboard 🚧</span></div>
   ```
   Gebruik de eigen tekst van de gebruiker als die is opgegeven (escape `&` als `&amp;`).
2. **Blokkeer de inhoud**: zet de class `uc-blocked` op de hoofd-inhoud-wrapper van die tab — meestal de `<main>`: `<main class="uc-blocked">`. (Heeft de tab geen `<main>`, gebruik dan de eerstvolgende wrapper-div die alle inhoud bevat.)

Het lint blijft klikbaar/zichtbaar; alleen de inhoud eronder is gedimd en onklikbaar.

## UITZETTEN (weer vrijgeven)
1. Verwijder de `<div class="bouw-lint">…</div>` uit die tab.
2. Verwijder de class `uc-blocked` weer van de `<main>` (terug naar `<main>`).
3. Staat geen enkele tab meer onder constructie? Dan mogen de CSS-regels uit stap 0 ook weg (optioneel).

## Afronden
- Syntax-check het script-blok van `public/dashboard.html` (`node --check` op het geëxtraheerde script).
- Deploy zoals gebruikelijk: commit op `develop` → merge naar `main` → push → terug naar `develop`, en kijk mee met de GitHub Actions.
- Meld kort wat is aangepast, en herinner de gebruiker eraan dat dit een **tijdelijke** status is (en hoe je 'm er weer afhaalt).
