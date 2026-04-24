import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './components/Landing'
import FarmerRegister from './components/farmer/FarmerRegister'
import FarmerLogin from './components/farmer/FarmerLogin'
import FarmerDashboard from './components/farmer/FarmerDashboard'
import Prescriptions from './components/farmer/Prescriptions'
import CertificateGen from './components/farmer/CertificateGen'
import SoldHistory from './components/farmer/SoldHistory'
import Treatments from './components/farmer/Treatments'
import MyAnimals from './components/farmer/MyAnimals'
import WithdrawalAnimals from './components/farmer/WithdrawalAnimals'
import DoctorConsultation from './components/farmer/DoctorConsultation'
import DoctorLogin from './components/doctor/DoctorLogin'
import DoctorDashboard from './components/doctor/DoctorDashboard'
import DoctorRegister from './components/doctor/DoctorRegister'
import DoctorPrescriptions from './components/doctor/DoctorPrescriptions'
import ApprovedPrescriptions from './components/doctor/ApprovedPrescriptions'
import RejectedPrescriptions from './components/doctor/RejectedPrescriptions'
import ConsultationRequests from './components/doctor/ConsultationRequests'
import BuyerLogin from './components/buyer/BuyerLogin'
import BuyerRegister from './components/buyer/BuyerRegister'
import BuyerDashboard from './components/buyer/BuyerDashboard'
import BuyerVerify from './components/buyer/BuyerVerify'
import VetChatbot from './components/chatbot/VetChatbot'
import Chat from './components/chat/Chat'
import FarmerChat from './components/chat/FarmerChat'
import DoctorChat from './components/chat/DoctorChat'
import ChatWithDoctor from './components/farmer/ChatWithDoctor'
import Analytics from './components/doctor/Analytics'

function BackButtonHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const handleBack = (e) => {
      e.detail.register(10, () => navigate(-1))
    }
    document.addEventListener('ionBackButton', handleBack)
    return () => document.removeEventListener('ionBackButton', handleBack)
  }, [navigate])
  return null
}

function App() {
  return (
    <Router>
      <BackButtonHandler />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/farmer-register" element={<FarmerRegister />} />
        <Route path="/farmer-login" element={<FarmerLogin />} />
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer-prescriptions" element={<Prescriptions />} />
        <Route path="/farmer-certificate" element={<CertificateGen />} />
        <Route path="/farmer-sold-history" element={<SoldHistory />} />
        <Route path="/farmer-treatments" element={<Treatments />} />
        <Route path="/farmer-animals" element={<MyAnimals />} />
        <Route path="/withdrawal-animals" element={<WithdrawalAnimals />} />
        <Route path="/doctor-consultation" element={<DoctorConsultation />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor-register" element={<DoctorRegister />} />
        <Route path="/doctor-prescriptions" element={<DoctorPrescriptions />} />
        <Route path="/approved-prescriptions" element={<ApprovedPrescriptions />} />
        <Route path="/rejected-prescriptions" element={<RejectedPrescriptions />} />
        <Route path="/consultation-requests" element={<ConsultationRequests />} />
        <Route path="/buyer-login" element={<BuyerLogin />} />
        <Route path="/buyer-register" element={<BuyerRegister />} />
        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
        <Route path="/buyer-verify" element={<BuyerVerify />} />
        <Route path="/farmer-chat" element={<ChatWithDoctor />} />
        <Route path="/doctor-chat" element={<DoctorChat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/chat/:roomId" element={<Chat />} />
      </Routes>
      <VetChatbot />
    </Router>
  )
}

export default App
