# AVG-analyse — terugbelverzoeken (& gesprekken/foto's)

_Opgesteld: 2026-07-03. Input voor **epic #39** (white-label / AVG & veiligheid). Betreft **issue #74**._

Dit document loopt de vier aandachtspunten uit #74 na, met de bevindingen in de code
(`api/src/functions/chat.js`, `public/dashboard.html`) en concrete aanbevelingen.

Legenda: ✅ op orde · ⚠️ gat/aandachtspunt · 📋 beslissing/actie voor #39.

---

## 1. Pakt de opschoning het héle gesprek, incl. PII in vrije tekst?

Er zijn **twee** opschoonmechanismen voor de `gesprekken`-container:

| Mechanisme | Waar | Wat |
|---|---|---|
| `terugbelOpschonen` (timer, dagelijks 03:00) | `chat.js` ~2058 | Redigeert **alleen** `data.terugbelData` (naam, telefoon, onderwerp, voorkeurstijd) van terugbelverzoeken > 30 dagen. Het gesprek zelf blijft staan. |
| `cleanup`-actie (dashboard, POST, wachtwoord) | `chat.js` ~1438 | **Verwijdert** hele gesprek-blobs vóór een opgegeven datum. Handmatig. |

### ⚠️ Gat 1a — `onderwerp` blijft achter in `messages`
Bij een terugbelverzoek **zonder** gekoppeld `conversationId` maakt de code een nieuw
gesprek-blob aan waarin het vrije-tekstveld `onderwerp` óók in de chat-historie wordt gezet:

```js
// chat.js ~2032
data = { timestamp: aangevraagdOp,
         messages: [{ role: "user", content: onderwerp || "Terugbelverzoek" }], ... }
```

De dagelijkse opschoning redigeert wél `terugbelData`, maar **niet** `messages[0].content`.
Zet een bezoeker PII in het onderwerp ("bel Jan, 06-…"), dan **overleeft die tekst de 30-dagen-opschoning**
in de messages-array. → de opschoning pakt dus *niet* het hele gesprek.

### ⚠️ Gat 1b — gekoppelde gesprekken: transcript blijft volledig staan
Wordt een terugbelverzoek aan een **bestaand** gesprek gekoppeld, dan bevat `data.messages` /
`data.reply` het volledige chat-transcript. Daar kan vrije-tekst-PII in staan (naam, telefoon,
e-mail die de bezoeker tijdens de chat typte). De opschoning laat dit ongemoeid.

### ⚠️ Gat 1c — gewone gesprekken hebben géén automatische bewaartermijn
Gesprekken zónder terugbelverzoek worden **nooit automatisch** opgeschoond — alleen via de
handmatige dashboard-`cleanup`. Ook chat-transcripten kunnen PII bevatten.

### Aanbeveling (concreet, laag-risico)
In `terugbelOpschonen`, bij het redigeren óók de vrije-tekst-kopie neutraliseren, bijv.:

```js
// naast: data.terugbelData = { aangevraagdOp, status, verlopen: true }
data.messages = [{ role: "user", content: "[terugbelverzoek — persoonsgegevens verwijderd]" }]
data.reply = ""
```

(Voor gekoppelde, inhoudelijke gesprekken eerst beslissen — zie 📋 hieronder — of het hele
transcript weg mag of alleen de terugbel-PII.)

📋 **Voor #39:** definieer één **automatische bewaartermijn voor álle gesprekken** (niet alleen
terugbel-PII), want elk transcript kan PII bevatten. Bijv. gesprekken > X dagen automatisch
verwijderen/redigeren.

---

## 2. Gezichts-anonimisatie in foto's (client-side) — sterke plus ✅

Bevestigd in `public/dashboard.html` (~1323) + `public/foto-checklist.html`:

- Bij het kiezen/uploaden detecteert het dashboard **client-side** gezichten en dekt ze af
  (**blur / pixelate / zwart / smiley**, smiley standaard).
- **Alleen de geanonimiseerde foto wordt geüpload — het origineel verlaat het apparaat niet.**
- Optionele handmatige controle vóór upload (gemiste gezichten toevoegen, valse verwijderen).
- Lukt anonimiseren niet, dan wordt de foto **niet** geüpload.
- Echte gezichten alleen tonen met toestemming (bijv. eigen medewerkers).

→ Dit is een **sterk AVG-punt** en hoort prominent in de checklist/verkoop-story van #39
(privacy-by-design, dataminimalisatie: PII verlaat het toestel niet).

---

## 3. Multi-tenant data-isolatie ⚠️ (ontwerp-eis voor #39)

**Huidige situatie: single-tenant.** Alle data staat in gedeelde containers op één storage-account:
`gesprekken`, `fotos`, `kennisbronnen`, `standaardvragen`, `toernooien-raw` + Table Storage.
Er is **geen tenant-sleutel** in de blob-paden. Voor de huidige (enige) klant is dat prima —
maar voor white-label mág een terugbelverzoek/gesprek/foto van klant A **nooit** in de container
van klant B belanden.

📋 **Voor #39 — opties:**
- **Per-tenant prefix** in elk blob-pad (`{tenant}/gesprekken/…`) + tenant afdwingen in élke functie, of
- **Apart storage-account/container per tenant**, en
- **tenant-scoped SAS/rechten** (een tenant-token mag alleen bij eigen data).
- Tenant-id server-side afleiden (uit auth/domein), **nooit** client-side vertrouwen.

Vandaag geen bug (één tenant), maar een harde eis zodra er een tweede klant bijkomt.

---

## 4. Bewaartermijn, recht op verwijdering, verwerkersovereenkomsten 📋

### Bewaartermijnen (huidig)
- **Terugbel-PII:** 30 dagen, dan automatisch geredigeerd (zie punt 1 — met de genoemde gaten).
- **Gewone gesprekken:** geen automatische termijn; alleen handmatige dashboard-`cleanup`.
- **Foto's:** bewaard tot handmatig verwijderd; alleen geanonimiseerd opgeslagen.

→ Vastleggen in een privacyverklaring + (aanbevolen) automatische retentie voor gesprekken.

### Recht op verwijdering (AVG art. 17)
- De dashboard-`cleanup` verwijdert gesprekken vóór een datum, maar er is **geen verwijdering
  per persoon** (op naam/telefoon). → wens: op verzoek een specifiek terugbelverzoek/gesprek
  kunnen verwijderen.

### Verwerkers / subverwerkers (PII verlaat het systeem)
- **Anthropic (Claude API):** ontvangt chat-inhoud. Verwerkersovereenkomst vastleggen.
- **Microsoft Azure:** opslag + compute (Blob/Table, Functions). Standaard DPA.
- **NTFY (`NTFY_URL`):** ⚠️ bij elk terugbelverzoek gaan **naam + telefoon + onderwerp + voorkeurstijd**
  naar de NTFY-push (en optioneel e-mail via NTFY-forwarding, `CONTACT_EMAIL`). Zie `stuurTerugbelNotificatie`
  (`chat.js` ~1949). **Actie:** controleren of `NTFY_URL` self-hosted is of `ntfy.sh` (publieke dienst);
  bij een publieke dienst is dit een subverwerker met PII → verwerkersovereenkomst of self-hosten.

---

## Samenvatting van acties

| # | Actie | Type | Status |
|---|---|---|---|
| 1a | Opschoning redigeert nu ook de `onderwerp`-kopie in `messages` van terugbel-only gesprekken | code-fix in `chat.js` | ✅ toegepast |
| 1c/4 | Automatische bewaartermijn voor álle gesprekken | ontwerp + code | #39 |
| 2 | Gezichts-anonimisatie prominent in AVG-checklist zetten | documentatie | plus |
| 3 | Tenant-isolatie (prefix/account + scoped SAS) | ontwerp | #39 (bij 2e klant) |
| 4 | Privacyverklaring: bewaartermijn + recht op verwijdering | documentatie | #39 |
| 4 | Per-persoon-verwijdering (op naam/telefoon) | code | #39 |
| 4 | NTFY: self-hosted checken / verwerkersovereenkomst | onderzoek | #39 |

> **Status 1a:** toegepast in `terugbelOpschonen` (`chat.js`): bij een terugbel-only gesprek
> (`terugbelVerzoek` gezet, lege `reply`, precies één bericht) wordt `messages` bij de opschoning
> vervangen door een placeholder, zodat de `onderwerp`-kopie geen PII achterlaat. Echte chats
> (gevulde `reply` of meerdere berichten) blijven ongemoeid — die vallen onder de bredere
> retentie-beslissing voor #39 (1b/1c).
