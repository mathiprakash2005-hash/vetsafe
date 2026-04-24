import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs } from '../../config/firebase'
import './SoldHistory.css'

function SoldHistory() {
  const navigate = useNavigate()
  const [soldProducts, setSoldProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        loadSoldProducts(userDoc.docs[0].data().name)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadSoldProducts = async (farmerName) => {
    try {
      const q = query(collection(db, 'purchases'), where('farmerName', '==', farmerName))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setSoldProducts([])
        setLoading(false)
        return
      }

      const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      purchases.sort((a, b) => (b.purchaseDate?.toMillis() || 0) - (a.purchaseDate?.toMillis() || 0))
      
      setSoldProducts(purchases)
      setLoading(false)
    } catch (error) {
      console.error('Error loading sold products:', error)
      setLoading(false)
    }
  }

  const handleBack = () => {
    try {
      navigate(-1)
    } catch {
      navigate('/farmer-dashboard')
    }
  }

  return (
    <div className="sold-container">
      <div className="sold-header">
        <button className="sold-back-btn" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <h1 className="sold-page-title">Sold History</h1>
      </div>

      <div className="sold-content">
        {loading ? (
          <div className="sold-loading">
            <div className="spinner"></div>
            <p>Loading sold products...</p>
          </div>
        ) : soldProducts.length === 0 ? (
          <div className="sold-empty-state">
            <i className="fas fa-shopping-cart"></i>
            <p>No products sold yet</p>
            <p className="sold-empty-sub">Products will appear here when buyers approve your certificates</p>
          </div>
        ) : (
          <div className="sold-grid">
            {soldProducts.map(purchase => (
              <div key={purchase.id} className="sold-item">
                <div className="sold-icon">
                  <i className="fas fa-box-open"></i>
                </div>
                <div className="sold-details">
                  <div className="sold-title">
                    {purchase.productType} - {purchase.quantity} {purchase.productType === 'Milk' ? 'L' : purchase.productType === 'Eggs' ? 'pcs' : 'kg'}
                  </div>
                  <div className="sold-meta">
                    <span><i className="fas fa-user"></i> {purchase.buyerName || 'N/A'}</span>
                    <span><i className="fas fa-paw"></i> {purchase.animalId || 'N/A'}</span>
                    <span><i className="fas fa-calendar"></i> {purchase.purchaseDate?.toDate().toLocaleDateString() || 'N/A'}</span>
                    <span><i className="fas fa-certificate"></i> {purchase.certId || 'N/A'}</span>
                  </div>
                </div>
                <div className="sold-badge">✓ Sold</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SoldHistory
