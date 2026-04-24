import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, sendPasswordResetEmail, doc, getDoc, setDoc, serverTimestamp } from '../../config/firebase'

export default function DoctorLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const showMsg = (text, type) => {
    setMessage({ text, type })
    if (type === 'error') setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        showMsg('Login successful! Redirecting...', 'success')
        setTimeout(() => navigate('/doctor-dashboard'), 1500)
      } else {
        await auth.signOut()
        showMsg('This account is not registered as a doctor.', 'error')
        setLoading(false)
      }
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email format.',
        'auth/invalid-credential': 'Invalid email or password.'
      }
      showMsg(errorMessages[error.code] || 'Login failed.', 'error')
      setLoading(false)
    }
  }

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (userDoc.exists()) {
        if (userDoc.data().role === 'doctor') {
          navigate('/doctor-dashboard')
        } else {
          await auth.signOut()
          showMsg('This account is not registered as a doctor.', 'error')
        }
      } else {
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName || 'Doctor',
          email: result.user.email,
          role: 'doctor',
          verified: false,
          specialization: 'Veterinary Medicine',
          createdAt: serverTimestamp()
        })
        navigate('/doctor-dashboard')
      }
    }).catch(() => showMsg('Google sign-in failed.', 'error'))
  }, [])

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      if (/android|capacitor/i.test(navigator.userAgent) || window.Capacitor) {
        await signInWithRedirect(auth, provider)
      } else {
        const result = await signInWithPopup(auth, provider)
        const userDoc = await getDoc(doc(db, 'users', result.user.uid))
        if (userDoc.exists()) {
          if (userDoc.data().role === 'doctor') {
            navigate('/doctor-dashboard')
          } else {
            await auth.signOut()
            showMsg('This account is not registered as a doctor.', 'error')
          }
        } else {
          await setDoc(doc(db, 'users', result.user.uid), {
            name: result.user.displayName || 'Doctor',
            email: result.user.email,
            role: 'doctor',
            verified: false,
            specialization: 'Veterinary Medicine',
            createdAt: serverTimestamp()
          })
          navigate('/doctor-dashboard')
        }
      }
    } catch (error) {
      showMsg('Google sign-in failed.', 'error')
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      showMsg('Password reset link sent!', 'success')
      setTimeout(() => setShowReset(false), 3000)
    } catch (error) {
      showMsg('Failed to send reset email.', 'error')
    }
  }

  return (
    <>
      <style>{`
        .glass-panel {
          background: rgba(37, 37, 48, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .neon-glow {
          box-shadow: 0px 10px 30px rgba(174, 163, 255, 0.25);
        }
        body {
          min-height: max(884px, 100dvh);
        }
      `}</style>

      <div className="bg-[#0d0d15] text-[#efecf8] font-['Manrope'] min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="w-full top-0 sticky z-[100] bg-[#0d0d15] flex items-center justify-between px-6 py-4 bg-[#13131b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#aea3ff]">pets</span>
            <h1 className="font-['Epilogue'] font-bold text-lg tracking-tight text-[#aea3ff]">VetPrecision</h1>
          </div>
          <div className="text-[#aea3ff] font-black italic tracking-tighter text-xl">VP</div>
        </header>

        <main className="flex-grow flex flex-col px-6 pt-8 pb-12 max-w-lg mx-auto w-full relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#aea3ff]/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#81ecff] text-3xl">medical_information</span>
              <h2 className="font-['Epilogue'] font-extrabold text-3xl leading-tight tracking-tight">Doctor Login</h2>
            </div>
            <p className="text-[#acaab5] text-lg font-medium">Welcome back to VetSafe Tracker</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-[#252530] px-3 py-1.5 rounded-full">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#9f92ff] border-2 border-[#0d0d15] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-[#000000]">person</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#00e3fd] border-2 border-[#0d0d15] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-[#004d57]">person</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#81ecff] tracking-wide uppercase">500+ Vets Online</span>
            </div>
          </div>

          {/* Professional Context Info Box */}
          <div className="bg-[#13131b] p-5 rounded-xl mb-8 flex gap-4 outline-[#484750]/10 outline outline-1">
            <span className="material-symbols-outlined text-[#9d8fff]">verified</span>
            <p className="text-sm leading-relaxed text-[#efecf8]/80">
              <strong className="text-[#9d8fff]">Secure Access:</strong> Login to manage consultations and provide veterinary services.
            </p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-sm font-semibold`}>
              {message.text}
            </div>
          )}

          {!showReset ? (
            <>
              {/* Google Sign In */}
              <button 
                className="w-full bg-[#252530] text-[#efecf8] font-['Manrope'] font-semibold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-[#2b2b38] transition-all mb-6"
                onClick={handleGoogleLogin}
              >
                <svg width="18" height="18" viewBox="0 0 20 20">
                  <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                  <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                  <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                  <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[#484750]"></div>
                <span className="text-[#acaab5] text-sm font-semibold">or</span>
                <div className="flex-1 h-px bg-[#484750]"></div>
              </div>

              {/* Form Container */}
              <form onSubmit={handleEmailLogin} className="space-y-6">
                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                    <input 
                      className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                      placeholder="doctor@example.com" 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Password</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">lock</span>
                    <input 
                      className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-12 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                      placeholder="••••••••" 
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <span 
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#acaab5] cursor-pointer hover:text-[#efecf8]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <a className="text-sm text-[#aea3ff] font-semibold hover:underline cursor-pointer" onClick={() => setShowReset(true)}>
                    Forgot Password?
                  </a>
                </div>

                {/* CTA Button */}
                <button 
                  className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] text-[#000000] font-['Epilogue'] font-black py-5 rounded-xl neon-glow flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined font-bold">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Register Link */}
              <div className="mt-8 text-center">
                <p className="text-sm text-[#acaab5]">
                  New doctor? <a className="text-[#aea3ff] font-bold hover:underline cursor-pointer" onClick={() => navigate('/doctor-register')}>Create account</a>
                </p>
              </div>

              {/* Trust Signals Bento Section */}
              <div className="mt-12 grid grid-cols-3 gap-3">
                <div className="bg-[#13131b] p-4 rounded-xl flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#aea3ff] text-xl" style={{fontVariationSettings: "'FILL' 1"}}>security</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#efecf8]/40">SECURE</span>
                </div>
                <div className="bg-[#13131b] p-4 rounded-xl flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#81ecff] text-xl" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#efecf8]/40">FAST</span>
                </div>
                <div className="bg-[#13131b] p-4 rounded-xl flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#e4dff8] text-xl" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#efecf8]/40">VERIFIED</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Reset Password Form */}
              <div className="mb-6">
                <h3 className="font-['Epilogue'] font-bold text-2xl mb-2">Reset Password</h3>
                <p className="text-[#acaab5] text-sm">Enter your email to receive a reset link</p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                    <input 
                      className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                      placeholder="doctor@example.com" 
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  className="w-full bg-[#252530] text-[#efecf8] font-['Manrope'] font-semibold py-4 rounded-xl hover:bg-[#2b2b38] transition-all flex items-center justify-center gap-2"
                  onClick={() => setShowReset(false)}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Back to Login</span>
                </button>

                <button 
                  className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] text-[#000000] font-['Epilogue'] font-black py-5 rounded-xl neon-glow flex items-center justify-center gap-3 active:scale-95 transition-transform" 
                  type="submit"
                >
                  <span>Send Reset Link</span>
                  <span className="material-symbols-outlined font-bold">send</span>
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </>
  )
}
