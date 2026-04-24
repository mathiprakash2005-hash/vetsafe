import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp } from '../../config/firebase'
import { uploadToCloudinary } from '../../utils/cloudinary'
import './ChatWithDoctor.css'

function ChatWithDoctor() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const recordingIntervalRef = useRef(null)
  const audioRefs = useRef({})

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }
      setUser(currentUser)
      await loadDoctors()
      setLoading(false)
    })
    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    if (selectedDoctor && user) {
      const chatId = [user.uid, selectedDoctor.id].sort().join('_')
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      )
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setMessages(msgs)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      return () => unsubscribe()
    }
  }, [selectedDoctor, user])

  const loadDoctors = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'))
      const snapshot = await getDocs(q)
      setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error('Error loading doctors:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedDoctor || sending) return

    const messageText = newMessage
    setNewMessage('')
    setSending(true)
    
    const chatId = [user.uid, selectedDoctor.id].sort().join('_')

    try {
      console.log('Sending text message...')
      console.log('Chat ID:', chatId)
      console.log('Message:', messageText)
      
      const docRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        receiverId: selectedDoctor.id,
        message: messageText,
        messageType: 'text',
        timestamp: serverTimestamp()
      })
      
      console.log('Message sent successfully! Doc ID:', docRef.id)
    } catch (error) {
      console.error('Error sending message:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      alert('Failed to send message: ' + error.message)
      setNewMessage(messageText) // Restore message
    } finally {
      setSending(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDoctor) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB')
      e.target.value = ''
      return
    }

    setSending(true)
    const chatId = [user.uid, selectedDoctor.id].sort().join('_')

    try {
      console.log('Uploading to Cloudinary...')
      const imageUrl = await uploadToCloudinary(file)
      console.log('✅ Image uploaded:', imageUrl)

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        receiverId: selectedDoctor.id,
        message: '',
        imageUrl: imageUrl,
        messageType: 'image',
        timestamp: serverTimestamp()
      })

      console.log('✅ Message saved')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo: ' + error.message)
    } finally {
      setSending(false)
      e.target.value = ''
    }
  }

  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted')
      
      const options = { mimeType: 'audio/webm' }
      mediaRecorderRef.current = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length)
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        console.log('Audio blob created:', audioBlob.size, 'bytes')
        
        stream.getTracks().forEach(track => track.stop())
        
        if (audioBlob.size > 0) {
          await uploadAudio(audioBlob)
        }
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      console.log('Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone: ' + error.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      audioChunksRef.current = []
      console.log('Recording cancelled')
    }
  }

  const uploadAudio = async (audioBlob) => {
    if (!selectedDoctor) return

    setSending(true)
    const chatId = [user.uid, selectedDoctor.id].sort().join('_')

    try {
      console.log('Uploading audio to Cloudinary...')
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
      const audioUrl = await uploadToCloudinary(audioFile, 'video')
      console.log('✅ Audio uploaded:', audioUrl)

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        receiverId: selectedDoctor.id,
        message: '',
        audioUrl: audioUrl,
        messageType: 'audio',
        duration: recordingTime,
        timestamp: serverTimestamp()
      })

      console.log('✅ Audio message saved')
    } catch (error) {
      console.error('Audio upload error:', error)
      alert('Failed to send audio: ' + error.message)
    } finally {
      setSending(false)
      setRecordingTime(0)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
    
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }

  if (loading) {
    return (
      <div className="wa-loading">
        <div className="wa-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="wa-root">
      {/* Sidebar */}
      <aside className="wa-sidebar">
        <div className="wa-sidebar-header">
          <button className="wa-back-btn" onClick={() => navigate('/farmer-dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Chats</h2>
        </div>
        
        <div className="wa-doctors-list">
          {doctors.length === 0 ? (
            <div className="wa-empty">
              <i className="fas fa-user-md"></i>
              <p>No doctors available</p>
            </div>
          ) : (
            doctors.map(doctor => (
              <div
                key={doctor.id}
                className={`wa-doctor-item ${selectedDoctor?.id === doctor.id ? 'active' : ''}`}
                onClick={() => setSelectedDoctor(doctor)}
              >
                <div className="wa-avatar">
                  <i className="fas fa-user-md"></i>
                </div>
                <div className="wa-doctor-info">
                  <h4>{doctor.name}</h4>
                  <p>Veterinarian</p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="wa-main">
        {!selectedDoctor ? (
          <div className="wa-empty-chat">
            <i className="fas fa-comments"></i>
            <h3>Select a doctor to start chatting</h3>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="wa-chat-header">
              <div className="wa-avatar">
                <i className="fas fa-user-md"></i>
              </div>
              <div className="wa-header-info">
                <h3>{selectedDoctor.name}</h3>
                <p>online</p>
              </div>
              <div className="wa-header-actions">
                <button><i className="fas fa-search"></i></button>
                <button><i className="fas fa-ellipsis-v"></i></button>
              </div>
            </div>

            {/* Messages */}
            <div className="wa-messages">
              {messages.length === 0 ? (
                <div className="wa-no-messages">
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`wa-message ${msg.senderId === user.uid ? 'sent' : 'received'}`}
                  >
                    <div className="wa-message-content">
                      {msg.messageType === 'image' && msg.imageUrl && (
                        <div className="wa-image">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared" 
                            onClick={() => setFullscreenImage(msg.imageUrl)}
                          />
                        </div>
                      )}
                      
                      {msg.messageType === 'audio' && msg.audioUrl && (
                        <div className="wa-audio">
                          <button 
                            className="wa-audio-play"
                            onClick={() => handleAudioPlayPause(msg.id, msg.audioUrl)}
                          >
                            <i className="fas fa-play"></i>
                          </button>
                          <div className="wa-audio-waveform">
                            <div className="wa-audio-progress"></div>
                          </div>
                          <span className="wa-audio-duration">{formatDuration(msg.duration || 0)}</span>
                        </div>
                      )}
                      
                      {msg.message && <p>{msg.message}</p>}
                      
                      <span className="wa-time">{formatTime(msg.timestamp)}</span>
                      {msg.senderId === user.uid && (
                        <i className="fas fa-check-double wa-check"></i>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="wa-input-area">
              {isRecording ? (
                <div className="wa-recording">
                  <button className="wa-cancel-btn" onClick={cancelRecording}>
                    <i className="fas fa-trash"></i>
                  </button>
                  <div className="wa-recording-indicator">
                    <span className="wa-recording-dot"></span>
                    <span className="wa-recording-time">{formatDuration(recordingTime)}</span>
                  </div>
                  <button className="wa-send-btn" onClick={stopRecording}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              ) : (
                <>
                  <button className="wa-icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <i className="fas fa-smile"></i>
                  </button>
                  
                  <button className="wa-icon-btn" onClick={() => fileInputRef.current?.click()}>
                    <i className="fas fa-paperclip"></i>
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  
                  <button className="wa-icon-btn" onClick={() => cameraInputRef.current?.click()}>
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
                  
                  <form onSubmit={handleSendMessage} className="wa-input-form">
                    <input
                      type="text"
                      className="wa-input"
                      placeholder="Type a message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending}
                    />
                  </form>
                  
                  {newMessage.trim() ? (
                    <button className="wa-send-btn" onClick={handleSendMessage} disabled={sending}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  ) : (
                    <button className="wa-mic-btn" onClick={startRecording}>
                      <i className="fas fa-microphone"></i>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="wa-image-modal" onClick={() => setFullscreenImage(null)}>
          <button className="wa-modal-close" onClick={() => setFullscreenImage(null)}>
            <i className="fas fa-times"></i>
          </button>
          <img src={fullscreenImage} alt="Fullscreen" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default ChatWithDoctor
