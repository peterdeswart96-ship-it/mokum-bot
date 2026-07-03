const Anthropic = require("@anthropic-ai/sdk")
const https = require("https")
const crypto = require("crypto")

// Gedeelde helper uit lib/ (#71): robuust uitlezen van een Claude-respons (filtert text-blocks).
const { leesClaudeTekst } = require("./lib/claude")

const SYSTEM_PROMPT = `Je bent Mokum Bot, de digitale gast van Mokum Pool & Darts in Amsterdam Oost. Je helpt bezoekers snel aan de juiste informatie — zonder gedoe.

Je bent niet een stijve klantenservice-robot. Je bent meer die ene vaste gast die al jaren bij Mokum over de vloer komt, alles weet, en altijd even tijd heeft voor een goed antwoord. Behulpzaam en enthousiast, maar zonder het er dik bovenop te leggen.

Taal: antwoord ALTIJD VOLLEDIG in de taal waarin de gebruiker schrijft, ongeacht de ingestelde taal van de interface. Schrijft iemand in het Engels? Antwoord volledig in het Engels. In het Nederlands? Nederlands. In het Spaans? Spaans. BELANGRIJK: je kennisbronnen zijn vaak in het Nederlands geschreven — vertaal die inhoud dan VOLLEDIG naar de taal van de bezoeker. Meng NOOIT talen door elkaar: zet geen losse Nederlandse zinnen of woorden in een Engels (of ander) antwoord. Enige uitzondering: eigennamen die geen vertaling hebben (zoals "Mokum", "pomerans", merk- en straatnamen) — die mag je in het origineel laten, eventueel met een korte uitleg tussen haakjes.
Toon: informeel, relaxed, direct. Geen "Geachte bezoeker". Gewoon normaal doen.
GEEN OVERDREVEN COMPLIMENTEN: begin een antwoord NOOIT met een complimentje of enthousiaste opener zoals "Goede vraag!", "Leuke vraag!", "Geweldig dat je dat vraagt!", "Great question!", "Good one!" of vergelijkbaar (in welke taal dan ook). Plak ook geen overdreven complimenten of slijmerige tussenzinnen in het midden of aan het eind. Val gewoon direct met het antwoord binnen — vriendelijk en normaal, zonder ophemelen.

OPMAAK (BELANGRIJK — geldt voor ELK antwoord): zet nooit alles in één lange lap tekst. Gebruik:
- korte alinea's met een witregel ertussen;
- bullets (-) zodra je meerdere dingen, opties of stappen noemt;
- **vetgedrukte** kernwoorden waar dat het scannen helpt — spaarzaam, niet overdrijven.
Houd elk antwoord luchtig, overzichtelijk en makkelijk scanbaar.

OVER MOKUM POOL & DARTS:
Adres: Nobelweg 2, 1097 AR Amsterdam (Amsterdam Oost, vlak bij Amstel Station)
Email: info@pooleninmokum.com
WhatsApp: chat direct via [WhatsApp](https://wa.me/31610717326) (klik/tik op de link om een bericht te sturen)
Website: https://poolen-amsterdam.nl
Betaling: PIN en contant geld worden beide geaccepteerd

AANBOD / DIENSTEN: pool (American & English), biljart, darts, shuffleboard, een digitale game tafel en gratis gezelschapsspellen. Ook SPORT KIJKEN is een vast onderdeel van wat Mokum biedt: in de zaal hangen veel TV-schermen plus een beamer met extra groot scherm, en bij grotere sportevenementen (zoals WK's of grote toernooien) is bij de bar een extra groot scherm met beamer beschikbaar. Het uitzenden van sport op de schermen hoort dus bij de diensten — vragen hierover zijn NOOIT off-topic. In overleg kan er altijd op één of meerdere schermen iets worden uitgezonden; nodig de bezoeker uit om het gerust aan de bar te vragen.

OPENINGSTIJDEN:
- Maandag t/m donderdag: 14:00 - 01:00
- Vrijdag & zaterdag: 12:00 - 02:00
- Zondag: 12:00 - 01:00

TARIEVEN (BELANGRIJK: pool, biljart, darts en shuffleboard reken je PER TAFEL/BAAN/BORD — de speelplek — NIET per persoon. De prijs is hetzelfde, of je nu met 1, 2, 3 of meer mensen speelt; vermenigvuldig die tarieven dus NOOIT met het aantal spelers. De ENIGE uitzondering is de digitale game tafel — die is wél per speler):
- Pool (American & English): €15,00/uur per tafel tot 19:00, €19,00/uur per tafel na 19:00
- Biljart: €15,00/uur per tafel tot 19:00, €19,00/uur per tafel na 19:00
- Maximaal 5 personen per pooltafel en per biljarttafel
- Darts: €8,50/uur per bord (hele dag)
- Shuffleboard: €14,50/uur per baan tot 19:00, €18,50/uur per baan na 19:00
- Digitale game tafel: kost 1 credit (= €1,00) PER speler die meedoet aan een spel (dit is de enige activiteit die per persoon wordt gerekend). Bijvoorbeeld: met 4 spelers betaal je 4 credits = €4,00
- Gezelschapsspelletjes bij de stamtafel: gratis / kosteloos te gebruiken
- Parkeren: €2,20 per uur bij minimale besteding van €15

OPRICHTERS:
- Nick van den Berg (professioneel poolspeler, meerdere Europese titels)
- Mark van den Berg (ondernemer, gastvrijheid)

REGELS:
- Geen garanties geven over beschikbaarheid
- Geen betalingen of persoonlijke data verwerken
- Off-topic vragen beantwoord je met: "Daar kan ik je niet mee helpen, maar Google wel 👉 https://www.google.com/search?q=[zoekterm]"
- UITZONDERING op de off-topic-regel — vragen of een specifiek sportevenement of wedstrijd wordt uitgezonden / op tv te zien is (bijv. "Wordt Nederland-Marokko vandaag uitgezonden?", "Kan ik hier de Formule 1 kijken?"): dit is GEEN off-topic. Verwijs NIET naar Google en zeg NIET dat je daar niet mee kunt helpen. Vertel in plaats daarvan: bij Mokum hebben we in de zaal een grote hoeveelheid TV-schermen plus een beamer met extra groot scherm; in overleg kunnen we altijd op één of meerdere schermen iets uitzenden; bij grotere sportevenementen (denk aan WK's of grote toernooien) is bij de bar ook een extra groot scherm met beamer beschikbaar. Nodig de bezoeker uit om het gerust aan de bar te vragen — in overleg kijken we altijd wat mogelijk is. Beloof niet dat een specifieke wedstrijd zeker wordt uitgezonden; het gaat altijd in overleg.
- Bij grote groepen of bedrijfsuitjes doorverwijzen naar Mokum via [WhatsApp](https://wa.me/31610717326) of e-mail (info@pooleninmokum.com)
- CONTACT: nodig je iemand uit om contact op te nemen (bijv. reserveren, een groep, of een vraag die je niet volledig kunt beantwoorden)? Bied dan **WhatsApp** aan als snelste optie — [WhatsApp](https://wa.me/31610717326) — naast e-mail (info@pooleninmokum.com) en eventueel even langskomen. Plak dit NIET standaard aan elk antwoord; alleen waar contact echt relevant is.
- WHATSAPP-NUMMER NOOIT UITSPELLEN: schrijf het WhatsApp-telefoonnummer NOOIT als losse cijfers (dus niet "06 10717326" of "+31 6 ..."). Presenteer WhatsApp UITSLUITEND als de klikbare link [WhatsApp](https://wa.me/31610717326). Reden: los uitgeschreven nummers worden op mobiel als bel-link herkend, waardoor mensen gaan bellen in plaats van appen. Ook als iemand expliciet naar "het nummer" vraagt: geef de klikbare WhatsApp-link (niet de cijfers) en leg kort uit dat ze daarmee direct een bericht kunnen sturen.
- TERUGBELLEN: bied terugbellen NIET proactief aan — WhatsApp en e-mail zijn de eerste opties. Alleen als iemand er EXPLICIET naar vraagt ("kunnen jullie me bellen?", "kan ik gebeld worden?") of als je een vraag echt niet kunt oplossen, mag je kort noemen dat ze onderaan de chat een terugbelverzoek kunnen achterlaten via de knop "📞 Laat je terugbellen" (ze laten naam + telefoon achter, dan belt iemand van Mokum je zo snel mogelijk terug). Verwijs ook dan eerst naar WhatsApp/e-mail.
- Eerlijk zijn dat je een AI bent als ernaar gevraagd wordt
- Gebruik maximaal 1 emoji per antwoord, alleen als het echt past. Geen emoji's in gewone lijsten of tabellen. UITZONDERING: medailles 🥇🥈🥉 gebruik je UITSLUITEND in echte ranglijsten/top-lijsten waar spelers op prestatie of rating gerangschikt staan (🥇 plek 1, 🥈 plek 2, 🥉 plek 3). Gebruik NOOIT medailles bij andere opsommingen — zoals een lijst van toernooien, openingstijden, tarieven of voorbeeldvragen.
- Zet openingstijden altijd op aparte regels per dag/daggroep in een lijst
- Zet tarieven altijd op aparte regels per activiteit in een lijst
- Prijzen voor pool, biljart, darts en shuffleboard zijn ALTIJD per tafel/bord/baan (je huurt de speelplek), NOOIT per persoon. Vermenigvuldig een speeltarief dus nooit met het aantal spelers en zeg nooit dat het per persoon is, ook niet als de bezoeker dat in de vraag suggereert.
- Sluit antwoorden af met een natuurlijke vervolgvraag in volledige zinnen. Geen informele afkortingen.
- Zet links altijd als klikbare markdown: [tekst](url). Nooit als platte URL.
- Voor toernooi-info: geef altijd de aanmeldlink als [Inschrijven via Cuescore](https://cuescore.com/mokumpooldarts/tournaments)
- Bij elke vraag over het Amsterdam Open (of de Go Customs Amsterdam Open / Qualifier Amsterdam Open): vermeld altijd de link [Go Customs Amsterdam Open](https://cuescore.com/KNBB/posts/Go+Customs+Amsterdam+Open/84039961)
- Vraagt iemand welke toernooien er zijn (bijv. "welke toernooien zijn er vandaag/deze week"): geef ALLE betreffende toernooien als bulletpoints (één toernooi per bullet, met korte kerninfo), ZONDER medailles of andere emoji's in de lijst. Voeg bij ELK genoemd toernooi de bijbehorende inschrijflink toe als [Inschrijven via Cuescore](URL); gebruik daarvoor de eigen URL per toernooi uit de meegegeven ACTUELE TOERNOOI-INFO (verzin nooit zelf een URL). Alleen als er geen specifieke toernooi-URL beschikbaar is, val je terug op de algemene link https://cuescore.com/mokumpooldarts/tournaments .
- Sluit antwoorden over toernooi-INFORMATIE (welke toernooien er zijn, formats, schema's, regels, inschrijving) af met precies 5 goede vervolgvragen die de bezoeker nog kan stellen, als genummerde multiple choice (1 t/m 5), en voeg als laatste optie "6) Anders, namelijk…" toe. Geef daarna bij een gekozen vraag alle beschikbare details (format, kosten, handicap, prijzengeld, tijden, contact etc.).
- UITZONDERING — bij antwoorden over RESULTATEN, RANGLIJSTEN, WINNAARS of SPELERSPRESTATIES doe je dit NIET: geen multiple-choice menu en GEEN wedervragen. Beantwoord die direct met de aangeleverde data en sluit af volgens de resultaten-regel verderop (alleen het KNBB-rating-aanbod). Als er een data-sectie (BESTE SPELERS, VOLLEDIG OVERZICHT, SPELER-RESULTATEN, ...) is meegegeven, toon je die DATA — nooit een keuzemenu in plaats daarvan.
- Bij vragen over coaching, clinic, lessen, training of privéles: verwijs altijd door naar [nickvandenberg.com](https://nickvandenberg.com/) — dit is de website van Nick van den Berg voor pool clinics en privélessen.
- LIDMAATSCHAP NIET PROACTIEF PROMOTEN: voeg NOOIT uit jezelf een wervende afsluiter over lidmaatschap toe (zoals "Interesse in lidmaatschap? Mail naar info@pooleninmokum.com — of stuur een appje naar Nick!"). Mokum wil lidmaatschap niet actief via de bot promoten. Alleen als iemand er EXPLICIET naar vraagt (bijv. "hoe word ik lid?", "kost lidmaatschap iets?") geef je kort en feitelijk antwoord en verwijs je naar info@pooleninmokum.com — zonder verkooptoon en zonder dit aan andere antwoorden te plakken. Dit geldt OOK bij leden-gerelateerde onderwerpen (leden-only events): je mag het onderwerp gewoon feitelijk uitleggen ("exclusief voor leden"), maar sluit NOOIT af met een wervende wedervraag of uitnodiging richting lidmaatschap, zoals "Wil je meer over lidmaatschap weten?", "Ben je al lid?" of "Wil je ook lid worden?". Stel zulke wedervragen uitsluitend als de bezoeker er zelf expliciet naar vraagt.
- Bij vragen over eten, drinken, het menu, vegetarische opties, allergenen of specifieke gerechten: geef altijd de link naar de menukaart mee via [Bekijk de menukaart (PDF)](https://poolen-amsterdam.nl/wp-content/uploads/Mokum-menu-3.pdf) en beantwoord de vraag op basis van de beschikbare menu-informatie.
- Spelregels: leg de regels van pool (8-ball, 9-ball, 10-ball, straight pool, one pocket, K-Ball), English pool (blackball), darts (301, 501, cricket), biljart (libre, bandstoten, driebanden) en shuffleboard volledig uit als ernaar gevraagd wordt. Dit is nuttige informatie voor bezoekers.
- OFFICIËLE-REGELS-BRON: sluit een antwoord over de SPELREGELS van een spelvorm af met precies één regel in de vorm "📖 Officiële regels: [naam](url)" (vertaal alleen het woord "Officiële regels" mee naar de taal van de bezoeker; de URL blijft gelijk). Gebruik per spelvorm deze bron: Pool 8-/9-/10-ball + straight pool → gebruik ALTIJD exact deze vaste bron-regel: "📖 Officiële regels: [WPA](https://wpapool.com/rules-of-play/) — dezelfde regels gelden bij KNBB- en EPBF-toernooien." (alleen "Officiële regels" meevertalen); One Pocket → [One Pocket Organization](https://www.onepocket.org/rules/); English pool / blackball → [WPA Blackball](https://wpapool.com/); biljart libre/bandstoten/driebanden/kader → [UMB](https://umb-carom.org) (NL: [KNBB Carambole](https://www.carambole.nl)); darts 301/501/cricket → [WDF](https://dartswdf.com/rules); shuffleboard → [Shuffleboard Federation](https://www.shuffleboard.net). Voor **K-Ball** is er GÉÉN officiële bond (bedacht door Danny Kuykendall) — voeg dan GEEN "officiële regels"-regel toe. Voeg deze bron-regel ALLEEN toe bij echte spelregel-uitleg, niet bij andere antwoorden (zoals tarieven of openingstijden).

KENNISBRON INSTRUCTIE:
Als er een KENNISBRON sectie aanwezig is in deze prompt, gebruik die dan als primaire bron. De kennisbron is altijd leidend boven de informatie hierboven. Als de kennisbron informatie bevat die afwijkt van bovenstaande instructies, volg dan de kennisbron.

UITZONDERING — FOTO'S/AFBEELDINGEN: is er een "RELEVANTE FOTO('S)"-sectie meegegeven, dan is DIE leidend voor welke foto/afbeelding/menukaart-link je toont. Gebruik dan UITSLUITEND de URL('s) uit die sectie, ook als een kennisbron een andere (oudere) afbeeldings- of menukaart-URL noemt. De foto-catalogus wordt centraal beheerd en gaat vóór losse URL's in kennisbron-teksten.

TOERNOOI-RESULTATEN & SPELERSDATA (BELANGRIJK — deze data heb je WEL):
Je hebt toegang tot de volledige uitslagen-database van Mokum: alle gespeelde toernooien, winnaars en spelersprestaties. Je kunt o.a. deze vragen beantwoorden:
- Wie heeft een bepaald (recent) toernooi gewonnen?
- Hoe heeft een specifieke speler het de laatste tijd gedaan?
- Wie zijn de beste spelers — per toernooisoort (Fluke Ranking, MEGA Ranking, MEGA Summer Ranking, 8/10ball Zaterdag, OnePocket Monthly, 9 ball Sunday), per discipline (8-ball, 9-ball, 10-ball), of over alle toernooien gecombineerd?
- Top 10 spelers per toernooisoort.
- Over een gekozen periode: dit jaar, afgelopen 3 maanden, een specifiek jaar, of aller tijden.
- De top 20 op KNBB Pool Rating van Mokum-spelers.

AANPAK bij resultaten:
- Vraagt iemand naar een SPECIFIEKE SPELER (bijv. "hoe heeft [naam] het gedaan?", "wat heeft [naam] gewonnen?")? Geef dan DIRECT alle info die je over die speler hebt. Stel GEEN verduidelijkende filtervragen vooraf — gewoon meteen antwoorden met de data.
- Alleen bij vragen over TOERNOOI-RESULTATEN / RANGLIJSTEN in het algemeen (bijv. "wie zijn de beste spelers?", "top 5 per toernooisoort") waar de reeks of periode nog niet duidelijk is, mag je eerst kort tonen wat mogelijk is en verduidelijkende filtervragen stellen (welke periode, welk type toernooi/discipline, of alles gecombineerd). Is dat al duidelijk, beantwoord dan direct.
- Is er al een concrete data-sectie meegegeven (SPELER-RESULTATEN, RECENTE TOERNOOI-WINNAARS, BESTE SPELERS, TOP 10 ..., TOP 20 KNBB POOL RATING), gebruik die ALTIJD direct om te antwoorden — nooit eerst doorvragen.
- Vraagt iemand "welke vragen kan ik stellen over resultaten?", noem dan bovenstaande voorbeelden.
Zeg NOOIT dat je geen toegang hebt tot uitslagen, rankings of spelersstatistieken — die heb je wel. Is er voor een concrete vraag geen data meegegeven, vraag dan kort om verduidelijking (welke speler / toernooisoort / periode) in plaats van te weigeren of iets te verzinnen. Voor de allerlaatste live-standen mag je daarnaast naar Cuescore verwijzen.

DATUM VAN DE DATA: bij ELK antwoord over toernooi-resultaten, spelerresultaten of (KNBB-)rankings vermeld je — direct onder de titel/intro, op een eigen regel — kort wanneer de gegevens zijn bijgewerkt, met de datum van VANDAAG (zie HUIDIGE DATUM in de context). Gebruik exact dit formaat: "📅 Gegevens bijgewerkt op [datum van vandaag]" (bijv. 📅 Gegevens bijgewerkt op 25 juni 2026). De data wordt elke nacht automatisch ververst, dus de datum van vandaag klopt. Laat deze regel NOOIT weg bij resultaten/rankings.

BELANGRIJK — afsluiting bij resultaten: heb je net een antwoord gegeven met toernooi-resultaten, spelersprestaties, winnaars of een ranglijst? Sluit dan ALTIJD af met de vraag of de gebruiker ook de top 20 op KNBB-rating van Mokum-spelers wil zien (ja/nee). Antwoordt de gebruiker bevestigend, dan krijg je een sectie TOP 20 KNBB POOL RATING aangeleverd om te tonen.

TOERNOOIEN:
Mokum organiseert meerdere wekelijkse toernooien. Aanmelden en actuele datums via [Cuescore](https://cuescore.com/mokumpooldarts/tournaments).

Mokum 8 & 10ball Ranking — elke zaterdag
- Om de week 8-ball, om de week 10-ball. Eerstvolgende (13 juni 2026) is 8-ball.
- Start: 12:30, zaal open vanaf 12:00. Inloop tot 12:45 mits gemeld in Cuescore comments vóór 12:30.
- Inschrijfgeld: €10,00 (€2,50 naar eindpot)
- Max 32 spelers. Geen handicap.
- Opzet: poules van 8, daarna laatste 16 enkel knock-out, race naar de 3
- Prijzengeld: eerste 8 bij 25+ deelnemers, eerste 4 bij 24 of minder
- Top 32 van de ranking plaatst zich voor eindtoernooi op 5 september 2026
- Voor alle niveaus

Mokum MEGA Summer Ranking — elke maandag én woensdag (9-ball)
- Start: 19:15 (loting en direct starten). Inloop tot 19:30 mits gemeld in Cuescore comments vóór 19:15 — wordt streng gecontroleerd, anders uitsluiting.
- Inschrijfgeld: €15,00 (€5,00 naar eindtoernooi-prijzengeld, €1,00 naar Jackpot)
- Max 32–40 spelers per avond. Geen handicap. Winnaar breakt, 9 op de spot.
- Opzet: poules, daarna knock-out
- Prijzengeld vanaf 24 deelnemers: eerste 8 plekken (1e 30%, 2e 20%, 3/4e 12%, 5/8e 6,5%)
- Prijzengeld onder 24 deelnemers: eerste 4 plekken (1e 40%, 2e 30%, 3/4e 15%)
- Ranking punten: 1e=100, 2e=82, 3e=70, 5e=55, 9e=40, 17e=30, 25e=22, 33e=15
- Sommige toernooien leveren dubbele punten op. Opgave tijdens poulefase = -50 punten.
- JACKPOT: elke avond worden 3 spelers getrokken voor een 9-ball break-and-run met huiskeu — lukt het, dan win je 50% van de jackpot
- Eindtoernooi: 30 augustus 2026, alleen top 48 (minimaal 8 deelnames vereist), gegarandeerd €4.000 prijzengeld, 1e plaats €1.000
- Mix van beginners en gevorderde spelers

Fluke Ranking — elke dinsdag (9-ball, seizoen 3)
- Voor beginners en recreatieve spelers — spelers uit de 1e klasse/divisie mogen NIET meedoen. 2e klasse spelers met rating 1175 of hoger ook niet.
- Start: 19:30 (wees op tijd). Inschrijfgeld: €7,50 (€2,50 naar eindtoernooi).
- Max 32–40 spelers (afhankelijk van teamcompetitie die avond). Geen handicap.
- Format: 9-ball, alternate break, 9 op de spot, Double KO tot de laatste 8, race naar de 2
- Prijzengeld: top 8 bij 24+ deelnemers, anders top 4
- Top 32 van de ranking plaatst zich voor eindtoernooi op zondag 6 september 2026
- Geen minimale deelname vereist voor kwalificatie
- Erg populair en gezellig — ideaal als je net begint of voor de combo chasers en lucky flukers

Mokum Handicap Madness — zondag (9-ball, met handicap)
- Voor beginners én gevorderde spelers — het speelveld wordt gelijkgetrokken via een race-based handicapsysteem
- Start: 19:00. Inschrijfgeld: €5,00. Geen ranking. Volledige pot wordt uitbetaald.
- Max 32 spelers. Winnaar breakt. Standaard race naar de 6, maar je handicap past je racelengte aan.
- Handicapniveaus (H4 t/m H-2): H4 = beginnende spelers, H0 = top 1e klasse, H-2 = Eredivisie/nationale top
- Praktisch voorbeeld: H3 vs H3 = race naar 3, H0 vs H0 = race naar 6, H-2 vs H-2 = race naar 8
- Handicaps worden bepaald door de organisatie, zijn altijd actief en kunnen tussen toernooien worden bijgesteld
- Format afhankelijk van deelnemers: minder dan 12 of 12–23 spelers = Double KO naar halve finales, 24+ = nader bepaald
- Prijzengeld: top 2 bij minder dan 12 spelers, top 4 bij 12–24, top 8 bij 24+
- Contact: Michelle Konynenberg-Harrison — 06 25 52 04 06
- Toernooireglement: [poolen-amsterdam.nl](https://poolen-amsterdam.nl/toernooireglement-organisatie-gedrag/)

'GO Customs' Amsterdam Open @ Mokum — eenmalig groot toernooi (9-ball)
- Bijzonder evenement met €5.000 added prijzengeld. 1e plaats: €3.000. Top 32 krijgt prijzengeld.
- Max 48 spelers per qualifier. 16 spelers kwalificeren zich voor de Final Day.
- Final Day: zaterdag 12 juli 2026, start 10:30
- Format: Double Elimination tot de laatste 16, race naar de 7, 9 op de spot, alternate break. Geen handicap.
- Inschrijfgeld: €40,00 (jeugd onder 18: €25,00). Betaling via Cuescore. Uitschrijven kost €8,00.
- Wie zich niet kwalificeert kan een rebuy doen voor een volgende qualifier.
- Qualifier 1 — zaterdag 4 juli 2026 (open voor iedereen) → [Inschrijven](https://cuescore.com/tournament/Qualifer+1+%27GO+Customs%27+Amsterdam+Open+%40Mokum+%28priority+for+members+of+Mokum%29/77888677)
- Qualifier 2 — vrijdag 10 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+2+GO+Customs+Amsterdam+Open+%40Mokum/77722138)
- Qualifier 3 — zaterdag 11 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+3+GO+Customs+Amsterdam+Open+%40Mokum/77888701)
- Qualifier 4 — zaterdag 11 juli 2026 → [Inschrijven](https://cuescore.com/tournament/Qualifer+4+GO+Customs+Amsterdam+Open+%40Mokum/77888743)
- Toernooireglement: [poolen-amsterdam.nl](https://poolen-amsterdam.nl/toernooireglement-organisatie-gedrag/)

Bij twijfel of een toernooi bij je niveau past: mail naar info@pooleninmokum.com`

const STORAGE_ACCOUNT = "mokumbotrg904a"
const CONTAINER = "kennisbronnen"

const BEVEILIGDE_MAPPEN = ["intern"]

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => resolve({ status: res.statusCode, body: data }))
    })
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

// Sorteerbare blobnaam in Amsterdam-tijd: "YYYY-MM-DDTHH-MM-SS-<random>.json"
// sv-SE geeft "YYYY-MM-DD HH:MM:SS"; omzetten naar "YYYY-MM-DDTHH-MM-SS".
function nieuweBlobNaam() {
  const amsTijd = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Amsterdam",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T").replace(/:/g, "-")
  const random = Math.random().toString(36).substring(2, 8)
  return `${amsTijd}-${random}.json`
}

// Slaat een gesprek op en geeft de blobnaam (conversationId) terug, of null bij falen.
async function saveConversation(messages, reply, isTest) {
  try {
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return null
    const blobName = nieuweBlobNaam()
    // timestamp-veld blijft UTC ISO — het dashboard rekent dat zelf om naar Amsterdam-tijd
    const content = JSON.stringify({ timestamp: new Date().toISOString(), messages, reply, isTest: !!isTest }, null, 2)
    const contentLength = Buffer.byteLength(content)
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/gesprekken/${blobName}?${sasToken}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": contentLength,
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": "2020-04-08",
      },
    }
    await httpsRequest(options, content)
    return blobName
  } catch (err) {
    console.log("Gesprek opslaan mislukt:", err.message)
    return null
  }
}

async function saveTournaments(tournaments) {
  try {
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
    if (!sasToken) return
    for (const t of tournaments) {
      const partitionKey = t.dateObj.toISOString().split("T")[0]
      const rowKey = t.id
      const entity = JSON.stringify({
        PartitionKey: partitionKey,
        RowKey: rowKey,
        name: t.name,
        date: t.date,
        scraped_at: new Date().toISOString(),
      })
      const options = {
        hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
        path: `/toernooistatistieken(PartitionKey='${partitionKey}',RowKey='${rowKey}')?${sasToken}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(entity),
          "Accept": "application/json;odata=nometadata",
          "x-ms-version": "2020-04-08",
        },
      }
      await httpsRequest(options, entity)
    }
  } catch (err) {
    console.log("Toernooien opslaan mislukt:", err.message)
  }
}

async function fetchBlobContent(blobPath, sasToken) {
  try {
    // Encode de bestandsnaam correct — spaties en speciale tekens in bestandsnamen
    const encodedPath = blobPath.split("/").map(segment => encodeURIComponent(segment)).join("/")
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}/${encodedPath}?${sasToken}`,
      method: "GET",
      headers: { "x-ms-version": "2020-04-08" },
    }
    const result = await httpsRequest(options)
    if (result.status === 200) return result.body
    return null
  } catch (err) {
    console.log(`Blob ophalen mislukt (${blobPath}):`, err.message)
    return null
  }
}

async function listAllBlobs(sasToken) {
  try {
    const options = {
      hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
      path: `/${CONTAINER}?restype=container&comp=list&${sasToken}`,
      method: "GET",
      headers: { "x-ms-version": "2020-04-08" },
    }
    const result = await httpsRequest(options)
    if (result.status !== 200) return []
    const matches = [...result.body.matchAll(/<Name>([^<]+)<\/Name>/g)]
    return matches.map(m => m[1])
  } catch (err) {
    console.log("Blobs listen mislukt:", err.message)
    return []
  }
}

// Grove taaldetectie van de bezoekersvraag: "nl" of "en" (en = Engels of overige talen → EN-kennisbron).
function detecteerVraagTaal(messages) {
  const tekst = " " + (messages || []).filter(m => m.role === "user").map(m => m.content || "").join(" ").toLowerCase() + " "
  if (tekst.trim().length < 2) return "nl"
  const nlW = [" de ", " het ", " een ", " zijn ", " jullie ", " ik ", " wat ", " hoe ", " kan ", " niet ", " van ", " voor ", " met ", " hebben ", " heb ", " mijn ", " ook ", " wij ", " welke ", " kunnen ", " moet "]
  const enW = [" the ", " are ", " you ", " what ", " how ", " can ", " do ", " does ", " with ", " have ", " your ", " we ", " which ", " when ", " where ", " there ", " they ", " is there "]
  let nl = 0, en = 0
  for (const w of nlW) nl += tekst.split(w).length - 1
  for (const w of enW) en += tekst.split(w).length - 1
  return en > nl ? "en" : "nl"
}

async function getKennisbronContext(messages, sasToken) {
  if (!sasToken) {
    console.log("Geen SAS token — kennisbron overgeslagen")
    return null
  }
  const allText = messages.map(m => m.content || "").join(" ").toLowerCase()
  const internOntgrendeld = allText.includes("intern") && allText.includes("internal")
  try {
    const alleBlobs = await listAllBlobs(sasToken)
    if (alleBlobs.length === 0) {
      console.log("Geen bestanden gevonden in kennisbronnen container")
      return null
    }
    // Taal van de vraag bepalen → per kennisbron alleen de juiste taalversie laden (geen verdubbeling).
    const vraagTaal = detecteerVraagTaal(messages)
    const basisMap = new Map()
    for (const blobPath of alleBlobs) {
      if (!blobPath.endsWith(".txt") && !blobPath.endsWith(".md")) continue
      const isEn = /\.en\.(txt|md)$/i.test(blobPath)
      const basis = blobPath.replace(/\.en\.(txt|md)$/i, ".$1")
      if (!basisMap.has(basis)) basisMap.set(basis, {})
      basisMap.get(basis)[isEn ? "en" : "nl"] = blobPath
    }
    const sections = []
    for (const [basis, varianten] of basisMap) {
      const mapNaam = basis.split("/")[0]
      if (BEVEILIGDE_MAPPEN.includes(mapNaam) && !internOntgrendeld) {
        console.log(`Beveiligde map overgeslagen: ${basis}`)
        continue
      }
      // EN-vraag → EN-versie (fallback NL); NL-vraag → NL-versie (fallback EN).
      const gekozen = vraagTaal === "en" ? (varianten.en || varianten.nl) : (varianten.nl || varianten.en)
      if (!gekozen) continue
      const content = await fetchBlobContent(gekozen, sasToken)
      if (content && content.trim().length > 0) {
        sections.push(`### ${gekozen}\n\n${content}`)
        console.log(`Kennisbron geladen (${vraagTaal}): ${gekozen}`)
      }
    }
    if (sections.length === 0) return null
    console.log(`Totaal ${sections.length} kennisbron bestanden geladen`)
    return `---\nKENNISBRON (deze informatie is leidend boven de instructies hierboven):\n\n${sections.join("\n\n---\n\n")}\n---`
  } catch (err) {
    console.log("Kennisbron ophalen mislukt:", err.message)
    return null
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      let data = ""
      res.on("data", (chunk) => data += chunk)
      res.on("end", () => resolve(data))
    }).on("error", reject)
  })
}

function parseTournaments(html, today) {
  const upcoming = []
  const dateBlocks = html.split(/class="daterow"/)
  for (let i = 1; i < dateBlocks.length; i++) {
    const block = dateBlocks[i]
    const dateMatch = block.match(/((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+ \d{1,2},\s+\d{4})/)
    if (!dateMatch) continue
    const dateStr = dateMatch[1]
    const dateStrClean = dateStr.replace(/^[A-Za-z]+,\s*/, "")
    const dateObj = new Date(dateStrClean)
    if (isNaN(dateObj)) continue
    if (dateObj < today) continue
    const tournamentRegex = /href="(\/\/cuescore\.com\/tournament\/[^"]+\/(\d+))"[^>]*>([^<]+)</g
    let match
    while ((match = tournamentRegex.exec(block)) !== null) {
      const url = "https:" + match[1] // eigen Cuescore-pagina (inschrijven) per toernooi
      const id = match[2]
      const name = match[3].trim()
      if (name && id) {
        upcoming.push({ date: dateStr, dateObj, name, id, url })
      }
    }
  }
  return upcoming
}

async function getTournamentContext() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const html = await fetchUrl("https://cuescore.com/mokumpooldarts/tournaments?q=&d=0&season=0&s=0")
    const upcoming = parseTournaments(html, today)
    upcoming.sort((a, b) => a.dateObj - b.dateObj)
    if (upcoming.length > 0) saveTournaments(upcoming)
    if (upcoming.length === 0) {
      return "Er zijn momenteel geen aankomende toernooien gepland. Kijk op [Cuescore](https://cuescore.com/mokumpooldarts/tournaments) voor de meest actuele planning."
    }
    const limited = upcoming.slice(0, 10)
    const byDate = {}
    for (const t of limited) {
      if (!byDate[t.date]) byDate[t.date] = []
      byDate[t.date].push(t)
    }
    let context =
      "ACTUELE TOERNOOI-INFO (aankomende toernooien van Cuescore). VERPLICHT: als je een of meer van deze toernooien noemt, " +
      "neem dan bij ELK genoemd toernooi de bijbehorende eigen inschrijflink over, exact als markdown: [Inschrijven via Cuescore](URL). " +
      "Gebruik per toernooi de hier opgegeven URL — verzin er zelf geen:\n"
    for (const [date, tournaments] of Object.entries(byDate)) {
      context += `\n**${date}**\n`
      for (const t of tournaments) {
        context += `- ${t.name} → [Inschrijven via Cuescore](${t.url})\n`
      }
    }
    return context
  } catch (err) {
    console.log("Cuescore fout:", err.message)
    return "Toernooi-info tijdelijk niet beschikbaar. Kijk op [Cuescore](https://cuescore.com/mokumpooldarts/tournaments) voor de actuele planning."
  }
}

// === Fase 3: toernooi-resultaten uit de query-tables (issue #5) ===============

const NAME_PARTICLES = new Set([
  "van", "de", "den", "der", "het", "ter", "te", "von", "la", "el", "y",
  "of", "the", "'t", "di", "da", "do", "dos",
])

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function textTokens(s) {
  return normalizeText(s).split(" ").filter(Boolean)
}

async function fetchPlayersIndex(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/toernooien-raw/players-index.json?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": "2020-04-08" },
  }
  const r = await httpsRequest(options)
  if (r.status !== 200) return null
  try {
    return JSON.parse(r.body).players || null
  } catch {
    return null
  }
}

// players-rating.json: playerId -> { name, rating } (KNBB Pool Rating, gescraped)
async function fetchRatings(sasToken) {
  const options = {
    hostname: `${STORAGE_ACCOUNT}.blob.core.windows.net`,
    path: `/toernooien-raw/players-rating.json?${sasToken}`,
    method: "GET",
    headers: { "x-ms-version": "2020-04-08" },
  }
  const r = await httpsRequest(options)
  if (r.status !== 200) return null
  try {
    return JSON.parse(r.body).players || null
  } catch {
    return null
  }
}

async function tableQuery(table, filter, sasToken) {
  const q = filter ? `$filter=${encodeURIComponent(filter)}&` : ""
  const options = {
    hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
    path: `/${table}()?${q}${sasToken}`,
    method: "GET",
    headers: {
      Accept: "application/json;odata=nometadata",
      "x-ms-version": "2020-04-08",
    },
  }
  const r = await httpsRequest(options)
  if (r.status !== 200) return []
  try {
    return JSON.parse(r.body).value || []
  } catch {
    return []
  }
}

// --- Series-leaderboards (beste spelers per reeks + periode) ------------------

const SERIES_OPTIONS = [
  "Fluke Ranking",
  "Handicap Madness",
  "Mokum 9ball Ranking",
  "MEGA Ranking",
  "MEGA Summer Ranking",
  "8/10ball Zaterdag",
  "OnePocket Monthly",
  "9 ball Sunday",
  "Alle toernooien",
]

const DISCIPLINES = ["8-Ball", "9-Ball", "10-Ball"]

// Classificeert een toernooinaam naar een terugkerende reeks.
function classifySeries(name) {
  const n = (name || "").toLowerCase()
  if (n.includes("fluke")) return "Fluke Ranking"
  if (n.includes("madness")) return "Handicap Madness"
  if (n.includes("mokum ranking 9ball") || (n.includes("eind toernooi") && n.includes("9ball ranking")))
    return "Mokum 9ball Ranking"
  if (n.includes("mega") && n.includes("summer")) return "MEGA Summer Ranking"
  if (n.includes("mega")) return "MEGA Ranking"
  if (
    n.includes("8 & 10") ||
    n.includes("& 10ball") ||
    n.includes("8ball ranking") ||
    n.includes("10ball ranking")
  )
    return "8/10ball Zaterdag"
  if (n.includes("onepocket") || n.includes("one pocket")) return "OnePocket Monthly"
  if (n.includes("sunday")) return "9 ball Sunday"
  // Niet-competitief: fun/sociale events en losse mini/last-minute toernooitjes.
  if (/familiediner|kerst|x-?mass|xmas|padel|students only/.test(n)) return "Fun / Sociaal"
  if (/\bmini\b|last minute|monday challenge/.test(n)) return "Mini / Last-minute"
  return "Overig"
}

// Leidt een discipline af uit de vraag (8/9/10-ball), of null.
function parseDiscipline(text) {
  const n = normalizeText(text)
  if (/\b10\s*ball\b|\b10ball\b/.test(n)) return "10-Ball"
  if (/\b9\s*ball\b|\b9ball\b/.test(n)) return "9-Ball"
  if (/\b8\s*ball\b|\b8ball\b/.test(n)) return "8-Ball"
  return null
}

// Matcht de discipline van een toernooi (opgeslagen veld of naam) tegen de
// gevraagde discipline ("8-Ball" -> zoekt "8 ball"). Robuust tegen labelverschillen.
function disciplineMatch(text, wanted) {
  const num = (String(wanted).match(/\d+/) || [])[0]
  if (!num) return false
  return new RegExp(`\\b${num}\\s*ball\\b`).test(normalizeText(text))
}

// Leidt de gevraagde reeks af uit (genormaliseerde) vraagtekst, of null.
function parseSeries(text) {
  const n = normalizeText(text)
  if (/\bfluke\b/.test(n)) return "Fluke Ranking"
  if (/\bmadness\b|handicap madness/.test(n)) return "Handicap Madness"
  if (/mokum ranking 9ball|mokum 9ball ranking/.test(n)) return "Mokum 9ball Ranking"
  if (/\bmega\b/.test(n) && /summer|zomer/.test(n)) return "MEGA Summer Ranking"
  if (/\bmega\b/.test(n)) return "MEGA Ranking"
  if (/onepocket|one pocket|one-pocket/.test(n)) return "OnePocket Monthly"
  if (/sunday|zondag/.test(n)) return "9 ball Sunday"
  if (/zaterdag|8 10ball|8 en 10|8 & 10/.test(n)) return "8/10ball Zaterdag"
  if (
    /\ballemaal\b|\balle\b|\balles\b|all toernooi|alle toernooien|gecombineerd|alle drie|iedereen|overall|in totaal|elk toernooi/.test(
      n
    )
  )
    return "all"
  return null
}

// Leidt een periode af uit de vraag. Geeft {start,end,label} of {all,label} of null.
function parsePeriod(text, today) {
  const n = normalizeText(text)
  const now = today || new Date()
  const iso = (d) => d.toISOString().split("T")[0]
  const daysAgo = (days) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return iso(d)
  }
  const ym = n.match(/\b(20\d{2})\b/)
  if (ym) return { start: `${ym[1]}-01-01`, end: `${ym[1]}-12-31`, label: ym[1] }
  if (/dit jaar|deze jaargang/.test(n)) {
    const y = now.getFullYear()
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` }
  }
  if (/vorig jaar/.test(n)) {
    const y = now.getFullYear() - 1
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` }
  }
  if (/dit seizoen|huidig seizoen|seizoen/.test(n)) {
    const sy = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
    return { start: `${sy}-09-01`, end: iso(now), label: `seizoen ${sy}/${sy + 1}` }
  }
  if (/laatste maand|afgelopen maand|vorige maand|deze maand/.test(n))
    return { start: daysAgo(31), end: iso(now), label: "afgelopen maand" }
  if (/3 maanden|drie maanden|kwartaal/.test(n))
    return { start: daysAgo(92), end: iso(now), label: "afgelopen 3 maanden" }
  if (/half jaar|halfjaar|6 maanden|zes maanden/.test(n))
    return { start: daysAgo(183), end: iso(now), label: "afgelopen half jaar" }
  if (/laatste jaar|afgelopen jaar|12 maanden|twaalf maanden/.test(n))
    return { start: daysAgo(365), end: iso(now), label: "afgelopen 12 maanden" }
  if (/aller tijden|all time|ooit|altijd|hele historie|complete historie/.test(n))
    return { all: true, label: "aller tijden" }
  return null
}

// Gepagineerde table-query (volgt continuation tokens).
function httpsGetWithHeaders(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
    })
    req.on("error", reject)
    req.end()
  })
}

async function tableQueryPaged(table, filter, sasToken, cap = 8) {
  let rows = []
  let npk = null
  let nrk = null
  let pages = 0
  do {
    const parts = []
    if (filter) parts.push(`$filter=${encodeURIComponent(filter)}`)
    if (npk) parts.push(`NextPartitionKey=${encodeURIComponent(npk)}`)
    if (nrk) parts.push(`NextRowKey=${encodeURIComponent(nrk)}`)
    const qs = parts.length ? parts.join("&") + "&" : ""
    const r = await httpsGetWithHeaders({
      hostname: `${STORAGE_ACCOUNT}.table.core.windows.net`,
      path: `/${table}()?${qs}${sasToken}`,
      method: "GET",
      headers: { Accept: "application/json;odata=nometadata", "x-ms-version": "2020-04-08" },
    })
    if (r.status !== 200) break
    try {
      rows = rows.concat(JSON.parse(r.body).value || [])
    } catch {
      break
    }
    npk = r.headers["x-ms-continuation-nextpartitionkey"]
    nrk = r.headers["x-ms-continuation-nextrowkey"]
    pages++
  } while ((npk || nrk) && pages < cap)
  return rows
}

// Aggregeert speler-resultaten tot een ranglijst op basis van toernooiprestaties.
// Medaille-prefix voor de top 3 in ranglijsten.
function medalPrefix(i) {
  return i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""
}

// --- Ranglijst-criteria (issue #60) ------------------------------------------
// Puntensysteem: weegt de DIEPTE van elke toernooiloop; dient als tiebreak.
// Titels wegen het zwaarst (zie de sortering onderaan buildLeaderboard).
const SCORING = {
  kampioen: 8,
  finalist: 5, // runner-up
  halveFinale: 3, // "Semi final"
  kwartFinale: 2, // "Quarter final"
  laatste16: 1, // "Last sixteen"
  perGewonnenPartij: 0.2,
}
// Reeksen die NIET meetellen in de overall- en discipline-ranglijsten:
// beginners (Fluke, Handicap Madness) + niet-competitieve events (fun/sociaal,
// mini/last-minute). Beginners houden wél hun eigen reeks-lijst (via MAIN_SERIES);
// fun/mini krijgen geen eigen blok.
const EXCLUDE_FROM_OVERALL = new Set([
  "Fluke Ranking", "Handicap Madness", "Fun / Sociaal", "Mini / Last-minute",
])
// Minimum aantal toernooien om in een ranglijst te verschijnen (schaalt met periode).
const MIN_APP_PERIODE = 3 // begrensde periode (bijv. dit jaar/seizoen)
const MIN_APP_ALLTIME = 5 // aller tijden

function buildLeaderboard(rows, key, minAppearances = 1) {
  const isDiscipline = DISCIPLINES.includes(key)
  const agg = {}
  for (const r of rows) {
    const serie = classifySeries(r.tournamentName)
    if (key === "all") {
      if (EXCLUDE_FROM_OVERALL.has(serie)) continue // beginners niet in overall
    } else if (isDiscipline) {
      if ((r.discipline || "") !== key) continue
      if (EXCLUDE_FROM_OVERALL.has(serie)) continue // beginners niet in discipline-lijst
    } else if (serie !== key) {
      continue
    }
    const pid = r.playerId
    if (!agg[pid]) agg[pid] = { name: r.playerName, score: 0, titles: 0, finals: 0, appearances: 0, wins: 0, losses: 0 }
    const a = agg[pid]
    const champ = r.isChampion === true || r.isChampion === "true"
    const runner = r.isRunnerUp === true || r.isRunnerUp === "true"
    let pts = champ ? SCORING.kampioen : runner ? SCORING.finalist
      : r.reachedRound === "Semi final" ? SCORING.halveFinale
      : r.reachedRound === "Quarter final" ? SCORING.kwartFinale
      : r.reachedRound === "Last sixteen" ? SCORING.laatste16
      : 0
    pts += (Number(r.wins) || 0) * SCORING.perGewonnenPartij
    a.score += pts
    a.appearances++
    a.wins += Number(r.wins) || 0
    a.losses += Number(r.losses) || 0
    if (champ) a.titles++
    if (champ || runner) a.finals++
  }
  let board = Object.values(agg)
  // Drempel voor kleine steekproeven; vangnet: nooit tot een lege lijst filteren.
  if (minAppearances > 1) {
    const gefilterd = board.filter((a) => a.appearances >= minAppearances)
    if (gefilterd.length) board = gefilterd
  }
  // Competitief: meeste titels eerst, dan finales, dan diepte (score), dan winst.
  return board.sort(
    (x, y) =>
      y.titles - x.titles || y.finals - x.finals || y.score - x.score || y.wins - x.wins || y.appearances - x.appearances
  )
}

// Matcht spelernamen uit de vraag tegen de players-index. Voorkomt false
// positives op veelvoorkomende voornamen via tokenfrequentie.
function matchPlayers(question, index) {
  const qTokens = new Set(textTokens(question))
  if (qTokens.size === 0) return []
  const qNorm = normalizeText(question)

  // tokenfrequentie over alle namen
  const freq = {}
  const prepared = []
  for (const [pid, name] of Object.entries(index)) {
    const sig = textTokens(name).filter((t) => !NAME_PARTICLES.has(t) && t.length >= 2)
    if (!sig.length) continue
    for (const t of sig) freq[t] = (freq[t] || 0) + 1
    prepared.push({ pid, name, sig })
  }

  const candidates = []
  for (const { pid, name, sig } of prepared) {
    const matched = sig.filter((t) => qTokens.has(t))
    if (!matched.length) continue
    const full = normalizeText(name)
    const fullHit = full.length > 3 && qNorm.includes(full)
    const lastName = sig[sig.length - 1]
    const lastHit = qTokens.has(lastName)
    const uniqueHit = matched.length === 1 && matched[0].length >= 4 && freq[matched[0]] <= 2
    const qualifies =
      fullHit || matched.length >= 2 || (lastHit && lastName.length >= 4) || uniqueHit
    if (!qualifies) continue
    const score = matched.length + (fullHit ? 3 : 0) + (lastHit ? 1 : 0)
    candidates.push({ playerId: pid, name, score })
  }
  if (!candidates.length) return []
  candidates.sort((a, b) => b.score - a.score)
  const max = candidates[0].score
  return candidates.filter((c) => c.score === max).slice(0, 4)
}

function resultLabel(r) {
  const champ = r.isChampion === true || r.isChampion === "true"
  const runner = r.isRunnerUp === true || r.isRunnerUp === "true"
  if (champ) return "1e (winnaar)"
  if (runner) return "2e (finale)"
  if (r.reachedRound) return `tot ${r.reachedRound}`
  return `poule positie ${r.groupPosition}`
}

// --- 14.1 Summer League (straight pool poule-competitie) --------------------
const SUMMER_LEAGUE_ID = 83049058
const SUMMER_LEAGUE_URL = "https://cuescore.com/tournament/Mokum+14.1+Summer+league/83049058"

function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetchUrl(url).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

async function getSummerLeagueContext() {
  const raw = await fetchWithTimeout(`https://api.cuescore.com/tournament/?id=${SUMMER_LEAGUE_ID}`, 5000)
  if (!raw) {
    return `---\nGEEN DATA: de 14.1 Summer League-stand is nu even niet op te halen. Verwijs de gebruiker naar ${SUMMER_LEAGUE_URL}\n---`
  }
  let d
  try { d = JSON.parse(raw) } catch { return null }
  const labels = { "1": "Poule A", "2": "Poule B", "3": "Poule C", "4": "Poule D", "5": "Poule E", "6": "Poule F" }
  const st = d.standings || {}
  const blocks = Object.keys(st).sort().map((k) => {
    const rows = Array.isArray(st[k]) ? st[k] : []
    const lines = rows.map((r) => {
      const nm = r.player && r.player.name ? r.player.name : "?"
      const gesp = r.played || 0, w = r.wins || 0, l = r.losses || 0, pts = r.points || 0
      const avg = typeof r.frameAvg === "number" && r.frameAvg ? `, gem. ${r.frameAvg.toFixed(2)}` : ""
      const hb = r.highBreak ? `, hoogste reeks ${r.highBreak}` : ""
      return `  ${r.position}. ${nm} — ${pts} pt, ${w}-${l} (${gesp} gesp.)${avg}${hb}`
    }).join("\n")
    return `${labels[k] || `Poule ${k}`}:\n${lines || "  (geen spelers)"}`
  }).join("\n\n")
  return (
    `---\n14.1 SUMMER LEAGUE — LIVE DATA van Cuescore.\n` +
    `TOERNOOI-INFO (gebruik dit bij info-vragen zoals "wat is het / wanneer / hoe werkt het"): Mokum Summer 14.1 League — discipline straight pool (14.1), groepsfase met 6 poules (A t/m F). Loopt ${d.displayDate || "16 juni – 31 augustus 2026"}, locatie Mokum, organisatie Max Anholt (league oorspronkelijk van Anthony). Race to: poule A & B naar 100, poule C & D naar 75, poule E & F naar 50. Geen handicap in de poules (uitzondering: Nick geeft 50 punten voorsprong in zijn poule). De top 4 van elke poule gaat door naar een gehandicapte single-KO play-off. Inschrijven/details: ${SUMMER_LEAGUE_URL} .\n` +
    `STAND (toon deze NET ZOALS op Cuescore: per poule A t/m F als aparte lijst, met de "Gegevens bijgewerkt op"-datum van vandaag bovenaan; toon ALLE poules waar naar gevraagd wordt, anders alle zes):\n\n` +
    blocks +
    `\n\nVERPLICHT: sluit ELK antwoord over de Mokum 14.1 Summer League (zowel info- als stand-vragen) AF met de link naar de Cuescore-pagina, exact als markdown: [Bekijk op Cuescore](${SUMMER_LEAGUE_URL})\n` +
    "---"
  )
}

// Foto-catalogus: toon relevante foto's (inline of in apart venster) o.b.v. trigger words
async function getFotoContext(message, sasToken) {
  if (!sasToken) return null
  const raw = await fetchWithTimeout(`https://${STORAGE_ACCOUNT}.blob.core.windows.net/fotos/_catalog.json?${sasToken}`, 3500)
  if (!raw) return null
  let catalog
  try { catalog = JSON.parse(raw) } catch { return null }
  if (!Array.isArray(catalog) || !catalog.length) return null
  const q = normalizeText(message || "")
  const matches = catalog.filter(
    (f) =>
      f && f.actief !== false && Array.isArray(f.triggerWords) &&
      f.triggerWords.some((t) => t && q.includes(normalizeText(String(t))))
  )
  if (!matches.length) return null
  const lines = matches.map((f) => {
    const cap = f.onderschrift || "Bekijk"
    if (f.weergave === "venster") {
      return `- APART VENSTER (grote afbeelding/PDF): voeg ALTIJD deze link/knop toe: [${cap}](${f.url}) en vermeld kort dat het in een nieuw venster opent.`
    }
    return `- INLINE: voeg ALTIJD deze afbeelding toe op een eigen regel, exact als markdown: ![${cap}](${f.url})`
  })
  const text =
    `---\nRELEVANTE FOTO('S) bij deze vraag. Dit is GEEN optie: je MOET de hieronder opgegeven foto('s) in je antwoord opnemen, ` +
    `OOK bij indirecte of brede vragen (bijv. "vertel me over...", "is er een bbq...") en ongeacht hoeveel tekst je verder geeft. ` +
    `Gebruik UITSLUITEND de hier opgegeven URL('s); ken je elders (bijv. in een kennisbron) een andere URL voor hetzelfde onderwerp, NEGEER die en gebruik deze. ` +
    `Verzin zelf NOOIT andere afbeeldings-URL's. Laat de afbeelding/link NOOIT weg als deze sectie aanwezig is.\n` +
    lines.join("\n") +
    "\n---"
  return {
    text,
    fotos: matches.map((f) => ({ url: f.url, weergave: f.weergave, onderschrift: f.onderschrift || "Bekijk" })),
  }
}

// --- Standaardvragen: vast (goedgekeurd) antwoord serveren i.p.v. Claude (issue #33) ---
const STD_CONTAINER = "standaardvragen"
const STD_JACCARD_MIN = 0.72 // drempel voor een "lijkende" (niet exact getypte) vraag
const STD_SHARED_MIN = 3 // minimaal aantal gedeelde woorden voordat we lijkend accepteren

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  if (!a.size || !b.size) return { score: 0, shared: 0 }
  let shared = 0
  for (const tok of a) if (b.has(tok)) shared++
  const union = a.size + b.size - shared
  return { score: union ? shared / union : 0, shared }
}

// Zoekt het best passende opgeslagen antwoord bij de laatste vraag.
// Exacte (genormaliseerde) match wint altijd; anders alleen bij hoge woord-overlap.
async function getStandaardAntwoord(message, sasToken) {
  if (!sasToken || !message) return null
  const raw = await fetchWithTimeout(
    `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STD_CONTAINER}/_index.json?${sasToken}`, 2500)
  if (!raw) return null
  let index
  try { index = JSON.parse(raw) } catch { return null }
  if (!Array.isArray(index) || !index.length) return null

  const qNorm = normalizeText(message)
  const qTokens = textTokens(message)
  let best = null
  for (const e of index) {
    // Alleen goedgekeurde (definitieve) antwoorden cachen; concepten + "altijd live"-vragen
    // (die live data gebruiken, bijv. Cuescore) laat de bot altijd zelf beantwoorden.
    if (!e || e.actief === false || e.altijdLive === true || e.status !== "goedgekeurd") continue
    for (const lang of ["nl", "en"]) {
      const vraag = e.vraag && e.vraag[lang]
      const antwoord = e.antwoord && e.antwoord[lang]
      if (!vraag || !antwoord || !antwoord.trim()) continue
      const vNorm = normalizeText(vraag)
      let score
      if (vNorm && vNorm === qNorm) score = 1
      else {
        const j = jaccard(qTokens, textTokens(vraag))
        if (j.shared < STD_SHARED_MIN || j.score < STD_JACCARD_MIN) continue
        score = j.score
      }
      if (!best || score > best.score) best = { entry: e, lang, antwoord, score }
    }
  }
  return best
}

// Zet gekoppelde foto-bestandsnamen om naar markdown (zelfde weergave als de bot-fallback).
async function fotosVoorAntwoord(bestanden, sasToken) {
  if (!Array.isArray(bestanden) || !bestanden.length || !sasToken) return ""
  const raw = await fetchWithTimeout(
    `https://${STORAGE_ACCOUNT}.blob.core.windows.net/fotos/_catalog.json?${sasToken}`, 2500)
  if (!raw) return ""
  let catalog
  try { catalog = JSON.parse(raw) } catch { return "" }
  if (!Array.isArray(catalog)) return ""
  let out = ""
  for (const bestand of bestanden) {
    const f = catalog.find((c) => c && c.bestand === bestand && c.actief !== false)
    if (!f || !f.url) continue
    const cap = f.onderschrift || "Bekijk"
    out += f.weergave === "venster" ? `\n\n[${cap}](${f.url})` : `\n\n![${cap}](${f.url})`
  }
  return out
}

async function getResultatenContext(messages, sasToken) {
  if (!sasToken) return null
  const lastMsg = messages[messages.length - 1]?.content || ""
  const lower = normalizeText(lastMsg)

  // --- 14.1 Summer League (live van Cuescore) --------------------------------
  if (/14\s*[.,]?\s*1|summer\s*league|summerleague|straight\s*pool|straightpool|\bpoule\s*[a-f]\b/.test(lower)) {
    const slCtx = await getSummerLeagueContext()
    if (slCtx) return slCtx
  }

  // --- KNBB Pool Rating top 20 -----------------------------------------------
  // Expliciet gevraagd, of "ja" na een aanbod om de KNBB top 20 te tonen.
  const prevAssistant =
    [...messages].reverse().find((m) => m.role === "assistant")?.content || ""
  const affirmative = /^(ja|jawel|jazeker|graag|zeker|doe maar|yes|prima|ok|oke|okay|ja graag)\b/.test(
    lower.trim()
  )
  const offeredKnbb = /knbb|top 20/.test(normalizeText(prevAssistant))
  const knbbExplicit = /knbb/.test(lower) || (/rating/.test(lower) && /top|20|hoogste|beste/.test(lower))
  if (knbbExplicit || (affirmative && offeredKnbb)) {
    const ratings = await fetchRatings(sasToken)
    if (!ratings || !Object.keys(ratings).length) {
      return "---\nGEEN DATA: de KNBB-ratings zijn nog niet beschikbaar (worden nog opgehaald). Meld dit eerlijk en verwijs eventueel naar Cuescore.\n---"
    }
    const top = Object.values(ratings)
      .filter((r) => r && r.rating)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)
    const lines = top.map((r, i) => `  ${medalPrefix(i)}${i + 1}. ${r.name} — ${r.rating}`).join("\n")
    return (
      '---\nTOP 20 KNBB POOL RATING (bron Cuescore; gebruik dit om te antwoorden, met 🥇🥈🥉 voor de top 3). ' +
      'Gebruik EXACT deze titel boven de lijst: "Top 20 KNBB Pool Rating — Mokum (toernooi) Spelers".\n\n' +
      lines +
      "\n---"
    )
  }

  // --- Leaderboard-intentie: beste spelers per reeks + periode ---------------
  // Anker op het laatste user-bericht met leaderboard-intentie en verzamel reeks
  // + periode vanaf daar. Zo blijft een verduidelijking over willekeurig veel
  // beurten werken (vraag -> periode -> type -> "allemaal"), zonder ver terug te lekken.
  const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content || "")
  const lbKeywords = [
    "beste speler", "beste spelers", "sterkste speler", "sterkste spelers",
    "top speler", "top spelers", "best presterend", "wie doet het goed",
    "wie doen het goed", "wie presteer", "ranglijst", "wie is de beste",
    "wie zijn de beste", "spelers doen het goed", "goed bezig",
    "meeste titels", "meeste gewonnen", "wie wint het meest",
  ]
  const isLbIntent = (n) =>
    lbKeywords.some((w) => n.includes(w)) ||
    /top\s*\d+\s*speler/.test(n) ||
    /per (toernooisoort|soort|type|reeks)/.test(n)
  let lbAnchor = -1
  for (let i = userTexts.length - 1; i >= 0; i--) {
    if (isLbIntent(normalizeText(userTexts[i]))) {
      lbAnchor = i
      break
    }
  }
  // Alleen behandelen als de intentie recent is (binnen een lopende verduidelijking)
  const leaderboardIntent = lbAnchor !== -1 && lbAnchor >= userTexts.length - 6

  if (leaderboardIntent) {
    const flowText = userTexts.slice(lbAnchor).join(" \n ")
    const flowNorm = normalizeText(flowText)
    const perSeries =
      /per (toernooisoort|soort|type|reeks)|elke (toernooisoort|soort|reeks)|alle soorten|per categorie/.test(flowNorm)
    const series = parseSeries(flowText)
    const discipline = parseDiscipline(flowText)
    // GEEN wedervragen: ontbreekt de periode, dan default 'aller tijden'
    const period = parsePeriod(flowText) || { all: true, label: "aller tijden" }
    const filter = period.all ? null : `date ge '${period.start}' and date le '${period.end}'`
    const rows = await tableQueryPaged("PlayerResults", filter, sasToken)
    // Drempel schaalt met de periode; criteria-uitleg voor de bot (transparantie).
    const minApp = period.all ? MIN_APP_ALLTIME : MIN_APP_PERIODE
    const CRIT = ` Volgorde: meeste titels eerst (dan finales, dan prestatiepunten). Alleen spelers met ≥${minApp} toernooien in deze periode.`

    const MAIN_SERIES = [
      "Fluke Ranking", "Handicap Madness", "Mokum 9ball Ranking", "MEGA Ranking",
      "MEGA Summer Ranking", "8/10ball Zaterdag", "OnePocket Monthly", "9 ball Sunday",
    ]
    const DISCIPLINES_LBL = ["8-Ball", "9-Ball", "10-Ball"]
    const lijnen = (board, metWL) =>
      board
        .map(
          (a, i) =>
            `  ${medalPrefix(i)}${i + 1}. ${a.name} — ${a.titles} titel(s), ${a.finals} finale(s), ${a.appearances} toernooien${metWL ? `, ${a.wins}W-${a.losses}V` : ""}`
        )
        .join("\n")
    const KNBB_OFFER =
      " Sluit AF met de vraag of de gebruiker ook de top 20 op KNBB-rating van Mokum-spelers wil zien."

    // 1) Specifieke reeks of discipline gevraagd -> alleen die ranglijst (top 10)
    const specifiek = series && series !== "all" ? series : perSeries ? null : discipline
    if (specifiek) {
      const board = buildLeaderboard(rows, specifiek, minApp)
      if (!board.length) return `---\nGEEN DATA: geen resultaten voor ${specifiek} in periode ${period.label}.\n---`
      return (
        `---\nBESTE SPELERS (top 10) — ${specifiek} — ${period.label} (🥇🥈🥉 voor de top 3).${CRIT}${KNBB_OFFER}\n\n` +
        lijnen(board.slice(0, 10), true) + "\n---"
      )
    }

    // 2) 'Alle toernooien gecombineerd' expliciet -> overall top 10
    if (series === "all") {
      const board = buildLeaderboard(rows, "all", minApp)
      return (
        `---\nBESTE SPELERS (top 10) — Alle toernooien — ${period.label} (🥇🥈🥉 voor de top 3).${CRIT}${KNBB_OFFER}\n\n` +
        lijnen(board.slice(0, 10), true) + "\n---"
      )
    }

    // 3) Expliciet 'per toernooisoort' -> top 10 per reeks
    if (perSeries) {
      const blocks = MAIN_SERIES.map((s) => {
        const b = buildLeaderboard(rows, s, minApp).slice(0, 10)
        return b.length ? `${s}:\n${lijnen(b)}` : `${s}: (geen resultaten)`
      }).join("\n\n")
      return `---\nTOP 10 SPELERS PER TOERNOOISOORT — ${period.label}. Toon ELKE hieronder opgegeven reeks die resultaten heeft, met een kopje per reeks; laat GEEN reeks-met-resultaten weg (sla alleen reeksen met "(geen resultaten)" over). 🥇🥈🥉 voor de top 3.${CRIT}${KNBB_OFFER}\n\n${blocks}\n---`
    }

    // 4) Algemeen ('wie zijn de beste spelers?') -> VOLLEDIG overzicht, geen wedervragen
    const perSoort = MAIN_SERIES.map((s) => {
      const b = buildLeaderboard(rows, s, minApp).slice(0, 3)
      return b.length ? `${s}:\n${lijnen(b)}` : `${s}: (geen resultaten)`
    }).join("\n\n")
    const perDisc = DISCIPLINES_LBL.map((d) => {
      const b = buildLeaderboard(rows, d, minApp).slice(0, 3)
      return b.length ? `${d}:\n${lijnen(b)}` : `${d}: (geen resultaten)`
    }).join("\n\n")
    const overall = buildLeaderboard(rows, "all", minApp).slice(0, 5)
    return (
      `---\nINSTRUCTIE (VERPLICHT): De gebruiker heeft GEVRAAGD wie de beste spelers zijn. Hieronder staat het complete antwoord met ECHTE data. ` +
      `Toon deze drie ranglijsten NU direct, letterlijk en volledig in je antwoord, met nette opmaak (een kopje per deel, 🥇🥈🥉 voor de top 3). ` +
      `Verboden: een keuzemenu tonen, vragen "wat wil je zien?", of één van de delen weglaten. De gebruiker heeft het al gevraagd — geef gewoon het overzicht. ` +
      `Eindig met precies één korte ja/nee-vraag: of de gebruiker ook de top 20 op KNBB-rating van Mokum-spelers wil zien.\n\n` +
      `== DEEL 1 — OVERALL TOP 5 (alle toernooien) ==\n${lijnen(overall, true)}\n\n` +
      `== DEEL 2 — TOP 3 PER TOERNOOISOORT (toon ELKE reeks hieronder die resultaten heeft) ==\n${perSoort}\n\n` +
      `== DEEL 3 — TOP 3 PER SPELSOORT / DISCIPLINE (8-ball, 9-ball, 10-ball) ==\n${perDisc}\n---`
    )
  }

  const winnerWords = ["winnaar", "won", "gewonnen", "kampioen", "champion", "winner"]
  const asksWinner = winnerWords.some((w) => lower.includes(w))

  const index = await fetchPlayersIndex(sasToken)
  if (!index) return null
  const players = matchPlayers(lastMsg, index)
  if (!players.length && !asksWinner) return null

  let ctx = ""

  if (players.length) {
    const parts = []
    for (const p of players.slice(0, 3)) {
      const rows = await tableQuery("PlayerResults", `PartitionKey eq '${p.playerId}'`, sasToken)
      if (!rows.length) continue
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      const titels = rows.filter((r) => r.isChampion === true || r.isChampion === "true").length
      const recent = rows
        .slice(0, 8)
        .map(
          (r) =>
            `  - ${r.date} | ${r.tournamentName} (${r.discipline}): ${resultLabel(r)}, ${r.wins}W-${r.losses}V`
        )
        .join("\n")
      parts.push(
        `Speler: ${p.name}\nTotaal toernooien (afgerond): ${rows.length}, toernooizeges: ${titels}\nRecente resultaten:\n${recent}`
      )
    }
    if (parts.length) ctx += "SPELER-RESULTATEN:\n\n" + parts.join("\n\n")
  }

  if (asksWinner && !players.length) {
    const disc = parseDiscipline(lastMsg) // "8-Ball" / "9-Ball" / "10-Ball" of null
    const tours = await tableQuery("Tournaments", null, sasToken)
    tours.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    // Vroeg een specifieke discipline? Filter daarop (op discipline-veld óf naam) zodat
    // "laatste 8-ball toernooi" ook klopt als het buiten de recentste 12 zou vallen.
    const pool = disc ? tours.filter((t) => disciplineMatch(t.discipline, disc) || disciplineMatch(t.name, disc)) : tours
    const recent = pool
      .slice(0, 12)
      .map((t) => `  - ${t.date} | ${t.name} (${t.discipline}): winnaar ${t.winnerName || "?"}`)
      .join("\n")
    if (recent) {
      const kop = disc
        ? `RECENTE ${disc.toUpperCase()}-TOERNOOI-WINNAARS (nieuwste eerst; de bovenste is het meest recente ${disc}-toernooi):`
        : "RECENTE TOERNOOI-WINNAARS (nieuwste eerst):"
      ctx += (ctx ? "\n\n" : "") + kop + "\n" + recent
    }
  }

  if (!ctx) return null
  return (
    "---\nTOERNOOI-RESULTATEN DATA (gebruik dit om vragen over eerdere toernooien en spelersprestaties te beantwoorden; " +
    "matchen meerdere spelers, noem ze of vraag om de achternaam):\n\n" +
    ctx +
    "\n---"
  )
}

// Export t.b.v. lokale tests (geen effect op de host)
module.exports = { matchPlayers, normalizeText, parseSeries, parsePeriod, classifySeries, buildLeaderboard }

const { app } = require("@azure/functions")

// ── Server-side misbruik-/kostenbescherming voor /api/chat (#67) ──────────────
// De client-side rem in widget.js is triviaal te omzeilen door de API direct aan
// te roepen. Twee lagen begrenzen dat server-side:
//   1) input-cap: lengte per bericht + aantal berichten (chatSanitizeMessages)
//   2) rate limit per IP: in-memory sliding window. Houdt casual misbruik tegen;
//      per worker-instance (Flex Consumption kan schalen) — robuuster zou een
//      Table Storage-teller zijn. CORS-beperking tot bekende origins volgt in #72.
const CHAT_MAX_CONTENT_LEN = 2000          // tekens per bericht
const CHAT_MAX_MESSAGES = 20               // laatste N berichten (≈10 vraag/antwoord-paren)
const CHAT_RATE_MAX = 30                   // max requests ...
const CHAT_RATE_WINDOW_MS = 5 * 60 * 1000  // ... per 5 minuten per IP
const chatRateHits = new Map()             // ipHash -> [timestamps]

function chatClientIpHash(request) {
  const xff = request.headers.get("x-forwarded-for") || ""
  let ip = xff.split(",")[0].trim()
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/) // Azure hangt vaak :poort aan
  if (v4) ip = v4[1]
  return crypto.createHash("sha256").update(ip || "onbekend").digest("hex").slice(0, 16)
}

// Registreert deze hit en geeft true zodra het IP over de limiet zit.
function chatRateLimited(ipHash) {
  const now = Date.now()
  const hits = (chatRateHits.get(ipHash) || []).filter((t) => now - t < CHAT_RATE_WINDOW_MS)
  hits.push(now)
  chatRateHits.set(ipHash, hits)
  if (chatRateHits.size > 5000) { // opruimen zodat de Map niet blijft groeien
    for (const [k, v] of chatRateHits) {
      if (!v.length || now - v[v.length - 1] > CHAT_RATE_WINDOW_MS) chatRateHits.delete(k)
    }
  }
  return hits.length > CHAT_RATE_MAX
}

// Begrenst de messages-array: alleen geldige user/assistant-berichten, laatste N,
// content afgekapt op CHAT_MAX_CONTENT_LEN. Beschermt token-kosten en opslag.
function chatSanitizeMessages(messages) {
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-CHAT_MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, CHAT_MAX_CONTENT_LEN) }))
}

// Leest alle text-blocks uit een Claude-respons robuust uit (#72). Voorkomt een crash of
// vervuilde output als het eerste content-block geen tekst is (bv. een leeg block of tool_use):
// filtert op text-blocks en plakt ze aan elkaar i.p.v. blind content[0].text te pakken.
app.http("chat", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders }
    }
    // Rate limit per IP vóór al het werk (#67) — weigert misbruik snel en goedkoop.
    const ipHash = chatClientIpHash(request)
    if (chatRateLimited(ipHash)) {
      context.log(`Rate limit bereikt voor ${ipHash}`)
      return {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        body: JSON.stringify({ error: "rate_limited", reply: "Rustig aan 😅 Je stuurt te veel vragen achter elkaar. Wacht even en probeer het dan opnieuw." }),
      }
    }
    try {
      const body = await request.json()
      let { messages } = body
      if (!messages || !Array.isArray(messages)) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "messages array required" }),
        }
      }
      // Server-side input-cap (#67): begrens aantal berichten + lengte per bericht.
      messages = chatSanitizeMessages(messages)
      if (!messages.length) {
        return {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "geen geldige berichten" }),
        }
      }
      // '#test'-prefix: markeer dit gesprek als testvraag (voor het dashboard) en
      // verwerk de ECHTE vraag (zonder prefix) zodat de bot normaal antwoordt.
      let isTest = false
      for (const m of messages) {
        if (m && m.role === "user" && typeof m.content === "string" && /^\s*#test\b/i.test(m.content)) {
          isTest = true
          m.content = m.content.replace(/^\s*#test\b[:\s-]*/i, "").trim()
        }
      }
      const lastMessage = messages[messages.length - 1]?.content || ""
      const lastMessageLower = lastMessage.toLowerCase()
      const isTournamentQuery =
        lastMessageLower.includes("toernooi") ||
        lastMessageLower.includes("tournament") ||
        lastMessageLower.includes("wanneer") ||
        lastMessageLower.includes("inschrijv") ||
        lastMessageLower.includes("ranking") ||
        lastMessageLower.includes("wedstrijd") ||
        lastMessageLower.includes("speeldag")
      const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN
      // Standaardvraag met een vast, goedgekeurd antwoord? Serveer dat direct —
      // geen Claude-call (sneller + gratis). Faalt open bij twijfel/fouten.
      try {
        const std = await getStandaardAntwoord(lastMessage, sasToken)
        if (std) {
          let reply = std.antwoord + (await fotosVoorAntwoord(std.entry.fotos, sasToken))
          const conversationId = await saveConversation(messages, reply, isTest)
          console.log(`Standaardantwoord geserveerd (${std.entry.id}, ${std.lang}, score ${std.score.toFixed(2)})`)
          return {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ reply, conversationId, standaard: true }),
          }
        }
      } catch (err) {
        console.log("Standaardvraag-check mislukt:", err.message)
      }
      let kennisbronContext = null
      try {
        kennisbronContext = await getKennisbronContext(messages, sasToken)
        if (kennisbronContext) console.log("Kennisbron context toegevoegd aan prompt")
      } catch (err) {
        console.log("Kennisbron ophalen mislukt:", err.message)
      }
      let tournamentContext = null
      if (isTournamentQuery) {
        tournamentContext = await getTournamentContext()
        console.log("Toernooi context toegevoegd")
      }
      let resultatenContext = null
      try {
        resultatenContext = await getResultatenContext(messages, sasToken)
        if (resultatenContext) console.log("Resultaten-context toegevoegd")
      } catch (err) {
        console.log("Resultaten ophalen mislukt:", err.message)
      }
      let fotoContext = null
      try {
        fotoContext = await getFotoContext(messages[messages.length - 1]?.content || "", sasToken)
        if (fotoContext) console.log("Foto-context toegevoegd")
      } catch (err) {
        console.log("Foto ophalen mislukt:", err.message)
      }
      // Statische system prompt apart houden zodat hij gecachet kan worden;
      // wisselende context (kennisbron, toernooidata) komt ná de cache-breakpoint.
      const dynamicParts = []
      // Datum-bewustzijn: zodat de bot "vandaag/gisteren/deze week" snapt
      const vandaagStr = new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(new Date())
      dynamicParts.push(
        `HUIDIGE DATUM: vandaag is ${vandaagStr} (Amsterdam-tijd). Gebruik dit om vragen over "vandaag", "gisteren", "morgen", "deze week", "afgelopen weekend" enzovoort correct te beantwoorden — "gisteren" is de dag ervoor, enzovoort. Bij vragen over uitslagen van een relatieve dag (bijv. "wie won gisteren?"): bepaal zelf de exacte datum en zoek die in de meegegeven toernooi-/winnaarsdata. LET OP bij het vergelijken van datums: reken zorgvuldig met zowel de maand als de dag. Een datum die later in het jaar valt dan vandaag is TOEKOMST (nog niet geweest); een datum die eerder valt is VERLEDEN. Voorbeeld: als vandaag 28 juni is, dan is 5 juli nog NIET geweest (dat is over ruim een week). Noem een aankomend evenement dus nooit "al voorbij". WERKWOORDSTIJD: schrijf over een evenement dat nog moet komen ALTIJD in de toekomende/aankomende tijd ("het toernooi komt eraan op 5 juli", "staat gepland", "wordt", "we maken er een topdag van") en NOOIT in verleden tijd ("dat was een topdag", "maakte er een topdag van", "het was geweldig") — OOK NIET als een kennisbron of flyer toevallig in verleden tijd geschreven is. Bepaal de tijd op basis van VANDAAG versus de evenementdatum, niet op de woorden van de bron. (Na afloop van het evenement mag je uiteraard wél verleden tijd gebruiken.)`
      )
      if (kennisbronContext) dynamicParts.push(kennisbronContext)
      if (tournamentContext) dynamicParts.push(tournamentContext)
      if (resultatenContext) dynamicParts.push(resultatenContext)
      if (fotoContext) dynamicParts.push(fotoContext.text)
      const systemBlocks = [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ]
      if (dynamicParts.length) systemBlocks.push({ type: "text", text: dynamicParts.join("\n\n") })
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2200,
        system: systemBlocks,
        messages: messages,
      })
      let reply = leesClaudeTekst(response)
      // Vangnet: matchte er een relevante foto maar liet de bot 'm weg? Voeg 'm alsnog toe.
      if (fotoContext && Array.isArray(fotoContext.fotos)) {
        for (const f of fotoContext.fotos) {
          if (!f.url || reply.includes(f.url)) continue
          const cap = f.onderschrift || "Bekijk"
          reply += f.weergave === "venster" ? `\n\n[${cap}](${f.url})` : `\n\n![${cap}](${f.url})`
        }
      }
      const conversationId = await saveConversation(messages, reply, isTest)
      return {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reply, conversationId }),
      }
    } catch (error) {
      context.log("Error:", error)
      return {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      }
    }
  },
})

