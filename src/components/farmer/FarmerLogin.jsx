import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signOut, doc, getDoc, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from '../../config/firebase'
import { useEffect } from 'react'
import './FarmerLogin.css'

function FarmerLogin() {
  const navigate = useNavigate()
  const [showReset, setShowReset] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [resetEmail, setResetEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password)
      navigate('/farmer-dashboard')
    } catch (err) {
      const errorMessages = {
        'auth/user-not-found': 'User not registered. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-login-credentials': 'Invalid email or password.',
        'auth/invalid-email': 'Invalid email format.',
        'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
        'auth/too-many-requests': 'Too many failed attempts. Try again later.',
        'auth/user-disabled': 'This account has been disabled.'
      }
      setError(errorMessages[err.code] || `Login failed: ${err.message}`)
    }
    setLoading(false)
  }

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (userDoc.exists()) {
        if (userDoc.data().role === 'farmer') {
          navigate('/farmer-dashboard')
        } else {
          await signOut(auth)
          setError('This account is not registered as a farmer.')
        }
      } else {
        await signOut(auth)
        setError('Account not found. Please register first.')
        setTimeout(() => navigate('/farmer-register'), 2000)
      }
    }).catch((err) => setError(err.message))
  }, [])

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      if (/android|capacitor/i.test(navigator.userAgent) || window.Capacitor) {
        await signInWithRedirect(auth, provider)
      } else {
        const result = await signInWithPopup(auth, provider)
        const userDoc = await getDoc(doc(db, 'users', result.user.uid))
        if (userDoc.exists()) {
          if (userDoc.data().role === 'farmer') {
            navigate('/farmer-dashboard')
          } else {
            await signOut(auth)
            setError('This account is not registered as a farmer.')
          }
        } else {
          await signOut(auth)
          setError('Account not found. Please register first.')
          setTimeout(() => navigate('/farmer-register'), 2000)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setSuccess('Password reset link sent to your email!')
      setTimeout(() => setShowReset(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="bg-grid"></div>

      {/* Left Panel - Brand Section */}
      <div className="login-left">
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
              Smart Livestock<br />
              <span className="highlight">Management</span><br />
              Platform
            </h2>
            <p>
              Track antibiotic usage, manage withdrawal periods, and ensure food safety compliance — all in one powerful platform.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-text">
                  <h4>Real-time Monitoring</h4>
                  <p>Track animal health status instantly</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💊</div>
                <div className="feature-text">
                  <h4>Withdrawal Tracking</h4>
                  <p>Automated antibiotic period management</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">👨‍⚕️</div>
                <div className="feature-text">
                  <h4>Vet Consultation</h4>
                  <p>Direct access to veterinary experts</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✅</div>
                <div className="feature-text">
                  <h4>MRL Compliance</h4>
                  <p>Certified food safety standards</p>
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

      {/* Right Panel - Login Form */}
      <div className="login-right">
        <div className="login-container">
          {/* Mobile Logo */}
          <div className="mobile-logo">
            <div className="logo-icon">🌾</div>
            <h1>VetSafe Tracker</h1>
          </div>

          {!showReset ? (
            <>
              <div className="login-header">
                <h2>Welcome back 👋</h2>
                <p>Sign in to your farmer account</p>
              </div>

              {error && (
                <div className="message error">
                  <span className="msg-icon">⚠️</span>
                  {error}
                </div>
              )}

              <button className="google-btn" onClick={handleGoogleSignIn}>
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                  <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                  <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                  <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
                </svg>
                Continue with Google
              </button>

              <div className="divider">or</div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>
                    <span className="label-icon">✉️</span>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="farmer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-icon">🔒</span>
                    Password
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="forgot-link">
                  <a onClick={() => setShowReset(true)}>Forgot Password?</a>
                </div>

                <button type="submit" className="button" disabled={loading}>
                  <div className="button-content">
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <span className="button-arrow">→</span>
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="login-link">
                New farmer? <a onClick={() => navigate('/farmer-register')}>Create account</a>
              </div>

              <div className="trust-badges">
                <div className="trust-item">
                  <span className="trust-icon">🔒</span>
                  <span>Secure</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">⚡</span>
                  <span>Fast</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">✓</span>
                  <span>Verified</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="login-header">
                <h2>Reset Password 🔐</h2>
                <p>Enter your email to receive a reset link</p>
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

              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label>
                    <span className="label-icon">✉️</span>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="farmer@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowReset(false)}
                >
                  ← Back to Login
                </button>
                <button type="submit" className="button">
                  Send Reset Link
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FarmerLogin
