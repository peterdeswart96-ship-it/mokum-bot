# Projectstand — Mokum-bot

_Laatst bijgewerkt: 2026-07-03. Zie `docs/sessions/` voor uitgebreide logs per chat, en `git log` / gesloten issues voor details._

## Live op productie (recent gebouwd)
- **🔒 Backend opgesplitst in modules** (#71, gesloten): `chat.js` 2103 → 1269 r. Nieuwe modules `auth.js`, `terugbel.js`, `dashboard.js` (6 dashboard-endpoints) + een `lib/`-laag: `storage.js` (blob-helpers), `auth.js` (`checkPwd`), `cors.js` (`dashboardCors`), `claude.js` (`leesClaudeTekst`). `fotos.js`/`standaardvragen.js` delen die helpers nu ook. `lib/` valt buiten de host-glob → alleen ge-require'd.
- **🔒 Respons-robuustheid + CORS** (#72, gesloten): `leesClaudeTekst()` i.p.v. `content[0].text`; dashboard-endpoints geven alleen de dashboard-origin terug (niet `*`); widget-endpoints houden `*`. (Azure Portal-CORS doet de preflight; code doet de echte-respons-ACAO.)
- **🔒 Server-side rate limit + input-cap** op `/api/chat` (#67, gesloten). · **`.env` uit repo** (#70, gesloten) + dode App Setting `AZURE_STORAGE_CONNECTION_STRING` opgeruimd.
- **AVG terugbelverzoeken** (#74, gesloten): opschoning redigeert nu ook de vrije-tekst-kopie in `messages`; analyse-doc `docs/avg-terugbelverzoeken.md` (input #39).
- **WhatsApp-nummer verborgen**: bot toont alleen een klikbare WhatsApp-link, nooit losse cijfers (voorkomt bellen i.p.v. appen).
- **Widget Customizer-epic (#75–#84)** — **parallelle sessie werkt hieraan**; #75 (config-bron), #76 (config-loader), #85/#86 (UI) staan al live. Laat dit blok met rust om botsingen te voorkomen.
- Ouder: dashboard-endpoints wachtwoord-beveiligd (#65/#66), `DASHBOARD_HASH` uit Azure App Setting (#68), standaardvragen (#33), ranglijsten (#60), foto-nummering (#55/#58/#63).

## Loopt / wacht
- **#42 — Entra External ID auth** (high-priority, **actief**). **Fase A (Azure-setup) is COMPLEET**: externe tenant `Mokum` (`mokumpooldarts.onmicrosoft.com`, EU), app-registratie `Mokum Dashboard` (SPA), sign-in user flow + testgebruiker. De **4 waarden + het exacte Fase B/C-plan staan in de #42-comment** (2026-07-03). Nog te doen: **Fase B** (App Settings `ENTRA_*` + `autoriseer()` uit `_auth.js` op 9 checkpunten — dual-mode, wachtwoord blijft werken), **Fase C** (MSAL-login in `dashboard.html`), **Fase D** (testen + `DASHBOARD_HASH` uitfaseren).
- **#43 — Rollen** (admin/editor/lezer): volgt ná #42.
- **#39 — Epic white-label template** (multi-tenant): bouwt op de auth-fundering.

## Open content-issues (input van gebruiker/Mokum nodig)
- **#87** — verzamel-issue "Content aanleveren door Mokum" (`nice-to-have`): drankprijzen, keu-shop, keu-reparatie (#36), arrangementen (#27), oefeningen (#28). Was #49/#36/#27/#28.
- **#56** website poolen-amsterdam.nl (2 punten) · **#57** screenshots bij handleidingen (voor Peter) · **#12** NTFY push (nice-to-have) · **#63** onderschriften-fijnafstelling.

## Volgende stap
**#42 Fase B/C** ligt klaar: de gebruiker heeft de Azure-setup gedaan en de 4 waarden staan op #42. Direct oppakbaar — begin met Fase B (backend, dual-mode, veilig), zoals uitgeschreven in de #42-comment. Daarna Fase C (frontend). Overige open werk is óf van de parallelle sessie (#75–#84) óf wacht op content-input (#87/#56/#57).

## Werkwijze (kort — zie ook CLAUDE.md)
- Deploy **direct naar main**; grote wijzigingen eerst lokaal-testen aanbieden. `develop` == `main` (zelfde Function App).
- Meerdere chats werken tegelijk: check branch/tree vóór elke git-actie, stage alleen eigen bestanden, clobber geen vreemde wijzigingen.
- Geen grote Anthropic-runs zonder akkoord. Afgeronde issues sluiten met samenvatting.
