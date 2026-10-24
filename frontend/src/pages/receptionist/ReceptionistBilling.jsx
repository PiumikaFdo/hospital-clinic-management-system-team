import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Printer, 
  Receipt, 
  FileText, 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import PrintableInvoiceModal from '../../components/PrintableInvoiceModal';

const ReceptionistBilling = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patient_id');

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'
  const [bills, setBills] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPayModal, setShowPayModal]   = useState(null);
  const [billForm, setBillForm] = useState({ 
    patient_id: patientIdParam || '', appointment_id:'', admission_id:'', 
    doctor_fees:0, hospital_fees:500, discount:0, tax_rate:0 
  });
  const [payForm, setPayForm] = useState({ amount:'', payment_method:'Cash', transaction_reference:'' });

  // Printable modal state
  const [printModalState, setPrintModalState] = useState({
    isOpen: false,
    billId: null,
    paymentId: null,
    initialDocType: 'invoice', // 'invoice' | 'receipt'
    initialFormat: 'a4',       // 'a4' | 'thermal'
  });

  // Centralized unified data loader (Refreshes BOTH Invoices & Payments atomically)
  const fetchData = async () => {
    setLoading(true);
    try {
      const billsParams = new URLSearchParams();
      if (statusFilter) billsParams.append('status', statusFilter);
      if (patientIdParam) billsParams.append('patient_id', patientIdParam);
      if (startDate) billsParams.append('start_date', startDate);
      if (endDate) billsParams.append('end_date', endDate);
      if (search) billsParams.append('search', search);

      const payParams = new URLSearchParams();
      if (paymentMethodFilter && paymentMethodFilter !== 'ALL') payParams.append('payment_method', paymentMethodFilter);
      if (patientIdParam) payParams.append('patient_id', patientIdParam);
      if (startDate) payParams.append('start_date', startDate);
      if (endDate) payParams.append('end_date', endDate);
      payParams.append('limit', 150);

      const [billsRes, payRes] = await Promise.all([
        API.get(`/receptionist/bills?${billsParams.toString()}`),
        API.get(`/receptionist/payments?${payParams.toString()}`)
      ]);

      setBills(billsRes.data?.data || []);
      setPaymentsList(payRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load billing records:', err);
      toast.error('Could not refresh billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, startDate, endDate, paymentMethodFilter, patientIdParam]);

  useEffect(() => {
    if (patientIdParam) {
      setBillForm(prev => ({ ...prev, patient_id: patientIdParam }));
    }
  }, [patientIdParam]);

  useEffect(() => {
    API.get('/receptionist/patients')
      .then(r => setPatients(r.data?.data || []))
      .catch(console.error);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Open full official medical invoice
  const handleOpenPrintInvoice = (billId) => {
    setPrintModalState({
      isOpen: true,
      billId,
      paymentId: null,
      initialDocType: 'invoice',
      initialFormat: 'a4',
    });
  };

  // Open cashier payment receipt voucher (defaults to 80mm thermal slip)
  const handleOpenPrintReceipt = (billId, paymentId = null, format = 'thermal') => {
    setPrintModalState({
      isOpen: true,
      billId,
      paymentId,
      initialDocType: 'receipt',
      initialFormat: format,
    });
  };

  const handleClosePrintModal = () => {
    setPrintModalState({
      isOpen: false,
      billId: null,
      paymentId: null,
      initialDocType: 'invoice',
      initialFormat: 'a4',
    });
  };

  const createBill = async (e) => {
    e.preventDefault();
    try {
      const r = await API.post('/receptionist/bills', billForm);
      const newBillId = r.data.bill_id;
      toast.success(`Bill #${newBillId} created successfully!`);
      setShowBillModal(false);
      setBillForm({ patient_id:'', appointment_id:'', admission_id:'', doctor_fees:0, hospital_fees:500, discount:0, tax_rate:0 });
      await fetchData();
      handleOpenPrintInvoice(newBillId);
    } catch(err) {
      toast.error(err.response?.data?.message || 'Bill generation failed');
    }
  };

  const handleOpenPayModal = (b) => {
    setShowPayModal(b);
    setPayForm({
      amount: b.balance_amount && Number(b.balance_amount) > 0 ? Number(b.balance_amount) : '',
      payment_method: 'Cash',
      transaction_reference: ''
    });
  };

  const processPayment = async (e) => {
    e.preventDefault();
    const payAmt = Number(payForm.amount);
    if (!payAmt || payAmt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (payAmt > Number(showPayModal.balance_amount)) {
      toast.error(`Payment cannot exceed balance of Rs. ${Number(showPayModal.balance_amount).toLocaleString()}`);
      return;
    }

    try {
      await API.post('/receptionist/payments', {
        bill_id: showPayModal.bill_id,
        amount: payAmt,
        payment_method: payForm.payment_method,
        transaction_reference: payForm.transaction_reference
      });

      toast.success('Payment successfully processed!');
      const paidBillId = showPayModal.bill_id;
      setShowPayModal(null);
      setPayForm({ amount: '', payment_method: 'Cash', transaction_reference: '' });

      // Atomically refresh both tables and counters immediately
      await fetchData();

      // Open the specific Cashier Payment Receipt Slip (80mm thermal)
      handleOpenPrintReceipt(paidBillId, null, 'thermal');
    } catch(err) {
      toast.error(err.response?.data?.message || 'Payment processing failed');
    }
  };

  // Live KPI Summary Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPaymentsSum = paymentsList
    .filter(p => p.payment_date && p.payment_date.startsWith(todayStr))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalOutstandingBalance = bills.reduce((sum, b) => sum + Number(b.balance_amount || 0), 0);
  const paidInvoicesCount = bills.filter(b => b.payment_status === 'Paid').length;
  const settlementRate = bills.length ? Math.round((paidInvoicesCount / bills.length) * 100) : 0;

  const StatusBadge = ({ s }) => {
    if (s === 'Paid') {
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} />
          Paid
        </span>
      );
    }
    if (s === 'Partial') {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} />
          Partial
        </span>
      );
    }
    return (
      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <AlertCircle size={12} />
        Pending
      </span>
    );
  };

  return (
    <DashboardLayout 
      title="Front Desk Cashier & Invoicing Station" 
      subtitle="Issue patient invoices, process counter payments, and print official financial receipts"
    >
      {/* Patient Specific Filter Banner */}
      {patientIdParam && (
        <div style={{
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', fontWeight: 600, fontSize: '13px' }}>
            <FileText size={18} />
            <span>
              Showing billing records for Patient ID: <strong>#{patientIdParam}</strong> ({bills.length} invoices found)
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ height: '32px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              searchParams.delete('patient_id');
              setSearchParams(searchParams);
            }}
          >
            <X size={14} />
            Show All Patient Bills
          </button>
        </div>
      )}

      {/* =========================================================
          EXECUTIVE KPI SUMMARY METRIC CARDS
          ========================================================= */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
          <div className="stat-icon green" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: '#15803d' }}>
              Rs. {todayPaymentsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">Today's Collections</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{bills.length}</div>
            <div className="stat-label">Active Invoices</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: totalOutstandingBalance > 0 ? 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)' : '#ffffff' }}>
          <div className="stat-icon amber">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: totalOutstandingBalance > 0 ? '#c2410c' : 'inherit' }}>
              Rs. {totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">Total Outstanding Dues</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{settlementRate}%</div>
            <div className="stat-label">Settlement Ratio ({paidInvoicesCount}/{bills.length})</div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN NAVIGATION TABS & ACTION BAR
          ========================================================= */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* PRIMARY TABS */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, gap: 4 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontWeight: 600, padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText size={15} style={{ marginRight: 6 }} />
              Patient Invoices ({bills.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'payments' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontWeight: 600, padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
              onClick={() => setActiveTab('payments')}
            >
              <Receipt size={15} style={{ marginRight: 6 }} />
              Cashier Payments Register ({paymentsList.length})
            </button>
          </div>

          {/* SEARCH, REFRESH & GENERATE BILL */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: 220, paddingLeft: 32 }}
                  placeholder="Search patient, code, bill..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '7px 12px' }}>
                Search
              </button>
            </form>

            <button 
              type="button" 
              className="btn btn-outline btn-sm" 
              onClick={fetchData} 
              title="Refresh Data"
              style={{ padding: '7px 12px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowBillModal(true)}
            >
              <Plus size={16} />
              Generate Bill
            </button>
          </div>
        </div>

        {/* SUB-FILTER TOOLBAR */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', alignItems: 'center', justifyContent: 'space-between' }}>
          {activeTab === 'invoices' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Filter Status:</span>
              {['', 'Pending', 'Partial', 'Paid'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11, padding: '3px 10px', height: 26 }}
                  onClick={() => setStatusFilter(s)}
                >
                  {s || 'All Invoices'}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Payment Method:</span>
              {['ALL', 'Cash', 'Card', 'UPI', 'Insurance', 'Bank_Transfer'].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm ${paymentMethodFilter === m ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11, padding: '3px 10px', height: 26 }}
                  onClick={() => setPaymentMethodFilter(m)}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Date Range:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 135, height: 30, fontSize: 12 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span style={{ color: '#94a3b8' }}>–</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 135, height: 30, fontSize: 12 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="End Date"
            />
            {(startDate || endDate) && (
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB 1: PATIENT INVOICES TABLE
          ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ borderRadius: 12 }}>
          <div className="card-header" style={{ padding: '16px 22px' }}>
            <div className="card-header-left">
              <FileText size={18} className="text-primary" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Patient Billing & Invoices</h3>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>Showing {bills.length} invoices</span>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Patient Details</th>
                    <th>Bill Date</th>
                    <th>Doctor Fee</th>
                    <th>Medicine</th>
                    <th>Lab</th>
                    <th>Total Bill</th>
                    <th>Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => (
                    <tr key={b.bill_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {b.bill_id}
                      </td>
                      <td>
                        <strong>{b.patient_name}</strong>
                        <br />
                        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                          {b.patient_code} · {b.phone || 'No Phone'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(b.bill_date).toLocaleDateString()}</td>
                      <td>Rs. {Number(b.doctor_fees || 0).toLocaleString()}</td>
                      <td>Rs. {Number(b.medicine_cost || 0).toLocaleString()}</td>
                      <td>Rs. {Number(b.lab_cost || 0).toLocaleString()}</td>
                      <td>
                        <strong>Rs. {Number(b.total_amount).toLocaleString()}</strong>
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>
                        Rs. {Number(b.paid_amount).toLocaleString()}
                      </td>
                      <td style={{ color: Number(b.balance_amount) > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                        Rs. {Number(b.balance_amount).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge s={b.payment_status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {b.payment_status !== 'Paid' && Number(b.balance_amount) > 0 && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                              onClick={() => handleOpenPayModal(b)}
                            >
                              <CreditCard size={13} />
                              Pay
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleOpenPrintInvoice(b.bill_id)}
                            title="Print Official Medical Invoice"
                          >
                            <Printer size={13} />
                            Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && !bills.length && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <span className="empty-state-icon">📋</span>
                  <h4>No invoices found</h4>
                  <p>No billing records match your selected filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CASHIER PAYMENTS REGISTER (COUNTER CASHBOOK LEDGER)
          ========================================================= */}
      {activeTab === 'payments' && (
        <div className="card" style={{ borderRadius: 12 }}>
          <div className="card-header" style={{ padding: '16px 22px' }}>
            <div className="card-header-left">
              <Receipt size={18} color="#16a34a" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Cashier Payments Register & Receipts</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 10px' }}>
                Counter Total: Rs. {todayPaymentsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt ID</th>
                    <th>Invoice No</th>
                    <th>Patient Name</th>
                    <th>Amount Received</th>
                    <th>Payment Method</th>
                    <th>Ref / Auth No</th>
                    <th>Received By</th>
                    <th>Date & Time</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map(p => (
                    <tr key={p.payment_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                        REC-{String(p.payment_id).padStart(5, '0')}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {p.bill_id}
                      </td>
                      <td>
                        <strong>{p.patient_name}</strong>
                      </td>
                      <td style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>
                        Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                        {p.transaction_reference || 'COUNTER-CASH'}
                      </td>
                      <td>{p.received_by_name || 'Counter Staff'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(p.payment_date).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12, color: '#059669', borderColor: '#a7f3d0' }}
                          onClick={() => handleOpenPrintReceipt(p.bill_id, p.payment_id, 'thermal')}
                          title="Print Cashier Payment Receipt"
                        >
                          <Receipt size={13} />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && !paymentsList.length && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <span className="empty-state-icon">💳</span>
                  <h4>No payment transactions recorded</h4>
                  <p>Transactions recorded at the counter will appear here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: GENERATE INVOICE (BILL)
          ========================================================= */}
      {showBillModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={e => e.target === e.currentTarget && setShowBillModal(false)}
        >
          <div className="modal" style={{ maxWidth: 540, width: '95%', borderRadius: 14, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)', background: '#ffffff', overflow: 'hidden' }}>
            <div className="modal-header">
              <h3>💰 Generate Patient Bill</h3>
              <button className="modal-close" onClick={() => setShowBillModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={createBill}>
                <div className="form-group">
                  <label className="form-label">Select Patient *</label>
                  <select 
                    className="form-control" 
                    value={billForm.patient_id} 
                    onChange={e => setBillForm(f => ({ ...f, patient_id: e.target.value }))} 
                    required
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.first_name} {p.last_name} ({p.patient_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Appointment ID (Optional)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    placeholder="e.g. 102"
                    value={billForm.appointment_id} 
                    onChange={e => setBillForm(f => ({ ...f, appointment_id: e.target.value }))} 
                  />
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Doctor Fees (Rs.)</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      min="0"
                      value={billForm.doctor_fees} 
                      onChange={e => setBillForm(f => ({ ...f, doctor_fees: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hospital Facility (Rs.)</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      min="0"
                      value={billForm.hospital_fees} 
                      onChange={e => setBillForm(f => ({ ...f, hospital_fees: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount (Rs.)</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      min="0"
                      value={billForm.discount} 
                      onChange={e => setBillForm(f => ({ ...f, discount: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Rate (%)</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      min="0"
                      max="100"
                      value={billForm.tax_rate} 
                      onChange={e => setBillForm(f => ({ ...f, tax_rate: e.target.value }))} 
                    />
                  </div>
                </div>

                {/* REAL-TIME CALCULATION PREVIEW */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 12, border: '1px solid #e2e8f0', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Subtotal:</span>
                    <strong>Rs. {(Number(billForm.doctor_fees || 0) + Number(billForm.hospital_fees || 0)).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: 4 }}>
                    <span>Discount:</span>
                    <span>- Rs. {Number(billForm.discount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #cbd5e1', fontWeight: 800, fontSize: 14 }}>
                    <span>Estimated Net Total:</span>
                    <span style={{ color: '#2563eb' }}>
                      Rs. {Math.max(
                        0,
                        (Number(billForm.doctor_fees || 0) + Number(billForm.hospital_fees || 0) - Number(billForm.discount || 0)) *
                          (1 + Number(billForm.tax_rate || 0) / 100)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 600 }}>
                    Generate & Print Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: PROCESS PAYMENT
          ========================================================= */}
      {showPayModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={e => e.target === e.currentTarget && setShowPayModal(null)}
        >
          <div className="modal" style={{ maxWidth: 440, width: '95%', borderRadius: 14, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)', background: '#ffffff', overflow: 'hidden' }}>
            <div className="modal-header">
              <h3>💳 Counter Payment — Bill {showPayModal.bill_id}</h3>
              <button className="modal-close" onClick={() => setShowPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* BALANCE SUMMARY CARD */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Patient Name:</span>
                  <strong>{showPayModal.patient_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Total Invoice:</span>
                  <strong>Rs. {Number(showPayModal.total_amount).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Already Paid:</span>
                  <strong style={{ color: '#16a34a' }}>Rs. {Number(showPayModal.paid_amount).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#dc2626', borderTop: '1px dashed #cbd5e1', paddingTop: 6, marginTop: 6, fontWeight: 800 }}>
                  <span>Balance Due:</span>
                  <span>Rs. {Number(showPayModal.balance_amount).toLocaleString()}</span>
                </div>

                {Number(payForm.amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#1d4ed8', marginTop: 8, background: '#eff6ff', padding: '6px 10px', borderRadius: 6 }}>
                    <span>Remaining After This Payment:</span>
                    <strong>Rs. {Math.max(0, Number(showPayModal.balance_amount) - Number(payForm.amount || 0)).toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <form onSubmit={processPayment}>
                {/* QUICK FILL PRESETS */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Quick Fill:</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => setPayForm(f => ({ ...f, amount: Number(showPayModal.balance_amount) }))}
                  >
                    Full Balance (Rs. {Number(showPayModal.balance_amount).toLocaleString()})
                  </button>
                  {Number(showPayModal.balance_amount) > 1000 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => setPayForm(f => ({ ...f, amount: Math.round(Number(showPayModal.balance_amount) / 2) }))}
                    >
                      50% Deposit
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount (Rs.) *</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max={Math.max(1, Number(showPayModal.balance_amount))}
                    step="0.01"
                    value={payForm.amount}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-control"
                    value={payForm.payment_method}
                    onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}
                  >
                    {['Cash', 'Card', 'UPI', 'Insurance', 'Bank_Transfer'].map(m => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Card Auth / Cheque #</label>
                  <input
                    className="form-control"
                    placeholder="e.g. TXN-98432 or leave blank for Cash"
                    value={payForm.transaction_reference}
                    onChange={e => setPayForm(f => ({ ...f, transaction_reference: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 18 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" style={{ fontWeight: 600 }}>
                    Process & Print Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PRINTABLE MODAL: INVOICE OR CASHIER PAYMENT RECEIPT
          ========================================================= */}
      <PrintableInvoiceModal
        billId={printModalState.billId}
        paymentId={printModalState.paymentId}
        isOpen={printModalState.isOpen}
        onClose={handleClosePrintModal}
        initialDocType={printModalState.initialDocType}
        initialFormat={printModalState.initialFormat}
      />
    </DashboardLayout>
  );
};

export default ReceptionistBilling;
