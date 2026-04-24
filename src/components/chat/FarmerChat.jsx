import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, getDoc } from '../../config/firebase'
import './DoctorChat.css'

export default function FarmerChat() {
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/farmer-login'); return }
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'farmer') {
        navigate('/farmer-login'); return
      }
      setFarmer({ uid: user.uid, ...userDoc.data() })

      const q = query(collection(db, 'users'), where('role', '==', 'doctor'))
      const snap = await getDocs(q)
      setDoctors(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [navigate])

  const openChat = (doctorId) => {
    navigate(`/chat/${farmer.uid}_${doctorId}`)
  }

  return (
    <div className="doctor-chat-page">
      <div className="doctor-chat-header">
        <button className="doctor-chat-back" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>👨⚕️ Chat with a Doctor</h2>
      </div>

      <div className="doctor-chat-list">
        {loading ? (
          <div className="doctor-chat-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="doctor-chat-empty">
            <span>👨⚕️</span>
            <p>No doctors registered yet.</p>
          </div>
        ) : (
          doctors.map(doctor => (
            <div key={doctor.uid} className="doctor-chat-item" onClick={() => openChat(doctor.uid)}>
              <div className="doctor-chat-item-avatar">👨⚕️</div>
              <div className="doctor-chat-item-info">
                <div className="doctor-chat-item-name">{doctor.name}</div>
                <div className="doctor-chat-item-sub">📍 {doctor.location || doctor.email}</div>
              </div>
              <i className="fas fa-chevron-right doctor-chat-item-arrow"></i>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
