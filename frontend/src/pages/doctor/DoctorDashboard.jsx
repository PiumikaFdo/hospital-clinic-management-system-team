import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CalendarCheck, Activity, FileText, CheckCircle2, Clock, User, Calendar, Stethoscope } from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import ConsultationsManager from './ConsultationsManager';

const DoctorDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(initialTab || tabParam || 'queue');
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);

  // Sync tab with URL if needed
  useEffect(() => {
    if (tabParam && (tabParam === 'queue' || tabParam === 'consultations')) {
      setActiveTab(tabParam);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [tabParam, initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'queue' ? {} : { tab });
  };

  const fetchDashboardData = () => {
    API.get('/doctor/dashboard')
      .then(r => setData(r.data.data || {}))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/appointments/${id}/status`, { status });
      toast.success('Consultation marked completed');
      fetchDashboardData();
    } catch {
      toast.error('Update failed');
    }
  };

  const StatusBadge = ({ status }) => {
    let cleanStatus = status;
    if (typeof cleanStatus === 'string') {
      const trimmed = cleanStatus.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj.status) cleanStatus = obj.status;
        } catch (e) {}
      }
    } else if (typeof cleanStatus === 'object' && cleanStatus !== null) {
      cleanStatus = cleanStatus.status || JSON.stringify(cleanStatus);
    }

    const m = { 
      Confirmed: 'badge-success', 
      Pending: 'badge-warning', 
      Completed: 'badge-primary', 
      Cancelled: 'badge-danger' 
    };
    return (
      <span className={`badge ${m[cleanStatus] || 'badge-gray'}`}>
        <span className="badge-dot" />
        <span>{cleanStatus}</span>
      </span>
    );
  };

  return (
    <DashboardLayout 
      title="Physician Clinical Hub" 
      subtitle={`Welcome, Dr. ${user?.name || ''} — Daily Consultations, Clinical Queue and Patient Care`}
    >
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          {/* STAT GRID */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => handleTabChange('queue')}
              title="View Today's Scheduled Consultations Queue"
            >
              <div className="stat-icon blue">
                <CalendarCheck size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.today_appointments ?? 0}</div>
                <div className="stat-label">Today's Scheduled Consultations</div>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => handleTabChange('consultations')}
              title="View All Completed Consultations & Diagnoses"
            >
              <div className="stat-icon green">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.total_appointments ?? 0}</div>
                <div className="stat-label">Total Completed Cases</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <FileText size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.prescriptions_written ?? 0}</div>
                <div className="stat-label">e-Prescriptions Dispensed</div>
              </div>
            </div>
          </div>

          {/* DASHBOARD TAB NAVIGATION BAR */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--slate-200)', paddingBottom: 14 }}>
            <button
              type="button"
              className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabChange('queue')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 600 }}
            >
              <Clock size={16} />
              <span>Today's Patient Queue</span>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: activeTab === 'queue' ? 'rgba(255,255,255,0.25)' : 'var(--slate-200)',
                  color: activeTab === 'queue' ? '#ffffff' : 'var(--slate-700)'
                }}
              >
                {data.today_list?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'consultations' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabChange('consultations')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 600 }}
            >
              <Stethoscope size={16} />
              <span>Consultations</span>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: activeTab === 'consultations' ? 'rgba(255,255,255,0.25)' : 'var(--slate-200)',
                  color: activeTab === 'consultations' ? '#ffffff' : 'var(--slate-700)'
                }}
              >
                {data.total_appointments ?? 0}
              </span>
            </button>
          </div>

          {/* TAB 1: TODAY'S CLINICAL QUEUE */}
          {activeTab === 'queue' && (
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Calendar size={18} className="text-primary" />
                  <h3>Today's Clinical Roster & Patient Queue</h3>
                </div>
                <span className="badge badge-info">{new Date().toDateString()}</span>
              </div>
              <div className="card-body card-body-table">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time Slot</th>
                        <th>Patient Name</th>
                        <th>Blood Group</th>
                        <th>Age</th>
                        <th>Clinical Symptoms</th>
                        <th>Care Type</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.today_list || []).map(a => (
                        <tr key={a.appointment_id}>
                          <td><strong>{String(a.appointment_time).slice(0, 5)}</strong></td>
                          <td>
                            <div className="cell-patient">
                              <strong>{a.patient_name}</strong>
                              <span className="cell-sub">{a.phone}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-danger">{a.blood_group || '—'}</span></td>
                          <td>{a.age ? `${a.age} yrs` : '—'}</td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.reason || 'Routine Examination'}
                          </td>
                          <td><span className="badge badge-info">{a.appointment_type}</span></td>
                          <td><StatusBadge status={a.status} /></td>
                          <td>
                            {a.status === 'Confirmed' ? (
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => updateStatus(a.appointment_id, 'Completed')}
                              >
                                <CheckCircle2 size={14} />
                                <span>Mark Done</span>
                              </button>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 12 }}>Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(data.today_list || []).length && (
                    <div className="empty-state">
                      <User size={36} className="empty-icon" />
                      <h4>No appointments queued for today</h4>
                      <p>Scheduled appointments will appear as patients book.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSULTATIONS & DIAGNOSES CRUD MANAGER */}
          {activeTab === 'consultations' && (
            <ConsultationsManager onStatsRefresh={fetchDashboardData} />
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
