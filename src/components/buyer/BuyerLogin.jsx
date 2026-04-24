import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, sendPasswordResetEmail, doc, getDoc, signOut } from '../../config/firebase'

export default function BuyerLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showMsg = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanEmail = formData.email.trim()
      const result = await signInWithEmailAndPassword(auth, cleanEmail, formData.password)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (userDoc.exists() && userDoc.data().role === 'buyer') {
        showMsg('Login successful! Redirecting...', 'success')
        setTimeout(() => navigate('/buyer-dashboard'), 1500)
      } else {
        await signOut(auth)
        showMsg('This account is not registered as a buyer.', 'error')
        setLoading(false)
      }
    } catch (err) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email format'
      }
      showMsg(errorMessages[err.code] || 'Login failed.', 'error')
      setLoading(false)
    }
  }

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (userDoc.exists()) {
        if (userDoc.data().role === 'buyer') {
          navigate('/buyer-dashboard')
        } else {
          await signOut(auth)
          showMsg('This account is not registered as a buyer.', 'error')
        }
      } else {
        await signOut(auth)
        showMsg('Account not found. Please register first.', 'error')
        setTimeout(() => navigate('/buyer-register'), 2000)
      }
    }).catch(() => showMsg('Google sign-in failed.', 'error'))
  }, [])

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    setLoading(true)
    try {
      if (/android|capacitor/i.test(navigator.userAgent) || window.Capacitor) {
        await signInWithRedirect(auth, provider)
      } else {
        const result = await signInWithPopup(auth, provider)
        const userDoc = await getDoc(doc(db, 'users', result.user.uid))
        if (userDoc.exists()) {
          if (userDoc.data().role === 'buyer') {
            navigate('/buyer-dashboard')
          } else {
            await signOut(auth)
            showMsg('This account is not registered as a buyer.', 'error')
            setLoading(false)
          }
        } else {
          await signOut(auth)
          showMsg('Account not found. Please register first.', 'error')
          setTimeout(() => navigate('/buyer-register'), 2000)
        }
      }
    } catch (err) {
      showMsg('Google sign-in failed.', 'error')
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim())
      showMsg('Password reset link sent!', 'success')
      setTimeout(() => setShowReset(false), 3000)
    } catch (err) {
      showMsg('Failed to send reset email.', 'error')
    }
  }

  return (
    <>
      <style>{`
        .glass-card {
          background: rgba(37, 37, 48, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .neon-glow {
          box-shadow: 0px 10px 30px rgba(174, 163, 255, 0.25);
        }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
          min-height: max(884px, 100dvh);
        }
      `}</style>

      <div className="bg-[#0d0d15] text-[#efecf8] font-['Manrope'] min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="fixed top-0 w-full z-50 bg-[#0d0d15] flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#aea3ff]">security</span>
            <h1 className="text-xl font-black tracking-tighter text-[#efecf8] font-['Epilogue']">VetSafe Tracker</h1>
          </div>
          <div className="md:flex hidden gap-6">
            <a className="text-[#aea3ff] font-['Epilogue'] font-bold tracking-tight" href="#">Login</a>
            <a className="text-[#efecf8] font-['Epilogue'] font-bold tracking-tight hover:bg-[#252530] transition-colors" href="#">Help</a>
            <a className="text-[#efecf8] font-['Epilogue'] font-bold tracking-tight hover:bg-[#252530] transition-colors" href="#">Legal</a>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-28 relative overflow-hidden">
          {/* Ambient background glow elements */}
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-[#aea3ff]/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-[#81ecff]/10 rounded-full blur-[100px]"></div>
          
          <div className="w-full max-w-md">
            {/* Header Section */}
            <div className="mb-10 space-y-2 text-center md:text-left">
              <h2 className="text-4xl font-['Epilogue'] font-extrabold tracking-tight text-[#efecf8]">
                {showReset ? 'Reset Password' : 'Buyer Login'}
              </h2>
              <p className="text-[#acaab5] font-medium">
                {showReset ? 'Enter your email to receive a reset link' : 'Welcome back to VetSafe Tracker'}
              </p>
            </div>

            {/* Login Card */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative">
              {/* Branding Accent */}
              <div className="absolute top-0 right-8 w-16 h-1 bg-gradient-to-r from-[#aea3ff] to-[#81ecff] rounded-b-full"></div>
              
              <div className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-2xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-sm font-semibold`}>
                    {message.text}
                  </div>
                )}

                {!showReset ? (
                  <>
                    {/* Social Login */}
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 bg-[#252530] py-4 rounded-2xl hover:bg-[#2b2b38] transition-all duration-300 border border-[#484750]/10 group"
                    >
                      <svg width="24" height="24" viewBox="0 0 20 20">
                        <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                        <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                        <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                        <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
                      </svg>
                      <span className="font-semibold text-[#efecf8] group-hover:text-[#aea3ff] transition-colors">
                        {loading ? 'Signing in...' : 'Continue with Google'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-[1px] flex-grow bg-[#76747f]/20"></div>
                      <span className="text-xs font-bold tracking-widest text-[#acaab5]/60">OR</span>
                      <div className="h-[1px] flex-grow bg-[#76747f]/20"></div>
                    </div>

                    {/* Input Fields */}
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                          </div>
                          <input 
                            className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                            placeholder="name@vetsafe.com" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Password</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">lock</span>
                          </div>
                          <input 
                            className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-12 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                            placeholder="••••••••" 
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                          />
                          <div className="absolute inset-y-0 right-4 flex items-center">
                            <span 
                              className="material-symbols-outlined text-[#76747f] cursor-pointer hover:text-[#efecf8]"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Link */}
                      <div className="flex justify-end">
                        <a 
                          className="text-sm font-semibold text-[#aea3ff] hover:text-[#81ecff] transition-colors cursor-pointer"
                          onClick={() => setShowReset(true)}
                        >
                          Forgot Password?
                        </a>
                      </div>

                      {/* Submit Button */}
                      <button 
                        className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] py-5 rounded-2xl text-[#000000] font-bold text-lg tracking-tight neon-glow hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50" 
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'SIGNING IN...' : 'SIGN IN'}
                      </button>
                    </form>
                  </>
                ) : (
                  <form onSubmit={handleReset} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                        </div>
                        <input 
                          className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                          placeholder="name@vetsafe.com" 
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="w-full bg-[#252530] py-4 rounded-2xl text-[#efecf8] font-bold tracking-tight hover:bg-[#2b2b38] transition-all duration-200"
                    >
                      ← BACK TO LOGIN
                    </button>

                    <button 
                      className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] py-5 rounded-2xl text-[#000000] font-bold text-lg tracking-tight neon-glow hover:scale-[0.98] transition-transform duration-200" 
                      type="submit"
                    >
                      SEND RESET LINK
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Footer Text */}
            <p className="mt-8 text-center text-[#acaab5] text-sm">
              Don't have an account? <a className="text-[#aea3ff] font-bold hover:underline decoration-2 underline-offset-4 cursor-pointer" onClick={() => navigate('/buyer-register')}>Create Account</a>
            </p>
          </div>
        </main>

        {/* BottomNavBar */}
        <nav className="fixed bottom-0 w-full z-50 rounded-t-[1.5rem] bg-[#0d0d15]/80 backdrop-blur-xl shadow-[0px_-10px_30px_rgba(174,163,255,0.05)] flex justify-around items-center h-20 pb-safe px-4">
          <a className="flex flex-col items-center justify-center bg-[#252530] text-[#aea3ff] rounded-2xl px-4 py-1.5 scale-98 duration-150" href="#">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>login</span>
            <span className="font-['Manrope'] text-xs font-semibold">Secure Login</span>
          </a>
          <a className="flex flex-col items-center justify-center text-[#efecf8]/60 hover:text-[#aea3ff] transition-all duration-150" href="#">
            <span className="material-symbols-outlined">help_outline</span>
            <span className="font-['Manrope'] text-xs font-semibold">Help</span>
          </a>
          <a className="flex flex-col items-center justify-center text-[#efecf8]/60 hover:text-[#aea3ff] transition-all duration-150" href="#">
            <span className="material-symbols-outlined">gavel</span>
            <span className="font-['Manrope'] text-xs font-semibold">Legal</span>
          </a>
        </nav>

        {/* Background Decoration */}
        <div className="fixed top-0 right-0 p-12 opacity-10 -z-10 pointer-events-none">
          <span className="material-symbols-outlined text-[300px]">pets</span>
        </div>
      </div>
    </>
  )
}
