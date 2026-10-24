import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardList, CheckCircle2, AlertTriangle, Pill, Clock, ArrowRight } from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PharmacyDashboard = () => {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    API.get('/pharmacy/dashboard')
      .then(r => setData(r.data.data || {}))
      .catch(console.error)
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
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
          </div>

          <div className="dashboard-charts-grid" style={{ gap: 20 }}>
            {/* Pending Prescriptions */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <ClipboardList size={18} className="text-primary" />
                  <h3>Dispense Queue</h3>
                </div>
                <span className="badge badge-warning">Action Required</span>
              </div>
              <div className="card-body">
                {(data.recent_pending || []).map(p => (
                  <div key={p.prescription_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)' }}>{p.patient_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Dr. {p.doctor_name} · {p.total_items} items</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong style={{ color: 'var(--primary-700)', fontSize: 13 }}>Rs. {Number(p.total_cost).toLocaleString()}</strong>
                      <button className="btn btn-success btn-sm" onClick={() => dispense(p.prescription_id)}>
                        <CheckCircle2 size={13} />
                        <span>Dispense</span>
                      </button>
                    </div>
                  </div>
                ))}
                {!(data.recent_pending || []).length && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <CheckCircle2 size={32} className="empty-icon text-emerald" />
                    <h4>Prescription queue is clear</h4>
                    <p>All physician orders have been fulfilled.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Pill size={18} className="text-danger" />
                  <h3>Low Inventory Watchlist</h3>
                </div>
                <span className="badge badge-danger">Reorder Required</span>
              </div>
              <div className="card-body">
                {(data.low_stock_medicines || []).map(m => (
                  <div key={m.medicine_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--slate-800)' }}>{m.medicine_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>{m.category} · {m.dosage_form}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${m.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {m.stock_quantity} units remaining
                      </span>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>Threshold: {m.reorder_level}</p>
                    </div>
                  </div>
                ))}
                {!(data.low_stock_medicines || []).length && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <Pill size={32} className="empty-icon text-emerald" />
                    <h4>All stocks optimal</h4>
                    <p>No critical reorder thresholds reached.</p>
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
