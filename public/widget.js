(function () {
  'use strict'

  if (window.__mokumWidgetLoaded) return
  window.__mokumWidgetLoaded = true

  const API_URL = 'https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net'
  const DEFAULT_LANG = 'nl'

  // Testmodus: aan/uit via ?mokumtest=1 / ?mokumtest=0 (blijft bewaard per browser).
  // Staat 'ie aan, dan wordt elke vraag van dit apparaat als testvraag opgeslagen (#test-prefix).
  try {
    const tp = new URLSearchParams(window.location.search).get('mokumtest')
    if (tp === '1') localStorage.setItem('mokum-testmode', '1')
    else if (tp === '0') localStorage.removeItem('mokum-testmode')
  } catch (e) {}
  function testModusAan() { try { return localStorage.getItem('mokum-testmode') === '1' } catch (e) { return false } }
  const INTERN_HASH = '3bed2cb3a3acf7b6a8ef408420cc682d5520e26976d354254f528c965612054f'

  const C = {
    red: '#cc0000', redDark: '#990000', black: '#0a0a0a',
    blackCard: '#161616', blackInput: '#1f1f1f',
    border: '#2a2a2a', white: '#ffffff', gray: '#888888',
    anthracite: '#26262b',
  }

 let WIDGET_CONFIG = { bottom: '24px', right: '24px', width: '440px' } // right=24 lijnt de 8-bal-launcher horizontaal uit met de WhatsApp-knop; bottom=24 → gelijke marge rechts/onder
  let LAUNCHER_SCALE = 1.5 // 8-bal + tekstballon samen 50% groter (verankerd rechtsonder, zie floatWrap)

  // Rate-limit: max aantal vragen binnen een tijdvenster (anti-spam)
  const RATE_MAX = 2
  const RATE_WINDOW = 30000 // 30 seconden
  // Herhaalde identieke vraag: vanaf de 2e herhaling (3e keer) binnen het venster -> Easy tiger
  const DUP_MAX = 2
  const DUP_WINDOW = 60000 // 60 seconden

  // ── Config-bron (#75) ─────────────────────────────────────────────────────
  // Eén bestand is de bron voor alle teksten/topics/vragen/bubble/positie:
  // public/configs/default.json. widget.js fetcht dat at runtime (loadConfig);
  // de React-build importeert hetzelfde bestand at build-time (src/config/*).
  // FALLBACK is een minimaal vangnet: faalt de fetch, dan opent de 8-bal nog
  // steeds en werkt vrij typen/versturen — alleen zonder topic-chips.
  const SELF_EL = document.currentScript
  const SELF_SRC = (SELF_EL && SELF_EL.src) || ''
  // Client-id (#76): uit het data-client-attribuut op de eigen <script>, of de ?client= queryparam
  // die loader.js doorgeeft. Gesanitized ([a-z0-9-]) zodat 'ie veilig in de config-URL past.
  function resolveClient() {
    let c = ''
    try { c = (SELF_EL && SELF_EL.getAttribute('data-client')) || '' } catch (e) {}
    if (!c) { try { c = new URL(SELF_SRC).searchParams.get('client') || '' } catch (e) {} }
    return /^[a-z0-9-]{1,40}$/.test(c) ? c : ''
  }
  const CLIENT = resolveClient()
  // Preview-modus (Widget Customizer, #77): de dashboard-preview zet window.__MOKUM_PREVIEW__
  // vóór het laden van widget.js. Dan NIET fetchen en geen /api-calls, maar wachten op de
  // (nog niet opgeslagen) config van de parent via postMessage. Het productiepad — en dus de
  // live embed op de klantsite — blijft volledig onaangeroerd (PREVIEW is daar altijd false).
  const PREVIEW = (function () { try { return !!window.__MOKUM_PREVIEW__ } catch (e) { return false } })()
  const FALLBACK = {
    nl: { welcome: 'Hey! Ik ben de Mokum Magic 8 Ball 🎱 Waar kan ik je mee helpen?', typing: 'Aan het typen...', placeholder: 'Stel een vraag...', error: 'Oeps, er ging iets mis. Probeer het nog eens! 🎱', duplicateMsg: 'Die vraag heb je net al gesteld 🙂 Probeer gerust iets anders te vragen!', rateLimitMsg: 'Rustig aan! 😅 Je stelt veel vragen achter elkaar. Wacht nog even ({s}s) en probeer het dan opnieuw.', backToTopics: '← Terug naar onderwerpen', backButton: '← Terug', askOther: '✏️ Ik wil een andere vraag stellen', examplesBtn: 'Voorbeeldvragen per rubriek', topics: [], questions: {}, catTitles: {}, spelregelsDisciplines: [], spelregelsQuestions: {}, hoverInfo: [] },
    en: { welcome: "Hey! I'm the Mokum Magic 8 Ball 🎱 What can I help you with?", typing: 'Typing...', placeholder: 'Ask a question...', error: 'Oops, something went wrong. Please try again! 🎱', duplicateMsg: 'You just asked that one 🙂 Feel free to ask something else!', rateLimitMsg: "Easy tiger! 🐯😅 You're asking a lot of questions quickly. Please wait a moment ({s}s) and try again.", backToTopics: '← Back to topics', backButton: '← Back', askOther: '✏️ I want to ask a different question', examplesBtn: 'Example questions per category', topics: [], questions: {}, catTitles: {}, spelregelsDisciplines: [], spelregelsQuestions: {}, hoverInfo: [] },
  }
  // Muteerbaar — starten op FALLBACK, worden vervangen zodra default.json geladen is.
  let TRANSLATIONS = FALLBACK
  let BUBBLE_TEXTS = ['Ask me anything!'] // >=1 i.v.m. modulo in de bubbel-rotatie
  let BUBBLE_ENABLED = true               // tekstballon aan/uit (#80)
  let BUBBLE_INTERVAL = 15                // rotatie-interval in seconden (#80)
  let CATEGORIES = []

  function configOrigin() {
    try { if (SELF_SRC) return new URL(SELF_SRC).origin } catch (e) {}
    return 'https://mokum-bot.pdscloud.nl'
  }
  // Cache-buster (per minuut) spiegelt loader.js zodat config-wijzigingen ~1 min doorkomen.
  function configUrl(naam) { return configOrigin() + '/configs/' + naam + '.json?v=' + Math.floor(Date.now() / 60000) }

  async function fetchConfig(naam) {
    const r = await fetch(configUrl(naam), { cache: 'no-store' })
    if (!r.ok) throw new Error('http ' + r.status)
    const cfg = await r.json()
    if (!cfg || !cfg.texts || !cfg.texts.nl || !cfg.texts.en) throw new Error('ongeldige config')
    return cfg
  }

  function applyConfig(cfg) {
    TRANSLATIONS = { nl: cfg.texts.nl, en: cfg.texts.en }
    if (cfg.bubble) {
      if (typeof cfg.bubble.enabled === 'boolean') BUBBLE_ENABLED = cfg.bubble.enabled
      if (typeof cfg.bubble.intervalSeconds === 'number' && cfg.bubble.intervalSeconds > 0) BUBBLE_INTERVAL = cfg.bubble.intervalSeconds
      // Lege lijst = bubble uit (#80): expliciet leegmaken, niet de oude teksten houden.
      if (Array.isArray(cfg.bubble.texts)) BUBBLE_TEXTS = cfg.bubble.texts.length ? cfg.bubble.texts : []
    }
    CATEGORIES = Array.isArray(cfg.categories) ? cfg.categories : []
    if (cfg.position) {
      WIDGET_CONFIG = { bottom: cfg.position.offsetY + 'px', right: cfg.position.offsetX + 'px', width: cfg.position.width }
      if (typeof cfg.position.launcherScale === 'number') LAUNCHER_SCALE = cfg.position.launcherScale
    }
    startBubbleTimer() // interval/aan-uit direct laten ingaan (ook live in preview)
  }
  // Tekstballon zichtbaar? Alleen als 'ie aanstaat én er teksten zijn (#80).
  function bubbleActief() { return BUBBLE_ENABLED && BUBBLE_TEXTS.length > 0 }

  async function loadConfig() {
    // 1) Client-config (indien opgegeven) — één poging; faalt 'ie (bv. 404), stil door naar default (#76).
    if (CLIENT) {
      try { applyConfig(await fetchConfig(CLIENT)); return true } catch (e) {}
    }
    // 2) default.json — kritieke fallback, met 1 retry voor tijdelijke hikken.
    for (let poging = 0; poging < 2; poging++) {
      try { applyConfig(await fetchConfig('default')); return true }
      catch (e) {
        if (poging === 0) await new Promise((res) => setTimeout(res, 1500))
        else console.log('Mokum-widget: config laden mislukt, fallback actief —', e.message)
      }
    }
    return false
  }

  let state = {
    open: false,
    lang: DEFAULT_LANG,
    stage: 'topics',
    messages: [],
    input: '',
    loading: false,
    selectedTopic: null,
    selectedDiscipline: null,
    internUnlocked: false,
    internPwd: '',
    internPwdError: false,
    bubbleTextIndex: 0,
    size: 'middel',
    examplesOpen: false,
    sendTimes: [],
    lastSentQuestion: '',
    dupTimes: [],
    conversationId: null,
    callback: { naam: '', telefoon: '', onderwerp: '', voorkeurstijd: '' },
    callbackError: '',
    callbackSent: false,
  }

  function tr() { return TRANSLATIONS[state.lang] }

  function getWidth() {
    const mobile = window.innerWidth < 480
    if (mobile) return (window.innerWidth - 12) + 'px'
    if (state.size === 'groot') return 'calc(100vw - 32px)' // MAX: vrijwel het hele scherm
    if (state.size === 'klein') return '380px'
    return '460px' // middel
  }

  function getHeight() {
    const mobile = window.innerWidth < 480
    // Mobiel: zo schermvullend mogelijk. Dit is de basiswaarde; fitMobileWindow()
    // verfijnt hoogte/bottom via de visualViewport API zodra het toetsenbord opent.
    if (mobile) return 'calc(100dvh - 16px)'
    if (state.size === 'groot') return 'calc(100dvh - 20px)' // MAX: heel scherm (12px bottom + 8px top)
    const cap = state.size === 'klein' ? 520 : 660
    return `min(${cap}px, calc(100dvh - 90px - 80px - 16px))`
  }

  function getBottom() {
    // Open venster zit laag (overlapt o.a. de WhatsApp-knop rechtsonder) en gebruikt de ruimte optimaal.
    return window.innerWidth < 480 ? '8px' : '12px'
  }

  function getRight() {
    return window.innerWidth < 480 ? '6px' : WIDGET_CONFIG.right
  }

  // Houdt het mobiele paneel binnen het zichtbare deel van het scherm en tilt het
  // boven het toetsenbord (visualViewport krimpt wanneer het toetsenbord opent).
  function fitMobileWindow() {
    if (!state.open || window.innerWidth >= 480) return
    const win = shadow && shadow.getElementById('mokum-chat-window')
    if (!win) return
    const vv = window.visualViewport
    if (!vv) return
    const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    win.style.height = (vv.height - 16) + 'px'
    win.style.bottom = (keyboardInset + 8) + 'px'
  }

  let shadow = null // Shadow DOM-root — schermt de widget af van pagina-CSS (thema-stijlen lekten anders in en bliezen de afmetingen op)

  function injectStyles() {
    if (shadow.getElementById('mokum-widget-styles')) return
    const style = document.createElement('style')
    style.id = 'mokum-widget-styles'
    style.textContent = `
      #mokum-widget-root { line-height: normal; color: #fff; }
      #mokum-widget-root * { box-sizing: border-box; font-family: Arial, sans-serif; }
      #mokum-widget-root button, #mokum-widget-root input, #mokum-widget-root select, #mokum-widget-root textarea { font-family: inherit; line-height: normal; margin: 0; }
      #mokum-widget-root button { cursor: pointer; }
      #mokum-widget-root input:focus { outline: none; }
      #mokum-widget-root a { color: #ff6b6b; text-decoration: underline; }
      @keyframes mokumBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-18px); } 60% { transform: translateY(-10px); } }
      @keyframes mokumIdle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      .mokum-bounce { animation: mokumBounce 1.2s ease-in-out 3, mokumIdle 3s ease-in-out 3.6s infinite; }
      .mokum-chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
      .mokum-chat-body::-webkit-scrollbar { width: 4px; }
      .mokum-chat-body::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      .mokum-msg-bot { max-width: 85%; padding: 6px; border-radius: 12px 12px 12px 2px; font-size: 14px; line-height: 1.55; background: #2d2d2d; color: #fff; border: none; }
      .mokum-msg-bot p { margin: 0 0 6px 0; }
      .mokum-msg-bot > *:last-child { margin-bottom: 0 !important; }
      .mokum-msg-bot strong { color: #fff; font-weight: 700; }
      .mokum-msg-bot ul, .mokum-msg-bot ol { margin: 4px 0; padding-left: 16px; }
      .mokum-msg-bot li { margin: 2px 0; line-height: 1.6; }
      .mokum-msg-user { max-width: 85%; padding: 6px; border-radius: 12px 12px 2px 12px; font-size: 14px; line-height: 1.55; background: #cc0000; color: #fff; }
      .mokum-chip { font-size: 13px; font-weight: 400 !important; padding: 8px 14px; border-radius: 20px; background: transparent; color: #fff; border: 1px solid #2a2a2a; transition: all 0.15s ease; text-align: left; line-height: 1.4; display: block; width: 100%; }
      .mokum-chip:hover { background: #2a2a2a; border-color: #444; }
      .mokum-chip-accent { background: #cc0000; border: none; }
      .mokum-chip-accent:hover { background: #990000; }
      .mokum-chip-inline { width: auto !important; display: inline-block !important; }
      .mokum-back-btn { background: none; border: none; color: #888; font-size: 12px; padding: 4px 0; text-align: left; cursor: pointer; }
      .mokum-carousel { position: relative; margin: 6px 0; display: inline-block; max-width: 100%; }
      .mokum-carousel .mokum-slide { margin: 0 !important; display: block; }
      .mokum-carousel-btn { position: absolute; right: 8px; bottom: 12px; background: rgba(0,0,0,0.72); color: #fff; border: 1px solid rgba(255,255,255,0.28); border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; line-height: 1; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
      .mokum-carousel-btn:hover { background: rgba(0,0,0,0.9); }
    `
    shadow.appendChild(style)
  }

  function eightBallSVG(size, animate) {
    return `<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="${animate ? 'mokum-bounce' : ''}">
      <defs>
        <radialGradient id="mw-ballGrad" cx="38%" cy="32%" r="62%"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="40%" stop-color="#111"/><stop offset="100%" stop-color="#0a0a0a"/></radialGradient>
        <radialGradient id="mw-circleGrad" cx="42%" cy="38%" r="58%"><stop offset="0%" stop-color="#fff"/><stop offset="70%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#ccc"/></radialGradient>
        <radialGradient id="mw-hatGrad" cx="38%" cy="20%" r="70%"><stop offset="0%" stop-color="#2e2e2e"/><stop offset="50%" stop-color="#141414"/><stop offset="100%" stop-color="#0a0a0a"/></radialGradient>
        <radialGradient id="mw-brimGrad" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#222"/><stop offset="100%" stop-color="#0a0a0a"/></radialGradient>
        <radialGradient id="mw-shineGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.16"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="100" cy="140" r="68" fill="url(#mw-ballGrad)"/>
      <ellipse cx="80" cy="118" rx="19" ry="12" fill="url(#mw-shineGrad)" transform="rotate(-20,80,118)"/>
      <circle cx="100" cy="144" r="24" fill="url(#mw-circleGrad)"/>
      <text x="100" y="153" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#0a0a0a">8</text>
      <circle cx="100" cy="140" r="68" fill="none" stroke="#2a2a2a" stroke-width="0.8"/>
      <ellipse cx="100" cy="76" rx="54" ry="10" fill="url(#mw-brimGrad)"/>
      <ellipse cx="100" cy="76" rx="54" ry="10" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.25"/>
      <rect x="60" y="6" width="80" height="71" rx="3" fill="url(#mw-hatGrad)"/>
      <ellipse cx="100" cy="6" rx="40" ry="6.5" fill="#181818"/>
      <rect x="60" y="6" width="80" height="71" rx="3" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.25"/>
      <g transform="translate(100,41) scale(0.56) translate(-100,-38)">
        <circle cx="100" cy="38" r="28" fill="#0a0a0a"/>
        <circle cx="100" cy="38" r="28" fill="none" stroke="#fff" stroke-width="2.2"/>
        <g transform="translate(91,27)"><line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/></g>
        <g transform="translate(109,27)"><line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/></g>
        <g transform="translate(100,37)"><line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/></g>
        <text x="100" y="52" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="8" font-weight="900" fill="#fff" letter-spacing="1.5">MOKUM</text>
      </g>
    </svg>`
  }

  function flagNLSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6" width="18" height="12"><rect width="9" height="2" y="0" fill="#AE1C28"/><rect width="9" height="2" y="2" fill="#FFFFFF"/><rect width="9" height="2" y="4" fill="#21468B"/></svg>`
  }

  function flagGBSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="18" height="12"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>`
  }

  function formatBotMessage(text) {
    const lines = text.split('\n')
    let html = ''
    let inList = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;">'; inList = true }
        html += `<li style="margin:2px 0;line-height:1.6;">${applyInline(trimmed.substring(2))}</li>`
      } else {
        if (inList) { html += '</ul>'; inList = false }
        if (trimmed === '') { html += '<br>' }
        else if (trimmed.match(/^#{1,3} /)) { html += `<p style="margin:0 0 6px 0;"><strong>${applyInline(trimmed.replace(/^#+\s/, ''))}</strong></p>` }
        else { html += `<p style="margin:0 0 6px 0;">${applyInline(trimmed)}</p>` }
      }
    }
    if (inList) html += '</ul>'
    return html
  }

  function applyInline(text) {
    return text
      // Afbeeldingen EERST (anders pakt de link-regex het [..](..)-deel) — klikbaar naar apart venster
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" style="max-width:100%;max-height:300px;border-radius:8px;margin:6px 0;display:block;cursor:zoom-in;" loading="lazy"></a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700;">$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#ff6b6b;text-decoration:underline;">$1</a>')
  }

  // Meerdere foto's in één antwoord → toon er één + een 'meer/more'-knop rechtsonder om te bladeren
  function enhanceCarousel(bubble) {
    const anchors = Array.from(bubble.querySelectorAll('a')).filter(a => a.children.length === 1 && a.children[0].tagName === 'IMG')
    if (anchors.length < 2) return
    const firstWrap = anchors[0].closest('p') || anchors[0]
    const car = document.createElement('div')
    car.className = 'mokum-carousel'
    firstWrap.parentNode.insertBefore(car, firstWrap)
    anchors.forEach((a, i) => { a.classList.add('mokum-slide'); a.style.display = i === 0 ? 'block' : 'none'; car.appendChild(a) })
    // ruim lege paragrafen op die overbleven na het verplaatsen
    Array.from(bubble.querySelectorAll('p')).forEach(p => { if (!p.textContent.trim() && !p.querySelector('img')) p.remove() })
    const total = anchors.length
    let idx = 0
    const moreTxt = (state.lang === 'en') ? 'more' : 'meer'
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'mokum-carousel-btn'
    const lab = () => { b.innerHTML = `${moreTxt} ${idx + 1}/${total} ›` }
    lab()
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); anchors[idx].style.display = 'none'; idx = (idx + 1) % total; anchors[idx].style.display = 'block'; lab() }
    car.appendChild(b)
  }

  function el(tag, style, html, attrs) {
    const e = document.createElement(tag)
    if (style) e.style.cssText = style
    if (html !== undefined) e.innerHTML = html
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v
      else if (k === 'type') e.type = v
      else if (k === 'placeholder') e.placeholder = v
      else if (k === 'title') e.title = v
      else e.setAttribute(k, v)
    })
    return e
  }

  function btn(label, onClick, extraStyle, extraClass) {
    const b = document.createElement('button')
    b.innerHTML = label
    b.onclick = onClick
    if (extraStyle) b.style.cssText = extraStyle
    if (extraClass) b.className = extraClass
    return b
  }

  function chip(label, onClick, accent, inline) {
    const cls = 'mokum-chip' + (accent ? ' mokum-chip-accent' : '') + (inline ? ' mokum-chip-inline' : '')
    return btn(label, onClick, null, cls)
  }

  function render() {
    const root = shadow && shadow.getElementById('mokum-widget-root')
    if (!root) return
    root.innerHTML = ''

    const t = tr()
    const w = getWidth()
    const r = getRight()
    const isMobile = window.innerWidth < 480
    const chatHeight = getHeight()

    if (state.open) {
      const win = el('div', `position:fixed;bottom:${getBottom()};right:${r};width:${w};height:${chatHeight};border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.8),0 0 0 1px #2a2a2a;display:flex;flex-direction:column;background:${C.black};transition:width 0.3s ease,height 0.3s ease;z-index:2147483000;`, undefined, { id: 'mokum-chat-window' })

      // Header
      const hdr = el('div', `background:${C.blackCard};border-bottom:1px solid ${C.border};padding:2px 9px;display:flex;align-items:stretch;justify-content:space-between;gap:6px;flex-shrink:0;`)
      const hdrL = el('div', `display:flex;align-items:center;gap:4px;min-width:0;flex-shrink:1;overflow:hidden;background:${C.anthracite};border:1px solid ${C.border};border-radius:6px;padding:1px 7px;`)
      hdrL.innerHTML = eightBallSVG(14, false)
      const hdrTitle = el('div', 'min-width:0;overflow:hidden;', `<div style="font-weight:800;color:${C.white};font-size:12px;line-height:1.1;letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">MOKUM MAGIC 8 BALL</div>`)
      hdrL.appendChild(hdrTitle)
      if (testModusAan()) hdrL.appendChild(el('div', `font-size:10px;color:#7bd88f;background:#143020;border:1px solid #2f5a36;border-radius:6px;padding:1px 6px;margin-left:2px;white-space:nowrap;flex-shrink:0;`, '🧪 test'))

      const hdrR = el('div', `display:flex;align-items:center;flex-shrink:0;gap:${isMobile ? '2px' : '3px'};background:${C.anthracite};border:1px solid ${C.border};border-radius:6px;padding:${isMobile ? '1px 5px' : '1px 6px'};`)

      // Home knop
      const homeBtn = btn('🏠', () => { resetChat(); render() }, `background:none;border:1px solid ${C.border};border-radius:5px;color:${C.gray};font-size:11px;padding:0 5px;line-height:1.3;`)
      homeBtn.title = state.lang === 'nl' ? 'Terug naar home' : 'Back to home'

      // SVG vlaggen
      const flagsWrap = el('div', 'display:flex;gap:2px;align-items:center;')
      ;['nl', 'en'].forEach(l => {
        const isActive = state.lang === l
        const flagBtn = btn(l === 'nl' ? flagNLSVG() : flagGBSVG(), () => {
          if (!isActive) { switchLang(l) }
        }, `background:none;border:${isActive ? '1px solid #cc0000' : '1px solid transparent'};border-radius:3px;padding:1px;line-height:0;display:flex;align-items:center;`)
        flagBtn.title = l === 'nl' ? 'Nederlands' : 'English'
        flagsWrap.appendChild(flagBtn)
      })

      // Sluit knop
      const closeBtn = btn('✕', () => { state.open = false; render() }, `background:none;border:none;color:${C.red};font-size:26px;font-weight:bold;padding:0 2px;line-height:1;`)
      closeBtn.title = state.lang === 'nl' ? 'Sluit dit venster' : 'Close this window'

      hdrR.append(homeBtn, flagsWrap, closeBtn)
      hdr.append(hdrL, hdrR)

      // Body
      const body = el('div', null, null, { class: 'mokum-chat-body' })

      state.messages.forEach(msg => {
        const wrap = el('div', `display:flex;justify-content:${msg.role === 'user' ? 'flex-end' : 'flex-start'};`)
        const bubble = el('div', null, null, { class: msg.role === 'user' ? 'mokum-msg-user' : 'mokum-msg-bot' })
        if (msg.role === 'assistant') { bubble.innerHTML = formatBotMessage(msg.content); enhanceCarousel(bubble) }
        else bubble.textContent = msg.content
        wrap.appendChild(bubble)
        body.appendChild(wrap)
      })

      if (state.loading) {
        const lw = el('div', 'display:flex;justify-content:flex-start;')
        lw.appendChild(el('div', `padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:14px;background:${C.blackCard};color:${C.gray};border:1px solid ${C.border};`, t.typing))
        body.appendChild(lw)
      }

      // Stage: topics — beginner-uitleg + inklapbare voorbeeldvragen per categorie
      if (state.stage === 'topics' && !state.loading) {
        const container = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:0;')

        // Inklapbare knop "Voorbeeldvragen per rubriek" met NEW-badge — compact, strak onder de header
        const toggle = btn(
          `<span style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;">
             <span>📋 ${t.examplesBtn}</span>
             <span style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
               <span style="background:${C.red};color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:6px;letter-spacing:0.05em;">NEW</span>
               <span style="font-size:11px;">${state.examplesOpen ? '▲' : '▼'}</span>
             </span>
           </span>`,
          () => { state.examplesOpen = !state.examplesOpen; render() },
          `width:100%;text-align:left;background:${C.anthracite};border:2px solid ${C.red};border-radius:9px;color:${C.white};font-size:12.5px;font-weight:700;padding:6px 12px;`
        )
        container.appendChild(toggle)

        // Categorie-overzicht (alleen zichtbaar bij uitklappen)
        if (state.examplesOpen) {
          CATEGORIES.forEach(cat => {
            const catWrap = el('div', 'display:flex;flex-direction:column;gap:6px;')
            const catTitle = (t.catTitles && t.catTitles[cat.id]) || cat.id
            catWrap.appendChild(el('div',
              `margin-top:6px;background:${C.anthracite};border:2px solid ${C.red};border-radius:6px;padding:6px 10px;`,
              `<span style="font-size:12px;font-weight:800;color:${C.white};letter-spacing:0.07em;text-transform:uppercase;">${cat.emoji} ${catTitle}</span>`))
            const chips = el('div', 'display:flex;flex-wrap:wrap;gap:6px;')
            cat.topics.forEach(tid => {
              const topic = t.topics.find(tp => tp.id === tid)
              if (!topic) return
              const isStar = cat.starTopics && cat.starTopics.indexOf(tid) !== -1
              const isNew = cat.newTopics && cat.newTopics.indexOf(tid) !== -1
              let badge = ''
              if (isStar) badge = ` <span style="background:#e0a93b;color:#1a1a1a;font-size:9px;font-weight:800;padding:1px 5px;border-radius:5px;vertical-align:middle;">★</span>`
              else if (isNew) badge = ` <span style="background:${C.red};color:#fff;font-size:8px;font-weight:800;padding:1px 4px;border-radius:4px;vertical-align:middle;">NEW</span>`
              chips.appendChild(chip(`${topic.emoji} ${topic.label}${badge}`, () => selectTopic(topic), false, true))
            })
            catWrap.appendChild(chips)
            container.appendChild(catWrap)
          })
        }
        body.appendChild(container)
      }

      // Stage: intern login
      if (state.stage === 'intern-login' && !state.loading) {
        const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;')
        wrap.appendChild(el('div', `font-size:13px;color:${C.white};margin-bottom:4px;`, `🔒 ${t.internPwdPrompt}`))
        const pwdInput = el('input', `padding:10px 14px;border-radius:8px;font-size:14px;color:${C.white};background:${C.blackInput};border:1px solid ${state.internPwdError ? C.red : C.border};`, null, { type: 'password', placeholder: state.lang === 'nl' ? 'Wachtwoord...' : 'Password...' })
        pwdInput.value = state.internPwd
        pwdInput.oninput = e => { state.internPwd = e.target.value }
        pwdInput.onkeydown = e => { if (e.key === 'Enter') checkInternPwd() }
        wrap.appendChild(pwdInput)
        if (state.internPwdError) wrap.appendChild(el('div', `font-size:12px;color:${C.red};`, t.internPwdError))
        wrap.appendChild(chip(t.internPwdBtn, checkInternPwd, true))
        wrap.appendChild(btn(t.backButton, () => { state.stage = 'topics'; render() }, null, 'mokum-back-btn'))
        body.appendChild(wrap)
        setTimeout(() => pwdInput.focus(), 100)
      }

      // Stage: terugbelverzoek (formulier)
      if (state.stage === 'terugbel' && !state.loading) {
        const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;')
        if (state.callbackSent) {
          wrap.appendChild(el('div', `font-size:14px;color:${C.white};line-height:1.5;`, `✅ ${t.cbThanks}`))
          wrap.appendChild(btn(t.backToTopics, () => { state.callbackSent = false; resetChat(); render() }, null, 'mokum-back-btn'))
        } else {
          wrap.appendChild(el('div', `font-size:13px;color:${C.white};font-weight:700;`, `📞 ${t.cbTitle}`))
          const mkField = (key, ph, type) => {
            const inp = el('input', `padding:9px 12px;border-radius:8px;font-size:14px;color:${C.white};background:${C.blackInput};border:1px solid ${C.border};`, null, { type: type || 'text', placeholder: ph })
            inp.value = state.callback[key]
            inp.oninput = e => { state.callback[key] = e.target.value }
            return inp
          }
          wrap.appendChild(mkField('naam', t.cbName + ' *'))
          wrap.appendChild(mkField('telefoon', t.cbPhone + ' *', 'tel'))
          wrap.appendChild(mkField('onderwerp', t.cbTopic))
          wrap.appendChild(mkField('voorkeurstijd', t.cbWhen))
          wrap.appendChild(el('div', `font-size:11px;color:${C.gray};line-height:1.4;`, t.cbPrivacy))
          if (state.callbackError) wrap.appendChild(el('div', `font-size:12px;color:${C.red};`, state.callbackError))
          wrap.appendChild(chip(t.cbSubmit, submitCallback, true))
          wrap.appendChild(btn(t.backButton, () => { state.stage = 'topics'; state.callbackError = ''; render() }, null, 'mokum-back-btn'))
        }
        body.appendChild(wrap)
      }

      // Stage: spelregels disciplines
      if (state.stage === 'spelregels' && !state.loading) {
        const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;')
        t.spelregelsDisciplines.forEach(disc => wrap.appendChild(chip(`${disc.emoji} ${disc.label}`, () => { state.selectedDiscipline = disc; state.stage = 'spelregels-questions'; render() })))
        wrap.appendChild(chip(t.askOther, () => { state.stage = 'chat'; render() }, true))
        wrap.appendChild(btn(t.backButton, () => { state.stage = 'topics'; render() }, null, 'mokum-back-btn'))
        body.appendChild(wrap)
      }

      // Stage: spelregels vragen
      if (state.stage === 'spelregels-questions' && state.selectedDiscipline && !state.loading) {
        const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;')
        wrap.appendChild(el('div', `font-size:12px;color:${C.gray};margin-bottom:2px;`, `${state.selectedDiscipline.emoji} ${state.selectedDiscipline.label}`))
        ;(t.spelregelsQuestions[state.selectedDiscipline.id] || []).forEach(q => wrap.appendChild(chip(q, () => sendMessage(q))))
        wrap.appendChild(chip(t.askOther, () => { state.stage = 'chat'; render() }, true))
        wrap.appendChild(btn(t.spelregelsBack, () => { state.stage = 'spelregels'; render() }, null, 'mokum-back-btn'))
        body.appendChild(wrap)
      }

      // Stage: questions
      if (state.stage === 'questions' && state.selectedTopic && !state.loading) {
        const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;')
        const topicData = t.topics.find(tp => tp.id === state.selectedTopic.id)
        wrap.appendChild(el('div', `font-size:12px;color:${C.gray};margin-bottom:2px;`, `${state.selectedTopic.emoji} ${topicData?.label || ''}`))
        ;(t.questions[state.selectedTopic.id] || []).forEach(q => wrap.appendChild(chip(q, () => sendMessage(q))))
        wrap.appendChild(chip(t.askOther, () => { state.stage = 'chat'; render() }, true))
        wrap.appendChild(btn(t.backButton, () => { state.stage = 'topics'; render() }, null, 'mokum-back-btn'))
        body.appendChild(wrap)
      }

      // Terug knop in chat (+ terugbel-knop als vangnet)
      if (state.stage === 'chat' && !state.loading) {
        if (magTerugbelTonen()) body.appendChild(chip(`📞 ${t.cbCta}`, () => { state.stage = 'terugbel'; state.callbackSent = false; state.callbackError = ''; render() }, true))
        body.appendChild(btn(t.backToTopics, () => { resetChat(); render() }, null, 'mokum-back-btn'))
      }

      // In de topics-/rubrieken-stage de bovenkant tonen; overige stages scrollen naar onder zoals voorheen (#85)
      setTimeout(() => { body.scrollTop = state.stage === 'topics' ? 0 : body.scrollHeight }, 50)

      // Input — altijd zichtbaar; alles in één rij, strak onderaan
      const inputArea = el('div', `border-top:1px solid ${C.border};background:${C.blackCard};padding:2px 10px;flex-shrink:0;`)
      const inputRow = el('div', 'display:flex;gap:4px;align-items:center;')
      const input = el('input', `flex:1;min-width:0;box-sizing:border-box;height:30px;padding:0 12px;border-radius:8px;font-size:14px;color:${C.white};background:${C.blackInput};border:1px solid ${C.border};`, null, { type: 'text', placeholder: t.placeholder })
      input.value = state.input
      input.oninput = e => { state.input = e.target.value }
      input.onkeydown = e => { if (e.key === 'Enter') sendMessage() }
      // Verzendknop en venster-kiezer: EXACT dezelfde afmeting (64×30), strak naast elkaar
      const CTRL = `box-sizing:border-box;height:30px;width:64px;flex:0 0 64px;border-radius:8px;`
      const sendBtnEl = btn('→', () => sendMessage(), `${CTRL}display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:${C.white};background:${C.red};border:none;opacity:${state.loading ? 0.5 : 1};`)
      sendBtnEl.disabled = state.loading
      // → en (op desktop) de venster-kiezer als strak groepje.
      const ctrlGroup = el('div', 'display:flex;gap:3px;align-items:stretch;flex-shrink:0;')
      ctrlGroup.append(sendBtnEl)
      // Venster-kiezer alleen op desktop: op mobiel is de chat altijd schermvullend,
      // dus daar zou de kiezer niets doen (zie getWidth/getHeight). Vandaar verbergen.
      if (window.innerWidth >= 480) {
        const sizeOpts = [['klein', 'Small'], ['middel', 'Medium'], ['groot', 'MAX']]
        const optsHtml = sizeOpts.map(([v, l]) => `<option value="${v}"${state.size === v ? ' selected' : ''}>${l}</option>`).join('')
        const sizeSelect = el('select', `${CTRL}-webkit-appearance:none;appearance:none;background:${C.blackInput} url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='8'%20height='5'%20viewBox='0%200%208%205'%3E%3Cpath%20d='M0%200l4%205%204-5z'%20fill='%23aaaaaa'/%3E%3C/svg%3E") no-repeat right 6px center;border:1px solid ${C.border};color:${C.white};font-size:11.5px;text-align:center;text-align-last:center;padding:0 13px 0 5px;cursor:pointer;`, optsHtml)
        sizeSelect.value = state.size
        sizeSelect.onchange = e => { state.size = e.target.value; render() }
        ctrlGroup.append(sizeSelect)
      }
      inputRow.append(input, ctrlGroup)
      inputArea.append(inputRow)

      win.append(hdr, body, inputArea)
      root.appendChild(win)
      fitMobileWindow()
    }

    // Floating knop
    if (!state.open) {
      // De hele launcher (8-bal + tekstballon) schaalt als één geheel mee; origin rechtsonder houdt de hoek op zijn plek.
      const floatWrap = el('div', `position:fixed;bottom:${WIDGET_CONFIG.bottom};right:${r};z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;transform:scale(${LAUNCHER_SCALE});transform-origin:bottom right;`)

      // Tekstballon alleen tonen als 'ie actief is (aan + minstens 1 tekst) — #80.
      let bubble = null
      if (bubbleActief()) {
        bubble = el('div', 'position:relative;display:inline-block;margin-bottom:18px;')
        const bubbleInner = el('div', 'background:white;border:3.5px solid #111;border-radius:12px;padding:10px 16px;position:relative;')
        const bubbleText = el('span', 'font-family:Arial Black,Arial,sans-serif;font-size:12px;font-weight:900;color:#cc0000;display:block;white-space:nowrap;text-align:center;', BUBBLE_TEXTS[state.bubbleTextIndex % BUBBLE_TEXTS.length])
        const arrow = el('div', 'position:absolute;bottom:-16px;right:32px;width:4px;height:16px;background:#111;border-radius:2px;')
        bubbleInner.appendChild(bubbleText)
        bubble.append(bubbleInner, arrow)
      }

      const ballBtn = btn('', () => {
        state.open = true
        if (state.messages.length === 0) state.messages = [{ role: 'assistant', content: tr().welcome }]
        render()
      }, 'background:transparent;border:none;padding:0;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.6));transition:transform 0.2s;')
      ballBtn.innerHTML = eightBallSVG(64, true)
      ballBtn.onmouseenter = () => { ballBtn.style.transform = 'scale(1.1)' }
      ballBtn.onmouseleave = () => { ballBtn.style.transform = 'scale(1)' }

      if (bubble) floatWrap.append(bubble, ballBtn)
      else floatWrap.append(ballBtn)
      root.appendChild(floatWrap)
    }

    // Sluit knop onder venster
    if (state.open) {
      const cw = el('div', `position:fixed;bottom:${WIDGET_CONFIG.bottom};right:${r};z-index:9999;margin-top:8px;`)

      root.appendChild(cw)
    }
  }

  function selectTopic(topic) {
    if (topic.id === 'anders') { state.stage = 'chat' }
    else if (topic.id === 'spelregels') { state.selectedTopic = topic; state.messages.push({ role: 'assistant', content: tr().spelregelsIntro }); state.stage = 'spelregels' }
    else if (topic.id === 'intern' && !state.internUnlocked) { state.selectedTopic = topic; state.stage = 'intern-login' }
    else { state.selectedTopic = topic; state.stage = 'questions' }
    render()
  }

  async function checkInternPwd() {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state.internPwd))
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    if (hashHex === INTERN_HASH) {
      state.internUnlocked = true; state.internPwdError = false; state.internPwd = ''
      state.selectedTopic = { id: 'intern', emoji: '🔒', label: state.lang === 'nl' ? 'Intern' : 'Internal' }
      state.stage = 'questions'
    } else { state.internPwdError = true }
    render()
  }

  // Terugbel-knop alleen als vangnet: bij een expliciete bel-vraag, of als het gesprek lang wordt
  // (bezoeker komt er met de chatbot niet uit). Niet proactief tonen.
  function magTerugbelTonen() {
    const userMsgs = state.messages.filter(m => m.role === 'user')
    if (!userMsgs.length) return false
    const laatste = (userMsgs[userMsgs.length - 1].content || '').toLowerCase()
    if (/terugbel|terug bel|gebeld|opbel|bellen|telefonisch|call me|call ?back|phone me|callback/.test(laatste)) return true
    if (userMsgs.length >= 5) return true
    return false
  }

  async function submitCallback() {
    const cb = state.callback
    if (!cb.naam.trim() || !cb.telefoon.trim()) { state.callbackError = tr().cbRequired; render(); return }
    state.callbackError = ''
    // Preview-modus (#77): geen echt terugbelverzoek versturen — alleen de bevestiging tonen.
    if (PREVIEW) {
      state.callbackSent = true
      state.callback = { naam: '', telefoon: '', onderwerp: '', voorkeurstijd: '' }
      render()
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/terugbelverzoek`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: state.conversationId,
          naam: cb.naam, telefoon: cb.telefoon, onderwerp: cb.onderwerp, voorkeurstijd: cb.voorkeurstijd,
          isTest: testModusAan(),
        }),
      })
      if (!res.ok) throw new Error('http ' + res.status)
      state.callbackSent = true
      state.callback = { naam: '', telefoon: '', onderwerp: '', voorkeurstijd: '' }
    } catch { state.callbackError = tr().cbError }
    render()
  }

  function resetCallback() {
    state.conversationId = null
    state.callback = { naam: '', telefoon: '', onderwerp: '', voorkeurstijd: '' }
    state.callbackError = ''; state.callbackSent = false
  }

  function switchLang(newLang) {
    state.lang = newLang
    state.messages = [{ role: 'assistant', content: TRANSLATIONS[newLang].welcome }]
    state.stage = 'topics'; state.selectedTopic = null; state.selectedDiscipline = null
    state.internUnlocked = false; state.internPwd = ''; state.internPwdError = false
    resetCallback()
    render()
  }

  function resetChat() {
    state.stage = 'topics'; state.selectedTopic = null; state.selectedDiscipline = null
    state.internUnlocked = false; state.internPwd = ''; state.internPwdError = false
    state.messages = [{ role: 'assistant', content: tr().welcome }]; state.input = ''
    state.examplesOpen = false
    resetCallback()
  }

  async function sendMessage(text) {
    const msg = text || state.input
    if (!msg.trim()) return
    // Blokkeer terwijl er al een antwoord wordt opgehaald (geen 5x dezelfde request bij snel klikken)
    if (state.loading) return

    // Preview-modus (#77): geen echte API-call (voorkomt vervuiling van de gesprekslogs);
    // toon een voorbeeld-antwoord zodat de Teksten-preview realistisch oogt.
    if (PREVIEW) {
      state.input = ''; state.stage = 'chat'
      state.messages.push({ role: 'user', content: msg })
      state.messages.push({ role: 'assistant', content: state.lang === 'nl'
        ? 'Dit is een preview — in de echte widget verschijnt hier het antwoord van de bot. 🎱'
        : 'This is a preview — in the live widget the bot’s answer appears here. 🎱' })
      render()
      return
    }

    const genormaliseerd = msg.trim().toLowerCase()

    // Dezelfde vraag mag niet direct opnieuw; bij volhardend herhalen -> Easy tiger
    if (genormaliseerd === state.lastSentQuestion) {
      const nu = Date.now()
      state.dupTimes = (state.dupTimes || []).filter(tijd => nu - tijd < DUP_WINDOW)
      state.dupTimes.push(nu)
      state.input = ''; state.stage = 'chat'
      state.messages.push({ role: 'user', content: msg })
      if (state.dupTimes.length >= DUP_MAX) {
        const wacht = Math.ceil((DUP_WINDOW - (nu - state.dupTimes[0])) / 1000)
        state.messages.push({ role: 'assistant', content: tr().rateLimitMsg.replace('{s}', wacht) })
      } else {
        state.messages.push({ role: 'assistant', content: tr().duplicateMsg })
      }
      render()
      return
    }

    // Rate-limit: te veel vragen achter elkaar -> timeout-bericht
    const now = Date.now()
    state.sendTimes = (state.sendTimes || []).filter(tijd => now - tijd < RATE_WINDOW)
    if (state.sendTimes.length >= RATE_MAX) {
      const wacht = Math.ceil((RATE_WINDOW - (now - state.sendTimes[0])) / 1000)
      state.input = ''; state.stage = 'chat'
      state.messages.push({ role: 'user', content: msg })
      state.messages.push({ role: 'assistant', content: tr().rateLimitMsg.replace('{s}', wacht) })
      render()
      return
    }
    state.sendTimes.push(now)
    state.lastSentQuestion = genormaliseerd
    state.dupTimes = []

    state.messages.push({ role: 'user', content: msg })
    state.input = ''; state.loading = true; state.stage = 'chat'
    render()
    async function callChat() {
      // Testmodus: markeer de vraag met #test (backend strip het en zet isTest). State blijft schoon.
      let payloadMsgs = state.messages
      if (testModusAan()) {
        payloadMsgs = state.messages.map((m, idx) =>
          (idx === state.messages.length - 1 && m.role === 'user') ? { ...m, content: '#test ' + m.content } : m)
      }
      const res = await fetch(`${API_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: payloadMsgs }) })
      if (!res.ok) throw new Error('http ' + res.status)
      const data = await res.json()
      if (!data || typeof data.reply !== 'string') throw new Error('geen antwoord')
      if (data.conversationId) state.conversationId = data.conversationId
      return data.reply
    }
    try {
      let reply
      try {
        reply = await callChat()
      } catch {
        // Eén retry — vangt cold starts / tijdelijke hikken op
        await new Promise((r) => setTimeout(r, 1500))
        reply = await callChat()
      }
      state.messages.push({ role: 'assistant', content: reply })
    } catch { state.messages.push({ role: 'assistant', content: tr().error }) }
    finally { state.loading = false; render() }
  }

  // Bubble-rotatie met instelbaar interval (#80). applyConfig() herstart 'm na elke
  // config-wissel, zodat een gewijzigd interval/aan-uit direct ingaat (ook in preview).
  let bubbleTimer = null
  function startBubbleTimer() {
    if (bubbleTimer) clearInterval(bubbleTimer)
    bubbleTimer = setInterval(() => {
      if (!state.open && bubbleActief()) { state.bubbleTextIndex = (state.bubbleTextIndex + 1) % BUBBLE_TEXTS.length; render() }
    }, Math.max(2, BUBBLE_INTERVAL) * 1000)
  }
  startBubbleTimer()

  // Alleen opnieuw renderen als de BREEDTE wijzigt (oriëntatie/desktop-resize).
  // Op mobiel verandert het openende toetsenbord alleen de hoogte; een volledige
  // re-render zou de input opnieuw opbouwen en het toetsenbord direct sluiten.
  // De hoogte/breedte zijn dvh/vw-gebaseerd en passen zich zonder re-render aan.
  let lastViewportWidth = window.innerWidth
  window.addEventListener('resize', () => {
    if (!state.open) return
    if (window.innerWidth === lastViewportWidth) return
    lastViewportWidth = window.innerWidth
    render()
  })

  // Toetsenbord openen/sluiten op mobiel: paneel binnen het zichtbare deel houden
  // zonder re-render (anders verdwijnt de focus en sluit het toetsenbord).
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitMobileWindow)
    window.visualViewport.addEventListener('scroll', fitMobileWindow)
  }

  // Voorbeeldvragen per rubriek dynamisch laden uit het dashboard (issue #33).
  // Overschrijft alleen onderwerpen waarvoor beheer-vragen bestaan; faalt 'ie of is
  // 'ie leeg, dan blijven de hier hardcoded voorbeeldvragen staan (fallback).
  function laadStandaardvragen() {
    fetch(`${API_URL}/api/standaardvragen`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const vragen = data && Array.isArray(data.vragen) ? data.vragen : null
        if (!vragen || !vragen.length) return
        const perLang = { nl: {}, en: {} }
        vragen.filter((v) => v && v.actief !== false).forEach((v) => {
          const ond = v.onderwerp
          if (!ond) return
          ;['nl', 'en'].forEach((lang) => {
            const tekst = v.vraag && v.vraag[lang]
            if (!tekst) return
            ;(perLang[lang][ond] = perLang[lang][ond] || []).push({ q: tekst, volg: v.volgnummer || 0 })
          })
        })
        ;['nl', 'en'].forEach((lang) => {
          const T = TRANSLATIONS[lang]
          if (!T || !T.questions) return
          Object.keys(perLang[lang]).forEach((ond) => {
            const arr = perLang[lang][ond].sort((a, b) => a.volg - b.volg).map((x) => x.q)
            if (arr.length) T.questions[ond] = arr
          })
        })
        render()
      })
      .catch(() => {})
  }

  // ── Preview-modus (Widget Customizer, #77) ────────────────────────────────
  // De dashboard-preview draait de widget in een iframe en stuurt de (nog niet
  // opgeslagen) config via postMessage. We passen 'm toe en her-renderen live.
  function applyPreviewConfig(cfg) {
    try { applyConfig(cfg) } catch (e) {}
    if (!state.open) state.messages = [{ role: 'assistant', content: tr().welcome }]
    render()
  }
  function onPreviewMessage(ev) {
    const d = ev && ev.data
    if (!d || typeof d !== 'object') return
    if (d.type === 'mokum-preview-config' && d.config) {
      applyPreviewConfig(d.config)
    } else if (d.type === 'mokum-preview-open') {
      if (d.open) { resetChat(); state.open = true } else { state.open = false }
      render()
    } else if (d.type === 'mokum-preview-lang' && (d.lang === 'nl' || d.lang === 'en')) {
      state.lang = d.lang
      if (!state.open) state.messages = [{ role: 'assistant', content: tr().welcome }]
      render()
    }
  }

  async function init() {
    // Host in de pagina; de hele widget leeft in een Shadow DOM zodat thema-CSS er niet in kan lekken.
    const host = document.createElement('div')
    host.id = 'mokum-widget-host'
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    const root = document.createElement('div')
    root.id = 'mokum-widget-root'
    shadow.appendChild(root)
    injectStyles()
    state.messages = [{ role: 'assistant', content: tr().welcome }]
    render()
    if (PREVIEW) {
      // Preview: geen config-fetch en geen /api/standaardvragen-override. Wacht op de
      // config van de parent (dashboard) en meld dat we klaar zijn om te ontvangen.
      window.addEventListener('message', onPreviewMessage)
      try { if (window.parent) window.parent.postMessage({ type: 'mokum-preview-ready' }, '*') } catch (e) {}
      return
    }
    await loadConfig()       // echte config eroverheen (of fallback blijft bij fout)
    if (!state.open) state.messages = [{ role: 'assistant', content: tr().welcome }] // welkomsttekst bijwerken
    render()
    laadStandaardvragen()    // NA config -> questions-override werkt 1-op-1 als voorheen
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()