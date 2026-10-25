import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardList, CheckCircle2, AlertTriangle, Pill, Clock, ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PharmacyDashboard = () => {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    API.get('/pharmacy/dashboard')
      .then(r => setData(r.data.data || {}))
      .catch(err => {
        console.error('Failed to load pharmacy dashboard:', err);
        toast.error('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const dispense = async (id) => {
    try {
      await API.post(`/pharmacy/prescriptions/${id}/dispense`);
      toast.success('Prescription dispensed successfully!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispense');
    }
  };

  return (
    <DashboardLayout 
      title="Dispensary & Pharmaceutical Operations" 
      subtitle="Prescription queue, inventory levels, and dispensing reconciliation"
    >
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          {/* STATS CARDS GRID */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon amber">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.pending_prescriptions ?? 0}</div>
                <div className="stat-label">Pending Dispense Orders</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <CheckCircle2 size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.dispensed_today ?? 0}</div>
                <div className="stat-label">Dispensed Today</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.low_stock_count ?? 0}</div>
                <div className="stat-label">Low Stock Inventory Alerts</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <Package size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{data.total_active_medicines ?? 0}</div>
                <div className="stat-label">Active Medicines Catalog</div>
              </div>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ gap: 20 }}>
            {/* Pending Prescriptions */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-header-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={18} className="text-primary" />
                  <h3 style={{ margin: 0 }}>Dispense Queue</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-warning">Action Required</span>
                  <Link to="/pharmacy/prescriptions" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {(data.recent_pending || []).map(p => (
                  <div key={p.prescription_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)', margin: '0 0 2px' }}>{p.patient_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>Dr. {p.doctor_name} · {p.total_items} items</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong style={{ color: 'var(--primary-700)', fontSize: 13 }}>Rs. {Number(p.total_cost).toLocaleString()}</strong>
                      <button className="btn btn-success btn-sm" onClick={() => dispense(p.prescription_id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        <span>Dispense</span>
                      </button>
                    </div>
                  </div>
                ))}
                {!(data.recent_pending || []).length && (
                  <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                    <CheckCircle2 size={32} className="empty-icon text-emerald" style={{ color: '#10b981', margin: '0 auto 8px' }} />
                    <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>Prescription queue is clear</h4>
                    <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>All physician orders have been fulfilled.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-header-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill size={18} className="text-danger" style={{ color: '#ef4444' }} />
                  <h3 style={{ margin: 0 }}>Low Inventory Watchlist</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-danger">Reorder Required</span>
                  <Link to="/pharmacy/inventory" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Manage Stock</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {(data.low_stock_medicines || []).map(m => (
                  <div key={m.medicine_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)', margin: '0 0 2px' }}>{m.medicine_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>{m.category || 'General'} · {m.dosage_form}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${m.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {m.stock_quantity} units remaining
                      </span>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>Threshold: {m.reorder_level}</p>
                    </div>
                  </div>
                ))}
                {!(data.low_stock_medicines || []).length && (
                  <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                    <Pill size={32} className="empty-icon text-emerald" style={{ color: '#10b981', margin: '0 auto 8px' }} />
                    <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>All stocks optimal</h4>
                    <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>No critical reorder thresholds reached.</p>
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

export default PharmacyDashboard;
