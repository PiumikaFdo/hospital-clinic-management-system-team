import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';

const BookAppointment = () => {
  const [step, setStep]               = useState(1);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors]         = useState([]);
  const [slots, setSlots]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  const [form, setForm] = useState({
    dept_id: '', doctor_id: '', appointment_date: '', appointment_time: '',
    guest_name: '', guest_phone: '', guest_email: '', reason: ''
  });

  useEffect(() => {
    API.get('/appointments/public/departments')
      .then(r => setDepartments(r.data.data || []))
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/appointments/public/book', form);
      setSuccess(true);
      toast.success('Clinical appointment reserved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

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
            <div className="voucher-row">
              <span className="voucher-label">Patient Name</span>
              <span className="voucher-val">{form.guest_name}</span>
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
                setForm({ dept_id:'', doctor_id:'', appointment_date:'', appointment_time:'', guest_name:'', guest_phone:'', guest_email:'', reason:'' });
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
          <form onSubmit={handleSubmit}>
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
                    className="form-control" 
                    value={form.dept_id} 
                    onChange={e => set('dept_id', e.target.value)} 
                    required
                  >
                    <option value="">-- Choose Specialization --</option>
                    {departments.map(d => (
                      <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                    ))}
                  </select>
                </div>

                {form.dept_id && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label" htmlFor="doctor-select">Consultant Doctor *</label>
                    <select 
                      id="doctor-select"
                      className="form-control" 
                      value={form.doctor_id} 
                      onChange={e => set('doctor_id', e.target.value)} 
                      required
                    >
                      <option value="">-- Choose Doctor --</option>
                      {doctors.map(d => (
                        <option key={d.staff_id} value={d.staff_id}>
                          Dr. {d.doctor_name} — {d.specialization} ({d.experience_years} yrs exp)
                        </option>
                      ))}
                    </select>
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
                    onClick={() => setStep(2)} 
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
                    className="form-control" 
                    min={minDate}
                    value={form.appointment_date} 
                    onChange={e => set('appointment_date', e.target.value)} 
                    required 
                  />
                </div>

                {form.appointment_date && (
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
                    onClick={() => setStep(3)} 
                    disabled={!form.appointment_time}
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
                        className="form-control with-icon" 
                        placeholder="e.g. John Doe"
                        value={form.guest_name} 
                        onChange={e => set('guest_name', e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="phone-input">Mobile Contact Number *</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-left-icon" />
                      <input 
                        id="phone-input"
                        className="form-control with-icon" 
                        placeholder="07X XXXXXXX"
                        value={form.guest_phone} 
                        onChange={e => set('guest_phone', e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-input">Email Address (Optional)</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-left-icon" />
                    <input 
                      id="email-input"
                      className="form-control with-icon" 
                      type="email" 
                      placeholder="patient@example.com"
                      value={form.guest_email} 
                      onChange={e => set('guest_email', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reason-input">Reason for Consultation / Symptoms *</label>
                  <textarea 
                    id="reason-input"
                    className="form-control" 
                    rows={3} 
                    placeholder="Briefly describe primary health concern or chronic symptoms..."
                    value={form.reason} 
                    onChange={e => set('reason', e.target.value)} 
                    required 
                  />
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
