import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const DoctorPatients = () => {
  const [appts, setAppts]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory]   = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [record, setRecord] = useState({ diagnosis:'', symptoms:'', treatment_plan:'', follow_up_date:'', notes:'', medicines:[] });

  useEffect(() => {
    API.get('/doctor/appointments').then(r => {
      const unique = Object.values((r.data.data||[]).reduce((acc,a)=>{
        if(a.patient_id && !acc[a.patient_id]) acc[a.patient_id] = a;
        return acc;
      },{}));
      setAppts(unique);
    }).finally(()=>setLoading(false));
    API.get('/pharmacy/medicines').then(r=>setMedicines(r.data.data||[]));
  }, []);

  const viewHistory = async (patientId) => {
    try {
      const r = await API.get(`/doctor/patients/${patientId}/history`);
      setHistory(r.data.data);
      setShowModal(true);
    } catch { toast.error('Could not load patient history'); }
  };

  const addMedLine = () => setRecord(r=>({...r, medicines:[...r.medicines,{medicine_id:'',dosage:'',frequency:'',duration:'',quantity:1}]}));
  const setMed = (i,k,v) => setRecord(r=>({...r,medicines:r.medicines.map((m,idx)=>idx===i?{...m,[k]:v}:m)}));
  const removeMed = (i) => setRecord(r=>({...r,medicines:r.medicines.filter((_,idx)=>idx!==i)}));

  const submitRecord = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await API.post('/doctor/records', {
        patient_id: selected.patient_id,
        appointment_id: selected.appointment_id,
        ...record,
        medicine_ids: record.medicines.map(m=>m.medicine_id),
        quantities:   record.medicines.map(m=>m.quantity),
        dosages:      record.medicines.map(m=>m.dosage),
        frequencies:  record.medicines.map(m=>m.frequency),
        durations:    record.medicines.map(m=>m.duration),
      });
      toast.success('Medical record & prescription saved!');
      setShowRecordModal(false);
      setRecord({diagnosis:'',symptoms:'',treatment_plan:'',follow_up_date:'',notes:'',medicines:[]});
    } catch(err) { toast.error(err.response?.data?.message||'Failed to save'); }
  };

  return (
    <DashboardLayout title="My Patients">
      <div className="card">
        <div className="card-header"><h3>👤 Patients ({appts.length})</h3></div>
        <div style={{padding:'0 24px 24px'}}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Patient</th><th>Phone</th><th>Age</th><th>Blood</th><th>Last Visit</th><th>Actions</th></tr></thead>
              <tbody>
                {appts.map(a=>(
                  <tr key={a.patient_id}>
                    <td><strong>{a.patient_name}</strong></td>
                    <td>{a.phone}</td>
                    <td>{a.age||'—'}</td>
                    <td><span className="badge badge-danger">{a.blood_group||'—'}</span></td>
                    <td>{a.appointment_date}</td>
                    <td style={{display:'flex',gap:8}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>viewHistory(a.patient_id)}>📋 History</button>
                      <button className="btn btn-primary btn-sm" onClick={()=>{setSelected(a);setShowRecordModal(true);}}>+ Record</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading&&!appts.length&&<div className="empty-state"><span className="empty-state-icon">👤</span><h4>No patients yet</h4></div>}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showModal && history && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:760}}>
            <div className="modal-header">
              <h3>📋 Patient Medical History — {history.patient?.first_name} {history.patient?.last_name}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {history.patient && (
                <div style={{background:'var(--primary-50)',borderRadius:'var(--radius-md)',padding:16,marginBottom:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><strong>Age:</strong> {history.patient.age}</div>
                  <div><strong>Blood:</strong> {history.patient.blood_group}</div>
                  <div><strong>Allergies:</strong> {history.patient.allergies||'None'}</div>
                  <div><strong>Phone:</strong> {history.patient.phone}</div>
                </div>
              )}
              <h4 style={{marginBottom:12,color:'var(--gray-700)'}}>Medical Records ({history.records?.length||0})</h4>
              {(history.records||[]).map(r=>(
                <div key={r.record_id} style={{border:'1px solid var(--gray-200)',borderRadius:'var(--radius-md)',padding:16,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <strong>{r.diagnosis}</strong>
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{fontSize:13,color:'var(--gray-600)'}}>Symptoms: {r.symptoms}</p>
                  <p style={{fontSize:13,color:'var(--gray-600)'}}>Treatment: {r.treatment_plan}</p>
                  {r.doctor_name&&<p style={{fontSize:12,color:'var(--gray-400)'}}>By: Dr. {r.doctor_name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showRecordModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRecordModal(false)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <h3>➕ Add Medical Record — {selected?.patient_name}</h3>
              <button className="modal-close" onClick={()=>setShowRecordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submitRecord}>
                <div className="form-group"><label className="form-label">Diagnosis *</label><input className="form-control" value={record.diagnosis} onChange={e=>setRecord(r=>({...r,diagnosis:e.target.value}))} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Symptoms</label><textarea className="form-control" rows={2} value={record.symptoms} onChange={e=>setRecord(r=>({...r,symptoms:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Treatment Plan</label><textarea className="form-control" rows={2} value={record.treatment_plan} onChange={e=>setRecord(r=>({...r,treatment_plan:e.target.value}))} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Follow-up Date</label><input type="date" className="form-control" value={record.follow_up_date} onChange={e=>setRecord(r=>({...r,follow_up_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Notes</label><input className="form-control" value={record.notes} onChange={e=>setRecord(r=>({...r,notes:e.target.value}))} /></div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <label className="form-label" style={{margin:0}}>💊 Prescription Items</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addMedLine}>+ Add Medicine</button>
                </div>
                {record.medicines.map((m,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:8,marginBottom:8,alignItems:'end'}}>
                    <div>
                      <select className="form-control" value={m.medicine_id} onChange={e=>setMed(i,'medicine_id',e.target.value)}>
                        <option value="">Select Medicine</option>
                        {medicines.map(med=><option key={med.medicine_id} value={med.medicine_id}>{med.medicine_name}</option>)}
                      </select>
                    </div>
                    <input className="form-control" placeholder="Dosage" value={m.dosage} onChange={e=>setMed(i,'dosage',e.target.value)} />
                    <input className="form-control" placeholder="Frequency" value={m.frequency} onChange={e=>setMed(i,'frequency',e.target.value)} />
                    <input className="form-control" placeholder="Duration" value={m.duration} onChange={e=>setMed(i,'duration',e.target.value)} />
                    <input className="form-control" type="number" placeholder="Qty" min={1} value={m.quantity} onChange={e=>setMed(i,'quantity',e.target.value)} />
                    <button type="button" style={{background:'var(--danger)',color:'#fff',border:'none',borderRadius:6,width:32,height:38,cursor:'pointer'}} onClick={()=>removeMed(i)}>✕</button>
                  </div>
                ))}
                <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:16}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowRecordModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">💾 Save Record & Prescription</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default DoctorPatients;
