# Mokum-bot — projectinstructies voor Claude

## Vóór je begint — voorkom dubbel werk
Aan dit project wordt in **meerdere chats** gewerkt. Neem NOOIT aan dat iets nog moet gebeuren zonder eerst te checken:
1. **`docs/STATUS.md`** — de actuele projectstand + volgende stappen.
2. **`git log --oneline -20`** — wat er recent is gedaan.
3. **Issues:** `gh issue list --state all --limit 60` — gesloten issues bevatten samenvattingen van wat er gebouwd is.
4. **`docs/sessions/`** — uitgebreide logs per eerdere chat (naslagwerk).

Twijfel je of iets al bestaat/gedaan is? Zoek het op in bovenstaande bronnen vóór je begint te bouwen.

## Werkwijze
- **Deploy: direct naar `main`** (productie). De `develop`/test-site wordt niet gebruikt. Bied bij **grote** wijzigingen aan om eerst **lokaal** te testen.
- **API-kosten:** geen grote/herhaalde Anthropic-runs zonder akkoord vooraf.
- **Issues:** sluit afgeronde issues met een korte samenvatting.
- **Einde van een (bijna volle) chat:** gebruik de skill **`chat-archiveren`** om de sessie vast te leggen voor de volgende keer.
- **Secrets:** SAS-token e.d. nooit hardcoden — via env-var (`AZURE_STORAGE_SAS_TOKEN`); zie `upload-kennisbronnen.ps1` (gitignored).

## Architectuur (kort)
- **Frontend** (static, GitHub Pages): `public/dashboard.html` (beheer-dashboard), `public/widget.js` (standalone embed-widget op de website), React-bron in `src/`.
- **Backend** (Azure Functions, `api/src/functions/`): o.a. `chat`, `fotos`, `standaardvragen`, `gesprekken`, `toernooi-*`. Deploy via GitHub Actions met `func azure functionapp publish mokum-bot-api`.
- **Opslag:** Azure Blob (`kennisbronnen`, `fotos`, `gesprekken`, `standaardvragen`, `toernooien-raw`) + Table Storage (`Tournaments`, `PlayerResults`).
- **Beheerpaden:** dashboard-endpoints zijn wachtwoord-beveiligd (gedeeld wachtwoord; migratie naar Entra External ID loopt — zie #42/#43 + `docs/entra-setup.md`).
