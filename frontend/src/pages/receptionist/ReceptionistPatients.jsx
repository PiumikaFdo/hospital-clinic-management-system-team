import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  UserPlus,
  Search,
  PhoneCall,
  AlertCircle,
  HeartPulse,
  ShieldAlert,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Bed,
  CreditCard,
  CheckCircle2,
  X,
  Filter,
  FileText,
  UserCheck,
  Stethoscope,
  Droplet,
  Activity,
  RefreshCw,
  Building,
  ShieldCheck,
  AlertTriangle,
  Phone
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: 'Male',
  date_of_birth: '',
  blood_group: 'O+',
  address: '',
  emergency_contact_name: '',
  emergency_contact: '',
  allergies: '',
  medical_history: '',
  insurance_provider: '',
  insurance_number: '',
  // Optional appointment booking
  book_appointment: false,
  doctor_id: '',
  appt_date: new Date().toISOString().split('T')[0],
  appt_time: '09:00',
  reason: ''
};

const ReceptionistPatients = () => {
  const navigate = useNavigate();

  // State
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active records for modals
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDossier, setPatientDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Patients List
  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (dateFilter) params.append('date', dateFilter);
      if (bloodGroupFilter) params.append('blood_group', bloodGroupFilter);

      const res = await API.get(`/receptionist/patients?${params.toString()}`);
      setPatients(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load patient register');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Doctors for appointment booking dropdown
  const loadDoctors = async () => {
    try {
      const res = await API.get('/appointments/public/doctors');
      setDoctors(res.data.data || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [dateFilter, bloodGroupFilter]);

  useEffect(() => {
    loadDoctors();
  }, []);

  // Form helper
  const setFormField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = patients.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const registeredToday = patients.filter(p => p.registered_at && p.registered_at.startsWith(todayStr)).length;
    const withEmergency = patients.filter(p => p.emergency_contact || p.emergency_contact_name).length;
    const currentlyAdmitted = patients.filter(p => p.active_admission_id).length;
    return {
      total,
      registeredToday,
      emergencyCoverage: total > 0 ? Math.round((withEmergency / total) * 100) : 0,
      currentlyAdmitted
    };
  }, [patients]);

  // Client-side quick filter
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const query = search.toLowerCase();
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const code = (p.patient_code || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const emergency = `${p.emergency_contact_name || ''} ${p.emergency_contact || ''}`.toLowerCase();
      return name.includes(query) || code.includes(query) || phone.includes(query) || emergency.includes(query);
    });
  }, [patients, search]);

  // Handle Register Patient
  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        blood_group: form.blood_group,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_history: form.medical_history.trim() || null,
        insurance_provider: form.insurance_provider.trim() || null,
        insurance_number: form.insurance_number.trim() || null,
      };

      if (form.book_appointment && form.doctor_id) {
        payload.doctor_id = form.doctor_id;
        payload.appt_date = form.appt_date;
        payload.appt_time = form.appt_time;
        payload.reason = form.reason.trim() || 'General Intake Consultation';
      }

      const res = await API.post('/receptionist/patients', payload);
      toast.success(res.data.message || 'Patient successfully registered!');
      setShowRegisterModal(false);
      setForm(INITIAL_FORM);
      loadPatients();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    setForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      gender: patient.gender || 'Male',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
      blood_group: patient.blood_group || 'O+',
      address: patient.address || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact: patient.emergency_contact || '',
      allergies: patient.allergies || '',
      medical_history: patient.medical_history || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_number: patient.insurance_number || '',
      book_appointment: false
    });
    setShowEditModal(true);
  };

  // Handle Update Patient
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        blood_group: form.blood_group,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_history: form.medical_history.trim() || null,
        insurance_provider: form.insurance_provider.trim() || null,
        insurance_number: form.insurance_number.trim() || null,
      };

      const res = await API.put(`/receptionist/patients/${selectedPatient.patient_id}`, payload);
      toast.success(res.data.message || 'Patient updated successfully!');
      setShowEditModal(false);
      setSelectedPatient(null);
      loadPatients();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update patient');
    } finally {
      setSubmitting(false);
    }
  };

  // Open View Dossier Modal
  const openViewDossier = async (patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
    setDossierLoading(true);
    try {
      const res = await API.get(`/receptionist/patients/${patient.patient_id}`);
      setPatientDossier(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load patient dossier');
    } finally {
      setDossierLoading(false);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (patient) => {
    setSelectedPatient(patient);
    setShowDeleteModal(true);
  };

  // Handle Delete / Deactivate Patient
  const handleDelete = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      const res = await API.delete(`/receptionist/patients/${selectedPatient.patient_id}`);
      toast.info(res.data.message || 'Patient record handled');
      setShowDeleteModal(false);
      setSelectedPatient(null);
      loadPatients();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete patient');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate age helper
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  return (
    <DashboardLayout title="Patient Registration & Clinical Intake">
      {/* 1. TOP KPI STATS SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Patients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Registered
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 500, marginTop: '2px' }}>
              Active Patient Profiles
            </div>
          </div>
        </div>

        {/* Today's Registrations */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Intakes
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.registeredToday}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              New admissions & walk-ins
            </div>
          </div>
        </div>

        {/* Emergency Contact Coverage */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Emergency Contacts
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.emergencyCoverage}%
            </div>
            <div style={{ fontSize: '11px', color: stats.emergencyCoverage >= 80 ? '#10b981' : '#f59e0b', fontWeight: 500, marginTop: '2px' }}>
              Safety Contact Verification
            </div>
          </div>
        </div>

        {/* In-Patient Admissions */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/receptionist/admissions')}
        title="View In-Patient Admissions"
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bed size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active In-Patients
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.currentlyAdmitted}
            </div>
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 500, marginTop: '2px' }}>
              View Ward Beds →
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1 }}>
          {/* Text Search */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px', height: '38px', borderRadius: '8px' }}
              placeholder="Search by code, patient name, phone, emergency contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPatients()}
            />
          </div>

          {/* Blood Group Quick Filter */}
          <select
            className="form-control"
            style={{ width: '130px', height: '38px', borderRadius: '8px' }}
            value={bloodGroupFilter}
            onChange={e => setBloodGroupFilter(e.target.value)}
          >
            <option value="">Blood: All</option>
            {BLOOD_GROUPS.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          {/* Date Registered Filter */}
          <input
            type="date"
            className="form-control"
            style={{ width: '150px', height: '38px', borderRadius: '8px' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            title="Filter by registration date"
          />

          {/* Clear Filters */}
          {(search || dateFilter || bloodGroupFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ height: '38px', borderRadius: '8px' }}
              onClick={() => {
                setSearch('');
                setDateFilter('');
                setBloodGroupFilter('');
                loadPatients();
              }}
            >
              Reset
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            style={{ height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={loadPatients}
            title="Refresh patient list"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Primary Action: + Register Patient */}
        <div>
          <button
            className="btn btn-primary"
            style={{
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              padding: '0 18px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
            }}
            onClick={() => {
              setForm(INITIAL_FORM);
              setShowRegisterModal(true);
            }}
          >
            <UserPlus size={18} />
            + New Patient Intake
          </button>
        </div>
      </div>

      {/* 3. PATIENTS TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ margin: 0 }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ width: '110px' }}>Patient Code</th>
                <th>Patient Details</th>
                <th style={{ width: '90px' }}>Blood</th>
                <th style={{ width: '125px' }}>Contact</th>
                <th style={{ minWidth: '190px' }}>🚨 Emergency Contact</th>
                <th>Clinical / Care Status</th>
                <th style={{ width: '100px' }}>Registered</th>
                <th style={{ textAlign: 'right', minWidth: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(p => {
                const isAdmitted = !!p.active_admission_id;
                const hasPendingBills = Number(p.pending_bills_count) > 0;

                return (
                  <tr key={p.patient_id} style={{ transition: 'background 0.15s' }}>
                    {/* Patient Code */}
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#2563eb',
                          background: 'rgba(37,99,235,0.08)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}
                      >
                        {p.patient_code}
                      </span>
                    </td>

                    {/* Patient Name & Demographics */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: p.gender === 'Female' ? 'rgba(236,72,153,0.1)' : 'rgba(37,99,235,0.1)',
                          color: p.gender === 'Female' ? '#db2777' : '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0
                        }}>
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                            {p.first_name} {p.last_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {p.age ? `${p.age} yrs` : 'Age N/A'} • {p.gender || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Blood Group */}
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '3px 7px'
                        }}
                      >
                        {p.blood_group || '—'}
                      </span>
                    </td>

                    {/* Contact (Phone & Email) */}
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
                        {p.phone || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.email}
                      </div>
                    </td>

                    {/* EMERGENCY CONTACT (HIGHLIGHTED FEATURE) */}
                    <td>
                      {p.emergency_contact || p.emergency_contact_name ? (
                        <div style={{
                          background: '#fff1f2',
                          border: '1px solid #ffe4e6',
                          borderRadius: '8px',
                          padding: '5px 9px',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#be123c' }}>
                            <ShieldAlert size={13} style={{ flexShrink: 0 }} />
                            <span>{p.emergency_contact_name || 'Emergency Contact'}</span>
                          </div>
                          {p.emergency_contact && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#e11d48', fontWeight: 600 }}>
                              <Phone size={11} />
                              <a href={`tel:${p.emergency_contact}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                {p.emergency_contact}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} style={{ color: '#f59e0b' }} />
                          Missing Contact
                        </span>
                      )}
                    </td>

                    {/* Clinical / Care Status */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {isAdmitted ? (
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Active In-Patient Ward Admission"
                          >
                            <Bed size={11} />
                            {p.active_ward_bed || 'In-Patient'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            Out-Patient
                          </span>
                        )}

                        {p.allergies && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}
                            title={`Allergies: ${p.allergies}`}
                          >
                            ⚠️ {p.allergies}
                          </span>
                        )}

                        {hasPendingBills && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}
                            title="Has pending bills"
                          >
                            💳 Unpaid
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {p.registered_at ? new Date(p.registered_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {/* View Dossier */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', borderRadius: '6px' }}
                          title="View Full Intake Dossier"
                          onClick={() => openViewDossier(p)}
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Patient */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', borderRadius: '6px' }}
                          title="Edit Patient Information"
                          onClick={() => openEditModal(p)}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Quick Admit to Bed */}
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            background: isAdmitted ? '#f1f5f9' : 'rgba(37,99,235,0.1)',
                            color: isAdmitted ? '#94a3b8' : '#2563eb',
                            border: 'none',
                            cursor: isAdmitted ? 'not-allowed' : 'pointer'
                          }}
                          disabled={isAdmitted}
                          title={isAdmitted ? 'Already admitted' : 'Admit Patient to Ward Bed'}
                          onClick={() => navigate(`/receptionist/admissions?patient_id=${p.patient_id}`)}
                        >
                          <Bed size={14} />
                        </button>

                        {/* Quick Generate Bill */}
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: 'none'
                          }}
                          title="Generate / View Bill"
                          onClick={() => navigate(`/receptionist/billing?patient_id=${p.patient_id}`)}
                        >
                          <CreditCard size={14} />
                        </button>

                        {/* Safe Delete / Deactivate */}
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: 'none'
                          }}
                          title="Delete or Deactivate Profile"
                          onClick={() => openDeleteModal(p)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty / Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
              <div>Loading patient register...</div>
            </div>
          )}

          {!loading && filteredPatients.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
              <h4 style={{ color: '#0f172a', fontWeight: 600 }}>No patients found</h4>
              <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '400px', margin: '6px auto 16px' }}>
                {search || dateFilter || bloodGroupFilter
                  ? 'No patient records match your current filter parameters. Try clearing the search or date filter.'
                  : 'No patients have been registered in the system yet. Click below to begin intake.'}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setShowRegisterModal(true);
                }}
              >
                + Register New Patient
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MULTI-SECTION REGISTER PATIENT MODAL                  */}
      {/* ======================================================== */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRegisterModal(false)}>
          <div className="modal" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="#2563eb" />
                  New Patient Intake & Registration
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Enter demographics, mandatory emergency contacts, clinical profile, and optional walk-in appointment.
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowRegisterModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegister}>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                {/* SECTION 1: PERSONAL DEMOGRAPHICS */}
                <div style={{ marginBottom: '22px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <UserCheck size={16} />
                    1. Patient Identity & Contact
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. John"
                        value={form.first_name}
                        onChange={e => setFormField('first_name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Perera"
                        value={form.last_name}
                        onChange={e => setFormField('last_name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 077 123 4567"
                        value={form.phone}
                        onChange={e => setFormField('phone', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        className="form-control"
                        type="email"
                        placeholder="e.g. patient@domain.com"
                        value={form.email}
                        onChange={e => setFormField('email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gender *</label>
                      <select
                        className="form-control"
                        value={form.gender}
                        onChange={e => setFormField('gender', e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Date of Birth {form.date_of_birth && calculateAge(form.date_of_birth) !== null && `(${calculateAge(form.date_of_birth)} yrs)`}
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.date_of_birth}
                        onChange={e => setFormField('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '14px' }}>
                    <label className="form-label">Permanent / Current Residential Address</label>
                    <input
                      className="form-control"
                      placeholder="e.g. No. 45, Temple Road, Matara"
                      value={form.address}
                      onChange={e => setFormField('address', e.target.value)}
                    />
                  </div>
                </div>

                {/* SECTION 2: EMERGENCY CONTACT & NEXT OF KIN (HIGHLIGHTED) */}
                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '22px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#e11d48',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <ShieldAlert size={16} />
                    2. Emergency Contact & Next of Kin (Crucial Safety Field)
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#9f1239' }}>Emergency Contact Name & Relationship *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Sarah Perera (Spouse / Mother / Brother)"
                        value={form.emergency_contact_name}
                        onChange={e => setFormField('emergency_contact_name', e.target.value)}
                        style={{ background: '#ffffff', borderColor: '#f43f5e' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#9f1239' }}>Emergency Contact Phone Number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 077 765 4321"
                        value={form.emergency_contact}
                        onChange={e => setFormField('emergency_contact', e.target.value)}
                        style={{ background: '#ffffff', borderColor: '#f43f5e' }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: CLINICAL & MEDICAL INTAKE */}
                <div style={{ marginBottom: '22px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0d9488',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <HeartPulse size={16} />
                    3. Clinical Baseline & Insurance Profile
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Blood Group *</label>
                      <select
                        className="form-control"
                        value={form.blood_group}
                        onChange={e => setFormField('blood_group', e.target.value)}
                      >
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Insurance Provider (Optional)</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Sri Lanka Insurance, Ceylinco, AIA"
                        value={form.insurance_provider}
                        onChange={e => setFormField('insurance_provider', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Insurance Policy Number</label>
                      <input
                        className="form-control"
                        placeholder="e.g. MED-POL-98421"
                        value={form.insurance_number}
                        onChange={e => setFormField('insurance_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Known Drug / Food Allergies</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Penicillin, Sulfa drugs, Peanuts (or None)"
                        value={form.allergies}
                        onChange={e => setFormField('allergies', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pre-existing Medical Conditions</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                        value={form.medical_history}
                        onChange={e => setFormField('medical_history', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: OPTIONAL WALK-IN DOCTOR APPOINTMENT */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.book_appointment ? '14px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stethoscope size={16} color="#475569" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        Initial Doctor Consultation (Optional)
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>
                      <input
                        type="checkbox"
                        checked={form.book_appointment}
                        onChange={e => setFormField('book_appointment', e.target.checked)}
                      />
                      Book Doctor Consultation Now
                    </label>
                  </div>

                  {form.book_appointment && (
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      <div className="form-group">
                        <label className="form-label">Attending Doctor *</label>
                        <select
                          className="form-control"
                          value={form.doctor_id}
                          onChange={e => setFormField('doctor_id', e.target.value)}
                          required={form.book_appointment}
                        >
                          <option value="">-- Select Doctor --</option>
                          {doctors.map(d => (
                            <option key={d.staff_id} value={d.staff_id}>
                              Dr. {d.doctor_name} ({d.dept_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.appt_date}
                          onChange={e => setFormField('appt_date', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Time</label>
                        <input
                          type="time"
                          className="form-control"
                          value={form.appt_time}
                          onChange={e => setFormField('appt_time', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Reason / Complaint</label>
                        <input
                          className="form-control"
                          placeholder="e.g. Chest pain, Fever, Routine checkup"
                          value={form.reason}
                          onChange={e => setFormField('reason', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={16} />
                  {submitting ? 'Registering...' : 'Complete Patient Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. EDIT PATIENT MODAL                                    */}
      {/* ======================================================== */}
      {showEditModal && selectedPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} color="#2563eb" />
                  Edit Patient Profile: {selectedPatient.patient_code}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Update demographic details, emergency contact, or medical baseline.
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                {/* Demographics */}
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      className="form-control"
                      value={form.first_name}
                      onChange={e => setFormField('first_name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      className="form-control"
                      value={form.last_name}
                      onChange={e => setFormField('last_name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={e => setFormField('phone', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email}
                      onChange={e => setFormField('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={form.gender}
                      onChange={e => setFormField('gender', e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date_of_birth}
                      onChange={e => setFormField('date_of_birth', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label">Address</label>
                  <input
                    className="form-control"
                    value={form.address}
                    onChange={e => setFormField('address', e.target.value)}
                  />
                </div>

                {/* Emergency Contact */}
                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', marginBottom: '10px' }}>
                    🚨 Emergency Contact (Next of Kin)
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#9f1239' }}>Contact Name & Relation</label>
                      <input
                        className="form-control"
                        value={form.emergency_contact_name}
                        onChange={e => setFormField('emergency_contact_name', e.target.value)}
                        placeholder="e.g. Jane Doe (Spouse)"
                        style={{ background: '#ffffff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#9f1239' }}>Contact Phone</label>
                      <input
                        className="form-control"
                        value={form.emergency_contact}
                        onChange={e => setFormField('emergency_contact', e.target.value)}
                        placeholder="e.g. 077 123 4567"
                        style={{ background: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical & Insurance */}
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select
                      className="form-control"
                      value={form.blood_group}
                      onChange={e => setFormField('blood_group', e.target.value)}
                    >
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Insurance Provider</label>
                    <input
                      className="form-control"
                      value={form.insurance_provider}
                      onChange={e => setFormField('insurance_provider', e.target.value)}
                      placeholder="e.g. Ceylinco Insurance"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Policy Number</label>
                    <input
                      className="form-control"
                      value={form.insurance_number}
                      onChange={e => setFormField('insurance_number', e.target.value)}
                      placeholder="e.g. POL-12345"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Known Allergies</label>
                    <input
                      className="form-control"
                      value={form.allergies}
                      onChange={e => setFormField('allergies', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Medical History</label>
                    <input
                      className="form-control"
                      value={form.medical_history}
                      onChange={e => setFormField('medical_history', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Patient Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. VIEW PATIENT INTAKE DOSSIER MODAL                     */}
      {/* ======================================================== */}
      {showViewModal && selectedPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowViewModal(false)}>
          <div className="modal" style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} color="#2563eb" />
                  Patient Clinical Intake Dossier
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Comprehensive medical intake, emergency contacts, admissions, and financial overview.
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {dossierLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                  <div>Loading patient dossier...</div>
                </div>
              ) : patientDossier ? (
                <div>
                  {/* Patient Hero Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#ffffff',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        border: '2px solid rgba(255,255,255,0.2)'
                      }}>
                        {patientDossier.first_name?.[0]}{patientDossier.last_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                          {patientDossier.first_name} {patientDossier.last_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          Code: <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{patientDossier.patient_code}</strong> • {patientDossier.age ? `${patientDossier.age} yrs` : ''} • {patientDossier.gender}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          📞 {patientDossier.phone} • ✉️ {patientDossier.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Blood Group</div>
                      <div style={{
                        display: 'inline-block',
                        background: '#dc2626',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '14px',
                        padding: '3px 12px',
                        borderRadius: '6px',
                        marginTop: '4px'
                      }}>
                        {patientDossier.blood_group || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* EMERGENCY CONTACT HIGHLIGHT CARD */}
                  <div style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', marginBottom: '8px' }}>
                      <ShieldAlert size={16} />
                      Primary Emergency Contact (Next of Kin)
                    </div>
                    {patientDossier.emergency_contact || patientDossier.emergency_contact_name ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9f1239', textTransform: 'uppercase', fontWeight: 600 }}>Contact Name & Relation</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#be123c' }}>
                            {patientDossier.emergency_contact_name || 'Not Specified'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9f1239', textTransform: 'uppercase', fontWeight: 600 }}>Emergency Phone</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PhoneCall size={14} />
                            <a href={`tel:${patientDossier.emergency_contact}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {patientDossier.emergency_contact || 'No Phone on Record'}
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9f1239', fontStyle: 'italic' }}>
                        ⚠️ No emergency contact on record. Click "Edit Patient" to register next of kin.
                      </div>
                    )}
                  </div>

                  {/* Clinical & Insurance Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HeartPulse size={14} /> Clinical Baseline
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <strong>Known Allergies:</strong>{' '}
                        <span style={{ color: patientDossier.allergies ? '#dc2626' : '#64748b', fontWeight: patientDossier.allergies ? 700 : 400 }}>
                          {patientDossier.allergies || 'None reported'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <strong>Medical History:</strong> {patientDossier.medical_history || 'No chronic history recorded'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} /> Insurance Coverage
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <strong>Provider:</strong> {patientDossier.insurance_provider || 'Self-Pay / None'}
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <strong>Policy #:</strong> {patientDossier.insurance_number || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Recent In-Patient Admissions */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bed size={15} color="#8b5cf6" />
                      In-Patient Hospital Admissions ({patientDossier.admissions?.length || 0})
                    </div>
                    {patientDossier.admissions?.length > 0 ? (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table className="table" style={{ margin: 0, fontSize: '12px' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th>Ward</th>
                              <th>Bed</th>
                              <th>Admitted</th>
                              <th>Discharged</th>
                              <th>Stay</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientDossier.admissions.map(adm => (
                              <tr key={adm.admission_id}>
                                <td><strong>{adm.ward_name}</strong></td>
                                <td>Bed {adm.bed_number}</td>
                                <td>{new Date(adm.admission_date).toLocaleDateString()}</td>
                                <td>{adm.discharge_date ? new Date(adm.discharge_date).toLocaleDateString() : 'Active'}</td>
                                <td>{adm.stay_days} days</td>
                                <td>
                                  <span className={`badge ${adm.status === 'Active' ? 'badge-primary' : 'badge-secondary'}`}>
                                    {adm.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                        No inpatient admission records on file for this patient.
                      </div>
                    )}
                  </div>

                  {/* Recent Bills */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={15} color="#10b981" />
                      Billing & Invoicing History ({patientDossier.bills?.length || 0})
                    </div>
                    {patientDossier.bills?.length > 0 ? (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table className="table" style={{ margin: 0, fontSize: '12px' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th>Bill ID</th>
                              <th>Date</th>
                              <th>Total Amount</th>
                              <th>Paid Amount</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientDossier.bills.map(b => (
                              <tr key={b.bill_id}>
                                <td>#{b.bill_id}</td>
                                <td>{new Date(b.bill_date).toLocaleDateString()}</td>
                                <td>Rs. {Number(b.total_amount).toLocaleString()}</td>
                                <td>Rs. {Number(b.paid_amount).toLocaleString()}</td>
                                <td>
                                  <span className={`badge ${b.payment_status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                                    {b.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                        No billing history recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedPatient);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit2 size={13} /> Edit Profile
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/receptionist/admissions?patient_id=${selectedPatient.patient_id}`);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Bed size={13} /> Admit to Bed
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/receptionist/billing?patient_id=${selectedPatient.patient_id}`);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CreditCard size={13} /> View / Create Bill
                </button>
              </div>

              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. DELETE / DEACTIVATE CONFIRMATION MODAL                */}
      {/* ======================================================== */}
      {showDeleteModal && selectedPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} />
                Delete or Deactivate Patient
              </h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                Are you sure you want to remove patient <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong> (<code>{selectedPatient.patient_code}</code>)?
              </p>
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#9f1239',
                marginTop: '12px'
              }}>
                ℹ️ <strong>Medical Audit Safeguard:</strong> If this patient has linked appointment, prescription, admission, or billing records, their record will be <strong>safely deactivated</strong> instead of deleted to protect hospital legal audit trails.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistPatients;
