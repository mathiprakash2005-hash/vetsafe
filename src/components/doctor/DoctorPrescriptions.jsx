import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, getDoc } from '../../config/firebase'
import './DoctorPrescriptions.css'

export default function DoctorPrescriptions() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        loadPrescriptions(user.uid)
      } else {
        navigate('/doctor-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadPrescriptions = async (doctorId) => {
    try {
      // Load accepted prescriptions (treatments)
      const treatmentsQ = query(collection(db, 'treatments'), where('doctorId', '==', doctorId))
      const treatmentsSnap = await getDocs(treatmentsQ)
      const treatmentsList = treatmentsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        type: 'accepted' 
      }))

      // Load rejected consultation requests
      const rejectionsQ = query(
        collection(db, 'consultationRequests'),
        where('doctorId', '==', doctorId),
        where('status', '==', 'rejected')
      )
      const rejectionsSnap = await getDocs(rejectionsQ)
      const rejectionsList = await Promise.all(rejectionsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        // Get farmer name
        const farmerDoc = await getDoc(doc(db, 'users', data.farmerId))
        const farmerName = farmerDoc.exists() ? farmerDoc.data().name : 'Unknown'
        
        return {
          id: docSnap.id,
          ...data,
          farmerName,
          type: 'rejected'
        }
      }))

      // Combine and sort
      const allRecords = [...treatmentsList, ...rejectionsList]
      allRecords.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setPrescriptions(allRecords)
      setLoading(false)
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      setLoading(false)
    }
  }

  return (
    <div className="prescriptions-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Prescriptions</h1>
          <button className="back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>

        <div className="prescriptions-table">
          <table>
            <thead>
              <tr>
                <th><i className="fas fa-user"></i> Farmer Name</th>
                <th><i className="fas fa-paw"></i> Animal ID</th>
                <th><i className="fas fa-info-circle"></i> Status</th>
                <th><i className="fas fa-pills"></i> Medicine Name</th>
                <th><i className="fas fa-syringe"></i> Dosage</th>
                <th><i className="fas fa-clock"></i> Withdrawal (days)</th>
                <th><i className="fas fa-calendar-check"></i> Safe Date</th>
                <th><i className="fas fa-calendar"></i> Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>Loading prescriptions...</p>
                    </div>
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <i className="fas fa-prescription"></i>
                      <p>No prescriptions created yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                prescriptions.map(rx => {
                  if (rx.type === 'rejected') {
                    const rejectedDate = rx.rejectedAt ? new Date(rx.rejectedAt.toDate()) : null
                    return (
                      <tr key={rx.id}>
                        <td>{rx.farmerName || 'N/A'}</td>
                        <td className="animal-id">#{rx.animalId}</td>
                        <td>
                          <span className="status-badge status-rejected">
                            <i className="fas fa-times-circle"></i> Rejected
                          </span>
                        </td>
                        <td colSpan="3" style={{fontStyle: 'italic', color: 'var(--text-muted)'}}>No prescription given</td>
                        <td>—</td>
                        <td>{rejectedDate ? rejectedDate.toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    )
                  }

                  const safeDate = rx.safeDate ? new Date(rx.safeDate.toDate()) : null
                  const createdDate = rx.createdAt ? new Date(rx.createdAt.toDate()) : null
                  const today = new Date()
                  const isWarning = safeDate && safeDate > today

                  return (
                    <tr key={rx.id}>
                      <td>{rx.farmerName || 'N/A'}</td>
                      <td className="animal-id">#{rx.animalId}</td>
                      <td>
                        <span className="status-badge status-accepted">
                          <i className="fas fa-check-circle"></i> Accepted
                        </span>
                      </td>
                      <td>{rx.medicineName}</td>
                      <td>{rx.dosage}</td>
                      <td>{rx.withdrawalDays} days</td>
                      <td>
                        <span className={`safe-date ${isWarning ? 'warning' : ''}`}>
                          {safeDate ? safeDate.toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>{createdDate ? createdDate.toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
