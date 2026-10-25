import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Clock, 
  X, 
  AlertCircle, 
  Ban, 
  Printer, 
  FileText,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

const PharmacyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // View & Dispense state
  const [selected, setSelected] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [items, setItems] = useState([]);
  const [computedTotal, setComputedTotal] = useState(0);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [pharmacistNotes, setPharmacistNotes] = useState('');

  // Cancel / Reject state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Printable Receipt state
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (date) params.append('date', date);
    if (search) params.append('search', search);

    API.get(`/pharmacy/prescriptions?${params.toString()}`)
      .then(r => setPrescriptions(r.data.data || []))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load prescriptions');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter, date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const viewItems = async (id, openReceipt = false) => {
    setSelected(id);
    setLoadingItems(true);
    setPharmacistNotes('');
    try {
      const r = await API.get(`/pharmacy/prescriptions/${id}`);
      setItems(r.data.data || []);
      setSelectedPrescription(r.data.prescription || null);
      setComputedTotal(r.data.computed_total || 0);

      if (openReceipt) {
        setShowReceiptModal(true);
      } else {
        setShowModal(true);
      }
    } catch (err) {
      toast.error('Failed to load prescription items');
    } finally {
      setLoadingItems(false);
    }
  };

  const dispense = async (id) => {
    setDispensing(true);
    try {
      await API.post(`/pharmacy/prescriptions/${id}/dispense`, {
        notes: pharmacistNotes
      });
      toast.success('Prescription dispensed successfully! Status synced with doctor.');
      setShowModal(false);
      setPharmacistNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispense');
    } finally {
      setDispensing(false);
    }
  };

  const handleCancelPrescription = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.warning('Please enter a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      await API.put(`/pharmacy/prescriptions/${selected}/cancel`, {
        reason: cancelReason
      });
      toast.success('Prescription cancelled successfully.');
      setShowCancelModal(false);
      setShowModal(false);
      setCancelReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel prescription');
    } finally {
      setCancelling(false);
    }
  };

  const triggerPrintReceipt = () => {
    window.print();
  };

  const StatusBadge = ({ s }) => {
    const m = { Pending: 'badge-warning', Dispensed: 'badge-success', Cancelled: 'badge-danger' };
    return <span className={`badge ${m[s] || 'badge-gray'}`}>{s}</span>;
  };

  const hasInsufficientStock = items.some(item => !item.in_stock);

  return (
    <DashboardLayout 
      title="Prescriptions Dispensing Queue"
      subtitle="Fulfill clinical prescriptions, perform stock validation, and communicate fulfillment notes to physicians"
    >
      {/* FILTER CONTROLS */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Pending', 'Dispensed', 'Cancelled', 'ALL'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All Statuses' : s}
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
                Clear Date
              </button>
            )}
            <input
              type="text"
              className="form-control"
              style={{ width: 220 }}
              placeholder="Search patient / doctor / Rx ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>

      {/* PRESCRIPTIONS TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map(p => (
                <tr key={p.prescription_id}>
                  <td>#{p.prescription_id}</td>
                  <td>
                    <strong>{p.patient_name}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {p.patient_code} {p.blood_group ? `· Blood: ${p.blood_group}` : ''}
                    </span>
                    {p.allergies && (
                      <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>
                        ⚠️ Allergy: {p.allergies}
                      </div>
                    )}
                  </td>
                  <td>Dr. {p.doctor_name}</td>
                  <td>{p.prescription_date ? p.prescription_date.split('T')[0] : '—'}</td>
                  <td>{p.total_items} items</td>
                  <td>
                    <strong style={{ color: 'var(--primary-600)' }}>
                      Rs. {Number(p.total_cost).toLocaleString()}
                    </strong>
                  </td>
                  <td><StatusBadge s={p.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => viewItems(p.prescription_id, false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        title="View Prescription Items & Details"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      {p.status === 'Dispensed' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewItems(p.prescription_id, true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                          title="Print Dispensing Slip / Receipt"
                        >
                          <Printer size={13} />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !prescriptions.length && (
            <div className="empty-state">
              <span className="empty-state-icon">💊</span>
              <h4>No {statusFilter === 'ALL' ? '' : statusFilter} prescriptions</h4>
              <p>The queue is currently clear.</p>
            </div>
          )}
        </div>
      </div>

      {/* PRESCRIPTION DETAILS & DISPENSE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 820 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>💊 Prescription #{selected} Details</span>
                </h3>
                {selectedPrescription && (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '4px 0 0' }}>
                    Patient: <strong>{selectedPrescription.patient_name}</strong> ({selectedPrescription.patient_code || 'N/A'}) · Prescribed by: <strong>Dr. {selectedPrescription.doctor_name}</strong>
                  </p>
                )}
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <span className="spinner-large" />
                  <p style={{ marginTop: 10, color: 'var(--gray-500)' }}>Verifying inventory levels...</p>
                </div>
              ) : (
                <>
                  {/* Patient Allergies Alert if reported */}
                  {(selectedPrescription?.allergies || items[0]?.allergies) && (
                    <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={16} />
                      <span><strong>Patient Allergy Alert:</strong> Known sensitivity to <u>{selectedPrescription?.allergies || items[0]?.allergies}</u></span>
                    </div>
                  )}

                  {/* Doctor Notes if reported */}
                  {(selectedPrescription?.notes || items[0]?.notes) && (
                    <div style={{ padding: '8px 14px', background: 'var(--primary-50)', borderLeft: '3px solid var(--primary-500)', borderRadius: 4, marginBottom: 14, fontSize: 12, color: 'var(--primary-800)', whiteSpace: 'pre-line' }}>
                      <strong>Physician / Clinic Note:</strong> {selectedPrescription?.notes || items[0]?.notes}
                    </div>
                  )}

                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Form</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Qty</th>
                          <th>Stock Check</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <strong>{item.medicine_name}</strong>
                              <br />
                              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{item.strength}</span>
                              {item.instructions && (
                                <div style={{ fontSize: 10, color: 'var(--primary-700)', marginTop: 2 }}>
                                  ℹ️ {item.instructions}
                                </div>
                              )}
                            </td>
                            <td>{item.dosage_form}</td>
                            <td>{item.dosage || '—'}</td>
                            <td>{item.frequency || '—'}</td>
                            <td>{item.duration || '—'}</td>
                            <td><strong>{item.quantity}</strong></td>
                            <td>
                              {item.in_stock ? (
                                <span
                                  className="badge badge-success"
                                  title={`${item.stock_quantity ?? 0} units available in stock`}
                                >
                                  ✓ In Stock ({item.stock_quantity})
                                </span>
                              ) : (
                                <span
                                  className="badge badge-danger"
                                  title={`Only ${item.stock_quantity ?? 0} units available, required ${item.quantity}`}
                                >
                                  ⚠️ Low ({item.stock_quantity ?? 0} avail)
                                </span>
                              )}
                            </td>
                            <td>Rs. {Number(item.total_price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* INSUFFICIENT STOCK WARNING BANNER */}
                  {hasInsufficientStock && selectedPrescription?.status === 'Pending' && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Insufficient Stock Alert:</strong> One or more prescribed medications exceed current inventory.
                        Restock the affected items before dispensing this prescription.
                      </div>
                    </div>
                  )}

                  {/* Pharmacist Fulfillment Notes Input */}
                  {selectedPrescription?.status === 'Pending' && !hasInsufficientStock && (
                    <div style={{ marginTop: 16, background: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', display: 'block', marginBottom: 4 }}>
                        💬 Pharmacist Dispensing Notes (Logged in stock audit & synced to physician)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Dispensed generic brand, advised to take with food, counseled on side effects..."
                        value={pharmacistNotes}
                        onChange={e => setPharmacistNotes(e.target.value)}
                      />
                    </div>
                  )}

                  {/* ACTION FOOTER */}
                  <div
                    style={{
                      marginTop: 20,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--slate-100)',
                      paddingTop: 16,
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Calculated Total (fn_prescription_total): </span>
                      <strong style={{ fontSize: 16, color: 'var(--primary-700)' }}>
                        Rs. {Number(computedTotal || selectedPrescription?.total_cost || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {selectedPrescription?.status === 'Pending' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => {
                              setCancelReason('');
                              setShowCancelModal(true);
                            }}
                            title="Cancel / Reject this Prescription"
                          >
                            <Ban size={14} />
                            <span>Cancel / Reject</span>
                          </button>

                          <button
                            className={`btn ${hasInsufficientStock ? 'btn-secondary' : 'btn-success'}`}
                            onClick={() => dispense(selected)}
                            disabled={hasInsufficientStock || dispensing}
                            title={hasInsufficientStock ? 'Cannot dispense: Insufficient stock' : 'Dispense Prescription'}
                          >
                            {dispensing ? (
                              'Dispensing...'
                            ) : hasInsufficientStock ? (
                              '⚠️ Cannot Dispense (Insufficient Stock)'
                            ) : (
                              '✅ Dispense Prescription'
                            )}
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`badge ${selectedPrescription?.status === 'Dispensed' ? 'badge-success' : 'badge-danger'}`}>
                            {selectedPrescription?.status}
                          </span>
                          {selectedPrescription?.status === 'Dispensed' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setShowModal(false);
                                setShowReceiptModal(true);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <Printer size={14} />
                              <span>Print Receipt</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL / REJECT PRESCRIPTION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCancelModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                <Ban size={20} />
                <span>Reject / Cancel Prescription #{selected}</span>
              </h3>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCancelPrescription}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
                  Are you sure you want to cancel this prescription? This will set status to <strong>Cancelled</strong> and update the clinical notes.
                </p>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Reason for Cancellation <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="e.g. Patient refused medication, drug allergy alert, duplicated order by physician..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCancelModal(false)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={cancelling}
                  style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT / DISPENSING SLIP MODAL */}
      {showReceiptModal && selectedPrescription && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReceiptModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} />
                <span>Official Pharmacy Dispensing Receipt</span>
              </h3>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}>✕</button>
            </div>

            <div className="modal-body" id="printable-pharmacy-receipt">
              {/* Slip Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid var(--slate-200)', paddingBottom: 14, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--primary-700)' }}>
                  🏥 HEALIX GENERAL HOSPITAL
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-600)' }}>
                  Outpatient Pharmacy Department · Main Hospital Complex
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gray-500)' }}>
                  Phone: +94 11 234 5678 · Email: pharmacy@healix.lk
                </p>
                <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', background: 'var(--primary-50)', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'var(--primary-800)' }}>
                  OFFICIAL DISPENSING SLIP · RX #{selectedPrescription.prescription_id}
                </div>
              </div>

              {/* Patient & Doctor Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--slate-50)', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--gray-500)' }}>Patient:</div>
                  <strong style={{ fontSize: 13 }}>{selectedPrescription.patient_name}</strong>
                  <div>Code: {selectedPrescription.patient_code || 'N/A'}</div>
                  {selectedPrescription.patient_phone && <div>Tel: {selectedPrescription.patient_phone}</div>}
                </div>
                <div>
                  <div style={{ color: 'var(--gray-500)' }}>Prescribed By:</div>
                  <strong style={{ fontSize: 13 }}>Dr. {selectedPrescription.doctor_name}</strong>
                  <div>Spec: {selectedPrescription.specialization || 'General Practice'}</div>
                  <div>Date: {selectedPrescription.prescription_date ? selectedPrescription.prescription_date.split('T')[0] : '—'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--slate-300)', textAlign: 'left', background: 'var(--slate-100)' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Medicine & Dosage</th>
                    <th style={{ padding: '6px 8px' }}>Instructions</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <strong>{it.medicine_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                          {it.dosage_form} · {it.strength || ''} · {it.dosage || ''} ({it.frequency || ''})
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--gray-600)' }}>
                        {it.instructions || it.duration || 'Take as directed'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><strong>{it.quantity}</strong></td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs. {Number(it.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs. {Number(it.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cost Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <div style={{ width: 240, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-200)' }}>
                    <span>Subtotal:</span>
                    <span>Rs. {Number(computedTotal || selectedPrescription.total_cost).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-200)' }}>
                    <span>Dispensing Fee:</span>
                    <span>Rs. 0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, fontSize: 15, color: 'var(--primary-700)' }}>
                    <span>Grand Total:</span>
                    <span>Rs. {Number(computedTotal || selectedPrescription.total_cost).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30, paddingTop: 14, borderTop: '1px dashed var(--slate-300)', fontSize: 11, textAlign: 'center' }}>
                <div>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: '1px solid var(--slate-400)', paddingTop: 4 }}>
                    Pharmacist Signature & Stamp
                  </div>
                </div>
                <div>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: '1px solid var(--slate-400)', paddingTop: 4 }}>
                    Patient / Guardian Signature
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReceiptModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={triggerPrintReceipt}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={14} />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PharmacyPrescriptions;
