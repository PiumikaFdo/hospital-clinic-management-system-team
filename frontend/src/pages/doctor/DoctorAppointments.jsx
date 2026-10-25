import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const DoctorAppointments = () => {
  const [appts, setAppts] = useState([]);
  const [date, setDate]   = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (search) params.append('search', search);

    API.get(`/doctor/appointments?${params.toString()}`)
      .then(r => setAppts(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    if (!['Confirmed', 'Completed'].includes(newStatus)) {
      toast.error('Doctors can only change appointment status to Confirmed or Completed');
      return;
    }

    setUpdatingId(appointmentId);
    try {
      const res = await API.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Appointment status updated to ${newStatus}`);
        setAppts(prev => prev.map(a => (a.appointment_id === appointmentId ? { ...a, status: newStatus } : a)));
      }
    } catch (err) {
      console.error('Status update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update appointment status');
    } finally {
      setUpdatingId(null);
    }
  };

  const StatusDropdown = ({ appointment }) => {
    let cleanStatus = appointment.status;
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

    const isUpdating = updatingId === appointment.appointment_id;

    const colorMap = {
      Confirmed: { bg: 'var(--success-bg)', color: '#047857', border: 'var(--success-border)' },
      Completed: { bg: 'var(--primary-50)', color: 'var(--primary-700)', border: 'var(--primary-200)' },
      Pending:   { bg: 'var(--warning-bg)', color: '#b45309', border: 'var(--warning-border)' },
      Cancelled: { bg: 'var(--danger-bg)',  color: '#b91c1c', border: 'var(--danger-border)' },
      No_Show:   { bg: 'var(--slate-100)',  color: 'var(--slate-600)', border: 'var(--slate-200)' }
    };

    const style = colorMap[cleanStatus] || colorMap.No_Show;

    // Cancelled and No_Show appointments cannot be changed
    if (cleanStatus === 'Cancelled' || cleanStatus === 'No_Show') {
      return (
        <span className={`badge ${cleanStatus === 'Cancelled' ? 'badge-danger' : 'badge-gray'}`} title="Status cannot be changed">
          {cleanStatus}
        </span>
      );
    }

    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={cleanStatus}
          disabled={isUpdating}
          onChange={(e) => handleStatusChange(appointment.appointment_id, e.target.value)}
          style={{
            background: style.bg,
            color: style.color,
            border: `1.5px solid ${style.border}`,
            borderRadius: 'var(--radius-full)',
            padding: '4px 24px 4px 10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isUpdating ? 'wait' : 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          title="Click to change status: Select Confirmed or Completed"
        >
          {cleanStatus === 'Pending' && (
            <option value="Pending" disabled style={{ background: '#fff', color: '#b45309' }}>
              Pending
            </option>
          )}
          <option value="Confirmed" style={{ background: '#fff', color: '#047857', fontWeight: 600 }}>
            ✓ Confirmed
          </option>
          <option value="Completed" style={{ background: '#fff', color: 'var(--primary-700)', fontWeight: 600 }}>
            ✓ Completed
          </option>
        </select>
        <span
          style={{
            position: 'absolute',
            right: 8,
            pointerEvents: 'none',
            fontSize: 9,
            color: style.color,
            fontWeight: 'bold'
          }}
        >
          ▼
        </span>
      </div>
    );
  };

  return (
    <DashboardLayout title="My Consultations & Appointments">
      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['ALL', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All Statuses' : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 160 }}
              value={date}
              onChange={e => setDate(e.target.value)}
              title="Filter by Appointment Date"
            />
            {date && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDate('')}>
                Clear Date
              </button>
            )}
            <input
              type="text"
              className="form-control"
              style={{ width: 200 }}
              placeholder="Search patient / phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <h3>📅 Consultations List ({appts.length})</h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
            💡 Doctor can update appointment status to <strong>Confirmed</strong> or <strong>Completed</strong> using the dropdown.
          </span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Phone</th><th>Age</th><th>Blood</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {appts.map(a => (
                  <tr key={a.appointment_id}>
                    <td>{a.appointment_date}</td>
                    <td><strong>{String(a.appointment_time).slice(0,5)}</strong></td>
                    <td><strong>{a.patient_name}</strong></td>
                    <td>{a.phone}</td>
                    <td>{a.age || '—'}</td>
                    <td><span className="badge badge-danger">{a.blood_group || '—'}</span></td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '—'}</td>
                    <td><StatusDropdown appointment={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !appts.length && (
              <div className="empty-state">
                <span className="empty-state-icon">📅</span>
                <h4>No appointments found for selected filter</h4>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorAppointments;

