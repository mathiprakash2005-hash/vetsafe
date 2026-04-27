import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  auth, db, 
  collection, query, where, getDocs, addDoc, onSnapshot, serverTimestamp,
  doc, getDoc 
} from '../../config/firebase'
import { uploadToCloudinary } from '../../utils/cloudinary'
import VoiceService from '../../utils/VoiceService'
import './DoctorChat.css'

export default function DoctorChat() {
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [selectedFarmer, setSelectedFarmer] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const audioRefs = useRef({})

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/doctor-login'); return }
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'doctor') {
        navigate('/doctor-login'); return
      }
      setDoctor({ uid: user.uid, ...userDoc.data() })

      // Load all farmers who have sent consultation requests
      const reqSnap = await getDocs(collection(db, 'consultationRequests'))
      const farmerIds = [...new Set(reqSnap.docs.map(d => d.data().farmerId))]

      const farmerList = await Promise.all(
        farmerIds.map(async (fid) => {
          const fDoc = await getDoc(doc(db, 'users', fid))
          if (!fDoc.exists()) return null
          
          // Get last message for preview
          const chatId = [fid, user.uid].sort().join('_')
          const msgQuery = query(collection(db, 'chats', chatId, 'messages'))
          const msgSnap = await getDocs(msgQuery)
          const msgs = msgSnap.docs.map(d => d.data())
          msgs.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
          const lastMsg = msgs[0]
          
          return { 
            uid: fid, 
            ...fDoc.data(),
            lastMessage: lastMsg?.message || 'No messages yet',
            lastMessageTime: lastMsg?.timestamp
          }
        })
      )
      setFarmers(farmerList.filter(Boolean))
      setLoading(false)
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    if (!selectedFarmer || !doctor) return
    
    const chatId = [selectedFarmer.uid, doctor.uid].sort().join('_')
    const q = query(collection(db, 'chats', chatId, 'messages'))
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      msgs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0))
      setMessages(msgs)
    })
    
    return () => unsub()
  }, [selectedFarmer, doctor])

  useEffect(() => {
    if (!selectedFarmer) setShowChat(false)
  }, [selectedFarmer])

  useEffect(() => {
    setShowChat(false)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedFarmer || !doctor || sending) return

    setSending(true)
    const chatId = [selectedFarmer.uid, doctor.uid].sort().join('_')
    
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: doctor.uid,
        receiverId: selectedFarmer.uid,
        message: input.trim(),
        messageType: 'text',
        timestamp: serverTimestamp()
      })
      setInput('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFarmer) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = ''
      return
    }

    setSending(true)
    const chatId = [selectedFarmer.uid, doctor.uid].sort().join('_')

    try {
      const imageUrl = await uploadToCloudinary(file)
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: doctor.uid,
        receiverId: selectedFarmer.uid,
        message: '',
        imageUrl: imageUrl,
        messageType: 'image',
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo')
    } finally {
      setSending(false)
      e.target.value = ''
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        if (audioBlob.size > 0) await uploadAudio(audioBlob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      audioChunksRef.current = []
    }
  }

  const uploadAudio = async (audioBlob) => {
    if (!selectedFarmer) return
    setSending(true)
    const chatId = [selectedFarmer.uid, doctor.uid].sort().join('_')

    try {
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
      const audioUrl = await uploadToCloudinary(audioFile, 'video')
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: doctor.uid,
        receiverId: selectedFarmer.uid,
        message: '',
        audioUrl: audioUrl,
        messageType: 'audio',
        duration: recordingTime,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Audio upload error:', error)
      alert('Failed to send audio')
    } finally {
      setSending(false)
      setRecordingTime(0)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAudioPlayPause = (msgId, audioUrl) => {
    const audio = audioRefs.current[msgId]
    if (!audio) {
      audioRefs.current[msgId] = new Audio(audioUrl)
      audioRefs.current[msgId].play()
      return
    }
    if (audio.paused) audio.play()
    else audio.pause()
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now - date
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="whatsapp-container">
      {/* Sidebar - Chat List */}
      <aside className={`whatsapp-sidebar ${showChat ? 'whatsapp-sidebar--hidden' : ''}`}>
        <div className="whatsapp-sidebar-header">
          <button className="whatsapp-back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Chats</h2>
          <div className="whatsapp-header-actions">
            <button className="whatsapp-icon-btn" title="New chat">
              <i className="fas fa-comment-medical"></i>
            </button>
            <button className="whatsapp-icon-btn" title="Menu">
              <i className="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>

        <div className="whatsapp-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search or start new chat" />
        </div>

        <div className="whatsapp-chat-list">
          {loading ? (
            <div className="whatsapp-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading chats...</p>
            </div>
          ) : farmers.length === 0 ? (
            <div className="whatsapp-empty">
              <i className="fas fa-comments"></i>
              <p>No chats yet</p>
              <span>Farmers who request consultations will appear here</span>
            </div>
          ) : (
            farmers.map(farmer => (
              <div
                key={farmer.uid}
                className={`whatsapp-chat-item ${selectedFarmer?.uid === farmer.uid ? 'active' : ''}`}
                onClick={() => { setSelectedFarmer(farmer); setShowChat(true) }}
              >
                <div className="whatsapp-chat-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="whatsapp-chat-info">
                  <div className="whatsapp-chat-top">
                    <h4>{farmer.name}</h4>
                    <span className="whatsapp-chat-time">
                      {formatTime(farmer.lastMessageTime)}
                    </span>
                  </div>
                  <div className="whatsapp-chat-preview">
                    <p>{farmer.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`whatsapp-main ${showChat ? 'whatsapp-main--visible' : ''}`}>
        {!selectedFarmer ? (
          <div className="whatsapp-welcome">
            <div className="whatsapp-welcome-icon">
              <i className="fas fa-comments"></i>
            </div>
            <h3>VetSafe Chat</h3>
            <p>Select a farmer from the list to start chatting</p>
            <div className="whatsapp-welcome-features">
              <div className="whatsapp-feature">
                <i className="fas fa-lock"></i>
                <span>End-to-end encrypted</span>
              </div>
              <div className="whatsapp-feature">
                <i className="fas fa-shield-alt"></i>
                <span>Secure messaging</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="whatsapp-chat-header">
              <button className="whatsapp-mobile-back whatsapp-back-btn" onClick={() => { setShowChat(false); setSelectedFarmer(null); }}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div className="whatsapp-chat-user">
                <div className="whatsapp-chat-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="whatsapp-chat-user-info">
                  <h3>{selectedFarmer.name}</h3>
                  <p>
                    <span className="whatsapp-online-dot"></span>
                    Farmer
                  </p>
                </div>
              </div>
              <div className="whatsapp-chat-actions">
                <button className="whatsapp-icon-btn" title="Voice call">
                  <i className="fas fa-phone"></i>
                </button>
                <button className="whatsapp-icon-btn" title="Video call">
                  <i className="fas fa-video"></i>
                </button>
                <button className="whatsapp-icon-btn" title="More">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="whatsapp-messages">
              {messages.length === 0 ? (
                <div className="whatsapp-no-messages">
                  <div className="whatsapp-date-badge">Today</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  <div className="whatsapp-date-badge">Today</div>
                  {messages.map((msg, index) => {
                    const isMine = msg.senderId === doctor?.uid
                    return (
                      <div
                        key={msg.id}
                        className={`whatsapp-message ${isMine ? 'whatsapp-message--mine' : 'whatsapp-message--theirs'}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="whatsapp-message-content">
                          {msg.messageType === 'image' && msg.imageUrl && (
                            <div className="whatsapp-image">
                              <img 
                                src={msg.imageUrl} 
                                alt="Shared" 
                                onClick={() => setFullscreenImage(msg.imageUrl)}
                                style={{ maxWidth: '250px', borderRadius: '8px', cursor: 'pointer' }}
                              />
                            </div>
                          )}
                          
                          {msg.messageType === 'audio' && msg.audioUrl && (
                            <div className="whatsapp-audio" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button 
                                className="whatsapp-audio-play"
                                onClick={() => handleAudioPlayPause(msg.id, msg.audioUrl)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                              >
                                <i className="fas fa-play"></i>
                              </button>
                              <span>{formatDuration(msg.duration || 0)}</span>
                            </div>
                          )}
                          
                          {msg.message && <p>{msg.message}</p>}
                          <span className="whatsapp-message-time">
                            {formatTime(msg.timestamp)}
                            {isMine && (
                              <i className="fas fa-check-double whatsapp-read-receipt"></i>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="whatsapp-input-area">
              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <button className="whatsapp-icon-btn" onClick={cancelRecording} title="Cancel">
                    <i className="fas fa-trash"></i>
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'red', fontSize: '12px' }}>●</span>
                    <span>{formatDuration(recordingTime)}</span>
                  </div>
                  <button className="whatsapp-send-btn" onClick={stopRecording}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <button type="button" className="whatsapp-icon-btn" title="Emoji">
                    <i className="fas fa-smile"></i>
                  </button>
                  <button type="button" className="whatsapp-icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach">
                    <i className="fas fa-paperclip"></i>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <button type="button" className="whatsapp-icon-btn" onClick={() => cameraInputRef.current?.click()} title="Camera">
                    <i className="fas fa-camera"></i>
                  </button>
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <input
                    type="text"
                    className="whatsapp-input"
                    placeholder={isListening ? '🎤 Listening...' : 'Type a message'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                  />
                  {input.trim() ? (
                    <button 
                      type="submit" 
                      className="whatsapp-send-btn"
                      disabled={sending}
                    >
                      {sending ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-paper-plane"></i>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`whatsapp-icon-btn ${isListening ? 'whatsapp-icon-btn--listening' : ''}`}
                        onClick={async () => {
                          if (isListening) { await VoiceService.stopListening(); setIsListening(false); return }
                          try {
                            setIsListening(true)
                            const transcript = await VoiceService.startListening('ta-IN')
                            if (transcript) setInput(prev => prev + (prev ? ' ' : '') + transcript)
                          } catch (e) { console.error(e) } finally { setIsListening(false) }
                        }}
                        title="Voice to text"
                      >
                        <i className={`fas fa-microphone${isListening ? '-slash' : ''}`}></i>
                      </button>
                      <button type="button" className="whatsapp-icon-btn" onClick={startRecording} title="Send audio message">
                        <i className="fas fa-headphones"></i>
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </main>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '10px 15px',
              borderRadius: '50%'
            }}
            onClick={() => setFullscreenImage(null)}
          >
            <i className="fas fa-times"></i>
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen" 
            style={{ maxWidth: '90%', maxHeight: '90%' }}
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  )
}