import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CalendarClock,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  RefreshCw,
  User,
  Pill,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  FileText,
  AlertCircle
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const DoctorFollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
  const [counts, setCounts] = useState({ all: 0, today: 0, upcoming: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'today' | 'upcoming' | 'overdue'
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadFollowUps = async (status = activeFilter, page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', status);
      params.append('page', page);
      params.append('limit', limit);
      if (search.trim()) params.append('search', search.trim());

      const res = await API.get(`/doctor/follow-ups?${params.toString()}`);
      if (res.data.success) {
        setFollowUps(res.data.data || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      toast.error('Could not load follow-up consultations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps(activeFilter, 1, pagination.limit);
  }, [activeFilter]);

  const handleFilterChange = (status) => {
    setActiveFilter(status);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadFollowUps(activeFilter, 1, pagination.limit);
  };

  const handleClearSearch = () => {
    setSearch('');
    setTimeout(() => {
      loadFollowUps(activeFilter, 1, pagination.limit);
    }, 0);
  };

  // Open consultation detail modal
  const openConsultationDetail = async (recordId) => {
    setLoadingDetail(true);
    try {
      const res = await API.get(`/doctor/consultations/${recordId}`);
      if (res.data.success) {
        setSelectedConsultation(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load consultation details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const StatusCategoryBadge = ({ category, daysDiff }) => {
    if (category === 'Today') {
      return (
        <span className="badge badge-info" style={{ fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} />
          <span>Due Today</span>
        </span>
      );
    }
    if (category === 'Upcoming') {
      const days = daysDiff ?? 0;
      return (
        <span className="badge badge-success" style={{ fontWeight: 600, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} />
          <span>In {days} {days === 1 ? 'day' : 'days'}</span>
        </span>
      );
    }
    if (category === 'Overdue') {
      const days = Math.abs(daysDiff ?? 0);
      return (
        <span className="badge badge-danger" style={{ fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={12} />
          <span>Overdue ({days}d)</span>
        </span>
      );
    }
    return <span className="badge badge-gray">{category}</span>;
  };

  return (
    <DashboardLayout
      title="Patient Follow-up Management"
      subtitle="Track, monitor, and review scheduled patient follow-ups and continuity of clinical care"
    >
      {/* KPI STAT CARDS */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div
          className={`stat-card ${activeFilter === 'all' ? 'active' : ''}`}
          style={{ cursor: 'pointer', border: activeFilter === 'all' ? '2px solid var(--primary)' : '1px solid var(--slate-200)' }}
          onClick={() => handleFilterChange('all')}
          title="Show All Follow-ups"
        >
          <div className="stat-icon blue">
            <CalendarClock size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{counts.all}</div>
            <div className="stat-label">Total Follow-ups</div>
          </div>
        </div>

        <div
          className={`stat-card ${activeFilter === 'today' ? 'active' : ''}`}
          style={{ cursor: 'pointer', border: activeFilter === 'today' ? '2px solid #0284c7' : '1px solid var(--slate-200)' }}
          onClick={() => handleFilterChange('today')}
          title="Show Follow-ups Due Today"
        >
          <div className="stat-icon blue">
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: '#0284c7' }}>{counts.today}</div>
            <div className="stat-label">Due Today</div>
          </div>
        </div>

        <div
          className={`stat-card ${activeFilter === 'upcoming' ? 'active' : ''}`}
          style={{ cursor: 'pointer', border: activeFilter === 'upcoming' ? '2px solid #16a34a' : '1px solid var(--slate-200)' }}
          onClick={() => handleFilterChange('upcoming')}
          title="Show Upcoming Follow-ups"
        >
          <div className="stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: '#16a34a' }}>{counts.upcoming}</div>
            <div className="stat-label">Upcoming Scheduled</div>
          </div>
        </div>

        <div
          className={`stat-card ${activeFilter === 'overdue' ? 'active' : ''}`}
          style={{ cursor: 'pointer', border: activeFilter === 'overdue' ? '2px solid #dc2626' : '1px solid var(--slate-200)' }}
          onClick={() => handleFilterChange('overdue')}
          title="Show Overdue Follow-ups"
        >
          <div className="stat-icon red">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: '#dc2626' }}>{counts.overdue}</div>
            <div className="stat-label">Overdue Follow-ups</div>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Status Tabs with Counts */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => handleFilterChange('all')}
            >
              All Follow-ups ({counts.all})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'today' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => handleFilterChange('today')}
            >
              Due Today ({counts.today})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'upcoming' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => handleFilterChange('upcoming')}
            >
              Upcoming ({counts.upcoming})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'overdue' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => handleFilterChange('overdue')}
              style={activeFilter === 'overdue' ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
            >
              Overdue ({counts.overdue})
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 280px', maxWidth: 420 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="Search patient, diagnosis, or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              <Filter size={14} />
              <span>Search</span>
            </button>
            {search && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearSearch}>
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => loadFollowUps(activeFilter, pagination.page, pagination.limit)}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* FOLLOW-UPS DIRECTORY TABLE */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <CalendarClock size={18} className="text-primary" />
            <h3>
              Follow-up Review Worklist ({pagination.total})
            </h3>
          </div>
          <span className="badge badge-info" style={{ fontSize: 12 }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>

        <div className="card-body card-body-table">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Details</th>
                  <th>Consultation Date</th>
                  <th>Clinical Diagnosis</th>
                  <th>Scheduled Follow-up</th>
                  <th>Status & Timeline</th>
                  <th>Chief Complaint / Symptoms</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map(item => (
                  <tr key={item.record_id}>
                    {/* Patient Name & Code */}
                    <td>
                      <div className="cell-patient">
                        <strong style={{ fontSize: 13.5 }}>{item.patient_name}</strong>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span className="badge badge-gray" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                            {item.patient_code}
                          </span>
                          <span className="cell-sub">{item.gender} · {item.age ? `${item.age} yrs` : '—'}</span>
                          {item.blood_group && (
                            <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 5px' }}>
                              {item.blood_group}
                            </span>
                          )}
                        </div>
                        {item.phone && (
                          <span className="cell-sub" style={{ marginTop: 2 }}>📞 {item.phone}</span>
                        )}
                      </div>
                    </td>

                    {/* Consultation Date */}
                    <td>
                      <div>
                        <strong>{new Date(item.created_at).toLocaleDateString()}</strong>
                        <div className="cell-sub">
                          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>

                    {/* Diagnosis */}
                    <td>
                      <span className="badge badge-primary" style={{ fontWeight: 600, fontSize: 12 }}>
                        {item.diagnosis}
                      </span>
                    </td>

                    {/* Follow-up Date */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} className="text-primary" />
                        <strong style={{ fontSize: 13, color: 'var(--slate-900)' }}>
                          {item.follow_up_date}
                        </strong>
                      </div>
                    </td>

                    {/* Status & Timeline Badge */}
                    <td>
                      <StatusCategoryBadge
                        category={item.follow_up_category}
                        daysDiff={item.days_diff}
                      />
                    </td>

                    {/* Chief Complaint / Symptoms preview */}
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.chief_complaint || item.symptoms}>
                      {item.chief_complaint || item.symptoms || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px' }}
                        onClick={() => openConsultationDetail(item.record_id)}
                        title="View consultation details"
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {!loading && !followUps.length && (
              <div className="empty-state">
                <CalendarClock size={40} className="empty-icon text-muted" />
                <h4 style={{ marginTop: 12, color: 'var(--slate-700)' }}>
                  {activeFilter === 'today' && 'No follow-ups scheduled for today.'}
                  {activeFilter === 'upcoming' && 'No upcoming follow-ups scheduled.'}
                  {activeFilter === 'overdue' && 'No overdue follow-ups! All patients are on schedule.'}
                  {activeFilter === 'all' && (search ? 'No follow-ups match your search query.' : 'No follow-up consultations recorded yet.')}
                </h4>
                <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: '4px 0 16px' }}>
                  {activeFilter !== 'all' ? 'Switch to All Follow-ups to view other records.' : 'When recording consultations, specify a follow-up date to track patients here.'}
                </p>
                {activeFilter !== 'all' && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleFilterChange('all')}>
                    View All Follow-ups
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PAGINATION */}
          {pagination.total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderTop: '1px solid var(--slate-100)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                Showing <strong>{((pagination.page - 1) * pagination.limit) + 1}</strong> to{' '}
                <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong>{pagination.total}</strong> follow-ups
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="form-control"
                  style={{ width: 110, padding: '4px 8px', fontSize: 12.5 }}
                  value={pagination.limit}
                  onChange={e => loadFollowUps(activeFilter, 1, parseInt(e.target.value, 10))}
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadFollowUps(activeFilter, pagination.page - 1, pagination.limit)}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <span style={{ fontSize: 13, padding: '0 4px', color: 'var(--slate-600)' }}>
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadFollowUps(activeFilter, pagination.page + 1, pagination.limit)}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          CONSULTATION DETAIL-VIEW MODAL
          ============================================================ */}
      {selectedConsultation && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedConsultation(null)}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '88vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Stethoscope size={20} className="text-primary" />
                <div>
                  <h3>Consultation Record #{selectedConsultation.record_id}</h3>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                    Consultation Recorded: {new Date(selectedConsultation.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedConsultation(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Patient Banner */}
              <div
                style={{
                  background: 'var(--primary-50)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: 18,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Patient Name</span>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-900)' }}>{selectedConsultation.patient_name}</div>
                  <span className="badge badge-gray" style={{ fontSize: 10, marginTop: 3 }}>{selectedConsultation.patient_code}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Age / Gender</span>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-800)' }}>
                    {selectedConsultation.age ? `${selectedConsultation.age} yrs` : '—'} · {selectedConsultation.gender || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Group</span>
                  <div>
                    <span className="badge badge-danger" style={{ fontWeight: 700, marginTop: 2 }}>
                      {selectedConsultation.blood_group || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-800)' }}>{selectedConsultation.phone || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Allergies</span>
                  <div>
                    <strong style={{ fontSize: 12, color: selectedConsultation.allergies ? 'var(--danger)' : 'var(--slate-600)' }}>
                      {selectedConsultation.allergies || 'None Reported'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Follow-up Timeline Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(14,165,233,0.08))',
                  border: '1px solid rgba(37,99,235,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', display: 'block' }}>
                    Scheduled Follow-up Date
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-800)', marginTop: 2 }}>
                    📅 {selectedConsultation.follow_up_date || 'No follow-up scheduled'}
                  </div>
                </div>
                {selectedConsultation.follow_up_date && (
                  <span className="badge badge-info" style={{ fontSize: 12, padding: '4px 10px' }}>
                    Follow-up Record Active
                  </span>
                )}
              </div>

              {/* Clinical Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Chief Complaint */}
                <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                    Chief Complaint / Presenting Reason
                  </span>
                  <div style={{ fontSize: 13.5, color: 'var(--slate-900)', fontWeight: 500 }}>
                    {selectedConsultation.chief_complaint || 'No presenting complaint recorded'}
                  </div>
                </div>

                {/* 2. Diagnosis */}
                <div style={{ background: 'rgba(37,99,235,0.06)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(37,99,235,0.2)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', display: 'block', marginBottom: 4 }}>
                    Clinical Diagnosis
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-800)' }}>
                    {selectedConsultation.diagnosis}
                  </div>
                </div>

                {/* 3. Symptoms & 4. Treatment Plan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      Presenting Symptoms
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                      {selectedConsultation.symptoms || 'None recorded'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      Treatment Plan & Directives
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                      {selectedConsultation.treatment_plan || 'None recorded'}
                    </div>
                  </div>
                </div>

                {/* 5. Notes */}
                <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                    Doctor Clinical Notes & Observations
                  </span>
                  <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                    {selectedConsultation.notes || 'None recorded'}
                  </div>
                </div>

                {/* Linked Prescriptions */}
                {selectedConsultation.prescriptions && selectedConsultation.prescriptions.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-800)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Pill size={15} className="text-primary" />
                      <span>Linked Prescriptions ({selectedConsultation.prescriptions.length})</span>
                    </h4>

                    {selectedConsultation.prescriptions.map(p => (
                      <div
                        key={p.prescription_id}
                        style={{
                          border: '1px solid var(--slate-200)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          marginBottom: 8,
                          background: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Rx #{p.prescription_id}</span>
                          <span className={`badge ${p.status === 'Dispensed' ? 'badge-success' : 'badge-warning'}`}>
                            {p.status}
                          </span>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="table-container" style={{ margin: 0 }}>
                            <table className="table" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th>Medicine</th>
                                  <th>Dosage</th>
                                  <th>Frequency</th>
                                  <th>Duration</th>
                                  <th>Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.items.map(it => (
                                  <tr key={it.item_id}>
                                    <td><strong>{it.medicine_name}</strong></td>
                                    <td>{it.dosage}</td>
                                    <td>{it.frequency}</td>
                                    <td>{it.duration}</td>
                                    <td><strong>{it.quantity}</strong></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedConsultation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorFollowUps;
