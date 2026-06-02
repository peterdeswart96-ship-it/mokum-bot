import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import BUBBLE_TEXTS from "../config/bubble-texts"
import translations from "../config/translations"

const API_URL = import.meta.env.VITE_API_URL || "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"

const C = {
  red:        "#cc0000",
  redDark:    "#990000",
  black:      "#0a0a0a",
  blackCard:  "#161616",
  blackInput: "#1f1f1f",
  border:     "#2a2a2a",
  white:      "#ffffff",
  gray:       "#888888",
}

const FLAGS = { nl: "🇳🇱", en: "🇬🇧" }

function detectLanguage() {
  const browserLang = navigator.language?.toLowerCase() || "en"
  return browserLang.startsWith("nl") ? "nl" : "en"
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
      <svg
        width={size}
        height={Math.round(size * 1.1)}
        viewBox="0 0 200 220"
        xmlns="http://www.w3.org/2000/svg"
        style={animStyle}
      >
        <title>Mokum Magic 8 Ball</title>
        <defs>
          <radialGradient id="ballGrad" cx="38%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#3a3a3a"/>
            <stop offset="40%" stopColor="#111111"/>
            <stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="circleGrad" cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="70%" stopColor="#f0f0f0"/>
            <stop offset="100%" stopColor="#cccccc"/>
          </radialGradient>
          <radialGradient id="hatBodyGrad" cx="38%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#2e2e2e"/>
            <stop offset="50%" stopColor="#141414"/>
            <stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="brimGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#222222"/>
            <stop offset="100%" stopColor="#0a0a0a"/>
          </radialGradient>
          <radialGradient id="shineGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
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

// Pijltje: zwarte rand, witte vulling, punt rechtsonder
function Arrow() {
  return (
    <>
      {/* Zwarte buitenrand */}
      <div style={{
        position: "absolute",
        bottom: "-19px",
        right: "13px",
        width: 0,
        height: 0,
        borderTop: "19px solid #111",
        borderLeft: "16px solid transparent",
        borderRight: "0px solid transparent",
      }} />
      {/* Witte vulling iets kleiner */}
      <div style={{
        position: "absolute",
        bottom: "-14px",
        right: "15px",
        width: 0,
        height: 0,
        borderTop: "14px solid white",
        borderLeft: "12px solid transparent",
        borderRight: "0px solid transparent",
      }} />
    </>
  )
}

function SpeechBubble({ hovered, text, lang }) {
  const t = translations[lang]
  return (
    <div style={{ position: "relative", marginBottom: "2px" }}>
      {!hovered ? (
        <div style={{
          backgroundColor: "white",
          border: "3.5px solid #111",
          borderRadius: "12px",
          padding: "10px 14px",
          boxSizing: "border-box",
          position: "relative",
          display: "inline-block",
          maxWidth: "200px",
          alignSelf: "flex-start",
          overflow: "visible",
        }}>
          <span style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontSize: "12px",
            fontWeight: "900",
            color: "#cc0000",
            display: "block",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}>{text}</span>
          <Arrow />
        </div>
      ) : (
        <div style={{
          backgroundColor: "white",
          border: "3.5px solid #111",
          borderRadius: "12px",
          padding: "12px 16px",
          boxSizing: "border-box",
          position: "relative",
          display: "inline-block",
          width: "180px",
        }}>
          <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: "10px", fontWeight: "900", color: "#cc0000", marginBottom: "8px" }}>
            {t.hoverTitle}
          </div>
          <div style={{ height: "1px", backgroundColor: "#eee", marginBottom: "8px" }}/>
          {t.hoverInfo.map((item) => (
            <div key={item} style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#111", marginBottom: "5px" }}>{item}</div>
          ))}
          <Arrow />
        </div>
      )}
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

function BotMessage({ content }) {
  return (
    <div style={{
      maxWidth: "85%",
      padding: "10px 14px",
      borderRadius: "12px 12px 12px 2px",
      fontSize: "14px",
      lineHeight: "1.55",
      backgroundColor: C.blackCard,
      color: C.white,
      border: `1px solid ${C.border}`,
    }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={markdownStyles.p}>{children}</p>,
          strong: ({ children }) => <strong style={markdownStyles.strong}>{children}</strong>,
          ul: ({ children }) => <ul style={markdownStyles.ul}>{children}</ul>,
          ol: ({ children }) => <ol style={markdownStyles.ol}>{children}</ol>,
          li: ({ children }) => <li style={markdownStyles.li}>{children}</li>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={markdownStyles.a}>{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ChipButton({ onClick, children, accent = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: "13px",
        padding: "8px 14px",
        borderRadius: "20px",
        backgroundColor: accent
          ? (hovered ? C.redDark : C.red)
          : (hovered ? "#2a2a2a" : "transparent"),
        color: C.white,
        border: accent ? "none" : `1px solid ${hovered ? "#444" : C.border}`,
        cursor: "pointer",
        transition: "all 0.15s ease",
        textAlign: "left",
        lineHeight: "1.4",
      }}
    >
      {children}
    </button>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [stage, setStage] = useState("topics")
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [bubbleTextIndex, setBubbleTextIndex] = useState(0)
  const [lang, setLang] = useState(detectLanguage)

  const t = translations[lang]

  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: translations[detectLanguage()].welcome },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

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

  function switchLanguage() {
    const newLang = lang === "nl" ? "en" : "nl"
    setLang(newLang)
    setShowLangMenu(false)
    setMessages([{ role: "assistant", content: translations[newLang].welcome }])
    setStage("topics")
    setSelectedTopic(null)
  }

  async function sendMessage(text) {
    const userMessage = text || input
    if (!userMessage.trim()) return

    const newMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStage("chat")

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await response.json()
      setMessages([...newMessages, { role: "assistant", content: data.reply }])
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: t.error },
      ])
    } finally {
      setLoading(false)
    }
  }

  function selectTopic(topic) {
    if (topic.id === "anders") {
      setStage("chat")
    } else {
      setSelectedTopic(topic)
      setStage("questions")
    }
  }

  function resetChat() {
    setStage("topics")
    setSelectedTopic(null)
    setMessages([{ role: "assistant", content: t.welcome }])
    setInput("")
  }

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", width: "380px" }}>

      {open && (
        <div style={{
          marginBottom: "16px",
          width: expanded ? "min(80vw, 900px)" : "380px",
          height: expanded ? "80vh" : "580px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px #2a2a2a",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.black,
          transition: "width 0.3s ease, height 0.3s ease",
        }}>

          {/* Header */}
          <div style={{
            backgroundColor: C.blackCard,
            borderBottom: `1px solid ${C.border}`,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <EightBallIcon size={36} />
              <div>
                <div style={{ fontWeight: "800", color: C.white, fontSize: "14px", letterSpacing: "0.06em" }}>MOKUM MAGIC 8 BALL</div>
                <div style={{ color: C.red, fontSize: "11px", marginTop: "1px" }}>Pool & Darts Amsterdam</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

              {/* Taalwisselaar met vlaggetje */}
              <button
                onClick={switchLanguage}
                title={lang === "nl" ? "Switch to English" : "Naar Nederlands"}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: "6px",
                  color: C.white,
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "3px 8px",
                  lineHeight: 1.4,
                }}
              >
                {FLAGS[lang === "nl" ? "en" : "nl"]}
              </button>

              {/* Expand knop */}
              <button
                onClick={() => setExpanded(!expanded)}
                title={expanded ? "Verkleinen" : "Maximaliseren"}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: "6px",
                  color: C.gray,
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px 8px",
                }}
              >
                {expanded ? "⊡" : "⊞"}
              </button>

              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: C.gray,
                cursor: "pointer", fontSize: "18px", fontWeight: "bold",
                padding: "4px", lineHeight: 1,
              }}>✕</button>
            </div>
          </div>

          {/* Chat gebied */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "user" ? (
                  <div style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "12px 12px 2px 12px",
                    fontSize: "14px",
                    lineHeight: "1.55",
                    backgroundColor: C.red,
                    color: C.white,
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  <BotMessage content={msg.content} />
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "12px 12px 12px 2px",
                  fontSize: "14px",
                  backgroundColor: C.blackCard,
                  color: C.gray,
                  border: `1px solid ${C.border}`,
                }}>
                  {t.typing}
                </div>
              </div>
            )}

            {/* Stap 1: Onderwerpknoppen */}
            {stage === "topics" && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {t.topics.map((topic) => (
                  <ChipButton key={topic.id} onClick={() => selectTopic(topic)}>
                    {topic.emoji} {topic.label}
                  </ChipButton>
                ))}
              </div>
            )}

            {/* Stap 2: Voorgestelde vragen */}
            {stage === "questions" && selectedTopic && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "12px", color: C.gray, marginBottom: "2px" }}>
                  {selectedTopic.emoji} {t.topics.find(tp => tp.id === selectedTopic.id)?.label}
                </div>
                {(t.questions[selectedTopic.id] || []).map((q) => (
                  <ChipButton key={q} onClick={() => sendMessage(q)}>
                    {q}
                  </ChipButton>
                ))}
                <ChipButton onClick={() => setStage("chat")} accent>
                  {t.askOther}
                </ChipButton>
                <button
                  onClick={() => setStage("topics")}
                  style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}
                >
                  {t.backButton}
                </button>
              </div>
            )}

            {/* Terug knop in chat */}
            {stage === "chat" && messages.length <= 3 && !loading && (
              <button
                onClick={resetChat}
                style={{ background: "none", border: "none", color: C.gray, fontSize: "12px", cursor: "pointer", padding: "4px 0", textAlign: "left" }}
              >
                {t.backToTopics}
              </button>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {(stage === "chat" || stage === "questions") && (
            <div style={{
              borderTop: `1px solid ${C.border}`,
              backgroundColor: C.blackCard,
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={t.placeholder}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: C.white,
                  backgroundColor: C.blackInput,
                  border: `1px solid ${C.border}`,
                  outline: "none",
                }}
              />
              <button onClick={() => sendMessage()} disabled={loading} style={{
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                color: C.white,
                backgroundColor: C.red,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}>→</button>
            </div>
          )}
        </div>
      )}

      {/* Floating knop */}
      {!open && (
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <SpeechBubble hovered={hovered} text={BUBBLE_TEXTS[bubbleTextIndex]} lang={lang} />
          <button
            onClick={() => setOpen(true)}
            style={{
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))",
              transform: hovered ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.2s",
            }}>
            <EightBallIcon size={64} animate={true} />
          </button>
        </div>
      )}

      {/* Sluit knop */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          style={{
            marginTop: "8px",
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: C.black,
            border: `2px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.gray,
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          ✕
        </button>
      )}
    </div>
  )
}