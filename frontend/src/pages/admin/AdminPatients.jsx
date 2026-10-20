import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get('/admin/patients').then(r=>setPatients(r.data.data||[])).finally(()=>setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.patient_code} ${p.phone||''} ${p.email||''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="All Patients">
      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <input className="form-control" style={{maxWidth:320}} placeholder="🔍 Search by name, code or phone..."
          value={search} onChange={e=>setSearch(e.target.value)} />
        <span className="badge badge-primary" style={{fontSize:13,padding:'8px 14px'}}>{filtered.length} patients</span>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Code</th><th>Name</th><th>Age</th><th>Gender</th><th>Blood</th><th>Phone</th><th>Email</th><th>Registered</th></tr></thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.patient_id}>
                    <td style={{fontFamily:'monospace',fontWeight:700,color:'var(--primary-600)'}}>{p.patient_code}</td>
                    <td><strong>{p.first_name} {p.last_name}</strong></td>
                    <td>{p.age}</td>
                    <td>{p.gender}</td>
                    <td><span className="badge badge-danger">{p.blood_group||'—'}</span></td>
                    <td>{p.phone}</td>
                    <td style={{fontSize:12}}>{p.email}</td>
                    <td style={{fontSize:12}}>{new Date(p.registered_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading&&!filtered.length&&<div className="empty-state"><span className="empty-state-icon">👤</span><h4>No patients found</h4></div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default AdminPatients;
