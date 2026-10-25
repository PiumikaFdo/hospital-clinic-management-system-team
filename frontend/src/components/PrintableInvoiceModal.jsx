import React, { useEffect, useState } from 'react';
import { Printer, Receipt, FileText, X, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import API from '../api/axios';
import Barcode from './Barcode';

const PrintableInvoiceModal = ({
  billId,
  paymentId = null,
  isOpen,
  onClose,
  initialDocType = 'invoice', // 'invoice' | 'receipt'
  initialFormat = null,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState(initialDocType);

  // Exclusive pairing:
  // Patient Tax Invoice is STRICTLY A4 Standard Sheet
  // Cashier Payment Receipt is STRICTLY 80mm Thermal Slip
  const format = docType === 'receipt' ? 'thermal' : 'a4';

  useEffect(() => {
    if (isOpen && billId) {
      setLoading(true);
      setDocType(initialDocType || 'invoice');
      API.get(`/receptionist/bills/${billId}`)
        .then((res) => {
          setData(res.data.data);
        })
        .catch((err) => {
          console.error('Failed to load bill details for printing:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, billId, initialDocType]);

  // Support pressing Escape to close the modal conveniently
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const bill = data?.bill;
  const payments = data?.payments || [];

  // If specific paymentId was requested, find it; otherwise take the latest payment
  const activePayment = paymentId
    ? payments.find((p) => p.payment_id === paymentId) || payments[payments.length - 1]
    : payments[payments.length - 1];

  const invoiceNumber = bill ? `INV-${String(bill.bill_id).padStart(6, '0')}` : '';
  const receiptNumber = activePayment ? `REC-${String(activePayment.payment_id).padStart(6, '0')}` : 'REC-PENDING';

  const formattedDate = bill
    ? new Date(bill.bill_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const formattedTime = bill
    ? new Date(bill.bill_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const paymentDate = activePayment
    ? new Date(activePayment.payment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : formattedDate;
  const paymentTime = activePayment
    ? new Date(activePayment.payment_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : formattedTime;

  const isPaid = bill?.payment_status === 'Paid';
  const isPartial = bill?.payment_status === 'Partial';

  return (
    <div className="modal-overlay print-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal print-modal-dialog ${format === 'thermal' ? 'thermal-view' : 'a4-view'}`}>
        {/* MODAL CONTROL HEADER (HIDDEN ON PRINT) */}
        <div
          className="modal-header no-print"
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid var(--slate-200)',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {docType === 'invoice' ? <FileText size={20} className="text-primary" /> : <Receipt size={20} color="#16a34a" />}
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {docType === 'invoice' ? 'Patient Tax Invoice' : 'Cashier Payment Receipt'}
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                {docType === 'invoice'
                  ? 'Official Medical Record & Insurance Claim'
                  : 'Official Hospital Cash Counter Receipt'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* DOCUMENT SELECTOR TABS */}
            <div className="btn-group" style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: 8, padding: 3 }}>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'invoice' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 14px', fontSize: 12, height: 30, fontWeight: 600 }}
                onClick={() => setDocType('invoice')}
              >
                <FileText size={13} style={{ marginRight: 5 }} />
                Patient Tax Invoice
              </button>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'receipt' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 14px', fontSize: 12, height: 30, fontWeight: 600 }}
                onClick={() => setDocType('receipt')}
              >
                <Receipt size={13} style={{ marginRight: 5 }} />
                Cashier Payment Receipt
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '6px 14px', height: 32 }}
              onClick={handlePrint}
            >
              <Printer size={15} />
              Print Document
            </button>

            {/* SUITABLE CLOSE BUTTON */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                padding: '6px 12px',
                height: 32,
                borderRadius: 8,
                background: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#334155',
                cursor: 'pointer',
              }}
              onClick={onClose}
              title="Close (or press Esc)"
            >
              <X size={15} />
              Close
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div
          className="modal-body print-modal-body"
          style={{
            padding: format === 'thermal' ? '18px' : '28px',
            background: '#f1f5f9',
            maxHeight: '82vh',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <span className="spinner-large" style={{ display: 'inline-block', marginBottom: 12 }} />
              <p style={{ color: 'var(--slate-500)', fontSize: 13 }}>Loading document details...</p>
            </div>
          ) : !bill ? (
            <div className="empty-state">
              <p>Invoice / Receipt data could not be retrieved.</p>
            </div>
          ) : (
            <div id="printable-receipt-modal" className={`printable-sheet ${format}`}>
              {/* =========================================================================
                  DOCUMENT 1: PATIENT TAX INVOICE (A4 STANDARD SHEET)
                  ========================================================================= */}
              {docType === 'invoice' && (
                <div className="a4-invoice-container">
                  <div className="invoice-header">
                    <div className="hospital-branding">
                      <div className="hospital-logo-badge">
                        <Building2 size={28} color="#2563eb" />
                      </div>
                      <div>
                        <h1 className="hospital-title">CAREPLUS MEDICAL CENTER</h1>
                        <p className="hospital-sub">Advanced Healthcare & Clinical Hospital</p>
                        <p className="hospital-address">124 Hospital Road, Colombo 07, Sri Lanka · Reg: PV-89241-MED</p>
                        <p className="hospital-contact">Phone: +94 (11) 234-5678 · Email: billing@careplus.hospital</p>
                      </div>
                    </div>

                    <div className="invoice-title-block">
                      <h2 className="invoice-badge-label">OFFICIAL INVOICE</h2>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Invoice No:</span>
                        <span className="meta-val highlight">{invoiceNumber}</span>
                      </div>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Date:</span>
                        <span className="meta-val">{formattedDate}</span>
                      </div>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Time:</span>
                        <span className="meta-val">{formattedTime}</span>
                      </div>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Cashier:</span>
                        <span className="meta-val">{bill.receptionist_name || 'Front Desk Station'}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="divider-line" />

                  <div className="invoice-patient-row">
                    <div className="patient-box" style={{ flex: 1 }}>
                      <span className="section-tag">BILLED TO (PATIENT)</span>
                      <h3 className="patient-name">{bill.patient_name}</h3>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '5px 14px',
                          marginTop: 8,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong style={{ color: '#475569' }}>Patient Code:</strong>{' '}
                          <span className="mono-code">{bill.patient_code}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#475569' }}>Contact:</strong> {bill.phone || 'N/A'}
                        </div>
                        <div>
                          <strong style={{ color: '#475569' }}>Gender / Age:</strong>{' '}
                          {bill.gender || 'N/A'} {bill.patient_age ? `(${bill.patient_age} yrs)` : ''}
                        </div>
                        <div>
                          <strong style={{ color: '#475569' }}>Blood Group:</strong>{' '}
                          {bill.blood_group ? (
                            <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 6px' }}>
                              {bill.blood_group}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </div>
                        {bill.address && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong style={{ color: '#475569' }}>Address:</strong> {bill.address}
                          </div>
                        )}
                        {bill.doctor_name && (
                          <div style={{ gridColumn: 'span 2', marginTop: 2 }}>
                            <strong style={{ color: '#475569' }}>Attending Physician:</strong> Dr.{' '}
                            {bill.doctor_name}{' '}
                            {bill.doctor_specialization ? `(${bill.doctor_specialization})` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="status-stamp-box">
                      <div
                        className={`status-stamp ${
                          isPaid ? 'stamp-paid' : isPartial ? 'stamp-partial' : 'stamp-pending'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={18} style={{ marginRight: 6 }} />
                            PAID IN FULL
                          </>
                        ) : isPartial ? (
                          <>
                            <Clock size={18} style={{ marginRight: 6 }} />
                            PARTIALLY PAID
                          </>
                        ) : (
                          <>
                            <AlertCircle size={18} style={{ marginRight: 6 }} />
                            PAYMENT PENDING
                          </>
                        )}
                      </div>
                      <p className="terms-label">Payment Terms: Due Upon Presentation</p>
                    </div>
                  </div>

                  {/* INPATIENT HOSPITALIZATION STAY SUMMARY (IF LINKED TO ADMISSION) */}
                  {(bill.admission_id || bill.ward_name) && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span style={{ color: '#166534', fontSize: 11, fontWeight: 700 }}>ASSIGNED WARD & BED</span>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: 13, marginTop: 2 }}>
                          {bill.ward_name} · Bed {bill.bed_number}
                        </strong>
                        <span style={{ fontSize: 10.5, color: '#4b5563' }}>
                          {bill.ward_type} (Floor {bill.floor_number || 1})
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#166534', fontSize: 11, fontWeight: 700 }}>ADMISSION DATE</span>
                        <strong style={{ display: 'block', color: '#0f172a', marginTop: 2 }}>
                          {bill.admission_date ? new Date(bill.admission_date).toLocaleDateString() : 'N/A'}
                        </strong>
                        <span style={{ fontSize: 10.5, color: '#4b5563' }}>
                          {bill.admission_date ? new Date(bill.admission_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#166534', fontSize: 11, fontWeight: 700 }}>DISCHARGE STATUS</span>
                        <strong style={{ display: 'block', color: '#0f172a', marginTop: 2 }}>
                          {bill.discharge_date ? new Date(bill.discharge_date).toLocaleDateString() : (bill.admission_status || 'Active Stay')}
                        </strong>
                        <span style={{ fontSize: 10.5, color: bill.discharge_date ? '#059669' : '#d97706', fontWeight: 600 }}>
                          {bill.discharge_date ? '✓ Discharged' : '● Under In-Patient Care'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#166534', fontSize: 11, fontWeight: 700 }}>LENGTH OF STAY</span>
                        <strong style={{ display: 'block', color: '#15803d', fontSize: 13, marginTop: 2 }}>
                          {bill.admission_days || 1} {(bill.admission_days || 1) === 1 ? 'day' : 'days'}
                        </strong>
                        <span style={{ fontSize: 10.5, color: '#4b5563' }}>
                          @ Rs. {Number(bill.daily_rate || (bill.ward_cost / (bill.admission_days || 1))).toLocaleString()}/day
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CLINICAL CHARGES TABLE */}
                  <table className="invoice-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                        <th>Description of Clinical & Hospital Services</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Category</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Amount (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'center' }}>01</td>
                        <td>
                          <strong>Doctor Consultation & Clinical Assessment</strong>
                          <p className="item-sub">OPD Physician assessment fee for patient examination</p>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-info">OPD</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td className="amt-cell">
                          {Number(bill.doctor_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      <tr>
                        <td style={{ textAlign: 'center' }}>02</td>
                        <td>
                          <strong>Hospital Facility & Nursing Services</strong>
                          <p className="item-sub">Registration, vital triage, and equipment usage</p>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-info">Facility</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td className="amt-cell">
                          {Number(bill.hospital_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {Number(bill.medicine_cost) > 0 && (
                        <tr>
                          <td style={{ textAlign: 'center' }}>03</td>
                          <td>
                            <strong>Prescription Medications & Pharmacy Dispensing</strong>
                            <p className="item-sub">Dispensed by CarePlus In-House Pharmacy</p>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-warning">Pharmacy</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>-</td>
                          <td className="amt-cell">
                            {Number(bill.medicine_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}

                      {Number(bill.lab_cost) > 0 && (
                        <tr>
                          <td style={{ textAlign: 'center' }}>04</td>
                          <td>
                            <strong>Laboratory & Diagnostic Investigations</strong>
                            <p className="item-sub">Pathology / Diagnostic tests conducted</p>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-secondary">Laboratory</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>-</td>
                          <td className="amt-cell">
                            {Number(bill.lab_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}

                      {Number(bill.ward_cost) > 0 && (
                        <tr>
                          <td style={{ textAlign: 'center' }}>05</td>
                          <td>
                            <strong>Inpatient Ward & Accommodation Charges</strong>
                            <p className="item-sub">
                              {bill.ward_name ? `${bill.ward_name} (Bed ${bill.bed_number})` : 'Hospital Ward'} · {bill.admission_days || 1} {(bill.admission_days || 1) === 1 ? 'day' : 'days'} stay @ Rs. {Number(bill.daily_rate || (bill.ward_cost / (bill.admission_days || 1))).toLocaleString()}/day
                            </p>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-info">Ward</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{bill.admission_days || 1} d</td>
                          <td className="amt-cell">
                            {Number(bill.ward_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="invoice-totals-wrapper">
                    <div className="invoice-notes-box">
                      <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: '#1e293b' }}>
                        Payment Information & Verification
                      </h4>
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                        Payments can be made via Cash, Visa/Mastercard, or Bank Transfer. Please quote invoice {invoiceNumber}{' '}
                        for billing inquiries and claims.
                      </p>

                      {/* AUTHENTIC CODE 39 BARCODE */}
                      <div style={{ marginTop: 14 }}>
                        <Barcode
                          value={invoiceNumber}
                          height={40}
                          narrowWidth={1.3}
                          wideRatio={2.5}
                          showText={true}
                        />
                      </div>
                    </div>

                    <div className="invoice-summary-box">
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>
                          Rs.{' '}
                          {(
                            Number(bill.doctor_fees || 0) +
                            Number(bill.hospital_fees || 0) +
                            Number(bill.medicine_cost || 0) +
                            Number(bill.lab_cost || 0) +
                            Number(bill.ward_cost || 0)
                          ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {Number(bill.discount) > 0 && (
                        <div className="summary-row text-success">
                          <span>Special Discount:</span>
                          <span>- Rs. {Number(bill.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {Number(bill.tax) > 0 && (
                        <div className="summary-row">
                          <span>Taxes / VAT:</span>
                          <span>+ Rs. {Number(bill.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="summary-row total-highlight">
                        <span>Total Payable:</span>
                        <span>Rs. {Number(bill.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="summary-row paid-highlight">
                        <span>Total Paid to Date:</span>
                        <span>Rs. {Number(bill.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div
                        className={`summary-row balance-highlight ${
                          Number(bill.balance_amount) > 0 ? 'has-balance' : 'settled'
                        }`}
                      >
                        <span>Outstanding Balance:</span>
                        <span>Rs. {Number(bill.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {payments.length > 0 && (
                    <div className="payments-history-section">
                      <h4 className="section-subheading">Recorded Payment Transactions</h4>
                      <table className="payments-table">
                        <thead>
                          <tr>
                            <th>Receipt ID</th>
                            <th>Date & Time</th>
                            <th>Payment Method</th>
                            <th>Reference / Notes</th>
                            <th style={{ textAlign: 'right' }}>Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.payment_id}>
                              <td>
                                <strong>REC-{String(p.payment_id).padStart(5, '0')}</strong>
                              </td>
                              <td>{new Date(p.payment_date).toLocaleString()}</td>
                              <td>
                                <span className="badge badge-info">{p.payment_method}</span>
                              </td>
                              <td>
                                <span className="mono-code">{p.transaction_reference || 'Counter Cash'}</span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="invoice-signatures-row">
                    <div className="signature-col">
                      <div className="signature-line" />
                      <p className="signature-role">Patient / Representative Signature</p>
                    </div>
                    <div className="signature-col">
                      <div className="signature-line" />
                      <p className="signature-role">Authorized Officer / Front Desk Stamp</p>
                    </div>
                  </div>

                  <div className="invoice-footer-note">
                    <p>
                      This is a computer-generated commercial document issued by CarePlus Healthcare Systems.
                      For questions regarding this bill, contact our Billing Desk at extension 104.
                    </p>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DOCUMENT 2: CASHIER PAYMENT RECEIPT (80mm THERMAL SLIP)
                  ========================================================================= */}
              {docType === 'receipt' && (
                <div className="thermal-receipt-container">
                  <div className="thermal-header">
                    <h2 className="thermal-title">CAREPLUS HOSPITAL</h2>
                    <p className="thermal-sub">Colombo 07, Sri Lanka</p>
                    <p className="thermal-sub">Tel: +94 11 234-5678</p>
                    <p className="thermal-stars">********************************</p>
                    <h3 className="thermal-type">CASHIER PAYMENT RECEIPT</h3>
                    <p className="thermal-stars">********************************</p>
                  </div>

                  <div className="thermal-meta">
                    <div className="thermal-row">
                      <span>Receipt No:</span>
                      <strong>{receiptNumber}</strong>
                    </div>
                    <div className="thermal-row">
                      <span>Invoice Ref:</span>
                      <strong>{invoiceNumber}</strong>
                    </div>
                    <div className="thermal-row">
                      <span>Date/Time:</span>
                      <span>{paymentDate} {paymentTime}</span>
                    </div>
                    <div className="thermal-row">
                      <span>Patient:</span>
                      <strong>{bill.patient_name}</strong>
                    </div>
                    <div className="thermal-row">
                      <span>Code:</span>
                      <span>{bill.patient_code}</span>
                    </div>
                    <div className="thermal-row">
                      <span>Cashier:</span>
                      <span>{bill.receptionist_name || 'Front Desk'}</span>
                    </div>
                  </div>

                  <p className="thermal-stars">--------------------------------</p>

                  <div className="thermal-receipt-body">
                    <div className="thermal-row bold-row" style={{ fontSize: 14, margin: '6px 0' }}>
                      <span>AMOUNT RECEIVED:</span>
                      <span style={{ color: '#000', fontWeight: 900 }}>
                        Rs. {Number(activePayment?.amount || bill.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="thermal-row">
                      <span>Paid Via:</span>
                      <strong>{activePayment?.payment_method || 'Cash'}</strong>
                    </div>
                    {activePayment?.transaction_reference && (
                      <div className="thermal-row">
                        <span>Ref / Auth:</span>
                        <span>{activePayment.transaction_reference}</span>
                      </div>
                    )}
                    <p className="thermal-stars">--------------------------------</p>
                    <div className="thermal-row">
                      <span>Total Invoice:</span>
                      <span>Rs. {Number(bill.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="thermal-row">
                      <span>Total Paid:</span>
                      <span>Rs. {Number(bill.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="thermal-row bold-row" style={{ marginTop: 4 }}>
                      <span>REMAINING BALANCE:</span>
                      <span>Rs. {Number(bill.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <p className="thermal-stars">********************************</p>

                  <div className="thermal-footer">
                    <p className="thermal-status-pill">
                      STATUS: {bill.payment_status?.toUpperCase()}
                    </p>

                    {/* AUTHENTIC CODE 39 BARCODE (80mm COMPACT) */}
                    <div className="thermal-barcode-box" style={{ margin: '10px auto', maxWidth: '240px' }}>
                      <Barcode
                        value={receiptNumber}
                        height={34}
                        narrowWidth={1.0}
                        wideRatio={2.4}
                        showText={true}
                      />
                    </div>

                    <p className="thermal-thanks">~ Thank You for Visiting CarePlus ~</p>
                    <p className="thermal-tiny">Please retain this slip for insurance & follow-up</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER BAR (HIDDEN ON PRINT) */}
        <div
          className="modal-footer no-print"
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--slate-200)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <span style={{ fontSize: 12, color: '#64748b' }}>
            CarePlus Hospital Billing · Press <kbd style={{ padding: '2px 6px', background: '#e2e8f0', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>Esc</kbd> to close
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                padding: '6px 14px',
                borderColor: '#cbd5e1',
                color: '#334155',
                cursor: 'pointer',
              }}
              onClick={onClose}
            >
              <X size={15} />
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                padding: '6px 16px',
              }}
              onClick={handlePrint}
            >
              <Printer size={15} />
              Print Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableInvoiceModal;
