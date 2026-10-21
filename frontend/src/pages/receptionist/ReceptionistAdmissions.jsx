import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const ReceptionistAdmissions = () => {
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients]     = useState([]);
  const [doctors, setDoctors]       = useState([]);
  const [nurses, setNurses]         = useState([]);
  const [wards, setWards]           = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [form, setForm] = useState({ patient_id:'', ward_id:'', doctor_id:'', nurse_id:'', reason:'' });

  const load = () => {
    setLoading(true);
    API.get('/nurse/admissions').then(r=>setAdmissions(r.data.data||[])).finally(()=>setLoading(false));
  };
  useEffect(()=>{
    load();
    API.get('/receptionist/patients').then(r=>setPatients(r.data.data||[]));
    API.get('/appointments/public/doctors').then(r=>setDoctors(r.data.data||[]));
    API.get('/receptionist/nurses').then(r=>setNurses(r.data.data||[])).catch(()=>{});
    API.get('/receptionist/wards').then(r=>setWards(r.data.data||[]));
  },[]);

  const admit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: parseInt(form.patient_id, 10),
        ward_id: parseInt(form.ward_id, 10),
        doctor_id: parseInt(form.doctor_id, 10),
        nurse_id: form.nurse_id ? parseInt(form.nurse_id, 10) : null,
        reason: form.reason
      };
      await API.post('/receptionist/admissions', payload);
      toast.success(`Patient admitted! Bed assigned.`);
      setShowModal(false);
      setForm({ patient_id:'', ward_id:'', doctor_id:'', nurse_id:'', reason:'' });
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Admission failed'); }
  };

  return (
    <DashboardLayout title="Patient Admissions">
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20}}>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Admit Patient</button>
      </div>
      <div className="card">
        <div className="card-header"><h3>🏥 Active Admissions ({admissions.length})</h3></div>
        <div style={{padding:'0 24px 24px'}}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Patient</th><th>Ward</th><th>Bed</th><th>Doctor</th><th>Nurse</th><th>Admitted</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {admissions.map(a=>(
                  <tr key={a.admission_id}>
                    <td><strong>{a.patient_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{a.patient_code}</span></td>
                    <td>{a.ward_name}<br/><span className="badge badge-purple" style={{fontSize:10}}>{a.ward_type}</span></td>
                    <td><strong>{a.bed_number}</strong></td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>{a.nurse_name || <span style={{color:'var(--gray-400)'}}>Unassigned</span>}</td>
                    <td style={{fontSize:12}}>{new Date(a.admission_date).toLocaleDateString()}</td>
                    <td><span className="badge badge-info">{a.days_admitted} days</span></td>
                    <td><span className={`badge ${a.status==='Active'?'badge-success':'badge-gray'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading&&!admissions.length&&<div className="empty-state"><span className="empty-state-icon">🏥</span><h4>No active admissions</h4></div>}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-header"><h3>🏥 Admit Patient</h3><button className="modal-close" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <form onSubmit={admit}>
                <div className="form-group"><label className="form-label">Patient *</label>
                  <select className="form-control" value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))} required>
                    <option value="">-- Select Patient --</option>
                    {patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} ({p.patient_code})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Ward *</label>
                  <select className="form-control" value={form.ward_id} onChange={e=>setForm(f=>({...f,ward_id:e.target.value}))} required>
                    <option value="">-- Select Ward --</option>
                    {wards.map(w=><option key={w.ward_id} value={w.ward_id}>{w.ward_name} ({w.available_beds} beds available)</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Doctor *</label>
                  <select className="form-control" value={form.doctor_id} onChange={e=>setForm(f=>({...f,doctor_id:e.target.value}))} required>
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(d=><option key={d.staff_id} value={d.staff_id}>Dr. {d.doctor_name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Duty Nurse (Optional)</label>
                  <select className="form-control" value={form.nurse_id} onChange={e=>setForm(f=>({...f,nurse_id:e.target.value}))}>
                    <option value="">-- None / Assign Later --</option>
                    {nurses.map(n=><option key={n.staff_id} value={n.staff_id}>{n.nurse_name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Reason for Admission *</label>
                  <textarea className="form-control" rows={3} value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} required />
                </div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Admit & Assign Bed</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default ReceptionistAdmissions;
