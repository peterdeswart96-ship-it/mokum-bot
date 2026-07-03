// Mokum-widget loader.
// GitHub Pages serveert alles met een vaste cache van 10 min (max-age=600) en laat
// geen eigen cache-headers toe. Daardoor zagen bezoekers/testers soms tot 10 min een
// oude widget.js. Deze loader lost dat op: hij laadt widget.js met een cache-buster die
// elke minuut verandert, zodat een nieuwe deploy binnen ~1 minuut zichtbaar is.
//
// De loader zélf mag gerust gecachet worden — hij verandert nooit en berekent de
// versie bij het uitvoeren in de browser.
//
// Plaats op de site (vervangt de oude widget.js-regel):
//   <script src="https://mokum-bot.pdscloud.nl/loader.js" async defer></script>
(function () {
  if (window.__mokumLoaderRan) return
  window.__mokumLoaderRan = true
  var v = Math.floor(Date.now() / 60000) // wijzigt elke minuut
  // data-client van de embed-tag doorgeven aan widget.js (multi-tenant, #76)
  var client = (document.currentScript && document.currentScript.getAttribute('data-client')) || ''
  var s = document.createElement('script')
  s.src = 'https://mokum-bot.pdscloud.nl/widget.js?v=' + v + (client ? '&client=' + encodeURIComponent(client) : '')
  s.async = true
  s.defer = true
  document.body.appendChild(s)
})()
