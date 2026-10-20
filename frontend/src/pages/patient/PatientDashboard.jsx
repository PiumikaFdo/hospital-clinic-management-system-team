import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, FlaskConical, CreditCard, Calendar, Activity, FileText, CheckCircle2, User, Stethoscope } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    recent_appointments: [],
    recent_bills: [],
    recent_labs: [],
    outstanding_balance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/patient/dashboard')
      .then(res => {
        if (res.data.success) {
          setData(res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout 
      title="Personal Health Record & Portal" 
      subtitle="View your scheduled consultations, diagnostic laboratory reports, and billing statements"
    >
      {/* WELCOME BANNER */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%)',
          color: '#fff',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#fff' }}>
              Welcome back, {user?.name || user?.first_name || 'Patient'}
            </h2>
            <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13.5 }}>
              Your electronic patient file is synchronized with hospital departments in real-time.
            </p>
          </div>
          <Link
            to="/book-appointment"
            className="btn btn-primary"
            style={{
              background: '#fff',
              color: 'var(--primary-700)',
              fontWeight: 700,
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            <CalendarCheck size={16} />
            <span>Schedule New Consultation</span>
          </Link>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue">
            <CalendarCheck size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{data.recent_appointments.length}</div>
            <div className="stat-label">Appointments Booked</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FlaskConical size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{data.recent_labs.length}</div>
            <div className="stat-label">Laboratory Diagnostic Tests</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: Number(data.outstanding_balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>
              Rs. {Number(data.outstanding_balance || 0).toLocaleString()}
            </div>
            <div className="stat-label">
              {Number(data.outstanding_balance) > 0 ? 'Balance Pending Settlement' : 'Accounts Settled'}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT APPOINTMENTS */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-header-left">
            <Calendar size={18} className="text-primary" />
            <h3>Your Outpatient Consultations</h3>
          </div>
          <Link to="/patient/appointments" className="btn btn-outline btn-sm">Full History</Link>
        </div>
        <div className="card-body card-body-table">
          {loading ? (
            <p style={{ color: 'var(--slate-400)', padding: 24 }}>Loading appointment records...</p>
          ) : data.recent_appointments.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={36} className="empty-icon text-primary" />
              <h4>No consultation history recorded</h4>
              <p>Book a specialist appointment to initiate your record.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Consultation Date</th>
                    <th>Time</th>
                    <th>Reason / Notes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_appointments.map(a => (
                    <tr key={a.appointment_id}>
                      <td><strong>Dr. {a.doctor_name}</strong></td>
                      <td><span className="badge badge-primary">{a.dept_name}</span></td>
                      <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                      <td><strong>{a.appointment_time?.slice(0, 5)}</strong></td>
                      <td style={{ color: 'var(--slate-600)' }}>{a.reason || 'Routine Checkup'}</td>
                      <td>
                        <span className={`badge ${
                          a.status === 'Completed' ? 'badge-success' :
                          a.status === 'Confirmed' ? 'badge-info' :
                          a.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* TWO COLUMNS: LAB RESULTS & BILLS */}
      <div className="dashboard-charts-grid" style={{ gap: 20 }}>
        {/* LAB RESULTS */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <FlaskConical size={18} className="text-teal" />
              <h3>Diagnostic Pathology Reports</h3>
            </div>
            <Link to="/patient/reports" className="btn btn-outline btn-sm">All Reports</Link>
          </div>
          <div className="card-body card-body-table">
            {data.recent_labs.length === 0 ? (
              <div className="empty-state">
                <FlaskConical size={32} className="empty-icon" />
                <h4>No lab tests recorded</h4>
                <p>Diagnostic reports will appear here when ready.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_labs.map(l => (
                      <tr key={l.lab_request_id}>
                        <td>
                          <strong>{l.test_name}</strong>
                          <div className="cell-sub">{l.category}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{new Date(l.request_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${l.status === 'Completed' ? 'badge-success' : 'badge-gray'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td>
                          {l.status === 'Completed' ? (
                            <span style={{ fontWeight: 700, color: l.is_abnormal ? 'var(--danger)' : 'var(--success)' }}>
                              {l.result_value || 'Report Available'}
                            </span>
                          ) : (
                            <span className="cell-sub">Pending Lab Analysis</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RECENT BILLS */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <CreditCard size={18} className="text-amber" />
              <h3>Invoices & Billing Statements</h3>
            </div>
            <Link to="/patient/reports" className="btn btn-outline btn-sm">Billing Records</Link>
          </div>
          <div className="card-body card-body-table">
            {data.recent_bills.length === 0 ? (
              <div className="empty-state">
                <CreditCard size={32} className="empty-icon" />
                <h4>No billing statements</h4>
                <p>All statements are current.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_bills.map(b => (
                      <tr key={b.bill_id}>
                        <td>
                          <span className="code-tag">#{b.bill_number || b.bill_id}</span>
                          <div className="cell-sub">{new Date(b.bill_date).toLocaleDateString()}</div>
                        </td>
                        <td><strong>Rs. {Number(b.total_amount).toLocaleString()}</strong></td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {Number(b.paid_amount).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${
                            b.payment_status === 'Paid' ? 'badge-success' :
                            b.payment_status === 'Partial' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {b.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;
