# Mokum brand-assets

Merk-/brandingbestanden voor Mokum Pool & Darts. Deze map wordt **niet** naar de
site gepubliceerd (geen `public/`) — het zijn bronbestanden, o.a. voor de
**Entra External ID company branding** (zie issue #92).

> Bron-logo + sfeerfoto's komen van poolen-amsterdam.nl (eigen Mokum-materiaal).

## Bestanden

| Bestand | Wat | Gebruik / Entra-slot |
|---|---|---|
| `mokum-wordmark.svg` | Horizontale wordmark ✕✕✕ MOKUM POOL & DARTS (wit + rode kruisen), schaalbare bron | banner-logo (bron) |
| `mokum-wordmark.png` | Idem, 245×31 transparant (**witte** tekst → voor donkere achtergrond) | banner op donkere ondergrond |
| `mokum-wordmark@2x.png` | Idem, 490×62 | reserve |
| `mokum-wordmark-dark.svg` / `-dark.png` / `-dark@2x.png` | **Donkere** tekst + rode kruisen — voor **lichte** achtergrond | **Banner-logo in Entra** (de sign-in-kaart is wit!) |
| `entra-bg-mokumbar.jpg` | Bar met verlichte MOKUM-letters, 1920×1080 (~288 KB) | **Achtergrondafbeelding** (aanrader) |
| `entra-bg-pooltafels.jpg` | Pooltafel-rij, 1920×1080 (~234 KB) | Achtergrondafbeelding (alternatief) |
| `mokum-square-badge.png` | Rond embleem op donkere schijf, 240×240 (~28 KB) — werkt op licht én donker | **Square logo (light + dark)** in de sign-in form |
| `favicon-mokum-32.png` | Drie rode Amsterdamse kruisen op donkere schijf, 32×32 | **Favicon** (upload) |
| `favicon-mokum-64.png` | Idem, 64×64 | reserve |

Verwante, wél-gepubliceerde assets in `public/`:
- `public/mokum-logo.png` — rond Mokum-embleem (wit-op-transparant) → **vierkant logo (donker thema)** in Entra + dashboard-branding.
- `public/favicon-mokum.svg` — favicon-bron (dashboard).

## Belangrijk bij Entra-upload
Zet de **paginakleur donker** (bijv. `#0a0a0a`). Het logo en de wordmark zijn
wit-op-transparant en verdwijnen op een lichte achtergrond.

## Reproduceren
De achtergronden (crop naar 1920×1080 + JPEG-compressie <300 KB) en de PNG-exports
zijn gegenereerd met een headless browser (Playwright) uit de SVG-bronnen en de
foto's uit `boei17-migration-tool/downloads/poolen-amsterdam-nl`. Geen ImageMagick/
sharp nodig.
