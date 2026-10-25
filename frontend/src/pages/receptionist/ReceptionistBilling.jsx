import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Printer,
  Receipt,
  FileText,
  CreditCard,
  Search,
  Plus,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Wallet,
  Building2,
  TrendingUp,
  Percent
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import PrintableInvoiceModal from '../../components/PrintableInvoiceModal';
import ReceptionistPagination from '../../components/ReceptionistPagination';

const ReceptionistBilling = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patient_id');
  const billIdParam = searchParams.get('bill_id');

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
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const invoicePageSize = 10;
  const paymentPageSize = 10;

  // Modals state
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [billForm, setBillForm] = useState({
    patient_id: patientIdParam || '',
    appointment_id: '',
    admission_id: '',
    doctor_fees: 2000,
    hospital_fees: 500,
    discount: 0,
    tax_rate: 0
  });
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'Cash',
    transaction_reference: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const paymentSubmissionInProgress = useRef(false);

  // Printable modal state
  const [printModalState, setPrintModalState] = useState({
    isOpen: false,
    billId: null,
    paymentId: null,
    initialDocType: 'invoice',
    initialFormat: 'a4'
  });

  // Centralized unified data loader
  const fetchData = async () => {
    setLoading(true);
    try {
      const billsParams = new URLSearchParams();
      if (statusFilter) billsParams.append('status', statusFilter);
      if (patientIdParam) billsParams.append('patient_id', patientIdParam);
      if (billIdParam) billsParams.append('bill_id', billIdParam);
      if (startDate) billsParams.append('start_date', startDate);
      if (endDate) billsParams.append('end_date', endDate);
      if (search) billsParams.append('search', search);

      const payParams = new URLSearchParams();
      if (paymentMethodFilter && paymentMethodFilter !== 'ALL') payParams.append('payment_method', paymentMethodFilter);
      if (patientIdParam) payParams.append('patient_id', patientIdParam);
      if (billIdParam) payParams.append('bill_id', billIdParam);
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
  }, [statusFilter, startDate, endDate, paymentMethodFilter, patientIdParam, billIdParam]);

  useEffect(() => {
    setInvoicePage(1);
    setPaymentPage(1);
  }, [statusFilter, startDate, endDate, paymentMethodFilter, patientIdParam, billIdParam, search]);

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

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenPrintInvoice = billId => {
    setPrintModalState({
      isOpen: true,
      billId,
      paymentId: null,
      initialDocType: 'invoice',
      initialFormat: 'a4'
    });
  };

  const handleOpenPrintReceipt = (billId, paymentId = null, format = 'thermal') => {
    setPrintModalState({
      isOpen: true,
      billId,
      paymentId,
      initialDocType: 'receipt',
      initialFormat: format
    });
  };

  const handleClosePrintModal = () => {
    setPrintModalState({
      isOpen: false,
      billId: null,
      paymentId: null,
      initialDocType: 'invoice',
      initialFormat: 'a4'
    });
  };

  const createBill = async e => {
    e.preventDefault();
    try {
      const r = await API.post('/receptionist/bills', billForm);
      const newBillId = r.data.bill_id;
      toast.success(`Invoice #${newBillId} created successfully!`);
      setShowBillModal(false);
      setBillForm({
        patient_id: '',
        appointment_id: '',
        admission_id: '',
        doctor_fees: 2000,
        hospital_fees: 500,
        discount: 0,
        tax_rate: 0
      });
      await fetchData();
      handleOpenPrintInvoice(newBillId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bill generation failed');
    }
  };

  const handleOpenPayModal = b => {
    setShowPayModal(b);
    setPayForm({
      amount: b.balance_amount && Number(b.balance_amount) > 0 ? Number(b.balance_amount) : '',
      payment_method: 'Cash',
      transaction_reference: ''
    });
  };

  const processPayment = async e => {
    e.preventDefault();
    if (paymentSubmissionInProgress.current || processingPayment || !showPayModal || showPayModal.payment_status === 'Paid' || Number(showPayModal.balance_amount) <= 0) {
      toast.info('This invoice is already fully settled.');
      return;
    }
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
      paymentSubmissionInProgress.current = true;
      setProcessingPayment(true);
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

      await fetchData();
      handleOpenPrintReceipt(paidBillId, null, 'thermal');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed');
    } finally {
      paymentSubmissionInProgress.current = false;
      setProcessingPayment(false);
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
  const paymentsByBill = paymentsList.reduce((result, payment) => {
    const key = String(payment.bill_id);
    result[key] = result[key] || [];
    result[key].push(payment);
    return result;
  }, {});
  const paginatedBills = bills.slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize);
  const paginatedPayments = paymentsList.slice((paymentPage - 1) * paymentPageSize, paymentPage * paymentPageSize);

  const StatusBadge = ({ s }) => {
    if (s === 'Paid') {
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '11.5px' }}>
          <CheckCircle2 size={12} />
          Paid
        </span>
      );
    }
    if (s === 'Partial') {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '11.5px' }}>
          <Clock size={12} />
          Partial
        </span>
      );
    }
    return (
      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '11.5px' }}>
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
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', fontWeight: 600, fontSize: '13px' }}>
            <FileText size={18} />
            <span>
              Showing billing records for Patient ID: <strong>{patientIdParam}</strong> ({bills.length} invoices found)
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

      {/* ========================================================= */}
      {/* 1. EXECUTIVE KPI SUMMARY METRIC CARDS                     */}
      {/* ========================================================= */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '22px'
        }}
      >
        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Today's Collections
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                Rs. {todayPaymentsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
                Processed at cashier desk today
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Invoices
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {bills.length}
              </div>
              <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px', fontWeight: 500 }}>
                Issued patient billing accounts
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Outstanding Dues
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: totalOutstandingBalance > 0 ? '#c2410c' : '#15803d', marginTop: '4px' }}>
                Rs. {totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
                Pending patient balances
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CreditCard size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Settlement Ratio
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#7e22ce', marginTop: '4px' }}>
                {settlementRate}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                {paidInvoicesCount} of {bills.length} invoices cleared
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#faf5ff',
                color: '#7e22ce',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN TABS & ACTION TOOLBAR                            */}
      {/* ========================================================= */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* PRIMARY TABS SWITCHER */}
          <div className="receptionist-nav-tabs">
            <button
              type="button"
              className={`receptionist-nav-tab ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText size={16} />
              Patient Invoices ({bills.length})
            </button>
            <button
              type="button"
              className={`receptionist-nav-tab ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              <Receipt size={16} />
              Cashier Payments Register ({paymentsList.length})
            </button>
          </div>

          {/* SEARCH, REFRESH & GENERATE BILL */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '240px', paddingLeft: '34px', fontSize: '13px' }}
                  placeholder="Search patient, code, bill..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '7px 14px', fontWeight: 600 }}>
                Search
              </button>
            </form>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              title="Refresh Data"
              style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563eb',
                borderColor: '#2563eb'
              }}
              onClick={() => setShowBillModal(true)}
            >
              <Plus size={16} />
              Generate Bill
            </button>
          </div>
        </div>

        {/* SUB-FILTER TOOLBAR */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', alignItems: 'center', justifyContent: 'space-between' }}>
          {activeTab === 'invoices' ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>Filter Status:</span>
              {[
                { id: '', label: 'All Invoices' },
                { id: 'Pending', label: 'Pending Dues' },
                { id: 'Partial', label: 'Partially Paid' },
                { id: 'Paid', label: 'Paid & Settled' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px' }}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>Payment Method:</span>
              {['ALL', 'Cash', 'Card', 'UPI', 'Insurance', 'Bank_Transfer'].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm ${paymentMethodFilter === m ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px' }}
                  onClick={() => setPaymentMethodFilter(m)}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Date:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '135px', height: '32px', fontSize: '12px' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span style={{ color: '#94a3b8' }}>–</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '135px', height: '32px', fontSize: '12px' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="End Date"
            />
            {(startDate || endDate || search || statusFilter || paymentMethodFilter !== 'ALL') && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '12px', color: '#ef4444', padding: '4px 8px' }}
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                  setStatusFilter('');
                  setPaymentMethodFilter('ALL');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. TAB 1: PATIENT INVOICES TABLE                          */}
      {/* ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div
            className="card-header"
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Patient Invoices & Hospital Bills
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {billIdParam ? `Invoice ${billIdParam} · ` : ''}Showing {bills.length} billing records
            </span>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="receptionist-table" style={{ minWidth: '1240px' }}>
                <thead>
                  <tr>
                    <th>INVOICE</th>
                    <th>PATIENT PROFILE</th>
                    <th>LINKED VISIT</th>
                    <th>BILL DATE</th>
                    <th>DOCTOR FEE</th>
                    <th>MEDICINE</th>
                    <th>LAB</th>
                    <th>TOTAL BILL</th>
                    <th>PAID</th>
                    <th>BALANCE DUE</th>
                    <th>STATUS</th>
                    <th>PAYMENT ACTIVITY</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map(b => (
                    <tr
                      key={b.bill_id}
                      style={String(b.bill_id) === String(billIdParam) ? { background: '#eff6ff' } : undefined}
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {b.bill_id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{b.patient_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{b.patient_code}</span> · {b.phone || 'No Phone'}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {b.appointment_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/receptionist/appointments?search=${b.appointment_id}`)}
                            style={{
                              border: 0,
                              background: 'transparent',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 700
                            }}
                          >
                            Appointment {b.appointment_id}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>General billing</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(b.bill_date).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>Rs. {Number(b.doctor_fees || 0).toLocaleString()}</td>
                      <td style={{ fontSize: '12.5px' }}>Rs. {Number(b.medicine_cost || 0).toLocaleString()}</td>
                      <td style={{ fontSize: '12.5px' }}>Rs. {Number(b.lab_cost || 0).toLocaleString()}</td>
                      <td>
                        <strong style={{ color: '#0f172a', fontSize: '13px' }}>
                          Rs. {Number(b.total_amount).toLocaleString()}
                        </strong>
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 600, fontSize: '12.5px' }}>
                        Rs. {Number(b.paid_amount).toLocaleString()}
                      </td>
                      <td style={{ color: Number(b.balance_amount) > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: '13px' }}>
                        Rs. {Number(b.balance_amount).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge s={b.payment_status} />
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          {paymentsByBill[String(b.bill_id)]?.length
                            ? `${paymentsByBill[String(b.bill_id)].length} payment${paymentsByBill[String(b.bill_id)].length > 1 ? 's' : ''} recorded`
                            : 'No payments recorded'}
                        </div>
                        {paymentsByBill[String(b.bill_id)]?.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            Latest: {paymentsByBill[String(b.bill_id)][0].payment_method} · Rs. {Number(paymentsByBill[String(b.bill_id)][0].amount || 0).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-group">
                          {b.payment_status !== 'Paid' && Number(b.balance_amount) > 0 && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                              onClick={() => handleOpenPayModal(b)}
                              title="Collect Payment"
                            >
                              <CreditCard size={12} />
                              Pay
                            </button>
                          )}
                          <button
                            type="button"
                            className="table-action-btn btn-view"
                            onClick={() => handleOpenPrintInvoice(b.bill_id)}
                            title="Print Official Medical Invoice"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ReceptionistPagination
                page={invoicePage}
                pageSize={invoicePageSize}
                total={bills.length}
                onPageChange={setInvoicePage}
              />

              {!loading && !bills.length && (
                <div className="empty-state" style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <Receipt size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                  <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '15px' }}>No Invoices Found</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    No patient billing records match your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB 2: CASHIER PAYMENTS REGISTER                       */}
      {/* ========================================================= */}
      {activeTab === 'payments' && (
        <div className="card" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div
            className="card-header"
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} style={{ color: '#16a34a' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Cashier Payments Register & Receipts
              </h3>
            </div>
            <span
              className="badge badge-success"
              style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 700 }}
            >
              Today's Counter Total: Rs. {todayPaymentsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="receptionist-table" style={{ minWidth: '1050px' }}>
                <thead>
                  <tr>
                    <th>RECEIPT ID</th>
                    <th>INVOICE</th>
                    <th>PATIENT NAME</th>
                    <th>AMOUNT RECEIVED</th>
                    <th>METHOD</th>
                    <th>REFERENCE / AUTH #</th>
                    <th>RECEIVED BY</th>
                    <th>DATE & TIME</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map(p => (
                    <tr key={p.payment_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                        REC-{String(p.payment_id).padStart(5, '0')}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {p.bill_id}
                      </td>
                      <td>
                        <strong style={{ color: '#1e293b' }}>{p.patient_name}</strong>
                      </td>
                      <td style={{ fontWeight: 800, color: '#15803d', fontSize: '13.5px' }}>
                        Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748b' }}>
                        {p.transaction_reference || 'COUNTER-CASH'}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>{p.received_by_name || 'Counter Staff'}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(p.payment_date).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            color: '#059669',
                            borderColor: '#a7f3d0',
                            borderRadius: '6px'
                          }}
                          onClick={() => handleOpenPrintReceipt(p.bill_id, p.payment_id, 'thermal')}
                          title="Print Cashier Payment Receipt"
                        >
                          <Receipt size={12} />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ReceptionistPagination
                page={paymentPage}
                pageSize={paymentPageSize}
                total={paymentsList.length}
                onPageChange={setPaymentPage}
              />

              {!loading && !paymentsList.length && (
                <div className="empty-state" style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <CreditCard size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                  <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '15px' }}>No Payment Transactions</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Payments received at the counter will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: GENERATE INVOICE (BILL)                         */}
      {/* ========================================================= */}
      {showBillModal && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowBillModal(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '560px',
              width: '100%',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <form onSubmit={createBill}>
              <div
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    💰 Generate Patient Invoice
                  </h3>
                  <div style={{ fontSize: '12px', color: '#dbeafe' }}>
                    Issue hospital outpatient or consultation bill
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Select Patient *</label>
                  <select
                    className="form-control"
                    value={billForm.patient_id}
                    onChange={e => setBillForm(f => ({ ...f, patient_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.first_name} {p.last_name} ({p.patient_code}) · 📞 {p.phone || 'No phone'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Linked Appointment ID (Optional)</label>
                  <input
                    className="form-control"
                    type="number"
                    placeholder="e.g. 102"
                    value={billForm.appointment_id}
                    onChange={e => setBillForm(f => ({ ...f, appointment_id: e.target.value }))}
                  />
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Doctor Fees (Rs.)</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={billForm.doctor_fees}
                      onChange={e => setBillForm(f => ({ ...f, doctor_fees: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Hospital Facility (Rs.)</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={billForm.hospital_fees}
                      onChange={e => setBillForm(f => ({ ...f, hospital_fees: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Discount (Rs.)</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={billForm.discount}
                      onChange={e => setBillForm(f => ({ ...f, discount: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Tax Rate (%)</label>
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
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <strong>Rs. {(Number(billForm.doctor_fees || 0) + Number(billForm.hospital_fees || 0)).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '6px' }}>
                    <span>Discount:</span>
                    <span>- Rs. {Number(billForm.discount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 800, fontSize: '14px' }}>
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
              </div>

              <div
                className="modal-footer"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 20px',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 600, background: '#2563eb', borderColor: '#2563eb' }}>
                  Generate & Print Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: PROCESS COUNTER PAYMENT                         */}
      {/* ========================================================= */}
      {showPayModal && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowPayModal(null)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <form onSubmit={processPayment}>
              <div
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    💳 Counter Payment — Invoice {showPayModal.bill_id}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#dcfce7' }}>
                    Patient: {showPayModal.patient_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px' }}>
                {/* BALANCE SUMMARY CARD */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Total Invoice:</span>
                    <strong>Rs. {Number(showPayModal.total_amount).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Already Paid:</span>
                    <strong style={{ color: '#16a34a' }}>Rs. {Number(showPayModal.paid_amount).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#dc2626', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '6px', fontWeight: 800 }}>
                    <span>Balance Due:</span>
                    <span>Rs. {Number(showPayModal.balance_amount).toLocaleString()}</span>
                  </div>

                  {Number(payForm.amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#1d4ed8', marginTop: '8px', background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' }}>
                      <span>Remaining After This Payment:</span>
                      <strong>Rs. {Math.max(0, Number(showPayModal.balance_amount) - Number(payForm.amount || 0)).toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Payment Amount (Rs.) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="1"
                      max={showPayModal.balance_amount}
                      value={payForm.amount}
                      onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setPayForm(f => ({ ...f, amount: showPayModal.balance_amount }))}
                      style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Pay Full
                    </button>
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Payment Method *</label>
                    <select
                      className="form-control"
                      value={payForm.payment_method}
                      onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}
                    >
                      <option value="Cash">Cash Counter</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="UPI">UPI / Digital QR</option>
                      <option value="Bank_Transfer">Bank Transfer</option>
                      <option value="Insurance">Insurance Provider</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Ref / Receipt #</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="e.g. CARD-4819"
                      value={payForm.transaction_reference}
                      onChange={e => setPayForm(f => ({ ...f, transaction_reference: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 20px',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={processingPayment || showPayModal.payment_status === 'Paid' || Number(showPayModal.balance_amount) <= 0}
                  style={{ fontWeight: 600, background: '#16a34a', borderColor: '#16a34a' }}
                >
                  {processingPayment ? 'Processing...' : 'Confirm & Print Thermal Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. PRINTABLE INVOICE / RECEIPT SLIP MODAL                 */}
      {/* ========================================================= */}
      <PrintableInvoiceModal
        isOpen={printModalState.isOpen}
        billId={printModalState.billId}
        paymentId={printModalState.paymentId}
        initialDocType={printModalState.initialDocType}
        initialFormat={printModalState.initialFormat}
        onClose={handleClosePrintModal}
      />
    </DashboardLayout>
  );
};

export default ReceptionistBilling;
