import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs } from '../../config/firebase'
import './SharedStyles.css'
import './Prescriptions.css'

function Prescriptions() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedPrescription, setSelectedPrescription] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/farmer-login')
        return
      }

      loadPrescriptions(user.uid)
    })

    return () => unsubscribe()
  }, [navigate])

  const loadPrescriptions = async (farmerId) => {
    try {
      const q = query(collection(db, 'treatments'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        setPrescriptions([])
        setLoading(false)
        return
      }

      const rxList = snapshot.docs.map(doc => {
        const data = doc.data()
        
        // Calculate safe date if not present
        if (!data.safeDate && data.createdAt && data.withdrawalDays) {
          const createdDate = data.createdAt.toDate()
          const safeDate = new Date(createdDate)
          safeDate.setDate(safeDate.getDate() + parseInt(data.withdrawalDays))
          data.safeDate = { toDate: () => safeDate }
        }
        
        return { id: doc.id, ...data }
      })
      
      rxList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setPrescriptions(rxList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate()
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const isInWithdrawal = (safeDate) => {
    if (!safeDate) return false
    return safeDate.toDate() > new Date()
  }

  const getStats = () => {
    const total = prescriptions.length
    const inWithdrawal = prescriptions.filter(rx => isInWithdrawal(rx.safeDate)).length
    const safe = total - inWithdrawal
    const recent = prescriptions.filter(rx => {
      if (!rx.createdAt) return false
      const daysDiff = (new Date() - rx.createdAt.toDate()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 7
    }).length

    return { total, inWithdrawal, safe, recent }
  }

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = rx.animalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rx.medicineName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'withdrawal') return matchesSearch && isInWithdrawal(rx.safeDate)
    if (filterStatus === 'safe') return matchesSearch && !isInWithdrawal(rx.safeDate)
    
    return matchesSearch
  })

  const stats = getStats()

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
              <h1><i className="fas fa-prescription"></i> My Prescriptions</h1>
              <p className="page-subtitle">View and manage veterinary prescriptions / மருத்துவ பரிந்துரைகள்</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        
        {/* Stats Cards */}
        <div className="grid-4 mb-4">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-prescription"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Prescriptions</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.inWithdrawal}</div>
              <div className="stat-label">In Withdrawal</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.safe}</div>
              <div className="stat-label">Safe to Consume</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon info">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.recent}</div>
              <div className="stat-label">Recent (7 days)</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="filter-section">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by animal ID or medicine name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                <i className="fas fa-list"></i>
                All
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'withdrawal' ? 'active' : ''}`}
                onClick={() => setFilterStatus('withdrawal')}
              >
                <i className="fas fa-exclamation-triangle"></i>
                Withdrawal
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'safe' ? 'active' : ''}`}
                onClick={() => setFilterStatus('safe')}
              >
                <i className="fas fa-check-circle"></i>
                Safe
              </button>
            </div>
          </div>
        </div>

        {/* Prescriptions Grid */}
        <div className="prescriptions-grid">
          {loading ? (
            <div className="empty-state">
              <div className="spinner-large"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-prescription"></i>
              </div>
              <h3>No Prescriptions Found</h3>
              <p>{searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'No prescriptions received yet'}</p>
            </div>
          ) : (
            filteredPrescriptions.map((rx, index) => (
              <div 
                key={rx.id} 
                className="prescription-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedPrescription(rx)}
              >
                <div className="rx-header">
                  <div className="rx-symbol">℞</div>
                  <div className={`rx-status-badge ${isInWithdrawal(rx.safeDate) ? 'warning' : 'success'}`}>
                    <i className={`fas ${isInWithdrawal(rx.safeDate) ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                    {isInWithdrawal(rx.safeDate) ? 'Withdrawal' : 'Safe'}
                  </div>
                </div>

                <div className="rx-body">
                  <div className="rx-main-info">
                    <div className="rx-medicine-name">
                      <i className="fas fa-pills"></i>
                      {rx.medicineName}
                    </div>
                    <div className="rx-animal-id">
                      <i className="fas fa-paw"></i>
                      Animal #{rx.animalId}
                    </div>
                  </div>

                  <div className="rx-details-grid">
                    <div className="rx-detail-item">
                      <div className="rx-detail-label">
                        <i className="fas fa-syringe"></i>
                        Dosage
                      </div>
                      <div className="rx-detail-value">{rx.dosage}</div>
                    </div>

                    <div className="rx-detail-item">
                      <div className="rx-detail-label">
                        <i className="fas fa-clock"></i>
                        Withdrawal
                      </div>
                      <div className="rx-detail-value">{rx.withdrawalDays} days</div>
                    </div>
                  </div>
                </div>

                <div className="rx-footer">
                  <div className="rx-date-info">
                    <div className="rx-date-label">Prescribed</div>
                    <div className="rx-date-value">{formatDate(rx.createdAt)}</div>
                  </div>
                  <div className="rx-date-info">
                    <div className="rx-date-label">Safe After</div>
                    <div className="rx-date-value">{formatDate(rx.safeDate)}</div>
                  </div>
                </div>

                <div className="rx-view-btn">
                  <span>View Details</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Prescription Details Modal */}
      {selectedPrescription && (
        <div className="modal" onClick={() => setSelectedPrescription(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-prescription"></i>
                Prescription Details
              </h3>
              <button className="modal-close" onClick={() => setSelectedPrescription(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="prescription-detail-view">
                <div className="detail-section">
                  <div className="detail-header">
                    <div className="rx-symbol-large">℞</div>
                    <div>
                      <h4>{selectedPrescription.medicineName}</h4>
                      <p className="text-muted">Prescribed on {formatDate(selectedPrescription.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-icon">
                      <i className="fas fa-paw"></i>
                    </div>
                    <div>
                      <div className="detail-label">Animal ID</div>
                      <div className="detail-value">#{selectedPrescription.animalId}</div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-icon">
                      <i className="fas fa-syringe"></i>
                    </div>
                    <div>
                      <div className="detail-label">Dosage</div>
                      <div className="detail-value">{selectedPrescription.dosage}</div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-icon">
                      <i className="fas fa-clock"></i>
                    </div>
                    <div>
                      <div className="detail-label">Withdrawal Period</div>
                      <div className="detail-value">{selectedPrescription.withdrawalDays} days</div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-icon">
                      <i className="fas fa-calendar-check"></i>
                    </div>
                    <div>
                      <div className="detail-label">Safe After</div>
                      <div className="detail-value">{formatDate(selectedPrescription.safeDate)}</div>
                    </div>
                  </div>
                </div>

                <div className={`status-banner ${isInWithdrawal(selectedPrescription.safeDate) ? 'warning' : 'success'}`}>
                  <i className={`fas ${isInWithdrawal(selectedPrescription.safeDate) ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                  <div>
                    <strong>
                      {isInWithdrawal(selectedPrescription.safeDate) ? 'In Withdrawal Period' : 'Safe to Consume'}
                    </strong>
                    <p>
                      {isInWithdrawal(selectedPrescription.safeDate) 
                        ? 'Products from this animal should not be consumed until the safe date'
                        : 'Products from this animal are safe for consumption'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPrescription(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Prescriptions
