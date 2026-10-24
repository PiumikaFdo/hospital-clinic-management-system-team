import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Users,
  UserCheck,
  CalendarCheck,
  Building2,
  TrendingUp,
  BarChart2,
  Calendar,
  Activity,
  ChevronRight,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Stethoscope,
  Layers,
  CalendarDays,
  Pill,
  Clock,
  FileWarning
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const StatCard = ({ icon: Icon, label, value, color = 'blue', onClick, badgeText = 'View', subtitle }) => (
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
      {subtitle && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{subtitle}</div>}
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
    Completed: 'badge-primary', 
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

  // Appointment analytics state
  const [appointmentAnalytics, setAppointmentAnalytics] = useState({
    weekdayStats: [],
    doctorSummary: [],
    overallSummary: {}
  });
  const [dashboardApptTab, setDashboardApptTab] = useState('weekdays'); // inline dashboard card tab
  const [dashDoctorSearch, setDashDoctorSearch] = useState('');

  // Modal State for other stat card drill-down (Patients, Staff, Admissions, Revenue, Low Stock)
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
    Promise.allSettled([
      API.get('/admin/dashboard'),
      API.get('/admin/revenue'),
      API.get('/admin/appointment-analytics')
    ]).then(([dashboardResult, revenueResult, analyticsResult]) => {
      if (dashboardResult.status === 'fulfilled') {
        const data = dashboardResult.value.data.data;
        setStats(data?.stats || {});
        setDept(data?.deptStats || []);
        setAppts(data?.recentAppointments || []);
      } else {
        console.error('Failed to load admin stats:', dashboardResult.reason);
      }

      if (revenueResult.status === 'fulfilled') {
        setRevenue(revenueResult.value.data.data?.monthlyBreakdown || []);
      } else {
        console.error('Failed to load admin revenue:', revenueResult.reason);
      }

      if (analyticsResult.status === 'fulfilled') {
        setAppointmentAnalytics(analyticsResult.value.data?.data || { weekdayStats: [], doctorSummary: [], overallSummary: {} });
      } else {
        console.error('Failed to load admin appointment analytics:', analyticsResult.reason);
      }
    }).finally(() => setLoading(false));
  }, []);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Filter records in generic modal based on search term
  const filteredDetails = modalDetails.filter((item) => {
    if (!modalSearch.trim()) return true;
    const term = modalSearch.toLowerCase();
    return Object.values(item).some(val => 
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  // Doctor list filtering in dashboard card
  const filteredDashDoctors = (appointmentAnalytics.doctorSummary || []).filter(doc => {
    if (!dashDoctorSearch.trim()) return true;
    const term = dashDoctorSearch.toLowerCase();
    return (
      (doc.doctor_name && doc.doctor_name.toLowerCase().includes(term)) ||
      (doc.dept_name && doc.dept_name.toLowerCase().includes(term)) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(term))
    );
  });

  // Chart data for weekdays
  const weekdayChartData = (appointmentAnalytics.weekdayStats || []).map(day => ({
    name: day.short_name,
    fullName: day.day_name,
    total: Number(day.total_appointments || 0),
    confirmed: Number(day.confirmed || 0),
    completed: Number(day.completed || 0),
    online: Number(day.online_count || 0),
    walkin: Number(day.walkin_count || 0),
  }));

  const overall = appointmentAnalytics.overallSummary || {};

  return (
    <DashboardLayout title="Hospital Administration Dashboard" subtitle="Executive oversight of patient flow, medical staff, and hospital clinical revenues">
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          {/* STAT GRID */}
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
          </div>

          {/* DEDICATED APPOINTMENT PERFORMANCE & WEEKDAYS FLOW CARD */}
          <div className="card" style={{ marginBottom: 24, border: '1px solid #ccfbf1', boxShadow: '0 4px 18px rgba(13, 148, 136, 0.06)' }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #e6fffa' }}>
              <div className="card-header-left">
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                  <CalendarCheck size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Today's Appointments & Clinical Workload Flow
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                    Detailed weekday distribution, individual doctor workload summaries, and institutional totals
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Switcher Tabs */}
                <div style={{ display: 'flex', background: 'var(--slate-100)', padding: 3, borderRadius: 8, gap: 2 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${dashboardApptTab === 'weekdays' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '5px 12px', height: 'auto', border: 'none' }}
                    onClick={() => setDashboardApptTab('weekdays')}
                  >
                    🗓️ Weekdays Flow
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${dashboardApptTab === 'doctors' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '5px 12px', height: 'auto', border: 'none' }}
                    onClick={() => setDashboardApptTab('doctors')}
                  >
                    👨‍⚕️ By Doctor Separately
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${dashboardApptTab === 'overall' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '5px 12px', height: 'auto', border: 'none' }}
                    onClick={() => setDashboardApptTab('overall')}
                  >
                    📊 All In Together
                  </button>
                </div>

              </div>
            </div>

            <div className="card-body">
              {/* TAB 1: WEEKDAY FLOW */}
              {dashboardApptTab === 'weekdays' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
                    {(appointmentAnalytics.weekdayStats || []).map((day) => {
                      const isToday = day.day_name === currentDayName;
                      const totalCount = Number(day.total_appointments || 0);
                      return (
                        <div
                          key={day.day_index}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: isToday ? '#f0fdfa' : '#f8fafc',
                            border: isToday ? '2px solid #0d9488' : '1px solid #e2e8f0',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#0d9488' : 'var(--slate-700)' }}>
                              {day.short_name}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, background: '#0d9488', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>
                                Today
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: totalCount > 0 ? 'var(--slate-800)' : 'var(--slate-400)' }}>
                            {totalCount}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                            <span style={{ color: '#16a34a' }}>{day.confirmed || 0} confirmed</span> · <span style={{ color: '#2563eb' }}>{day.completed || 0} completed</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>
                                    {d.fullName}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#334155' }}>
                                    Total Bookings: <strong>{d.total}</strong>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 3 }}>✓ Confirmed: {d.confirmed}</div>
                                  <div style={{ fontSize: 11.5, color: '#2563eb' }}>✓ Completed: {d.completed}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="confirmed" name="Confirmed" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="completed" name="Completed" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 2: DOCTOR SUMMARY */}
              {dashboardApptTab === 'doctors' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ position: 'relative', width: 260 }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search doctor or department..."
                        value={dashDoctorSearch}
                        onChange={(e) => setDashDoctorSearch(e.target.value)}
                        style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                      {filteredDashDoctors.length} Doctors Registered
                    </span>
                  </div>

                  <div className="table-container" style={{ maxHeight: 280, overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Doctor</th>
                          <th>Department / Specialization</th>
                          <th style={{ textAlign: 'center' }}>Today</th>
                          <th style={{ textAlign: 'center' }}>Total</th>
                          <th style={{ textAlign: 'center' }}>Confirmed</th>
                          <th style={{ textAlign: 'center' }}>Completed</th>
                          <th>Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDashDoctors.map((doc) => (
                          <tr key={doc.doctor_id}>
                            <td>
                              <strong>Dr. {doc.doctor_name}</strong>
                              <div className="cell-sub">{doc.doctor_email}</div>
                            </td>
                            <td>
                              <div><strong>{doc.dept_name || 'General'}</strong></div>
                              <div className="cell-sub">{doc.specialization || 'Consultant'}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {Number(doc.today_appointments || 0) > 0 ? (
                                <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                                  {doc.today_appointments}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--slate-400)' }}>0</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <strong>{doc.total_appointments || 0}</strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>{doc.confirmed_appointments || 0}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>{doc.completed_appointments || 0}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, Number(doc.completion_rate || 0))}%`,
                                      height: '100%',
                                      background: '#0d9488',
                                      borderRadius: 3
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0d9488', minWidth: 36 }}>
                                  {doc.completion_rate || '0.0'}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: OVERALL SUMMARY */}
              {dashboardApptTab === 'overall' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>Total Appointments (All-Time)</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-800)' }}>
                        {overall.total_appointments || 0}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
                        Across all hospital departments
                      </div>
                    </div>

                    <div style={{ padding: 14, background: '#f0fdfa', borderRadius: 10, border: '1px solid #ccfbf1' }}>
                      <div style={{ fontSize: 12, color: '#0d9488', marginBottom: 4 }}>Scheduled Today</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f766e' }}>
                        {overall.today_appointments || 0}
                      </div>
                      <div style={{ fontSize: 11, color: '#14b8a6', marginTop: 4 }}>
                        Active outpatient flow today
                      </div>
                    </div>

                    <div style={{ padding: 14, background: '#ecfdf5', borderRadius: 10, border: '1px solid #d1fae5' }}>
                      <div style={{ fontSize: 12, color: '#059669', marginBottom: 4 }}>Confirmed Appointments</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#047857' }}>
                        {overall.confirmed_appointments || 0}
                      </div>
                      <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                        Verified by clinic front desk
                      </div>
                    </div>

                    <div style={{ padding: 14, background: '#eff6ff', borderRadius: 10, border: '1px solid #dbeafe' }}>
                      <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 4 }}>Completed Appointments</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>
                        {overall.completed_appointments || 0}
                      </div>
                      <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4 }}>
                        Prescriptions & records saved
                      </div>
                    </div>

                    <div style={{ padding: 14, background: '#faf5ff', borderRadius: 10, border: '1px solid #f3e8ff' }}>
                      <div style={{ fontSize: 12, color: '#7e22ce', marginBottom: 4 }}>Scheduled Doctors</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#6b21a8' }}>
                        {overall.total_doctors_scheduled || 0}
                      </div>
                      <div style={{ fontSize: 11, color: '#a855f7', marginTop: 4 }}>
                        Active physicians with bookings
                      </div>
                    </div>

                    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>Overall Completion Rate</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                        {overall.overall_completion_rate || '0.0'}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                        Institutional throughput ratio
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                        <th>Confirmed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.slice(0, 8).map(d => (
                        <tr key={d.dept_id}>
                          <td><strong>{d.dept_name}</strong></td>
                          <td>{d.unique_patients}</td>
                          <td><span className="badge badge-success">{d.completed}</span></td>
                          <td><span className="badge badge-info">{d.confirmed}</span></td>
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
                        <td>{a.appointment_date ? String(a.appointment_date).slice(0, 10) : '—'}</td>
                        <td>{a.appointment_time ? String(a.appointment_time).slice(0, 5) : '—'}</td>
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

          {/* ============================================================
              OTHER STAT CARD DRILL-DOWN MODAL (Patients, Staff, Admissions, etc.)
             ============================================================ */}
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
