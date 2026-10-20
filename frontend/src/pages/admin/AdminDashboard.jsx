import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Activity
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>
      <Icon size={24} />
    </div>
    <div className="stat-content">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
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
    No_Show: 'badge-gray' 
  };
  return (
    <span className={`badge ${map[cleanStatus] || 'badge-gray'}`}>
      <span className="badge-dot" />
      <span>{cleanStatus}</span>
    </span>
  );
};

const AdminDashboard = () => {
  const [stats, setStats]       = useState({});
  const [dept, setDept]         = useState([]);
  const [appts, setAppts]       = useState([]);
  const [revenue, setRevenue]   = useState([]);
  const [loading, setLoading]   = useState(true);

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

  return (
    <DashboardLayout title="Hospital Administration Dashboard" subtitle="Executive oversight of patient flow, medical staff, and hospital clinical revenues">
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={Users} label="Total Patients" value={stats.total_patients} color="blue" />
            <StatCard icon={UserCheck} label="Active Medical Staff" value={stats.total_active_staff} color="green" />
            <StatCard icon={CalendarCheck} label="Today's Appointments" value={stats.today_appointments} color="teal" />
            <StatCard icon={Clock} label="Pending Review" value={stats.pending_appointments} color="amber" />
            <StatCard icon={Building2} label="Inpatient Admissions" value={stats.current_admissions} color="purple" />
            <StatCard 
              icon={TrendingUp} 
              label="Month Revenue (Rs.)" 
              value={Number(stats.current_month_revenue || 0).toLocaleString()} 
              color="green" 
            />
            <StatCard icon={Pill} label="Low Stock Inventory" value={stats.low_stock_medicines} color="red" />
            <StatCard icon={FileWarning} label="Outstanding Invoices" value={stats.unpaid_bills} color="amber" />
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
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
