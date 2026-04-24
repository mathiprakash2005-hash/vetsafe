import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, updateDoc } from '../../config/firebase'
import { Timestamp } from 'firebase/firestore'
import './SharedStyles.css'
import './Treatments.css'

function Treatments() {
  const navigate = useNavigate()
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTreatment, setSelectedTreatment] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        loadTreatments(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadTreatments = async (farmerId) => {
    try {
      const q = query(collection(db, 'treatments'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setTreatments([])
        setLoading(false)
        return
      }

      const treatmentsList = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        let doctorName = 'N/A'
        
        if (data.doctorId) {
          const doctorDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', data.doctorId)))
          if (!doctorDoc.empty) {
            doctorName = doctorDoc.docs[0].data().name || 'N/A'
          }
        }
        
        return { id: docSnap.id, ...data, doctorName }
      }))
      
      treatmentsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setTreatments(treatmentsList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading treatments:', error)
      setLoading(false)
    }
  }

  const markInjectionGiven = async (treatmentId) => {
    try {
      const treatment = treatments.find(t => t.id === treatmentId)
      if (!treatment) return

      const today = new Date()
      await updateDoc(doc(db, 'treatments', treatmentId), {
        injectionDate: Timestamp.fromDate(today)
      })

      const safeDate = new Date(today)
      safeDate.setDate(safeDate.getDate() + parseInt(treatment.withdrawalDays || 0))

      const animalsQ = query(
        collection(db, 'animals'),
        where('farmerId', '==', treatment.farmerId),
        where('animalId', '==', treatment.animalId)
      )
      const animalsSnap = await getDocs(animalsQ)
      animalsSnap.forEach(animalDoc => {
        updateDoc(doc(db, 'animals', animalDoc.id), { status: 'Withdrawal' })
      })

      if (user) loadTreatments(user.uid)
    } catch (error) {
      console.error('Error marking injection:', error)
      alert('Failed to mark injection as given')
    }
  }

  const filteredTreatments = treatments.filter(treatment => {
    const hasInjection = !!treatment.injectionDate
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'given' && hasInjection) ||
      (filterStatus === 'pending' && !hasInjection)
    
    const matchesSearch = 
      treatment.animalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: treatments.length,
    given: treatments.filter(t => t.injectionDate).length,
    pending: treatments.filter(t => !t.injectionDate).length,
    active: treatments.filter(t => {
      if (!t.injectionDate) return false
      const safeDate = new Date(t.injectionDate.toDate())
      safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
      return safeDate > new Date()
    }).length
  }

  return (
    <div className="page-container">
      <div className="page-glow"></div>

      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="page-title-section">
              <h1><i className="fas fa-pills"></i> Treatment Records</h1>
              <p className="page-subtitle">Track and manage animal treatments</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        
        {/* Stats Overview */}
        <div className="grid-4 mb-4">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-pills"></i>
              </div>
              <span className="stat-badge badge-success">
                <i className="fas fa-chart-line"></i> Total
              </span>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Treatments</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <span className="stat-badge badge-success">
                <i className="fas fa-syringe"></i> Given
              </span>
            </div>
            <div className="stat-value">{stats.given}</div>
            <div className="stat-label">Injections Given</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <span className="stat-badge badge-warning">
                <i className="fas fa-hourglass-half"></i> Pending
              </span>
            </div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Injections</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <span className="stat-badge badge-warning">
                <i className="fas fa-ban"></i> Active
              </span>
            </div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Withdrawal Period</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex justify-between items-center gap-3" style={{flexWrap: 'wrap'}}>
              <div className="search-bar">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by animal ID, medicine, or doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <button 
                  className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All Treatments
                </button>
                <button 
                  className={`filter-btn ${filterStatus === 'given' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('given')}
                >
                  Given
                </button>
                <button 
                  className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Treatments Table */}
        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="empty-state">
                <div className="spinner" style={{width: '48px', height: '48px', borderWidth: '4px'}}></div>
                <p className="empty-title">Loading treatments...</p>
              </div>
            ) : filteredTreatments.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-pills empty-icon"></i>
                <h3 className="empty-title">No treatment records found</h3>
                <p className="empty-text">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your filters or search term' 
                    : 'Treatment records will appear here once prescribed by a doctor'}
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th><i className="fas fa-paw"></i> Animal</th>
                    <th><i className="fas fa-user-md"></i> Doctor</th>
                    <th><i className="fas fa-pills"></i> Medicine</th>
                    <th><i className="fas fa-syringe"></i> Dosage</th>
                    <th><i className="fas fa-calendar-check"></i> Status</th>
                    <th><i className="fas fa-clock"></i> Withdrawal</th>
                    <th><i className="fas fa-calendar-alt"></i> Safe Date</th>
                    <th><i className="fas fa-cog"></i> Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTreatments.map(treatment => {
                    const injectionDate = treatment.injectionDate ? treatment.injectionDate.toDate() : null
                    
                    let safeDateDisplay = { text: 'Not given yet', class: 'pending' }
                    if (injectionDate) {
                      const safeDate = new Date(injectionDate)
                      safeDate.setDate(safeDate.getDate() + parseInt(treatment.withdrawalDays || 0))
                      const isActive = safeDate > new Date()
                      safeDateDisplay = {
                        text: safeDate.toLocaleDateString(),
                        class: isActive ? 'warning' : 'success'
                      }
                    }

                    return (
                      <tr key={treatment.id} className="treatment-row">
                        <td>
                          <div className="animal-cell">
                            <span className="animal-badge">#{treatment.animalId}</span>
                          </div>
                        </td>
                        <td>
                          <div className="doctor-cell">
                            <i className="fas fa-user-md"></i>
                            {treatment.doctorName}
                          </div>
                        </td>
                        <td>
                          <div className="medicine-cell">
                            <i className="fas fa-capsules"></i>
                            {treatment.medicineName}
                          </div>
                        </td>
                        <td>
                          <span className="dosage-badge">{treatment.dosage}</span>
                        </td>
                        <td>
                          {treatment.injectionDate ? (
                            <span className="status-badge status-healthy">
                              <i className="fas fa-check-circle"></i>
                              Given
                            </span>
                          ) : (
                            <span className="status-badge status-pending">
                              <i className="fas fa-clock"></i>
                              Pending
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="withdrawal-badge">
                            <i className="fas fa-hourglass-half"></i>
                            {treatment.withdrawalDays} days
                          </span>
                        </td>
                        <td>
                          <span className={`safe-date-badge ${safeDateDisplay.class}`}>
                            <i className={`fas ${
                              safeDateDisplay.class === 'success' ? 'fa-check-circle' :
                              safeDateDisplay.class === 'warning' ? 'fa-exclamation-triangle' :
                              'fa-clock'
                            }`}></i>
                            {safeDateDisplay.text}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {!treatment.injectionDate && (
                              <button 
                                className="btn-action btn-action-primary"
                                onClick={() => markInjectionGiven(treatment.id)}
                                title="Mark as Given"
                              >
                                <i className="fas fa-syringe"></i>
                                Mark Given
                              </button>
                            )}
                            <button 
                              className="btn-action btn-action-view"
                              onClick={() => setSelectedTreatment(treatment)}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Treatment Details Modal */}
      {selectedTreatment && (
        <div className="modal-overlay" onClick={() => setSelectedTreatment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-pills"></i>
                Treatment Details
              </h2>
              <button className="modal-close" onClick={() => setSelectedTreatment(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-paw"></i>
                    Animal ID
                  </div>
                  <div className="detail-value">#{selectedTreatment.animalId}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-user-md"></i>
                    Doctor Name
                  </div>
                  <div className="detail-value">{selectedTreatment.doctorName}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-pills"></i>
                    Medicine Name
                  </div>
                  <div className="detail-value">{selectedTreatment.medicineName}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-syringe"></i>
                    Dosage
                  </div>
                  <div className="detail-value">{selectedTreatment.dosage}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-clock"></i>
                    Withdrawal Period
                  </div>
                  <div className="detail-value">{selectedTreatment.withdrawalDays} days</div>
                </div>

                {selectedTreatment.injectionDate && (
                  <div className="detail-item">
                    <div className="detail-label">
                      <i className="fas fa-calendar-check"></i>
                      Injection Given On
                    </div>
                    <div className="detail-value">
                      {selectedTreatment.injectionDate.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}

                {selectedTreatment.createdAt && (
                  <div className="detail-item">
                    <div className="detail-label">
                      <i className="fas fa-calendar-plus"></i>
                      Prescribed On
                    </div>
                    <div className="detail-value">
                      {selectedTreatment.createdAt.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTreatment(null)}>
                Close
              </button>
              {!selectedTreatment.injectionDate && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    markInjectionGiven(selectedTreatment.id)
                    setSelectedTreatment(null)
                  }}
                >
                  <i className="fas fa-syringe"></i>
                  Mark as Given
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Treatments
