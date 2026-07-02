# Sessie 2026-07-02 — Standaardvragen-beheer, foto's, ranglijsten, Ledendag, Entra-plan, skills

## Samenvatting
Grote sessie. Gebouwd + live gezet: **standaardvragen-beheer per rubriek met caching** (#33), **concept/definitief + altijd-live**-status, **foto-referentienummers** (#55) en **onderschrift-opschoning** (#63), **ranglijst-verbeteringen** (#60), **Cuescore-inschrijflinks per toernooi** en **zoeksplitsing**. **Ledendag** volledig verwijderd. **Entra External ID-auth** (#42/#43) gespecificeerd + handleiding geschreven + auth-helper voorbereid (nog niet live). Twee skills gemaakt (`issues-plan`, `chat-archiveren`). Werkwijze vastgelegd: **direct naar main** deployen.

## Doorgevoerde wijzigingen (live op productie)
- **Standaardvragen-systeem** (#33) — commits `a21498d`, `440e2cf`, `d2f7cca`; PR #59. Endpoint `api/src/functions/standaardvragen.js` (GET publiek, POST wachtwoord, index-blob `standaardvragen/_index.json`). Chat kort-sluiting in `chat.js` (serveert goedgekeurde antwoorden zonder Claude). Dashboard-tab **Rubriek vragen**.
- **Fotokiezer** (#61) — commits `4a5a8af`, `35a8d47`; PR #64. Chips + zoekvenster + cumulatief koppelen + ontkoppelen + preview met bladeren.
- **Ledendag verwijderd** — commit `03778a1`. Widget-tegel/vragen (translations.js, widget.js, ChatWidget.jsx), 5 standaardvragen, foto `ledendag.jpg`, kennisbron `evenementen/ledendag.txt`, systeemprompt generiek gemaakt.
- **Cuescore-inschrijflink per toernooi + zoeksplitsing** — commit `83580b7`.
- **Ranglijsten** (#60) — commits `1813761`, `ad20bf1`, `0159811`; + `b0caa5d` (seed-safety), `c7a7db6` (diagnose). Titels-eerst, min-drempel (schaalt), beginners + fun/mini uitgesloten, reeks "Mokum 9ball Ranking", winnaar-discipline-filter, `SCORING`-blok, diagnosescript `api/scripts/check-ranglijsten.mjs`.
- **Foto-referentienummers + onderschriften** (#55, #63) — commit `e34ee26`. `ref`-veld per categorie (Pool-03) in `fotos.js` (teller in `_meta.json`), `assign-refs`-actie, dashboard-badge + knop + in fotokiezer. Alle 49 foto's genummerd; onderschriften opgeschoond (voorvoegsel "Diverse - Categorie -" weg, spelling gefixt, dubbele genummerd) via het `/api/fotos` update-endpoint.
- **Security** — commit `ca09723`. `kennisbron-beheer.mjs` + `upload-kennisbronnen.ps1` lezen SAS-token uit env (niet hardcoden). NB: de token stond nooit in git (ps1 is gitignored).
- **Skills/docs** — `577044d` (skill `issues-plan`), `478760e` (`docs/entra-setup.md`).

## Issues
- **Gesloten:** #32, #50, #34, #14, #6, #5 (opschoning begin sessie); #33, #61, #48, #60, #55, #58, #35, #51, #62, #63.
- **Geopend:** #60 (ranglijsten, later weer gesloten), #61/#62/#63 (foto's), #59/#64 (PR's, gemerged).

## Beslissingen (met onderbouwing)
- **Caching-model standaardvragen:** concept = bot antwoordt live; **alleen "definitief" (goedgekeurd)** wordt gecached. Zo gaan ongecontroleerde concepten niet live. `altijdLive`-vlag voor vragen met live Cuescore-data (nooit cachen).
- **Antwoorden genereren:** via de **live bot** (`/api/chat`, script `genereer-concepten.mjs`) zodat concepten de echte kennisbronnen + toon volgen. 130 calls (NL+EN), Haiku, ~€1-2, met akkoord vooraf.
- **Ranglijsten:** doel = **competitief & accuraat**; maatstaf = **titels eerst** (dan finales, prestatiepunten, winst); drempel **schaalt** met periode (aller tijden ≥5, korter ≥3) met vangnet; **beginners** (Fluke + Handicap Madness) + **fun/mini** uitgesloten uit overall/discipline. Alternatief (Bayesiaanse weging, per-categorie i.p.v. titels) afgewezen om uitlegbaarheid.
- **Foto-ref:** **per categorie** (Pool-03), **onveranderlijk** toegekend (blijft vast ook bij hercategoriseren) — dat is de kern van #55 (stabiel verwijzen). Bestandsnamen bewust **niet** hernoemd (ref maakt ze overbodig; hernoemen is riskant).
- **Auth (#42):** **Entra External ID** gekozen (niet lichtere workforce-variant) met het oog op epic #39 (multi-tenant white-label). **Dual-mode** overgang (Entra-token óf wachtwoord) zodat er geen verstoring is.
- **Deploy-werkwijze:** **direct naar main** (gebruiker kan develop/test-site niet gebruiken); grote wijzigingen eerst lokaal-testen aanbieden.

## Openstaande punten / next steps
- [ ] **#42 Entra:** wacht op gebruiker → Azure-setup volgen (`docs/entra-setup.md`) en **4 waarden** aanleveren (tenant-ID, client-ID, issuer, JWKS-URI). Auth-helper `api/src/functions/_auth.js` staat klaar (dual-mode) maar is **nog niet aangesloten** op de endpoints. Deps `jsonwebtoken` + `jwks-rsa` staan in `api/package.json`.
- [ ] **#43 Rollen:** ná #42 (app-rollen admin/editor/lezer, server-side afdwingen).
- [ ] **Content-issues** (#49 drankprijzen/keu-shop/clinics, #36 keu-reparatie): wachten op gegevens van de gebruiker.
- [ ] **Rubrieken** #27 (Arrangementen), #28 (Oefeningen): techniek opzetbaar, inhoud/foto's van gebruiker.
- [ ] **#63 fijnafstelling** onderschriften (bulk is gedaan), **#57** screenshots, **#56** website, **#12** NTFY, **#39** epic.

## Handig om te weten (valkuilen/details)
- **Seed-script** `api/scripts/seed-standaardvragen.mjs` overschrijft de HELE index → nu beveiligd (weigert gevulde index tenzij `--force`). Niet zomaar opnieuw draaien.
- **Lokale scripts** (`check-ranglijsten.mjs`, `kennisbron-beheer.mjs`) lezen `AZURE_STORAGE_SAS_TOKEN` uit env; waarde te kopiëren uit Function App → Configuration.
- **Data-pipeline ranglijsten:** nachtelijke timers `toernooi-sync` (04:00, ruwe Cuescore→blob), `toernooi-transform` (04:15, → Tables `Tournaments`/`PlayerResults`), `toernooi-ratings` (04:30, KNBB-rating). "Beste spelers" = eigen puntentelling; KNBB-rating = extern getal (alleen tonen).
- **Discipline-labels** in de data: 8/9/10-Ball + zeldzaam "Bankpool" (6, bewust buiten de 8/9/10-lijsten).
- **Standaardvragen-index** stand einde sessie: 58 vragen, ~57 met NL+EN-antwoord, 51 definitief, 7 altijd-live.
