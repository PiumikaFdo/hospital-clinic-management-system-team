import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const ReceptionistPatients = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors]   = useState([]);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [form, setForm] = useState({
    first_name:'',last_name:'',email:'',phone:'',gender:'Male',date_of_birth:'',
    blood_group:'O+',address:'',doctor_id:'',appt_date:'',appt_time:'',reason:''
  });

  const [dateFilter, setDateFilter] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (dateFilter) params.append('date', dateFilter);

    API.get(`/receptionist/patients?${params.toString()}`)
      .then(r => setPatients(r.data.data||[]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [dateFilter]);
  useEffect(() => { API.get('/appointments/public/doctors').then(r=>setDoctors(r.data.data||[])); }, []);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const r = await API.post('/receptionist/patients', form);
      toast.success(`Patient registered! ID: ${r.data.data?.patient_id}`);
      setShowModal(false);
      setForm({first_name:'',last_name:'',email:'',phone:'',gender:'Male',date_of_birth:'',blood_group:'O+',address:'',doctor_id:'',appt_date:'',appt_time:'',reason:''});
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Registration failed'); }
  };

  const filtered = patients.filter(p => `${p.first_name} ${p.last_name} ${p.patient_code} ${p.phone||''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="Patient Registration & Intake">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input
            className="form-control"
            style={{ width:260 }}
            placeholder="🔍 Search patients..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&load()}
          />
          <input
            type="date"
            className="form-control"
            style={{ width:160 }}
            value={dateFilter}
            onChange={e=>setDateFilter(e.target.value)}
            title="Filter by Registration Date"
          />
          {dateFilter && (
            <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>Clear Date</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={load}>Filter</button>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Register Patient</button>
      </div>
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Age</th><th>Gender</th><th>Blood</th><th>Phone</th><th>Emergency Contact</th><th>Registered</th></tr></thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.patient_id}>
                  <td style={{fontFamily:'monospace',fontWeight:700,color:'var(--primary-600)'}}>{p.patient_code}</td>
                  <td><strong>{p.first_name} {p.last_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{p.email}</span></td>
                  <td>{p.age}</td>
                  <td>{p.gender}</td>
                  <td><span className="badge badge-danger">{p.blood_group||'—'}</span></td>
                  <td>{p.phone}</td>
                  <td>{p.emergency_contact_name||'—'} {p.emergency_contact?`(${p.emergency_contact})`:''}</td>
                  <td style={{fontSize:12}}>{new Date(p.registered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading&&!filtered.length&&<div className="empty-state"><span className="empty-state-icon">👤</span><h4>No patients found</h4></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header"><h3>👤 Register New Patient</h3><button className="modal-close" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <form onSubmit={handleRegister}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">First Name *</label><input className="form-control" value={form.first_name} onChange={e=>set('first_name',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Last Name *</label><input className="form-control" value={form.last_name} onChange={e=>set('last_name',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Phone *</label><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Gender</label><select className="form-control" value={form.gender} onChange={e=>set('gender',e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div>
                  <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-control" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Blood Group</label><select className="form-control" value={form.blood_group} onChange={e=>set('blood_group',e.target.value)}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={e=>set('address',e.target.value)} /></div>
                </div>
                <div style={{borderTop:'1px solid var(--gray-200)',paddingTop:16,marginTop:8}}>
                  <h4 style={{fontSize:14,fontWeight:700,marginBottom:12,color:'var(--gray-700)'}}>📅 Book Appointment (Optional)</h4>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Doctor</label>
                      <select className="form-control" value={form.doctor_id} onChange={e=>set('doctor_id',e.target.value)}>
                        <option value="">-- Select Doctor --</option>
                        {doctors.map(d=><option key={d.staff_id} value={d.staff_id}>Dr. {d.doctor_name} ({d.dept_name})</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-control" value={form.appt_date} onChange={e=>set('appt_date',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Time</label><input type="time" className="form-control" value={form.appt_time} onChange={e=>set('appt_time',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Reason</label><input className="form-control" value={form.reason} onChange={e=>set('reason',e.target.value)} /></div>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:8}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Register Patient</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default ReceptionistPatients;
