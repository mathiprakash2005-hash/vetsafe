import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signOut, collection, query, where, getDocs, doc, getDoc } from '../../config/firebase'
import './BuyerDashboard.css'

export default function BuyerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [showSidebar, setShowSidebar] = useState(false)
  const [stats, setStats] = useState({ total: 0, verified: 0 })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/buyer-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists() && userDoc.data().role === 'buyer') {
        setUser(currentUser)
        setUserData(userDoc.data())
        loadPurchases(currentUser.uid)
      } else {
        await signOut(auth)
        navigate('/buyer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadPurchases = async (uid) => {
    const q = query(collection(db, 'purchases'), where('buyerId', '==', uid))
    const snapshot = await getDocs(q)
    const purchasesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    purchasesList.sort((a, b) => (b.purchaseDate?.toMillis() || 0) - (a.purchaseDate?.toMillis() || 0))
    
    setPurchases(purchasesList)
    setStats({ total: purchasesList.length, verified: purchasesList.length })
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/buyer-login')
  }

  return (
    <div className="dashboard-container">
      <div className="bg-pattern"></div>

      <aside className={`sidebar ${showSidebar ? 'active' : ''}`}>
        <div className="logo">
          <h1>🛒 VetSafe Tracker</h1>
          <p>Buyer Dashboard</p>
        </div>

        <nav>
          <ul className="nav-menu">
            <li><a href="#" className="nav-link active"><i className="fas fa-chart-line"></i><span>Dashboard</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/buyer-verify')}><i className="fas fa-certificate"></i><span>Verify Certificate</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => document.getElementById('historySection')?.scrollIntoView({ behavior: 'smooth' })}><i className="fas fa-shopping-bag"></i><span>Purchase History</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/')}><i className="fas fa-sign-out-alt"></i><span>Logout</span></a></li>
          </ul>
        </nav>
      </aside>

      <button className="menu-toggle" onClick={() => setShowSidebar(!showSidebar)}>
        <i className="fas fa-bars"></i>
      </button>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h2>Welcome Back, {userData?.name || 'Buyer'}</h2>
            <p>Verify certificates and track your purchases</p>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card" onClick={() => navigate('/buyer-verify')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-shopping-bag"></i></div>
              <div className="stat-badge badge-success"><i className="fas fa-check"></i> Active</div>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Purchases</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--success)'}}><i className="fas fa-certificate"></i>{stats.verified} Verified</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>View All →</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => document.getElementById('historySection')?.scrollIntoView({ behavior: 'smooth' })}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-certificate"></i></div>
              <div className="stat-badge badge-info"><i className="fas fa-shield-alt"></i> Safe</div>
            </div>
            <div className="stat-value">{stats.verified}</div>
            <div className="stat-label">Verified Products</div>
            <div className="stat-footer" onClick={() => document.getElementById('historySection')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="stat-change" style={{color: 'var(--info)'}}><i className="fas fa-check-circle"></i>100% Authentic</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>Details →</span>
            </div>
          </div>
        </section>

        <section className="quick-actions">
          <h3 className="section-title"><i className="fas fa-bolt"></i>Quick Actions</h3>
          <div className="actions-grid">
            <div className="action-card" onClick={() => navigate('/buyer-verify')}>
              <div className="action-icon"><i className="fas fa-qrcode"></i></div>
              <div className="action-title">Verify Certificate</div>
              <div className="action-desc">Scan or enter certificate ID</div>
            </div>
            <div className="action-card" onClick={() => document.getElementById('historySection')?.scrollIntoView({ behavior: 'smooth' })}>
              <div className="action-icon"><i className="fas fa-history"></i></div>
              <div className="action-title">Purchase History</div>
              <div className="action-desc">View all verified purchases</div>
            </div>
          </div>
        </section>

        <section className="data-section" id="historySection">
          <h3 className="section-title"><i className="fas fa-shopping-bag"></i>Recent Purchases</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Product Type</th>
                  <th>Quantity</th>
                  <th>Farmer</th>
                  <th>Purchase Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                      <i className="fas fa-shopping-cart" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.3}}></i>
                      <p>No purchases yet. Verify a certificate to get started.</p>
                    </td>
                  </tr>
                ) : (
                  purchases.map(purchase => (
                    <tr key={purchase.id}>
                      <td className="animal-id">#{purchase.certId?.slice(0, 8) || 'N/A'}</td>
                      <td>{purchase.productType}</td>
                      <td>{purchase.quantity} {purchase.productType === 'Milk' ? 'L' : purchase.productType === 'Eggs' ? 'pcs' : 'kg'}</td>
                      <td>{purchase.farmerName || 'N/A'}</td>
                      <td>{purchase.purchaseDate?.toDate().toLocaleDateString() || 'N/A'}</td>
                      <td><span className="status-badge status-verified">✓ Verified</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
