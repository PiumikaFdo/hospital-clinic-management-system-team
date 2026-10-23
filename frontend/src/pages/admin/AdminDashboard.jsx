import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  UserCheck,
  CalendarCheck,
  Clock,
  Building2,
  DollarSign,
  Pill,
  FileWarning,
  TrendingUp,
  BarChart2,
  Calendar,
  Activity,
  ChevronRight,
  Search,
  X
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const StatCard = ({ icon: Icon, label, value, color = 'blue', onClick, badgeText = 'View' }) => (
  <div
    className="stat-card clickable"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick && onClick();
      }
    }}
    title={`Click to view ${label}`}
  >
    <div className={`stat-icon ${color}`}>
      <Icon size={24} />
    </div>
    <div className="stat-content">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
    <div className="stat-card-badge">
      <span>{badgeText}</span>
      <ChevronRight size={13} />
    </div>
  </div>
);

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

  const map = { 
    Confirmed: 'badge-success', 
    Pending: 'badge-warning', 
    Completed: 'badge-primary', 
    Cancelled: 'badge-danger', 
    No_Show: 'badge-gray',
    Discharged: 'badge-gray',
    Active: 'badge-success',
    Paid: 'badge-success',
    Partial: 'badge-warning'
  };
  return (
    <span className={`badge ${map[cleanStatus] || 'badge-gray'}`}>
      <span className="badge-dot" />
      <span>{cleanStatus}</span>
    </span>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]       = useState({});
  const [dept, setDept]         = useState([]);
  const [appts, setAppts]       = useState([]);
  const [revenue, setRevenue]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Modal State for stat card drill-down
  const [activeModal, setActiveModal]   = useState(null); // { type, title, color, icon }
  const [modalDetails, setModalDetails] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch]   = useState('');

  const handleOpenStatDetails = async (type, title, color, icon) => {
    setActiveModal({ type, title, color, icon });
    setModalSearch('');
    setModalLoading(true);
    try {
      const res = await API.get(`/admin/dashboard/details?type=${type}`);
      setModalDetails(res.data.data || []);
    } catch (err) {
      console.error('Failed to load stat details:', err);
      setModalDetails([]);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      API.get('/admin/dashboard'),
      API.get('/admin/revenue'),
    ]).then(([d, r]) => {
      setStats(d.data.data?.stats || {});
      setDept(d.data.data?.deptStats || []);
      setAppts(d.data.data?.recentAppointments || []);
      setRevenue(r.data.data?.monthlyBreakdown || []);
    }).catch(err => {
      console.error('Failed to load admin stats:', err);
    }).finally(() => setLoading(false));
  }, []);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Filter records in modal based on search term
  const filteredDetails = modalDetails.filter((item) => {
    if (!modalSearch.trim()) return true;
    const term = modalSearch.toLowerCase();
    return Object.values(item).some(val => 
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout title="Hospital Administration Dashboard" subtitle="Executive oversight of patient flow, medical staff, and hospital clinical revenues">
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard 
              icon={Users} 
              label="Total Patients" 
              value={stats.total_patients} 
              color="blue" 
              onClick={() => handleOpenStatDetails('patients', 'Total Registered Patients', 'blue', Users)}
            />
            <StatCard 
              icon={UserCheck} 
              label="Active Medical Staff" 
              value={stats.total_active_staff} 
              color="green" 
              badgeText="Directory"
              onClick={() => navigate('/admin/staff')}
            />
            <StatCard 
              icon={CalendarCheck} 
              label="Today's Appointments" 
              value={stats.today_appointments} 
              color="teal" 
              badgeText="Appointments"
              onClick={() => navigate('/admin/appointments')}
            />
            <StatCard 
              icon={Clock} 
              label="Pending Review" 
              value={stats.pending_appointments} 
              color="amber" 
              onClick={() => handleOpenStatDetails('pending_appointments', 'Pending Review Appointments', 'amber', Clock)}
            />
            <StatCard 
              icon={Building2} 
              label="Inpatient Admissions" 
              value={stats.current_admissions} 
              color="purple" 
              onClick={() => handleOpenStatDetails('admissions', 'Current Inpatient Admissions', 'purple', Building2)}
            />
            <StatCard 
              icon={TrendingUp} 
              label="Month Revenue (Rs.)" 
              value={Number(stats.current_month_revenue || 0).toLocaleString()} 
              color="green" 
              onClick={() => handleOpenStatDetails('revenue', 'Current Month Revenue Invoices', 'green', TrendingUp)}
            />
            <StatCard 
              icon={Pill} 
              label="Low Stock Inventory" 
              value={stats.low_stock_medicines} 
              color="red" 
              onClick={() => handleOpenStatDetails('low_stock', 'Low Stock Inventory Alert', 'red', Pill)}
            />
            <StatCard 
              icon={FileWarning} 
              label="Outstanding Invoices" 
              value={stats.unpaid_bills} 
              color="amber" 
              onClick={() => handleOpenStatDetails('unpaid_bills', 'Outstanding Unpaid Invoices', 'amber', FileWarning)}
            />
          </div>

          <div className="dashboard-charts-grid">
            {/* Revenue Chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <BarChart2 size={18} className="text-primary" />
                  <h3>Fiscal Revenue Stream (Rs.)</h3>
                </div>
                <span className="badge badge-primary">Monthly Breakdown</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenue.map(r => ({ name: monthNames[r.month - 1] || `M${r.month}`, revenue: Number(r.revenue) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                    <Tooltip 
                      formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dept stats */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Activity size={18} className="text-teal" />
                  <h3>Department Clinical Workload</h3>
                </div>
                <Link to="/admin/schedules" className="btn btn-outline btn-sm">Schedules</Link>
              </div>
              <div className="card-body card-body-table">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Unique Patients</th>
                        <th>Completed</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.slice(0, 8).map(d => (
                        <tr key={d.dept_id}>
                          <td><strong>{d.dept_name}</strong></td>
                          <td>{d.unique_patients}</td>
                          <td><span className="badge badge-success">{d.completed}</span></td>
                          <td><span className="badge badge-warning">{d.pending}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-left">
                <Calendar size={18} className="text-primary" />
                <h3>Recent Outpatient Appointments</h3>
              </div>
              <Link to="/admin/appointments" className="btn btn-outline btn-sm">View All Logs</Link>
            </div>
            <div className="card-body card-body-table">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Patient Name</th>
                      <th>Consultant</th>
                      <th>Department</th>
                      <th>Scheduled Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appts.map(a => (
                      <tr key={a.appointment_id}>
                        <td><span className="code-tag">#{a.appointment_id}</span></td>
                        <td><strong>{a.patient_name}</strong></td>
                        <td>Dr. {a.doctor_name}</td>
                        <td>{a.dept_name}</td>
                        <td>{a.appointment_date}</td>
                        <td>{String(a.appointment_time).slice(0, 5)}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!appts.length && (
                  <div className="empty-state">
                    <Calendar size={36} className="empty-icon" />
                    <h4>No recent appointments logged</h4>
                    <p>New bookings will appear here in real-time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stat Card Details Popup Modal */}
          {activeModal && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
              <div className="modal" style={{ maxWidth: 960, width: '95%', maxHeight: '88vh' }}>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={`stat-icon ${activeModal.color}`} style={{ width: 40, height: 40, borderRadius: 10 }}>
                      <activeModal.icon size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{activeModal.title}</h3>
                      <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                        {modalLoading ? 'Loading records...' : `${filteredDetails.length} record${filteredDetails.length === 1 ? '' : 's'} displayed`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 220 }}>
                      <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search in records..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
                      />
                    </div>
                    <button className="modal-close" onClick={() => setActiveModal(null)} title="Close popup">✕</button>
                  </div>
                </div>

                <div className="modal-body" style={{ padding: 0 }}>
                  {modalLoading ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                      <span className="spinner-large" />
                      <p style={{ marginTop: 12, color: 'var(--slate-500)', fontSize: 13 }}>Fetching details from database...</p>
                    </div>
                  ) : filteredDetails.length === 0 ? (
                    <div className="empty-state">
                      <activeModal.icon size={42} className="empty-icon" />
                      <h4>No records found</h4>
                      <p>{modalSearch ? 'No matches found for your filter criteria.' : 'There are currently no records logged for this category.'}</p>
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          {activeModal.type === 'patients' && (
                            <tr>
                              <th>Patient Code</th>
                              <th>Full Name</th>
                              <th>Age / Gender</th>
                              <th>Blood Group</th>
                              <th>Phone</th>
                              <th>Emergency Contact</th>
                              <th>Registered Date</th>
                            </tr>
                          )}
                          {activeModal.type === 'staff' && (
                            <tr>
                              <th>Emp ID</th>
                              <th>Staff Name</th>
                              <th>Role</th>
                              <th>Department</th>
                              <th>Specialization</th>
                              <th>Experience</th>
                              <th>Phone / Email</th>
                              <th>Status</th>
                            </tr>
                          )}
                          {(activeModal.type === 'today_appointments' || activeModal.type === 'pending_appointments') && (
                            <tr>
                              <th>Ref #</th>
                              <th>Patient</th>
                              <th>Consultant</th>
                              <th>Department</th>
                              <th>Date & Time</th>
                              <th>Type / Reason</th>
                              <th>Status</th>
                            </tr>
                          )}
                          {activeModal.type === 'admissions' && (
                            <tr>
                              <th>Admission ID</th>
                              <th>Patient</th>
                              <th>Ward & Bed</th>
                              <th>Attending Doctor</th>
                              <th>Primary Nurse</th>
                              <th>Admitted Date</th>
                              <th>Status</th>
                            </tr>
                          )}
                          {activeModal.type === 'revenue' && (
                            <tr>
                              <th>Bill #</th>
                              <th>Patient</th>
                              <th>Bill Date</th>
                              <th>Breakdown</th>
                              <th>Total Amount</th>
                              <th>Paid Amount</th>
                              <th>Status</th>
                            </tr>
                          )}
                          {activeModal.type === 'low_stock' && (
                            <tr>
                              <th>Medicine</th>
                              <th>Generic / Brand</th>
                              <th>Category</th>
                              <th>Strength</th>
                              <th>In Stock</th>
                              <th>Reorder Level</th>
                              <th>Unit Price</th>
                              <th>Expiry Date</th>
                            </tr>
                          )}
                          {activeModal.type === 'unpaid_bills' && (
                            <tr>
                              <th>Bill #</th>
                              <th>Patient</th>
                              <th>Phone</th>
                              <th>Bill Date</th>
                              <th>Due Date</th>
                              <th>Total</th>
                              <th>Paid</th>
                              <th>Balance Due</th>
                              <th>Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {activeModal.type === 'patients' && filteredDetails.map(p => (
                            <tr key={p.patient_id}>
                              <td><span className="code-tag">{p.patient_code}</span></td>
                              <td><strong>{p.full_name}</strong></td>
                              <td>{p.age ? `${p.age} yrs` : '—'} / {p.gender || '—'}</td>
                              <td><span className="badge badge-primary">{p.blood_group || '—'}</span></td>
                              <td>{p.phone || '—'}</td>
                              <td>{p.emergency_contact_phone || '—'}</td>
                              <td>{p.registered_at ? String(p.registered_at).slice(0, 10) : '—'}</td>
                            </tr>
                          ))}

                          {activeModal.type === 'staff' && filteredDetails.map(s => (
                            <tr key={s.staff_id}>
                              <td><span className="code-tag">{s.employee_id}</span></td>
                              <td><strong>{s.full_name}</strong></td>
                              <td><span className="badge badge-primary">{s.role}</span></td>
                              <td>{s.dept_name || '—'}</td>
                              <td>{s.specialization || '—'}</td>
                              <td>{s.experience_years ? `${s.experience_years} yrs` : '—'}</td>
                              <td>
                                <div>{s.phone || '—'}</div>
                                <div className="cell-sub">{s.email}</div>
                              </td>
                              <td><span className="badge badge-success">{s.status}</span></td>
                            </tr>
                          ))}

                          {(activeModal.type === 'today_appointments' || activeModal.type === 'pending_appointments') && filteredDetails.map(a => (
                            <tr key={a.appointment_id}>
                              <td><span className="code-tag">#{a.appointment_id}</span></td>
                              <td>
                                <strong>{a.patient_name}</strong>
                                {a.patient_phone && <div className="cell-sub">{a.patient_phone}</div>}
                              </td>
                              <td>Dr. {a.doctor_name}</td>
                              <td>{a.dept_name}</td>
                              <td>
                                <div>{a.appointment_date}</div>
                                <div className="cell-sub">{a.appointment_time ? String(a.appointment_time).slice(0, 5) : '—'}</div>
                              </td>
                              <td>
                                <div>{a.appointment_type || 'General'}</div>
                                {a.reason && <div className="cell-sub">{a.reason}</div>}
                              </td>
                              <td><StatusBadge status={a.status} /></td>
                            </tr>
                          ))}

                          {activeModal.type === 'admissions' && filteredDetails.map(adm => (
                            <tr key={adm.admission_id}>
                              <td><span className="code-tag">#{adm.admission_id}</span></td>
                              <td>
                                <strong>{adm.patient_name}</strong>
                                <div className="cell-sub">{adm.patient_code}</div>
                              </td>
                              <td>
                                <div>{adm.ward_name} ({adm.ward_type})</div>
                                <div className="cell-sub">Bed #{adm.bed_number}</div>
                              </td>
                              <td>Dr. {adm.doctor_name}</td>
                              <td>{adm.primary_nurse_name || '—'}</td>
                              <td>{adm.admission_date ? String(adm.admission_date).slice(0, 10) : '—'}</td>
                              <td><span className="badge badge-success">{adm.status}</span></td>
                            </tr>
                          ))}

                          {activeModal.type === 'revenue' && filteredDetails.map(r => (
                            <tr key={r.bill_id}>
                              <td><span className="code-tag">#{r.bill_id}</span></td>
                              <td>
                                <strong>{r.patient_name}</strong>
                                <div className="cell-sub">{r.patient_code}</div>
                              </td>
                              <td>{r.bill_date ? String(r.bill_date).slice(0, 10) : '—'}</td>
                              <td style={{ fontSize: 12 }}>
                                Doctor: Rs. {Number(r.doctor_fees || 0).toLocaleString()} | Meds: Rs. {Number(r.medicine_cost || 0).toLocaleString()}
                              </td>
                              <td><strong>Rs. {Number(r.total_amount || 0).toLocaleString()}</strong></td>
                              <td>Rs. {Number(r.paid_amount || 0).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${r.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                                  {r.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {activeModal.type === 'low_stock' && filteredDetails.map(m => (
                            <tr key={m.medicine_id}>
                              <td><strong>{m.medicine_name}</strong></td>
                              <td>
                                <div>{m.generic_name || '—'}</div>
                                {m.brand && <div className="cell-sub">{m.brand}</div>}
                              </td>
                              <td>{m.category || 'General'}</td>
                              <td>{m.dosage_form || ''} {m.strength || ''}</td>
                              <td><span className="badge badge-danger">{m.stock_quantity} units</span></td>
                              <td>{m.reorder_level} units</td>
                              <td>Rs. {Number(m.unit_price || 0).toLocaleString()}</td>
                              <td>{m.expiry_date ? String(m.expiry_date).slice(0, 10) : '—'}</td>
                            </tr>
                          ))}

                          {activeModal.type === 'unpaid_bills' && filteredDetails.map(b => (
                            <tr key={b.bill_id}>
                              <td><span className="code-tag">#{b.bill_id}</span></td>
                              <td>
                                <strong>{b.patient_name}</strong>
                                <div className="cell-sub">{b.patient_code}</div>
                              </td>
                              <td>{b.phone || '—'}</td>
                              <td>{b.bill_date ? String(b.bill_date).slice(0, 10) : '—'}</td>
                              <td>{b.due_date ? String(b.due_date).slice(0, 10) : '—'}</td>
                              <td>Rs. {Number(b.total_amount || 0).toLocaleString()}</td>
                              <td>Rs. {Number(b.paid_amount || 0).toLocaleString()}</td>
                              <td><strong style={{ color: '#dc2626' }}>Rs. {Number(b.balance_amount || 0).toLocaleString()}</strong></td>
                              <td><span className="badge badge-warning">{b.payment_status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    {filteredDetails.length > 0 && `Total: ${filteredDetails.length} items listed`}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
