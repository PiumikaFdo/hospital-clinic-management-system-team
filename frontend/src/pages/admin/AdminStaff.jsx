import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const ROLES = ['doctor','pharmacist','receptionist','nurse'];
const ROLE_SALARIES = {
  doctor: 150000,
  nurse: 75000,
  receptionist: 65000,
  pharmacist: 100000
};

const AdminStaff = () => {
  const [staff, setStaff]   = useState([]);
  const [depts, setDepts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter]   = useState({ role: '', dept_id: '', status: '', search: '' });
  const defaultForm = {
    username:'', email:'', password:'Admin@123', role:'doctor', first_name:'', last_name:'',
    phone:'', gender:'Male', date_of_birth:'', dept_id:'', qualification:'', specialization:'',
    experience_years: '', joining_date: new Date().toISOString().split('T')[0], salary: ROLE_SALARIES.doctor
  };

  const [form, setForm] = useState(defaultForm);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.role) params.append('role', filter.role);
    if (filter.dept_id) params.append('dept_id', filter.dept_id);
    if (filter.status) params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);
    API.get(`/admin/staff?${params}`).then(r => setStaff(r.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    API.get('/admin/departments').then(r => setDepts(r.data.data || []));
  }, []);

  useEffect(() => { load(); }, [filter]);

  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v,
    ...(k === 'role' ? { salary: ROLE_SALARIES[v] } : {})
  }));

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/staff', form);
      toast.success('Staff member registered successfully!');
      setForm(defaultForm);
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleToggleStatus = async (staffId, currentStatus, currentActive) => {
    try {
      const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const nextActive = !currentActive;
      await API.put(`/admin/staff/${staffId}/status`, { status: nextStatus, is_active: nextActive });
      toast.success(`Staff status toggled to ${nextStatus}`);
      load();
    } catch (err) {
      toast.error('Failed to update staff status');
    }
  };

  const ROLE_BADGE = { doctor:'badge-primary', pharmacist:'badge-success', receptionist:'badge-info', nurse:'badge-purple', admin:'badge-gray' };

  return (
    <DashboardLayout title="Staff Management">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input
            className="form-control"
            style={{ width: 220 }}
            placeholder="🔍 Search staff..."
            value={filter.search}
            onChange={e => setFilter(f=>({...f, search: e.target.value}))}
          />
          <select className="form-control" style={{ width:150 }} value={filter.role} onChange={e => setFilter(f=>({...f,role:e.target.value}))}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
          <select className="form-control" style={{ width:180 }} value={filter.dept_id} onChange={e => setFilter(f=>({...f,dept_id:e.target.value}))}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
          </select>
          <select className="form-control" style={{ width:150 }} value={filter.status} onChange={e => setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On_Leave">On Leave</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Register Staff</button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>👥 Staff Members ({staff.length})</h3>
        </div>
        <div style={{ padding:'0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Specialization</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.staff_id}>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{s.employee_id}</td>
                    <td><strong>{s.first_name} {s.last_name}</strong><br/><span style={{ fontSize:11, color:'var(--gray-400)' }}>{s.email}</span></td>
                    <td><span className={`badge ${ROLE_BADGE[s.role]||'badge-gray'}`}>{s.role}</span></td>
                    <td>{s.dept_name || '—'}</td>
                    <td>
                      {s.specialization || '—'}
                      {s.experience_years > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.experience_years} yrs exp</div>
                      )}
                    </td>
                    <td>{s.phone}</td>
                    <td>
                      <span className={`badge ${s.status==='Active'?'badge-success':s.status==='On_Leave'?'badge-warning':'badge-danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn ${s.status==='Active'?'btn-outline':'btn-success'} btn-sm`}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => handleToggleStatus(s.staff_id, s.status, s.is_active)}
                        title="Toggle Active/Inactive"
                      >
                        {s.status==='Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !staff.length && <div className="empty-state"><span className="empty-state-icon">👥</span><h4>No staff found matching filters</h4></div>}
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Register New Staff Member</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRegister}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">First Name *</label><input className="form-control" value={form.first_name} onChange={e=>set('first_name',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Last Name *</label><input className="form-control" value={form.last_name} onChange={e=>set('last_name',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Username *</label><input className="form-control" value={form.username} onChange={e=>set('username',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Password</label><input className="form-control" type="password" value={form.password} onChange={e=>set('password',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role} onChange={e=>set('role',e.target.value)}>
                      {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-control" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-control" type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)} /></div>
                  <div className="form-group">
                    <label className="form-label">Department (Optional)</label>
                    <select className="form-control" value={form.dept_id} onChange={e=>set('dept_id',e.target.value)}>
                      <option value="">No department</option>
                      {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Qualification</label><input className="form-control" value={form.qualification} onChange={e=>set('qualification',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Specialization</label><input className="form-control" value={form.specialization} onChange={e=>set('specialization',e.target.value)} /></div>
                  <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={form.experience_years}
                      onChange={e=>set('experience_years',e.target.value)}
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Joining Date</label><input className="form-control" type="date" value={form.joining_date} onChange={e=>set('joining_date',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Monthly Salary (Rs.)</label><input className="form-control" type="number" value={form.salary} readOnly /></div>
                </div>
                <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Register Staff</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminStaff;
