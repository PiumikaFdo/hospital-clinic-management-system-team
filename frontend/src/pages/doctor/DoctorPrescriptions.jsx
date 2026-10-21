import React, { useEffect, useState, useMemo } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Pill, 
  Calendar, 
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';

const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  const loadPrescriptions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (date) params.append('date', date);
    if (search) params.append('search', search);

    API.get(`/doctor/prescriptions?${params.toString()}`)
      .then(r => {
        const grouped = (r.data.data || []).reduce((acc, p) => {
          if (!acc[p.prescription_id]) {
            acc[p.prescription_id] = {
              ...p,
              items: []
            };
          }
          acc[p.prescription_id].items.push(p);
          return acc;
        }, {});
        setPrescriptions(Object.values(grouped));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrescriptions();
  }, [statusFilter, date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPrescriptions();
  };

  const StatusBadge = ({ s }) => {
    const m = {
      Pending: 'badge-warning',
      Dispensed: 'badge-success',
      Cancelled: 'badge-danger'
    };
    return <span className={`badge ${m[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <DashboardLayout 
      title="Physician e-Prescriptions History"
      subtitle="Track digital prescription fulfillment, dispensing timestamps, and pharmacist reconciliation"
    >
      {/* FILTER CONTROLS */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['ALL', 'Pending', 'Dispensed', 'Cancelled'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All Prescriptions' : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 160 }}
              value={date}
              onChange={e => setDate(e.target.value)}
              title="Filter by Prescription Date"
            />
            {date && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDate('')}>
                Clear
              </button>
            )}
            <input
              type="text"
              className="form-control"
              style={{ width: 220 }}
              placeholder="Search patient, code, drug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>

      {/* PRESCRIPTIONS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {loading && (
          <div className="loading-page" style={{ gridColumn: '1 / -1' }}>
            <span className="spinner-large" />
          </div>
        )}

        {!loading && prescriptions.map(p => (
          <div className="card" key={p.prescription_id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ padding: '16px 20px', background: 'var(--slate-50)' }}>
              <div>
                <h3 style={{ fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Rx #{p.prescription_id}</span>
                  <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>·</span>
                  <span>{p.patient_name}</span>
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    Code: <strong>{p.patient_code || 'N/A'}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>·</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    {p.prescription_date ? p.prescription_date.split('T')[0] : '—'}
                  </span>
                </div>
              </div>
              <StatusBadge s={p.status} />
            </div>

            <div className="card-body" style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Doctor's Prescription Notes if available */}
              {p.notes && (
                <div style={{ padding: '8px 12px', background: 'var(--primary-50)', borderLeft: '3px solid var(--primary-500)', borderRadius: 4, marginBottom: 12, fontSize: 12, color: 'var(--primary-800)' }}>
                  <strong>Physician Note:</strong> {p.notes}
                </div>
              )}

              {/* Items List */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Prescribed Medications ({p.items.length})
                </p>
                {p.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid var(--slate-100)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-800)', margin: 0 }}>
                        {item.medicine_name} {item.strength ? `(${item.strength})` : ''}
                      </p>
                      <p style={{ fontSize: 11.5, color: 'var(--slate-500)', margin: '2px 0 0' }}>
                        {item.dosage} · {item.frequency} · {item.duration}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary-600)', margin: 0 }}>
                        ×{item.quantity}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '1px 0 0' }}>
                        Rs. {Number(item.total_price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--slate-200)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>Estimated Total</span>
                <strong style={{ fontSize: 14, color: 'var(--primary-700)' }}>
                  Rs. {Number(p.total_cost).toLocaleString()}
                </strong>
              </div>

              {/* REAL-TIME STATUS SYNC & FEEDBACK PANEL */}
              {p.status === 'Dispensed' ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065f46', fontWeight: 700, marginBottom: 4 }}>
                    <CheckCircle2 size={15} />
                    <span>Fulfilled & Dispensed by Pharmacy</span>
                  </div>
                  <div style={{ color: '#047857', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {p.dispensed_at && (
                      <div><strong>Dispensed at:</strong> {new Date(p.dispensed_at).toLocaleString()}</div>
                    )}
                    <div><strong>Pharmacist:</strong> {p.dispensed_by_name || 'Staff Pharmacist (Dispensary)'}</div>
                    {p.pharmacist_notes && (
                      <div style={{ marginTop: 4, background: 'rgba(255,255,255,0.7)', padding: '5px 8px', borderRadius: 4, fontStyle: 'italic' }}>
                        <strong>Pharmacist Note:</strong> "{p.pharmacist_notes}"
                      </div>
                    )}
                  </div>
                </div>
              ) : p.status === 'Pending' ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 700 }}>
                    <Clock size={15} />
                    <span>Awaiting Dispensary Fulfillment</span>
                  </div>
                  <p style={{ color: '#b45309', margin: '3px 0 0', fontSize: 11.5 }}>
                    Order is queued in the Pharmacist Dispense Queue for stock check & fulfillment.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    color: '#991b1b'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <AlertCircle size={15} />
                    <span>Prescription Cancelled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && !prescriptions.length && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-icon">💊</span>
            <h4>No prescriptions found</h4>
            <p>No prescriptions match the selected status or date filters.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorPrescriptions;
