import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  auth, db,
  collection, addDoc, query, onSnapshot, serverTimestamp,
  doc, getDoc, deleteDoc
} from '../../config/firebase'
import VoiceService from '../../utils/VoiceService'
import './Chat.css'

const CLOUDINARY_CLOUD = 'dc7t2fvt9'
const CLOUDINARY_PRESET = 'ml_default'

// WhatsApp-style audio player component
function AudioMessage({ url, isMine }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    const dur = audioRef.current.duration || 0
    setCurrentTime(cur)
    setProgress(dur ? (cur / dur) * 100 : 0)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const handleEnded = () => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Generate fake waveform bars (consistent per message)
  const bars = Array.from({ length: 30 }, (_, i) => {
    const h = 20 + ((i * 7 + 13) % 60)
    return h
  })

  return (
    <div className={`wa-audio ${isMine ? 'wa-audio--mine' : 'wa-audio--theirs'}`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button className="wa-play-btn" onClick={togglePlay}>
        <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`}></i>
      </button>
      <div className="wa-waveform" onClick={handleSeek}>
        {bars.map((h, i) => {
          const barProgress = (i / bars.length) * 100
          const active = barProgress <= progress
          return (
            <div
              key={i}
              className={`wa-bar ${active ? 'wa-bar--active' : ''}`}
              style={{ height: `${h}%` }}
            />
          )
        })}
      </div>
      <div className="wa-audio-time">
        {playing ? fmt(currentTime) : fmt(duration)}
      </div>
    </div>
  )
}

export default function Chat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const bottomRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const imageInputRef = useRef(null)
  const timerRef = useRef(null)

  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/farmer-login'); return }
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      setCurrentUser({ uid: user.uid, ...userDoc.data() })
      const [farmerId, doctorId] = roomId.split('_')
      const otherId = user.uid === farmerId ? doctorId : farmerId
      const otherDoc = await getDoc(doc(db, 'users', otherId))
      if (otherDoc.exists()) setOtherUser(otherDoc.data())
    })
    return () => unsub()
  }, [roomId, navigate])

  useEffect(() => {
    const q = query(collection(db, 'chats', roomId, 'messages'))
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))
      setMessages(msgs)
    })
    return () => unsub()
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendTextMessage = async () => {
    if (!input.trim() || !currentUser) return
    await addDoc(collection(db, 'chats', roomId, 'messages'), {
      type: 'text',
      text: input.trim(),
      senderId: currentUser.uid,
      senderName: currentUser.name,
      createdAt: serverTimestamp()
    })
    setInput('')
  }


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage() }
  }

  const uploadToCloudinary = async (file, resourceType = 'image') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed')
    return data.secure_url
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'image')
      await addDoc(collection(db, 'chats', roomId, 'messages'), {
        type: 'image', url,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      alert('Image upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType })
        setUploading(true)
        try {
          const url = await uploadToCloudinary(file, 'video')
          // Fix Cloudinary audio URL to be directly playable
          const playableUrl = url.replace('/video/upload/', '/video/upload/fl_attachment/')
          await addDoc(collection(db, 'chats', roomId, 'messages'), {
            type: 'audio',
            url: playableUrl,
            duration: recordingTime,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            createdAt: serverTimestamp()
          })
        } catch (err) {
          alert('Audio upload failed: ' + err.message)
        }
        setUploading(false)
        setRecordingTime(0)
      }
      mediaRecorderRef.current.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      alert('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      clearInterval(timerRef.current)
      setIsRecording(false)
      setRecordingTime(0)
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const fmtRecTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const deleteMessage = async (msgId) => {
    await deleteDoc(doc(db, 'chats', roomId, 'messages', msgId))
    setSelectedMsg(null)
  }

  const goBack = () => {
    if (currentUser?.role === 'doctor') navigate('/doctor-chat')
    else navigate('/farmer-chat')
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="chat-avatar">
          {currentUser?.role === 'doctor' ? '🌾' : '👨⚕️'}
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">{otherUser?.name || '...'}</div>
          <div className="chat-header-role">
            {currentUser?.role === 'doctor' ? 'Farmer' : 'Veterinary Doctor'}
          </div>
        </div>
        <div className="chat-online-dot" />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span>💬</span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === currentUser?.uid
          const isSelected = selectedMsg === msg.id
          return (
            <div
              key={msg.id}
              className={`chat-row ${isMine ? 'chat-row--mine' : 'chat-row--theirs'}`}
              onClick={() => isMine && setSelectedMsg(isSelected ? null : msg.id)}
            >
              {!isMine && <div className="chat-msg-avatar">👨⚕️</div>}
              <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'} ${isSelected ? 'chat-bubble--selected' : ''}`}>
                {msg.type === 'text' && <p className="chat-text">{msg.text}</p>}
                {msg.type === 'image' && (
                  <img
                    src={msg.url}
                    alt="sent"
                    className="chat-image"
                    onClick={(e) => { e.stopPropagation(); window.open(msg.url, '_blank') }}
                  />
                )}
                {msg.type === 'audio' && (
                  <AudioMessage url={msg.url} isMine={isMine} />
                )}
                <span className="chat-time">{formatTime(msg.createdAt)}</span>
              </div>
              {isMine && isSelected && (
                <button
                  className="chat-delete-btn"
                  onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id) }}
                  title="Delete message"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          )
        })}
        {uploading && (
          <div className="chat-row chat-row--mine">
            <div className="chat-bubble chat-bubble--mine chat-uploading">
              <i className="fas fa-spinner fa-spin"></i> Sending...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />

        {isRecording ? (
          // Recording UI
          <div className="chat-recording-bar">
            <button className="chat-cancel-rec" onClick={cancelRecording}>
              <i className="fas fa-trash"></i>
            </button>
            <div className="chat-rec-indicator">
              <span className="chat-rec-dot"></span>
              <span className="chat-rec-time">{fmtRecTime(recordingTime)}</span>
              <span className="chat-rec-label">Recording...</span>
            </div>
            <button className="chat-send-rec" onClick={stopRecording}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        ) : (
          <>
            <button
              className="chat-icon-btn"
              onClick={() => imageInputRef.current.click()}
              disabled={uploading}
              title="Send image"
            >
              <i className="fas fa-image"></i>
            </button>
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '🎤 Listening...' : 'Type a message...'}
              rows={1}
              disabled={uploading}
            />
            {input.trim() ? (
              <button className="chat-send-btn" onClick={sendTextMessage} disabled={uploading}>
                <i className="fas fa-paper-plane"></i>
              </button>
            ) : (
              <>
                <button
                  className={`chat-icon-btn ${isListening ? 'chat-icon-btn--listening' : ''}`}
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
                <button
                  className="chat-icon-btn chat-mic-btn"
                  onMouseDown={startRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                  disabled={uploading}
                  title="Hold to record audio"
                >
                  <i className="fas fa-headphones"></i>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
