import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'

export default function BuyerRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', location: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [locations, setLocations] = useState([])
  const [coords, setCoords] = useState({ lat: null, lon: null })
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showMsg = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleLocationSearch = async (query) => {
    if (query.length < 3) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
        { headers: { 'User-Agent': 'VetSafeTracker/1.0' } }
      )
      const data = await response.json()
      setLocations(data)
    } catch (error) {
      console.error('Location search error:', error)
    }
  }

  const handleLocationSelect = (place) => {
    setFormData({ ...formData, location: place.display_name })
    setCoords({ lat: place.lat, lon: place.lon })
    setLocations([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password.length < 6) {
      showMsg('Password must be at least 6 characters long.', 'error')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password)
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        location: formData.location,
        latitude: coords.lat,
        longitude: coords.lon,
        email: formData.email.trim(),
        role: 'buyer',
        businessType: 'Livestock Buyer',
        verified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      showMsg('✅ Registration Successful! Redirecting to login...', 'success')
      setTimeout(() => navigate('/buyer-login'), 2000)
    } catch (error) {
      console.error('Registration error:', error)
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login or use a different email.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.'
      }
      showMsg(errorMessages[error.code] || error.message, 'error')
      setLoading(false)
    }
  }

  let debounceTimer
  const handleLocationInput = (value) => {
    setFormData({ ...formData, location: value })
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => handleLocationSearch(value), 500)
  }

  const getPasswordStrength = () => {
    const len = formData.password.length
    if (len === 0) return { width: '0%', text: '', color: '' }
    if (len < 6) return { width: '30%', text: 'Weak', color: 'bg-red-500' }
    if (len < 9) return { width: '60%', text: 'Medium', color: 'bg-yellow-500' }
    return { width: '100%', text: 'Strong', color: 'bg-green-500' }
  }

  const strength = getPasswordStrength()

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
            <a className="text-[#aea3ff] font-['Epilogue'] font-bold tracking-tight cursor-pointer" onClick={() => navigate('/buyer-login')}>Login</a>
            <a className="text-[#efecf8] font-['Epilogue'] font-bold tracking-tight hover:bg-[#252530] transition-colors" href="#">Help</a>
            <a className="text-[#efecf8] font-['Epilogue'] font-bold tracking-tight hover:bg-[#252530] transition-colors" href="#">Legal</a>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-28 relative overflow-hidden">
          {/* Ambient background glow elements */}
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-[#aea3ff]/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-[#81ecff]/10 rounded-full blur-[100px]"></div>
          
          <div className="w-full max-w-md">
            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              <div className="w-6 h-2 rounded-full bg-gradient-to-r from-[#aea3ff] to-[#81ecff]"></div>
              <div className="w-2 h-2 rounded-full bg-[#484750]"></div>
              <div className="w-2 h-2 rounded-full bg-[#484750]"></div>
            </div>

            {/* Header Section */}
            <div className="mb-10 space-y-2 text-center md:text-left">
              <h2 className="text-4xl font-['Epilogue'] font-extrabold tracking-tight text-[#efecf8]">Buyer Registration</h2>
              <p className="text-[#acaab5] font-medium">Join as a Livestock Buyer</p>
              
              {/* Stats Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#252530] rounded-full mt-4">
                <span className="material-symbols-outlined text-[#aea3ff] text-sm">group</span>
                <span className="text-xs font-semibold text-[#acaab5]">300+ Buyers Already Joined</span>
              </div>
            </div>

            {/* Register Card */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative">
              {/* Branding Accent */}
              <div className="absolute top-0 right-8 w-16 h-1 bg-gradient-to-r from-[#aea3ff] to-[#81ecff] rounded-b-full"></div>
              
              {/* Info Box */}
              <div className="mb-6 p-4 bg-[#252530] rounded-2xl border border-[#484750]/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#aea3ff] text-xl">info</span>
                  <div>
                    <p className="text-sm font-semibold text-[#efecf8] mb-1">🥩 For Meat & Livestock Buyers</p>
                    <p className="text-xs text-[#acaab5]">Register to access quality livestock products and connect with verified farmers.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-2xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-sm font-semibold`}>
                    {message.text}
                  </div>
                )}

                {/* Input Fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">person</span>
                      </div>
                      <input 
                        className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                        placeholder="Enter your full name" 
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Business Location</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">location_on</span>
                      </div>
                      <input 
                        className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                        placeholder="Search your location" 
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleLocationInput(e.target.value)}
                        required
                      />
                      {locations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#252530] rounded-2xl border border-[#484750] max-h-48 overflow-y-auto z-50">
                          {locations.map((place, idx) => (
                            <div 
                              key={idx} 
                              className="px-4 py-3 hover:bg-[#2b2b38] cursor-pointer text-sm text-[#efecf8] border-b border-[#484750]/20 last:border-b-0"
                              onClick={() => handleLocationSelect(place)}
                            >
                              {place.display_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#76747f] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                      </div>
                      <input 
                        className="w-full bg-[#13131b] border-none rounded-2xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                        placeholder="your.email@example.com" 
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
                        placeholder="Create a strong password" 
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength="6"
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
                    {/* Password Strength */}
                    {formData.password && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-[#252530] rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#acaab5]">{strength.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button 
                    className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] py-5 rounded-2xl text-[#000000] font-bold text-lg tracking-tight neon-glow hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 flex items-center justify-center gap-2" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        <span>REGISTERING...</span>
                      </>
                    ) : (
                      <>
                        <span>REGISTER AS BUYER</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer Text */}
            <p className="mt-8 text-center text-[#acaab5] text-sm">
              Already have an account? <a className="text-[#aea3ff] font-bold hover:underline decoration-2 underline-offset-4 cursor-pointer" onClick={() => navigate('/buyer-login')}>Login here</a>
            </p>

            {/* Trust Badges */}
            <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-[#484750]/20">
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[#aea3ff] text-2xl">lock</span>
                <span className="text-xs font-semibold text-[#acaab5]">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[#aea3ff] text-2xl">bolt</span>
                <span className="text-xs font-semibold text-[#acaab5]">Fast Setup</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[#aea3ff] text-2xl">verified</span>
                <span className="text-xs font-semibold text-[#acaab5]">Verified</span>
              </div>
            </div>
          </div>
        </main>

        {/* BottomNavBar */}
        <nav className="fixed bottom-0 w-full z-50 rounded-t-[1.5rem] bg-[#0d0d15]/80 backdrop-blur-xl shadow-[0px_-10px_30px_rgba(174,163,255,0.05)] flex justify-around items-center h-20 pb-safe px-4">
          <a className="flex flex-col items-center justify-center bg-[#252530] text-[#aea3ff] rounded-2xl px-4 py-1.5 scale-98 duration-150" href="#">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person_add</span>
            <span className="font-['Manrope'] text-xs font-semibold">Register</span>
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
