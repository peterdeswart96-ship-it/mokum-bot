# Mokum Magic 8 Ball 🎱

Slimme chat-widget voor **Mokum Pool & Darts** (poolen-amsterdam.nl), met een beheer-dashboard en een white-label configurator om de widget per klant aan te passen.

## Architectuur
- **Frontend** (static, GitHub Pages op `mokum-bot.pdscloud.nl`):
  - `public/widget.js` — de embed-widget op de klantsite (laadt z'n config at runtime).
  - `public/loader.js` — laadt `widget.js` met cache-buster + geeft `data-client` door.
  - `public/dashboard.html` — beheer-dashboard (analyse, foto's, en de **Widget Customizer**).
  - `public/configs/<client>.json` — één config-bron per klant (teksten, topics, icoon, positie, bubble).
  - React-bron in `src/` (bouwt met Vite).
- **Backend** (Azure Functions, `api/src/functions/`): o.a. `chat`, `fotos`, `standaardvragen`, `terugbelverzoek`, `icoon-genereer`. Deploy via GitHub Actions (`func azure functionapp publish mokum-bot-api`).
- **Opslag:** Azure Blob + Table Storage.

## Widget Customizer
Dashboard-tab **🎨 Widget**: stel per klant het **icoon**, de **tekstballon**, de **positie** en alle **teksten** (nl/en) in — met een **live preview** die de echte widget draait — en **exporteer** een klant-config-JSON + embed-snippet.

➡️ **Nieuwe klant toevoegen:** [`docs/nieuwe-klant.md`](docs/nieuwe-klant.md) · **Configformaat:** [`docs/config-schema.md`](docs/config-schema.md)

## Ontwikkelen
```bash
npm install
npm run dev      # Vite dev-server; open http://localhost:5173/dashboard.html
npm run build    # productie-build naar dist/
```
De widget en configs zitten in `public/` en worden 1-op-1 naar `dist/` gekopieerd. Het dashboard achter een gedeeld wachtwoord (migratie naar Entra External ID loopt — zie [`docs/entra-setup.md`](docs/entra-setup.md)).

## Deploy
Push naar **`main`** → GitHub Actions bouwt en publiceert naar GitHub Pages (frontend) en deployt de Azure Functions (backend). Config-wijzigingen zijn binnen ~1 minuut live.

## Documentatie
- [`docs/STATUS.md`](docs/STATUS.md) — actuele projectstand
- [`docs/config-schema.md`](docs/config-schema.md) — widget-configformaat
- [`docs/nieuwe-klant.md`](docs/nieuwe-klant.md) — nieuwe klant in 5 stappen
- [`docs/sessions/`](docs/sessions/) — logs per werksessie
