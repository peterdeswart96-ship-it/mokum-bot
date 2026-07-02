# Projectstand — Mokum-bot

_Laatst bijgewerkt: 2026-07-02. Zie `docs/sessions/` voor uitgebreide logs per chat, en `git log` / gesloten issues voor details._

## Live op productie (recent gebouwd)
- **🔒 Dashboard-endpoints beveiligd** (#65/#66, gesloten): `analyse`, `kennisbron-upload` (POST), `kennis-suggestie`, `foto-suggestie`, `kennisbron-vertaal` hebben nu een wachtwoord-gate (`checkPwd`); frontend stuurt `mkm-pwd` mee. GET van kennisbron-upload blijft open.
- **🔒 DASHBOARD_HASH uit de repo** (#68, gesloten): één top-level `checkPwd()` (dedup van 3 kopieën), hash staat nergens meer in code — leest uit **Azure App Setting `DASHBOARD_HASH`** op `mokum-bot-api` (fail-closed). Wachtwoord "mkm!" ongewijzigd; roteren kan nu zonder code-wijziging via die App Setting. Rest van #68 (sterker wachtwoord, token-validatie) → #42.
- **Standaardvragen per rubriek** (#33): dashboard **Analyse → Rubriek vragen** — vraag/antwoord (NL+EN) beheren, **concept/definitief**-status, **altijd-live**-vlag (voor live-data vragen), foto's koppelen (zoeken + cumulatief + preview + ontkoppelen), zoeksplitsing (vragen/antwoorden). Backend: `/api/standaardvragen` + index-blob; chat serveert **goedgekeurde** antwoorden zonder Claude-call.
- **Ranglijsten** (#60): sortering op **titels** eerst; schaalbare **minimum-drempel**; **beginners** (Fluke, Handicap Madness) + **niet-competitieve events** (fun/sociaal, mini/last-minute) uitgesloten uit overall/discipline; nieuwe reeks **Mokum 9ball Ranking**; winnaar-vraag met discipline-filter; gedocumenteerd `SCORING`-blok in `chat.js`.
- **Foto's**: vast **referentienummer** per categorie (bijv. Pool-03, #55) — zichtbaar in dashboard + fotokiezer; alle 49 foto's genummerd. **Onderschriften opgeschoond** (#63). Grote-foto-weergave in dashboard (#58).
- **Toernooivragen**: per genoemd toernooi een eigen **Cuescore-inschrijflink**.
- **Ledendag** volledig verwijderd (inschrijving gesloten): widget-tegel, standaardvragen, foto, kennisbron.

## Loopt / wacht
- **#42 — Entra External ID auth** (high-priority). Auth-helper `api/src/functions/_auth.js` is **voorbereid** (dual-mode: Entra-token óf gedeeld wachtwoord) maar **nog niet aangesloten** op de endpoints. **Wacht op de gebruiker:** Azure-setup volgen (`docs/entra-setup.md`) en 4 waarden aanleveren (tenant-ID, client-ID, issuer, JWKS-URI). Daarna: backend wiren (Fase B) + MSAL-frontend (Fase C) + lokaal testen (Fase D).
- **#43 — Rollen** (admin/editor/lezer): volgt ná #42.

## 🔒 Security / techniek (cluster van 2026-07-02 — uit een security-review)
- ✅ **#65 / #66 / #68** — afgerond & gesloten (zie "Live op productie" hierboven).
- **#67** geen server-side rate limiting / input-cap op `/api/chat` — **high-priority**, nog open.
- **#71** `chat.js` opsplitsen in modules — **dedup-deel (`checkPwd`/`DASHBOARD_HASH`) is klaar**, de module-splitsing zelf staat nog open.
- **#70** `.env` uit repo halen + `.gitignore`. · **#72** Claude-respons op text-block filteren + CORS beperken. · **#73** config-duplicatie `widget.js` ↔ `src`. · **#74** AVG-aandachtspunten terugbelverzoeken (input epic #39).

## Open content-issues (hebben input van de gebruiker nodig)
- **#49** drankprijzen / keu-shop assortiment / clinics · **#36** keu-reparatie (website + kennisbron). → Gebruiker levert de gegevens, dan in de kennisbron zetten.
- **#27** rubriek Arrangementen · **#28** rubriek Oefeningen (met foto's) — techniek kan opgezet worden, inhoud/foto's van gebruiker.
- **#63** onderschriften-fijnafstelling (bulk-opschoning is al gedaan) · **#57** screenshots bij handleidingen · **#56** website poolen-amsterdam.nl · **#12** NTFY push (nice-to-have) · **#39** epic white-label template.

## Volgende stap
De acute security-gaten (#65/#66/#68) zijn **dicht**. Kandidaten voor de volgende stap: **#42 Entra** (wacht op de 4 waarden van de gebruiker — dit sessie kort verkend, toen uitgesteld), **#67** (rate limiting/input-cap) en **#70** (`.env` uit repo). Volgorde-advies: skill **`issues-plan`**. Optioneel losstaand: wachtwoord roteren via de App Setting `DASHBOARD_HASH`.

## Werkwijze (kort — zie ook CLAUDE.md)
- Deploy **direct naar main**; grote wijzigingen eerst lokaal-testen aanbieden.
- Geen grote Anthropic-runs zonder akkoord.
- Afgeronde issues sluiten met samenvatting.
