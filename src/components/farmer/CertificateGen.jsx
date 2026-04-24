import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp } from '../../config/firebase'
import html2canvas from 'html2canvas'
import './SharedStyles.css'
import './CertificateGen.css'

function CertificateGen() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [farmerName, setFarmerName] = useState('')
  const [animals, setAnimals] = useState([])
  const [storedCerts, setStoredCerts] = useState([])
  const [formData, setFormData] = useState({ animalId: '', productType: '', quantity: '' })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [selectedCert, setSelectedCert] = useState(null)

  const productRules = {
    'COW': ['Milk'],
    'CHICKEN': ['Eggs', 'Meat'],
    'NATTUKOZHI': ['Eggs', 'Meat'],
    'GOAT': ['Milk', 'Meat'],
    'BUFFALO': ['Milk'],
    'PIG': ['Meat']
  }

  const yieldLimits = {
    'COW-Milk': 40,
    'CHICKEN-Eggs': 300,
    'CHICKEN-Meat': 3,
    'NATTUKOZHI-Eggs': 200,
    'NATTUKOZHI-Meat': 2,
    'GOAT-Milk': 5,
    'GOAT-Meat': 30,
    'BUFFALO-Milk': 50,
    'PIG-Meat': 100
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        setFarmerName(userDoc.docs[0].data().name)
        loadAnimals(currentUser.uid)
        loadStoredCerts(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (uid) => {
    const q = query(collection(db, 'animals'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    setAnimals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  }

  const loadStoredCerts = async (uid) => {
    const q = query(collection(db, 'sales'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    
    const certs = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const saleData = docSnap.data()
      
      if (!saleData.certId) return null
      
      const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', saleData.certId))
      const purchaseSnap = await getDocs(purchaseQuery)
      const isSold = !purchaseSnap.empty
      
      return { id: docSnap.id, ...saleData, isSold }
    }))
    
    const validCerts = certs.filter(cert => cert !== null)
    validCerts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    setStoredCerts(validCerts)
  }

  const handleAnimalChange = (animalId) => {
    const animal = animals.find(a => a.animalId === animalId)
    setFormData({ ...formData, animalId, productType: '' })
    setProducts(animal ? productRules[animal.species] || [] : [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const animal = animals.find(a => a.animalId === formData.animalId)
      if (!animal) {
        setError('Animal not registered under your farm')
        setLoading(false)
        return
      }

      const yieldKey = `${animal.species}-${formData.productType}`
      if (yieldLimits[yieldKey] && parseFloat(formData.quantity) > yieldLimits[yieldKey]) {
        const unit = formData.productType === 'Milk' ? 'L' : formData.productType === 'Eggs' ? 'pcs' : 'kg'
        setError(`Quantity exceeds realistic production. Max: ${yieldLimits[yieldKey]} ${unit}`)
        setLoading(false)
        return
      }

      const treatmentQ = query(collection(db, 'treatments'), where('farmerId', '==', user.uid), where('animalId', '==', formData.animalId))
      const treatmentSnap = await getDocs(treatmentQ)

      let lastMedicine = 'None'
      let prescriptionId = 'N/A'

      if (!treatmentSnap.empty) {
        for (let doc of treatmentSnap.docs) {
          const t = doc.data()
          if (t.injectionDate) {
            const injDate = t.injectionDate.toDate()
            const safeDate = new Date(injDate)
            safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
            if (new Date() < safeDate) {
              setError(`Withdrawal period active until ${safeDate.toLocaleDateString()}`)
              setLoading(false)
              return
            }
            lastMedicine = t.medicineName
            prescriptionId = doc.id
          }
        }
      }

      const salesQ = query(collection(db, 'sales'), where('farmerId', '==', user.uid), where('animalId', '==', formData.animalId))
      const salesSnap = await getDocs(salesQ)
      
      for (let saleDoc of salesSnap.docs) {
        const saleData = saleDoc.data()
        const certId = saleData.certId || `VS-${new Date().getFullYear()}-${saleDoc.id.substring(0, 6).toUpperCase()}`
        
        const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', certId))
        const purchaseSnap = await getDocs(purchaseQuery)
        
        if (purchaseSnap.empty) {
          setError('Previous certificate for this animal is not yet sold. Cannot generate new certificate.')
          setLoading(false)
          return
        }
      }

      const certId = `VS-${new Date().getFullYear()}-${Date.now().toString().substring(7, 13).toUpperCase()}`
      const batchId = `${formData.productType}${Date.now().toString().substring(11, 13).toUpperCase()}`

      await addDoc(collection(db, 'sales'), {
        certId,
        batchId,
        farmerId: user.uid,
        farmerName,
        animalId: formData.animalId,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        lastMedicine,
        prescriptionId,
        status: 'SAFE',
        createdAt: serverTimestamp(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })

      setCertificate({
        certId,
        batchId,
        farmerName,
        animalId: formData.animalId,
        productType: formData.productType,
        quantity: formData.quantity,
        lastMedicine,
        timestamp: new Date().toLocaleDateString()
      })

      loadStoredCerts(user.uid)
      setFormData({ animalId: '', productType: '', quantity: '' })
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const downloadCertificate = () => {
    const cert = document.querySelector('.certificate-preview')
    if (!cert) return

    html2canvas(cert, { backgroundColor: '#0a0e1a', scale: 2 }).then(canvas => {
      const link = document.createElement('a')
      link.download = `Certificate-${certificate.certId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  const getStats = () => {
    const total = storedCerts.length
    const sold = storedCerts.filter(c => c.isSold).length
    const active = total - sold
    const thisMonth = storedCerts.filter(c => {
      if (!c.createdAt) return false
      const certDate = c.createdAt.toDate()
      const now = new Date()
      return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear()
    }).length

    return { total, sold, active, thisMonth }
  }

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
              <h1><i className="fas fa-certificate"></i> Generate Certificate</h1>
              <p className="page-subtitle">Create safe food certificates for your products / சான்றிதழ்</p>
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
              <i className="fas fa-certificate"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Certificates</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.sold}</div>
              <div className="stat-label">Sold</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon info">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.thisMonth}</div>
              <div className="stat-label">This Month</div>
            </div>
          </div>
        </div>

        {/* Form and Preview Grid */}
        <div className="cert-grid">
          
          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-edit"></i>
                Product Details
              </h2>
            </div>

            {error && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="cert-form">
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-paw"></i>
                  Select Animal / விலங்கு
                </label>
                <select 
                  className="form-select" 
                  value={formData.animalId} 
                  onChange={(e) => handleAnimalChange(e.target.value)} 
                  required
                >
                  <option value="">Choose animal...</option>
                  {animals.map(a => (
                    <option key={a.id} value={a.animalId}>
                      {a.speciesDisplay} - #{a.animalId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-box"></i>
                  Product Type / தயாரிப்பு
                </label>
                <select 
                  className="form-select" 
                  value={formData.productType} 
                  onChange={(e) => setFormData({...formData, productType: e.target.value})} 
                  required
                  disabled={!formData.animalId}
                >
                  <option value="">Choose product...</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-weight"></i>
                  Quantity / அளவு
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                  placeholder="Enter quantity" 
                  required 
                  min="0.1" 
                  step="0.1"
                />
                {formData.productType && (
                  <div className="form-hint">
                    <i className="fas fa-info-circle"></i>
                    Unit: {formData.productType === 'Milk' ? 'Liters (L)' : formData.productType === 'Eggs' ? 'Pieces (pcs)' : 'Kilograms (kg)'}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-certificate"></i>
                    <span>Generate Certificate</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-award"></i>
                Certificate Preview
              </h2>
            </div>

            {loading ? (
              <div className="cert-loading">
                <div className="spinner-large"></div>
                <p>Validating and generating certificate...</p>
              </div>
            ) : certificate ? (
              <div className="cert-preview-wrapper">
                <div className="certificate-preview">
                  <div className="cert-badge">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div className="cert-main-title">SAFE FOOD CERTIFICATE</div>
                  <div className="cert-id-display">ID: {certificate.certId}</div>
                  
                  <div className="cert-details">
                    <div className="cert-row">
                      <span className="cert-label">Farmer</span>
                      <span className="cert-value">{certificate.farmerName}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Animal ID</span>
                      <span className="cert-value">#{certificate.animalId}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Product</span>
                      <span className="cert-value">{certificate.productType}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Quantity</span>
                      <span className="cert-value">
                        {certificate.quantity} {certificate.productType === 'Milk' ? 'L' : certificate.productType === 'Eggs' ? 'pcs' : 'kg'}
                      </span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Last Medicine</span>
                      <span className="cert-value">{certificate.lastMedicine}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Withdrawal</span>
                      <span className="cert-value">✓ Completed</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-label">Date</span>
                      <span className="cert-value">{certificate.timestamp}</span>
                    </div>
                  </div>

                  <div className="cert-status-banner">
                    <i className="fas fa-check-circle"></i>
                    SAFE FOR HUMAN CONSUMPTION
                  </div>

                  <div className="cert-footer-text">
                    Verified by VetSafe Tracker System
                  </div>
                </div>

                <button className="btn btn-success w-full" onClick={downloadCertificate}>
                  <i className="fas fa-download"></i>
                  Download Certificate
                </button>
              </div>
            ) : (
              <div className="cert-empty">
                <div className="cert-empty-icon">
                  <i className="fas fa-certificate"></i>
                </div>
                <h3>No Certificate Generated</h3>
                <p>Fill the form to generate a certificate</p>
              </div>
            )}
          </div>
        </div>

        {/* Stored Certificates */}
        <div className="card mt-4">
          <div className="card-header">
            <h2 className="card-title">
              <i className="fas fa-history"></i>
              Certificate History
            </h2>
          </div>

          <div className="cert-history-grid">
            {storedCerts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h3>No Certificates Yet</h3>
                <p>Generate your first certificate to see it here</p>
              </div>
            ) : (
              storedCerts.map((cert, index) => (
                <div 
                  key={cert.id} 
                  className="cert-history-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => setSelectedCert(cert)}
                >
                  <div className="cert-history-header">
                    <div className="cert-history-icon">
                      <i className="fas fa-certificate"></i>
                    </div>
                    {cert.isSold && (
                      <div className="cert-sold-badge">
                        <i className="fas fa-check"></i>
                        Sold
                      </div>
                    )}
                  </div>

                  <div className="cert-history-body">
                    <div className="cert-history-id">{cert.certId}</div>
                    <div className="cert-history-product">{cert.productType}</div>
                    <div className="cert-history-details">
                      <span><i className="fas fa-paw"></i> {cert.animalId}</span>
                      <span><i className="fas fa-weight"></i> {cert.quantity} {cert.productType === 'Milk' ? 'L' : cert.productType === 'Eggs' ? 'pcs' : 'kg'}</span>
                    </div>
                    <div className="cert-history-date">
                      {cert.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                    </div>
                  </div>

                  <div className="cert-history-footer">
                    <span>View Details</span>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Certificate Detail Modal */}
      {selectedCert && (
        <div className="modal" onClick={() => setSelectedCert(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-certificate"></i>
                Certificate Details
              </h3>
              <button className="modal-close" onClick={() => setSelectedCert(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="certificate-preview">
                <div className="cert-badge">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="cert-main-title">SAFE FOOD CERTIFICATE</div>
                <div className="cert-id-display">ID: {selectedCert.certId}</div>
                
                <div className="cert-details">
                  <div className="cert-row">
                    <span className="cert-label">Farmer</span>
                    <span className="cert-value">{selectedCert.farmerName}</span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Animal ID</span>
                    <span className="cert-value">#{selectedCert.animalId}</span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Product</span>
                    <span className="cert-value">{selectedCert.productType}</span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Quantity</span>
                    <span className="cert-value">
                      {selectedCert.quantity} {selectedCert.productType === 'Milk' ? 'L' : selectedCert.productType === 'Eggs' ? 'pcs' : 'kg'}
                    </span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Last Medicine</span>
                    <span className="cert-value">{selectedCert.lastMedicine}</span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Status</span>
                    <span className="cert-value">{selectedCert.isSold ? '✓ Sold' : '⏳ Active'}</span>
                  </div>
                  <div className="cert-row">
                    <span className="cert-label">Date</span>
                    <span className="cert-value">{selectedCert.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span>
                  </div>
                </div>

                <div className="cert-status-banner">
                  <i className="fas fa-check-circle"></i>
                  SAFE FOR HUMAN CONSUMPTION
                </div>

                <div className="cert-footer-text">
                  Verified by VetSafe Tracker System
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CertificateGen
