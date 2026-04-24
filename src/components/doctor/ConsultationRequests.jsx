import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, Timestamp, onSnapshot } from '../../config/firebase'
import './ConsultationRequests.css'

const MEDICINE_LIST = [
  'Amoxicillin', 'Penicillin', 'Tetracycline', 'Oxytetracycline', 'Doxycycline',
  'Enrofloxacin', 'Ciprofloxacin', 'Gentamicin', 'Neomycin', 'Streptomycin',
  'Tylosin', 'Tilmicosin', 'Florfenicol', 'Ceftiofur', 'Ampicillin',
  'Sulfadimethoxine', 'Trimethoprim-Sulfa', 'Lincomycin', 'Spectinomycin', 'Erythromycin',
  'Chlortetracycline', 'Bacitracin', 'Colistin', 'Tiamulin', 'Virginiamycin',
  'Avilamycin', 'Apramycin', 'Kanamycin', 'Cephalexin', 'Cloxacillin',
  'Ivermectin', 'Albendazole', 'Fenbendazole', 'Levamisole', 'Piperazine',
  'Mebendazole', 'Oxfendazole', 'Doramectin', 'Eprinomectin', 'Moxidectin',
  'Pyrantel', 'Thiabendazole', 'Niclosamide', 'Praziquantel', 'Closantel',
  'Nitroxynil', 'Rafoxanide', 'Triclabendazole', 'Clorsulon', 'Morantel',
  'Newcastle Disease Vaccine', 'Infectious Bursal Disease Vaccine', 'Marek\'s Disease Vaccine',
  'Fowl Pox Vaccine', 'Avian Influenza Vaccine', 'Foot and Mouth Disease Vaccine',
  'Brucellosis Vaccine', 'Anthrax Vaccine', 'Blackleg Vaccine', 'Rabies Vaccine',
  'Clostridial Vaccine', 'Pasteurella Vaccine', 'E. coli Vaccine', 'Salmonella Vaccine',
  'Coccidiosis Vaccine', 'Meloxicam', 'Flunixin Meglumine', 'Ketoprofen',
  'Phenylbutazone', 'Aspirin', 'Carprofen', 'Dexamethasone', 'Prednisolone',
  'Ibuprofen', 'Diclofenac', 'Vitamin A', 'Vitamin D3', 'Vitamin E',
  'Vitamin B Complex', 'Vitamin C', 'Calcium Borogluconate', 'Iron Dextran',
  'Selenium-Vitamin E', 'Multivitamin Injectable', 'Amino Acid Complex',
  'Amprolium', 'Sulfaquinoxaline', 'Diclazuril', 'Toltrazuril', 'Monensin',
  'Salinomycin', 'Narasin', 'Lasalocid', 'Oxytocin', 'Atropine',
  'Epinephrine', 'Furosemide', 'Metoclopramide', 'Diphenhydramine', 'Activated Charcoal'
]

export default function ConsultationRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentRequest, setCurrentRequest] = useState(null)
  const [prescriptionData, setPrescriptionData] = useState({ medicineName: '', dosage: '', withdrawalDays: '' })
  const [filteredMedicines, setFilteredMedicines] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    let requestsUnsub = null

    const authUnsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        requestsUnsub = loadRequests()
      } else {
        navigate('/doctor-login')
      }
    })

    return () => {
      authUnsub()
      if (requestsUnsub) requestsUnsub()
    }
  }, [navigate])

  const loadRequests = () => {
    try {
      const q = query(collection(db, 'consultationRequests'), where('status', '==', 'pending'))

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log('Realtime update received:', snapshot.size)

        const requestsList = []

        for (const docSnap of snapshot.docs) {
          const request = { id: docSnap.id, ...docSnap.data() }

          const farmerDoc = await getDoc(doc(db, 'users', request.farmerId))
          if (farmerDoc.exists()) {
            request.farmerName = farmerDoc.data().name
          } else {
            request.farmerName = 'Unknown Farmer'
          }

          requestsList.push(request)
        }

        requestsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))

        setRequests(requestsList)
        setLoading(false)
      })

      return unsubscribe

    } catch (error) {
      console.error('Realtime error:', error)
      setLoading(false)
    }
  }

  const handleMedicineInput = (value) => {
    setPrescriptionData({ ...prescriptionData, medicineName: value })
    
    if (value.trim()) {
      const filtered = MEDICINE_LIST.filter(med => 
        med.toLowerCase().startsWith(value.toLowerCase())
      )
      setFilteredMedicines(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredMedicines([])
      setShowSuggestions(false)
    }
  }

  const selectMedicine = (medicine) => {
    setPrescriptionData({ ...prescriptionData, medicineName: medicine })
    setShowSuggestions(false)
  }

  const handleAccept = async (request) => {
    setCurrentRequest(request)
    setShowModal(true)
  }

  const handleIgnore = async (requestId) => {
    if (window.confirm('Are you sure you want to ignore this request?')) {
      try {
        await updateDoc(doc(db, 'consultationRequests', requestId), {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          doctorId: auth.currentUser.uid
        })
      } catch (error) {
        alert('Error ignoring request: ' + error.message)
      }
    }
  }

  const handleSubmitPrescription = async (e) => {
    e.preventDefault()
    
    try {
      await addDoc(collection(db, 'treatments'), {
        farmerId: currentRequest.farmerId,
        farmerName: currentRequest.farmerName,
        animalId: currentRequest.animalId,
        medicineName: prescriptionData.medicineName,
        dosage: prescriptionData.dosage,
        withdrawalDays: parseInt(prescriptionData.withdrawalDays),
        createdAt: serverTimestamp(),
        doctorId: auth.currentUser.uid
      })
      
      await updateDoc(doc(db, 'consultationRequests', currentRequest.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      })
      
      alert('Prescription created successfully!')
      setShowModal(false)
      setPrescriptionData({ medicineName: '', dosage: '', withdrawalDays: '' })
      setCurrentRequest(null)
    } catch (error) {
      alert('Error creating prescription: ' + error.message)
    }
  }

  return (
    <div className="consultation-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Consultation Requests</h1>
          <button className="back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>

        <div className="requests-grid">
          {loading ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <p>No pending consultation requests</p>
            </div>
          ) : (
            requests.map(request => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-info">
                    <div className="farmer-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="farmer-details">
                      <h3>{request.farmerName || 'Unknown Farmer'}</h3>
                      <p className="request-date">
                        <i className="fas fa-clock"></i>
                        {request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className={`urgency-badge urgency-${request.urgency.toLowerCase()}`}>
                    <i className="fas fa-exclamation-circle"></i>
                    {request.urgency} Priority
                  </span>
                </div>

                <div className="request-body">
                  <div className="info-box">
                    <div className="info-label">
                      <i className="fas fa-paw"></i>
                      Animal ID
                    </div>
                    <div className="info-value">#{request.animalId}</div>
                  </div>

                  <div className="info-box">
                    <div className="info-label">
                      <i className="fas fa-heartbeat"></i>
                      Urgency Level
                    </div>
                    <div className="info-value">{request.urgency}</div>
                  </div>

                  <div className="info-box symptoms-box">
                    <div className="info-label">
                      <i className="fas fa-notes-medical"></i>
                      Symptoms Description
                    </div>
                    <div className="symptoms-text">{request.symptoms}</div>
                  </div>
                </div>

                <div className="request-actions">
                  <button className="action-btn btn-accept" onClick={() => handleAccept(request)}>
                    <i className="fas fa-check-circle"></i>
                    Accept & Create Prescription
                  </button>
                  <button className="action-btn btn-ignore" onClick={() => handleIgnore(request.id)}>
                    <i className="fas fa-times-circle"></i>
                    Ignore Request
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Prescription</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitPrescription}>
              <div className="form-group">
                <label className="form-label">Farmer Name</label>
                <input type="text" className="form-input" value={currentRequest?.farmerName || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Animal ID</label>
                <input type="text" className="form-input" value={currentRequest?.animalId || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Medicine Name</label>
                <div className="autocomplete-wrapper">
                  <input 
                    type="text" 
                    className="form-input" 
                    value={prescriptionData.medicineName} 
                    onChange={(e) => handleMedicineInput(e.target.value)}
                    onFocus={() => prescriptionData.medicineName && setShowSuggestions(true)}
                    placeholder="Start typing medicine name..."
                    required 
                  />
                  {showSuggestions && filteredMedicines.length > 0 && (
                    <div className="suggestions-dropdown">
                      {filteredMedicines.map((medicine, index) => (
                        <div 
                          key={index} 
                          className="suggestion-item"
                          onClick={() => selectMedicine(medicine)}
                        >
                          {medicine}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dosage</label>
                <input type="text" className="form-input" placeholder="e.g., 10mg twice daily" value={prescriptionData.dosage} onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Withdrawal Period (days)</label>
                <input type="number" className="form-input" placeholder="Number of days" value={prescriptionData.withdrawalDays} onChange={(e) => setPrescriptionData({ ...prescriptionData, withdrawalDays: e.target.value })} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn btn-submit">Create Prescription</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
