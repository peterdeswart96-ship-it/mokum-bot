import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

const API_URL = import.meta.env.VITE_API_URL || "https://mokum-bot-api-enchhkeydye0fnek.westeurope-01.azurewebsites.net"

const QUICK_REPLIES = [
  "Wat zijn de openingstijden?",
  "Wat kost een uurtje poolen?",
  "Wanneer is het volgende toernooi?",
  "Hoe kom ik bij jullie?",
]

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

function EightBallIcon({ size = 64 }) {
  return (
    <svg width={size} height={size + 14} viewBox="0 0 64 78" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ballGrad" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#555555"/>
          <stop offset="40%" stopColor="#1a1a1a"/>
          <stop offset="100%" stopColor="#000000"/>
        </radialGradient>
        <radialGradient id="shineGrad" cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="circleGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#2a2a2a"/>
          <stop offset="100%" stopColor="#111111"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="30" r="29" fill="url(#ballGrad)"/>
      <circle cx="32" cy="30" r="29" fill="url(#shineGrad)"/>
      <circle cx="32" cy="32" r="12" fill="url(#circleGrad)" stroke="#333" strokeWidth="0.5"/>
      <text x="32" y="37" textAnchor="middle" fill="#cc0000" fontSize="14" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" filter="url(#glow)">8</text>
      <circle cx="20" cy="16" r="3.5" fill="white" opacity="0.18"/>
      <circle cx="20" cy="16" r="1.5" fill="white" opacity="0.4"/>
      <line x1="22" y1="57" x2="18" y2="72" stroke="#333333" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="16" cy="73" rx="5" ry="2.5" fill="#222222"/>
      <line x1="42" y1="57" x2="46" y2="72" stroke="#333333" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="48" cy="73" rx="5" ry="2.5" fill="#222222"/>
    </svg>
  )
}

function SpeechBubble({ hovered }) {
  return (
    <div style={{ position: "relative", display: "inline-block", marginBottom: "4px" }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "20px",
        padding: "10px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
        whiteSpace: "nowrap",
      }}>
        {!hovered ? (
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#111", fontFamily: "Arial, sans-serif" }}>
            Stel al je vragen aan de Mokum Magic 8 Ball
          </span>
        ) : (
          <div style={{ fontSize: "12px", color: "#111", lineHeight: "1.7", fontFamily: "Arial, sans-serif" }}>
            <div style={{ fontWeight: "700", marginBottom: "4px" }}>Ik weet alles over:</div>
            <div>🕐 Openingstijden</div>
            <div>💶 Tarieven & activiteiten</div>
            <div>🏆 Toernooien & inschrijven</div>
            <div>📍 Route & parkeren</div>
            <div>🎯 Darts, biljart & shuffleboard</div>
            <div>🏢 Bedrijfsuitjes & groepen</div>
          </div>
        )}
      </div>
      <div style={{
        position: "absolute",
        bottom: "-10px",
        right: "24px",
        width: 0,
        height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "0px solid transparent",
        borderTop: "12px solid white",
      }}/>
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

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey! Ik ben de Mokum Magic 8 Ball 🎱 Hoe kan ik je helpen?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(text) {
    const userMessage = text || input
    if (!userMessage.trim()) return

    const newMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

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
        { role: "assistant", content: "Oeps, er ging iets mis. Probeer het nog eens! 🎱" },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>

      {open && (
        <div style={{
          marginBottom: "16px",
          width: "380px",
          height: "540px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px #2a2a2a",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.black,
        }}>
          <div style={{
            backgroundColor: C.blackCard,
            borderBottom: `1px solid ${C.border}`,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <EightBallIcon size={38} />
              <div>
                <div style={{ fontWeight: "800", color: C.white, fontSize: "15px", letterSpacing: "0.06em" }}>MOKUM MAGIC 8 BALL</div>
                <div style={{ color: C.red, fontSize: "11px", marginTop: "1px" }}>Pool & Darts Amsterdam</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: C.gray,
              cursor: "pointer", fontSize: "18px", fontWeight: "bold",
              padding: "4px", lineHeight: 1,
            }}>✕</button>
          </div>

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
                  Aan het typen...
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {QUICK_REPLIES.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    fontSize: "12px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    backgroundColor: "transparent",
                    color: C.white,
                    border: `1px solid ${C.border}`,
                    cursor: "pointer",
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div style={{
            borderTop: `1px solid ${C.border}`,
            backgroundColor: C.blackCard,
            padding: "12px 16px",
            display: "flex",
            gap: "8px",
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Stel een vraag..."
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
        </div>
      )}

      {!open && (
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <SpeechBubble hovered={hovered} />
          <button
            onClick={() => setOpen(true)}
            style={{
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "transform 0.2s",
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))",
              transform: hovered ? "scale(1.1)" : "scale(1)",
            }}>
            <EightBallIcon size={64} />
          </button>
        </div>
      )}

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
