import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signOut, doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from '../../config/firebase'
import './FarmerDashboard.css'

function FarmerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [animals, setAnimals] = useState([])
  const [stats, setStats] = useState({ total: 0, healthy: 0, treatment: 0, batches: 0, compliance: 0 })
  const [consultStatus, setConsultStatus] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [formData, setFormData] = useState({ species: '', animalId: '', status: 'Healthy', lastTreatment: '' })
  const [consultData, setConsultData] = useState({ animalId: '', urgency: '', symptoms: '' })
  const [vets, setVets] = useState([])

  useEffect(() => {
    const fetchVets = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'doctor'))
        const snap = await getDocs(q)
        setVets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Failed to fetch vets:', err)
      }
    }
    fetchVets()
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) { navigate('/farmer-login'); return }
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists() && userDoc.data().role === 'farmer') {
        setUser(currentUser)
        setUserData(userDoc.data())
        loadAnimals(currentUser.uid)
        loadConsultStatus(currentUser.uid)
      } else {
        await signOut(auth)
        navigate('/farmer-login')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (uid) => {
    const q = query(collection(db, 'animals'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    const animalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    for (let animal of animalsList) {
      const treatmentQuery = query(collection(db, 'treatments'), where('farmerId', '==', uid), where('animalId', '==', animal.animalId))
      const treatmentSnap = await getDocs(treatmentQuery)
      if (!treatmentSnap.empty) {
        const treatments = treatmentSnap.docs.map(doc => doc.data())
        const activeTreatment = treatments.find(t => {
          if (t.injectionDate) {
            const injectionDate = new Date(t.injectionDate.toDate())
            const safeDate = new Date(injectionDate)
            safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
            return safeDate > new Date()
          }
          return false
        })
        if (activeTreatment && animal.status !== 'Withdrawal') {
          await updateDoc(doc(db, 'animals', animal.id), { status: 'Withdrawal' })
          animal.status = 'Withdrawal'
        } else if (!activeTreatment && animal.status === 'Withdrawal') {
          await updateDoc(doc(db, 'animals', animal.id), { status: 'Healthy' })
          animal.status = 'Healthy'
        }
      } else if (animal.status === 'Withdrawal') {
        await updateDoc(doc(db, 'animals', animal.id), { status: 'Healthy' })
        animal.status = 'Healthy'
      }
    }

    const salesSnap = await getDocs(query(collection(db, 'purchases'), where('farmerId', '==', uid)))
    animalsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    setAnimals(animalsList)
    setStats({
      total: animalsList.length,
      healthy: animalsList.filter(a => a.status === 'Healthy').length,
      treatment: animalsList.filter(a => a.status === 'Withdrawal').length,
      batches: salesSnap.size,
      compliance: 98
    })
  }

  const loadConsultStatus = async (uid) => {
    const snapshot = await getDocs(query(collection(db, 'consultationRequests'), where('farmerId', '==', uid)))
    if (!snapshot.empty) {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      requests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      const latest = requests[0]
      const animalSnap = await getDocs(query(collection(db, 'animals'), where('farmerId', '==', uid), where('animalId', '==', latest.animalId)))
      const animalData = animalSnap.empty ? null : animalSnap.docs[0].data()
      setConsultStatus({
        status: latest.status === 'accepted' ? 'Accepted' : 'Pending',
        animalId: latest.animalId,
        animalName: animalData?.speciesDisplay || 'Unknown'
      })
    }
  }

  const generateAnimalId = async (species) => {
    if (!user || !species) return ''
    const snapshot = await getDocs(query(collection(db, 'animals'), where('farmerId', '==', user.uid), where('species', '==', species)))
    return `${species}-${String(snapshot.size + 1).padStart(2, '0')}`
  }

  const handleSpeciesChange = async (species) => {
    setFormData({ ...formData, species, animalId: await generateAnimalId(species) })
  }

  const handleAddAnimal = async (e) => {
    e.preventDefault()
    const speciesMap = { 'COW': '🐄 Cattle (Cow)', 'CHICKEN': '🐔 Poultry (Chicken)', 'GOAT': '🐐 Goat' }
    await addDoc(collection(db, 'animals'), {
      farmerId: user.uid,
      animalId: formData.animalId,
      species: formData.species,
      speciesDisplay: speciesMap[formData.species],
      status: formData.status,
      lastTreatment: formData.lastTreatment || null,
      createdAt: serverTimestamp()
    })
    setShowAddModal(false)
    setFormData({ species: '', animalId: '', status: 'Healthy', lastTreatment: '' })
    loadAnimals(user.uid)
  }

  const handleConsultation = async (e) => {
    e.preventDefault()
    await addDoc(collection(db, 'consultationRequests'), {
      farmerId: user.uid,
      animalId: consultData.animalId,
      urgency: consultData.urgency,
      symptoms: consultData.symptoms,
      status: 'pending',
      createdAt: serverTimestamp()
    })
    alert('Consultation request submitted successfully!')
    setShowConsultModal(false)
    setConsultData({ animalId: '', urgency: '', symptoms: '' })
  }

  const complianceDash = 502.6 - (502.6 * stats.compliance / 100)

  return (
    <div className="fd-root">
      <div className="fd-hero-glow" />

      {/* ── Sidebar ── */}
      <aside className={`fd-sidebar ${showSidebar ? 'fd-sidebar--open' : ''}`}>
        <div className="fd-logo">
          <h1>VetSafe Tracker</h1>
          <p>Livestock Dashboard</p>
        </div>
        <nav className="fd-nav">
          <a className="fd-nav-link fd-nav-link--active" href="#">
            <i className="fas fa-chart-line" /><span>Dashboard</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-animals')}>
            <i className="fas fa-paw" /><span>My Animals</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-treatments')}>
            <i className="fas fa-pills" /><span>Treatments</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/doctor-consultation')}>
            <i className="fas fa-user-md" /><span>Doctor Consultation</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-chat')}>
            <i className="fas fa-comments" /><span>Chat with Doctor</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-prescriptions')}>
            <i className="fas fa-prescription" /><span>My Prescriptions</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-certificate')}>
            <i className="fas fa-qrcode" /><span>Certificate</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={() => navigate('/farmer-sold-history')}>
            <i className="fas fa-shopping-cart" /><span>Product Sold</span>
          </a>
          <a className="fd-nav-link" href="#">
            <i className="fas fa-clipboard-list" /><span>Compliance</span>
          </a>
          <a className="fd-nav-link" href="#">
            <i className="fas fa-bell" /><span>Notifications</span>
          </a>
          <a className="fd-nav-link" href="#" onClick={async () => { await signOut(auth); navigate('/') }}>
            <i className="fas fa-sign-out-alt" /><span>Logout</span>
          </a>
        </nav>
        <div className="fd-sidebar-footer">
          <button className="fd-add-btn" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus" /> Add Animal
          </button>
        </div>
      </aside>

      {/* ── Mobile toggle ── */}
      <button className="fd-menu-toggle" onClick={() => setShowSidebar(!showSidebar)}>
        <i className="fas fa-bars" />
      </button>

      {/* ── Main ── */}
      <main className="fd-main">

        {/* Top Header */}
        <header className="fd-topbar">
          <div className="fd-search-wrap">
            <i className="fas fa-search fd-search-icon" />
            <input className="fd-search" placeholder="Search livestock assets..." type="text" />
          </div>
          <div className="fd-topbar-right">
            <button className="fd-export-btn">
              <i className="fas fa-download" /> Export Report
            </button>
            <div className="fd-topbar-user">
              <div className="fd-user-avatar">
                {userData?.name?.[0]?.toUpperCase() || 'F'}
              </div>
              <div className="fd-user-info">
                <p className="fd-user-name">{userData?.name || 'Farmer'}</p>
                <p className="fd-user-role">Livestock Manager</p>
              </div>
            </div>
          </div>
        </header>

        <div className="fd-content">

          {/* ── Hero Banner ── */}
          <section className="fd-hero">
            <div className="fd-hero-overlay" />
            <div className="fd-hero-body">
              <div className="fd-hero-status">
                <span className="fd-status-dot" />
                <span>Optimal Performance</span>
              </div>
              <h2 className="fd-hero-title">
                Welcome Back, {userData?.name || 'Farmer'}!
              </h2>
              <p className="fd-hero-sub">Here's what's happening with your livestock today</p>
              <div className="fd-hero-stats">
                <div className="fd-hero-stat">
                  <span className="fd-hero-stat-label">Total Animals</span>
                  <span className="fd-hero-stat-value fd-color-primary">{stats.total}</span>
                </div>
                <div className="fd-hero-stat">
                  <span className="fd-hero-stat-label">Compliance Rate</span>
                  <span className="fd-hero-stat-value fd-color-green">{stats.compliance}%</span>
                </div>
                <div className="fd-hero-stat">
                  <span className="fd-hero-stat-label">Product Batches</span>
                  <span className="fd-hero-stat-value fd-color-amber">{stats.batches} Batches</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Dashboard Grid ── */}
          <div className="fd-grid">

            {/* Left Column */}
            <div className="fd-col-main">

              {/* Stats Cards */}
              <div className="fd-stats-row">
                <div className="fd-stat-card" onClick={() => navigate('/farmer-animals')}>
                  <div className="fd-stat-top">
                    <div className="fd-stat-icon"><i className="fas fa-paw" /></div>
                    <span className="fd-badge fd-badge--green"><i className="fas fa-arrow-up" /> 12%</span>
                  </div>
                  <div className="fd-stat-num">{stats.total}</div>
                  <div className="fd-stat-lbl">Total Animals</div>
                  <div className="fd-stat-foot">
                    <span className="fd-color-green"><i className="fas fa-check-circle" /> {stats.healthy} Healthy</span>
                    <span className="fd-link">View All →</span>
                  </div>
                </div>

                <div className="fd-stat-card" onClick={() => navigate('/withdrawal-animals')}>
                  <div className="fd-stat-top">
                    <div className="fd-stat-icon"><i className="fas fa-syringe" /></div>
                    <span className="fd-badge fd-badge--amber"><i className="fas fa-exclamation-circle" /> Active</span>
                  </div>
                  <div className="fd-stat-num">{stats.treatment}</div>
                  <div className="fd-stat-lbl">Under Treatment</div>
                  <div className="fd-stat-foot">
                    <span className="fd-color-amber"><i className="fas fa-clock" /> Withdrawal</span>
                    <span className="fd-link">Manage →</span>
                  </div>
                </div>

                <div className="fd-stat-card" onClick={() => navigate('/farmer-sold-history')}>
                  <div className="fd-stat-top">
                    <div className="fd-stat-icon"><i className="fas fa-box" /></div>
                    <span className="fd-badge fd-badge--green"><i className="fas fa-check" /> Safe</span>
                  </div>
                  <div className="fd-stat-num">{stats.batches}</div>
                  <div className="fd-stat-lbl">Product Batch</div>
                  <div className="fd-stat-foot">
                    <span className="fd-color-green"><i className="fas fa-certificate" /> 100% Compliant</span>
                    <span className="fd-link">View →</span>
                  </div>
                </div>

                <div className="fd-stat-card">
                  <div className="fd-stat-top">
                    <div className="fd-stat-icon"><i className="fas fa-user-md" /></div>
                    <span className={`fd-badge ${consultStatus?.status === 'Accepted' ? 'fd-badge--green' : 'fd-badge--amber'}`}>
                      <i className={`fas ${consultStatus?.status === 'Accepted' ? 'fa-check' : 'fa-clock'}`} />
                      {consultStatus?.status || 'Pending'}
                    </span>
                  </div>
                  <div className="fd-stat-num fd-stat-num--sm">
                    {consultStatus ? `#${consultStatus.animalId}` : 'No Request'}
                  </div>
                  <div className="fd-stat-lbl">Consultation Status</div>
                  <div className="fd-stat-foot">
                    <span className={consultStatus?.status === 'Accepted' ? 'fd-color-green' : 'fd-color-amber'}>
                      {consultStatus ? consultStatus.animalName : 'Submit a request'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="fd-card">
                <h3 className="fd-card-title"><i className="fas fa-bolt" /> Quick Actions</h3>
                <div className="fd-actions-grid">
                  <div className="fd-action-card" onClick={() => setShowAddModal(true)}>
                    <div className="fd-action-icon"><i className="fas fa-plus-circle" /></div>
                    <div className="fd-action-title">Add New Animal</div>
                    <div className="fd-action-desc">Register livestock in system</div>
                  </div>
                  <div className="fd-action-card" onClick={() => navigate('/doctor-consultation')}>
                    <div className="fd-action-icon"><i className="fas fa-stethoscope" /></div>
                    <div className="fd-action-title">Request Consultation</div>
                    <div className="fd-action-desc">Connect with veterinarian</div>
                  </div>
                  <div className="fd-action-card" onClick={() => navigate('/farmer-certificate')}>
                    <div className="fd-action-icon"><i className="fas fa-box-open" /></div>
                    <div className="fd-action-title">Create Certificate</div>
                    <div className="fd-action-desc">Generate product certificate</div>
                  </div>
                  <div className="fd-action-card" onClick={() => navigate('/farmer-chat')}>
                    <div className="fd-action-icon"><i className="fas fa-comments" /></div>
                    <div className="fd-action-title">Chat with Doctor</div>
                    <div className="fd-action-desc">Real-time vet messaging</div>
                  </div>
                </div>
              </div>

              {/* Recent Animals Table */}
              <div className="fd-card">
                <h3 className="fd-card-title"><i className="fas fa-paw" /> Recent Animals</h3>
                <div className="fd-table-wrap">
                  <table className="fd-table">
                    <thead>
                      <tr>
                        <th>Animal ID</th>
                        <th>Species</th>
                        <th>Status</th>
                        <th>Last Treatment</th>
                        <th>Withdrawal Ends</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animals.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="fd-empty-row">
                            <i className="fas fa-paw fd-empty-icon" />
                            <p>No animals added yet. Click "Add Animal" to get started.</p>
                          </td>
                        </tr>
                      ) : (
                        animals.map(animal => (
                          <tr key={animal.id}>
                            <td className="fd-animal-id">#{animal.animalId}</td>
                            <td>{animal.speciesDisplay}</td>
                            <td>
                              <span className={`fd-status-badge fd-status-${animal.status.toLowerCase().replace(' ', '-')}`}>
                                {animal.status}
                              </span>
                            </td>
                            <td>{animal.lastTreatment || '—'}</td>
                            <td>—</td>
                            <td><button className="fd-tbl-btn">View Details</button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="fd-col-side">

              {/* Compliance Ring */}
              <div className="fd-card fd-card--center">
                <h3 className="fd-card-title fd-card-title--left"><i className="fas fa-chart-pie" /> Compliance Status</h3>
                <div className="fd-ring-wrap">
                  <svg className="fd-ring-svg" viewBox="0 0 192 192">
                    <circle cx="96" cy="96" r="80" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="96" cy="96" r="80"
                      fill="transparent"
                      stroke="#69f6b8"
                      strokeWidth="8"
                      strokeDasharray="502.6"
                      strokeDashoffset={complianceDash}
                      strokeLinecap="round"
                      transform="rotate(-90 96 96)"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(105,246,184,0.4))' }}
                    />
                  </svg>
                  <div className="fd-ring-center">
                    <span className="fd-ring-num">{stats.compliance}%</span>
                    <span className="fd-ring-lbl">Tier 1 Rating</span>
                  </div>
                </div>
                <p className="fd-ring-desc">All livestock vaccinations and regulatory documents are up to date.</p>
              </div>

              {/* Vet Doctors */}
              {vets.length > 0 && (
                <div className="fd-card">
                  <h3 className="fd-card-title"><i className="fas fa-user-md" /> Veterinary Doctors</h3>
                  <div className="fd-vet-list">
                    {vets.map(vet => (
                      <div key={vet.id} className="fd-vet-item">
                        <div className="fd-vet-avatar">👨‍⚕️</div>
                        <div className="fd-vet-info">
                          <div className="fd-vet-name">{vet.name}</div>
                          {vet.location && <div className="fd-vet-loc">📍 {vet.location}</div>}
                          <div className="fd-vet-btns">
                            <a href={`mailto:${vet.email}`} className="fd-vet-btn fd-vet-btn--email">✉️ Email</a>
                            {vet.phone && <a href={`tel:${vet.phone}`} className="fd-vet-btn fd-vet-btn--phone">📞 Call</a>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              <div className="fd-card">
                <h3 className="fd-card-title"><i className="fas fa-bell" /> Notifications</h3>
                <div className="fd-empty-state">
                  <i className="fas fa-bell-slash fd-empty-icon" />
                  <p>No notifications yet</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fd-mobile-nav">
        <button className="fd-mob-btn fd-mob-btn--active" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-chart-line" /><span>Home</span>
        </button>
        <button className="fd-mob-btn" onClick={() => navigate('/farmer-animals')}>
          <i className="fas fa-paw" /><span>Animals</span>
        </button>
        <button className="fd-mob-fab" onClick={() => setShowAddModal(true)}>
          <i className="fas fa-plus" />
        </button>
        <button className="fd-mob-btn" onClick={() => navigate('/farmer-chat')}>
          <i className="fas fa-comments" /><span>Chat</span>
        </button>
        <button className="fd-mob-btn" onClick={async () => { await signOut(auth); navigate('/') }}>
          <i className="fas fa-sign-out-alt" /><span>Logout</span>
        </button>
      </nav>

      {/* ── Add Animal Modal ── */}
      {showAddModal && (
        <div className="fd-modal">
          <div className="fd-modal-box">
            <div className="fd-modal-head">
              <h3>Add New Animal</h3>
              <button className="fd-modal-close" onClick={() => setShowAddModal(false)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleAddAnimal}>
              <div className="fd-form-group">
                <label>Species</label>
                <select value={formData.species} onChange={(e) => handleSpeciesChange(e.target.value)} required>
                  <option value="">Select Species</option>
                  <option value="COW">🐄 Cattle (Cow)</option>
                  <option value="CHICKEN">🐔 Poultry (Chicken)</option>
                  <option value="GOAT">🐐 Goat</option>
                </select>
              </div>
              <div className="fd-form-group">
                <label>Animal ID</label>
                <input type="text" value={formData.animalId} readOnly />
              </div>
              <div className="fd-form-group">
                <label>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} required>
                  <option value="Healthy">Healthy</option>
                  <option value="Under Treatment">Under Treatment</option>
                  <option value="Withdrawal Period">Withdrawal Period</option>
                </select>
              </div>
              <div className="fd-form-group">
                <label>Last Treatment Date (Optional)</label>
                <input type="date" value={formData.lastTreatment} onChange={(e) => setFormData({ ...formData, lastTreatment: e.target.value })} />
              </div>
              <div className="fd-modal-foot">
                <button type="button" className="fd-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="fd-btn-submit">Add Animal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Consultation Modal ── */}
      {showConsultModal && (
        <div className="fd-modal">
          <div className="fd-modal-box">
            <div className="fd-modal-head">
              <h3>Request Consultation</h3>
              <button className="fd-modal-close" onClick={() => setShowConsultModal(false)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleConsultation}>
              <div className="fd-form-group">
                <label>Select Animal</label>
                <select value={consultData.animalId} onChange={(e) => setConsultData({ ...consultData, animalId: e.target.value })} required>
                  <option value="">Select Animal</option>
                  {animals.map(a => <option key={a.id} value={a.animalId}>{a.speciesDisplay} - #{a.animalId}</option>)}
                </select>
              </div>
              <div className="fd-form-group">
                <label>Urgency Level</label>
                <select value={consultData.urgency} onChange={(e) => setConsultData({ ...consultData, urgency: e.target.value })} required>
                  <option value="">Select Urgency</option>
                  <option value="High">🔴 High - Immediate attention needed</option>
                  <option value="Medium">🟠 Medium - Within 24 hours</option>
                  <option value="Low">🟢 Low - Routine checkup</option>
                </select>
              </div>
              <div className="fd-form-group">
                <label>Symptoms Description</label>
                <textarea rows="4" value={consultData.symptoms} onChange={(e) => setConsultData({ ...consultData, symptoms: e.target.value })} placeholder="Describe the symptoms..." required />
              </div>
              <div className="fd-modal-foot">
                <button type="button" className="fd-btn-cancel" onClick={() => setShowConsultModal(false)}>Cancel</button>
                <button type="submit" className="fd-btn-submit">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerDashboard
