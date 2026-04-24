import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'

export default function DoctorRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', location: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [locations, setLocations] = useState([])
  const [locationCoords, setLocationCoords] = useState({ lat: null, lon: null })

  const showMsg = (text, type) => {
    setMessage({ text, type })
    if (type === 'error') setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const searchLocation = async (query) => {
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

  const handleLocationChange = (value) => {
    setFormData({ ...formData, location: value })
    const timer = setTimeout(() => searchLocation(value), 500)
    return () => clearTimeout(timer)
  }

  const handleLocationSelect = (place) => {
    setFormData({ ...formData, location: place.display_name })
    setLocationCoords({ lat: place.lat, lon: place.lon })
    setLocations([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.location) {
      showMsg('Please enter your practice location.', 'error')
      return
    }

    if (formData.password.length < 6) {
      showMsg('Password must be at least 6 characters long.', 'error')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        location: formData.location,
        latitude: locationCoords.lat,
        longitude: locationCoords.lon,
        email: formData.email,
        role: 'doctor',
        verified: false,
        specialization: 'Veterinary Medicine',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      showMsg('✅ Registration Successful! Redirecting to login...', 'success')
      setTimeout(() => navigate('/doctor-login'), 2000)

    } catch (error) {
      console.error('Registration error:', error)
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login or use a different email.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.'
      }
      showMsg(errorMessages[error.code] || error.message || 'Registration failed. Please try again.', 'error')
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    const len = formData.password.length
    if (len === 0) return { width: '0%', text: '', color: '' }
    if (len < 6) return { width: '30%', text: 'Weak', color: 'bg-red-500' }
    if (len < 9) return { width: '65%', text: 'High Clinical Precision', color: 'bg-gradient-to-r from-[#aea3ff] to-[#81ecff]' }
    return { width: '100%', text: 'Maximum Security', color: 'bg-gradient-to-r from-[#aea3ff] to-[#81ecff]' }
  }

  const strength = getPasswordStrength()

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
        .vitals-glow {
          filter: blur(4px);
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

        <main className="flex-grow flex flex-col px-6 pt-8 pb-32 max-w-lg mx-auto w-full relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#aea3ff]/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#81ecff] text-3xl">medical_information</span>
              <h2 className="font-['Epilogue'] font-extrabold text-3xl leading-tight tracking-tight">Veterinary Doctor Registration</h2>
            </div>
            <p className="text-[#acaab5] text-lg font-medium">Join as a Veterinary Professional</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-[#252530] px-3 py-1.5 rounded-full">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#9f92ff] border-2 border-[#0d0d15] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-[#000000]">person</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#00e3fd] border-2 border-[#0d0d15] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-[#004d57]">person</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#81ecff] tracking-wide uppercase">500+ Vets Already Joined</span>
            </div>
          </div>

          {/* Professional Context Info Box */}
          <div className="bg-[#13131b] p-5 rounded-xl mb-8 flex gap-4 outline-[#484750]/10 outline outline-1">
            <span className="material-symbols-outlined text-[#9d8fff]">verified</span>
            <p className="text-sm leading-relaxed text-[#efecf8]/80">
              <strong className="text-[#9d8fff]">For Veterinary Professionals:</strong> Register to provide veterinary services and connect with farmers in your area.
            </p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-sm font-semibold`}>
              {message.text}
            </div>
          )}

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">badge</span>
                <input 
                  className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                  placeholder="Dr. Your Full Name" 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Practice Location */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Practice Location</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">location_on</span>
                <input 
                  className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                  placeholder="Search your location" 
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  required
                />
                {locations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#252530] rounded-xl border border-[#484750] max-h-48 overflow-y-auto z-50">
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

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5] ml-1">Email Address</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">mail</span>
                <input 
                  className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-4 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                  placeholder="velu@gmail.com" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#acaab5]">Password</label>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#acaab5] group-focus-within:text-[#aea3ff] transition-colors">lock</span>
                <input 
                  className="w-full bg-[#252530] border-none rounded-xl py-4 pl-12 pr-12 text-[#efecf8] placeholder:text-[#76747f] focus:ring-2 focus:ring-[#aea3ff]/50 transition-all outline-none" 
                  placeholder="••••••••" 
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                />
                <span 
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#acaab5] cursor-pointer hover:text-[#efecf8]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </div>
              {/* Strength Meter */}
              {formData.password && (
                <div className="pt-1 px-1">
                  <div className="h-1 w-full bg-[#191922] rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} vitals-glow transition-all duration-300`} style={{ width: strength.width }}></div>
                  </div>
                  <p className="text-[10px] mt-1.5 font-bold text-[#81ecff] uppercase tracking-tighter">
                    {strength.text && `Strength: ${strength.text}`}
                  </p>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <button 
              className="w-full bg-gradient-to-r from-[#aea3ff] to-[#9f92ff] text-[#000000] font-['Epilogue'] font-black py-5 rounded-xl neon-glow flex items-center justify-center gap-3 active:scale-95 transition-transform mt-8 disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register as Doctor</span>
                  <span className="material-symbols-outlined font-bold">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#acaab5]">
              Already have an account? <a className="text-[#aea3ff] font-bold hover:underline cursor-pointer" onClick={() => navigate('/doctor-login')}>Login here</a>
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
              <span className="text-[10px] font-black uppercase tracking-widest text-[#efecf8]/40">FAST SETUP</span>
            </div>
            <div className="bg-[#13131b] p-4 rounded-xl flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[#e4dff8] text-xl" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#efecf8]/40">VERIFIED</span>
            </div>
          </div>
        </main>


      </div>
    </>
  )
}
