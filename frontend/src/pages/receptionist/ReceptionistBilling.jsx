import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const ReceptionistBilling = () => {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPayModal, setShowPayModal]   = useState(null);
  const [showPaymentsLog, setShowPaymentsLog] = useState(false);
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [billForm, setBillForm] = useState({ patient_id:'',appointment_id:'',admission_id:'',doctor_fees:0,hospital_fees:500,discount:0,tax_rate:0 });
  const [payForm, setPayForm]   = useState({ amount:'',payment_method:'Cash',transaction_reference:'' });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (search) params.append('search', search);

    API.get(`/receptionist/bills?${params.toString()}`)
      .then(r => setBills(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, startDate, endDate]);
  useEffect(() => { API.get('/receptionist/patients').then(r => setPatients(r.data.data || [])); }, []);

  const openPaymentsRegister = async () => {
    setShowPaymentsLog(true);
    try {
      const p = paymentMethodFilter && paymentMethodFilter !== 'ALL' ? `?payment_method=${paymentMethodFilter}` : '';
      const r = await API.get(`/receptionist/payments${p}`);
      setPaymentsList(r.data.data || []);
    } catch(err) {
      toast.error('Failed to load payments register');
    }
  };

  useEffect(() => {
    if (showPaymentsLog) {
      openPaymentsRegister();
    }
  }, [paymentMethodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const createBill = async (e) => {
    e.preventDefault();
    try {
      const r = await API.post('/receptionist/bills', billForm);
      toast.success(`Bill #${r.data.bill_id} created!`);
      setShowBillModal(false);
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const processPayment = async (e) => {
    e.preventDefault();
    try {
      await API.post('/receptionist/payments', { bill_id: showPayModal.bill_id, ...payForm });
      toast.success('Payment processed!');
      setShowPayModal(null);
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const StatusBadge = ({ s }) => {
    const m = { Paid:'badge-success', Partial:'badge-warning', Pending:'badge-danger', Cancelled:'badge-gray' };
    return <span className={`badge ${m[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <DashboardLayout title="Billing & Invoicing">
      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['', 'Pending', 'Partial', 'Paid'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s || 'All Invoices'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 150 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Start Date"
            />
            <input
              type="date"
              className="form-control"
              style={{ width: 150 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="End Date"
            />
            {(startDate || endDate) && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear
              </button>
            )}
            <input
              type="text"
              className="form-control"
              style={{ width: 180 }}
              placeholder="Search patient / code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPaymentsLog(true)}>
              💳 Payments Register
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowBillModal(true)}>
              + Generate Bill
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>💰 Patient Invoices ({bills.length})</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Bill#</th><th>Patient</th><th>Date</th><th>Doctor Fees</th><th>Medicine</th><th>Lab</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.bill_id}>
                    <td>#{b.bill_id}</td>
                    <td><strong>{b.patient_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{b.patient_code}</span></td>
                    <td style={{fontSize:12}}>{new Date(b.bill_date).toLocaleDateString()}</td>
                    <td>Rs.{Number(b.doctor_fees).toLocaleString()}</td>
                    <td>Rs.{Number(b.medicine_cost).toLocaleString()}</td>
                    <td>Rs.{Number(b.lab_cost).toLocaleString()}</td>
                    <td><strong>Rs.{Number(b.total_amount).toLocaleString()}</strong></td>
                    <td style={{color:'var(--success)'}}>Rs.{Number(b.paid_amount).toLocaleString()}</td>
                    <td style={{color:'var(--danger)',fontWeight:700}}>Rs.{Number(b.balance_amount).toLocaleString()}</td>
                    <td><StatusBadge s={b.payment_status}/></td>
                    <td>
                      {b.payment_status!=='Paid'&&(
                        <button className="btn btn-success btn-sm" onClick={()=>setShowPayModal(b)}>💳 Pay</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading&&!bills.length&&<div className="empty-state"><span className="empty-state-icon">💰</span><h4>No bills found</h4></div>}
          </div>
        </div>
      </div>

      {/* Payments Register Modal */}
      {showPaymentsLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPaymentsLog(false)}>
          <div className="modal" style={{ maxWidth: 780 }}>
            <div className="modal-header">
              <h3>💳 Cashier Payments Register</h3>
              <button className="modal-close" onClick={() => setShowPaymentsLog(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', marginBottom: 16 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {['ALL', 'Cash', 'Card', 'UPI', 'Insurance', 'Bank_Transfer'].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`btn ${paymentMethodFilter === m ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => setPaymentMethodFilter(m)}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Pay ID</th>
                      <th>Bill#</th>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Ref.</th>
                      <th>Received By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsList.map(p => (
                      <tr key={p.payment_id}>
                        <td>#{p.payment_id}</td>
                        <td>#{p.bill_id}</td>
                        <td><strong>{p.patient_name}</strong></td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                          Rs.{Number(p.amount).toLocaleString()}
                        </td>
                        <td><span className="badge badge-info">{p.payment_method}</span></td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{p.transaction_reference || '—'}</td>
                        <td>{p.received_by_name || 'Staff'}</td>
                        <td style={{ fontSize: 12 }}>{new Date(p.payment_date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!paymentsList.length && (
                  <div className="empty-state">
                    <p>No payments recorded for this method.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showBillModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowBillModal(false)}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-header"><h3>💰 Generate Bill</h3><button className="modal-close" onClick={()=>setShowBillModal(false)}>✕</button></div>
            <div className="modal-body">
              <form onSubmit={createBill}>
                <div className="form-group"><label className="form-label">Patient *</label>
                  <select className="form-control" value={billForm.patient_id} onChange={e=>setBillForm(f=>({...f,patient_id:e.target.value}))} required>
                    <option value="">-- Select Patient --</option>
                    {patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} ({p.patient_code})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Appointment ID (optional)</label><input className="form-control" type="number" value={billForm.appointment_id} onChange={e=>setBillForm(f=>({...f,appointment_id:e.target.value}))} /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Doctor Fees (Rs.)</label><input className="form-control" type="number" value={billForm.doctor_fees} onChange={e=>setBillForm(f=>({...f,doctor_fees:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Hospital Fees (Rs.)</label><input className="form-control" type="number" value={billForm.hospital_fees} onChange={e=>setBillForm(f=>({...f,hospital_fees:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Discount (Rs.)</label><input className="form-control" type="number" value={billForm.discount} onChange={e=>setBillForm(f=>({...f,discount:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Tax Rate (%)</label><input className="form-control" type="number" value={billForm.tax_rate} onChange={e=>setBillForm(f=>({...f,tax_rate:e.target.value}))} /></div>
                </div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowBillModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Generate Bill</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPayModal(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header"><h3>💳 Process Payment — Bill #{showPayModal.bill_id}</h3><button className="modal-close" onClick={()=>setShowPayModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{background:'var(--gray-50)',borderRadius:'var(--radius-md)',padding:14,marginBottom:16}}>
                <p style={{fontSize:13}}><strong>Total:</strong> Rs.{Number(showPayModal.total_amount).toLocaleString()}</p>
                <p style={{fontSize:13}}><strong>Paid:</strong> Rs.{Number(showPayModal.paid_amount).toLocaleString()}</p>
                <p style={{fontSize:13,color:'var(--danger)'}}><strong>Balance Due:</strong> Rs.{Number(showPayModal.balance_amount).toLocaleString()}</p>
              </div>
              <form onSubmit={processPayment}>
                <div className="form-group"><label className="form-label">Amount (Rs.) *</label><input className="form-control" type="number" max={showPayModal.balance_amount} value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Payment Method *</label>
                  <select className="form-control" value={payForm.payment_method} onChange={e=>setPayForm(f=>({...f,payment_method:e.target.value}))}>
                    {['Cash','Card','UPI','Insurance','Bank_Transfer'].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Reference (if any)</label><input className="form-control" placeholder="Transaction ID..." value={payForm.transaction_reference} onChange={e=>setPayForm(f=>({...f,transaction_reference:e.target.value}))} /></div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowPayModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Process Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default ReceptionistBilling;
