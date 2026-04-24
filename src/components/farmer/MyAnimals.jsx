import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, deleteDoc } from '../../config/firebase'
import './SharedStyles.css'
import './MyAnimals.css'

function MyAnimals() {
  const navigate = useNavigate()
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        loadAnimals(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (farmerId) => {
    try {
      const q = query(collection(db, 'animals'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setAnimals([])
        setLoading(false)
        return
      }

      const animalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      for (let animal of animalsList) {
        const treatmentQ = query(
          collection(db, 'treatments'),
          where('farmerId', '==', farmerId),
          where('animalId', '==', animal.animalId)
        )
        const treatmentSnap = await getDocs(treatmentQ)

        if (!treatmentSnap.empty) {
          const treatments = treatmentSnap.docs.map(doc => doc.data())
          const activeTreatment = treatments.find(t => {
            if (t.injectionDate) {
              const injectionDate = t.injectionDate.toDate()
              const safeDate = new Date(injectionDate)
              safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
              return safeDate > new Date()
            }
            return false
          })

          if (activeTreatment) {
            animal.status = 'Withdrawal'
          }
        }
      }

      animalsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      setAnimals(animalsList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading animals:', error)
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this animal?')) {
      try {
        await deleteDoc(doc(db, 'animals', id))
        if (user) loadAnimals(user.uid)
      } catch (error) {
        alert('Error deleting animal: ' + error.message)
      }
    }
  }

  const filteredAnimals = animals.filter(animal => {
    const matchesStatus = filterStatus === 'all' || animal.status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch = animal.animalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.speciesDisplay.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: animals.length,
    healthy: animals.filter(a => a.status === 'Healthy').length,
    withdrawal: animals.filter(a => a.status === 'Withdrawal').length,
    treatment: animals.filter(a => a.status === 'Under Treatment').length
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
              <h1><i className="fas fa-paw"></i> My Animals</h1>
              <p className="page-subtitle">Manage and monitor your livestock</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/farmer-dashboard')}>
              <i className="fas fa-plus"></i>
              Add New Animal
            </button>
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
                <i className="fas fa-paw"></i>
              </div>
              <span className="stat-badge badge-success">
                <i className="fas fa-arrow-up"></i> Total
              </span>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Animals</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-heart"></i>
              </div>
              <span className="stat-badge badge-success">
                <i className="fas fa-check"></i> Healthy
              </span>
            </div>
            <div className="stat-value">{stats.healthy}</div>
            <div className="stat-label">Healthy Animals</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-syringe"></i>
              </div>
              <span className="stat-badge badge-warning">
                <i className="fas fa-clock"></i> Active
              </span>
            </div>
            <div className="stat-value">{stats.withdrawal}</div>
            <div className="stat-label">Withdrawal Period</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <i className="fas fa-pills"></i>
              </div>
              <span className="stat-badge badge-warning">
                <i className="fas fa-medkit"></i> Treatment
              </span>
            </div>
            <div className="stat-value">{stats.treatment}</div>
            <div className="stat-label">Under Treatment</div>
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
                  placeholder="Search by ID or species..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <button 
                  className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All Animals
                </button>
                <button 
                  className={`filter-btn ${filterStatus === 'healthy' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('healthy')}
                >
                  Healthy
                </button>
                <button 
                  className={`filter-btn ${filterStatus === 'withdrawal' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('withdrawal')}
                >
                  Withdrawal
                </button>
                <button 
                  className={`filter-btn ${filterStatus === 'under treatment' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('under treatment')}
                >
                  Treatment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Animals Grid */}
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{width: '48px', height: '48px', borderWidth: '4px'}}></div>
            <p className="empty-title">Loading animals...</p>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-paw empty-icon"></i>
            <h3 className="empty-title">No animals found</h3>
            <p className="empty-text">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : 'Add your first animal from the dashboard'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/farmer-dashboard')}>
              <i className="fas fa-plus"></i>
              Add New Animal
            </button>
          </div>
        ) : (
          <div className="animals-grid">
            {filteredAnimals.map(animal => (
              <div key={animal.id} className="animal-card">
                <div className="animal-card-header">
                  <div className="animal-id-badge">
                    <i className="fas fa-hashtag"></i>
                    {animal.animalId}
                  </div>
                  <span className={`status-badge status-${animal.status.toLowerCase().replace(' ', '-')}`}>
                    <i className={`fas ${
                      animal.status === 'Healthy' ? 'fa-check-circle' :
                      animal.status === 'Withdrawal' ? 'fa-clock' :
                      'fa-pills'
                    }`}></i>
                    {animal.status}
                  </span>
                </div>

                <div className="animal-species-display">
                  <span className="species-icon">
                    {animal.speciesDisplay.includes('Cow') ? '🐄' :
                     animal.speciesDisplay.includes('Chicken') ? '🐔' :
                     animal.speciesDisplay.includes('Goat') ? '🐐' : '🐾'}
                  </span>
                  <span className="species-name">{animal.speciesDisplay}</span>
                </div>

                <div className="animal-info-grid">
                  <div className="info-item">
                    <i className="fas fa-syringe info-icon"></i>
                    <div>
                      <div className="info-label">Last Treatment</div>
                      <div className="info-value">{animal.lastTreatment || 'None'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-calendar info-icon"></i>
                    <div>
                      <div className="info-label">Added On</div>
                      <div className="info-value">
                        {animal.createdAt ? animal.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="animal-actions">
                  <button className="btn-action btn-action-view" onClick={() => setSelectedAnimal(animal)}>
                    <i className="fas fa-eye"></i>
                    View Details
                  </button>
                  <button className="btn-action btn-action-delete" onClick={() => handleDelete(animal.id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Animal Details Modal */}
      {selectedAnimal && (
        <div className="modal-overlay" onClick={() => setSelectedAnimal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-paw"></i>
                Animal Details
              </h2>
              <button className="modal-close" onClick={() => setSelectedAnimal(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-hashtag"></i>
                    Animal ID
                  </div>
                  <div className="detail-value">#{selectedAnimal.animalId}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-paw"></i>
                    Species
                  </div>
                  <div className="detail-value">{selectedAnimal.speciesDisplay}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-heartbeat"></i>
                    Status
                  </div>
                  <span className={`status-badge status-${selectedAnimal.status.toLowerCase().replace(' ', '-')}`}>
                    <i className={`fas ${
                      selectedAnimal.status === 'Healthy' ? 'fa-check-circle' :
                      selectedAnimal.status === 'Withdrawal' ? 'fa-clock' :
                      'fa-pills'
                    }`}></i>
                    {selectedAnimal.status}
                  </span>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-syringe"></i>
                    Last Treatment
                  </div>
                  <div className="detail-value">{selectedAnimal.lastTreatment || 'None'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-calendar-plus"></i>
                    Added On
                  </div>
                  <div className="detail-value">
                    {selectedAnimal.createdAt ? selectedAnimal.createdAt.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    <i className="fas fa-user"></i>
                    Farmer ID
                  </div>
                  <div className="detail-value text-muted">{selectedAnimal.farmerId.substring(0, 8)}...</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAnimal(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => {
                setSelectedAnimal(null)
                navigate('/farmer-treatments')
              }}>
                <i className="fas fa-pills"></i>
                View Treatments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyAnimals
