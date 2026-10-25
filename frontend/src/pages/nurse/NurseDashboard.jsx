import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bed, FlaskConical, Building2, CheckCircle2, Activity, ArrowRight, Clock } from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const NurseDashboard = () => {
  const [data, setData] = useState({
    active_admissions: 0,
    pending_labs: 0,
    available_beds: 0,
    recent_admissions: [],
    pending_lab_tests: [],
    available_beds_list: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/nurse/dashboard')
      .then(res => {
        if (res.data.success) {
          setData(res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Nursing Station & Inpatient Hub" subtitle="Ward occupancy, bed allocations, and pending laboratory test orders">
      {/* STAT CARDS */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{data.active_admissions}</div>
            <div className="stat-label">Active Ward Admissions</div>
          </div>
        </div>

        <Link
          to="/nurse/lab-tests?status=Requested"
          className="stat-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
          aria-label="View pending lab samples"
        >
          <div className="stat-icon purple">
            <FlaskConical size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{data.pending_labs}</div>
            <div className="stat-label">Pending Lab Samples</div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-icon green">
            <Bed size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{data.available_beds}</div>
            <div className="stat-label">Available Inpatient Beds</div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24, background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(14,165,233,0.05))', border: '1px solid rgba(37,99,235,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-700)', marginBottom: 4 }}>
              Nursing Station Operations
            </h3>
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: 0 }}>
              Direct patient intake, real-time bed allocations, and phlebotomy requests
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/nurse/admissions" className="btn btn-primary btn-sm">
              <Building2 size={15} />
              <span>Manage Admissions</span>
            </Link>
            <Link to="/nurse/wards" className="btn btn-outline btn-sm">
              <Bed size={15} />
              <span>Ward & Bed Layout</span>
            </Link>
            <Link to="/nurse/lab-tests" className="btn btn-outline btn-sm">
              <FlaskConical size={15} />
              <span>Diagnostic Requisitions</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-grid" style={{ gap: 20, marginBottom: 24 }}>
        {/* RECENT ADMISSIONS */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-header-left">
              <Building2 size={18} className="text-primary" />
              <h3>Current In-Patients ({data.recent_admissions.length})</h3>
            </div>
            <Link to="/nurse/admissions" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="card-body card-body-table">
            {loading ? (
              <p style={{ color: 'var(--slate-400)', padding: 24 }}>Loading admissions...</p>
            ) : data.recent_admissions.length === 0 ? (
              <div className="empty-state">
                <Building2 size={32} className="empty-icon" />
                <h4>No active admissions</h4>
                <p>All admitted patients will be monitored here.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Ward & Bed</th>
                      <th>Physician</th>
                      <th>Admitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_admissions.slice(0, 6).map(a => (
                      <tr key={a.admission_id}>
                        <td>
                          <strong>{a.patient_name}</strong>
                          <div className="cell-sub">{a.patient_code}</div>
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ marginRight: 6 }}>{a.ward_name}</span>
                          <strong>Bed {a.bed_number}</strong>
                        </td>
                        <td style={{ fontSize: 13 }}>Dr. {a.doctor_name}</td>
                        <td>
                          <span className="badge badge-info">{a.days_admitted} days</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* PENDING LAB TESTS */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-header-left">
              <FlaskConical size={18} className="text-teal" />
              <h3>Pending Lab Orders ({data.pending_lab_tests.length})</h3>
            </div>
            <Link to="/nurse/lab-tests" className="btn btn-outline btn-sm">Process Labs</Link>
          </div>
          <div className="card-body card-body-table">
            {loading ? (
              <p style={{ color: 'var(--slate-400)', padding: 24 }}>Loading lab tests...</p>
            ) : data.pending_lab_tests.length === 0 ? (
              <div className="empty-state">
                <FlaskConical size={32} className="empty-icon" />
                <h4>No pending lab orders</h4>
                <p>New lab orders will appear here automatically.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Diagnostic Panel</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pending_lab_tests.slice(0, 6).map(l => (
                      <tr key={l.lab_request_id}>
                        <td>
                          <strong>{l.patient_name || l.guest_name || 'Walk-in Patient'}</strong>
                          <div className="cell-sub">{l.patient_code || 'Guest'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.test_name}</div>
                          <div className="cell-sub">{l.category}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            l.priority === 'Critical' ? 'badge-danger' :
                            l.priority === 'Urgent' ? 'badge-warning' : 'badge-info'
                          }`}>
                            {l.priority}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-gray">{l.status}</span>
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

      {/* AVAILABLE BEDS QUICK LIST */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <Bed size={18} className="text-emerald" />
            <h3>Available Inpatient Bed Summary</h3>
          </div>
          <Link to="/nurse/wards" className="btn btn-outline btn-sm">Full Ward Map</Link>
        </div>
        <div className="card-body">
          {data.available_beds_list.length === 0 ? (
            <p style={{ color: 'var(--slate-400)' }}>All inpatient beds currently occupied or under maintenance.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {data.available_beds_list.slice(0, 8).map(bed => (
                <div key={bed.bed_id} style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-200)',
                  background: 'var(--slate-50)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)' }}>
                      Bed {bed.bed_number}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-500)', marginTop: 2 }}>
                      {bed.ward_name} ({bed.ward_type})
                    </div>
                  </div>
                  <span className="badge badge-success">Ready</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;
