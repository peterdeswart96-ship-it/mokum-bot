import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import BUBBLE_TEXTS from "../config/bubble-texts"
import translations from "../config/translations"
import cfg from "../../public/configs/default.json"

const API_URL = import.meta.env.VITE_API_URL || "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"

// Testmodus: aan/uit via ?mokumtest=1 / ?mokumtest=0 (bewaard per browser).
// Aan = elke vraag van dit apparaat wordt als testvraag opgeslagen (#test-prefix; backend strip + isTest).
try {
  const tp = new URLSearchParams(window.location.search).get("mokumtest")
  if (tp === "1") localStorage.setItem("mokum-testmode", "1")
  else if (tp === "0") localStorage.removeItem("mokum-testmode")
} catch (e) {}
function testModusAan() { try { return localStorage.getItem("mokum-testmode") === "1" } catch (e) { return false } }

const C = {
  red:        "#cc0000",
  redDark:    "#990000",
  black:      "#0a0a0a",
  blackCard:  "#161616",
  blackInput: "#1f1f1f",
  border:     "#2a2a2a",
  white:      "#ffffff",
  gray:       "#888888",
  anthracite: "#26262b",
}

// Config-bron (#75): positie uit public/configs/default.json (gedeeld met widget.js)
const WIDGET_CONFIG = {
  bottom: cfg.position.offsetY + "px",
  right:  cfg.position.offsetX + "px",
  width:  cfg.position.width,
}

// Rate-limit: max aantal vragen binnen een tijdvenster (anti-spam)
const RATE_MAX = 2
const RATE_WINDOW = 30000 // 30 seconden
// Herhaalde identieke vraag: vanaf de 2e herhaling (3e keer) binnen het venster -> Easy tiger
const DUP_MAX = 2
const DUP_WINDOW = 60000 // 60 seconden

// Rubrieken gegroepeerd per categorie — uit de gedeelde config (#75)
const CATEGORIES = cfg.categories

// Responsive breedte: op mobiel (< 480px) bijna volledige schermbreedte
function getWidgetWidth(expanded) {
  if (expanded) return "min(80vw, 900px)"
  if (typeof window !== "undefined" && window.innerWidth < 480) {
    return `${window.innerWidth - 16}px`  // 8px marge links en rechts
  }
  return WIDGET_CONFIG.width
}

// Responsive hoogte: op mobiel minder hoog zodat toetsenbord niet alles bedekt
function getWidgetHeight(expanded) {
  if (expanded) return "80vh"
  if (typeof window !== "undefined" && window.innerWidth < 480) {
    return "75vh"
  }
  return "580px"
}

// Responsive right offset: op mobiel gecentreerd
function getWidgetRight() {
  if (typeof window !== "undefined" && window.innerWidth < 480) {
    return "8px"
  }
  return WIDGET_CONFIG.right
}

const INTERN_HASH = "3bed2cb3a3acf7b6a8ef408420cc682d5520e26976d354254f528c965612054f"
const DEFAULT_LANG = cfg.language.default

// SVG vlaggen — werken altijd, ook zonder emoji-ondersteuning
function FlagNL({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6" width={size} height={Math.round(size * 6/9)}>
      <rect width="9" height="2" y="0" fill="#AE1C28"/>
      <rect width="9" height="2" y="2" fill="#FFFFFF"/>
      <rect width="9" height="2" y="4" fill="#21468B"/>
    </svg>
  )
}

function FlagGB({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width={size} height={Math.round(size * 30/60)}>
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  )
}

// Twee vlaggen naast elkaar — actieve taal heeft rode omlijning
function LanguageSwitcher({ lang, onSwitch }) {
  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {[
        { code: "nl", Flag: FlagNL, title: "Nederlands" },
        { code: "en", Flag: FlagGB, title: "English" },
      ].map(({ code, Flag, title }) => {
        const isActive = lang === code
        return (
          <button
            key={code}
            onClick={() => !isActive && onSwitch(code)}
            title={title}
            style={{
              background: "none",
              border: isActive ? `1px solid ${C.red}` : `1px solid transparent`,
              borderRadius: "3px",
              cursor: isActive ? "default" : "pointer",
              padding: "1px",
              lineHeight: 0,
              display: "flex",
              alignItems: "center",
              transition: "border-color 0.15s ease",
            }}
          >
            <Flag size={18} />
          </button>
        )
      })}
    </div>
  )
}

function EightBallIcon({ size = 64, animate = false }) {
  const animStyle = animate ? {
    animation: "mokumBounce 1.2s ease-in-out 3, mokumIdle 3s ease-in-out 3.6s infinite",
  } : {}

  return (
    <>
      <style>{`
        @keyframes mokumBounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-18px); }
          60% { transform: translateY(-10px); }
        }
        @keyframes mokumIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
      <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" style={animStyle}>
        <title>Mokum Magic 8 Ball</title>
        <defs>
          <radialGradient id="ballGrad" cx="38%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#3a3a3a"/><stop offset="40%" stopColor="#111111"/><stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="circleGrad" cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#ffffff"/><stop offset="70%" stopColor="#f0f0f0"/><stop offset="100%" stopColor="#cccccc"/>
          </radialGradient>
          <radialGradient id="hatBodyGrad" cx="38%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#2e2e2e"/><stop offset="50%" stopColor="#141414"/><stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="brimGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#222222"/><stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="shineGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16"/><stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="140" r="68" fill="url(#ballGrad)"/>
        <ellipse cx="80" cy="118" rx="19" ry="12" fill="url(#shineGrad)" transform="rotate(-20,80,118)"/>
        <circle cx="100" cy="144" r="24" fill="url(#circleGrad)"/>
        <text x="100" y="153" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fontWeight="700" fill="#0a0a0a">8</text>
        <circle cx="100" cy="140" r="68" fill="none" stroke="#2a2a2a" strokeWidth="0.8"/>
        <ellipse cx="100" cy="76" rx="54" ry="10" fill="url(#brimGrad)"/>
        <ellipse cx="100" cy="76" rx="54" ry="10" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.25"/>
        <ellipse cx="86" cy="73" rx="22" ry="3.5" fill="#ffffff" opacity="0.06" transform="rotate(-4,86,73)"/>
        <rect x="60" y="6" width="80" height="71" rx="3" fill="url(#hatBodyGrad)"/>
        <ellipse cx="100" cy="6" rx="40" ry="6.5" fill="#181818"/>
        <ellipse cx="100" cy="6" rx="40" ry="6.5" fill="none" stroke="#282828" strokeWidth="0.5"/>
        <rect x="63" y="9" width="16" height="63" rx="2" fill="#ffffff" opacity="0.035"/>
        <rect x="60" y="6" width="80" height="71" rx="3" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.25"/>
        <g transform="translate(100,41) scale(0.56) translate(-100,-38)">
          <circle cx="100" cy="38" r="28" fill="#0a0a0a"/>
          <circle cx="100" cy="38" r="28" fill="none" stroke="#ffffff" strokeWidth="2.2"/>
          <g transform="translate(91,27)">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
          </g>
          <g transform="translate(109,27)">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
          </g>
          <g transform="translate(100,37)">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#cc0000" strokeWidth="2.2" strokeLinecap="round"/>
          </g>
          <text x="100" y="52" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" fill="#ffffff" letterSpacing="1.5">MOKUM</text>
        </g>
      </svg>
    </>
  )
}

function SpeechBubble({ hovered, text, lang }) {
  const t = translations[lang]
  const ArrowSVG = () => (
    <svg style={{ position: "absolute", bottom: "-16px", right: "32px" }} width="4" height="16" viewBox="0 0 4 16" xmlns="http://www.w3.org/2000/svg">
      <line x1="2" y1="0" x2="2" y2="16" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )

  if (!hovered) {
    return (
      <div style={{ position: "relative", display: "inline-block", marginBottom: "18px" }}>
        <div style={{ backgroundColor: "white", border: "3.5px solid #111", borderRadius: "12px", padding: "10px 16px", boxSizing: "border-box", position: "relative" }}>
          <span style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: "12px", fontWeight: "900", color: "#cc0000", display: "block", whiteSpace: "nowrap", textAlign: "center" }}>{text}</span>
        </div>
        <ArrowSVG />
      </div>
    )
  }

  return (
    <div style={{ position: "relative", display: "inline-block", marginBottom: "20px", width: "180px" }}>
      <div style={{ backgroundColor: "white", border: "3.5px solid #111", borderRadius: "12px", padding: "12px 16px", boxSizing: "border-box", position: "relative" }}>
        <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: "10px", fontWeight: "900", color: "#cc0000", marginBottom: "8px" }}>{t.hoverTitle}</div>
        <div style={{ height: "1px", backgroundColor: "#eee", marginBottom: "8px" }} />
        {t.hoverInfo.map((item) => (
          <div key={item} style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#111", marginBottom: "5px" }}>{item}</div>
        ))}
      </div>
      <ArrowSVG />
    </div>
  )
}

const markdownStyles = {
  p: { margin: "0 0 6px 0", lineHeight: "1.55" },
  strong: { color: "#ffffff", fontWeight: "700" },
  ul: { margin: "4px 0", paddingLeft: "16px" },
  ol: { margin: "4px 0", paddingLeft: "16px" },
  li: { margin: "2px 0", lineHeight: "1.6" },
  a: { color: "#ff6b6b", textDecoration: "underline" },
}

// Carousel: meerdere foto's → toon er één + 'meer/more'-knop rechtsonder om te bladeren
function FotoCarousel({ images, lang }) {
  const [idx, setIdx] = useState(0)
  const more = lang === "en" ? "more" : "meer"
  const img = images[idx % images.length]
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", margin: "6px 0" }}>
      <a href={img.src} target="_blank" rel="noopener noreferrer">
        <img src={img.src} alt={img.alt} style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", display: "block", cursor: "zoom-in" }} loading="lazy" />
      </a>
      <button type="button" onClick={(e) => { e.preventDefault(); setIdx((idx + 1) % images.length) }}
        style={{ position: "absolute", right: "8px", bottom: "12px", background: "rgba(0,0,0,0.72)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", lineHeight: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
        {more} {(idx % images.length) + 1}/{images.length} ›
      </button>
    </div>
  )
}

function BotMessage({ content, lang }) {
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
  const images = [...content.matchAll(imgRe)].map(m => ({ alt: m[1], src: m[2] }))
  const textPart = images.length >= 2 ? content.replace(imgRe, "").trim() : content
  const md = (
    <ReactMarkdown components={{
      p: ({ children }) => <p style={markdownStyles.p}>{children}</p>,
      strong: ({ children }) => <strong style={markdownStyles.strong}>{children}</strong>,
      ul: ({ children }) => <ul style={markdownStyles.ul}>{children}</ul>,
      ol: ({ children }) => <ol style={markdownStyles.ol}>{children}</ol>,
      li: ({ children }) => <li style={markdownStyles.li}>{children}</li>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={markdownStyles.a}>{children}</a>,
      img: ({ src, alt }) => <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={alt} style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", margin: "6px 0", display: "block", cursor: "zoom-in" }} loading="lazy" /></a>,
    }}>{textPart}</ReactMarkdown>
  )
  return (
    <div style={{ maxWidth: "85%", padding: "6px", borderRadius: "12px 12px 12px 2px", fontSize: "14px", lineHeight: "1.55", backgroundColor: "#2d2d2d", color: C.white, border: "none" }}>
      {md}
      {images.length >= 2 && <FotoCarousel images={images} lang={lang} />}
    </div>
  )
}

function ChipButton({ onClick, children, accent = false }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      fontSize: "13px", fontWeight: 400, padding: "8px 14px", borderRadius: "20px",
      backgroundColor: accent ? (hov ? C.redDark : C.red) : (hov ? "#2a2a2a" : "transparent"),
      color: C.white, border: accent ? "none" : `1px solid ${hov ? "#444" : C.border}`,
      cursor: "pointer", transition: "all 0.15s ease", textAlign: "left", lineHeight: "1.4",
    }}>
      {children}
    </button>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [stage, setStage] = useState("topics")
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState(null)
  const [internUnlocked, setInternUnlocked] = useState(false)
  const [internPwd, setInternPwd] = useState("")
  const [internPwdError, setInternPwdError] = useState(false)
  const [size, setSize] = useState("middel")
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [bubbleTextIndex, setBubbleTextIndex] = useState(0)
  const [lang, setLang] = useState(DEFAULT_LANG)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 800
  )

  // Luister naar schermgrootte wijzigingen (bijv. draaien telefoon)
  useEffect(() => {
    function handleResize() { setWindowWidth(window.innerWidth) }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const t = translations[lang]

  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: translations[DEFAULT_LANG].welcome },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [, setDvVersie] = useState(0)
  const bottomRef = useRef(null)
  const sendTimesRef = useRef([])
  const lastSentQuestionRef = useRef("")
  const dupTimesRef = useRef([])

  // Voorbeeldvragen per rubriek dynamisch laden uit het dashboard (issue #33).
  // Overschrijft alleen onderwerpen met beheer-vragen; bij falen/leeg blijven de
  // hardcoded voorbeeldvragen uit translations.js staan (fallback).
  useEffect(() => {
    let afgebroken = false
    fetch(`${API_URL}/api/standaardvragen`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (afgebroken) return
        const vragen = data && Array.isArray(data.vragen) ? data.vragen : null
        if (!vragen || !vragen.length) return
        const perLang = { nl: {}, en: {} }
        vragen.filter((v) => v && v.actief !== false).forEach((v) => {
          const ond = v.onderwerp
          if (!ond) return
          ;["nl", "en"].forEach((l) => {
            const tekst = v.vraag && v.vraag[l]
            if (!tekst) return
            ;(perLang[l][ond] = perLang[l][ond] || []).push({ q: tekst, volg: v.volgnummer || 0 })
          })
        })
        ;["nl", "en"].forEach((l) => {
          const T = translations[l]
          if (!T || !T.questions) return
          Object.keys(perLang[l]).forEach((ond) => {
            const arr = perLang[l][ond].sort((a, b) => a.volg - b.volg).map((x) => x.q)
            if (arr.length) T.questions[ond] = arr
          })
        })
        setDvVersie((n) => n + 1)
      })
      .catch(() => {})
    return () => { afgebroken = true }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, stage])

  useEffect(() => {
    if (open) return
    const interval = setInterval(() => {
      setBubbleTextIndex((i) => (i + 1) % BUBBLE_TEXTS.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [open])

  function switchLanguage(newLang) {
    setLang(newLang)
    setMessages([{ role: "assistant", content: translations[newLang].welcome }])
    setStage("topics")
    setSelectedTopic(null)
    setSelectedDiscipline(null)
    setInternUnlocked(false)
    setInternPwd("")
    setInternPwdError(false)
  }

  async function sendMessage(text) {
    const userMessage = text || input
    if (!userMessage.trim()) return
    // Blokkeer terwijl er al een antwoord wordt opgehaald (geen 5x dezelfde request bij snel klikken)
    if (loading) return

    const genormaliseerd = userMessage.trim().toLowerCase()

    // Dezelfde vraag mag niet direct opnieuw; bij volhardend herhalen -> Easy tiger
    if (genormaliseerd === lastSentQuestionRef.current) {
      const nu = Date.now()
      dupTimesRef.current = dupTimesRef.current.filter((tijd) => nu - tijd < DUP_WINDOW)
      dupTimesRef.current.push(nu)
      let melding = t.duplicateMsg
      if (dupTimesRef.current.length >= DUP_MAX) {
        const wacht = Math.ceil((DUP_WINDOW - (nu - dupTimesRef.current[0])) / 1000)
        melding = t.rateLimitMsg.replace("{s}", wacht)
      }
      setMessages([...messages, { role: "user", content: userMessage }, { role: "assistant", content: melding }])
      setInput("")
      setStage("chat")
      return
    }

    // Rate-limit: te veel vragen achter elkaar -> timeout-bericht
    const now = Date.now()
    sendTimesRef.current = sendTimesRef.current.filter((tijd) => now - tijd < RATE_WINDOW)
    if (sendTimesRef.current.length >= RATE_MAX) {
      const wacht = Math.ceil((RATE_WINDOW - (now - sendTimesRef.current[0])) / 1000)
      setMessages([...messages, { role: "user", content: userMessage }, { role: "assistant", content: t.rateLimitMsg.replace("{s}", wacht) }])
      setInput("")
      setStage("chat")
      return
    }
    sendTimesRef.current.push(now)
    lastSentQuestionRef.current = genormaliseerd
    dupTimesRef.current = []

    const newMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStage("chat")
    const callChat = async () => {
      // Testmodus: markeer de laatste vraag met #test (state blijft schoon voor weergave)
      const payloadMsgs = testModusAan()
        ? newMessages.map((m, idx) => (idx === newMessages.length - 1 && m.role === "user") ? { ...m, content: "#test " + m.content } : m)
        : newMessages
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMsgs }),
      })
      if (!response.ok) throw new Error("http " + response.status)
      const data = await response.json()
      if (!data || typeof data.reply !== "string") throw new Error("geen antwoord")
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
      setMessages([...newMessages, { role: "assistant", content: reply }])
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: t.error }])
    } finally {
      setLoading(false)
    }
  }

  function selectTopic(topic) {
    if (topic.id === "anders") {
      setStage("chat")
    } else if (topic.id === "spelregels") {
      setSelectedTopic(topic)
      setMessages(prev => [...prev, { role: "assistant", content: t.spelregelsIntro }])
      setStage("spelregels")
    } else if (topic.id === "intern" && !internUnlocked) {
      setSelectedTopic(topic)
      setStage("intern-login")
    } else {
      setSelectedTopic(topic)
      setStage("questions")
    }
  }

  async function checkInternPwd() {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(internPwd))
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
    if (hashHex === INTERN_HASH) {
      setInternUnlocked(true)
      setInternPwdError(false)
      setInternPwd("")
      setSelectedTopic({ id: "intern", emoji: "🔒", label: lang === "nl" ? "Intern" : "Internal" })
      setStage("questions")
    } else {
      setInternPwdError(true)
    }
  }

  function resetChat() {
    setStage("topics")
    setSelectedTopic(null)
    setSelectedDiscipline(null)
    setInternUnlocked(false)
    setInternPwd("")
    setInternPwdError(false)
    setMessages([{ role: "assistant", content: t.welcome }])
    setInput("")
    setExamplesOpen(false)
  }

  const isMobile = windowWidth < 480
  const chatWidth = isMobile
    ? `${windowWidth - 16}px`
    : (size === "groot" ? "calc(100vw - 32px)" : size === "klein" ? "380px" : "460px")
  const chatHeight = size === "groot"
    ? (isMobile ? "calc(100dvh - 90px - 16px)" : "calc(100dvh - 20px)")
    : `min(${isMobile ? (size === "klein" ? 460 : 600) : (size === "klein" ? 520 : 660)}px, calc(100dvh - 90px - 80px - 16px))`
  const chatRight = isMobile ? "8px" : WIDGET_CONFIG.right

  return (
    <div style={{ position: "fixed", bottom: open ? (isMobile ? "8px" : "12px") : WIDGET_CONFIG.bottom, right: chatRight, zIndex: open ? 2147483000 : 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", width: chatWidth }}>

      {open && (
        <div style={{
          marginBottom: "0",
          width: chatWidth,
          // Hoogte: dvh houdt rekening met Safari adresbalk op iPhone
          // 90px = bottom widget, 80px = sluitknop + marge, 16px = adembreedte bovenkant
          height: chatHeight,
          borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px #2a2a2a",
          display: "flex", flexDirection: "column",
          backgroundColor: C.black,
          transition: "width 0.3s ease, height 0.3s ease",
        }}>

          {/* Header */}
          <div style={{ backgroundColor: C.blackCard, borderBottom: `1px solid ${C.border}`, padding: "2px 9px", display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: "6px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flexShrink: 1, overflow: "hidden", background: C.anthracite, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "1px 7px" }}>
              <EightBallIcon size={14} />
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontWeight: "800", color: C.white, fontSize: "12px", lineHeight: 1.1, letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>MOKUM MAGIC 8 BALL</div>
              </div>
              {testModusAan() && <div style={{ fontSize: "10px", color: "#7bd88f", background: "#143020", border: "1px solid #2f5a36", borderRadius: "6px", padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>🧪 test</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0, gap: isMobile ? "2px" : "3px", background: C.anthracite, border: `1px solid ${C.border}`, borderRadius: "6px", padding: isMobile ? "1px 5px" : "1px 6px" }}>
              <button
                onClick={resetChat}
                title={lang === "nl" ? "Terug naar home" : "Back to home"}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "5px", color: C.gray, cursor: "pointer", fontSize: "11px", padding: "0 5px", lineHeight: 1.3 }}
              >🏠</button>

              <LanguageSwitcher lang={lang} onSwitch={switchLanguage} />

              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", color: C.gray, cursor: "pointer", fontSize: "13px", fontWeight: "bold", padding: "1px", lineHeight: 1 }}
              >✕</button>
            </div>
          </div>

          {/* Chat gebied */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "user" ? (
                  <div style={{ maxWidth: "85%", padding: "6px", borderRadius: "12px 12px 2px 12px", fontSize: "14px", lineHeight: "1.55", backgroundColor: C.red, color: C.white }}>{msg.content}</div>
                ) : (
                  <BotMessage content={msg.content} lang={lang} />
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", fontSize: "14px", backgroundColor: C.blackCard, color: C.gray, border: `1px solid ${C.border}` }}>{t.typing}</div>
              </div>
            )}

            {stage === "topics" && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: 0 }}>
                {/* Inklapbare knop "Voorbeeldvragen per rubriek" — compact, strak onder de header */}
                <button onClick={() => setExamplesOpen((o) => !o)} style={{
                  width: "100%", textAlign: "left", background: C.anthracite, border: `2px solid ${C.red}`,
                  borderRadius: "9px", color: C.white, fontSize: "12.5px", fontWeight: 700, padding: "6px 12px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
                }}>
                  <span>📋 {t.examplesBtn}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <span style={{ background: C.red, color: "#fff", fontSize: "9px", fontWeight: 800, padding: "1px 5px", borderRadius: "6px", letterSpacing: "0.05em" }}>NEW</span>
                    <span style={{ fontSize: "11px" }}>{examplesOpen ? "▲" : "▼"}</span>
                  </span>
                </button>

                {/* Categorie-overzicht (alleen bij uitklappen) */}
                {examplesOpen && CATEGORIES.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ marginTop: "6px", background: C.anthracite, border: `2px solid ${C.red}`, borderRadius: "6px", padding: "6px 10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: C.white, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        {cat.emoji} {(t.catTitles && t.catTitles[cat.id]) || cat.id}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {cat.topics.map((tid) => {
                        const topic = t.topics.find((tp) => tp.id === tid)
                        if (!topic) return null
                        const isStar = cat.starTopics && cat.starTopics.indexOf(tid) !== -1
                        const isNew = cat.newTopics && cat.newTopics.indexOf(tid) !== -1
                        return (
                          <ChipButton key={tid} onClick={() => selectTopic(topic)}>
                            {topic.emoji} {topic.label}
                            {isStar && (
                              <span style={{ background: "#e0a93b", color: "#1a1a1a", fontSize: "9px", fontWeight: 800, padding: "1px 5px", borderRadius: "5px", marginLeft: "5px", verticalAlign: "middle" }}>★</span>
                            )}
                            {!isStar && isNew && (
                              <span style={{ background: C.red, color: "#fff", fontSize: "8px", fontWeight: 800, padding: "1px 4px", borderRadius: "4px", marginLeft: "5px", verticalAlign: "middle" }}>NEW</span>
                            )}
                          </ChipButton>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stage === "intern-login" && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "13px", color: C.white, marginBottom: "4px" }}>🔒 {t.internPwdPrompt}</div>
                <input
                  type="password"
                  value={internPwd}
                  onChange={(e) => setInternPwd(e.target.value)}
                  onKeyDown={async (e) => { if (e.key === "Enter") await checkInternPwd() }}
                  placeholder={lang === "nl" ? "Wachtwoord..." : "Password..."}
                  autoFocus
                  style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "14px", color: C.white, backgroundColor: C.blackInput, border: `1px solid ${internPwdError ? C.red : C.border}`, outline: "none" }}
                />
                {internPwdError && <div style={{ fontSize: "12px", color: C.red }}>{t.internPwdError}</div>}
                <ChipButton onClick={checkInternPwd} accent>{t.internPwdBtn}</ChipButton>
                <button onClick={() => setStage("topics")} style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>{t.backButton}</button>
              </div>
            )}

            {stage === "spelregels" && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                {t.spelregelsDisciplines.map((disc) => (
                  <ChipButton key={disc.id} onClick={() => { setSelectedDiscipline(disc); setStage("spelregels-questions") }}>
                    {disc.emoji} {disc.label}
                  </ChipButton>
                ))}
                <ChipButton onClick={() => setStage("chat")} accent>{t.askOther}</ChipButton>
                <button onClick={() => setStage("topics")} style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>{t.backButton}</button>
              </div>
            )}

            {stage === "spelregels-questions" && selectedDiscipline && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "12px", color: C.gray, marginBottom: "2px" }}>{selectedDiscipline.emoji} {selectedDiscipline.label}</div>
                {(t.spelregelsQuestions[selectedDiscipline.id] || []).map((q) => (
                  <ChipButton key={q} onClick={() => sendMessage(q)}>{q}</ChipButton>
                ))}
                <ChipButton onClick={() => setStage("chat")} accent>{t.askOther}</ChipButton>
                <button onClick={() => setStage("spelregels")} style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>{t.spelregelsBack}</button>
              </div>
            )}

            {stage === "questions" && selectedTopic && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "12px", color: C.gray, marginBottom: "2px" }}>
                  {selectedTopic.emoji} {t.topics.find(tp => tp.id === selectedTopic.id)?.label}
                </div>
                {(t.questions[selectedTopic.id] || []).map((q) => (
                  <ChipButton key={q} onClick={() => sendMessage(q)}>{q}</ChipButton>
                ))}
                <ChipButton onClick={() => setStage("chat")} accent>{t.askOther}</ChipButton>
                <button onClick={() => setStage("topics")} style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>{t.backButton}</button>
              </div>
            )}

            {stage === "chat" && !loading && (
              <button onClick={resetChat} style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>{t.backToTopics}</button>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input + venster-formaat — alles in één rij, strak onderaan */}
          <div style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.blackCard, padding: "2px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage() }}
                placeholder={t.placeholder}
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", height: "30px", padding: "0 12px", borderRadius: "8px", fontSize: "14px", color: C.white, backgroundColor: C.blackInput, border: `1px solid ${C.border}`, outline: "none" }}
              />
              <div style={{ display: "flex", gap: "3px", alignItems: "stretch", flexShrink: 0 }}>
                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  style={{ boxSizing: "border-box", height: "30px", width: "64px", flex: "0 0 64px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", color: C.white, backgroundColor: C.red, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
                >→</button>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  style={{ boxSizing: "border-box", height: "30px", width: "64px", flex: "0 0 64px", WebkitAppearance: "none", appearance: "none", background: `${C.blackInput} url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='8'%20height='5'%20viewBox='0%200%208%205'%3E%3Cpath%20d='M0%200l4%205%204-5z'%20fill='%23aaaaaa'/%3E%3C/svg%3E") no-repeat right 6px center`, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.white, fontSize: "11.5px", textAlign: "center", textAlignLast: "center", padding: "0 13px 0 5px", cursor: "pointer" }}
                >
                  <option value="klein">Small</option>
                  <option value="middel">Medium</option>
                  <option value="groot">MAX</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating knop */}
      {!open && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <SpeechBubble hovered={hovered} text={BUBBLE_TEXTS[bubbleTextIndex]} lang={lang} />
          <button onClick={() => setOpen(true)} style={{ backgroundColor: "transparent", border: "none", padding: 0, cursor: "pointer", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))", transform: hovered ? "scale(1.1)" : "scale(1)", transition: "transform 0.2s" }}>
            <EightBallIcon size={64} animate={true} />
          </button>
        </div>
      )}


    </div>
  )
}