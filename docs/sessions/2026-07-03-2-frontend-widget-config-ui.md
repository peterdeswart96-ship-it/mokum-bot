# Sessie 2026-07-03 (2) — Frontend: launcher, config-bron & multi-tenant loader

_Frontend-lane, parallel aan de backend-sessie (#71/#72/#42) die dezelfde repo deelde. Sessies zijn bewust gesplitst per gebied (frontend `public/`+`src/`, backend `api/`) om git-botsingen te voorkomen._

## Samenvatting
Chat-launcher vergroot/verplaatst, server-side kosten-/misbruikbescherming op `/api/chat`, alle issues gelabeld `frontend`/`backend`, een oude PR opgeruimd, en de **Widget Customizer-fundering** neergezet: één configbron (#75) + een multi-tenant config-loader met `data-client` (#76), plus twee UI-fixes en een tooltip. Alles live geverifieerd (Playwright + live browser-checks).

## Doorgevoerde wijzigingen (live)
- Chat-launcher (8-bal + tekstballon) **1,5× groter + lager** (bottom 70→24px, gelijke marge rechts/onder) — `41db969`
- **Server-side rate-limit (30/5min per gehasht IP) + input-cap** (2000 tekens, laatste 20 berichten) op `/api/chat` (#67) + **`.env` uit repo** (#70) — `32ec3ad`
- **Eén configbron** `public/configs/default.json` voor `widget.js` (runtime-fetch, fail-safe fallback) én React-build (build-time import) (#75, sluit #73) — `07ddd9c`
- **Rubrieken tonen bovenkant** (#85) + **sluitkruisje 2× groter & rood** (#86) — `bdd9cd0`
- **Tooltip "Sluit dit venster"** op de ✕ (nl/en) — `35f5899`
- **Config-loader met `data-client`** + fallback-keten + `docs/config-schema.md` (#76) — `bd37125`

## Issues
- **Gesloten** (frontend-lane): #67, #70, #73, #75, #85, #86, #76.
- **Geopend** (en ook weer gesloten): #85, #86.
- **PR #38 gesloten** (stale, 111 commits achter; handleiding-deel zat al in main, "Max fullscreen"-deel te oud om schoon te mergen — branch verwijderd).
- **Labels** `frontend`/`backend` aangemaakt + alle open issues gelabeld. Uitkomst: de Customizer-track (#75–#84) is vrijwel geheel **frontend**; alleen **#79** (AI-icoon) raakt ook de backend.

## Beslissingen (met onderbouwing)
- **#75:** `widget.js` fetcht `default.json` at runtime met een **origin-afgeleide URL** (`document.currentScript.src`) + cache-buster `?v=<minuut>`, plus een **minimale inline FALLBACK** (8-bal opent altijd). React importeert hetzelfde bestand at build-time. Kleuren/rate-limits/`INTERN_HASH`/`API_URL` blijven bewust in code. Origin-derivatie i.p.v. hardcode zodat develop/lokaal de júiste config testen.
- **#76:** client-id gesanitized `^[a-z0-9-]{1,40}$` (path-traversal). Fallback-keten: `configs/{client}.json` (1 poging, 404 valt stil door) → `default.json` (1 retry) → inline FALLBACK. **Mokum blijft op `default.json`** (geen `mokum.json`; `data-client="mokum"` → 404 → default), dus geen configduplicatie. `loader.js` geeft `data-client` door als `&client=`.
- **Werkwijze:** sessies gesplitst per gebied; en **frontend voortaan alleen naar `main` pushen** (niet main+develop) om deploys/`deploy-backend`-runs niet te verdubbelen.

## Openstaande punten / next steps
- [ ] **#77** — Dashboard "Widget Customizer"-pagina met live preview (volgende frontend-stap; bouwt op #75/#76).
- [ ] Bash-permissie: `.claude/settings.local.json` met `"allow": ["Bash"]` toegevoegd (gitignored) — mogelijk pas na herstart van Claude Code actief.

## Handig om te weten (valkuilen/details)
- **GitHub Pages deploy-rate-limit:** vandaag ~6× `Deployment failed, try again later` terwijl githubstatus.com "operational" was → per-repo **soft limit (~10 deploys/uur)** door veel deploys + re-runs. **Niet blijven hameren — wachten** (window reset ~1 uur), dan slaagt een re-run. De content staat wél op `gh-pages`. Zie memory `pages-deploy-transient-fout`.
- **Config wijzigen:** bewerk `public/configs/default.json` (niet meer hardcoded in widget.js/src). Zie `docs/config-schema.md` + memory `widget-configbron-75`.
- **Verificatie:** Playwright (bestaande devDep) tegen `npm run preview`; scripts vanuit `dist/` draaien zodat `node_modules` resolvet. Test-HTML met **single-quotes** genereren (dubbele-quote + shell-variabele gaf letterlijke backslashes → kapot `data-client`).
- Live driftfix meegenomen in #75: mojibake `privelес` → `privéles`, `pizza's`-apostrof, React-launcher 70→24px.
