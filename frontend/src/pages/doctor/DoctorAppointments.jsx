import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const DoctorAppointments = () => {
  const [appts, setAppts] = useState([]);
  const [date, setDate]   = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const StatusBadge = ({ s }) => {
    let cleanStatus = s;
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
    const m = { Confirmed:'badge-success', Pending:'badge-warning', Completed:'badge-primary', Cancelled:'badge-danger', No_Show:'badge-gray' };
    return <span className={`badge ${m[cleanStatus] || 'badge-gray'}`}>{cleanStatus}</span>;
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
          <h3>📅 Consultations List ({appts.length})</h3>
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
                    <td><StatusBadge s={a.status} /></td>
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
