import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signOut, doc, getDoc, collection, query, where, getDocs } from '../../config/firebase'
import './DoctorDashboard.css'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, medicines: 0, urgent: 0, unique: 0 })
  const [requests, setRequests] = useState([])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        setUser(currentUser)
        setUserData(userDoc.data())
        loadStats(currentUser.uid)
      } else {
        await signOut(auth)
        navigate('/doctor-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadStats = async (uid) => {
    const requestsSnap = await getDocs(collection(db, 'consultationRequests'))
    const requests = requestsSnap.docs.map(d => d.data())
    
    const pending = requests.filter(r => r.status === 'pending').length
    const urgent = requests.filter(r => r.status === 'pending' && r.urgency === 'High').length
    
    const treatmentsSnap = await getDocs(collection(db, 'treatments'))
    const approved = treatmentsSnap.size
    
    const rejected = requests.filter(r => r.status === 'rejected').length
    
    const totalMeds = approved + rejected
    const uniqueMeds = new Set(treatmentsSnap.docs.map(d => d.data().medicineName)).size

    setStats({ pending, approved, rejected, medicines: totalMeds, urgent, unique: uniqueMeds })
    
    const recentRequests = await Promise.all(
      requestsSnap.docs.slice(0, 10).map(async (d) => {
        const data = d.data()
        const farmerDoc = await getDoc(doc(db, 'users', data.farmerId))
        const farmerName = farmerDoc.exists() ? farmerDoc.data().name : 'N/A'
        return { id: d.id, ...data, farmerName }
      })
    )
    setRequests(recentRequests)
  }

  return (
    <div className="dashboard-container">
      <div className="bg-pattern"></div>

      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}
      <aside className={`sidebar ${showSidebar ? 'active' : ''}`}>
        <div className="logo">
          <h1>🩺 VetSafe Tracker</h1>
          <p>Veterinary Dashboard</p>
        </div>

        <nav>
          <ul className="nav-menu">
            <li><a href="#" className="nav-link active"><i className="fas fa-chart-line"></i><span>Dashboard</span></a></li>
            <li><a href="#" className="nav-link"onClick={() =>navigate('/consultation-requests')}><i className="fas fa-inbox"></i><span>Consultation Requests</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/doctor-chat')}><i className="fas fa-comments"></i><span>Chat with Farmers</span></a></li>
            <li><a href="#" className="nav-link" onClick={() =>navigate('/doctor-prescriptions')}><i className="fas fa-pills"></i><span>Prescription History</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/analytics')}><i className="fas fa-chart-bar"></i><span>Analytics</span></a></li>
            <li><a href="#" className="nav-link"><i className="fas fa-bell"></i><span>Notifications</span></a></li>
            <li><a href="#" className="nav-link" onClick={()=>navigate('/')}><i className="fas fa-cog"></i><span>Logout</span></a></li>
          </ul>
        </nav>
      </aside>

      <button className="menu-toggle" onClick={() => setShowSidebar(s => !s)}>
        <i className="fas fa-bars"></i>
      </button>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h2>Welcome Back, Dr. {userData?.name || 'Doctor'}</h2>
            <p>Here's your consultation overview today</p>
          </div>
          <div className="header-right">
            <button className="header-btn btn-secondary"><i className="fas fa-download"></i>Export Report</button>
            <button className="header-btn btn-primary" onClick={() => navigate('/consultation-requests')}><i className="fas fa-prescription"></i>New Prescription</button>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card" onClick={() =>navigate('/consultation-requests')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-inbox"></i></div>
              <div className="stat-badge badge-warning"><i className="fas fa-clock"></i> Urgent</div>
            </div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Consultation Requests</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--warning)'}}><i className="fas fa-exclamation-circle"></i>{stats.urgent} Urgent</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>View All →</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/approved-prescriptions')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
              <div className="stat-badge badge-success"><i className="fas fa-arrow-up"></i> +15%</div>
            </div>
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved Prescriptions</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--success)'}}><i className="fas fa-calendar"></i>This Month</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>Details →</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/rejected-prescriptions')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-times-circle"></i></div>
              <div className="stat-badge badge-danger"><i className="fas fa-ban"></i> Rejected</div>
            </div>
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected Requests</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--danger)'}}><i className="fas fa-info-circle"></i>Review Reasons</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>View →</span>
            </div>
          </div>

          <div className="stat-card"onClick={() =>navigate('/doctor-prescriptions')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-pills"></i></div>
              <div className="stat-badge badge-info"><i className="fas fa-star"></i> Active</div>
            </div>
            <div className="stat-value">{stats.medicines}</div>
            <div className="stat-label">Total Medicines Prescribed</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--info)'}}><i className="fas fa-capsules"></i>{stats.unique} Unique</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>Database →</span>
            </div>
          </div>
        </section>

        <section className="quick-actions">
          <h3 className="section-title"><i className="fas fa-bolt"></i>Quick Actions</h3>
          <div className="actions-grid">
      
            <div className="action-card" onClick={() =>navigate('/consultation-requests')}>
              <div className="action-icon"><i className="fas fa-inbox"></i></div>
              <div className="action-title">Review Requests</div>
              <div className="action-desc">Check pending consultations</div>
            </div>
            <div className="action-card" onClick={() =>navigate('/doctor-prescriptions')}>
              <div className="action-icon"><i className="fas fa-pills"></i></div>
              <div className="action-title">Medicine Database</div>
              <div className="action-desc">Browse available medicines</div>
            </div>
            <div className="action-card" onClick={() => navigate('/analytics')}>
              <div className="action-icon"><i className="fas fa-chart-line"></i></div>
              <div className="action-title">View Analytics</div>
              <div className="action-desc">Check performance metrics</div>
            </div>
          </div>
        </section>

        <section className="data-section">
          <h3 className="section-title"><i className="fas fa-inbox"></i>Recent Consultation Requests</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Farmer Name</th>
                  <th>Animal ID</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                      <i className="fas fa-inbox" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.3}}></i>
                      <p>No consultation requests yet</p>
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id}>
                      <td data-label="ID" className="request-id">{req.id.slice(0, 8)}</td>
                      <td data-label="Farmer">{req.farmerName || 'N/A'}</td>
                      <td data-label="Animal">{req.animalId}</td>
                      <td data-label="Issue">{req.symptoms}</td>
                      <td data-label="Status"><span className={`status-badge status-${req.status}`}>{req.status}</span></td>
                      <td data-label="Date">{req.createdAt?.toDate().toLocaleDateString()}</td>
                      <td data-label="Action"><button className="action-btn" onClick={() => navigate('/consultation-requests')}>Review</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {/* Mobile Bottom Nav */}
      <nav className="dd-mobile-nav">
        <button className="dd-mob-btn dd-mob-btn--active" onClick={() => navigate('/doctor-dashboard')}>
          <i className="fas fa-chart-line" /><span>Home</span>
        </button>
        <button className="dd-mob-btn" onClick={() => navigate('/consultation-requests')}>
          <i className="fas fa-inbox" /><span>Requests</span>
        </button>
        <button className="dd-mob-btn" onClick={() => navigate('/doctor-chat')}>
          <i className="fas fa-comments" /><span>Chat</span>
        </button>
        <button className="dd-mob-btn" onClick={() => navigate('/analytics')}>
          <i className="fas fa-chart-bar" /><span>Analytics</span>
        </button>
        <button className="dd-mob-btn" onClick={async () => { await signOut(auth); navigate('/') }}>
          <i className="fas fa-sign-out-alt" /><span>Logout</span>
        </button>
      </nav>
    </div>
  )
}
