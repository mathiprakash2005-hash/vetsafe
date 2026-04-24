import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  auth, db,
  collection, query, where, getDocs, addDoc, onSnapshot, serverTimestamp,
  doc, getDoc
} from '../../config/firebase'
import './FarmerChat.css'

export default function FarmerChat() {
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/farmer-login'); return }
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'farmer') {
        navigate('/farmer-login'); return
      }
      setFarmer({ uid: user.uid, ...userDoc.data() })

      const q = query(collection(db, 'users'), where('role', '==', 'doctor'))
      const snap = await getDocs(q)
      const doctorList = await Promise.all(
        snap.docs.map(async (d) => {
          const doctorData = { uid: d.id, ...d.data() }
          const chatId = [user.uid, d.id].sort().join('_')
          const msgSnap = await getDocs(collection(db, 'chats', chatId, 'messages'))
          const msgs = msgSnap.docs.map(m => m.data())
          msgs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
          const lastMsg = msgs[0]
          return {
            ...doctorData,
            lastMessage: lastMsg?.text || lastMsg?.message || 'No messages yet',
            lastMessageTime: lastMsg?.createdAt || lastMsg?.timestamp
          }
        })
      )
      setDoctors(doctorList)
      setLoading(false)
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    if (!selectedDoctor || !farmer) return
    const chatId = [farmer.uid, selectedDoctor.uid].sort().join('_')
    const unsub = onSnapshot(collection(db, 'chats', chatId, 'messages'), (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))
      setMessages(msgs)
    })
    return () => unsub()
  }, [selectedDoctor, farmer])

  useEffect(() => {
    if (!selectedDoctor) setShowChat(false)
  }, [selectedDoctor])

  useEffect(() => {
    // On mobile, always start with sidebar visible
    setShowChat(false)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedDoctor || !farmer || sending) return
    setSending(true)
    const chatId = [farmer.uid, selectedDoctor.uid].sort().join('_')
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: farmer.uid,
        receiverId: selectedDoctor.uid,
        text: input.trim(),
        type: 'text',
        createdAt: serverTimestamp()
      })
      setInput('')
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDoctor || !farmer) return
    e.target.value = ''
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ml_default')
      const res = await fetch('https://api.cloudinary.com/v1_1/dc7t2fvt9/image/upload', {
        method: 'POST', body: formData
      })
      const data = await res.json()
      const chatId = [farmer.uid, selectedDoctor.uid].sort().join('_')
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: farmer.uid,
        receiverId: selectedDoctor.uid,
        url: data.secure_url,
        type: 'image',
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const date = ts.toDate()
    const diff = Date.now() - date
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`fc-wrapper ${showChat ? 'fc-wrapper--chat-open' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className="fc-panel">
        <div className="fc-panel-header">
          <button className="fc-nav-btn" onClick={() => navigate('/farmer-dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Chats</h2>
        </div>

        <div className="fc-search-bar">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search doctors..." />
        </div>

        <div className="fc-contact-list">
          {loading ? (
            <div className="fc-state-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="fc-state-empty">
              <i className="fas fa-user-md"></i>
              <p>No doctors available</p>
            </div>
          ) : (
            doctors.map(doctor => (
              <div
                key={doctor.uid}
                className={`fc-contact-row ${selectedDoctor?.uid === doctor.uid ? 'fc-contact-row--active' : ''}`}
                onClick={() => { setSelectedDoctor(doctor); setShowChat(true) }}
              >
                <div className="fc-avatar">👨⚕️</div>
                <div className="fc-contact-meta">
                  <div className="fc-contact-top">
                    <h4>{doctor.name}</h4>
                    <span className="fc-contact-timestamp">{formatTime(doctor.lastMessageTime)}</span>
                  </div>
                  <div className="fc-contact-preview">
                    <p>{doctor.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <main className="fc-chat-area">
        {!selectedDoctor ? (
          <div className="fc-welcome-screen">
            <h3>Available Doctors</h3>
            <div className="fc-doctors-grid">
              {loading ? (
                <div className="fc-state-loading">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading...</p>
                </div>
              ) : doctors.length === 0 ? (
                <div className="fc-state-empty">
                  <i className="fas fa-user-md"></i>
                  <p>No doctors available</p>
                </div>
              ) : (
                doctors.map(doctor => (
                  <div
                    key={doctor.uid}
                    className="fc-doctor-card"
                    onClick={() => { setSelectedDoctor(doctor); setShowChat(true) }}
                  >
                    <div className="fc-doctor-card-avatar">👨‍⚕️</div>
                    <h4>{doctor.name}</h4>
                    <p>{doctor.lastMessage}</p>
                    <button className="fc-chat-now-btn">Chat Now</button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="fc-chat-topbar">
              <button className="fc-mobile-back fc-nav-btn" onClick={() => { setShowChat(false); setSelectedDoctor(null); }}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div className="fc-chat-user-row">
                <div className="fc-avatar">👨⚕️</div>
                <div className="fc-chat-user-details">
                  <h3>{selectedDoctor.name}</h3>
                  <p><span className="fc-status-dot"></span>Veterinary Doctor</p>
                </div>
              </div>
              <div className="fc-topbar-actions">
                <button className="fc-icon-btn"><i className="fas fa-phone"></i></button>
                <button className="fc-icon-btn"><i className="fas fa-ellipsis-v"></i></button>
              </div>
            </div>

            {/* Messages */}
            <div className="fc-message-feed">
              {messages.length === 0 ? (
                <div className="fc-empty-feed">
                  <div className="fc-date-label">Today</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  <div className="fc-date-label">Today</div>
                  {messages.map((msg, i) => {
                    const isMine = msg.senderId === farmer?.uid
                    return (
                      <div
                        key={msg.id}
                        className={`fc-msg-bubble ${isMine ? 'fc-msg-bubble--sent' : 'fc-msg-bubble--received'}`}
                        style={{ animationDelay: `${i * 0.04}s` }}
                      >
                        <div className="fc-bubble-body">
                          {msg.type === 'image' && msg.url && (
                            <img
                              src={msg.url}
                              alt="Shared"
                              onClick={() => setFullscreenImage(msg.url)}
                              style={{ maxWidth: '220px', borderRadius: '8px', cursor: 'pointer', display: 'block', marginBottom: '4px' }}
                            />
                          )}
                          {(msg.text || msg.message) && <p>{msg.text || msg.message}</p>}
                          <span className="fc-msg-time">
                            {formatTime(msg.createdAt || msg.timestamp)}
                            {isMine && <i className="fas fa-check-double fc-read-tick"></i>}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="fc-input-bar">
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <button type="button" className="fc-icon-btn" onClick={() => fileInputRef.current?.click()}>
                  <i className="fas fa-paperclip"></i>
                </button>
                <input
                  type="text"
                  className="fc-text-input"
                  placeholder="Type a message"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className="fc-send-btn" disabled={!input.trim() || sending}>
                  {sending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* Fullscreen Image */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: '8px 14px', borderRadius: '50%' }}
          >
            <i className="fas fa-times"></i>
          </button>
          <img src={fullscreenImage} alt="Fullscreen" style={{ maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}