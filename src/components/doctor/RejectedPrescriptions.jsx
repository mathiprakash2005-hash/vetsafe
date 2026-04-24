import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, getDoc } from '../../config/firebase'
import './ConsultationRequests.css'

export default function RejectedPrescriptions() {
  const navigate = useNavigate()
  const [rejections, setRejections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        loadRejections()
      } else {
        navigate('/doctor-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadRejections = async () => {
    try {
      const q = query(collection(db, 'consultationRequests'), where('status', '==', 'rejected'))
      const snapshot = await getDocs(q)
      
      const rejectionsList = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const farmerDoc = await getDoc(doc(db, 'users', data.farmerId))
        const farmerName = farmerDoc.exists() ? farmerDoc.data().name : 'Unknown'
        
        return {
          id: docSnap.id,
          ...data,
          farmerName
        }
      }))

      rejectionsList.sort((a, b) => (b.rejectedAt?.toMillis() || 0) - (a.rejectedAt?.toMillis() || 0))
      
      setRejections(rejectionsList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading rejections:', error)
      setLoading(false)
    }
  }

  return (
    <div className="consultation-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Rejected Requests</h1>
          <button className="back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>

        <div className="requests-grid">
          {loading ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading rejected requests...</p>
            </div>
          ) : rejections.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-times-circle"></i>
              <p>No rejected requests</p>
            </div>
          ) : (
            rejections.map(request => (
              <div key={request.id} className="request-card" style={{borderLeft: '4px solid var(--danger)'}}>
                <div className="request-header">
                  <div className="request-info">
                    <div className="farmer-avatar" style={{background: 'var(--danger)'}}>
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="farmer-details">
                      <h3>{request.farmerName || 'Unknown Farmer'}</h3>
                      <p className="request-date">
                        <i className="fas fa-clock"></i>
                        Rejected: {request.rejectedAt ? new Date(request.rejectedAt.toDate()).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="urgency-badge" style={{background: 'var(--danger)', color: 'white'}}>
                    <i className="fas fa-ban"></i>
                    Rejected
                  </span>
                </div>

                <div className="request-body">
                  <div className="info-box">
                    <div className="info-label">
                      <i className="fas fa-paw"></i>
                      Animal ID
                    </div>
                    <div className="info-value">#{request.animalId}</div>
                  </div>

                  <div className="info-box">
                    <div className="info-label">
                      <i className="fas fa-heartbeat"></i>
                      Urgency Level
                    </div>
                    <div className="info-value">{request.urgency}</div>
                  </div>

                  <div className="info-box symptoms-box">
                    <div className="info-label">
                      <i className="fas fa-notes-medical"></i>
                      Symptoms Description
                    </div>
                    <div className="symptoms-text">{request.symptoms}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
