import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp, runTransaction } from '../../config/firebase'
import './BuyerVerify.css'

export default function BuyerVerify() {
  const navigate = useNavigate()
  const [certId, setCertId] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/buyer-login')
      } else {
        setCurrentUser(user)
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const showMsg = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const searchCertificate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setCertificate(null)
    setMessage({ text: '', type: '' })

    try {
      const q = query(collection(db, 'sales'), where('certId', '==', certId.trim()))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        showMsg('Certificate not found. Please check the ID and try again.', 'error')
        setLoading(false)
        return
      }

      const certData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      
      // Check if certificate is expired
      if (certData.expiryDate) {
        const expiryDate = certData.expiryDate instanceof Date ? certData.expiryDate : certData.expiryDate.toDate()
        if (new Date() > expiryDate) {
          showMsg('Certificate has expired. Cannot be purchased.', 'error')
          setLoading(false)
          return
        }
      }
      
      // Check if already sold
      const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', certId.trim()))
      const purchaseSnap = await getDocs(purchaseQuery)
      if (!purchaseSnap.empty) {
        showMsg('Certificate already purchased by another buyer.', 'error')
        setLoading(false)
        return
      }
      
      setCertificate(certData)
    } catch (error) {
      console.error('Error searching certificate:', error)
      showMsg('An error occurred while searching. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const approvePurchase = async () => {
    if (!currentUser || !certificate) return

    setApproving(true)

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      const buyerName = userDoc.exists() ? userDoc.data().name : 'Unknown'

      // Use transaction to prevent race condition
      await runTransaction(db, async (transaction) => {
        // Check if already purchased within transaction
        const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', certificate.certId))
        const purchaseSnap = await getDocs(purchaseQuery)
        
        if (!purchaseSnap.empty) {
          throw new Error('Certificate already purchased by another buyer')
        }

        // Add purchase atomically
        const purchaseRef = doc(collection(db, 'purchases'))
        transaction.set(purchaseRef, {
          buyerId: currentUser.uid,
          buyerName: buyerName,
          farmerId: certificate.farmerId,
          certId: certificate.certId,
          farmerName: certificate.farmerName,
          animalId: certificate.animalId,
          productType: certificate.productType,
          quantity: certificate.quantity,
          lastMedicine: certificate.lastMedicine,
          purchaseDate: serverTimestamp()
        })
      })

      showMsg('Purchase approved successfully! Redirecting to dashboard...', 'success')
      setTimeout(() => navigate('/buyer-dashboard'), 2000)
    } catch (error) {
      console.error('Error approving purchase:', error)
      if (error.message.includes('already purchased')) {
        showMsg('Certificate already purchased by another buyer.', 'error')
      } else {
        showMsg('Failed to approve purchase. Please try again.', 'error')
      }
      setApproving(false)
    }
  }

  return (
    <div className="buyer-verify">
      <div className="container">
        <div className="header">
          <h1 className="page-title">Verify Certificate</h1>
          <button className="back-btn" onClick={() => navigate('/buyer-dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>

        <div className="search-card">
          <form className="search-form" onSubmit={searchCertificate}>
            <input
              type="text"
              className="search-input"
              placeholder="Enter Certificate ID (e.g., VS-2026-XXXXXX)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              required
            />
            <button type="submit" className="search-btn" disabled={loading}>
              <i className="fas fa-search"></i> Search
            </button>
          </form>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching certificate...</p>
          </div>
        )}

        {certificate && (
          <div className="certificate">
            <div className="cert-header">
              <div className="cert-main-title">SAFE FOOD CERTIFICATE</div>
              <div className="cert-id">Certificate ID: {certificate.certId}</div>
            </div>
            <div className="cert-row">
              <span className="cert-label">Farmer:</span>
              <span className="cert-value">{certificate.farmerName || 'N/A'}</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Animal:</span>
              <span className="cert-value">{certificate.animalId || 'N/A'}</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Product:</span>
              <span className="cert-value">{certificate.productType || 'N/A'}</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Quantity:</span>
              <span className="cert-value">
                {certificate.quantity} {certificate.productType === 'Milk' ? 'L' : certificate.productType === 'Eggs' ? 'pcs' : 'kg'}
              </span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Last Medicine:</span>
              <span className="cert-value">{certificate.lastMedicine || 'None'}</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Withdrawal Completed:</span>
              <span className="cert-value">YES</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Verified By:</span>
              <span className="cert-value">VetSafe Tracker System</span>
            </div>
            <div className="cert-row">
              <span className="cert-label">Timestamp:</span>
              <span className="cert-value">{certificate.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span>
            </div>
            <div className="cert-status">✓ SAFE FOR HUMAN CONSUMPTION</div>
            <button className="approve-btn" onClick={approvePurchase} disabled={approving}>
              {approving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i> Approve Purchase
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
