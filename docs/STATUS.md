# Projectstand — Mokum-bot

_Laatst bijgewerkt: 2026-07-02. Zie `docs/sessions/` voor uitgebreide logs per chat, en `git log` / gesloten issues voor details._

## Live op productie (recent gebouwd)
- **Standaardvragen per rubriek** (#33): dashboard **Analyse → Rubriek vragen** — vraag/antwoord (NL+EN) beheren, **concept/definitief**-status, **altijd-live**-vlag (voor live-data vragen), foto's koppelen (zoeken + cumulatief + preview + ontkoppelen), zoeksplitsing (vragen/antwoorden). Backend: `/api/standaardvragen` + index-blob; chat serveert **goedgekeurde** antwoorden zonder Claude-call.
- **Ranglijsten** (#60): sortering op **titels** eerst; schaalbare **minimum-drempel**; **beginners** (Fluke, Handicap Madness) + **niet-competitieve events** (fun/sociaal, mini/last-minute) uitgesloten uit overall/discipline; nieuwe reeks **Mokum 9ball Ranking**; winnaar-vraag met discipline-filter; gedocumenteerd `SCORING`-blok in `chat.js`.
- **Foto's**: vast **referentienummer** per categorie (bijv. Pool-03, #55) — zichtbaar in dashboard + fotokiezer; alle 49 foto's genummerd. **Onderschriften opgeschoond** (#63). Grote-foto-weergave in dashboard (#58).
- **Toernooivragen**: per genoemd toernooi een eigen **Cuescore-inschrijflink**.
- **Ledendag** volledig verwijderd (inschrijving gesloten): widget-tegel, standaardvragen, foto, kennisbron.

## Loopt / wacht
- **#42 — Entra External ID auth** (high-priority). Auth-helper `api/src/functions/_auth.js` is **voorbereid** (dual-mode: Entra-token óf gedeeld wachtwoord) maar **nog niet aangesloten** op de endpoints. **Wacht op de gebruiker:** Azure-setup volgen (`docs/entra-setup.md`) en 4 waarden aanleveren (tenant-ID, client-ID, issuer, JWKS-URI). Daarna: backend wiren (Fase B) + MSAL-frontend (Fase C) + lokaal testen (Fase D).
- **#43 — Rollen** (admin/editor/lezer): volgt ná #42.

## 🔒 Security / techniek (nieuw op 2026-07-02, veelal high-priority — uit een security-review in een andere chat)
- **#65** 🐛 kennisbron-upload endpoint mist wachtwoordcheck (prompt-injectie mogelijk) — **high-priority**.
- **#66** onbeveiligde dashboard-endpoints die Claude aanroepen (kostenrisico) — **high-priority**.
- **#67** geen server-side rate limiting / input-cap op `/api/chat` — **high-priority**.
- **#68** dashboard-hash hardcoded in publieke repo + zwak wachtwoord — **high-priority** (deels ondervangen door #42 Entra).
- **#70** `.env` uit repo halen + `.gitignore`. · **#72** Claude-respons op text-block filteren + CORS beperken. · **#71** `chat.js` opsplitsen + `checkPwd`/`DASHBOARD_HASH` dedupliceren. · **#73** config-duplicatie `widget.js` ↔ `src`. · **#74** AVG-aandachtspunten terugbelverzoeken (input epic #39).

## Open content-issues (hebben input van de gebruiker nodig)
- **#49** drankprijzen / keu-shop assortiment / clinics · **#36** keu-reparatie (website + kennisbron). → Gebruiker levert de gegevens, dan in de kennisbron zetten.
- **#27** rubriek Arrangementen · **#28** rubriek Oefeningen (met foto's) — techniek kan opgezet worden, inhoud/foto's van gebruiker.
- **#63** onderschriften-fijnafstelling (bulk-opschoning is al gedaan) · **#57** screenshots bij handleidingen · **#56** website poolen-amsterdam.nl · **#12** NTFY push (nice-to-have) · **#39** epic white-label template.

## Volgende stap
Er ligt nu een **cluster high-priority security-issues (#65–#68)** dat waarschijnlijk voorrang verdient. Daarnaast: wachten op de 4 Entra-waarden voor #42, en content-issues zodra de gebruiker gegevens aanlevert. Volgorde-advies: skill **`issues-plan`**.

## Werkwijze (kort — zie ook CLAUDE.md)
- Deploy **direct naar main**; grote wijzigingen eerst lokaal-testen aanbieden.
- Geen grote Anthropic-runs zonder akkoord.
- Afgeronde issues sluiten met samenvatting.
