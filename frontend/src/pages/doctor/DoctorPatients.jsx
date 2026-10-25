import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, X, Trash2, Pill, CheckCircle2, AlertTriangle, FileText, Calendar, Clock, Save, Bed } from 'lucide-react';

const MEDICAL_FREQUENCIES = [
  { value: 'OD (Once daily)', label: 'OD — Once daily' },
  { value: 'BD (Twice daily)', label: 'BD — Twice daily' },
  { value: 'TDS (Three times daily)', label: 'TDS — Three times daily' },
  { value: 'QDS (Four times daily)', label: 'QDS — Four times daily' },
  { value: 'PRN (As needed)', label: 'PRN — As needed' },
  { value: 'HS (At bedtime)', label: 'HS — At bedtime' },
  { value: 'Q4H (Every 4 hours)', label: 'Q4H — Every 4 hours' },
  { value: 'Q6H (Every 6 hours)', label: 'Q6H — Every 6 hours' },
  { value: 'Q8H (Every 8 hours)', label: 'Q8H — Every 8 hours' },
  { value: 'STAT (Immediate)', label: 'STAT — Immediate single dose' },
  { value: 'Weekly', label: 'Weekly' },
];

const DoctorPatients = () => {
  const [appts, setAppts]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory]   = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord]     = useState({
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    follow_up_date: '',
    notes: '',
    medicines: []
  });

  // Doctor Admission Order States
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitPatient, setAdmitPatient] = useState(null);
  const [submittingAdmit, setSubmittingAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    ward_category: 'General',
    priority: 'Routine',
    reason: '',
    instructions: ''
  });

  useEffect(() => {
    API.get('/doctor/appointments')
      .then(r => {
        const unique = Object.values((r.data.data || []).reduce((acc, a) => {
          if (a.patient_id && !acc[a.patient_id]) acc[a.patient_id] = a;
          return acc;
        }, {}));
        setAppts(unique);
      })
      .finally(() => setLoading(false));

    // Fetch active medicines with stock levels from dispensary
    API.get('/pharmacy/medicines')
      .then(r => setMedicines(r.data.data || []))
      .catch(err => {
        console.error('Failed to load medicines catalog:', err);
      });
  }, []);

  const viewHistory = async (patientId) => {
    try {
      const r = await API.get(`/doctor/patients/${patientId}/history`);
      setHistory(r.data.data);
      setShowModal(true);
    } catch {
      toast.error('Could not load patient history');
    }
  };

  const openPrescribeModal = (patient) => {
    setSelected(patient);
    setRecord({
      diagnosis: '',
      symptoms: '',
      treatment_plan: '',
      follow_up_date: '',
      notes: '',
      medicines: [
        {
          medicine_id: '',
          dosage: '1 tablet',
          frequency: 'BD (Twice daily)',
          duration: '5 days',
          quantity: 10
        }
      ]
    });
    setShowRecordModal(true);
  };

  const addMedLine = () => {
    setRecord(r => ({
      ...r,
      medicines: [
        ...r.medicines,
        {
          medicine_id: '',
          dosage: '1 tablet',
          frequency: 'BD (Twice daily)',
          duration: '5 days',
          quantity: 10
        }
      ]
    }));
  };

  const setMed = (i, k, v) => {
    setRecord(r => ({
      ...r,
      medicines: r.medicines.map((m, idx) => (idx === i ? { ...m, [k]: v } : m))
    }));
  };

  const removeMed = (i) => {
    setRecord(r => ({
      ...r,
      medicines: r.medicines.filter((_, idx) => idx !== i)
    }));
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    if (!selected) return;

    if (!record.diagnosis.trim()) {
      toast.error('Clinical Diagnosis is required');
      return;
    }

    // Filter valid medicines (where medicine_id is selected)
    const validMeds = record.medicines.filter(m => m.medicine_id && parseInt(m.medicine_id, 10) > 0);

    // Check if any selected medicine is out of stock
    const outOfStockSelected = validMeds.find(m => {
      const med = medicines.find(item => item.medicine_id === parseInt(m.medicine_id, 10));
      return med && med.stock_quantity === 0;
    });

    if (outOfStockSelected) {
      const med = medicines.find(item => item.medicine_id === parseInt(outOfStockSelected.medicine_id, 10));
      toast.error(`Cannot prescribe ${med?.medicine_name}: Currently out of stock in pharmacy.`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/doctor/records', {
        patient_id: selected.patient_id,
        appointment_id: selected.appointment_id || null,
        diagnosis: record.diagnosis.trim(),
        symptoms: record.symptoms?.trim() || '',
        treatment_plan: record.treatment_plan?.trim() || '',
        follow_up_date: record.follow_up_date || null,
        record_notes: record.notes?.trim() || '',
        presc_notes: record.notes?.trim() || '',
        medicine_ids: validMeds.map(m => parseInt(m.medicine_id, 10)),
        quantities:   validMeds.map(m => parseInt(m.quantity, 10) || 1),
        dosages:      validMeds.map(m => m.dosage || 'Standard'),
        frequencies:  validMeds.map(m => m.frequency || 'OD (Once daily)'),
        durations:    validMeds.map(m => m.duration || '5 days'),
      });
      toast.success('Prescription & Medical Record saved! Sent to Dispensary.');
      setShowRecordModal(false);
      setRecord({ diagnosis: '', symptoms: '', treatment_plan: '', follow_up_date: '', notes: '', medicines: [] });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save medical record');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdmitModal = (patient) => {
    setAdmitPatient(patient);
    setAdmitForm({
      ward_category: 'General',
      priority: 'Routine',
      reason: patient.reason && !patient.reason.startsWith('[ADMISSION ORDER') ? patient.reason : '',
      instructions: ''
    });
    setShowAdmitModal(true);
  };

  const submitAdmitOrder = async (e) => {
    e.preventDefault();
    if (!admitPatient) return;

    if (!admitForm.reason.trim()) {
      toast.error('Clinical admission reason / diagnosis is required');
      return;
    }

    setSubmittingAdmit(true);
    try {
      const res = await API.post('/doctor/admission-order', {
        patient_id: admitPatient.patient_id,
        ward_category: admitForm.ward_category,
        priority: admitForm.priority,
        reason: admitForm.reason.trim(),
        instructions: admitForm.instructions.trim()
      });

      toast.success(res.data.message || 'Inpatient admission order successfully placed! Sent to receptionist intake.');
      setShowAdmitModal(false);
      setAdmitPatient(null);
      setAdmitForm({ ward_category: 'General', priority: 'Routine', reason: '', instructions: '' });

      // Refresh list to show updated appointments
      API.get('/doctor/appointments')
        .then(r => {
          const unique = Object.values((r.data.data || []).reduce((acc, a) => {
            if (a.patient_id && !acc[a.patient_id]) acc[a.patient_id] = a;
            return acc;
          }, {}));
          setAppts(unique);
        });
    } catch (err) {
      console.error('Failed to submit admission order:', err);
      toast.error(err.response?.data?.message || 'Failed to submit admission order');
    } finally {
      setSubmittingAdmit(false);
    }
  };

  return (
    <DashboardLayout 
      title="Assigned Patients & Consultations"
      subtitle="Review patient charts, diagnostic histories, and issue digital prescriptions"
    >
      <div className="card">
        <div className="card-header">
          <h3>👤 Patient Directory ({appts.length})</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Age</th>
                  <th>Blood Group</th>
                  <th>Last Visit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appts.map(a => (
                  <tr key={a.patient_id}>
                    <td><strong>{a.patient_name}</strong></td>
                    <td>{a.phone}</td>
                    <td>{a.age || '—'}</td>
                    <td><span className="badge badge-danger">{a.blood_group || '—'}</span></td>
                    <td>{a.appointment_date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => viewHistory(a.patient_id)}>
                          📋 History
                        </button>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => openPrescribeModal(a)}
                        >
                          + Prescribe
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1.5px solid #a7f3d0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#059669';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.borderColor = '#059669';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#ecfdf5';
                            e.currentTarget.style.color = '#059669';
                            e.currentTarget.style.borderColor = '#a7f3d0';
                          }}
                          onClick={() => openAdmitModal(a)}
                          title="Create Doctor's Inpatient Admission Order"
                        >
                          <Bed size={14} />
                          <span>Admit Patient</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !appts.length && (
              <div className="empty-state">
                <span className="empty-state-icon">👤</span>
                <h4>No patients assigned</h4>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient History Modal */}
      {showModal && history && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3>📋 Patient Medical History — {history.patient?.first_name} {history.patient?.last_name}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {history.patient && (
                <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div><span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Age</span><br /><strong>{history.patient.age || '—'} yrs</strong></div>
                  <div><span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Blood Group</span><br /><strong style={{ color: 'var(--danger)' }}>{history.patient.blood_group || '—'}</strong></div>
                  <div><span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Allergies</span><br /><strong style={{ color: history.patient.allergies ? 'var(--danger)' : 'var(--gray-700)' }}>{history.patient.allergies || 'None Reported'}</strong></div>
                  <div><span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Contact Phone</span><br /><strong>{history.patient.phone}</strong></div>
                </div>
              )}
              <h4 style={{ marginBottom: 12, color: 'var(--slate-800)' }}>Prior Consultations ({history.records?.length || 0})</h4>
              {(history.records || []).map(r => (
                <div key={r.record_id} style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{r.diagnosis}</strong>
                    <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '4px 0' }}>Symptoms: {r.symptoms}</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '4px 0' }}>Treatment Plan: {r.treatment_plan}</p>
                  {r.doctor_name && <p style={{ fontSize: 12, color: 'var(--primary-600)', marginTop: 4 }}>Prescribed by: Dr. {r.doctor_name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Record & Digital Prescription Modal */}
      {showRecordModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowRecordModal(false)}
        >
          <div 
            className="modal" 
            style={{ 
              maxWidth: 860, 
              height: '90vh', 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
          >
            {/* PINNED MODAL HEADER */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill className="text-primary" size={20} />
                  <span>Clinical Consultation & e-Prescription</span>
                </h3>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '3px 0 0' }}>
                  Patient: <strong>{selected?.patient_name}</strong> · Blood: <strong>{selected?.blood_group || 'N/A'}</strong>
                </p>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowRecordModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM CONTAINER WITH FLEXBOX TO ENSURE FOOTER IS ALWAYS VISIBLE */}
            <form 
              onSubmit={submitRecord} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                flex: 1, 
                minHeight: 0, 
                overflow: 'hidden', 
                margin: 0 
              }}
            >
              {/* SCROLLABLE MODAL BODY */}
              <div 
                className="modal-body" 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  minHeight: 0, 
                  padding: '20px 24px' 
                }}
              >
                <div className="form-group">
                  <label className="form-label">Clinical Diagnosis *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Type 2 Diabetes Mellitus / Essential Hypertension"
                    value={record.diagnosis}
                    onChange={e => setRecord(r => ({ ...r, diagnosis: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Presenting Symptoms</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Symptoms reported by patient..."
                      value={record.symptoms}
                      onChange={e => setRecord(r => ({ ...r, symptoms: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Treatment Plan & Directives</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Clinical plan, dietary changes, monitoring..."
                      value={record.treatment_plan}
                      onChange={e => setRecord(r => ({ ...r, treatment_plan: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Follow-up Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={record.follow_up_date}
                      onChange={e => setRecord(r => ({ ...r, follow_up_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Notes / Dispensing Instructions</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Take with warm water after meals"
                      value={record.notes}
                      onChange={e => setRecord(r => ({ ...r, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {/* PRESCRIPTION ITEMS SECTION */}
                <div style={{ marginTop: 14, paddingTop: 16, borderTop: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <label className="form-label" style={{ margin: 0, fontSize: 14 }}>
                        💊 Prescribed Medications (Dispensary Stock Checked)
                      </label>
                      <p style={{ fontSize: 11.5, color: 'var(--gray-500)', margin: '2px 0 0' }}>
                        Real-time live inventory levels from pharmacy are shown in the dropdown
                      </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addMedLine}>
                      + Add Medicine
                    </button>
                  </div>

                  {record.medicines.map((m, i) => {
                    const selectedMed = medicines.find(item => item.medicine_id === parseInt(m.medicine_id, 10));
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          background: 'var(--slate-50)', 
                          border: '1px solid var(--slate-200)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '12px 14px', 
                          marginBottom: 10 
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 1fr 0.8fr auto', gap: 10, alignItems: 'center' }}>
                          {/* 1. Medicine Dropdown with Stock Levels */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Medicine & Live Stock *
                            </label>
                            <select
                              className="form-control"
                              value={m.medicine_id}
                              onChange={e => setMed(i, 'medicine_id', e.target.value)}
                              required
                            >
                              <option value="">Select Medicine</option>
                              {medicines.map(med => (
                                <option
                                  key={med.medicine_id}
                                  value={med.medicine_id}
                                  disabled={med.stock_quantity === 0}
                                >
                                  {med.medicine_name} ({med.dosage_form}) — {med.stock_quantity > 0 ? `${med.stock_quantity} in stock` : 'OUT OF STOCK'}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Dosage */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Dosage
                            </label>
                            <input
                              className="form-control"
                              placeholder="e.g. 500mg / 1 tab"
                              value={m.dosage}
                              onChange={e => setMed(i, 'dosage', e.target.value)}
                            />
                          </div>

                          {/* 3. Frequency Dropdown with Standard Medical Frequencies */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Frequency *
                            </label>
                            <select
                              className="form-control"
                              value={m.frequency}
                              onChange={e => setMed(i, 'frequency', e.target.value)}
                              required
                            >
                              {MEDICAL_FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 4. Duration */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Duration
                            </label>
                            <input
                              className="form-control"
                              placeholder="e.g. 5 days"
                              value={m.duration}
                              onChange={e => setMed(i, 'duration', e.target.value)}
                            />
                          </div>

                          {/* 5. Quantity */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Qty *
                            </label>
                            <input
                              className="form-control"
                              type="number"
                              min={1}
                              value={m.quantity}
                              onChange={e => setMed(i, 'quantity', e.target.value)}
                              required
                            />
                          </div>

                          {/* 6. Remove Button */}
                          <div style={{ paddingTop: 18 }}>
                            <button
                              type="button"
                              onClick={() => removeMed(i)}
                              className="modal-close"
                              style={{ color: 'var(--danger)', width: 34, height: 34 }}
                              title="Remove medication"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Stock status indicator badge */}
                        {selectedMed && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 11.5 }}>
                            <span className={`badge ${selectedMed.stock_quantity > selectedMed.reorder_level ? 'badge-success' : selectedMed.stock_quantity > 0 ? 'badge-warning' : 'badge-danger'}`}>
                              {selectedMed.stock_quantity > 0 ? `✓ Available Stock: ${selectedMed.stock_quantity} units` : '⚠️ Out of Stock'}
                            </span>
                            <span style={{ color: 'var(--slate-500)' }}>
                              Unit Price: Rs. {Number(selectedMed.unit_price).toFixed(2)} · Category: {selectedMed.category}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!record.medicines.length && (
                    <div style={{ padding: '16px', textAlign: 'center', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)' }}>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
                        No medications added yet. Click <strong>+ Add Medicine</strong> to prescribe drugs from inventory.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ALWAYS PINNED VISIBLE MODAL FOOTER */}
              <div 
                className="modal-footer" 
                style={{ 
                  flexShrink: 0, 
                  background: '#ffffff', 
                  borderTop: '1px solid var(--slate-200)', 
                  padding: '16px 24px', 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  alignItems: 'center',
                  gap: 12,
                  zIndex: 10
                }}
              >
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRecordModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 200, justifyContent: 'center' }}
                >
                  <Save size={16} />
                  <span>{submitting ? 'Saving Prescription...' : 'Save & Prescribe'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Inpatient Admission Order Modal */}
      {showAdmitModal && admitPatient && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && !submittingAdmit && setShowAdmitModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 680,
              width: '100%',
              maxHeight: 'calc(100vh - 40px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: 14,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#059669',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Bed size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Doctor's Inpatient Admission Order
                    <span style={{ fontSize: 11, background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      CLINICAL DIRECTIVE
                    </span>
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#047857' }}>
                    Authorizes patient hospital admission and auto-fills receptionist bed intake
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAdmitModal(false)}
                disabled={submittingAdmit}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div
              className="modal-body"
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {/* Patient Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Patient Name</span>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{admitPatient.patient_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Age & Gender</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    {admitPatient.age ? `${admitPatient.age} yrs` : 'Adult'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Blood Group</span>
                  <div style={{ marginTop: 2 }}>
                    <span className="badge badge-danger" style={{ fontSize: 11, padding: '2px 8px', fontWeight: 800 }}>
                      {admitPatient.blood_group || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact Phone</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>{admitPatient.phone || 'N/A'}</div>
                </div>
              </div>

              <form id="admit-patient-order-form" onSubmit={submitAdmitOrder}>
                {/* 1. WARD CATEGORY SELECTION */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recommended Ward Category *</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Select intended clinical environment</span>
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                      gap: 10
                    }}
                  >
                    {[
                      { id: 'General', label: 'General', desc: 'Medical / Surgical', icon: '🏥' },
                      { id: 'ICU', label: 'ICU', desc: 'Critical Care Unit', icon: '⚡' },
                      { id: 'Pediatric', label: 'Pediatric', desc: 'Child & Neonatal', icon: '🧸' },
                      { id: 'Maternity', label: 'Maternity', desc: 'Obstetric Care', icon: '👶' },
                      { id: 'Private', label: 'Private', desc: 'Deluxe Single Suite', icon: '⭐' }
                    ].map(w => {
                      const isSelected = admitForm.ward_category === w.id;
                      return (
                        <div
                          key={w.id}
                          onClick={() => setAdmitForm(f => ({ ...f, ward_category: w.id }))}
                          style={{
                            border: `2px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            borderRadius: 10,
                            padding: '10px 8px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: 20, marginBottom: 2 }}>{w.icon}</div>
                          <div style={{ fontWeight: 800, fontSize: 12.5, color: isSelected ? '#065f46' : '#1e293b' }}>
                            {w.label}
                          </div>
                          <div style={{ fontSize: 10, color: isSelected ? '#047857' : '#64748b', marginTop: 2 }}>
                            {w.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ADMISSION PRIORITY */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Triage Priority *</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Bed allocation urgency</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { id: 'Routine', label: 'Routine', badge: 'Standard Admission', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', desc: 'Scheduled / stable observation' },
                      { id: 'Urgent', label: 'Urgent', badge: 'Admit in 2-4 Hours', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Acute exacerbation / close monitoring' },
                      { id: 'Emergency', label: 'Emergency', badge: 'Immediate STAT Bed', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', desc: 'Life-threatening / critical transfer' }
                    ].map(p => {
                      const isSelected = admitForm.priority === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setAdmitForm(f => ({ ...f, priority: p.id }))}
                          style={{
                            border: `2px solid ${isSelected ? p.color : '#e2e8f0'}`,
                            background: isSelected ? p.bg : '#ffffff',
                            borderRadius: 10,
                            padding: '12px 10px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? `0 2px 8px ${p.border}` : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ fontSize: 13, color: isSelected ? p.color : '#1e293b' }}>
                              {p.label}
                            </strong>
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                border: `2px solid ${isSelected ? p.color : '#cbd5e1'}`,
                                background: isSelected ? p.color : 'transparent',
                                display: 'inline-block'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: p.color, marginBottom: 2 }}>
                            {p.badge}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {p.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. CLINICAL ADMISSION REASON / DIAGNOSIS */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                    Clinical Admission Reason / Diagnosis *
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={admitForm.reason}
                    onChange={e => setAdmitForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Enter comprehensive clinical diagnosis, pathology, or indication warranting inpatient admission..."
                    required
                    style={{ fontSize: 13, borderRadius: 8, padding: '10px 12px' }}
                  />
                  {/* Quick Preset Indications */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Quick Presets:</span>
                    {[
                      'Acute Severe Asthma Exacerbation',
                      'Post-Operative Inpatient Recovery & Vitals Monitoring',
                      'Severe Dehydration / IV Hydration & Electrolyte Correction',
                      'Community Acquired Pneumonia requiring IV Antibiotics',
                      'Unstable Angina / Cardiovascular Telemetry Monitoring',
                      'Acute Abdomen / Pre-Surgical Inpatient Evaluation'
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, height: 'auto', lineHeight: 1.2, borderColor: '#cbd5e1', color: '#334155' }}
                        onClick={() => setAdmitForm(f => ({ ...f, reason: preset }))}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. INITIAL INSTRUCTIONS FOR WARD STAFF */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Initial Instructions for Ward Nursing Staff</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Immediate care directives</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={admitForm.instructions}
                    onChange={e => setAdmitForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="e.g., Secure 18G IV cannula, commence Normal Saline 500ml @ 100ml/hr, continuous pulse oximetry, check vitals q2h, strict intake/output charting, keep NPO until surgical review..."
                    style={{ fontSize: 13, borderRadius: 8, padding: '10px 12px' }}
                  />
                  {/* Quick Instructions Suggestions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Quick Suggestions:</span>
                    {[
                      'Strict vitals q2h & continuous O2 saturation monitoring',
                      'Establish 18G IV line & initiate IV fluid hydration',
                      'Keep strict NPO pending consultant rounds & imaging',
                      'Strict fluid balance chart & hourly urine output recording',
                      'Fall risk precautions & bedside cardiac telemetry'
                    ].map(sugg => (
                      <button
                        key={sugg}
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, height: 'auto', lineHeight: 1.2, borderColor: '#cbd5e1', color: '#475569' }}
                        onClick={() => setAdmitForm(f => ({
                          ...f,
                          instructions: f.instructions ? `${f.instructions}. ${sugg}` : sugg
                        }))}
                      >
                        + {sugg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receptionist Integration Note Banner */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                    color: '#1e40af'
                  }}
                >
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <div>
                    <strong>Receptionist Workflow Integration:</strong> Submitting this order will immediately register a clinical admission order under your name. When the receptionist opens <strong>Patient Ward Admission Intake</strong>, your name, ward recommendation ({admitForm.ward_category}), priority ({admitForm.priority}), and diagnosis will automatically pre-fill via the <strong>⚡ Auto-Fill Doctor Order</strong> system.
                  </div>
                </div>
              </form>
            </div>

            {/* Pinned Modal Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAdmitModal(false)}
                disabled={submittingAdmit}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admit-patient-order-form"
                className="btn btn-primary"
                disabled={submittingAdmit || !admitForm.reason.trim()}
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                <Bed size={16} />
                <span>{submittingAdmit ? 'Placing Admission Order...' : '⚡ Create Admission Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorPatients;
