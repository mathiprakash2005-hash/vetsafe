import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, getDocs, query, where, doc, getDoc } from '../../config/firebase'
import './Analytics.css'

export default function Analytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalConsultations: 0,
    pendingRequests: 0,
    approvedPrescriptions: 0,
    rejectedRequests: 0,
    totalMedicines: 0,
    uniqueMedicines: 0,
    totalFarmers: 0,
    urgentCases: 0,
    thisWeek: 0,
    thisMonth: 0,
    avgResponseTime: 0,
    successRate: 0
  })
  const [topMedicines, setTopMedicines] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'doctor') {
        navigate('/doctor-login')
        return
      }

      await loadAnalytics()
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnalytics = async () => {
    try {
      // Load consultation requests
      const requestsSnap = await getDocs(collection(db, 'consultationRequests'))
      const requests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Load treatments
      const treatmentsSnap = await getDocs(collection(db, 'treatments'))
      const treatments = treatmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Calculate stats
      const pending = requests.filter(r => r.status === 'pending').length
      const approved = treatments.length
      const rejected = requests.filter(r => r.status === 'rejected').length
      const urgent = requests.filter(r => r.urgency === 'High' && r.status === 'pending').length

      // Unique farmers
      const farmerIds = new Set(requests.map(r => r.farmerId))
      const totalFarmers = farmerIds.size

      // Medicine stats
      const medicineNames = treatments.map(t => t.medicineName)
      const uniqueMedicines = new Set(medicineNames).size
      const medicineCounts = {}
      medicineNames.forEach(name => {
        medicineCounts[name] = (medicineCounts[name] || 0) + 1
      })
      const topMeds = Object.entries(medicineCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      // Time-based stats
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const thisWeek = requests.filter(r => {
        const date = r.createdAt?.toDate()
        return date && date >= weekAgo
      }).length

      const thisMonth = requests.filter(r => {
        const date = r.createdAt?.toDate()
        return date && date >= monthAgo
      }).length

      // Success rate
      const total = approved + rejected
      const successRate = total > 0 ? Math.round((approved / total) * 100) : 0

      // Monthly data for chart
      const monthlyStats = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
        const monthRequests = requests.filter(r => {
          const date = r.createdAt?.toDate()
          return date && 
            date.getMonth() === monthDate.getMonth() && 
            date.getFullYear() === monthDate.getFullYear()
        }).length
        monthlyStats.push({ month: monthName, count: monthRequests })
      }

      // Recent activity
      const recentReqs = requests
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
        .slice(0, 10)

      const activity = await Promise.all(
        recentReqs.map(async (req) => {
          const farmerDoc = await getDoc(doc(db, 'users', req.farmerId))
          const farmerName = farmerDoc.exists() ? farmerDoc.data().name : 'Unknown'
          return {
            id: req.id,
            farmerName,
            animalId: req.animalId,
            status: req.status,
            urgency: req.urgency,
            date: req.createdAt?.toDate()
          }
        })
      )

      setStats({
        totalConsultations: requests.length,
        pendingRequests: pending,
        approvedPrescriptions: approved,
        rejectedRequests: rejected,
        totalMedicines: medicineNames.length,
        uniqueMedicines,
        totalFarmers,
        urgentCases: urgent,
        thisWeek,
        thisMonth,
        avgResponseTime: 2.5,
        successRate
      })

      setTopMedicines(topMeds)
      setRecentActivity(activity)
      setMonthlyData(monthlyStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading analytics:', error)
      setLoading(false)
    }
  }

  const maxMonthlyCount = Math.max(...monthlyData.map(m => m.count), 1)

  return (
    <div className="analytics-container">
      <div className="analytics-glow"></div>

      {/* Header */}
      <header className="analytics-header">
        <div className="analytics-header-left">
          <button className="analytics-back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1><i className="fas fa-chart-line"></i> Analytics Dashboard</h1>
            <p>Performance insights and statistics</p>
          </div>
        </div>
        <button className="analytics-export-btn">
          <i className="fas fa-download"></i>
          Export Report
        </button>
      </header>

      {loading ? (
        <div className="analytics-loading">
          <div className="spinner-large"></div>
          <p>Loading analytics...</p>
        </div>
      ) : (
        <main className="analytics-content">
          
          {/* Overview Stats */}
          <section className="analytics-section">
            <h2 className="section-title">Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon primary">
                  <i className="fas fa-clipboard-list"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalConsultations}</div>
                  <div className="stat-label">Total Consultations</div>
                  <div className="stat-trend positive">
                    <i className="fas fa-arrow-up"></i>
                    {stats.thisWeek} this week
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon warning">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.pendingRequests}</div>
                  <div className="stat-label">Pending Requests</div>
                  <div className="stat-trend urgent">
                    <i className="fas fa-exclamation-circle"></i>
                    {stats.urgentCases} urgent
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon success">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.approvedPrescriptions}</div>
                  <div className="stat-label">Approved Prescriptions</div>
                  <div className="stat-trend positive">
                    <i className="fas fa-arrow-up"></i>
                    {stats.successRate}% success rate
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon info">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalFarmers}</div>
                  <div className="stat-label">Total Farmers</div>
                  <div className="stat-trend">
                    <i className="fas fa-user-plus"></i>
                    Active patients
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Charts Section */}
          <div className="analytics-grid">
            
            {/* Monthly Consultations Chart */}
            <div className="analytics-card">
              <div className="card-header">
                <h3><i className="fas fa-chart-bar"></i> Monthly Consultations</h3>
                <span className="card-badge">Last 6 months</span>
              </div>
              <div className="chart-container">
                <div className="bar-chart">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="bar-wrapper">
                      <div className="bar-column">
                        <div 
                          className="bar"
                          style={{ 
                            height: `${(data.count / maxMonthlyCount) * 100}%`,
                            animationDelay: `${index * 0.1}s`
                          }}
                        >
                          <span className="bar-value">{data.count}</span>
                        </div>
                      </div>
                      <div className="bar-label">{data.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Medicines */}
            <div className="analytics-card">
              <div className="card-header">
                <h3><i className="fas fa-pills"></i> Top Prescribed Medicines</h3>
                <span className="card-badge">{stats.uniqueMedicines} unique</span>
              </div>
              <div className="medicine-list">
                {topMedicines.length === 0 ? (
                  <div className="empty-state-small">
                    <i className="fas fa-pills"></i>
                    <p>No medicines prescribed yet</p>
                  </div>
                ) : (
                  topMedicines.map((med, index) => (
                    <div key={index} className="medicine-item" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="medicine-rank">{index + 1}</div>
                      <div className="medicine-info">
                        <div className="medicine-name">{med.name}</div>
                        <div className="medicine-bar">
                          <div 
                            className="medicine-bar-fill"
                            style={{ 
                              width: `${(med.count / topMedicines[0].count) * 100}%`,
                              animationDelay: `${index * 0.1 + 0.3}s`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="medicine-count">{med.count}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <section className="analytics-section">
            <h2 className="section-title">Performance Metrics</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-tachometer-alt"></i>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{stats.avgResponseTime}h</div>
                  <div className="metric-label">Avg Response Time</div>
                  <div className="metric-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-percentage"></i>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{stats.successRate}%</div>
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-progress">
                    <div className="progress-bar">
                      <div className="progress-fill success" style={{ width: `${stats.successRate}%` }}></div>
                    </div>
                    <span>High Performance</span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-calendar-week"></i>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{stats.thisMonth}</div>
                  <div className="metric-label">This Month</div>
                  <div className="metric-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '60%' }}></div>
                    </div>
                    <span>On Track</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="analytics-section">
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-card">
              <div className="activity-list">
                {recentActivity.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-history"></i>
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={activity.id} className="activity-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="activity-icon">
                        <i className="fas fa-user-md"></i>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">
                          Consultation request from <strong>{activity.farmerName}</strong>
                        </div>
                        <div className="activity-details">
                          Animal ID: {activity.animalId} • 
                          <span className={`activity-urgency ${activity.urgency?.toLowerCase()}`}>
                            {activity.urgency} Priority
                          </span>
                        </div>
                      </div>
                      <div className="activity-meta">
                        <span className={`activity-status ${activity.status}`}>
                          {activity.status}
                        </span>
                        <span className="activity-time">
                          {activity.date?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
