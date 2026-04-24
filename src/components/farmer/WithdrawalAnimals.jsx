import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs } from '../../config/firebase'
import './WithdrawalAnimals.css'

const API_URL = import.meta.env.VITE_API_URL

export default function WithdrawalAnimals() {
  const navigate = useNavigate()
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const q = query(collection(db, 'animals'), where('farmerId', '==', currentUser.uid))
      const snapshot = await getDocs(q)
      const animalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const withdrawalAnimals = []
      for (let animal of animalsList) {
        const treatmentQuery = query(
          collection(db, 'treatments'),
          where('farmerId', '==', currentUser.uid),
          where('animalId', '==', animal.animalId)
        )
        const treatmentSnap = await getDocs(treatmentQuery)

        if (!treatmentSnap.empty) {
          const treatments = treatmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          const activeTreatment = treatments.find(t => {
            if (t.injectionDate) {
              const injectionDate = new Date(t.injectionDate.toDate())
              const safeDate = new Date(injectionDate)
              safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
              return safeDate > new Date()
            }
            return false
          })

          if (activeTreatment) {
            const injectionDate = new Date(activeTreatment.injectionDate.toDate())
            const safeDate = new Date(injectionDate)
            safeDate.setDate(safeDate.getDate() + parseInt(activeTreatment.withdrawalDays || 0))
            
            let doctorName = 'N/A'
            if (activeTreatment.doctorId) {
              const doctorQuery = query(collection(db, 'users'), where('__name__', '==', activeTreatment.doctorId))
              const doctorSnap = await getDocs(doctorQuery)
              if (!doctorSnap.empty) {
                doctorName = doctorSnap.docs[0].data().name || 'N/A'
              }
            }

            // Fetch ML prediction from backend
            let riskData = null
            try {
              const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  animal_type: animal.species || 'chicken',
                  antibiotic_type: activeTreatment.medicineName || 'amoxicillin',
                  dosage_mg: parseFloat(activeTreatment.dosage || 0),
                  duration_days: parseInt(activeTreatment.duration || 0),
                  days_before_sale: Math.ceil((safeDate - new Date()) / (1000 * 60 * 60 * 24)),
                  milk_yield: 0,
                  previous_violations: 0
                })
              })
              const data = await response.json()
              if (data.success) {
                riskData = {
                  violation_probability: data.violation_probability,
                  risk_level: data.risk_level
                }
              }
            } catch (error) {
              console.error('Error fetching risk prediction:', error)
            }
            
            withdrawalAnimals.push({
              ...animal,
              medicineName: activeTreatment.medicineName,
              doctorName: doctorName,
              injectionDate: injectionDate,
              safeDate: safeDate,
              daysRemaining: Math.ceil((safeDate - new Date()) / (1000 * 60 * 60 * 24)),
              riskData: riskData
            })
          }
        }
      }

      setAnimals(withdrawalAnimals)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const getRiskIcon = (level) => {
    if (level === 'High') return '🔥'
    if (level === 'Moderate') return '⚠️'
    return '✅'
  }

  return (
    <div className="withdrawal-page">
      <div className="page-header">
        <h1 className="page-title">Animals Under Withdrawal</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>


      {loading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading animals...</p>
        </div>
      ) : animals.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-check-circle"></i>
          <p>No animals under withdrawal period</p>
        </div>
      ) : (
        <div className="animals-grid">
          {animals.map(animal => (
            <div key={animal.id} className="animal-card">
              <div className="card-header">
                <div className="animal-icon">
                  <i className="fas fa-syringe"></i>
                </div>
                <span className="status-badge">Withdrawal</span>
              </div>
              <div className="card-body">
                <h3 className="animal-id">#{animal.animalId}</h3>
                <p className="animal-species">{animal.speciesDisplay}</p>
                <div className="info-row">
                  <span className="label">Doctor:</span>
                  <span className="value">{animal.doctorName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Medicine:</span>
                  <span className="value">{animal.medicineName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Injection Date:</span>
                  <span className="value">{animal.injectionDate.toLocaleDateString()}</span>
                </div>
                <div className="info-row">
                  <span className="label">Safe Date:</span>
                  <span className="value">{animal.safeDate.toLocaleDateString()}</span>
                </div>
                <div className="days-remaining">
                  <i className="fas fa-clock"></i>
                  {animal.daysRemaining} days remaining
                </div>
                {animal.riskData && (
                  <div className="risk-info">
                    <div className="risk-probability">
                      {getRiskIcon(animal.riskData.risk_level)} Risk Probability: {animal.riskData.violation_probability}%
                    </div>
                    <div className={`risk-level risk-${animal.riskData.risk_level.toLowerCase()}`}>
                      ⚠ Risk Level: {animal.riskData.risk_level.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
