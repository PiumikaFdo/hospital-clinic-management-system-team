import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileWarning, CreditCard, Building2, UserPlus, Receipt, Calendar } from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const ReceptionistDashboard = () => {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/receptionist/dashboard')
      .then(r => setData(r.data.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout 
      title="Front Desk & Reception Station" 
      subtitle="Patient check-in, OPD registration, admission intake, and invoicing"
    >
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon blue">
                <UserPlus size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.today_registrations ?? 0}</div>
                <div className="stat-label">Today's Registrations</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon amber">
                <FileWarning size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.pending_bills ?? 0}</div>
                <div className="stat-label">Pending Invoices</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <CreditCard size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">Rs. {Number(data.today_total_payments || 0).toLocaleString()}</div>
                <div className="stat-label">Payments Processed</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <Building2 size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.active_admissions ?? 0}</div>
                <div className="stat-label">Active Inpatients</div>
              </div>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Users size={18} className="text-primary" />
                  <h3>Recent Patient Registrations</h3>
                </div>
                <Link to="/receptionist/patients" className="btn btn-outline btn-sm">Patient Directory</Link>
              </div>
              <div className="card-body">
                {(data.recent_patients || []).map(p => (
                  <div key={p.patient_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)' }}>{p.first_name} {p.last_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>{p.patient_code} · {p.phone}</p>
                    </div>
                    <span className="badge badge-danger">{p.blood_group || '—'}</span>
                  </div>
                ))}
                {!(data.recent_patients || []).length && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <Users size={32} className="empty-icon" />
                    <h4>No new registrations today</h4>
                    <p>New patients will appear here immediately upon intake.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Receipt size={18} className="text-amber" />
                  <h3>Pending Invoice Balances</h3>
                </div>
                <Link to="/receptionist/billing" className="btn btn-outline btn-sm">Billing Desk</Link>
              </div>
              <div className="card-body">
                {(data.pending_bills_list || []).map(b => (
                  <div key={b.bill_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)' }}>{b.patient_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Invoice #{b.bill_id} · {new Date(b.bill_date).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13.5 }}>Rs. {Number(b.balance_amount).toLocaleString()}</p>
                      <span className="badge badge-warning">{b.payment_status}</span>
                    </div>
                  </div>
                ))}
                {!(data.pending_bills_list || []).length && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <CreditCard size={32} className="empty-icon" />
                    <h4>All invoices settled</h4>
                    <p>No outstanding balances recorded.</p>
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

export default ReceptionistDashboard;
