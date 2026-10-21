import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const AdminSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [depts, setDepts]         = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => { API.get('/admin/departments').then(r=>setDepts(r.data.data||[])); }, []);
  useEffect(() => {
    setLoading(true);
    API.get(`/admin/schedules?dept_id=${deptFilter}`).then(r=>setSchedules(r.data.data||[])).finally(()=>setLoading(false));
  }, [deptFilter]);

  const grouped = schedules.reduce((acc, s) => {
    const key = s.doctor_id;
    if (!acc[key]) acc[key] = { doctor_name: s.doctor_name, dept_name: s.dept_name, specialization: s.specialization, total: s.total_appointments, days: [] };
    if (s.day_of_week) acc[key].days.push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Doctor Schedules">
      <div style={{marginBottom:20}}>
        <select className="form-control" style={{width:220}} value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
        {Object.values(grouped).map(doc=>(
          <div className="card" key={doc.doctor_name}>
            <div className="card-header">
              <div>
                <h3>Dr. {doc.doctor_name}</h3>
                <p style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>{doc.dept_name} · {doc.specialization}</p>
              </div>
              <span className="badge badge-primary">{doc.total} appts</span>
            </div>
            <div className="card-body" style={{padding:'12px 20px 20px'}}>
              {doc.days.length===0
                ? <p style={{color:'var(--gray-400)',fontSize:13}}>No schedule set</p>
                : doc.days.map(d=>(
                  <div key={d.day_of_week} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <span style={{fontWeight:600,fontSize:13,color:'var(--gray-700)',width:100}}>{d.day_of_week}</span>
                    <span style={{fontSize:12,color:'var(--gray-500)'}}>{String(d.start_time).slice(0,5)} – {String(d.end_time).slice(0,5)}</span>
                    <span className={`badge ${d.is_available?'badge-success':'badge-danger'}`}>{d.max_appointments} slots</span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
        {!loading&&!Object.keys(grouped).length&&<div className="empty-state"><span className="empty-state-icon">🗓️</span><h4>No schedules found</h4></div>}
      </div>
    </DashboardLayout>
  );
};
export default AdminSchedules;
