import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Pill,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Stethoscope,
  Activity,
  AlertCircle
} from 'lucide-react';
import API from '../../api/axios';

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
  { value: 'Weekly', label: 'Weekly' }
];

const ConsultationsManager = ({ onStatsRefresh }) => {
  // Consultation list state
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auxiliary data for Create modal
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit form state (all six fields)
  const [editForm, setEditForm] = useState({
    chief_complaint: '',
    symptoms: '',
    diagnosis: '',
    treatment_plan: '',
    notes: '',
    follow_up_date: ''
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    patient_id: '',
    appointment_id: '',
    chief_complaint: '',
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    follow_up_date: '',
    notes: '',
    medicines: []
  });

  // Fetch consultations list
  const loadConsultations = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (search.trim()) params.append('search', search.trim());
      if (dateFilter) params.append('date', dateFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await API.get(`/doctor/consultations?${params.toString()}`);
      if (res.data.success) {
        setConsultations(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load consultations:', err);
      toast.error('Could not load consultations directory');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadConsultations(1, pagination.limit);
  }, [dateFilter, startDate, endDate]);

  // Load auxiliary data for Create Consultation modal
  useEffect(() => {
    // 1. Assigned patients from doctor appointments
    API.get('/doctor/appointments')
      .then(res => {
        const unique = Object.values((res.data.data || []).reduce((acc, a) => {
          if (a.patient_id && !acc[a.patient_id]) {
            acc[a.patient_id] = {
              patient_id: a.patient_id,
              patient_name: a.patient_name,
              phone: a.phone,
              age: a.age,
              blood_group: a.blood_group,
              appointment_id: a.appointment_id,
              reason: a.reason
            };
          }
          return acc;
        }, {}));
        setAssignedPatients(unique);
      })
      .catch(err => console.error('Failed to load patients for consultation:', err));

    // 2. Medicine stock levels from pharmacy
    API.get('/pharmacy/medicines')
      .then(res => setMedicines(res.data.data || []))
      .catch(err => console.error('Failed to load medicines:', err));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadConsultations(1, pagination.limit);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDateFilter('');
    setStartDate('');
    setEndDate('');
    // Trigger reload
    setTimeout(() => {
      loadConsultations(1, pagination.limit);
    }, 0);
  };

  // ==========================================
  // DETAIL VIEW MODAL
  // ==========================================
  const openDetailView = async (consultation) => {
    try {
      const res = await API.get(`/doctor/consultations/${consultation.record_id}`);
      if (res.data.success) {
        setViewItem(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load consultation full details');
    }
  };

  // ==========================================
  // EDIT MODAL
  // ==========================================
  const openEditModal = (consultation) => {
    setEditItem(consultation);
    setEditForm({
      chief_complaint: consultation.chief_complaint || '',
      symptoms: consultation.symptoms || '',
      diagnosis: consultation.diagnosis || '',
      treatment_plan: consultation.treatment_plan || '',
      notes: consultation.notes || '',
      follow_up_date: consultation.follow_up_date || ''
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    if (!editForm.diagnosis.trim()) {
      toast.error('Clinical Diagnosis is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.put(`/doctor/consultations/${editItem.record_id}`, editForm);
      if (res.data.success) {
        toast.success('Consultation updated successfully');
        setEditItem(null);
        loadConsultations(pagination.page, pagination.limit);
        if (onStatsRefresh) onStatsRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update consultation');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // DELETE MODAL (SAFE DELETION)
  // ==========================================
  const openDeleteModal = (consultation) => {
    setDeleteItem(consultation);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      const res = await API.delete(`/doctor/consultations/${deleteItem.record_id}`);
      if (res.data.success) {
        toast.success('Consultation record deleted successfully');
        setDeleteItem(null);
        loadConsultations(pagination.page, pagination.limit);
        if (onStatsRefresh) onStatsRefresh();
      }
    } catch (err) {
      console.error('Delete error:', err);
      // Friendly error message displayed cleanly without raw SQL error
      const msg = err.response?.data?.message || 'Cannot delete consultation record';
      toast.error(msg, { autoClose: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // CREATE MODAL (Reusing Consultation & Prescription functionality)
  // ==========================================
  const openCreateModal = () => {
    setCreateForm({
      patient_id: assignedPatients.length ? assignedPatients[0].patient_id : '',
      appointment_id: assignedPatients.length ? assignedPatients[0].appointment_id : '',
      chief_complaint: assignedPatients.length ? (assignedPatients[0].reason || '') : '',
      diagnosis: '',
      symptoms: '',
      treatment_plan: '',
      follow_up_date: '',
      notes: '',
      medicines: []
    });
    setShowCreateModal(true);
  };

  const handlePatientSelectChange = (patientId) => {
    const p = assignedPatients.find(item => item.patient_id === parseInt(patientId, 10));
    setCreateForm(prev => ({
      ...prev,
      patient_id: patientId,
      appointment_id: p?.appointment_id || '',
      chief_complaint: p?.reason || prev.chief_complaint
    }));
  };

  const addMedLine = () => {
    setCreateForm(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
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

  const setMed = (index, field, value) => {
    setCreateForm(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    }));
  };

  const removeMed = (index) => {
    setCreateForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    if (!createForm.patient_id) {
      toast.error('Please select a patient');
      return;
    }
    if (!createForm.diagnosis.trim()) {
      toast.error('Clinical Diagnosis is required');
      return;
    }

    const validMeds = createForm.medicines.filter(m => m.medicine_id && parseInt(m.medicine_id, 10) > 0);

    // Stock check
    const outOfStockSelected = validMeds.find(m => {
      const med = medicines.find(item => item.medicine_id === parseInt(m.medicine_id, 10));
      return med && med.stock_quantity === 0;
    });

    if (outOfStockSelected) {
      const med = medicines.find(item => item.medicine_id === parseInt(outOfStockSelected.medicine_id, 10));
      toast.error(`Cannot prescribe ${med?.medicine_name}: Out of stock in pharmacy.`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/doctor/consultations', {
        patient_id: parseInt(createForm.patient_id, 10),
        appointment_id: createForm.appointment_id ? parseInt(createForm.appointment_id, 10) : null,
        chief_complaint: createForm.chief_complaint?.trim() || '',
        diagnosis: createForm.diagnosis.trim(),
        symptoms: createForm.symptoms?.trim() || '',
        treatment_plan: createForm.treatment_plan?.trim() || '',
        follow_up_date: createForm.follow_up_date || null,
        notes: createForm.notes?.trim() || '',
        medicine_ids: validMeds.map(m => parseInt(m.medicine_id, 10)),
        quantities: validMeds.map(m => parseInt(m.quantity, 10) || 1),
        dosages: validMeds.map(m => m.dosage || 'Standard'),
        frequencies: validMeds.map(m => m.frequency || 'OD (Once daily)'),
        durations: validMeds.map(m => m.duration || '5 days')
      });

      toast.success('Consultation & diagnosis record saved successfully!');
      setShowCreateModal(false);
      loadConsultations(1, pagination.limit);
      if (onStatsRefresh) onStatsRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save consultation');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPatientData = useMemo(() => {
    if (!createForm.patient_id) return null;
    return assignedPatients.find(p => p.patient_id === parseInt(createForm.patient_id, 10));
  }, [createForm.patient_id, assignedPatients]);

  return (
    <div className="consultations-manager">
      {/* FILTER & ACTIONS BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 320px', minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="Search patient, diagnosis, symptoms, or complaint..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Filter size={14} />
              <span>Search</span>
            </button>
          </form>

          {/* Date Filters & Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                className="form-control"
                style={{ width: 150 }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                title="Filter by Consultation Date"
              />
            </div>

            {(search || dateFilter || startDate || endDate) && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => loadConsultations(pagination.page, pagination.limit)}
              title="Refresh list"
            >
              <RefreshCw size={14} />
            </button>

            {/* CREATE BUTTON */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>New Consultation</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONSULTATIONS TABLE CARD */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <Stethoscope size={18} className="text-primary" />
            <h3>Clinical Consultations & Diagnoses ({pagination.total})</h3>
          </div>
          <span className="badge badge-info" style={{ fontSize: 12 }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>

        <div className="card-body card-body-table">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Patient Details</th>
                  <th>Chief Complaint</th>
                  <th>Clinical Diagnosis</th>
                  <th>Symptoms</th>
                  <th>Follow-up</th>
                  <th>Prescriptions</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map(c => (
                  <tr key={c.record_id}>
                    <td>
                      <div>
                        <strong>{new Date(c.created_at).toLocaleDateString()}</strong>
                        <div className="cell-sub">
                          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-patient">
                        <strong>{c.patient_name}</strong>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span className="badge badge-gray" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                            {c.patient_code}
                          </span>
                          <span className="cell-sub">{c.gender} · {c.age ? `${c.age} yrs` : '—'}</span>
                          {c.blood_group && (
                            <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 5px' }}>
                              {c.blood_group}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.chief_complaint}>
                      {c.chief_complaint || '—'}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontWeight: 600, fontSize: 12 }}>
                        {c.diagnosis}
                      </span>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.symptoms}>
                      {c.symptoms || '—'}
                    </td>
                    <td>
                      {c.follow_up_date ? (
                        <span className="badge badge-info" style={{ fontSize: 11 }}>
                          <Calendar size={11} style={{ marginRight: 4, display: 'inline' }} />
                          {c.follow_up_date}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td>
                      {c.prescription_count > 0 ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Pill size={12} />
                          <span>{c.prescription_count} Rx</span>
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => openDetailView(c)}
                          title="View consultation details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => openEditModal(c)}
                          title="Edit all 6 fields of consultation"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '4px 8px',
                            color: c.prescription_count > 0 ? 'var(--slate-400)' : 'var(--danger)',
                            borderColor: c.prescription_count > 0 ? 'var(--slate-200)' : 'rgba(239, 68, 68, 0.3)'
                          }}
                          onClick={() => openDeleteModal(c)}
                          title={c.prescription_count > 0 ? 'Cannot delete: consultation has linked prescriptions' : 'Delete consultation'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {!loading && !consultations.length && (
              <div className="empty-state">
                <FileText size={38} className="empty-icon text-muted" />
                <h4 style={{ marginTop: 12, color: 'var(--slate-700)' }}>No consultations found</h4>
                <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: '4px 0 16px' }}>
                  {search || dateFilter ? 'Try clearing your search or date filters.' : 'You have not recorded any clinical consultations yet.'}
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  <Plus size={15} />
                  <span>Record First Consultation</span>
                </button>
              </div>
            )}
          </div>

          {/* PAGINATION FOOTER */}
          {pagination.total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderTop: '1px solid var(--slate-100)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                Showing <strong>{((pagination.page - 1) * pagination.limit) + 1}</strong> to{' '}
                <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong>{pagination.total}</strong> consultations
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="form-control"
                  style={{ width: 110, padding: '4px 8px', fontSize: 12.5 }}
                  value={pagination.limit}
                  onChange={e => loadConsultations(1, parseInt(e.target.value, 10))}
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadConsultations(pagination.page - 1, pagination.limit)}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <span style={{ fontSize: 13, padding: '0 4px', color: 'var(--slate-600)' }}>
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadConsultations(pagination.page + 1, pagination.limit)}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          1. DETAIL VIEW MODAL
          ============================================================ */}
      {viewItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewItem(null)}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '88vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Stethoscope size={20} className="text-primary" />
                <div>
                  <h3>Consultation Record #{viewItem.record_id}</h3>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                    Recorded on {new Date(viewItem.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Patient Banner */}
              <div
                style={{
                  background: 'var(--primary-50)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Patient Name</span>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-900)' }}>{viewItem.patient_name}</div>
                  <span className="badge badge-gray" style={{ fontSize: 10, marginTop: 3 }}>{viewItem.patient_code}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Age / Gender</span>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-800)' }}>
                    {viewItem.age ? `${viewItem.age} yrs` : '—'} · {viewItem.gender || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Group</span>
                  <div>
                    <span className="badge badge-danger" style={{ fontWeight: 700, marginTop: 2 }}>
                      {viewItem.blood_group || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-800)' }}>{viewItem.phone || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Allergies</span>
                  <div>
                    <strong style={{ fontSize: 12, color: viewItem.allergies ? 'var(--danger)' : 'var(--slate-600)' }}>
                      {viewItem.allergies || 'None Reported'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Six Clinical Fields Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Chief Complaint */}
                <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                    1. Chief Complaint / Presenting Reason
                  </span>
                  <div style={{ fontSize: 13.5, color: 'var(--slate-900)', fontWeight: 500 }}>
                    {viewItem.chief_complaint || 'No presenting complaint noted'}
                  </div>
                </div>

                {/* 2. Diagnosis */}
                <div style={{ background: 'rgba(37,99,235,0.06)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(37,99,235,0.2)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', display: 'block', marginBottom: 4 }}>
                    2. Primary Clinical Diagnosis
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-800)' }}>
                    {viewItem.diagnosis}
                  </div>
                </div>

                {/* 3. Symptoms & 4. Treatment Plan Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      3. Presenting Symptoms
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                      {viewItem.symptoms || 'None recorded'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      4. Treatment Plan & Directives
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                      {viewItem.treatment_plan || 'None recorded'}
                    </div>
                  </div>
                </div>

                {/* 5. Notes & 6. Follow-up Date Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      5. Doctor Clinical Notes / Instructions
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>
                      {viewItem.notes || 'None recorded'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                      6. Scheduled Follow-up Date
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: viewItem.follow_up_date ? 'var(--primary-700)' : 'var(--slate-500)' }}>
                      {viewItem.follow_up_date ? `📅 ${viewItem.follow_up_date}` : 'No follow-up scheduled'}
                    </div>
                  </div>
                </div>

                {/* Linked Prescriptions Section */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-800)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Pill size={15} className="text-primary" />
                      <span>Linked Digital Prescriptions ({viewItem.prescriptions?.length || 0})</span>
                    </h4>
                  </div>

                  {viewItem.prescriptions && viewItem.prescriptions.length > 0 ? (
                    viewItem.prescriptions.map(p => (
                      <div
                        key={p.prescription_id}
                        style={{
                          border: '1px solid var(--slate-200)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          marginBottom: 10,
                          background: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)' }}>
                            Rx #{p.prescription_id} · {new Date(p.prescription_date).toLocaleDateString()}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className={`badge ${p.status === 'Dispensed' ? 'badge-success' : p.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                              {p.status}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)' }}>
                              Total: Rs. {Number(p.total_cost || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="table-container" style={{ margin: 0 }}>
                            <table className="table" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th>Medicine</th>
                                  <th>Dosage</th>
                                  <th>Frequency</th>
                                  <th>Duration</th>
                                  <th>Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.items.map(it => (
                                  <tr key={it.item_id}>
                                    <td>
                                      <strong>{it.medicine_name}</strong>
                                      <span className="cell-sub" style={{ display: 'block' }}>{it.dosage_form} · {it.strength}</span>
                                    </td>
                                    <td>{it.dosage}</td>
                                    <td>{it.frequency}</td>
                                    <td>{it.duration}</td>
                                    <td><strong>{it.quantity}</strong></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>No electronic prescriptions were issued for this consultation.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const item = viewItem;
                  setViewItem(null);
                  openEditModal(item);
                }}
              >
                <Edit3 size={14} />
                <span>Edit Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          2. EDIT MODAL (ALLOWS EDITING ALL SIX FIELDS)
          ============================================================ */}
      {editItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setEditItem(null)}>
          <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit3 size={18} className="text-primary" />
                <div>
                  <h3>Edit Consultation #{editItem.record_id}</h3>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                    Patient: <strong>{editItem.patient_name}</strong> ({editItem.patient_code})
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => !submitting && setEditItem(null)}>✕</button>
            </div>

            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ background: 'var(--slate-50)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 12.5, color: 'var(--slate-600)' }}>
                  You can modify all <strong>six clinical fields</strong> below. Changes will be saved directly to the patient's electronic health record.
                </div>

                {/* 1. Chief Complaint */}
                <div className="form-group">
                  <label className="form-label">
                    1. Chief Complaint / Reason for Visit
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sharp chest pain radiating to left arm / Chronic morning cough"
                    value={editForm.chief_complaint}
                    onChange={e => setEditForm(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  />
                </div>

                {/* 2. Clinical Diagnosis */}
                <div className="form-group">
                  <label className="form-label">
                    2. Clinical Diagnosis *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Acute Bronchitis / Type 2 Diabetes Mellitus"
                    value={editForm.diagnosis}
                    onChange={e => setEditForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                    required
                  />
                </div>

                {/* 3. Symptoms & 4. Treatment Plan */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      3. Presenting Symptoms
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Symptoms reported by patient or observed during examination..."
                      value={editForm.symptoms}
                      onChange={e => setEditForm(prev => ({ ...prev, symptoms: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      4. Treatment Plan & Directives
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Clinical plan, therapeutic actions, lifestyle advice..."
                      value={editForm.treatment_plan}
                      onChange={e => setEditForm(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 5. Notes & 6. Follow-up Date */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      5. Doctor Notes / Observations
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Internal observations, warnings, or dispensing directives..."
                      value={editForm.notes}
                      onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      6. Follow-up Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.follow_up_date}
                      onChange={e => setEditForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                    />
                    <span style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4, display: 'block' }}>
                      Leave blank if no follow-up is needed
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditItem(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          3. DELETE CONFIRMATION MODAL (SAFE DELETION)
          ============================================================ */}
      {deleteItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setDeleteItem(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ borderBottomColor: 'var(--slate-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: deleteItem.prescription_count > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: deleteItem.prescription_count > 0 ? '#ca8a04' : 'var(--danger)'
                  }}
                >
                  {deleteItem.prescription_count > 0 ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <h3 style={{ color: 'var(--slate-900)' }}>
                    {deleteItem.prescription_count > 0 ? 'Cannot Delete Consultation' : 'Confirm Consultation Deletion'}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Record ID: #{deleteItem.record_id}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => !submitting && setDeleteItem(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Consultation Details Card */}
              <div style={{ background: 'var(--slate-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--slate-200)' }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  Patient: <strong>{deleteItem.patient_name}</strong> ({deleteItem.patient_code})
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  Diagnosis: <strong style={{ color: 'var(--primary-700)' }}>{deleteItem.diagnosis}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                  Date Recorded: {new Date(deleteItem.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* SAFE DELETION CONSTRAINT WARNING */}
              {deleteItem.prescription_count > 0 ? (
                <div
                  style={{
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={18} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13, color: '#854d0e', lineHeight: 1.5 }}>
                      <strong>Deletion Prevented by System Policy:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                        This consultation is associated with <strong>{deleteItem.prescription_count} linked digital prescription(s)</strong>.
                        To prevent orphaned pharmacy records and maintain medical dispensing compliance, consultations with active prescriptions cannot be removed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: 'var(--slate-700)', lineHeight: 1.6 }}>
                  Are you sure you want to permanently delete this clinical consultation?
                  <p style={{ color: 'var(--danger)', fontSize: 12.5, margin: '8px 0 0', fontWeight: 600 }}>
                    ⚠️ This action cannot be undone. The consultation record will be removed from the patient's medical history.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteItem(null)}
                disabled={submitting}
              >
                {deleteItem.prescription_count > 0 ? 'Close' : 'Cancel'}
              </button>

              {deleteItem.prescription_count === 0 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={confirmDelete}
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={15} />
                  <span>{submitting ? 'Deleting...' : 'Yes, Delete Record'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          4. CREATE CONSULTATION MODAL (REUSING FUNCTIONALITY)
          ============================================================ */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setShowCreateModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 880,
              height: '92vh',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* PINNED HEADER */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Record New Consultation & Diagnosis</h3>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                    Create electronic consultation record and optionally prescribe medications
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => !submitting && setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={submitCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}>
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Patient Selection Card */}
                <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 18 }}>
                  <div className="form-group" style={{ marginBottom: selectedPatientData ? 12 : 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Select Assigned Patient *
                    </label>
                    <select
                      className="form-control"
                      value={createForm.patient_id}
                      onChange={e => handlePatientSelectChange(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a patient --</option>
                      {assignedPatients.map(p => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.patient_name} ({p.patient_code || `ID: ${p.patient_id}`}) — {p.phone || 'No phone'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPatientData && (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--slate-600)', paddingTop: 10, borderTop: '1px dashed var(--slate-300)' }}>
                      <div>Age: <strong>{selectedPatientData.age ? `${selectedPatientData.age} yrs` : '—'}</strong></div>
                      <div>Blood: <strong style={{ color: 'var(--danger)' }}>{selectedPatientData.blood_group || '—'}</strong></div>
                      <div>Phone: <strong>{selectedPatientData.phone || '—'}</strong></div>
                      {selectedPatientData.reason && (
                        <div>Initial Reason: <em>"{selectedPatientData.reason}"</em></div>
                      )}
                    </div>
                  )}
                </div>

                {/* 1. Chief Complaint & 2. Diagnosis */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      1. Chief Complaint / Presenting Reason
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. Sharp chest pain radiating to left arm / High fever"
                      value={createForm.chief_complaint}
                      onChange={e => setCreateForm(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      2. Clinical Diagnosis *
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. Essential Hypertension / Type 2 Diabetes"
                      value={createForm.diagnosis}
                      onChange={e => setCreateForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 3. Symptoms & 4. Treatment Plan */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      3. Presenting Symptoms
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Symptoms reported by patient..."
                      value={createForm.symptoms}
                      onChange={e => setCreateForm(prev => ({ ...prev, symptoms: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      4. Treatment Plan & Directives
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Therapeutic directives, dietary changes..."
                      value={createForm.treatment_plan}
                      onChange={e => setCreateForm(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 5. Notes & 6. Follow-up Date */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      5. Doctor Notes / Dispensing Instructions
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. Take with warm water after meals"
                      value={createForm.notes}
                      onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      6. Scheduled Follow-up Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={createForm.follow_up_date}
                      onChange={e => setCreateForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* OPTIONAL PRESCRIPTION SECTION (REUSED) */}
                <div style={{ marginTop: 14, paddingTop: 16, borderTop: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <label className="form-label" style={{ margin: 0, fontSize: 13.5 }}>
                        💊 Prescribed Medications (Optional e-Prescription)
                      </label>
                      <p style={{ fontSize: 11.5, color: 'var(--slate-500)', margin: '2px 0 0' }}>
                        Checked against live pharmaceutical dispensary inventory
                      </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addMedLine}>
                      + Add Medicine
                    </button>
                  </div>

                  {createForm.medicines.map((m, i) => {
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
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Medicine *
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

                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                              Dosage
                            </label>
                            <input
                              className="form-control"
                              placeholder="e.g. 500mg"
                              value={m.dosage}
                              onChange={e => setMed(i, 'dosage', e.target.value)}
                            />
                          </div>

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
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          </div>

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

                          <div style={{ paddingTop: 18 }}>
                            <button
                              type="button"
                              onClick={() => removeMed(i)}
                              className="modal-close"
                              style={{ color: 'var(--danger)', width: 32, height: 32 }}
                              title="Remove medication"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        {selectedMed && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 11.5 }}>
                            <span className={`badge ${selectedMed.stock_quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                              {selectedMed.stock_quantity > 0 ? `✓ ${selectedMed.stock_quantity} units available` : '⚠️ Out of Stock'}
                            </span>
                            <span style={{ color: 'var(--slate-500)' }}>
                              Unit Price: Rs. {Number(selectedMed.unit_price).toFixed(2)} · {selectedMed.category}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!createForm.medicines.length && (
                    <div style={{ padding: '14px', textAlign: 'center', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>
                        No medications prescribed. If patient requires drugs, click <strong>+ Add Medicine</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PINNED FOOTER */}
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
                  gap: 12
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
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
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Saving Consultation...' : 'Save Consultation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationsManager;
