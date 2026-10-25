import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Bed,
  Users,
  Activity,
  Clock,
  Search,
  RefreshCw,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  X,
  Printer,
  CreditCard,
  Building2,
  HeartPulse,
  Calendar,
  Sparkles,
  LayoutGrid,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Barcode from '../../components/Barcode';
import DoctorAdmissionOrderAlert from '../../components/DoctorAdmissionOrderAlert';
import ReceptionistPagination from '../../components/ReceptionistPagination';

const ReceptionistAdmissions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patient_id');

  // Primary Active Tab: 'register' (table), 'bedmap' (visual floor plan), 'census' (shift handover report)
  const [activeView, setActiveView] = useState('register');

  // Primary Data
  const [admissions, setAdmissions] = useState([]);
  const [bedMatrix, setBedMatrix] = useState([]);
  const [stats, setStats] = useState({
    active_admissions: 0,
    discharged_admissions: 0,
    total_beds: 0,
    available_beds: 0,
    occupied_beds: 0,
    occupancy_rate: 0,
    avg_stay: 0,
    total_accrued: 0,
  });

  // Master Data
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [nurses, setNurses] = useState([]);

  // UI Filters
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Active'); // 'Active' | 'All' | 'Discharged'
  const [wardFilter, setWardFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [bedMapWard, setBedMapWard] = useState('All');
  const [admissionPage, setAdmissionPage] = useState(1);
  const admissionPageSize = 10;

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null); // For viewing & printing admission intake slip
  const [admitting, setAdmitting] = useState(false);

  // Discharge Patient Modal State
  const [dischargeModalAdmission, setDischargeModalAdmission] = useState(null);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis_at_discharge: 'Discharged clinically stable and ambulatory',
    notes: '',
  });
  const [discharging, setDischarging] = useState(false);

  // Recent Consultation Auto-fill State
  const [recentConsultation, setRecentConsultation] = useState(null);
  const [loadingConsultation, setLoadingConsultation] = useState(false);

  // Admission Intake Form (Ordered by Doctor)
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    ward_id: '',
    nurse_id: '',
    reason: '',
  });

  // Parse structured doctor admission order from recent consultation reason string
  const parsedAdmissionOrder = useMemo(() => {
    if (!recentConsultation?.reason) return null;
    const reason = recentConsultation.reason;
    if (!reason.includes('[ADMISSION ORDER -')) return null;

    // Extract priority from [ADMISSION ORDER - URGENT]
    const priorityMatch = reason.match(/\[ADMISSION ORDER - ([A-Z]+)\]/);
    const priority = priorityMatch ? priorityMatch[1] : null;

    // Extract ward category from: Ward Category: ICU
    const wardMatch = reason.match(/Ward Category:\s*([^|]+)/);
    const ward_category = wardMatch ? wardMatch[1].trim() : null;

    // Extract indication/diagnosis
    const indicationMatch = reason.match(/Indication:\s*([^|]+)/);
    const diagnosis = indicationMatch ? indicationMatch[1].trim() : null;

    // Extract staff instructions
    const instrMatch = reason.match(/Staff Instructions:\s*(.+)$/);
    const instructions = instrMatch ? instrMatch[1].trim() : null;

    if (!priority && !ward_category && !diagnosis) return null;

    return {
      priority,
      ward_category,
      diagnosis,
      instructions,
      doctor_name: recentConsultation.doctor_name,
      specialization: recentConsultation.specialization,
      doctor_id: recentConsultation.doctor_id,
      appointment_id: recentConsultation.appointment_id,
      appointment_date: recentConsultation.appointment_date,
    };
  }, [recentConsultation]);

  // 1. Fetch Admissions Table Data
  const fetchAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
      if (wardFilter && wardFilter !== 'All') params.append('ward_id', wardFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await API.get(`/receptionist/admissions?${params.toString()}`);
      setAdmissions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load admissions:', err);
      toast.error('Failed to load patient admissions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, wardFilter, search]);

  // 2. Fetch Bed Matrix for Visual Map
  const fetchBedMatrix = useCallback(async () => {
    try {
      const res = await API.get('/receptionist/admissions/bed-matrix');
      setBedMatrix(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch bed matrix:', err);
    }
  }, []);

  // 3. Fetch KPI statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/receptionist/admissions/stats');
      if (res.data.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admission statistics:', err);
    }
  }, []);

  // 4. Fetch Master Data
  const fetchMasterData = useCallback(async () => {
    try {
      const [patientsRes, doctorsRes, wardsRes, nursesRes] = await Promise.all([
        API.get('/receptionist/patients').catch(() => ({ data: { data: [] } })),
        API.get('/appointments/public/doctors').catch(() => ({ data: { data: [] } })),
        API.get('/receptionist/wards').catch(() => ({ data: { data: [] } })),
        API.get('/receptionist/nurses').catch(() => ({ data: { data: [] } })),
      ]);

      setPatients(patientsRes.data.data || []);
      setDoctors(doctorsRes.data.data || []);
      setWards(wardsRes.data.data || []);
      setNurses(nursesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMasterData();
    fetchStats();
    fetchBedMatrix();
  }, [fetchMasterData, fetchStats, fetchBedMatrix]);

  // Refetch when filters change
  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  useEffect(() => {
    setAdmissionPage(1);
  }, [statusFilter, wardFilter, search]);

  const paginatedAdmissions = useMemo(
    () => admissions.slice((admissionPage - 1) * admissionPageSize, admissionPage * admissionPageSize),
    [admissions, admissionPage]
  );

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAdmitModal(false);
        setSelectedAdmission(null);
        setDischargeModalAdmission(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Discharge Submission
  const handleConfirmDischarge = async (e) => {
    e.preventDefault();
    if (!dischargeModalAdmission) return;

    try {
      setDischarging(true);
      const res = await API.put(
        `/receptionist/admissions/${dischargeModalAdmission.admission_id}/discharge`,
        dischargeForm
      );
      toast.success(res.data.message || 'Patient successfully discharged! Bed freed.');
      setDischargeModalAdmission(null);

      // Refresh data
      await Promise.all([fetchAdmissions(), fetchStats(), fetchMasterData(), fetchBedMatrix()]);
    } catch (err) {
      console.error('Discharge error:', err);
      toast.error(err.response?.data?.message || 'Failed to discharge patient');
    } finally {
      setDischarging(false);
    }
  };

  // Auto-open modal if patient_id is in URL query parameters
  useEffect(() => {
    if (urlPatientId) {
      setForm((f) => ({ ...f, patient_id: String(urlPatientId) }));
      setShowAdmitModal(true);
    }
  }, [urlPatientId]);

  // Refetch live ward beds whenever admit modal is opened
  useEffect(() => {
    if (showAdmitModal) {
      fetchMasterData();
    }
  }, [showAdmitModal, fetchMasterData]);

  // When patient is selected in admission modal, check for recent doctor consultation & automatically pre-fill
  useEffect(() => {
    if (!form.patient_id) {
      setRecentConsultation(null);
      return;
    }

    const checkConsultation = async () => {
      try {
        setLoadingConsultation(true);
        const res = await API.get(`/receptionist/patients/${form.patient_id}/recent-consultation`);
        const consultation = res.data.data;
        setRecentConsultation(consultation || null);

        if (consultation) {
          // Parse admission order if it contains structured doctor order
          let parsedReason = consultation.reason || 'Doctor ordered in-patient clinical admission';
          let autoWardId = '';

          // If it's a structured admission order, extract clean diagnosis for the form
          if (consultation.reason && consultation.reason.includes('[ADMISSION ORDER -')) {
            const indicationMatch = consultation.reason.match(/Indication:\s*([^|]+)/);
            if (indicationMatch) parsedReason = indicationMatch[1].trim();

            // Extract ward_category and try to auto-match to a ward
            const wardCatMatch = consultation.reason.match(/Ward Category:\s*([^|]+)/);
            if (wardCatMatch) {
              const wardCat = wardCatMatch[1].trim().toLowerCase();
              // wardCat will be: general, icu, pediatric, maternity, private
              // wards have ward_type: General, ICU, Emergency, Maternity, Pediatric, Private, Semi-Private
              // Note: we will set autoWardId later from the wards list via a flag
              // Store on consultation object for after wards load
              consultation._suggestedWardCategory = wardCat;
            }
          }

          setForm((f) => ({
            ...f,
            doctor_id: consultation.doctor_id ? String(consultation.doctor_id) : f.doctor_id,
            reason: parsedReason,
          }));
        }
      } catch (err) {
        console.error('Error checking recent consultation:', err);
        setRecentConsultation(null);
      } finally {
        setLoadingConsultation(false);
      }
    };

    checkConsultation();
  }, [form.patient_id]);

  // When a structured admission order is parsed and wards are loaded, auto-suggest the ward
  useEffect(() => {
    if (!parsedAdmissionOrder?.ward_category || !wards.length || form.ward_id) return;
    const cat = parsedAdmissionOrder.ward_category.toLowerCase();
    // Match ward_type case-insensitively
    const matchedWard = wards.find((w) => {
      const wType = (w.ward_type || '').toLowerCase();
      return wType === cat || wType.startsWith(cat.substring(0, 4));
    });
    if (matchedWard && matchedWard.available_beds > 0) {
      setForm((f) => ({ ...f, ward_id: String(matchedWard.ward_id) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAdmissionOrder, wards]);

  // Open admit modal with pre-selected ward from the visual Bed Map
  const handleAdmitInWard = (wardId) => {
    setForm({
      patient_id: '',
      doctor_id: '',
      ward_id: String(wardId),
      nurse_id: '',
      reason: '',
    });
    setShowAdmitModal(true);
  };

  // Map of active admissions by patient_id to prevent multi-bed admissions
  const activeAdmissionsByPatient = useMemo(() => {
    const map = {};
    admissions.forEach((a) => {
      if (a.status === 'Active') {
        map[a.patient_id] = a;
      }
    });
    return map;
  }, [admissions]);

  // Admit Patient using atomic stored procedure sp_admit_patient
  const handleAdmitPatient = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.doctor_id || !form.ward_id) {
      toast.error('Please select patient, admitting doctor, and ward');
      return;
    }

    // Guard: Prevent same patient from being admitted to multiple beds
    const currentActiveAdm = activeAdmissionsByPatient[parseInt(form.patient_id, 10)];
    if (currentActiveAdm) {
      toast.error(
        `This patient is already admitted in ${currentActiveAdm.ward_name} (Bed ${currentActiveAdm.bed_number}). A patient cannot be admitted to multiple beds simultaneously.`
      );
      return;
    }

    try {
      setAdmitting(true);
      const payload = {
        patient_id: parseInt(form.patient_id, 10),
        doctor_id: parseInt(form.doctor_id, 10),
        ward_id: parseInt(form.ward_id, 10),
        nurse_id: form.nurse_id ? parseInt(form.nurse_id, 10) : null,
        reason: form.reason || 'Doctor ordered in-patient clinical admission',
      };

      const res = await API.post('/receptionist/admissions', payload);
      const newAdm = res.data.data;

      toast.success(res.data.message || 'Patient successfully admitted! Bed assigned.');

      // The pending order was completed; allow future orders for this patient to notify again.
      try {
        const key = 'receptionist-dismissed-admission-orders';
        const dismissedPatients = JSON.parse(sessionStorage.getItem(key) || '[]')
          .filter(patientId => String(patientId) !== String(form.patient_id));
        sessionStorage.setItem(key, JSON.stringify(dismissedPatients));
      } catch (err) {
        console.warn('Could not clear completed admission notification:', err);
      }

      // Reset form & close modal
      setShowAdmitModal(false);
      setForm({ patient_id: '', doctor_id: '', ward_id: '', nurse_id: '', reason: '' });
      setRecentConsultation(null);

      // Refresh data & KPI metrics
      await Promise.all([fetchAdmissions(), fetchStats(), fetchMasterData(), fetchBedMatrix()]);

      // Open Intake Slip for newly admitted patient
      if (newAdm && newAdm.admission_id) {
        const fullNewRecord = {
          admission_id: newAdm.admission_id,
          admission_date: new Date().toISOString(),
          status: 'Active',
          days_admitted: 1,
          accrued_ward_cost: Number(newAdm.daily_rate || 0),
          bed_number: newAdm.bed_number,
          ward_name: newAdm.ward_name,
          ward_type: newAdm.ward_type,
          daily_rate: newAdm.daily_rate,
          floor_number: newAdm.floor_number,
          patient_name:
            patients.find((p) => p.patient_id === payload.patient_id)?.first_name +
            ' ' +
            patients.find((p) => p.patient_id === payload.patient_id)?.last_name,
          patient_code: patients.find((p) => p.patient_id === payload.patient_id)?.patient_code,
          blood_group: patients.find((p) => p.patient_id === payload.patient_id)?.blood_group,
          phone: patients.find((p) => p.patient_id === payload.patient_id)?.phone,
          doctor_name: doctors.find((d) => d.staff_id === payload.doctor_id)?.doctor_name,
          doctor_specialization: doctors.find((d) => d.staff_id === payload.doctor_id)?.specialization,
          reason_for_admission: payload.reason,
        };
        setSelectedAdmission(fullNewRecord);
      }
    } catch (err) {
      console.error('Admission failed:', err);
      toast.error(err.response?.data?.message || 'Admission failed');
    } finally {
      setAdmitting(false);
    }
  };

  // Selected patient details preview in intake modal
  const selectedPatientObj = patients.find((p) => p.patient_id === parseInt(form.patient_id, 10));
  const activeAdmissionForSelected = selectedPatientObj ? activeAdmissionsByPatient[selectedPatientObj.patient_id] : null;
  const selectedWardObj = wards.find((w) => w.ward_id === parseInt(form.ward_id, 10));

  // Quick Clinical Presets
  const quickIndications = [
    'Post-Surgical Monitoring',
    'Acute Infection & IV Antibiotics',
    'Respiratory Distress / Observation',
    'Cardiac Monitoring & ECG Triage',
    'Maternity / Labor Admission',
    'Emergency Trauma Stabilization',
  ];

  // Group Bed Matrix by Ward for Visual Map
  const wardsGroupedBeds = useMemo(() => {
    const groups = {};
    bedMatrix.forEach((b) => {
      if (!groups[b.ward_id]) {
        groups[b.ward_id] = {
          ward_id: b.ward_id,
          ward_name: b.ward_name,
          ward_type: b.ward_type,
          floor_number: b.floor_number,
          daily_rate: b.daily_rate,
          total_beds: b.total_beds,
          available_beds: b.available_beds,
          occupied_beds: b.occupied_beds,
          beds: [],
        };
      }
      groups[b.ward_id].beds.push(b);
    });
    return Object.values(groups);
  }, [bedMatrix]);

  // Filtered wards for Bed Map
  const visibleWardsInMap = useMemo(() => {
    if (bedMapWard === 'All') return wardsGroupedBeds;
    return wardsGroupedBeds.filter((w) => String(w.ward_id) === String(bedMapWard));
  }, [wardsGroupedBeds, bedMapWard]);

  return (
    <DashboardLayout
      title="In-Patient Admissions & Ward Census"
      subtitle="Front-desk admission intake, doctor-assigned ward allocations, live bed matrix, and accrued room cost estimation"
    >
      {/* Doctor Admission Order Floating Alert */}
      <DoctorAdmissionOrderAlert />
      {/* =========================================================
          TOP KPI METRIC CARDS
          ========================================================= */}
      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
          marginBottom: 22,
        }}
      >
        {/* Card 1: Active In-Patients */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.active_admissions}</div>
            <div className="stat-label">Active In-Patients</div>
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
              Under active ward observation
            </span>
          </div>
        </div>

        {/* Card 2: Bed Occupancy */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.occupancy_rate}%</div>
            <div className="stat-label">Hospital Bed Occupancy</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {stats.occupied_beds} of {stats.total_beds} total beds occupied
            </div>
            {/* Visual Mini Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 4,
                background: '#e2e8f0',
                borderRadius: 2,
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, stats.occupancy_rate)}%`,
                  height: '100%',
                  background: stats.occupancy_rate > 85 ? '#dc2626' : '#2563eb',
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Available Beds */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Bed size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.available_beds}</div>
            <div className="stat-label">Available Ward Beds</div>
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
              Ready for immediate intake
            </span>
          </div>
        </div>

        {/* Card 4: Live Accrued Ward Charges */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: 20 }}>
              Rs. {Number(stats.total_accrued || 0).toLocaleString()}
            </div>
            <div className="stat-label">Live Accrued Room Cost</div>
          </div>
        </div>
      </div>

      {/* =========================================================
          PRIMARY NAVIGATION TABS (REGISTER vs BED MAP vs CENSUS)
          ========================================================= */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 12 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* PRIMARY VIEW SWITCHER */}
          <div className="receptionist-nav-tabs">
            <button
              type="button"
              className={`receptionist-nav-tab ${activeView === 'register' ? 'active' : ''}`}
              onClick={() => setActiveView('register')}
            >
              <ClipboardList size={15} />
              In-Patient Register
            </button>
            <button
              type="button"
              className={`receptionist-nav-tab ${activeView === 'bedmap' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('bedmap');
                fetchBedMatrix();
              }}
            >
              <LayoutGrid size={15} />
              Interactive Bed Map
            </button>
            <button
              type="button"
              className={`receptionist-nav-tab ${activeView === 'census' ? 'active' : ''}`}
              onClick={() => setActiveView('census')}
            >
              <FileText size={15} />
              Daily Ward Census
            </button>
          </div>

          {/* SEARCH, FILTERS & PRIMARY ACTION */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {activeView === 'register' && (
              <>
                <select
                  className="form-control"
                  style={{ width: 170, fontSize: 13, height: 36 }}
                  value={wardFilter}
                  onChange={(e) => setWardFilter(e.target.value)}
                >
                  <option value="All">All Wards</option>
                  {wards.map((w) => (
                    <option key={w.ward_id} value={w.ward_id}>
                      {w.ward_name} ({w.available_beds} free)
                    </option>
                  ))}
                </select>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: 210, paddingLeft: 32, fontSize: 13, height: 36 }}
                    placeholder="Search patient, bed, doctor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                </div>
              </>
            )}

            {activeView === 'bedmap' && (
              <select
                className="form-control"
                style={{ width: 190, fontSize: 13, height: 36 }}
                value={bedMapWard}
                onChange={(e) => setBedMapWard(e.target.value)}
              >
                <option value="All">All Hospital Wards</option>
                {wards.map((w) => (
                  <option key={w.ward_id} value={w.ward_id}>
                    {w.ward_name} ({w.available_beds} free)
                  </option>
                ))}
              </select>
            )}


            {/* REFRESH */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                fetchAdmissions();
                fetchStats();
                fetchBedMatrix();
              }}
              title="Refresh Data"
              style={{ padding: '7px 12px', height: 36 }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            {/* ADMIT PATIENT BUTTON */}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 16px',
              }}
              onClick={() => setShowAdmitModal(true)}
            >
              <Plus size={16} />
              Admit Patient
            </button>
          </div>
        </div>

        {/* SUB-FILTER STATUS PILLS (FOR REGISTER VIEW) */}
        {activeView === 'register' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Filter Status:</span>
            {['Active', 'All', 'Discharged'].map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 11.5, padding: '3px 12px', height: 28 }}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'Active' ? `Active In-Patients (${stats.active_admissions})` : s === 'Discharged' ? `Discharged (${stats.discharged_admissions})` : 'All Admissions'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================
          VIEW 1: IN-PATIENT ADMISSIONS REGISTER (TABLE VIEW)
          ========================================================= */}
      {activeView === 'register' && (
        <div className="card" style={{ borderRadius: 12 }}>
          <div
            className="card-header"
            style={{
              padding: '16px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bed size={18} className="text-primary" />
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {statusFilter === 'Active'
                  ? 'Current In-Patient Register'
                  : statusFilter === 'Discharged'
                  ? 'Discharged Patient Archive'
                  : 'All Hospital Admission Records'}
              </h3>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Showing {admissions.length} patient records
            </span>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Patient & Admission</th>
                    <th style={{ width: '19%' }}>Ward & Bed</th>
                    <th style={{ width: '18%' }}>Admitting Doctor</th>
                    <th style={{ width: '17%' }}>Stay & Accrued Room Charges</th>
                    <th style={{ width: '13%' }}>Discharge Clearance</th>
                    <th style={{ width: '11%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmissions.map((a) => (
                    <tr key={a.admission_id}>
                      {/* 1. PATIENT & ADMISSION */}
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: 12 }}>
                            ADM-{String(a.admission_id).padStart(5, '0')}
                          </span>
                          {a.blood_group && (
                            <span className="badge badge-danger" style={{ fontSize: 9.5, padding: '1px 5px' }}>
                              {a.blood_group}
                            </span>
                          )}
                        </div>
                        <strong style={{ color: '#0f172a', fontSize: 13.5, display: 'block', marginTop: 3 }}>
                          {a.patient_name}
                        </strong>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                          {a.patient_code} {a.phone ? `· ${a.phone}` : ''}
                        </div>
                      </td>

                      {/* 2. WARD & BED */}
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#059669',
                              background: '#ecfdf5',
                              padding: '2px 7px',
                              borderRadius: 5,
                              border: '1px solid #a7f3d0',
                              fontSize: 12,
                            }}
                          >
                            Bed {a.bed_number}
                          </span>
                          <span className="badge badge-purple" style={{ fontSize: 10, padding: '1px 5px' }}>
                            {a.ward_type}
                          </span>
                        </div>
                        <strong style={{ display: 'block', fontSize: 12.5, color: '#1e293b', marginTop: 3 }}>
                          {a.ward_name}
                        </strong>
                        {a.floor_number && (
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>Floor {a.floor_number}</span>
                        )}
                      </td>

                      {/* 3. DOCTOR & CLINICAL REASON */}
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        <strong style={{ color: '#1e293b', fontSize: 13, display: 'block' }}>
                          Dr. {a.doctor_name}
                        </strong>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                          {a.doctor_specialization || 'Attending Physician'}
                        </div>
                        {a.reason_for_admission && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: '#64748b',
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 170,
                            }}
                            title={a.reason_for_admission}
                          >
                            {a.reason_for_admission}
                          </div>
                        )}
                      </td>

                      {/* 4. STAY & ACCRUED ROOM CHARGES */}
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        <strong style={{ color: '#0f172a', fontSize: 14, display: 'block' }}>
                          Rs. {Number(a.accrued_ward_cost || 0).toLocaleString()}
                        </strong>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          <span className="badge badge-info" style={{ fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                            {a.days_admitted ?? 0} {a.days_admitted === 1 ? 'day' : 'days'}
                          </span>
                          <span style={{ marginLeft: 4 }}>@ Rs. {Number(a.daily_rate || 0).toLocaleString()}/d</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                          Since {new Date(a.admission_date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* 5. DISCHARGE CLEARANCE */}
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        {a.status === 'Discharged' ? (
                          <div>
                            <span className="badge badge-gray" style={{ fontWeight: 700, fontSize: 11 }}>
                              Discharged
                            </span>
                            {a.discharge_date && (
                              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                                {new Date(a.discharge_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : a.bill_status === 'Paid' ? (
                          <div>
                            <span
                              className="badge badge-success"
                              style={{ fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            >
                              ✓ Cleared (Paid)
                            </span>
                            <div style={{ fontSize: 10.5, color: '#059669', marginTop: 2 }}>Ready for release</div>
                          </div>
                        ) : a.bill_status === 'Partial' || a.bill_status === 'Pending' ? (
                          <div>
                            <span className="badge badge-warning" style={{ fontWeight: 700, fontSize: 10.5 }}>
                              Due: Rs. {Number(a.bill_balance || 0).toLocaleString()}
                            </span>
                            <div style={{ fontSize: 10.5, color: '#d97706', marginTop: 2 }}>Settle before release</div>
                          </div>
                        ) : (
                          <div>
                            <span className="badge badge-gray" style={{ fontSize: 11 }}>
                              Unbilled Accrual
                            </span>
                            <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Bill on discharge</div>
                          </div>
                        )}
                      </td>

                      {/* 6. ACTIONS */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 8px' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 5, width: '100%', maxWidth: 100 }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', width: '100%', justifyContent: 'center' }}
                            onClick={() => setSelectedAdmission(a)}
                            title="View / Print Admission Intake Slip"
                          >
                            <FileText size={12} style={{ marginRight: 4 }} />
                            Slip
                          </button>

                          {a.status === 'Active' && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                background: a.bill_status === 'Paid' ? '#059669' : '#f59e0b',
                                color: '#ffffff',
                                fontWeight: 700,
                                width: '100%',
                                justifyContent: 'center',
                                border: 'none',
                              }}
                              onClick={() => {
                                setDischargeModalAdmission(a);
                                setDischargeForm({
                                  diagnosis_at_discharge: 'Discharged clinically stable and ambulatory',
                                  notes: '',
                                });
                              }}
                              title="Discharge patient and release bed"
                            >
                              <LogOut size={12} style={{ marginRight: 4 }} />
                              Discharge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ReceptionistPagination
                page={admissionPage}
                pageSize={admissionPageSize}
                total={admissions.length}
                onPageChange={setAdmissionPage}
              />

              {!loading && !admissions.length && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <span className="empty-state-icon">🏥</span>
                  <h4>No admissions found</h4>
                  <p>No patient admissions match your selected filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: INTERACTIVE WARD BED MAP (VISUAL FLOOR PLAN)
          ========================================================= */}
      {activeView === 'bedmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* BED STATUS COLOR LEGEND */}
          <div
            className="card"
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Bed Census Legend:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981', display: 'inline-block' }} />
                <strong>Available</strong> ({stats.available_beds} beds free)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
                <strong>Occupied</strong> ({stats.occupied_beds} in-patients)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
                <strong>Maintenance</strong>
              </div>
            </div>

            <span style={{ fontSize: 12, color: '#64748b' }}>
              Click any green bed to admit a patient directly into that ward.
            </span>
          </div>

          {/* WARDS FLOOR PLAN GRIDS */}
          {visibleWardsInMap.map((ward) => (
            <div key={ward.ward_id} className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
              {/* WARD HEADER BANNER */}
              <div
                style={{
                  padding: '14px 22px',
                  background: '#f1f5f9',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Building2 size={20} className="text-primary" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {ward.ward_name}
                    </h3>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      {ward.ward_type} Category · Floor {ward.floor_number} · Daily Rate: <strong>Rs. {Number(ward.daily_rate).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span
                    className={`badge ${ward.available_beds > 0 ? 'badge-success' : 'badge-danger'}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    {ward.available_beds} of {ward.total_beds} Beds Available
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 12, padding: '5px 12px', fontWeight: 600 }}
                    onClick={() => handleAdmitInWard(ward.ward_id)}
                    disabled={ward.available_beds <= 0}
                  >
                    + Admit in {ward.ward_type}
                  </button>
                </div>
              </div>

              {/* BEDS VISUAL MATRIX */}
              <div
                style={{
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                {ward.beds.map((b) => {
                  const isOccupied = b.bed_status === 'Occupied' || b.admission_id !== null;

                  return (
                    <div
                      key={b.bed_id}
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        border: `2px solid ${isOccupied ? '#fca5a5' : '#86efac'}`,
                        background: isOccupied ? '#fef2f2' : '#f0fdf4',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 125,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      {/* BED TOP BAR */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            color: isOccupied ? '#991b1b' : '#166534',
                          }}
                        >
                          Bed {b.bed_number}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: isOccupied ? '#dc2626' : '#16a34a',
                            color: '#ffffff',
                          }}
                        >
                          {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                        </span>
                      </div>

                      {/* BED BODY CONTENT */}
                      {isOccupied ? (
                        <div style={{ margin: '8px 0', fontSize: 12 }}>
                          <strong style={{ color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.patient_name || 'Admitted Patient'}
                          </strong>
                          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                            {b.patient_code}
                          </span>
                          {b.doctor_name && (
                            <div style={{ fontSize: 10.5, color: '#475569', marginTop: 2 }}>
                              Dr. {b.doctor_name}
                            </div>
                          )}
                          <div style={{ fontSize: 10.5, color: '#b91c1c', fontWeight: 600, marginTop: 2 }}>
                            Stay: {b.days_admitted ?? 0} days
                          </div>
                        </div>
                      ) : (
                        <div style={{ margin: '8px 0', fontSize: 11.5, color: '#166534' }}>
                          Ready for patient intake. Daily rate: Rs. {Number(ward.daily_rate).toLocaleString()}
                        </div>
                      )}

                      {/* BED ACTION BUTTON */}
                      {isOccupied ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            width: '100%',
                            fontSize: 11,
                            padding: '3px 0',
                            borderColor: '#fca5a5',
                            color: '#991b1b',
                            background: '#ffffff',
                          }}
                          onClick={() => {
                            const found = admissions.find((a) => a.admission_id === b.admission_id);
                            if (found) setSelectedAdmission(found);
                            else setSelectedAdmission(b);
                          }}
                        >
                          View Intake Slip
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          style={{
                            width: '100%',
                            fontSize: 11,
                            padding: '3px 0',
                            fontWeight: 600,
                          }}
                          onClick={() => handleAdmitInWard(ward.ward_id)}
                        >
                          + Admit Here
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          VIEW 3: DAILY WARD CENSUS & SHIFT HANDOVER REPORT
          ========================================================= */}
      {activeView === 'census' && (
        <div className="card" style={{ borderRadius: 12 }}>
          <div
            className="card-header"
            style={{
              padding: '16px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                📊 Daily Hospital In-Patient Census & Shift Handover Roster
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Operational head-count report for nursing shift transitions, administrative audits, and billing verification
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                className="badge badge-success"
                style={{ fontSize: 12, padding: '6px 12px', fontWeight: 700 }}
              >
                ● Live Shift Handover Roster ({admissions.filter((a) => a.status === 'Active').length} Active In-Patients)
              </span>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Ward & Bed</th>
                    <th style={{ width: '24%' }}>In-Patient Details</th>
                    <th style={{ width: '20%' }}>Admitting Doctor</th>
                    <th style={{ width: '20%' }}>Stay & Accrued Charges</th>
                    <th style={{ width: '14%' }}>Clearance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions
                    .filter((a) => a.status === 'Active')
                    .map((a) => (
                      <tr key={a.admission_id}>
                        {/* 1. WARD & BED */}
                        <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontWeight: 800,
                                color: '#059669',
                                background: '#ecfdf5',
                                padding: '2px 7px',
                                borderRadius: 5,
                                border: '1px solid #a7f3d0',
                                fontSize: 12,
                              }}
                            >
                              Bed {a.bed_number}
                            </span>
                            <span className="badge badge-purple" style={{ fontSize: 10, padding: '1px 5px' }}>
                              {a.ward_type}
                            </span>
                          </div>
                          <strong style={{ display: 'block', fontSize: 12.5, color: '#1e293b', marginTop: 3 }}>
                            {a.ward_name}
                          </strong>
                          {a.floor_number && (
                            <span style={{ fontSize: 10.5, color: '#64748b' }}>Floor {a.floor_number}</span>
                          )}
                        </td>

                        {/* 2. PATIENT */}
                        <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{a.patient_name}</strong>
                            {a.blood_group && (
                              <span className="badge badge-danger" style={{ fontSize: 9.5, padding: '1px 5px' }}>
                                {a.blood_group}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                            {a.patient_code} {a.phone ? `· ${a.phone}` : ''}
                          </div>
                        </td>

                        {/* 3. DOCTOR */}
                        <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                          <strong style={{ color: '#1e293b', fontSize: 13, display: 'block' }}>
                            Dr. {a.doctor_name}
                          </strong>
                          <div style={{ fontSize: 11, color: '#475569' }}>
                            {a.doctor_specialization || 'Attending Physician'}
                          </div>
                        </td>

                        {/* 4. STAY & ACCRUED COST */}
                        <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                          <strong style={{ color: '#059669', fontSize: 13.5, display: 'block' }}>
                            Rs. {Number(a.accrued_ward_cost || 0).toLocaleString()}
                          </strong>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            <span className="badge badge-info" style={{ fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                              {a.days_admitted ?? 0} {a.days_admitted === 1 ? 'day' : 'days'}
                            </span>
                            <span style={{ marginLeft: 4 }}>@ Rs. {Number(a.daily_rate).toLocaleString()}/d</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                            Admitted {new Date(a.admission_date).toLocaleDateString()}
                          </div>
                        </td>

                        {/* 5. CLEARANCE STATUS */}
                        <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                          {a.bill_status === 'Paid' ? (
                            <span className="badge badge-success" style={{ fontWeight: 700 }}>✓ Settled</span>
                          ) : a.bill_status === 'Partial' || a.bill_status === 'Pending' ? (
                            <span className="badge badge-warning" style={{ fontWeight: 700 }}>Due: Rs. {Number(a.bill_balance).toLocaleString()}</span>
                          ) : (
                            <span className="badge badge-gray">Unbilled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {!admissions.filter((a) => a.status === 'Active').length && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <span className="empty-state-icon">🛏️</span>
                  <h4>No active in-patients</h4>
                  <p>All hospital ward beds are currently unoccupied.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADMIT PATIENT (DOCTOR ORDERED INTAKE)
          ========================================================= */}
      {showAdmitModal && (
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '24px 16px',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowAdmitModal(false)}
        >
          <div className="modal" style={{ maxWidth: 580, width: '95%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', borderRadius: 14, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)', background: '#ffffff', overflow: 'hidden', margin: 'auto' }}>
            <div
              className="modal-header"
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  🏥 Patient Ward Admission Intake
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Ward & clinical indication decided and ordered by attending doctor
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px', borderColor: '#cbd5e1' }}
                onClick={() => setShowAdmitModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '22px' }}>
              <form onSubmit={handleAdmitPatient}>
                {/* 1. PATIENT SELECTION */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Select Patient *
                  </label>
                  <select
                    className="form-control"
                    value={form.patient_id}
                    onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Patient for Admission --</option>
                    {patients.map((p) => {
                      const activeAdm = activeAdmissionsByPatient[p.patient_id];
                      const isAdmitted = Boolean(activeAdm);
                      return (
                        <option
                          key={p.patient_id}
                          value={p.patient_id}
                          disabled={isAdmitted}
                        >
                          {p.first_name} {p.last_name} ({p.patient_code})
                          {isAdmitted
                            ? ` — [ALREADY ADMITTED: ${activeAdm.ward_name} (Bed ${activeAdm.bed_number})]`
                            : ` — ${p.phone || 'No phone'}`}
                        </option>
                      );
                    })}
                  </select>

                  {/* ALREADY ADMITTED WARNING BANNER */}
                  {activeAdmissionForSelected && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        background: '#fef2f2',
                        border: '1.5px solid #fca5a5',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        color: '#991b1b',
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                      <div style={{ fontSize: 12.5 }}>
                        <strong>Patient Already Admitted:</strong> {selectedPatientObj?.first_name} is currently in{' '}
                        <strong>{activeAdmissionForSelected.ward_name}</strong> (Bed <strong>{activeAdmissionForSelected.bed_number}</strong>) under Dr. {activeAdmissionForSelected.doctor_name}.
                        A patient cannot be admitted to multiple beds simultaneously.
                      </div>
                    </div>
                  )}

                  {/* Selected Patient Mini Banner */}
                  {selectedPatientObj && !activeAdmissionForSelected && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: '6px 12px',
                        background: '#eff6ff',
                        borderRadius: 6,
                        fontSize: 12,
                        display: 'flex',
                        gap: 14,
                        color: '#1e40af',
                      }}
                    >
                      <span><strong>Code:</strong> {selectedPatientObj.patient_code}</span>
                      <span><strong>Blood Group:</strong> {selectedPatientObj.blood_group || 'N/A'}</span>
                      <span><strong>Phone:</strong> {selectedPatientObj.phone || 'N/A'}</span>
                    </div>
                  )}

                  {/* DOCTOR ADMISSION ORDER DETECTED BANNER */}
                  {loadingConsultation && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#2563eb' }}>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Checking for doctor admission orders...
                    </div>
                  )}

                  {!loadingConsultation && parsedAdmissionOrder && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1.5px solid #a7f3d0',
                        boxShadow: '0 2px 12px rgba(5, 150, 105, 0.12)'
                      }}
                    >
                      {/* Banner Header */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>⚡</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#ffffff' }}>
                              Doctor's Inpatient Admission Order Detected
                            </div>
                            <div style={{ fontSize: 11, color: '#d1fae5', marginTop: 1 }}>
                              Form auto-filled from Dr. {parsedAdmissionOrder.doctor_name}'s latest clinical directive
                            </div>
                          </div>
                        </div>
                        {parsedAdmissionOrder.priority && (
                          <span
                            style={{
                              background:
                                parsedAdmissionOrder.priority === 'EMERGENCY' ? '#fca5a5' :
                                parsedAdmissionOrder.priority === 'URGENT' ? '#fde68a' : '#a7f3d0',
                              color:
                                parsedAdmissionOrder.priority === 'EMERGENCY' ? '#7f1d1d' :
                                parsedAdmissionOrder.priority === 'URGENT' ? '#78350f' : '#064e3b',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: 20,
                              textTransform: 'uppercase',
                              letterSpacing: 0.8,
                              flexShrink: 0
                            }}
                          >
                            {parsedAdmissionOrder.priority === 'EMERGENCY' ? '🚨' :
                             parsedAdmissionOrder.priority === 'URGENT' ? '⚠️' : '✅'}{' '}
                            {parsedAdmissionOrder.priority}
                          </span>
                        )}
                      </div>

                      {/* Order Details Grid */}
                      <div style={{ background: '#f0fdf4', padding: '12px 14px' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px 16px',
                            marginBottom: parsedAdmissionOrder.instructions ? 10 : 0
                          }}
                        >
                          {/* Doctor Info */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                              Ordering Physician
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#064e3b' }}>
                              Dr. {parsedAdmissionOrder.doctor_name}
                            </div>
                            {parsedAdmissionOrder.specialization && (
                              <div style={{ fontSize: 11, color: '#059669' }}>{parsedAdmissionOrder.specialization}</div>
                            )}
                          </div>

                          {/* Recommended Ward */}
                          {parsedAdmissionOrder.ward_category && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                Recommended Ward
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #86efac',
                                    padding: '2px 10px',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 800
                                  }}
                                >
                                  {parsedAdmissionOrder.ward_category === 'ICU' ? '⚡ ICU' :
                                   parsedAdmissionOrder.ward_category === 'Pediatric' ? '🧸 Pediatric' :
                                   parsedAdmissionOrder.ward_category === 'Maternity' ? '👶 Maternity' :
                                   parsedAdmissionOrder.ward_category === 'Private' ? '⭐ Private' :
                                   '🏥 ' + parsedAdmissionOrder.ward_category}
                                </span>
                                <span style={{ fontSize: 10.5, color: '#059669', fontStyle: 'italic' }}>
                                  {form.ward_id ? '✓ Auto-selected' : 'Select below ↓'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Clinical Diagnosis */}
                        {parsedAdmissionOrder.diagnosis && (
                          <div style={{ marginBottom: parsedAdmissionOrder.instructions ? 10 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                              Clinical Diagnosis / Admission Indication
                            </div>
                            <div
                              style={{
                                fontSize: 12.5,
                                color: '#064e3b',
                                background: '#dcfce7',
                                border: '1px solid #bbf7d0',
                                borderRadius: 6,
                                padding: '7px 10px',
                                lineHeight: 1.5,
                                fontStyle: 'italic'
                              }}
                            >
                              "{parsedAdmissionOrder.diagnosis}"
                            </div>
                          </div>
                        )}

                        {/* Staff Instructions */}
                        {parsedAdmissionOrder.instructions && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                              Initial Ward Staff Instructions
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#1e3a8a',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: 6,
                                padding: '7px 10px',
                                lineHeight: 1.5
                              }}
                            >
                              📋 {parsedAdmissionOrder.instructions}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer note */}
                      <div
                        style={{
                          background: '#ecfdf5',
                          borderTop: '1px dashed #a7f3d0',
                          padding: '7px 14px',
                          fontSize: 11,
                          color: '#047857',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>✓</span>
                        <span>Doctor, ward, and clinical reason have been auto-filled. Verify and complete ward selection, then click <strong>Admit & Allocate Bed</strong>.</span>
                      </div>
                    </div>
                  )}

                  {!loadingConsultation && form.patient_id && !parsedAdmissionOrder && recentConsultation && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                      ⚠️ No doctor admission order found. Latest appointment: <strong>{recentConsultation.reason?.substring(0, 60)}...</strong> — Doctor pre-filled.
                    </div>
                  )}
                </div>

                {/* 3. ADMITTING DOCTOR (WHO ORDERED ADMISSION) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Admitting Doctor (Examining Physician) *
                  </label>
                  <select
                    className="form-control"
                    value={form.doctor_id}
                    onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Ordering Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.staff_id} value={d.staff_id}>
                        Dr. {d.doctor_name} — {d.specialization || d.dept_name || 'General Medicine'}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Physician who diagnosed the patient and authorized hospital admission
                  </span>
                </div>

                {/* 4. WARD (DECIDED BY ADMITTING DOCTOR) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Assigned Ward (As Decided by Doctor) *
                    {parsedAdmissionOrder?.ward_category && form.ward_id && (
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 20
                        }}
                      >
                        ⚡ Auto-matched to Doctor's Order
                      </span>
                    )}
                  </label>
                  <select
                    className="form-control"
                    value={form.ward_id}
                    onChange={(e) => setForm((f) => ({ ...f, ward_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Ward Ordered by Doctor --</option>
                    {wards.map((w) => (
                      <option
                        key={w.ward_id}
                        value={w.ward_id}
                        disabled={w.available_beds <= 0}
                      >
                        {w.ward_name} ({w.ward_type}) — {w.available_beds} beds free (Floor {w.floor_number}) — Rs. {Number(w.daily_rate).toLocaleString()}/day
                        {w.available_beds <= 0 ? ' [FULL]' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Selected Ward Live Info Card */}
                  {selectedWardObj && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: '8px 12px',
                        background: selectedWardObj.available_beds > 0 ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${selectedWardObj.available_beds > 0 ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: 6,
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{selectedWardObj.ward_name}</strong> · Floor {selectedWardObj.floor_number} · Daily Rate: <strong>Rs. {Number(selectedWardObj.daily_rate).toLocaleString()}</strong>
                      </div>
                      <span
                        className={`badge ${selectedWardObj.available_beds > 0 ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontWeight: 700 }}
                      >
                        {selectedWardObj.available_beds} Beds Available
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. CLINICAL REASON FOR ADMISSION */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Doctor's Clinical Admission Reason & Diagnosis *
                    {parsedAdmissionOrder?.diagnosis && (
                      <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: 12 }}>⚡ Auto-filled from doctor's order</span>
                    )}
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter clinical indication, pre-op/post-op plan, or diagnosis decided by doctor..."
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    required
                  />

                  {/* QUICK INDICATION CHIPS */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center', marginRight: 2 }}>Quick Presets:</span>
                    {quickIndications.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, height: 24 }}
                        onClick={() => setForm((f) => ({ ...f, reason: ind }))}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. DUTY NURSE (OPTIONAL) */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Assigned Duty Nurse (Optional)
                  </label>
                  <select
                    className="form-control"
                    value={form.nurse_id}
                    onChange={(e) => setForm((f) => ({ ...f, nurse_id: e.target.value }))}
                  >
                    <option value="">-- None / Assigned by Ward Head Nurse --</option>
                    {nurses.map((n) => (
                      <option key={n.staff_id} value={n.staff_id}>
                        {n.nurse_name} ({n.phone || 'Duty Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* FOOTER ACTIONS */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'flex-end',
                    paddingTop: 12,
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAdmitModal(false)}
                    disabled={admitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontWeight: 600 }}
                    disabled={
                      admitting ||
                      (selectedWardObj && selectedWardObj.available_beds <= 0) ||
                      Boolean(activeAdmissionForSelected)
                    }
                  >
                    {admitting
                      ? 'Allocating Bed...'
                      : activeAdmissionForSelected
                      ? 'Patient Already Admitted'
                      : 'Admit & Allocate Bed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: DISCHARGE PATIENT & BED CLEARANCE
          ========================================================= */}
      {dischargeModalAdmission && (
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '24px 16px',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
          onClick={(e) => e.target === e.currentTarget && !discharging && setDischargeModalAdmission(null)}
        >
          <div className="modal" style={{ maxWidth: 560, width: '95%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', borderRadius: 14, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)', background: '#ffffff', overflow: 'hidden', margin: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogOut size={20} className="text-warning" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  Patient Discharge & Bed Clearance
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDischargeModalAdmission(null)}
                disabled={discharging}
                style={{ padding: '4px 8px', borderColor: '#cbd5e1' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {/* PATIENT & WARD SUMMARY CARD */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>
                      {dischargeModalAdmission.patient_name}
                    </strong>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8, fontFamily: 'monospace' }}>
                      {dischargeModalAdmission.patient_code}
                    </span>
                  </div>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    {dischargeModalAdmission.ward_name} · Bed {dischargeModalAdmission.bed_number}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    fontSize: 11.5,
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 10,
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b' }}>Admitted Since:</span>
                    <strong style={{ display: 'block', color: '#1e293b', marginTop: 1 }}>
                      {new Date(dischargeModalAdmission.admission_date).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Stay Duration:</span>
                    <strong style={{ display: 'block', color: '#1e293b', marginTop: 1 }}>
                      {dischargeModalAdmission.days_admitted ?? 0} days
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Accrued Bed Cost:</span>
                    <strong style={{ display: 'block', color: '#059669', fontSize: 13.5, marginTop: 1 }}>
                      Rs. {Number(dischargeModalAdmission.accrued_ward_cost || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* FINANCIAL DISCHARGE CLEARANCE ADVISORY */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                  Financial Discharge Clearance Status:
                </label>

                {dischargeModalAdmission.bill_status === 'Paid' ? (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: '#065f46',
                    }}
                  >
                    <CheckCircle2 size={22} style={{ color: '#059669', flexShrink: 0 }} />
                    <div style={{ fontSize: 12 }}>
                      <strong>✓ Financially Cleared for Release!</strong> All hospital charges for this admission have been settled in full. The bed will be released immediately upon discharge.
                    </div>
                  </div>
                ) : dischargeModalAdmission.bill_status === 'Partial' || dischargeModalAdmission.bill_status === 'Pending' ? (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#92400e',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                      <strong style={{ fontSize: 12.5 }}>
                        Outstanding Bill Balance: Rs. {Number(dischargeModalAdmission.bill_balance).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ fontSize: 11.5, marginBottom: 8, color: '#78350f' }}>
                      Patient has an unsettled bill balance. You can collect payment at the Cashier counter before physical discharge.
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px', background: '#ffffff', fontWeight: 600 }}
                      onClick={() => navigate(`/receptionist/billing?patient_id=${dischargeModalAdmission.patient_id}&admission_id=${dischargeModalAdmission.admission_id}`)}
                    >
                      <CreditCard size={12} style={{ marginRight: 4 }} />
                      Go to Cashier / Collect Payment
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#334155',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <CreditCard size={18} style={{ color: '#64748b', flexShrink: 0 }} />
                      <strong style={{ fontSize: 12.5 }}>
                        Unbilled Accrual (Estimated Room: Rs. {Number(dischargeModalAdmission.accrued_ward_cost || 0).toLocaleString()})
                      </strong>
                    </div>
                    <div style={{ fontSize: 11.5, marginBottom: 8, color: '#475569' }}>
                      No final hospital invoice has been generated yet for this admission. Generate the discharge bill to calculate all room days, doctor fees, and medicines.
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 11, padding: '4px 12px', fontWeight: 600 }}
                      onClick={() => navigate(`/receptionist/billing?patient_id=${dischargeModalAdmission.patient_id}&admission_id=${dischargeModalAdmission.admission_id}`)}
                    >
                      <Plus size={12} style={{ marginRight: 4 }} />
                      Generate Discharge Bill
                    </button>
                  </div>
                )}
              </div>

              {/* DISCHARGE CLINICAL DETAILS FORM */}
              <form onSubmit={handleConfirmDischarge}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>
                    Diagnosis at Discharge *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={dischargeForm.diagnosis_at_discharge}
                    onChange={(e) => setDischargeForm((f) => ({ ...f, diagnosis_at_discharge: e.target.value }))}
                    placeholder="e.g. Recovered, clinically stable, post-op healed"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>
                    Discharge Instructions / Handover Notes
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={dischargeForm.notes}
                    onChange={(e) => setDischargeForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Advised rest, follow up in OPD in 7 days"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'flex-end',
                    paddingTop: 12,
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDischargeModalAdmission(null)}
                    disabled={discharging}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning"
                    style={{ fontWeight: 700 }}
                    disabled={discharging}
                  >
                    {discharging ? 'Discharging...' : 'Confirm Discharge & Free Bed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PRINTABLE MODAL: ADMISSION INTAKE SLIP / RECORD
          ========================================================= */}
      {selectedAdmission && (
        <div
          className="modal-overlay print-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelectedAdmission(null)}
        >
          <div className="modal print-modal-dialog a4-view" style={{ maxWidth: 740 }}>
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
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} className="text-primary" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Hospital Patient Admission Record
                  </h3>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                    Official In-Patient Intake & Bed Allocation Slip
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '6px 14px' }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  Print Document
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderColor: '#cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                  }}
                  onClick={() => setSelectedAdmission(null)}
                >
                  <X size={15} />
                  Close
                </button>
              </div>
            </div>

            {/* PRINTABLE BODY */}
            <div
              className="modal-body print-modal-body"
              style={{ padding: '24px 28px', background: '#f1f5f9', maxHeight: '82vh', overflowY: 'auto' }}
            >
              <div id="printable-admission-modal" className="printable-sheet a4">
                <div className="a4-admission-container">
                  {/* HOSPITAL BRANDING */}
                  <div className="invoice-header">
                    <div className="hospital-branding">
                      <div className="hospital-logo-badge">
                        <Building2 size={28} color="#2563eb" />
                      </div>
                      <div>
                        <h1 className="hospital-title">CAREPLUS MEDICAL CENTER</h1>
                        <p className="hospital-sub">Department of In-Patient Services & Ward Admissions</p>
                        <p className="hospital-address">124 Hospital Road, Colombo 07, Sri Lanka · Reg: PV-89241-MED</p>
                        <p className="hospital-contact">Emergency / Admissions Desk: +94 (11) 234-5678 (Ext 102)</p>
                      </div>
                    </div>

                    <div className="invoice-title-block">
                      <h2 className="invoice-badge-label" style={{ color: '#059669', borderColor: '#a7f3d0' }}>
                        ADMISSION INTAKE
                      </h2>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Admission ID:</span>
                        <span className="meta-val highlight" style={{ color: '#059669' }}>
                          ADM-{String(selectedAdmission.admission_id).padStart(5, '0')}
                        </span>
                      </div>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Date & Time:</span>
                        <span className="meta-val">
                          {new Date(selectedAdmission.admission_date).toLocaleString()}
                        </span>
                      </div>
                      <div className="invoice-meta-row">
                        <span className="meta-label">Status:</span>
                        <span className="meta-val highlight" style={{ color: '#059669' }}>
                          {selectedAdmission.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="divider-line" />

                  {/* PATIENT & ALLOCATION GRID */}
                  <div className="invoice-patient-row">
                    <div className="patient-box" style={{ flex: 1 }}>
                      <span className="section-tag">PATIENT DEMOGRAPHICS</span>
                      <h3 className="patient-name">{selectedAdmission.patient_name}</h3>
                      <p className="patient-sub">
                        <strong>Patient Code:</strong> <span className="mono-code">{selectedAdmission.patient_code}</span>
                      </p>
                      <p className="patient-sub">
                        <strong>Blood Group:</strong> <strong>{selectedAdmission.blood_group || 'Unrecorded'}</strong>
                      </p>
                      <p className="patient-sub">
                        <strong>Contact Phone:</strong> {selectedAdmission.phone || 'N/A'}
                      </p>
                    </div>

                    <div className="patient-box" style={{ flex: 1, background: '#f8fafc' }}>
                      <span className="section-tag">WARD & BED ALLOCATION</span>
                      <div style={{ margin: '6px 0' }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Assigned Ward:</span>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          {selectedAdmission.ward_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                        <div>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Bed Number:</span>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#059669' }}>
                            {selectedAdmission.bed_number}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Ward Category:</span>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {selectedAdmission.ward_type}
                          </div>
                        </div>
                        {selectedAdmission.floor_number && (
                          <div>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Floor:</span>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                              Level {selectedAdmission.floor_number}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CLINICAL ADMISSION ORDER */}
                  <div
                    style={{
                      marginTop: 18,
                      padding: '14px 18px',
                      background: '#eff6ff',
                      borderRadius: 8,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <span className="section-tag" style={{ color: '#1d4ed8' }}>
                      ATTENDING PHYSICIAN & CLINICAL INDICATION
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Admitting Physician:</span>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>
                          Dr. {selectedAdmission.doctor_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          {selectedAdmission.doctor_specialization || 'Clinical Specialist'}
                        </div>
                      </div>

                      {selectedAdmission.nurse_name && (
                        <div>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Duty Nurse:</span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>
                            {selectedAdmission.nurse_name}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Clinical Admission Reason:</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#0f172a', lineHeight: 1.5 }}>
                        {selectedAdmission.reason_for_admission || 'General In-Patient Clinical Monitoring'}
                      </p>
                    </div>
                  </div>

                  {/* BARCODE & INSTRUCTIONS */}
                  <div
                    style={{
                      marginTop: 20,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '14px 18px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        In-Patient Admission Protocol
                      </h4>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                        Keep this intake slip for ward transfer, medication rounds, and discharge clearance.
                        Standard visiting hours: 06:00 - 08:00 AM & 05:00 - 07:00 PM.
                      </p>
                    </div>

                    <div style={{ textAlign: 'center', marginLeft: 16 }}>
                      <Barcode
                        value={`ADM-${String(selectedAdmission.admission_id).padStart(5, '0')}`}
                        height={36}
                        narrowWidth={1.2}
                        wideRatio={2.5}
                        showText={true}
                      />
                    </div>
                  </div>

                  {/* SIGNATURES */}
                  <div className="invoice-signatures-row" style={{ marginTop: 42 }}>
                    <div className="signature-col">
                      <div className="signature-line" />
                      <p className="signature-role">Patient / Guardian Signature</p>
                    </div>
                    <div className="signature-col">
                      <div className="signature-line" />
                      <p className="signature-role">Admitting Desk Officer & Hospital Seal</p>
                    </div>
                  </div>

                  <div className="invoice-footer-note">
                    <p>
                      Official Hospital Admission Record generated by CarePlus Hospital Information System.
                      Bed reservation validated via sp_admit_patient with transactional integrity.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
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
                CarePlus Hospital Admissions · Press <kbd style={{ padding: '2px 6px', background: '#e2e8f0', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>Esc</kbd> to close
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '6px 14px', fontWeight: 600, borderColor: '#cbd5e1' }}
                  onClick={() => setSelectedAdmission(null)}
                >
                  <X size={15} style={{ marginRight: 4 }} />
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '6px 16px' }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  Print Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistAdmissions;
