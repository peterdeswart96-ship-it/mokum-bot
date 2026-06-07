(function () {
  'use strict'

  // Voorkom dubbele initialisatie
  if (window.__mokumWidgetLoaded) return
  window.__mokumWidgetLoaded = true

  const API_URL = 'https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net'

  const C = {
    red: '#cc0000',
    redDark: '#990000',
    black: '#0a0a0a',
    blackCard: '#161616',
    blackInput: '#1f1f1f',
    border: '#2a2a2a',
    white: '#ffffff',
    gray: '#888888',
  }

  const BUBBLE_TEXTS = [
    'ASK ME ANYTHING!',
    'HELLOOO!',
    "I HAVEN'T GOT ALL DAY!",
    "I'M BORED, ASK ME SOMETHING",
  ]

  const TRANSLATIONS = {
    nl: {
      welcome: 'Hey! Ik ben de Mokum Magic 8 Ball 🎱 Waar kan ik je mee helpen?',
      typing: 'Aan het typen...',
      placeholder: 'Stel een vraag...',
      error: 'Oeps, er ging iets mis. Probeer het nog eens! 🎱',
      backToTopics: '← Terug naar onderwerpen',
      backButton: '← Terug',
      askOther: '✏️ Ik wil een andere vraag stellen',
      spelregelsIntro: 'Je hebt dus een vraag over spelregels... Over welke spelsoort wil je een vraag stellen?',
      spelregelsBack: '← Terug naar spelregels',
      hoverTitle: 'IK WEET ALLES OVER:',
      hoverInfo: [
        '🕐 Openingstijden',
        '💶 Tarieven & activiteiten',
        '🏆 Toernooien & inschrijven',
        '📍 Route & parkeren',
        '🎯 Darts, biljart & shuffleboard',
        '🏢 Bedrijfsuitjes & groepen',
      ],
      topics: [
        { id: 'pool', emoji: '🎱', label: 'Pool & Biljart' },
        { id: 'darts', emoji: '🎯', label: 'Darts' },
        { id: 'openingstijden', emoji: '📅', label: 'Openingstijden' },
        { id: 'tarieven', emoji: '💶', label: 'Tarieven' },
        { id: 'toernooien', emoji: '🏆', label: 'Toernooien' },
        { id: 'spelregels', emoji: '📖', label: 'Spelregels' },
        { id: 'locatie', emoji: '📍', label: 'Locatie & Parkeren' },
        { id: 'anders', emoji: '❓', label: 'Anders' },
      ],
      questions: {
        pool: ['Hoeveel tafels zijn er beschikbaar?', 'Moet ik reserveren?', 'Wat is het verschil tussen American en English pool?', 'Kan ik mijn eigen keu meenemen?'],
        darts: ['Wat kost een uur darts?', 'Moet ik eigen pijlen meenemen?', 'Hoeveel dartsborden zijn er?', 'Kan ik darts combineren met pool?'],
        openingstijden: ['Wanneer zijn jullie open?', 'Zijn jullie ook op feestdagen open?', 'Hoe laat is de laatste inloop?', 'Zijn de tijden in het weekend anders?'],
        tarieven: ['Wat kost een uur poolen?', 'Zijn er dagprijzen of avondprijzen?', 'Kan ik pinnen?', 'Zijn er groepstarieven?'],
        toernooien: ['Wanneer is het volgende toernooi?', 'Welke toernooien zijn er aankomende week?', 'Zijn er ook toernooien voor beginnende spelers?', 'Wat kost deelname?'],
        locatie: ['Waar is Mokum gevestigd?', 'Hoe kom ik er met het OV?', 'Is er parkeergelegenheid?', 'Hoe ver is het van Amstel Station?'],
      },
      spelregelsDisciplines: [
        { id: 'american-pool', emoji: '🎱', label: 'American Pool' },
        { id: 'english-pool', emoji: '🎱', label: 'English Pool' },
        { id: 'darts', emoji: '🎯', label: 'Darts' },
        { id: 'biljart', emoji: '🔵', label: 'Biljart' },
        { id: 'shuffleboard', emoji: '🛝', label: 'Shuffleboard' },
      ],
      spelregelsQuestions: {
        'american-pool': ['Wat zijn de regels van 8-ball?', 'Hoe speel je 9-ball?', 'Wat zijn de regels van 10-ball?', 'Hoe werkt Straight Pool?', 'Wat zijn de regels van One Pocket?'],
        'english-pool': ['Wat zijn de regels van English Pool?', 'Wat is het verschil tussen American en English pool?', 'Welke ballen gebruik je bij English Pool?'],
        'darts': ['Hoe werkt 501 darts?', 'Wat zijn de regels van Cricket darts?', 'Hoe werkt 301 darts?', 'Wat is een checkout in darts?'],
        'biljart': ['Wat zijn de regels van libre biljart?', 'Hoe werkt bandstoten?', 'Wat zijn de regels van driebanden?'],
        'shuffleboard': ['Hoe speel je shuffleboard?', 'Hoeveel spelers doen mee bij shuffleboard?', 'Hoe werkt de puntentelling bij shuffleboard?'],
      },
    },
    en: {
      welcome: "Hey! I'm the Mokum Magic 8 Ball 🎱 What can I help you with?",
      typing: 'Typing...',
      placeholder: 'Ask a question...',
      error: 'Oops, something went wrong. Please try again! 🎱',
      backToTopics: '← Back to topics',
      backButton: '← Back',
      askOther: '✏️ I want to ask a different question',
      spelregelsIntro: 'So you have a question about game rules... Which discipline would you like to ask about?',
      spelregelsBack: '← Back to game rules',
      hoverTitle: 'I KNOW ALL ABOUT:',
      hoverInfo: [
        '🕐 Opening hours',
        '💶 Rates & activities',
        '🏆 Tournaments & sign-up',
        '📍 Route & parking',
        '🎯 Darts, billiards & more',
        '🏢 Corporate events',
      ],
      topics: [
        { id: 'pool', emoji: '🎱', label: 'Pool & Billiards' },
        { id: 'darts', emoji: '🎯', label: 'Darts' },
        { id: 'openingstijden', emoji: '📅', label: 'Opening Hours' },
        { id: 'tarieven', emoji: '💶', label: 'Rates' },
        { id: 'toernooien', emoji: '🏆', label: 'Tournaments' },
        { id: 'spelregels', emoji: '📖', label: 'Game Rules' },
        { id: 'locatie', emoji: '📍', label: 'Location & Parking' },
        { id: 'anders', emoji: '❓', label: 'Other' },
      ],
      questions: {
        pool: ['How many tables are available?', 'Do I need to reserve?', "What's the difference between American and English pool?", 'Can I bring my own cue?'],
        darts: ['How much does an hour of darts cost?', 'Do I need to bring my own darts?', 'How many dartboards are there?', 'Can I combine darts with pool?'],
        openingstijden: ['When are you open?', 'Are you open on public holidays?', "What's the last entry time?", 'Are the weekend hours different?'],
        tarieven: ['How much does an hour of pool cost?', 'Are there day rates and evening rates?', 'Can I pay by card?', 'Are there group rates?'],
        toernooien: ['When is the next tournament?', 'Which tournaments are coming up next week?', 'Are there tournaments for beginners?', 'How much does it cost to participate?'],
        locatie: ['Where is Mokum located?', 'How do I get there by public transport?', 'Is there parking available?', 'How far is it from Amstel Station?'],
      },
      spelregelsDisciplines: [
        { id: 'american-pool', emoji: '🎱', label: 'American Pool' },
        { id: 'english-pool', emoji: '🎱', label: 'English Pool' },
        { id: 'darts', emoji: '🎯', label: 'Darts' },
        { id: 'biljart', emoji: '🔵', label: 'Billiards' },
        { id: 'shuffleboard', emoji: '🛝', label: 'Shuffleboard' },
      ],
      spelregelsQuestions: {
        'american-pool': ['What are the rules of 8-ball?', 'How do you play 9-ball?', 'What are the rules of 10-ball?', 'How does Straight Pool work?', 'What are the rules of One Pocket?'],
        'english-pool': ['What are the rules of English Pool?', 'What is the difference between American and English pool?', 'Which balls are used in English Pool?'],
        'darts': ['How does 501 darts work?', 'What are the rules of Cricket darts?', 'How does 301 darts work?', 'What is a checkout in darts?'],
        'biljart': ['What are the rules of libre billiards?', 'How does cushion billiards work?', 'What are the rules of three-cushion billiards?'],
        'shuffleboard': ['How do you play shuffleboard?', 'How many players can play shuffleboard?', 'How does the scoring work in shuffleboard?'],
      },
    },
  }

  // State
  let state = {
    open: false,
    lang: detectLanguage(),
    stage: 'topics',
    messages: [],
    input: '',
    loading: false,
    selectedTopic: null,
    selectedDiscipline: null,
    bubbleTextIndex: 0,
    hovered: false,
    expanded: false,
  }

  function detectLanguage() {
    const l = navigator.language?.toLowerCase() || 'en'
    return l.startsWith('nl') ? 'nl' : 'en'
  }

  function t() {
    return TRANSLATIONS[state.lang]
  }

  // Inject global styles
  function injectStyles() {
    if (document.getElementById('mokum-widget-styles')) return
    const style = document.createElement('style')
    style.id = 'mokum-widget-styles'
    style.textContent = `
      #mokum-widget-root * { box-sizing: border-box; font-family: Arial, sans-serif; }
      #mokum-widget-root button { cursor: pointer; }
      #mokum-widget-root input:focus { outline: none; }
      #mokum-widget-root a { color: #ff6b6b; text-decoration: underline; }
      @keyframes mokumBounce {
        0%, 100% { transform: translateY(0); }
        40% { transform: translateY(-18px); }
        60% { transform: translateY(-10px); }
      }
      @keyframes mokumIdle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      .mokum-bounce { animation: mokumBounce 1.2s ease-in-out 3, mokumIdle 3s ease-in-out 3.6s infinite; }
      .mokum-chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
      .mokum-chat-body::-webkit-scrollbar { width: 4px; }
      .mokum-chat-body::-webkit-scrollbar-track { background: transparent; }
      .mokum-chat-body::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      .mokum-msg-bot { max-width: 85%; padding: 10px 14px; border-radius: 12px 12px 12px 2px; font-size: 14px; line-height: 1.55; background: #161616; color: #fff; border: 1px solid #2a2a2a; }
      .mokum-msg-bot p { margin: 0 0 6px 0; }
      .mokum-msg-bot strong { color: #fff; font-weight: 700; }
      .mokum-msg-bot ul, .mokum-msg-bot ol { margin: 4px 0; padding-left: 16px; }
      .mokum-msg-bot li { margin: 2px 0; line-height: 1.6; }
      .mokum-msg-user { max-width: 85%; padding: 10px 14px; border-radius: 12px 12px 2px 12px; font-size: 14px; line-height: 1.55; background: #cc0000; color: #fff; }
      .mokum-chip { font-size: 13px; padding: 8px 14px; border-radius: 20px; background: transparent; color: #fff; border: 1px solid #2a2a2a; transition: all 0.15s ease; text-align: left; line-height: 1.4; display: block; width: 100%; }
      .mokum-chip:hover { background: #2a2a2a; border-color: #444; }
      .mokum-chip-accent { background: #cc0000; border: none; }
      .mokum-chip-accent:hover { background: #990000; }
      .mokum-back-btn { background: none; border: none; color: #888; font-size: 12px; padding: 4px 0; text-align: left; }
    `
    document.head.appendChild(style)
  }

  // SVG 8-ball icoon
  function eightBallSVG(size, animate) {
    return `<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="${animate ? 'mokum-bounce' : ''}">
      <defs>
        <radialGradient id="mw-ballGrad" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stop-color="#3a3a3a"/><stop offset="40%" stop-color="#111"/><stop offset="100%" stop-color="#0a0a0a"/>
        </radialGradient>
        <radialGradient id="mw-circleGrad" cx="42%" cy="38%" r="58%">
          <stop offset="0%" stop-color="#fff"/><stop offset="70%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#ccc"/>
        </radialGradient>
        <radialGradient id="mw-hatGrad" cx="38%" cy="20%" r="70%">
          <stop offset="0%" stop-color="#2e2e2e"/><stop offset="50%" stop-color="#141414"/><stop offset="100%" stop-color="#0a0a0a"/>
        </radialGradient>
        <radialGradient id="mw-brimGrad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#222"/><stop offset="100%" stop-color="#0a0a0a"/>
        </radialGradient>
        <radialGradient id="mw-shineGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.16"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
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
        <g transform="translate(91,27)">
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <g transform="translate(109,27)">
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <g transform="translate(100,37)">
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <text x="100" y="52" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="8" font-weight="900" fill="#fff" letter-spacing="1.5">MOKUM</text>
      </g>
    </svg>`
  }

  // Simpele markdown naar HTML converter
  function markdownToHtml(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^### (.+)$/gm, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<strong>$1</strong>')
      .replace(/^# (.+)$/gm, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
  }

  function formatBotMessage(text) {
    const lines = text.split('\n')
    let html = ''
    let inList = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;">'; inList = true }
        const content = trimmed.substring(2)
        html += `<li style="margin:2px 0;line-height:1.6;">${applyInlineMarkdown(content)}</li>`
      } else {
        if (inList) { html += '</ul>'; inList = false }
        if (trimmed === '') {
          html += '<br>'
        } else if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          html += `<p style="margin:0 0 6px 0;"><strong>${applyInlineMarkdown(trimmed.replace(/^#+\s/, ''))}</strong></p>`
        } else {
          html += `<p style="margin:0 0 6px 0;">${applyInlineMarkdown(trimmed)}</p>`
        }
      }
    }
    if (inList) html += '</ul>'
    return html
  }

  function applyInlineMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700;">$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#ff6b6b;text-decoration:underline;">$1</a>')
  }

  // Render functies
  function render() {
    const root = document.getElementById('mokum-widget-root')
    if (!root) return
    root.innerHTML = ''

    const tr = t()

    if (state.open) {
      // Chat venster
      const width = state.expanded ? 'min(80vw, 900px)' : '380px'
      const height = state.expanded ? '80vh' : '580px'

      const chatWindow = el('div', {
        style: `position:fixed;bottom:100px;right:24px;width:${width};height:${height};border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.8),0 0 0 1px #2a2a2a;display:flex;flex-direction:column;background:${C.black};transition:width 0.3s ease,height 0.3s ease;z-index:9999;`,
      })

      // Header
      const header = el('div', {
        style: `background:${C.blackCard};border-bottom:1px solid ${C.border};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;`,
      })

      const headerLeft = el('div', { style: 'display:flex;align-items:center;gap:10px;' })
      headerLeft.innerHTML = eightBallSVG(36, false)
      const headerTitle = el('div')
      headerTitle.innerHTML = `<div style="font-weight:800;color:${C.white};font-size:14px;letter-spacing:0.06em;">MOKUM MAGIC 8 BALL</div><div style="color:${C.red};font-size:11px;margin-top:1px;">Pool & Darts Amsterdam</div>`
      headerLeft.appendChild(headerTitle)

      const headerRight = el('div', { style: 'display:flex;align-items:center;gap:8px;' })

      // Taalwisselaar
      const langBtn = el('button', {
        style: `background:none;border:1px solid ${C.border};border-radius:6px;color:${C.white};font-size:16px;padding:3px 8px;line-height:1.4;`,
        title: state.lang === 'nl' ? 'Switch to English' : 'Naar Nederlands',
      })
      langBtn.textContent = state.lang === 'nl' ? '🇬🇧' : '🇳🇱'
      langBtn.onclick = () => {
        state.lang = state.lang === 'nl' ? 'en' : 'nl'
        state.messages = [{ role: 'assistant', content: TRANSLATIONS[state.lang].welcome }]
        state.stage = 'topics'
        state.selectedTopic = null
        state.selectedDiscipline = null
        render()
      }

      // Expand knop
      const expandBtn = el('button', {
        style: `background:none;border:1px solid ${C.border};border-radius:6px;color:${C.gray};font-size:12px;padding:4px 8px;`,
        title: state.expanded ? 'Verkleinen' : 'Maximaliseren',
      })
      expandBtn.textContent = state.expanded ? '⊡' : '⊞'
      expandBtn.onclick = () => { state.expanded = !state.expanded; render() }

      // Sluit knop
      const closeBtn = el('button', {
        style: `background:none;border:none;color:${C.gray};font-size:18px;font-weight:bold;padding:4px;line-height:1;`,
      })
      closeBtn.textContent = '✕'
      closeBtn.onclick = () => { state.open = false; render() }

      headerRight.append(langBtn, expandBtn, closeBtn)
      header.append(headerLeft, headerRight)

      // Chat body
      const body = el('div', { class: 'mokum-chat-body' })

      // Berichten
      state.messages.forEach(msg => {
        const wrapper = el('div', { style: `display:flex;justify-content:${msg.role === 'user' ? 'flex-end' : 'flex-start'};` })
        const bubble = el('div', { class: msg.role === 'user' ? 'mokum-msg-user' : 'mokum-msg-bot' })
        if (msg.role === 'assistant') {
          bubble.innerHTML = formatBotMessage(msg.content)
        } else {
          bubble.textContent = msg.content
        }
        wrapper.appendChild(bubble)
        body.appendChild(wrapper)
      })

      // Loading
      if (state.loading) {
        const loadWrapper = el('div', { style: 'display:flex;justify-content:flex-start;' })
        const loadBubble = el('div', { style: `padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:14px;background:${C.blackCard};color:${C.gray};border:1px solid ${C.border};` })
        loadBubble.textContent = tr.typing
        loadWrapper.appendChild(loadBubble)
        body.appendChild(loadWrapper)
      }

      // Stage: topics
      if (state.stage === 'topics' && !state.loading) {
        const wrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;' })
        tr.topics.forEach(topic => {
          const btn = el('button', { class: 'mokum-chip', style: 'width:auto;' })
          btn.textContent = `${topic.emoji} ${topic.label}`
          btn.onclick = () => selectTopic(topic)
          wrap.appendChild(btn)
        })
        body.appendChild(wrap)
      }

      // Stage: spelregels disciplines
      if (state.stage === 'spelregels' && !state.loading) {
        const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:4px;' })
        tr.spelregelsDisciplines.forEach(disc => {
          const btn = el('button', { class: 'mokum-chip' })
          btn.textContent = `${disc.emoji} ${disc.label}`
          btn.onclick = () => { state.selectedDiscipline = disc; state.stage = 'spelregels-questions'; render() }
          wrap.appendChild(btn)
        })
        const otherBtn = el('button', { class: 'mokum-chip mokum-chip-accent' })
        otherBtn.textContent = tr.askOther
        otherBtn.onclick = () => { state.stage = 'chat'; render() }
        wrap.appendChild(otherBtn)
        const backBtn = el('button', { class: 'mokum-back-btn' })
        backBtn.textContent = tr.backButton
        backBtn.onclick = () => { state.stage = 'topics'; render() }
        wrap.appendChild(backBtn)
        body.appendChild(wrap)
      }

      // Stage: spelregels vragen
      if (state.stage === 'spelregels-questions' && state.selectedDiscipline && !state.loading) {
        const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:4px;' })
        const label = el('div', { style: `font-size:12px;color:${C.gray};margin-bottom:2px;` })
        label.textContent = `${state.selectedDiscipline.emoji} ${state.selectedDiscipline.label}`
        wrap.appendChild(label)
        const questions = tr.spelregelsQuestions[state.selectedDiscipline.id] || []
        questions.forEach(q => {
          const btn = el('button', { class: 'mokum-chip' })
          btn.textContent = q
          btn.onclick = () => sendMessage(q)
          wrap.appendChild(btn)
        })
        const otherBtn = el('button', { class: 'mokum-chip mokum-chip-accent' })
        otherBtn.textContent = tr.askOther
        otherBtn.onclick = () => { state.stage = 'chat'; render() }
        wrap.appendChild(otherBtn)
        const backBtn = el('button', { class: 'mokum-back-btn' })
        backBtn.textContent = tr.spelregelsBack
        backBtn.onclick = () => { state.stage = 'spelregels'; render() }
        wrap.appendChild(backBtn)
        body.appendChild(wrap)
      }

      // Stage: questions
      if (state.stage === 'questions' && state.selectedTopic && !state.loading) {
        const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:4px;' })
        const label = el('div', { style: `font-size:12px;color:${C.gray};margin-bottom:2px;` })
        const topicData = tr.topics.find(tp => tp.id === state.selectedTopic.id)
        label.textContent = `${state.selectedTopic.emoji} ${topicData?.label || ''}`
        wrap.appendChild(label)
        const questions = tr.questions[state.selectedTopic.id] || []
        questions.forEach(q => {
          const btn = el('button', { class: 'mokum-chip' })
          btn.textContent = q
          btn.onclick = () => sendMessage(q)
          wrap.appendChild(btn)
        })
        const otherBtn = el('button', { class: 'mokum-chip mokum-chip-accent' })
        otherBtn.textContent = tr.askOther
        otherBtn.onclick = () => { state.stage = 'chat'; render() }
        wrap.appendChild(otherBtn)
        const backBtn = el('button', { class: 'mokum-back-btn' })
        backBtn.textContent = tr.backButton
        backBtn.onclick = () => { state.stage = 'topics'; render() }
        wrap.appendChild(backBtn)
        body.appendChild(wrap)
      }

      // Terug knop in chat
      if (state.stage === 'chat' && state.messages.length <= 3 && !state.loading) {
        const backBtn = el('button', { class: 'mokum-back-btn' })
        backBtn.textContent = tr.backToTopics
        backBtn.onclick = resetChat
        body.appendChild(backBtn)
      }

      // Scroll naar beneden
      setTimeout(() => { body.scrollTop = body.scrollHeight }, 50)

      // Input
      const showInput = ['chat', 'questions', 'spelregels', 'spelregels-questions'].includes(state.stage)
      let inputArea = null
      if (showInput) {
        inputArea = el('div', {
          style: `border-top:1px solid ${C.border};background:${C.blackCard};padding:12px 16px;display:flex;gap:8px;flex-shrink:0;`,
        })
        const input = el('input', {
          type: 'text',
          placeholder: tr.placeholder,
          style: `flex:1;padding:10px 14px;border-radius:8px;font-size:14px;color:${C.white};background:${C.blackInput};border:1px solid ${C.border};outline:none;`,
        })
        input.value = state.input
        input.oninput = (e) => { state.input = e.target.value }
        input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage() }

        const sendBtn = el('button', {
          style: `padding:10px 18px;border-radius:8px;font-size:16px;font-weight:bold;color:${C.white};background:${C.red};border:none;opacity:${state.loading ? 0.5 : 1};`,
        })
        sendBtn.textContent = '→'
        sendBtn.disabled = state.loading
        sendBtn.onclick = () => sendMessage()
        inputArea.append(input, sendBtn)

        // Focus input
        setTimeout(() => input.focus(), 100)
      }

      chatWindow.append(header, body)
      if (inputArea) chatWindow.appendChild(inputArea)
      root.appendChild(chatWindow)
    }

    // Floating knop
    if (!state.open) {
      const floatWrap = el('div', {
        style: 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;',
      })

      // Speech bubble
      const bubble = el('div', { style: 'position:relative;display:inline-block;margin-bottom:18px;' })
      const bubbleInner = el('div', {
        style: 'background:white;border:3.5px solid #111;border-radius:12px;padding:10px 16px;position:relative;',
      })
      const bubbleText = el('span', {
        style: 'font-family:Arial Black,Arial,sans-serif;font-size:12px;font-weight:900;color:#cc0000;display:block;white-space:nowrap;text-align:center;',
      })
      bubbleText.textContent = BUBBLE_TEXTS[state.bubbleTextIndex]
      const arrow = el('div', {
        style: 'position:absolute;bottom:-16px;right:32px;width:4px;height:16px;background:#111;border-radius:2px;',
      })
      bubbleInner.appendChild(bubbleText)
      bubble.append(bubbleInner, arrow)

      // 8-ball knop
      const ballBtn = el('button', {
        style: 'background:transparent;border:none;padding:0;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.6));transition:transform 0.2s;',
      })
      ballBtn.innerHTML = eightBallSVG(64, true)
      ballBtn.onmouseenter = () => { ballBtn.style.transform = 'scale(1.1)' }
      ballBtn.onmouseleave = () => { ballBtn.style.transform = 'scale(1)' }
      ballBtn.onclick = () => {
        state.open = true
        if (state.messages.length === 0) {
          state.messages = [{ role: 'assistant', content: t().welcome }]
        }
        render()
      }

      floatWrap.append(bubble, ballBtn)
      root.appendChild(floatWrap)
    }

    // Sluit knop onder chat
    if (state.open) {
      const closeWrap = el('div', { style: 'position:fixed;bottom:24px;right:24px;z-index:9999;' })
      const closeBtn = el('button', {
        style: `width:64px;height:64px;border-radius:50%;background:${C.black};border:2px solid ${C.border};display:flex;align-items:center;justify-content:center;color:${C.gray};font-size:20px;font-weight:bold;transition:transform 0.2s;`,
      })
      closeBtn.textContent = '✕'
      closeBtn.onmouseenter = () => { closeBtn.style.transform = 'scale(1.1)' }
      closeBtn.onmouseleave = () => { closeBtn.style.transform = 'scale(1)' }
      closeBtn.onclick = () => { state.open = false; render() }
      closeWrap.appendChild(closeBtn)
      root.appendChild(closeWrap)
    }
  }

  function el(tag, attrs = {}) {
    const element = document.createElement(tag)
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'class') element.className = val
      else if (key === 'style') element.style.cssText = val
      else if (key === 'type') element.type = val
      else if (key === 'placeholder') element.placeholder = val
      else if (key === 'title') element.title = val
      else element.setAttribute(key, val)
    })
    return element
  }

  function selectTopic(topic) {
    if (topic.id === 'anders') {
      state.stage = 'chat'
    } else if (topic.id === 'spelregels') {
      state.selectedTopic = topic
      state.messages.push({ role: 'assistant', content: t().spelregelsIntro })
      state.stage = 'spelregels'
    } else {
      state.selectedTopic = topic
      state.stage = 'questions'
    }
    render()
  }

  function resetChat() {
    state.stage = 'topics'
    state.selectedTopic = null
    state.selectedDiscipline = null
    state.messages = [{ role: 'assistant', content: t().welcome }]
    state.input = ''
    render()
  }

  async function sendMessage(text) {
    const userMessage = text || state.input
    if (!userMessage.trim()) return

    state.messages.push({ role: 'user', content: userMessage })
    state.input = ''
    state.loading = true
    state.stage = 'chat'
    render()

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.messages }),
      })
      const data = await response.json()
      state.messages.push({ role: 'assistant', content: data.reply })
    } catch (err) {
      state.messages.push({ role: 'assistant', content: t().error })
    } finally {
      state.loading = false
      render()
    }
  }

  // Bubble tekst wisselen
  setInterval(() => {
    if (!state.open) {
      state.bubbleTextIndex = (state.bubbleTextIndex + 1) % BUBBLE_TEXTS.length
      render()
    }
  }, 15000)

  // Initialiseer
  function init() {
    injectStyles()
    const root = document.createElement('div')
    root.id = 'mokum-widget-root'
    document.body.appendChild(root)
    state.messages = [{ role: 'assistant', content: t().welcome }]
    render()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()