import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'
import './FarmerRegister.css'

function FarmerRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    email: '',
    password: '',
    farmTypes: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      farmTypes: e.target.checked 
        ? [...prev.farmTypes, value]
        : prev.farmTypes.filter(type => type !== value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.farmTypes.length === 0) {
      setError('Please select at least one farm type.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        city: formData.city,
        email: formData.email,
        role: 'farmer',
        farmTypes: formData.farmTypes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      setSuccess('✅ Registration Successful! Redirecting to login...')
      setTimeout(() => navigate('/farmer-login'), 2000)
    } catch (err) {
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your connection.'
      }
      setError(errorMessages[err.code] || err.message)
      setLoading(false)
    }
  }

  return (
    <div className="register-wrapper">
      <div className="bg-grid"></div>

      {/* Left Panel - Brand Section */}
      <div className="register-left">
        <div className="brand-section">
          <div className="brand-logo">
            <div className="logo-icon">🌾</div>
            <div className="logo-text">
              <h1>VetSafe</h1>
              <p>Tracker</p>
            </div>
          </div>

          <div className="brand-content">
            <h2>
              Join the Future of<br />
              <span className="highlight">Livestock</span><br />
              Management
            </h2>
            <p>
              Register now to access powerful tools for tracking animal health, managing treatments, and ensuring food safety compliance.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🐄</div>
                <div className="feature-text">
                  <h4>Animal Management</h4>
                  <p>Track all your livestock in one place</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💊</div>
                <div className="feature-text">
                  <h4>Treatment Records</h4>
                  <p>Automated withdrawal period tracking</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-text">
                  <h4>Analytics Dashboard</h4>
                  <p>Real-time insights and reports</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✅</div>
                <div className="feature-text">
                  <h4>Compliance Certified</h4>
                  <p>MRL and FSSAI compliant platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="brand-footer">
          <div className="stat-item">
            <div className="stat-value">1,200+</div>
            <div className="stat-label">Active Farmers</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">8,500+</div>
            <div className="stat-label">Animals Tracked</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">98%</div>
            <div className="stat-label">Compliance Rate</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="register-right">
        <div className="register-container">
          {/* Mobile Logo */}
          <div className="mobile-logo">
            <div className="logo-icon">🌾</div>
            <h1>VetSafe Tracker</h1>
          </div>

          <div className="register-header">
            <h2>Create your account 🚀</h2>
            <p>Start managing your livestock today</p>
          </div>

          {error && (
            <div className="message error">
              <span className="msg-icon">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="message success">
              <span className="msg-icon">✅</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">
                <span className="label-icon">👤</span>
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">
                <span className="label-icon">📍</span>
                City
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              >
                <option value="">Select your city</option>
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Tiruchirappalli">Tiruchirappalli</option>
                <option value="Salem">Salem</option>
                <option value="Tirunelveli">Tirunelveli</option>
                <option value="Tiruppur">Tiruppur</option>
                <option value="Erode">Erode</option>
                <option value="Vellore">Vellore</option>
                <option value="Thoothukudi">Thoothukudi</option>
                <option value="Thanjavur">Thanjavur</option>
                <option value="Dindigul">Dindigul</option>
                <option value="Ranipet">Ranipet</option>
                <option value="Sivakasi">Sivakasi</option>
                <option value="Karur">Karur</option>
                <option value="Udhagamandalam">Udhagamandalam (Ooty)</option>
                <option value="Hosur">Hosur</option>
                <option value="Nagercoil">Nagercoil</option>
                <option value="Kanchipuram">Kanchipuram</option>
                <option value="Kumbakonam">Kumbakonam</option>
                <option value="Tiruvannamalai">Tiruvannamalai</option>
                <option value="Pollachi">Pollachi</option>
                <option value="Rajapalayam">Rajapalayam</option>
                <option value="Gudiyatham">Gudiyatham</option>
                <option value="Pudukkottai">Pudukkottai</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <span className="label-icon">✉️</span>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <span className="label-icon">🔒</span>
                Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: formData.password.length > 8 ? '100%' : 
                             formData.password.length > 5 ? '60%' : '30%' 
                    }}
                  ></div>
                </div>
                <span className="strength-text">
                  {formData.password.length > 8 ? 'Strong' : 
                   formData.password.length > 5 ? 'Medium' : 
                   formData.password.length > 0 ? 'Weak' : ''}
                </span>
              </div>
            </div>

            <div className="checkbox-group">
              <strong>🐄 What animals do you have?</strong>

              {[
                { id: 'dairy', value: 'Dairy Cow', icon: '🐄', label: 'Dairy Cow', sublabel: 'பால் மாடு' },
                { id: 'goat', value: 'Goat/Sheep', icon: '🐐', label: 'Goat/Sheep', sublabel: 'ஆடு/செம்மறி' },
                { id: 'poultry', value: 'Poultry', icon: '🐔', label: 'Poultry', sublabel: 'கோழி' },
                { id: 'pig', value: 'Pig', icon: '🐷', label: 'Pig', sublabel: 'பன்றி' },
                { id: 'buffalo', value: 'Buffalo', icon: '🐃', label: 'Buffalo', sublabel: 'எருமை' }
              ].map(farm => (
                <div className="checkbox-item" key={farm.id}>
                  <input
                    type="checkbox"
                    id={farm.id}
                    value={farm.value}
                    checked={formData.farmTypes.includes(farm.value)}
                    onChange={handleCheckboxChange}
                  />
                  <label htmlFor={farm.id}>
                    <span className="checkbox-icon">{farm.icon}</span>
                    <span className="checkbox-content">
                      <span className="checkbox-label">{farm.label}</span>
                      <span className="checkbox-sublabel">{farm.sublabel}</span>
                    </span>
                    <span className="checkmark">✓</span>
                  </label>
                </div>
              ))}
            </div>

            <button className="button" type="submit" disabled={loading}>
              <div className="button-content">
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="button-arrow">→</span>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="login-link">
            Already have an account? <a onClick={() => navigate('/farmer-login')}>Login here</a>
          </div>

          <div className="trust-badges">
            <div className="trust-item">
              <span className="trust-icon">🔒</span>
              <span>Secure</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⚡</span>
              <span>Fast Setup</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FarmerRegister
