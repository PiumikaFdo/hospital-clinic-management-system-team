import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

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
  const map = { Confirmed:'badge-success', Pending:'badge-warning', Completed:'badge-primary', Cancelled:'badge-danger', No_Show:'badge-gray' };
  return <span className={`badge ${map[cleanStatus]||'badge-gray'}`}>{cleanStatus}</span>;
};

const AdminAppointments = () => {
  const [appts, setAppts]   = useState([]);
  const [depts, setDepts]   = useState([]);
  const [staff, setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ doctor_id:'', status:'ALL', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    API.get('/admin/departments').then(r => setDepts(r.data.data||[]));
    API.get('/admin/staff?role=doctor').then(r => setStaff(r.data.data||[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams(filter);
    API.get(`/admin/appointments?${p}`).then(r => setAppts(r.data.data||[])).finally(() => setLoading(false));
  }, [filter]);

  const f = (k,v) => setFilter(x=>({...x,[k]:v}));

  return (
    <DashboardLayout title="Appointments Overview">
      <div className="card" style={{ marginBottom:24 }}>
        <div className="card-body" style={{ display:'flex', flexWrap:'wrap', gap:12, padding:16 }}>
          <div><label className="form-label">Start Date</label><input type="date" className="form-control" value={filter.start_date} onChange={e=>f('start_date',e.target.value)} /></div>
          <div><label className="form-label">End Date</label><input type="date" className="form-control" value={filter.end_date} onChange={e=>f('end_date',e.target.value)} /></div>
          <div><label className="form-label">Doctor</label>
            <select className="form-control" style={{width:200}} value={filter.doctor_id} onChange={e=>f('doctor_id',e.target.value)}>
              <option value="">All Doctors</option>
              {staff.map(s=><option key={s.staff_id} value={s.staff_id}>Dr. {s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Status</label>
            <select className="form-control" value={filter.status} onChange={e=>f('status',e.target.value)}>
              {['ALL','Confirmed','Completed','Cancelled','No_Show'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>📅 Appointments ({appts.length})</h3></div>
        <div style={{padding:'0 24px 24px'}}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Dept.</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {appts.map(a=>(
                  <tr key={a.appointment_id}>
                    <td>{a.appointment_id}</td>
                    <td>{a.patient_name}</td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>{a.dept_name}</td>
                    <td>{a.appointment_date}</td>
                    <td>{String(a.appointment_time).slice(0,5)}</td>
                    <td><span className="badge badge-info">{a.appointment_type}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading&&!appts.length&&<div className="empty-state"><span className="empty-state-icon">📅</span><h4>No appointments for selected filters</h4></div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default AdminAppointments;
