// ============================================================
// VetChatbot.jsx — Veterinary AI Chatbot Component
// NEW FILE: Integrated AI assistant powered by Claude API
// Floats as a persistent widget across all dashboard pages
// FEATURES: Voice input (Tamil), Text-to-Speech (Tamil)
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import VoiceService from '../../utils/VoiceService'
import './VetChatbot.css'

// ── System prompt: scopes the AI to poultry/veterinary topics ──
const SYSTEM_PROMPT = `You are VetBot, an expert AI veterinary assistant specializing in poultry and livestock health for the VetSafe Tracker platform.

You assist farmers, veterinarians, and buyers with:
- Poultry diseases: symptoms, diagnosis, and treatment guidance
- Antibiotic usage: correct dosages, withdrawal periods, MRL (Maximum Residue Limits) compliance
- Animal health monitoring: behavioral changes, nutrition, biosecurity
- Withdrawal period calculations and food safety
- General livestock management best practices for chickens, cattle, and goats

IMPORTANT RULES:
1. Always recommend consulting a licensed veterinarian for actual medical decisions.
2. For any HIGH RISK situation (animal in distress, suspected outbreak), urge immediate professional help.
3. Provide clear, practical, actionable advice.
4. When discussing antibiotics, always mention withdrawal periods and food safety implications.
5. Keep responses concise but complete — use bullet points where helpful.
6. You are aware this platform tracks antibiotic usage and withdrawal periods to prevent MRL violations.

Start responses naturally without restating the question. Be warm, professional, and direct.`

// ── Suggested quick questions ──
const QUICK_QUESTIONS = [
  '🐔 Signs of Newcastle disease?',
  '💊 Amoxicillin withdrawal period?',
  '🦠 Avian flu prevention tips',
  '📋 MRL compliance checklist',
  '🐄 Cattle antibiotic dosage guide',
  '⚠️ When to call a vet urgently?',
]

const API_URL = import.meta.env.VITE_API_URL

export default function VetChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm **VetBot**, your AI veterinary assistant.\n\nI can help with poultry diseases, antibiotic withdrawal periods, MRL compliance, and livestock health management.\n\nWhat can I help you with today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickQ, setShowQuickQ] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState(null)
  const [fabPos, setFabPos] = useState({ x: window.innerWidth ? window.innerWidth - 86 : 300, y: window.innerHeight ? window.innerHeight - 86 : 700 })
  const [winPos, setWinPos] = useState(null)
  const draggingFab = useRef(false)
  const draggingWin = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const fabMoved = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const fabRef = useRef(null)
  const winRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Drag logic ──
  useEffect(() => {
    const DRAG_THRESHOLD = 6 // px — must move this much to count as a drag

    const onMouseMove = (e) => {
      if (draggingFab.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x)
        const dy = Math.abs(e.clientY - dragStartPos.current.y)
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) fabMoved.current = true
        if (fabMoved.current) {
          const x = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 64)
          const y = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 64)
          setFabPos({ x, y })
        }
      }
      if (draggingWin.current) {
        const w = winRef.current?.offsetWidth || 380
        const h = winRef.current?.offsetHeight || 500
        const x = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - w)
        const y = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - h)
        setWinPos({ x, y })
      }
    }
    const onMouseUp = () => { draggingFab.current = false; draggingWin.current = false }
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (draggingFab.current) {
        const dx = Math.abs(t.clientX - dragStartPos.current.x)
        const dy = Math.abs(t.clientY - dragStartPos.current.y)
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) fabMoved.current = true
        if (fabMoved.current) {
          const x = Math.min(Math.max(0, t.clientX - dragOffset.current.x), window.innerWidth - 64)
          const y = Math.min(Math.max(0, t.clientY - dragOffset.current.y), window.innerHeight - 64)
          setFabPos({ x, y })
          e.preventDefault()
        }
      }
      if (draggingWin.current) {
        const w = winRef.current?.offsetWidth || 380
        const h = winRef.current?.offsetHeight || 500
        const x = Math.min(Math.max(0, t.clientX - dragOffset.current.x), window.innerWidth - w)
        const y = Math.min(Math.max(0, t.clientY - dragOffset.current.y), window.innerHeight - h)
        setWinPos({ x, y })
        e.preventDefault()
      }
    }
    const onTouchEnd = () => { draggingFab.current = false; draggingWin.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setUnreadCount(0)
    }
  }, [isOpen, isMinimized])

  // Voice input — via VoiceService (Capacitor native on Android, Web fallback on browser)
  const toggleVoiceInput = async () => {
    if (isListening) {
      await VoiceService.stopListening()
      setIsListening(false)
      return
    }
    try {
      setIsListening(true)
      const transcript = await VoiceService.startListening('ta-IN')
      if (transcript) setInput(transcript)
    } catch (e) {
      console.error('Voice input error:', e)
    } finally {
      setIsListening(false)
    }
  }

  // Text-to-Speech — works on both Android (Capacitor) and web (SpeechSynthesis)
  const speakText = async (text, messageIndex) => {
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/[#*_~`]/g, '')
      .replace(/\n/g, ' ')
      .trim()

    if (!cleanText) return

    const lang = /[\u0B80-\u0BFF]/.test(cleanText) ? 'ta-IN' : 'en-US'

    setIsSpeaking(true)
    setCurrentSpeakingIndex(messageIndex)

    try {
      await VoiceService.speak(cleanText, { lang, rate: 0.9, pitch: 1.0, volume: 1.0 })
    } catch (e) {
      console.error('TTS error:', e)
    } finally {
      setIsSpeaking(false)
      setCurrentSpeakingIndex(null)
    }
  }

  const stopSpeaking = async () => {
    await VoiceService.stopSpeaking()
    setIsSpeaking(false)
    setCurrentSpeakingIndex(null)
  }

  // ── Send message via backend proxy ──
  const sendMessage = async (userText) => {
    if (!userText.trim() || isLoading) return

    const userMessage = { role: 'user', content: userText.trim(), timestamp: new Date() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)
    setShowQuickQ(false)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText.trim(),
          language: 'tamil' // Indicate Tamil language preference
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Show unread badge if chat is closed
      if (!isOpen || isMinimized) {
        setUnreadCount((n) => n + 1)
      }
    } catch (err) {
      console.error('[VetBot] API Error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Sorry, I encountered a connection issue. Please check your internet connection and try again.\n\nFor urgent animal health concerns, contact your veterinarian directly.',
          timestamp: new Date(),
          isError: true,
          canRetry: true,
          retryText: userText,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat cleared! I'm still here to help with any poultry or livestock health questions. 🐔",
        timestamp: new Date(),
      },
    ])
    setShowQuickQ(true)
  }

  // ── Render markdown-lite (bold, bullets) ──
  const renderContent = (text) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Bold **text**
      const parts = line.split(/\*\*(.*?)\*\*/g)
      const rendered = parts.map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      )
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="vc-list-item">
            {rendered.slice(1)}
          </li>
        )
      }
      return line ? (
        <p key={i} className="vc-para">
          {rendered}
        </p>
      ) : (
        <br key={i} />
      )
    })
  }

  const formatTime = (date) =>
    date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        ref={fabRef}
        className={`vc-fab ${isOpen ? 'vc-fab--open' : ''}`}
        style={{ left: fabPos.x, top: fabPos.y, bottom: 'auto', right: 'auto' }}
        onMouseDown={(e) => {
          draggingFab.current = true
          fabMoved.current = false
          dragStartPos.current = { x: e.clientX, y: e.clientY }
          dragOffset.current = { x: e.clientX - fabPos.x, y: e.clientY - fabPos.y }
          e.preventDefault()
        }}
        onTouchStart={(e) => {
          draggingFab.current = true
          fabMoved.current = false
          const t = e.touches[0]
          dragStartPos.current = { x: t.clientX, y: t.clientY }
          dragOffset.current = { x: t.clientX - fabPos.x, y: t.clientY - fabPos.y }
        }}
        onClick={() => {
          if (!fabMoved.current) {
            setIsOpen(!isOpen)
            setIsMinimized(false)
          }
          fabMoved.current = false
        }}
        aria-label="Open VetBot AI Assistant"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="vc-badge">{unreadCount}</span>
        )}
      </button>

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          ref={winRef}
          className={`vc-window ${isMinimized ? 'vc-window--minimized' : ''}`}
          style={winPos
            ? { left: winPos.x, top: winPos.y, bottom: 'auto', right: 'auto' }
            : { left: Math.min(fabPos.x, window.innerWidth - 392), top: Math.max(8, fabPos.y - 620), bottom: 'auto', right: 'auto' }
          }
        >
          {/* Header */}
          <div
            className="vc-header"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => {
              draggingWin.current = true
              const rect = winRef.current?.getBoundingClientRect()
              dragOffset.current = { x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) }
              e.preventDefault()
            }}
            onTouchStart={(e) => {
              draggingWin.current = true
              const t = e.touches[0]
              const rect = winRef.current?.getBoundingClientRect()
              dragOffset.current = { x: t.clientX - (rect?.left || 0), y: t.clientY - (rect?.top || 0) }
            }}
          >
            <div className="vc-header-info">
              <div className="vc-avatar">
                <span>🐾</span>
                <span className="vc-online-dot" />
              </div>
              <div>
                <div className="vc-header-name">VetBot AI</div>
                <div className="vc-header-status">
                  {isLoading ? 'Thinking...' : 'Veterinary Assistant • Online'}
                </div>
              </div>
            </div>
            <div className="vc-header-actions">
              <button className="vc-icon-btn" onClick={clearChat} title="Clear chat">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.8" />
                </svg>
              </button>
              <button
                className="vc-icon-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isMinimized ? (
                    <polyline points="18 15 12 9 6 15" />
                  ) : (
                    <polyline points="6 9 12 15 18 9" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="vc-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`vc-msg-row ${msg.role === 'user' ? 'vc-msg-row--user' : 'vc-msg-row--bot'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="vc-msg-avatar">🐾</div>
                    )}
                    <div
                      className={`vc-bubble ${msg.role === 'user' ? 'vc-bubble--user' : 'vc-bubble--bot'} ${msg.isError ? 'vc-bubble--error' : ''}`}
                    >
                      <div className="vc-bubble-content">{renderContent(msg.content)}</div>
                      {msg.canRetry && (
                        <button
                          className="vc-retry-btn"
                          onClick={() => {
                            setMessages(prev => prev.filter((_, i) => i !== idx))
                            sendMessage(msg.retryText)
                          }}
                        >
                          🔄 Retry
                        </button>
                      )}
                      <div className="vc-bubble-footer">
                        <div className="vc-bubble-time">{formatTime(msg.timestamp)}</div>
                        {msg.role === 'assistant' && !msg.isError && (
                          <button
                            className="vc-speak-btn"
                            onClick={() => {
                              if (currentSpeakingIndex === idx) {
                                stopSpeaking()
                              } else {
                                speakText(msg.content, idx)
                              }
                            }}
                            title={currentSpeakingIndex === idx ? 'Stop' : 'Read aloud'}
                          >
                            {currentSpeakingIndex === idx ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="vc-msg-row vc-msg-row--bot">
                    <div className="vc-msg-avatar">🐾</div>
                    <div className="vc-bubble vc-bubble--bot vc-bubble--typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick questions */}
              {showQuickQ && (
                <div className="vc-quick">
                  <p className="vc-quick-label">Quick questions</p>
                  <div className="vc-quick-grid">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        className="vc-quick-btn"
                        onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input area */}
              <div className="vc-input-area">
                <div className="vc-input-wrap">
                  <button
                    className={`vc-voice-btn ${isListening ? 'vc-voice-btn--active' : ''}`}
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    title={isListening ? 'Stop listening' : 'Speak in Tamil'}
                  >
                    {isListening ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="8" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </button>
                  <textarea
                    ref={inputRef}
                    className="vc-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening... (Tamil)' : 'Ask about symptoms, treatments, withdrawal periods...'}
                    rows={1}
                    disabled={isLoading || isListening}
                  />
                  <button
                    className={`vc-send ${input.trim() && !isLoading ? 'vc-send--active' : ''}`}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
                <p className="vc-disclaimer">
                  🎤 Voice input & 🔊 Tamil audio supported • AI assistance only — consult a veterinarian for medical decisions.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
