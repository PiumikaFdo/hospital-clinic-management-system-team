import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import DoctorAdmissionOrderAlert from '../../components/DoctorAdmissionOrderAlert';
import ReceptionistPagination from '../../components/ReceptionistPagination';
import { toast } from 'react-toastify';
import {
  Calendar,
  CalendarDays,
  Clock,
  User,
  Users,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Building2,
  DollarSign,
  Phone,
  Mail,
  Filter,
  Check,
  X,
  UserPlus,
  Activity,
  FileText,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';

const ReceptionistAppointments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Appointments and master data
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    today_total: 0,
    today_confirmed: 0,
    today_completed: 0,
    today_billed: 0,
    today_revenue: 0,
    total_unbilled: 0
  });
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [patients, setPatients] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [billingStatusFilter, setBillingStatusFilter] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all', 'today', 'tomorrow', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [appointmentPage, setAppointmentPage] = useState(1);
  const appointmentPageSize = 10;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Create Modal State
  const [patientMode, setPatientMode] = useState('existing'); // 'existing' | 'new'
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedExistingPatient, setSelectedExistingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: 'Male',
    date_of_birth: '',
    blood_group: 'O+',
    address: '',
    emergency_contact: '',
    emergency_contact_name: '',
    allergies: ''
  });

  const [createForm, setCreateForm] = useState({
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    appointment_type: 'Walk-in',
    reason: 'General Consultation',
    notes: '',
    // Billing Options
    generate_bill: true,
    doctor_fees: 2000,
    hospital_fees: 500,
    discount: 0,
    tax_rate: 0,
    is_paid: true,
    payment_method: 'Cash',
    transaction_reference: ''
  });

  const [createDoctorSchedules, setCreateDoctorSchedules] = useState([]);
  const [createSlots, setCreateSlots] = useState([]);
  const [loadingCreateSlots, setLoadingCreateSlots] = useState(false);
  const [createScheduleMsg, setCreateScheduleMsg] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit / Reschedule Modal State
  const [editForm, setEditForm] = useState({
    appointment_id: null,
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'Walk-in',
    reason: '',
    status: 'Confirmed',
    notes: ''
  });
  const [editDoctorSchedules, setEditDoctorSchedules] = useState([]);
  const [editSlots, setEditSlots] = useState([]);
  const [loadingEditSlots, setLoadingEditSlots] = useState(false);
  const [editScheduleMsg, setEditScheduleMsg] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Instant Bill Modal State
  const [billForm, setBillForm] = useState({
    appointment_id: null,
    patient_id: null,
    patient_name: '',
    doctor_fees: 2000,
    hospital_fees: 500,
    discount: 0,
    tax_rate: 0,
    is_paid: true,
    payment_method: 'Cash',
    transaction_reference: ''
  });
  const [submittingBill, setSubmittingBill] = useState(false);

  // Cancel Modal State
  const [cancellingAppt, setCancellingAppt] = useState(false);

  // Initial Data Fetch
  const fetchMasterData = async () => {
    try {
      const [docsRes, deptsRes, patsRes] = await Promise.all([
        API.get('/appointments/public/doctors').catch(() => ({ data: { data: [] } })),
        API.get('/appointments/public/departments').catch(() => ({ data: { data: [] } })),
        API.get('/receptionist/patients').catch(() => ({ data: { data: [] } }))
      ]);
      setDoctors(docsRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
      setPatients(patsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchAppointments = async (showAll = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!showAll && searchTerm) params.append('search', searchTerm);
      if (!showAll && selectedDoctor) params.append('doctor_id', selectedDoctor);
      if (!showAll && selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (!showAll && billingStatusFilter && billingStatusFilter !== 'ALL') params.append('billing_status', billingStatusFilter);

      const today = new Date().toISOString().split('T')[0];
      if (!showAll && dateFilterMode === 'today') {
        params.append('date', today);
      } else if (!showAll && dateFilterMode === 'tomorrow') {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        params.append('date', tom.toISOString().split('T')[0]);
      } else if (!showAll && dateFilterMode === 'custom' && customDate) {
        params.append('date', customDate);
      }

      const res = await API.get(`/receptionist/appointments?${params.toString()}`);
      if (res.data?.success) {
        setAppointments(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments desk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    const handleAppointmentBooked = () => {
      fetchAppointments(true);
      fetchMasterData();
    };
    window.addEventListener('receptionist:appointment-booked', handleAppointmentBooked);
    return () => window.removeEventListener('receptionist:appointment-booked', handleAppointmentBooked);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [searchTerm, selectedDoctor, selectedStatus, billingStatusFilter, dateFilterMode, customDate]);

  useEffect(() => {
    setAppointmentPage(1);
  }, [searchTerm, selectedDoctor, selectedStatus, billingStatusFilter, dateFilterMode, customDate]);

  const paginatedAppointments = useMemo(
    () => appointments.slice((appointmentPage - 1) * appointmentPageSize, appointmentPage * appointmentPageSize),
    [appointments, appointmentPage]
  );

  // Handle URL param patient preselection
  useEffect(() => {
    const prePatientId = searchParams.get('patient_id');
    if (prePatientId && patients.length > 0) {
      const found = patients.find(p => String(p.patient_id) === String(prePatientId));
      if (found) {
        setSelectedExistingPatient(found);
        setPatientMode('existing');
        setShowCreateModal(true);
      }
    }
  }, [searchParams, patients]);

  // --------------------------------------------------------------------------
  // CREATE MODAL SLOTS & LOGIC
  // --------------------------------------------------------------------------
  const fetchCreateSlots = async (docId, date, scheds) => {
    if (!docId || !date) {
      setCreateSlots([]);
      return;
    }
    setLoadingCreateSlots(true);
    setCreateScheduleMsg('');
    try {
      const d = new Date(date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[d.getDay()];

      const isWorkingDay = (scheds || createDoctorSchedules).some(
        s => s.day_of_week?.toLowerCase() === dayName.toLowerCase()
      );

      if (scheds && scheds.length > 0 && !isWorkingDay) {
        const workingDays = (scheds || createDoctorSchedules).map(s => s.day_of_week).join(', ');
        setCreateScheduleMsg(`Dr. is scheduled on: ${workingDays}. Selected date is ${dayName}.`);
      }

      const res = await API.get(`/appointments/public/slots?doctor_id=${docId}&date=${date}`);
      if (res.data?.success) {
        const slots = res.data.data || [];
        setCreateSlots(slots);
        if (res.data.message) {
          setCreateScheduleMsg(res.data.message);
        }
        const firstAvail = slots.find(s => s.available);
        if (firstAvail && !createForm.appointment_time) {
          setCreateForm(f => ({ ...f, appointment_time: firstAvail.time }));
        }
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setCreateSlots([]);
    } finally {
      setLoadingCreateSlots(false);
    }
  };

  const handleCreateDoctorChange = async docId => {
    setCreateForm(f => ({ ...f, doctor_id: docId, appointment_time: '' }));
    if (!docId) {
      setCreateDoctorSchedules([]);
      setCreateSlots([]);
      return;
    }
    try {
      const res = await API.get(`/receptionist/doctors/${docId}/schedule`);
      const scheds = res.data?.data || [];
      setCreateDoctorSchedules(scheds);
      if (createForm.appointment_date) {
        fetchCreateSlots(docId, createForm.appointment_date, scheds);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
  };

  const handleCreateDateChange = date => {
    setCreateForm(f => ({ ...f, appointment_date: date, appointment_time: '' }));
    if (createForm.doctor_id) {
      fetchCreateSlots(createForm.doctor_id, date, createDoctorSchedules);
    }
  };

  const handleCreateSubmit = async e => {
    e.preventDefault();
    if (patientMode === 'existing' && !selectedExistingPatient) {
      return toast.warning('Please select a registered patient.');
    }
    if (patientMode === 'new' && (!newPatient.first_name || !newPatient.phone)) {
      return toast.warning('Patient first name and phone number are required.');
    }
    if (!createForm.doctor_id || !createForm.appointment_date || !createForm.appointment_time) {
      return toast.warning('Doctor, appointment date, and time slot are required.');
    }

    setSubmittingCreate(true);
    try {
      const payload = {
        patient_mode: patientMode,
        patient_id: patientMode === 'existing' ? selectedExistingPatient.patient_id : null,
        ...(patientMode === 'new' ? newPatient : {}),
        doctor_id: createForm.doctor_id,
        appointment_date: createForm.appointment_date,
        appointment_time: createForm.appointment_time,
        appointment_type: createForm.appointment_type,
        reason: createForm.reason,
        notes: createForm.notes,
        generate_bill: createForm.generate_bill,
        doctor_fees: createForm.doctor_fees,
        hospital_fees: createForm.hospital_fees,
        discount: createForm.discount,
        tax_rate: createForm.tax_rate,
        is_paid: createForm.is_paid,
        payment_method: createForm.payment_method,
        transaction_reference: createForm.transaction_reference
      };

      const res = await API.post('/receptionist/appointments', payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Appointment booked successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        setSearchTerm('');
        setSelectedDoctor('');
        setSelectedStatus('ALL');
        setBillingStatusFilter('ALL');
        setDateFilterMode('all');
        setCustomDate('');
        await fetchAppointments(true);
        await fetchMasterData(); // Refresh patient count/list
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      toast.error(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedExistingPatient(null);
    setPatientSearch('');
    setNewPatient({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      gender: 'Male',
      date_of_birth: '',
      blood_group: 'O+',
      address: '',
      emergency_contact: '',
      emergency_contact_name: '',
      allergies: ''
    });
    setCreateForm({
      doctor_id: '',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      appointment_type: 'Walk-in',
      reason: 'General Consultation',
      notes: '',
      generate_bill: true,
      doctor_fees: 2000,
      hospital_fees: 500,
      discount: 0,
      tax_rate: 0,
      is_paid: true,
      payment_method: 'Cash',
      transaction_reference: ''
    });
    setCreateSlots([]);
    setCreateDoctorSchedules([]);
    setCreateScheduleMsg('');
  };

  const openCreateModal = event => {
    event?.preventDefault();
    event?.stopPropagation();
    setShowCreateModal(true);
    resetCreateForm();
  };

  // --------------------------------------------------------------------------
  // EDIT / RESCHEDULE MODAL LOGIC
  // --------------------------------------------------------------------------
  const openEditModal = async appt => {
    setSelectedAppt(appt);
    setEditForm({
      appointment_id: appt.appointment_id,
      doctor_id: appt.doctor_id,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      appointment_type: appt.appointment_type || 'Walk-in',
      reason: appt.reason || '',
      status: appt.status || 'Confirmed',
      notes: appt.notes || ''
    });

    try {
      const res = await API.get(`/receptionist/doctors/${appt.doctor_id}/schedule`);
      const scheds = res.data?.data || [];
      setEditDoctorSchedules(scheds);
      fetchEditSlots(appt.doctor_id, appt.appointment_date, scheds);
    } catch (err) {
      console.error('Error loading doctor schedule:', err);
    }

    setShowEditModal(true);
  };

  const fetchEditSlots = async (docId, date, scheds) => {
    if (!docId || !date) {
      setEditSlots([]);
      return;
    }
    setLoadingEditSlots(true);
    setEditScheduleMsg('');
    try {
      const res = await API.get(`/appointments/public/slots?doctor_id=${docId}&date=${date}`);
      if (res.data?.success) {
        setEditSlots(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching edit slots:', err);
    } finally {
      setLoadingEditSlots(false);
    }
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const res = await API.put(`/receptionist/appointments/${editForm.appointment_id}`, editForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'Appointment updated successfully!');
        setShowEditModal(false);
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast.error(err.response?.data?.message || 'Failed to update appointment');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // --------------------------------------------------------------------------
  // INSTANT BILL & PAYMENT MODAL
  // --------------------------------------------------------------------------
  const openBillModal = appt => {
    setSelectedAppt(appt);
    setBillForm({
      appointment_id: appt.appointment_id,
      patient_id: appt.patient_id,
      patient_name: appt.patient_name || 'Patient',
      doctor_fees: 2000,
      hospital_fees: 500,
      discount: 0,
      tax_rate: 0,
      is_paid: true,
      payment_method: 'Cash',
      transaction_reference: `OPD-APPT-${appt.appointment_id}`
    });
    setShowBillModal(true);
  };

  const handleBillSubmit = async e => {
    e.preventDefault();
    setSubmittingBill(true);
    try {
      const res = await API.post(`/receptionist/appointments/${billForm.appointment_id}/bill`, billForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'Consultation invoice processed!');
        setShowBillModal(false);
        fetchAppointments();
        if (res.data.bill_id) {
          navigate(`/receptionist/billing?bill_id=${res.data.bill_id}&patient_id=${billForm.patient_id}`);
        }
      }
    } catch (err) {
      console.error('Error creating bill:', err);
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setSubmittingBill(false);
    }
  };

  // --------------------------------------------------------------------------
  // CANCEL / DELETE MODAL
  // --------------------------------------------------------------------------
  const openCancelModal = appt => {
    setSelectedAppt(appt);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppt) return;
    setCancellingAppt(true);
    try {
      const res = await API.delete(`/receptionist/appointments/${selectedAppt.appointment_id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Appointment status updated');
        setShowCancelModal(false);
        setSelectedAppt(null);
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancellingAppt(false);
    }
  };

  // Filtered patients for dropdown in create modal
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 20);
    const s = patientSearch.toLowerCase();
    return patients.filter(
      p =>
        p.first_name?.toLowerCase().includes(s) ||
        p.last_name?.toLowerCase().includes(s) ||
        p.patient_code?.toLowerCase().includes(s) ||
        p.phone?.includes(s)
    ).slice(0, 25);
  }, [patients, patientSearch]);

  const totalCalculatedBill = useMemo(() => {
    const doc = Number(createForm.doctor_fees) || 0;
    const hosp = Number(createForm.hospital_fees) || 0;
    const disc = Number(createForm.discount) || 0;
    const tax = Number(createForm.tax_rate) || 0;
    const subtotal = Math.max(0, doc + hosp - disc);
    return subtotal + (subtotal * tax) / 100;
  }, [createForm.doctor_fees, createForm.hospital_fees, createForm.discount, createForm.tax_rate]);

  const totalCalculatedInstantBill = useMemo(() => {
    const doc = Number(billForm.doctor_fees) || 0;
    const hosp = Number(billForm.hospital_fees) || 0;
    const disc = Number(billForm.discount) || 0;
    const tax = Number(billForm.tax_rate) || 0;
    const subtotal = Math.max(0, doc + hosp - disc);
    return subtotal + (subtotal * tax) / 100;
  }, [billForm.doctor_fees, billForm.hospital_fees, billForm.discount, billForm.tax_rate]);

  return (
    <DashboardLayout title="Appointment Desk & Outpatient Consultations">
      <DoctorAdmissionOrderAlert />
      {/* 1. TOP STAT CARDS */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Today's Appointments
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {stats.today_total}
              </div>
              <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                {stats.today_confirmed} Confirmed
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5'
              }}
            >
              <CalendarDays size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Completed Visits
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {stats.today_completed}
              </div>
              <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px' }}>
                Consultations Done
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}
            >
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Today's Paid Invoices
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                Rs. {Number(stats.today_revenue).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {stats.today_billed} Consultations Billed
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}
            >
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Unbilled Consultations
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: stats.total_unbilled > 0 ? '#d97706' : '#64748b', marginTop: '4px' }}>
                {stats.total_unbilled}
              </div>
              <div
                style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setBillingStatusFilter('Unbilled')}
              >
                Filter Unbilled Visits →
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}
            >
              <CreditCard size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTION & FILTER CONTROLS */}
      <div className="card" style={{ marginBottom: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by patient, phone, doctor, ID..."
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Date quick pills */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
                {[
                  { id: 'all', label: 'All Dates' },
                  { id: 'today', label: 'Today' },
                  { id: 'tomorrow', label: 'Tomorrow' },
                  { id: 'custom', label: 'Custom' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDateFilterMode(tab.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: dateFilterMode === tab.id ? '#ffffff' : 'transparent',
                      color: dateFilterMode === tab.id ? '#1e293b' : '#64748b',
                      boxShadow: dateFilterMode === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {dateFilterMode === 'custom' && (
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                />
              )}
            </div>

            {/* Right Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchAppointments}
                title="Refresh table"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
                aria-label="Open new appointment and consultation form"
                style={{
                  padding: '8px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#7e22ce',
                  borderColor: '#7e22ce',
                  fontWeight: 600
                }}
              >
                <Plus size={16} />
                New Appointment & Consultation
              </button>
            </div>
          </div>

          {/* Secondary filter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Doctor:</span>
              <select
                className="form-control"
                style={{ width: '190px', padding: '5px 8px', fontSize: '12.5px' }}
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.staff_id} value={d.staff_id}>
                    Dr. {d.doctor_name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Visit Status:</span>
              <select
                className="form-control"
                style={{ width: '150px', padding: '5px 8px', fontSize: '12.5px' }}
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No_Show">No Show</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Billing:</span>
              <select
                className="form-control"
                style={{ width: '160px', padding: '5px 8px', fontSize: '12.5px' }}
                value={billingStatusFilter}
                onChange={e => setBillingStatusFilter(e.target.value)}
              >
                <option value="ALL">All Invoices</option>
                <option value="Paid">Paid Only</option>
                <option value="Pending">Pending Unpaid</option>
                <option value="Unbilled">Not Yet Billed</option>
              </select>
            </div>

            {(searchTerm || selectedDoctor || selectedStatus !== 'ALL' || billingStatusFilter !== 'ALL' || dateFilterMode !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDoctor('');
                  setSelectedStatus('ALL');
                  setBillingStatusFilter('ALL');
                  setDateFilterMode('all');
                  setCustomDate('');
                }}
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginLeft: 'auto'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. APPOINTMENTS TABLE */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} style={{ color: '#7e22ce' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Consultation Schedule & Bookings ({appointments.length})
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing real-time hospital appointments
          </span>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '1180px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>VISIT TIME</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>PATIENT PROFILE</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>DOCTOR & CLINIC</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>TYPE & REASON</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATUS</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>BILLING & INVOICE</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.map(a => {
                  const isPaid = a.bill_payment_status === 'Paid';
                  const isPendingBill = ['Pending', 'Partial'].includes(a.bill_payment_status);
                  const isUnbilled = !a.bill_id;

                  return (
                    <tr
                      key={a.appointment_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 1. Appt ID & Time */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                          Visit {a.appointment_id}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <Calendar size={12} />
                          {a.appointment_date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#7e22ce', fontWeight: 600, marginTop: '1px' }}>
                          <Clock size={12} />
                          {String(a.appointment_time).slice(0, 5)}
                        </div>
                      </td>

                      {/* 2. Patient Profile */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                            {a.patient_name || a.guest_name || 'Walk-in Guest'}
                          </div>
                          {a.patient_code && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}
                            >
                              {a.patient_code}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '10px' }}>
                          {a.patient_phone && <span>📞 {a.patient_phone}</span>}
                          {a.patient_gender && <span>{a.patient_gender} · {a.patient_age ? `${a.patient_age}y` : ''}</span>}
                          {a.blood_group && <span style={{ color: '#ef4444', fontWeight: 600 }}>{a.blood_group}</span>}
                        </div>
                      </td>

                      {/* 3. Doctor & Clinic */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          Dr. {a.doctor_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 500, marginTop: '2px' }}>
                          {a.doctor_specialization || 'Consultant'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {a.dept_name || 'Outpatient Department'}
                        </div>
                      </td>

                      {/* 4. Type & Reason */}
                      <td style={{ padding: '14px', verticalAlign: 'middle', maxWidth: '200px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: a.appointment_type === 'Emergency' ? '#fee2e2' : a.appointment_type === 'Online' ? '#e0f2fe' : '#f1f5f9',
                            color: a.appointment_type === 'Emergency' ? '#dc2626' : a.appointment_type === 'Online' ? '#0369a1' : '#475569',
                            display: 'inline-block',
                            marginBottom: '4px'
                          }}
                        >
                          {a.appointment_type || 'Walk-in'}
                        </span>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={a.reason}
                        >
                          {a.reason || 'General Consultation'}
                        </div>
                      </td>

                      {/* 5. Status Badge */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span
                          className={`badge ${
                            a.status === 'Confirmed'
                              ? 'badge-success'
                              : a.status === 'Completed'
                              ? 'badge-primary'
                              : a.status === 'Cancelled'
                              ? 'badge-danger'
                              : 'badge-gray'
                          }`}
                          style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 600 }}
                        >
                          {a.status}
                        </span>
                      </td>

                      {/* 6. Billing & Invoice */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        {isPaid && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge badge-success" style={{ fontSize: '11px' }}>
                                ✓ Paid
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                                Rs. {Number(a.bill_total).toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#64748b',
                                marginTop: '2px',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              onClick={() => navigate(`/receptionist/billing?bill_id=${a.bill_id}&patient_id=${a.patient_id}`)}
                            >
                              Invoice {a.bill_id}
                            </div>
                          </div>
                        )}

                        {isPendingBill && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                                ⏳                                 {a.bill_payment_status === 'Partial' ? 'Partially Paid' : 'Unpaid Bill'}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
                                Rs. {Number(a.bill_balance || a.bill_total).toLocaleString()}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/receptionist/billing?bill_id=${a.bill_id}&patient_id=${a.patient_id}`)}
                              style={{
                                marginTop: '4px',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid #f59e0b',
                                background: '#fffbeb',
                                color: '#b45309',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Collect Payment →
                            </button>
                          </div>
                        )}

                        {isUnbilled && (
                          <div>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', display: 'block', marginBottom: '4px' }}>
                              Not Invoiced
                            </span>
                            <button
                              type="button"
                              onClick={() => openBillModal(a)}
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CreditCard size={11} />
                              Create Invoice
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 7. Row Actions */}
                      <td style={{ padding: '14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div className="table-action-group">
                          <button
                            type="button"
                            className="table-action-btn btn-view"
                            title="View Full Appointment Dossier"
                            onClick={() => {
                              setSelectedAppt(a);
                              setShowViewModal(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            className="table-action-btn btn-edit"
                            title="Reschedule / Edit Appointment"
                            onClick={() => openEditModal(a)}
                          >
                            <Edit2 size={14} />
                          </button>

                          {isUnbilled && (
                            <button
                              type="button"
                              className="table-action-btn btn-bill"
                              title="Generate Consultation Invoice"
                              onClick={() => openBillModal(a)}
                            >
                              <CreditCard size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="table-action-btn btn-delete"
                            title="Cancel / Delete Appointment"
                            onClick={() => openCancelModal(a)}
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
            <ReceptionistPagination
              page={appointmentPage}
              pageSize={appointmentPageSize}
              total={appointments.length}
              onPageChange={setAppointmentPage}
            />

            {!loading && appointments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                <Calendar size={42} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '16px' }}>No Appointments Found</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Try adjusting search keywords, date range, or doctor filters.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreateModal}
                  style={{ marginTop: '16px', background: '#7e22ce', borderColor: '#7e22ce' }}
                >
                  <Plus size={14} /> Book New Consultation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. MODAL: CREATE APPOINTMENT & CONSULTATION                           */}
      {/* ===================================================================== */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget && !submittingCreate) setShowCreateModal(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '740px',
              width: '100%',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <form onSubmit={handleCreateSubmit}>
              <div
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                  padding: '18px 24px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                    📅 Book Outpatient Doctor Consultation
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#e9d5ff' }}>
                    Select existing patient or register walk-in patient with integrated billing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* 1. Patient Selection Mode Toggle */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                    Patient Record Status *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setPatientMode('existing')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: patientMode === 'existing' ? '#7e22ce' : '#e2e8f0',
                        background: patientMode === 'existing' ? '#faf5ff' : '#ffffff',
                        color: patientMode === 'existing' ? '#7e22ce' : '#64748b',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <UserCheck size={16} />
                      Existing Registered Patient
                    </button>

                    <button
                      type="button"
                      onClick={() => setPatientMode('new')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: patientMode === 'new' ? '#7e22ce' : '#e2e8f0',
                        background: patientMode === 'new' ? '#faf5ff' : '#ffffff',
                        color: patientMode === 'new' ? '#7e22ce' : '#64748b',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <UserPlus size={16} />
                      + New Walk-in Patient (Quick Intake)
                    </button>
                  </div>
                </div>

                {/* Patient Selection Details */}
                {patientMode === 'existing' ? (
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px' }}>
                      Search & Select Patient *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type patient name, code (PAT...), or phone number..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      style={{ marginBottom: '8px' }}
                    />

                    <select
                      className="form-control"
                      size={4}
                      style={{ height: '110px' }}
                      value={selectedExistingPatient?.patient_id || ''}
                      onChange={e => {
                        const pat = patients.find(p => String(p.patient_id) === String(e.target.value));
                        setSelectedExistingPatient(pat || null);
                      }}
                      required={patientMode === 'existing'}
                    >
                      {filteredPatients.map(p => (
                        <option key={p.patient_id} value={p.patient_id} style={{ padding: '4px 6px' }}>
                          {p.first_name} {p.last_name} ({p.patient_code}) · 📞 {p.phone || 'No phone'} · Blood: {p.blood_group || 'O+'}
                        </option>
                      ))}
                    </select>

                    {selectedExistingPatient && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 12px',
                          background: '#ecfdf5',
                          borderRadius: '8px',
                          border: '1px solid #a7f3d0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12.5px'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#065f46' }}>
                            ✓ Selected: {selectedExistingPatient.first_name} {selectedExistingPatient.last_name}
                          </strong>{' '}
                          ({selectedExistingPatient.patient_code})
                          <div style={{ color: '#047857', fontSize: '11.5px', marginTop: '2px' }}>
                            Phone: {selectedExistingPatient.phone} · Blood: {selectedExistingPatient.blood_group} · Age: {selectedExistingPatient.age || 'N/A'}y
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedExistingPatient(null)}
                          style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b', marginBottom: '10px' }}>
                      Walk-in Patient Demographics
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">First Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={newPatient.first_name}
                          onChange={e => setNewPatient(p => ({ ...p, first_name: e.target.value }))}
                          placeholder="e.g. Kasun"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newPatient.last_name}
                          onChange={e => setNewPatient(p => ({ ...p, last_name: e.target.value }))}
                          placeholder="e.g. Perera"
                        />
                      </div>
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Phone Number *</label>
                        <input
                          type="tel"
                          className="form-control"
                          required
                          value={newPatient.phone}
                          onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))}
                          placeholder="e.g. 0771234567"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email (Optional)</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newPatient.email}
                          onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))}
                          placeholder="patient@gmail.com"
                        />
                      </div>
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Gender</label>
                        <select
                          className="form-control"
                          value={newPatient.gender}
                          onChange={e => setNewPatient(p => ({ ...p, gender: e.target.value }))}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Blood Group</label>
                        <select
                          className="form-control"
                          value={newPatient.blood_group}
                          onChange={e => setNewPatient(p => ({ ...p, blood_group: e.target.value }))}
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newPatient.date_of_birth}
                          onChange={e => setNewPatient(p => ({ ...p, date_of_birth: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Doctor & Schedule */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Examining Doctor / Specialist *
                  </label>
                  <select
                    className="form-control"
                    value={createForm.doctor_id}
                    onChange={e => handleCreateDoctorChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Examining Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.staff_id} value={d.staff_id}>
                        Dr. {d.doctor_name} · {d.specialization} ({d.dept_name})
                      </option>
                    ))}
                  </select>
                </div>

                {createDoctorSchedules.length > 0 && (
                  <div style={{ marginBottom: '14px', background: '#faf5ff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#7e22ce', display: 'block', marginBottom: '4px' }}>
                      Doctor Duty Schedule:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {createDoctorSchedules.map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            background: '#ffffff',
                            border: '1px solid #d8b4fe',
                            color: '#6b21a8',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 500
                          }}
                        >
                          {s.day_of_week}: {String(s.start_time).slice(0, 5)} - {String(s.end_time).slice(0, 5)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Date & Type */}
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Consultation Date *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={createForm.appointment_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => handleCreateDateChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Appointment Type *
                    </label>
                    <select
                      className="form-control"
                      value={createForm.appointment_type}
                      onChange={e => setCreateForm(f => ({ ...f, appointment_type: e.target.value }))}
                    >
                      <option value="Walk-in">Walk-in Consultation</option>
                      <option value="Online">Online Booking</option>
                      <option value="Emergency">Emergency Outpatient</option>
                    </select>
                  </div>
                </div>

                {/* 4. Time Slots */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Available Consultation Time Slot *</span>
                    {loadingCreateSlots && <span style={{ color: '#7e22ce', fontSize: '11px' }}>Checking slots...</span>}
                  </label>

                  {createScheduleMsg && (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '12px', marginBottom: '8px' }}>
                      ℹ️ {createScheduleMsg}
                    </div>
                  )}

                  {createSlots.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                        gap: '8px',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#f8fafc'
                      }}
                    >
                      {createSlots.map(slot => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setCreateForm(f => ({ ...f, appointment_time: slot.time }))}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: '1px solid',
                            cursor: slot.available ? 'pointer' : 'not-allowed',
                            background: createForm.appointment_time === slot.time
                              ? '#7e22ce'
                              : slot.available ? '#ffffff' : '#f1f5f9',
                            color: createForm.appointment_time === slot.time
                              ? '#ffffff'
                              : slot.available ? '#334155' : '#94a3b8',
                            borderColor: createForm.appointment_time === slot.time
                              ? '#7e22ce'
                              : slot.available ? '#cbd5e1' : '#e2e8f0'
                          }}
                        >
                          {slot.time.slice(0, 5)}
                          <div style={{ fontSize: '9px', opacity: 0.85 }}>
                            {slot.available ? 'Free' : 'Booked'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !loadingCreateSlots && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                        {createForm.doctor_id ? 'Select an appointment date matching doctor schedule.' : 'Select an examining doctor first to load slots.'}
                      </div>
                    )
                  )}
                </div>

                {/* 5. Reason */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Clinical Reason / Symptoms / Referral
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Chief complaint or consultation reason..."
                    value={createForm.reason}
                    onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>

                {/* 6. INTEGRATED BILLING & PAYMENT SECTION */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: createForm.generate_bill ? '12px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} style={{ color: '#0284c7' }} />
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                        Integrated Billing Desk (OPD Consultation Invoice)
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={createForm.generate_bill}
                        onChange={e => setCreateForm(f => ({ ...f, generate_bill: e.target.checked }))}
                      />
                      Generate Invoice on Booking
                    </label>
                  </div>

                  {createForm.generate_bill && (
                    <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11.5px' }}>Doctor Fee (Rs.)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={createForm.doctor_fees}
                            onChange={e => setCreateForm(f => ({ ...f, doctor_fees: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11.5px' }}>Hospital Fee (Rs.)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={createForm.hospital_fees}
                            onChange={e => setCreateForm(f => ({ ...f, hospital_fees: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11.5px' }}>Total Amount</label>
                          <div style={{ padding: '8px 12px', background: '#e0f2fe', borderRadius: '6px', fontWeight: 700, color: '#0369a1', fontSize: '14px' }}>
                            Rs. {totalCalculatedBill.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b' }}>Payment Collection:</span>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="is_paid"
                                checked={createForm.is_paid === true}
                                onChange={() => setCreateForm(f => ({ ...f, is_paid: true }))}
                              />
                              Collect Payment Now (Paid)
                            </label>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="is_paid"
                                checked={createForm.is_paid === false}
                                onChange={() => setCreateForm(f => ({ ...f, is_paid: false }))}
                              />
                              Queue as Pending (Pay Later)
                            </label>
                          </div>
                        </div>

                        {createForm.is_paid && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              className="form-control"
                              style={{ width: '130px', fontSize: '12px' }}
                              value={createForm.payment_method}
                              onChange={e => setCreateForm(f => ({ ...f, payment_method: e.target.value }))}
                            >
                              <option value="Cash">Cash</option>
                              <option value="Card">Card</option>
                              <option value="UPI">UPI / QR</option>
                              <option value="Bank_Transfer">Bank Transfer</option>
                              <option value="Insurance">Insurance</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '14px 24px',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingCreate || !createForm.doctor_id || !createForm.appointment_time}
                  style={{
                    background: '#7e22ce',
                    borderColor: '#7e22ce',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                >
                  <Calendar size={15} />
                  {submittingCreate ? 'Processing...' : 'Confirm Consultation Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL: VIEW APPOINTMENT DOSSIER                                   */}
      {/* ===================================================================== */}
      {showViewModal && selectedAppt && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setShowViewModal(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '650px',
              width: '100%',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <div
              className="modal-header"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarDays size={20} style={{ color: '#c084fc' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    Appointment Dossier #{selectedAppt.appointment_id}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Scheduled on {selectedAppt.appointment_date} at {String(selectedAppt.appointment_time).slice(0, 5)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Patient Card */}
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {selectedAppt.patient_name || selectedAppt.guest_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Code: {selectedAppt.patient_code || 'Walk-in Guest'} · Phone: {selectedAppt.patient_phone || selectedAppt.guest_phone || 'N/A'}
                    </div>
                  </div>
                  <span className="badge badge-info">{selectedAppt.blood_group || 'O+'}</span>
                </div>
              </div>

              {/* Consultation Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>EXAMINING DOCTOR</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                    Dr. {selectedAppt.doctor_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2563eb' }}>
                    {selectedAppt.doctor_specialization} · {selectedAppt.dept_name}
                  </div>
                </div>

                <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>APPOINTMENT STATUS</div>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      className={`badge ${
                        selectedAppt.status === 'Confirmed'
                          ? 'badge-success'
                          : selectedAppt.status === 'Completed'
                          ? 'badge-primary'
                          : 'badge-gray'
                      }`}
                      style={{ fontSize: '12px' }}
                    >
                      {selectedAppt.status}
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: '8px' }}>
                      ({selectedAppt.appointment_type || 'Walk-in'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CLINICAL REASON / CHIEF COMPLAINT</div>
                <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px' }}>
                  {selectedAppt.reason || 'General Clinical Consultation'}
                </div>
              </div>

              {/* Financial Dossier */}
              <div style={{ padding: '14px', borderRadius: '10px', background: selectedAppt.bill_id ? '#f0fdf4' : '#fffbeb', border: '1px solid', borderColor: selectedAppt.bill_id ? '#bbf7d0' : '#fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={16} style={{ color: selectedAppt.bill_id ? '#16a34a' : '#d97706' }} />
                    <span style={{ fontWeight: 700, fontSize: '13px', color: selectedAppt.bill_id ? '#166534' : '#92400e' }}>
                      Financial & Billing Status
                    </span>
                  </div>
                  {selectedAppt.bill_payment_status && (
                    <span className={`badge ${selectedAppt.bill_payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                      {selectedAppt.bill_payment_status}
                    </span>
                  )}
                </div>

                {selectedAppt.bill_id ? (
                  <div style={{ fontSize: '12.5px', color: '#14532d' }}>
                    <div>Invoice #{selectedAppt.bill_id} issued on {selectedAppt.bill_date || selectedAppt.appointment_date}</div>
                    <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '14px' }}>
                      Total Amount: Rs. {Number(selectedAppt.bill_total).toLocaleString()} · Paid: Rs. {Number(selectedAppt.bill_paid).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12.5px', color: '#92400e' }}>
                    No invoice generated yet for this consultation.
                    <button
                      type="button"
                      onClick={() => {
                        setShowViewModal(false);
                        openBillModal(selectedAppt);
                      }}
                      style={{
                        marginLeft: '10px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '11.5px'
                      }}
                    >
                      + Generate Bill Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '12px 20px',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedAppt);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={14} /> Reschedule / Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. MODAL: RESCHEDULE / EDIT APPOINTMENT                              */}
      {/* ===================================================================== */}
      {showEditModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget && !submittingEdit) setShowEditModal(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '620px',
              width: '100%',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <form onSubmit={handleEditSubmit}>
              <div
                className="modal-header"
                style={{
                  background: '#7e22ce',
                  color: '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    ✏️ Reschedule & Update Appointment #{editForm.appointment_id}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#e9d5ff' }}>
                    Modify doctor, date, available slot, or visit status
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Doctor</label>
                  <select
                    className="form-control"
                    value={editForm.doctor_id}
                    onChange={async e => {
                      const docId = e.target.value;
                      setEditForm(f => ({ ...f, doctor_id: docId, appointment_time: '' }));
                      const res = await API.get(`/receptionist/doctors/${docId}/schedule`);
                      setEditDoctorSchedules(res.data?.data || []);
                      fetchEditSlots(docId, editForm.appointment_date);
                    }}
                    required
                  >
                    {doctors.map(d => (
                      <option key={d.staff_id} value={d.staff_id}>
                        Dr. {d.doctor_name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.appointment_date}
                      onChange={e => {
                        const date = e.target.value;
                        setEditForm(f => ({ ...f, appointment_date: date, appointment_time: '' }));
                        fetchEditSlots(editForm.doctor_id, date);
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Visit Status</label>
                    <select
                      className="form-control"
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="No_Show">No Show</option>
                    </select>
                  </div>
                </div>

                {/* Slots */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Select Time Slot *</span>
                    {loadingEditSlots && <span style={{ color: '#7e22ce', fontSize: '11px' }}>Loading slots...</span>}
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                      gap: '8px',
                      maxHeight: '130px',
                      overflowY: 'auto',
                      padding: '8px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {editSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available && slot.time !== editForm.appointment_time}
                        onClick={() => setEditForm(f => ({ ...f, appointment_time: slot.time }))}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          border: '1px solid',
                          background: editForm.appointment_time === slot.time ? '#7e22ce' : '#ffffff',
                          color: editForm.appointment_time === slot.time ? '#ffffff' : '#334155',
                          borderColor: editForm.appointment_time === slot.time ? '#7e22ce' : '#cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        {slot.time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Clinical Reason</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={editForm.reason}
                    onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                  />
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingEdit || !editForm.appointment_time}
                  style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. MODAL: INSTANT OPD INVOICE & PAYMENT                               */}
      {/* ===================================================================== */}
      {showBillModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget && !submittingBill) setShowBillModal(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '540px',
              width: '100%',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <form onSubmit={handleBillSubmit}>
              <div
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    💳 Generate OPD Consultation Invoice
                  </h3>
                  <div style={{ fontSize: '12px', color: '#e0f2fe' }}>
                    Issue bill for Appointment #{billForm.appointment_id} ({billForm.patient_name})
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
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Doctor Fee (Rs.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={billForm.doctor_fees}
                      onChange={e => setBillForm(f => ({ ...f, doctor_fees: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Hospital Fee (Rs.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={billForm.hospital_fees}
                      onChange={e => setBillForm(f => ({ ...f, hospital_fees: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#e0f2fe',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0369a1', fontSize: '13px' }}>
                    Total Consultation Invoice:
                  </span>
                  <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '16px' }}>
                    Rs. {totalCalculatedInstantBill.toLocaleString()}
                  </span>
                </div>

                <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <label style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                    Payment Options:
                  </label>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="instant_is_paid"
                        checked={billForm.is_paid === true}
                        onChange={() => setBillForm(f => ({ ...f, is_paid: true }))}
                      />
                      Collect Payment Now (Paid)
                    </label>
                    <label style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="instant_is_paid"
                        checked={billForm.is_paid === false}
                        onChange={() => setBillForm(f => ({ ...f, is_paid: false }))}
                      />
                      Queue in Billing Desk (Unpaid)
                    </label>
                  </div>

                  {billForm.is_paid && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Payment Method</label>
                        <select
                          className="form-control"
                          value={billForm.payment_method}
                          onChange={e => setBillForm(f => ({ ...f, payment_method: e.target.value }))}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Credit / Debit Card</option>
                          <option value="UPI">UPI / Digital QR</option>
                          <option value="Bank_Transfer">Bank Transfer</option>
                          <option value="Insurance">Insurance Provider</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px' }}>Ref #</label>
                        <input
                          type="text"
                          className="form-control"
                          value={billForm.transaction_reference}
                          onChange={e => setBillForm(f => ({ ...f, transaction_reference: e.target.value }))}
                          placeholder="Receipt / txn ref"
                        />
                      </div>
                    </div>
                  )}
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBillModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingBill}
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                >
                  {submittingBill ? 'Processing...' : 'Confirm & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. MODAL: CANCEL / DELETE CONFIRMATION                                */}
      {/* ===================================================================== */}
      {showCancelModal && selectedAppt && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget && !cancellingAppt) setShowCancelModal(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div
              className="modal-header"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  Cancel Appointment #{selectedAppt.appointment_id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: '#334155' }}>
                Are you sure you want to cancel the appointment for{' '}
                <strong>{selectedAppt.patient_name || selectedAppt.guest_name}</strong> with{' '}
                <strong>Dr. {selectedAppt.doctor_name}</strong> scheduled on{' '}
                <strong>{selectedAppt.appointment_date}</strong> at{' '}
                <strong>{String(selectedAppt.appointment_time).slice(0, 5)}</strong>?
              </p>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: '12px',
                  color: '#991b1b'
                }}
              >
                ℹ️ If this appointment has associated medical records or issued invoices, the system will safely mark its status as <strong>'Cancelled'</strong> to ensure financial and clinical audit integrity.
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={cancellingAppt}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmCancel}
                disabled={cancellingAppt}
                style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 600 }}
              >
                {cancellingAppt ? 'Processing...' : 'Yes, Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistAppointments;
