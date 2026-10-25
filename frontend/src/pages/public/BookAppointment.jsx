import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import Navbar from '../../components/Navbar';
import {
  CalendarCheck,
  Stethoscope,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Calendar,
  ShieldCheck,
  Building2,
  Info,
  AlertCircle
} from 'lucide-react';

const BookAppointment = () => {
  const [step, setStep]                             = useState(1);
  const [departments, setDepartments]               = useState([]);
  const [doctors, setDoctors]                       = useState([]);
  const [slots, setSlots]                           = useState([]);
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [bookedPatientId, setBookedPatientId]       = useState(null);
  const [loading, setLoading]                       = useState(false);
  const [success, setSuccess]                       = useState(false);
  const [errors, setErrors]                         = useState({});
  const [touched, setTouched]                       = useState({});

  const [form, setForm] = useState({
    dept_id: '', doctor_id: '', appointment_date: '', appointment_time: '',
    guest_name: '', guest_phone: '', guest_email: '', reason: ''
  });

  const minDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    API.get('/appointments/public/departments')
      .then(r => setDepartments(r.data.data || []))
      .catch(() => {});

    API.get('/appointments/public/patients')
      .then(r => setRegisteredPatients(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.dept_id) {
      API.get(`/appointments/public/doctors?dept_id=${form.dept_id}`)
        .then(r => setDoctors(r.data.data || []))
        .catch(() => {});
      setForm(f => ({ ...f, doctor_id: '', appointment_date: '', appointment_time: '' }));
    }
  }, [form.dept_id]);

  useEffect(() => {
    if (form.doctor_id && form.appointment_date) {
      API.get(`/appointments/public/slots?doctor_id=${form.doctor_id}&date=${form.appointment_date}`)
        .then(r => setSlots(r.data.data || []))
        .catch(() => {});
      setForm(f => ({ ...f, appointment_time: '' }));
    }
  }, [form.doctor_id, form.appointment_date]);

  // Resolve if the entered details match an already-registered patient
  const resolvedPatient = useMemo(() => {
    const cleanName = String(form.guest_name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const cleanEmail = String(form.guest_email || '').trim().toLowerCase();
    const cleanPhone = String(form.guest_phone || '').replace(/[\s-]/g, '');

    if (cleanEmail) {
      const byEmail = registeredPatients.find(
        p => String(p.email || '').trim().toLowerCase() === cleanEmail
      );
      if (byEmail) return byEmail;
    }
    if (cleanPhone) {
      const byPhone = registeredPatients.find(
        p => String(p.phone || '').replace(/[\s-]/g, '') === cleanPhone
      );
      if (byPhone) return byPhone;
    }
    if (cleanName) {
      const byName = registeredPatients.find(
        p => String(p.full_name || '').trim().toLowerCase() === cleanName
      );
      if (byName) return byName;
    }
    return null;
  }, [form.guest_name, form.guest_email, form.guest_phone, registeredPatients]);

  const validateField = (name, value, currentForm = form) => {
    const val = String(value ?? '');
    switch (name) {
      case 'dept_id':
        if (!val) return 'Please select a clinical department.';
        return '';
      case 'doctor_id':
        if (!val) return 'Please select a consultant doctor.';
        return '';
      case 'appointment_date':
        if (!val) return 'Please select an appointment date.';
        if (val < minDate) return 'Appointment date cannot be in the past.';
        return '';
      case 'appointment_time':
        if (!val) return 'Please select an available consultation time slot.';
        return '';
      case 'guest_name': {
        const trimmed = val.trim().replace(/\s+/g, ' ');
        if (!trimmed) return 'Patient full name is required.';
        if (trimmed.length < 3) return 'Full name must be at least 3 characters.';
        if (trimmed.length > 100) return 'Full name cannot exceed 100 characters.';
        if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) {
          return 'Full name can only contain letters, spaces, and periods.';
        }

        // If the entered email or phone belongs to an existing patient_id, ensure the name matches that patient_id
        if (registeredPatients.length > 0) {
          const emailVal = String(currentForm.guest_email || '').trim().toLowerCase();
          const phoneVal = String(currentForm.guest_phone || '').replace(/[\s-]/g, '');

          const byEmail = emailVal
            ? registeredPatients.find(p => String(p.email || '').toLowerCase() === emailVal)
            : null;
          if (byEmail && byEmail.full_name.trim().toLowerCase() !== trimmed.toLowerCase()) {
            return `Name "${trimmed}" does not belong to Patient ID #${byEmail.patient_id} (Expected: "${byEmail.full_name}").`;
          }

          const byPhone = phoneVal
            ? registeredPatients.find(p => String(p.phone || '').replace(/[\s-]/g, '') === phoneVal)
            : null;
          if (byPhone && byPhone.full_name.trim().toLowerCase() !== trimmed.toLowerCase()) {
            return `Name "${trimmed}" does not belong to Patient ID #${byPhone.patient_id} (Expected: "${byPhone.full_name}").`;
          }
        }
        return '';
      }
      case 'guest_phone': {
        const cleaned = val.replace(/[\s-]/g, '');
        if (!cleaned) return 'Mobile contact number is required.';
        if (!/^(?:07\d{8}|\+947\d{8})$/.test(cleaned)) {
          return 'Enter a valid 10-digit mobile number (e.g. 077 1234567).';
        }
        return '';
      }
      case 'guest_email': {
        const trimmed = val.trim();
        if (!trimmed) return '';
        if (trimmed.length > 100) return 'Email address cannot exceed 100 characters.';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
          return 'Please enter a valid email address (e.g. patient@example.com).';
        }
        if (registeredPatients.length > 0) {
          const nameVal = String(currentForm.guest_name || '').trim().replace(/\s+/g, ' ').toLowerCase();
          const byEmail = registeredPatients.find(
            p => String(p.email || '').toLowerCase() === trimmed.toLowerCase()
          );
          if (byEmail && nameVal && byEmail.full_name.trim().toLowerCase() !== nameVal) {
            return `This email belongs to Patient ID #${byEmail.patient_id} ("${byEmail.full_name}").`;
          }
        }
        return '';
      }
      case 'reason': {
        const trimmed = val.trim();
        if (!trimmed) return 'Reason for consultation / symptoms is required.';
        if (trimmed.length < 5) return 'Please briefly describe the symptoms (at least 5 characters).';
        if (trimmed.length > 500) return 'Description cannot exceed 500 characters.';
        return '';
      }
      default:
        return '';
    }
  };

  const set = (k, v) => {
    const nextForm = { ...form, [k]: v };
    setForm(nextForm);

    const updatedErrors = { ...errors };
    if (touched[k] || errors[k]) {
      updatedErrors[k] = validateField(k, v, nextForm);
    }
    if ((k === 'guest_email' || k === 'guest_phone') && (touched.guest_name || errors.guest_name)) {
      updatedErrors.guest_name = validateField('guest_name', nextForm.guest_name, nextForm);
    }
    if (k === 'guest_name' && (touched.guest_email || errors.guest_email)) {
      updatedErrors.guest_email = validateField('guest_email', nextForm.guest_email, nextForm);
    }
    setErrors(updatedErrors);
  };

  const handleBlur = (k) => {
    setTouched(prev => ({ ...prev, [k]: true }));
    setErrors(prev => {
      const next = { ...prev, [k]: validateField(k, form[k], form) };
      if ((k === 'guest_email' || k === 'guest_phone') && form.guest_name) {
        next.guest_name = validateField('guest_name', form.guest_name, form);
      }
      return next;
    });
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^\d\s+-]/g, '');
    set('guest_phone', sanitized);
  };

  const handleNextStep1 = () => {
    const deptErr = validateField('dept_id', form.dept_id);
    const docErr = validateField('doctor_id', form.doctor_id);
    if (deptErr || docErr) {
      setErrors(prev => ({ ...prev, dept_id: deptErr, doctor_id: docErr }));
      setTouched(prev => ({ ...prev, dept_id: true, doctor_id: true }));
      toast.error(deptErr || docErr);
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    const dateErr = validateField('appointment_date', form.appointment_date);
    const timeErr = validateField('appointment_time', form.appointment_time);
    if (dateErr || timeErr) {
      setErrors(prev => ({ ...prev, appointment_date: dateErr, appointment_time: timeErr }));
      setTouched(prev => ({ ...prev, appointment_date: true, appointment_time: true }));
      toast.error(dateErr || timeErr);
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldsToValidate = [
      'dept_id', 'doctor_id', 'appointment_date', 'appointment_time',
      'guest_name', 'guest_phone', 'guest_email', 'reason'
    ];
    const newErrors = {};
    const newTouched = {};
    fieldsToValidate.forEach(field => {
      newTouched[field] = true;
      const errMsg = validateField(field, form[field], form);
      if (errMsg) newErrors[field] = errMsg;
    });

    setTouched(prev => ({ ...prev, ...newTouched }));
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError || 'Please fix the highlighted errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const cleanName = form.guest_name.trim().replace(/\s+/g, ' ');
      const payload = {
        ...form,
        patient_id: resolvedPatient?.patient_id || null,
        guest_name: resolvedPatient?.full_name || cleanName,
        guest_phone: form.guest_phone.replace(/[\s-]/g, ''),
        guest_email: form.guest_email.trim() || null,
        reason: form.reason.trim()
      };
      const res = await API.post('/appointments/public/book', payload);
      setBookedPatientId(res.data?.patient_id || resolvedPatient?.patient_id || null);
      // Refresh registered patients list in case a new guest patient was registered
      API.get('/appointments/public/patients')
        .then(r => setRegisteredPatients(r.data.data || []))
        .catch(() => {});
      setSuccess(true);
      toast.success('Clinical appointment reserved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const selectedDoc = doctors.find(d => String(d.staff_id) === String(form.doctor_id));
    return (
      <div className="book-page">
        <Navbar />
        <div className="book-container animate-slide-up confirmation-container">
          <div className="confirmation-header">
            <div className="confirmation-icon-box">
              <CheckCircle2 size={48} className="text-emerald" />
            </div>
            <h2>Appointment Confirmed</h2>
            <p>Your clinical consultation has been booked and registered in our central system.</p>
          </div>

          <div className="confirmation-voucher">
            {bookedPatientId && (
              <div className="voucher-row">
                <span className="voucher-label">Patient ID</span>
                <span className="voucher-val highlight">#{bookedPatientId}</span>
              </div>
            )}
            <div className="voucher-row">
              <span className="voucher-label">Patient Name</span>
              <span className="voucher-val">{resolvedPatient?.full_name || form.guest_name.trim()}</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Consultant</span>
              <span className="voucher-val">Dr. {selectedDoc?.doctor_name || 'Medical Specialist'}</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Specialization</span>
              <span className="voucher-val">{selectedDoc?.specialization || 'Clinical Department'}</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Date & Time</span>
              <span className="voucher-val highlight">{form.appointment_date} at {form.appointment_time?.slice(0, 5)}</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Contact</span>
              <span className="voucher-val">{form.guest_phone}</span>
            </div>
          </div>

          <div className="confirmation-actions">
            <button
              onClick={() => {
                setSuccess(false);
                setStep(1);
                setErrors({});
                setTouched({});
                setBookedPatientId(null);
                setForm({
                  dept_id: '',
                  doctor_id: '',
                  appointment_date: '',
                  appointment_time: '',
                  guest_name: '',
                  guest_phone: '',
                  guest_email: '',
                  reason: ''
                });
              }}
              className="btn btn-outline"
            >
              Book Another Session
            </button>
            <Link to="/" className="btn btn-primary">
              Return to Hospital Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="book-page">
      <Navbar />
      <div className="book-container animate-slide-up">
        <div className="book-header">
          <div className="book-header-badge">
            <CalendarCheck size={14} />
            <span>Consultant Out-Patient Booking</span>
          </div>
          <h2>Schedule Doctor Consultation</h2>
          <p>Instant booking without portal registration. Select department and confirmed slots.</p>

          {/* Stepper */}
          <div className="stepper-bar">
            {[
              { num: 1, label: 'Department & Doctor' },
              { num: 2, label: 'Date & Time' },
              { num: 3, label: 'Patient Information' },
            ].map((s) => (
              <div 
                key={s.num} 
                className={`stepper-item ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}
              >
                <div className="stepper-circle">{s.num}</div>
                <span className="stepper-title">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="book-body">
          <form onSubmit={handleSubmit} noValidate>
            {/* STEP 1: Department & Doctor */}
            {step === 1 && (
              <div className="animate-slide-up step-content">
                <div className="step-heading">
                  <Building2 size={20} className="step-icon text-primary" />
                  <div>
                    <h3>Select Specialty & Physician</h3>
                    <p>Choose the clinical department and verified medical consultant.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dept-select">Clinical Department *</label>
                  <select 
                    id="dept-select"
                    className={`form-control ${errors.dept_id ? 'input-error' : ''}`}
                    value={form.dept_id} 
                    onChange={e => set('dept_id', e.target.value)} 
                    onBlur={() => handleBlur('dept_id')}
                    required
                  >
                    <option value="">-- Choose Specialization --</option>
                    {departments.map(d => (
                      <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                    ))}
                  </select>
                  {errors.dept_id && (
                    <div className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>{errors.dept_id}</span>
                    </div>
                  )}
                </div>

                {form.dept_id && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label" htmlFor="doctor-select">Consultant Doctor *</label>
                    <select 
                      id="doctor-select"
                      className={`form-control ${errors.doctor_id ? 'input-error' : ''}`}
                      value={form.doctor_id} 
                      onChange={e => set('doctor_id', e.target.value)} 
                      onBlur={() => handleBlur('doctor_id')}
                      required
                    >
                      <option value="">-- Choose Doctor --</option>
                      {doctors.map(d => (
                        <option key={d.staff_id} value={d.staff_id}>
                          Dr. {d.doctor_name} — {d.specialization} ({d.experience_years} yrs exp)
                        </option>
                      ))}
                    </select>
                    {errors.doctor_id && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} />
                        <span>{errors.doctor_id}</span>
                      </div>
                    )}
                    {doctors.length === 0 && (
                      <div className="alert-mini">
                        <Info size={14} />
                        <span>No doctors currently listed for this department.</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="step-buttons end">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleNextStep1} 
                    disabled={!form.doctor_id}
                  >
                    <span>Proceed to Slot Selection</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Date & Slot */}
            {step === 2 && (
              <div className="animate-slide-up step-content">
                <div className="step-heading">
                  <Clock size={20} className="step-icon text-primary" />
                  <div>
                    <h3>Select Date & Consultation Time</h3>
                    <p>Slots are updated in real-time according to doctor roster.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="appt-date">Appointment Date *</label>
                  <input 
                    id="appt-date"
                    type="date" 
                    className={`form-control ${errors.appointment_date ? 'input-error' : ''}`}
                    min={minDate}
                    value={form.appointment_date} 
                    onChange={e => set('appointment_date', e.target.value)} 
                    onBlur={() => handleBlur('appointment_date')}
                    required 
                  />
                  {errors.appointment_date && (
                    <div className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>{errors.appointment_date}</span>
                    </div>
                  )}
                </div>

                {form.appointment_date && !errors.appointment_date && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label">Available Consultation Slots *</label>
                    {slots.length === 0 ? (
                      <div className="alert-mini warning">
                        <Info size={14} />
                        <span>No consultation slots available on this date. Please select an alternate date.</span>
                      </div>
                    ) : (
                      <div className="slot-grid">
                        {slots.map(s => (
                          <button 
                            key={s.time} 
                            type="button"
                            className={`slot-btn ${form.appointment_time === s.time ? 'selected' : ''}`}
                            disabled={!s.available}
                            onClick={() => set('appointment_time', s.time)}
                          >
                            <Clock size={12} className="slot-icon" />
                            <span>{s.time.slice(0, 5)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.appointment_time && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} />
                        <span>{errors.appointment_time}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="step-buttons between">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleNextStep2} 
                    disabled={!form.appointment_time || !!errors.appointment_date}
                  >
                    <span>Continue to Patient Details</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Patient Information */}
            {step === 3 && (
              <div className="animate-slide-up step-content">
                <div className="step-heading">
                  <User size={20} className="step-icon text-primary" />
                  <div>
                    <h3>Patient Demographics & Symptoms</h3>
                    <p>Enter contact information for SMS reminder and check-in desk.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="name-input">Patient Full Name *</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-left-icon" />
                      <input 
                        id="name-input"
                        className={`form-control with-icon ${errors.guest_name ? 'input-error' : ''}`}
                        placeholder="e.g. John Doe"
                        maxLength={100}
                        value={form.guest_name} 
                        onChange={e => set('guest_name', e.target.value)} 
                        onBlur={() => handleBlur('guest_name')}
                        required 
                      />
                    </div>
                    {errors.guest_name && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} />
                        <span>{errors.guest_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="phone-input">Mobile Contact Number *</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-left-icon" />
                      <input 
                        id="phone-input"
                        type="tel"
                        className={`form-control with-icon ${errors.guest_phone ? 'input-error' : ''}`}
                        placeholder="07X XXXXXXX"
                        maxLength={15}
                        value={form.guest_phone} 
                        onChange={handlePhoneChange} 
                        onBlur={() => handleBlur('guest_phone')}
                        required 
                      />
                    </div>
                    {errors.guest_phone && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} />
                        <span>{errors.guest_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-input">Email Address (Optional)</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-left-icon" />
                    <input 
                      id="email-input"
                      className={`form-control with-icon ${errors.guest_email ? 'input-error' : ''}`}
                      type="email" 
                      placeholder="patient@example.com"
                      maxLength={100}
                      value={form.guest_email} 
                      onChange={e => set('guest_email', e.target.value)} 
                      onBlur={() => handleBlur('guest_email')}
                    />
                  </div>
                  {errors.guest_email && (
                    <div className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>{errors.guest_email}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="reason-input" style={{ marginBottom: 0 }}>Reason for Consultation / Symptoms *</label>
                    <span className="form-hint">{form.reason.trim().length}/500</span>
                  </div>
                  <textarea 
                    id="reason-input"
                    className={`form-control ${errors.reason ? 'input-error' : ''}`}
                    rows={3} 
                    maxLength={500}
                    placeholder="Briefly describe primary health concern or chronic symptoms..."
                    value={form.reason} 
                    onChange={e => set('reason', e.target.value)} 
                    onBlur={() => handleBlur('reason')}
                    required 
                  />
                  {errors.reason && (
                    <div className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>{errors.reason}</span>
                    </div>
                  )}
                </div>

                {/* Summary Card */}
                <div className="booking-summary-card">
                  <div className="summary-card-header">
                    <ShieldCheck size={16} className="text-primary" />
                    <h4>Consultation Summary</h4>
                  </div>
                  <div className="summary-grid">
                    <div>
                      <span className="summary-label">Date & Time</span>
                      <strong className="summary-val">{form.appointment_date} at {form.appointment_time?.slice(0, 5)}</strong>
                    </div>
                    <div>
                      <span className="summary-label">Doctor</span>
                      <strong className="summary-val">Dr. {doctors.find(d => String(d.staff_id) === String(form.doctor_id))?.doctor_name}</strong>
                    </div>
                  </div>
                </div>

                <div className="step-buttons between">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        <span>Registering Appointment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirm & Complete Booking</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
