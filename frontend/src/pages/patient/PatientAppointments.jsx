import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchAppointments = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (dateFilter) params.append('date', dateFilter);

    API.get(`/patient/appointments?${params.toString()}`)
      .then(res => setAppointments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch =
      (a.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.dept_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const scheduledCount = appointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;

  return (
    <DashboardLayout title="My Appointments">
      {/* HEADER / ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search doctor or department..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 220 }}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title="Filter by Date"
            />
            {dateFilter && (
              <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>Clear</button>
            )}
          </div>
        </div>

        <Link to="/book-appointment" className="btn btn-primary">
          + Book New Appointment
        </Link>
      </div>

      {/* QUICK SUMMARY CARDS */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">🗓️</div>
          <div>
            <div className="stat-label">Total Appointments</div>
            <div className="stat-value">{appointments.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">⏳</div>
          <div>
            <div className="stat-label">Upcoming / Active</div>
            <div className="stat-value">{scheduledCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-emerald">✓</div>
          <div>
            <div className="stat-label">Completed Consultations</div>
            <div className="stat-value">{completedCount}</div>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS LIST */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            Consultation Appointments History ({filteredAppointments.length})
          </h3>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {loading ? (
            <p style={{ color: 'var(--gray-400)', padding: 20 }}>Loading appointment records...</p>
          ) : filteredAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <h4 style={{ color: 'var(--gray-700)', marginBottom: 8 }}>No appointments found</h4>
              <p style={{ color: 'var(--gray-400)', marginBottom: 20 }}>
                {searchTerm || statusFilter !== 'All'
                  ? 'No records match the current filter criteria.'
                  : 'You have not booked any consultations yet.'}
              </p>
              <Link to="/book-appointment" className="btn btn-primary">
                Book Consultation Now
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Reason / Notes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(a => (
                    <tr key={a.appointment_id}>
                      <td>
                        <strong>Dr. {a.doctor_name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-purple">{a.dept_name}</span>
                      </td>
                      <td>
                        <strong>{new Date(a.appointment_date).toLocaleDateString()}</strong>
                      </td>
                      <td>
                        <span className="badge badge-gray">{a.appointment_time}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">{a.appointment_type || 'Regular'}</span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)', maxWidth: 260 }}>
                        {a.reason || 'Routine Checkup'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            a.status === 'Completed'
                              ? 'badge-success'
                              : a.status === 'Confirmed'
                              ? 'badge-info'
                              : a.status === 'Cancelled'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
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
    </DashboardLayout>
  );
};

export default PatientAppointments;
