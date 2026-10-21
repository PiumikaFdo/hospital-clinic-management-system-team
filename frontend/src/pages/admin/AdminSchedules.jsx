import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const AdminSchedules = () => {
  const [schedules, setSchedules]   = useState([]);
  const [depts, setDepts]           = useState([]);
  const [doctors, setDoctors]       = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const defaultScheduleForm = {
    doctor_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    max_appointments: 20,
    is_available: true
  };
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm);

  const loadSchedules = () => {
    setLoading(true);
    API.get(`/admin/schedules?dept_id=${deptFilter}`)
      .then(r => setSchedules(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    API.get('/admin/departments').then(r => setDepts(r.data.data || []));
    API.get('/admin/staff?role=doctor').then(r => setDoctors(r.data.data || []));
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [deptFilter]);

  const handleOpenScheduleModal = (doctor = null) => {
    setScheduleForm({
      doctor_id: doctor ? String(doctor.doctor_id) : (doctors[0] ? String(doctors[0].staff_id) : ''),
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '17:00',
      max_appointments: 20,
      is_available: true
    });
    setShowScheduleModal(true);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.doctor_id) {
      return toast.error('Please select a doctor');
    }
    if (scheduleForm.start_time >= scheduleForm.end_time) {
      return toast.error('End time must be after start time');
    }
    try {
      await API.post('/admin/schedules', scheduleForm);
      toast.success('Doctor schedule added successfully!');
      setShowScheduleModal(false);
      setScheduleForm(defaultScheduleForm);
      loadSchedules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add schedule');
    }
  };

  const grouped = schedules.reduce((acc, s) => {
    const key = s.doctor_id;
    if (!acc[key]) acc[key] = { doctor_id: s.doctor_id, doctor_name: s.doctor_name, dept_name: s.dept_name, specialization: s.specialization, total: s.total_appointments, days: [] };
    if (s.day_of_week) acc[key].days.push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Doctor Schedules">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <select className="form-control" style={{ width: 220 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => handleOpenScheduleModal()}>+ Add Schedule</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
        {Object.values(grouped).map(doc => (
          <div className="card" key={doc.doctor_id || doc.doctor_name}>
            <div className="card-header">
              <div>
                <h3>Dr. {doc.doctor_name}</h3>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{doc.dept_name} · {doc.specialization}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-primary">{doc.total} appts</span>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => handleOpenScheduleModal(doc)}
                  title="Add schedule slot"
                >
                  + Add
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: '12px 20px 20px' }}>
              {doc.days.length === 0
                ? <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No schedule set</p>
                : doc.days.map(d => (
                  <div key={d.day_of_week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)', width: 100 }}>{d.day_of_week}</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{String(d.start_time).slice(0, 5)} – {String(d.end_time).slice(0, 5)}</span>
                    <span className={`badge ${d.is_available ? 'badge-success' : 'badge-danger'}`}>{d.max_appointments} slots</span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
        {!loading && !Object.keys(grouped).length && <div className="empty-state"><span className="empty-state-icon">🗓️</span><h4>No schedules found</h4></div>}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowScheduleModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>🗓️ Add Doctor Schedule</h3>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddSchedule}>
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Doctor *</label>
                    <select
                      className="form-control"
                      value={scheduleForm.doctor_id}
                      onChange={e => setScheduleForm(f => ({ ...f, doctor_id: e.target.value }))}
                      required
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d.staff_id} value={d.staff_id}>
                          Dr. {d.first_name} {d.last_name} — {d.specialization || d.dept_name || 'Doctor'} ({d.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Day of Week *</label>
                    <select
                      className="form-control"
                      value={scheduleForm.day_of_week}
                      onChange={e => setScheduleForm(f => ({ ...f, day_of_week: e.target.value }))}
                      required
                    >
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Appointments (Slots) *</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      max="100"
                      value={scheduleForm.max_appointments}
                      onChange={e => setScheduleForm(f => ({ ...f, max_appointments: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      className="form-control"
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={e => setScheduleForm(f => ({ ...f, start_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      className="form-control"
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={e => setScheduleForm(f => ({ ...f, end_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Availability Status</label>
                    <select
                      className="form-control"
                      value={scheduleForm.is_available}
                      onChange={e => setScheduleForm(f => ({ ...f, is_available: e.target.value === 'true' }))}
                    >
                      <option value="true">Available for booking</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default AdminSchedules;
