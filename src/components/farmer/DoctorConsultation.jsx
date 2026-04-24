import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp } from '../../config/firebase'
import './SharedStyles.css'
import './DoctorConsultation.css'

function DoctorConsultation() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [animals, setAnimals] = useState([])
  const [formData, setFormData] = useState({ animalId: '', urgency: '', symptoms: '' })
  const [loading, setLoading] = useState(false)
  const [loadingAnimals, setLoadingAnimals] = useState(true)
  const [success, setSuccess] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'ta-IN'
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setFormData(prev => ({
          ...prev,
          symptoms: prev.symptoms + (prev.symptoms ? ' ' : '') + transcript
        }))
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        loadAnimals(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (farmerId) => {
    try {
      setLoadingAnimals(true)
      console.log('=== Loading Animals ====')
      console.log('Farmer ID:', farmerId)
      
      const q = query(collection(db, 'animals'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)
      
      console.log('Total animals found:', snapshot.size)
      
      const animalsList = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Animal:', {
          id: doc.id,
          animalId: data.animalId,
          species: data.species,
          speciesDisplay: data.speciesDisplay,
          status: data.status
        })
        return { id: doc.id, ...data }
      })
      
      console.log('Animals list:', animalsList)
      console.log('=== End Loading Animals ====')
      
      setAnimals(animalsList)
      setLoadingAnimals(false)
    } catch (error) {
      console.error('Error loading animals:', error)
      setLoadingAnimals(false)
    }
  }

  const toggleVoiceInput = (language) => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.lang = language
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Submitting consultation request:', {
        farmerId: user.uid,
        animalId: formData.animalId,
        urgency: formData.urgency,
        symptoms: formData.symptoms,
        status: 'pending'
      })

      const docRef = await addDoc(collection(db, 'consultationRequests'), {
        farmerId: user.uid,
        animalId: formData.animalId,
        urgency: formData.urgency,
        symptoms: formData.symptoms,
        status: 'pending',
        createdAt: serverTimestamp()
      })

      console.log('Request submitted successfully with ID:', docRef.id)
      setSuccess(true)
      setFormData({ animalId: '', urgency: '', symptoms: '' })
      setTimeout(() => {
        navigate('/farmer-dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Error submitting request: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-glow"></div>

      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="page-title-section">
              <h1><i className="fas fa-user-md"></i> Doctor Consultation</h1>
              <p className="page-subtitle">Request veterinary consultation for your animals</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        <div className="consultation-wrapper">
          
          {/* Info Cards */}
          <div className="grid-3 mb-4">
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="info-content">
                <h3>Quick Response</h3>
                <p>Get expert advice within 24 hours</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="info-content">
                <h3>Certified Vets</h3>
                <p>Consult with licensed veterinarians</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-language"></i>
              </div>
              <div className="info-content">
                <h3>Multi-Language</h3>
                <p>Tamil & English voice support</p>
              </div>
            </div>
          </div>

          {/* Consultation Form */}
          <div className="card consultation-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-stethoscope"></i>
                Request Veterinary Consultation
              </h2>
              <p className="card-subtitle">கால்நடை மருத்துவர் ஆலோசனை கோரிக்கை</p>
            </div>

            {success && (
              <div className="alert alert-success">
                <i className="fas fa-check-circle"></i>
                <div>
                  <strong>Success!</strong> Consultation request submitted successfully!
                  <br />
                  <small>ஆலோசனை கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!</small>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="consultation-form">
              
              {/* Select Animal */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-paw"></i>
                  Select Animal / விலங்கைத் தேர்ந்தெடுக்கவும்
                </label>
                {loadingAnimals ? (
                  <div className="loading-select">
                    <div className="spinner"></div>
                    <span>Loading animals...</span>
                  </div>
                ) : animals.length === 0 ? (
                  <div className="no-animals-alert">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <strong>No animals found</strong>
                      <p>Please add animals first from the dashboard</p>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/farmer-dashboard')}
                      >
                        <i className="fas fa-plus"></i>
                        Add Animal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <select 
                      className="form-select" 
                      value={formData.animalId} 
                      onChange={(e) => {
                        console.log('Selected animal ID:', e.target.value)
                        setFormData({...formData, animalId: e.target.value})
                      }} 
                      required
                    >
                      <option value="">Choose an animal / விலங்கைத் தேர்ந்தெடுக்கவும்</option>
                      <option value="COW-01">🐄 Dairy Cow / பால் மாடு - #COW-01</option>
                      <option value="CHICKEN-01">🐔 Chicken / கோழி - #CHICKEN-01</option>
                      <option value="NATTUKOZHI-01">🐓 Nattukozhi / நாட்டுக்கோழி - #NATTUKOZHI-01</option>
                      <option value="GOAT-01">🐐 Goat / ஆடு - #GOAT-01</option>
                      <option value="BUFFALO-01">🐃 Buffalo / எருமை - #BUFFALO-01</option>
                      <option value="PIG-01">🐷 Pig / பன்றி - #PIG-01</option>
                      {animals.map(a => {
                        console.log('Rendering option for:', a.animalId, a.speciesDisplay)
                        return (
                          <option key={a.id} value={a.animalId}>
                            {a.speciesDisplay || a.species || 'Unknown'} - #{a.animalId} ({a.status || 'N/A'})
                          </option>
                        )
                      })}
                    </select>
                  </>
                )}
                <div className="form-hint">
                  <i className="fas fa-info-circle"></i>
                  Total animals available: {animals.length}
                </div>
              </div>

              {/* Urgency Level */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-exclamation-circle"></i>
                  Urgency Level / அவசர நிலை
                </label>
                <div className="urgency-grid">
                  <label className={`urgency-option ${formData.urgency === 'Low' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="urgency" 
                      value="Low"
                      checked={formData.urgency === 'Low'}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      required
                    />
                    <div className="urgency-content">
                      <div className="urgency-icon low">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div className="urgency-text">
                        <strong>Low</strong>
                        <span>Routine checkup</span>
                        <small>வழக்கமான பரிசோதனை</small>
                      </div>
                    </div>
                  </label>

                  <label className={`urgency-option ${formData.urgency === 'Medium' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="urgency" 
                      value="Medium"
                      checked={formData.urgency === 'Medium'}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      required
                    />
                    <div className="urgency-content">
                      <div className="urgency-icon medium">
                        <i className="fas fa-exclamation-circle"></i>
                      </div>
                      <div className="urgency-text">
                        <strong>Medium</strong>
                        <span>Needs attention</span>
                        <small>கவனம் தேவை</small>
                      </div>
                    </div>
                  </label>

                  <label className={`urgency-option ${formData.urgency === 'High' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="urgency" 
                      value="High"
                      checked={formData.urgency === 'High'}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      required
                    />
                    <div className="urgency-content">
                      <div className="urgency-icon high">
                        <i className="fas fa-exclamation-triangle"></i>
                      </div>
                      <div className="urgency-text">
                        <strong>High</strong>
                        <span>Urgent care needed</span>
                        <small>அவசர சிகிச்சை தேவை</small>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Symptoms */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-notes-medical"></i>
                  Symptoms / Description / அறிகுறிகள் / விளக்கம்
                  <span className="voice-badge">
                    <i className="fas fa-microphone"></i>
                    Voice Enabled / குரல் இயக்கப்பட்டது
                  </span>
                </label>
                <div className="textarea-wrapper">
                  <textarea 
                    className="form-textarea" 
                    value={formData.symptoms} 
                    onChange={(e) => setFormData({...formData, symptoms: e.target.value})} 
                    placeholder="Describe the symptoms or reason for consultation... / அறிகுறிகள் அல்லது ஆலோசனைக்கான காரணத்தை விவரிக்கவும்..."
                    rows="6"
                    required
                  />
                  <div className="voice-controls">
                    <button
                      type="button"
                      className={`voice-btn ${isListening ? 'listening' : ''}`}
                      onClick={() => toggleVoiceInput('ta-IN')}
                      title="Speak in Tamil"
                    >
                      <i className="fas fa-microphone"></i>
                      <span>தமிழ்</span>
                    </button>
                    <button
                      type="button"
                      className={`voice-btn ${isListening ? 'listening' : ''}`}
                      onClick={() => toggleVoiceInput('en-IN')}
                      title="Speak in English"
                    >
                      <i className="fas fa-microphone"></i>
                      <span>English</span>
                    </button>
                  </div>
                  {isListening && (
                    <div className="listening-indicator">
                      <span className="pulse"></span>
                      Listening... Speak now / கேட்கிறது... இப்போது பேசுங்கள்
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Submitting... / சமர்ப்பிக்கிறது...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>Submit Request / கோரிக்கையை சமர்ப்பிக்கவும்</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DoctorConsultation
