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

## Projectwiki (kennisbank)

Dit project heeft een door de LLM onderhouden wiki in `wiki/`. De wiki is het
langetermijngeheugen van het project: besluiten, architectuur, conventies,
actuele status en geleerde lessen.

**Kernregel: raadpleeg ALTIJD `wiki/` voordat je vragen beantwoordt over de
architectuur, patronen, besluiten of geschiedenis van dit project. Lees eerst
`wiki/index.md` om te zien welke pagina's er zijn, en open daarna de relevante
pagina's.**

### Wiki-structuur

| Bestand | Doel |
|---|---|
| `wiki/index.md` | Catalogus: elke pagina met link + één regel samenvatting. Altijd actueel houden. |
| `wiki/log.md` | Append-only logboek. Formaat: `YYYY-MM-DD HH:MM [type] beschrijving` |
| `wiki/architecture.md` | Systeemoverzicht: componenten, dataflow, integraties. |
| `wiki/decisions.md` | Besluitenlog: elk besluit met datum, context en motivatie. |
| `wiki/conventions.md` | Projectconventies en kernregels. |
| `wiki/active-areas.md` | Wat er nú speelt: lopende epics, actieve issues, volgende stappen. |
| `wiki/technical-debt.md` | Bekende technische schuld en bewust uitgesteld werk. |
| `wiki/gaps.md` | Open vragen en ondocumenteerde gebieden. |
| `wiki/raw/` | Onveranderlijke bronnen. Lees hieruit, schrijf er NOOIT in. |

### Wiki-spelregels

1. Schrijf alleen in `wiki/`, nooit in `raw/`.
2. Comprimeer: de wiki vat samen wat verspreid zit. Geen pagina per bestand of component.
3. Elke wiki-wijziging: werk `wiki/index.md` bij indien nodig en voeg één regel toe aan `wiki/log.md`.
4. Besluiten komen in `decisions.md` met datum, context en motivatie.
5. Onzeker of onbekend? Noteer het als open vraag in `gaps.md`.
6. Einde van elke werksessie: voer `/wiki-update` uit en commit + push de wiki naar Azure DevOps.

### Wiki-opslag
De `wiki/`-map is een **eigen git-repo** (gitignored in de hoofdrepo) met Azure DevOps als private remote:
`https://dev.azure.com/pds-cloud/kennisbank/_git/mokum-bot-wiki`
