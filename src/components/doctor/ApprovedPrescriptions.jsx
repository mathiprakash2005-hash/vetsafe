import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, getDocs, doc, getDoc } from '../../config/firebase'
import './DoctorPrescriptions.css'

export default function ApprovedPrescriptions() {
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
        loadPrescriptions()
      } else {
        navigate('/doctor-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadPrescriptions = async () => {
    try {
      const treatmentsSnap = await getDocs(collection(db, 'treatments'))
      const treatmentsList = treatmentsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data()
      }))

      treatmentsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setPrescriptions(treatmentsList)
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
          <h1 className="page-title">Approved Prescriptions</h1>
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
                  <td colSpan="7">
                    <div className="empty-state">
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>Loading prescriptions...</p>
                    </div>
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <i className="fas fa-prescription"></i>
                      <p>No approved prescriptions yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                prescriptions.map(rx => {
                  const safeDate = rx.safeDate ? new Date(rx.safeDate.toDate()) : null
                  const createdDate = rx.createdAt ? new Date(rx.createdAt.toDate()) : null
                  const today = new Date()
                  const isWarning = safeDate && safeDate > today

                  return (
                    <tr key={rx.id}>
                      <td data-label="Farmer">{rx.farmerName || 'N/A'}</td>
                      <td data-label="Animal" className="animal-id">#{rx.animalId}</td>
                      <td data-label="Medicine">{rx.medicineName}</td>
                      <td data-label="Dosage">{rx.dosage}</td>
                      <td data-label="Withdrawal">{rx.withdrawalDays} days</td>
                      <td data-label="Safe Date">
                        <span className={`safe-date ${isWarning ? 'warning' : ''}`}>
                          {safeDate ? safeDate.toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td data-label="Date">{createdDate ? createdDate.toLocaleDateString() : 'N/A'}</td>
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
