import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import Navbar from '../../components/Navbar';
import {
  FlaskConical,
  Clock,
  CreditCard,
  CheckCircle2,
  User,
  Phone,
  Mail,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

const BookLabTest = () => {
  const [tests, setTests]                           = useState([]);
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [bookedPatientId, setBookedPatientId]       = useState(null);
  const [loading, setLoading]                       = useState(false);
  const [success, setSuccess]                       = useState(false);
  const [errors, setErrors]                         = useState({});
  const [touched, setTouched]                       = useState({});

  const [form, setForm] = useState({
    test_id: '', guest_name: '', guest_phone: '', guest_email: '', notes: ''
  });

  useEffect(() => {
    API.get('/nurse/lab-tests')
      .then(r => setTests(r.data.data || []))
      .catch(() => {});

    API.get('/appointments/public/patients')
      .then(r => setRegisteredPatients(r.data.data || []))
      .catch(() => {});
  }, []);

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
      case 'test_id':
        if (!val) return 'Please select a diagnostic laboratory test.';
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
        if (!cleaned) return 'Primary contact number is required.';
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
      case 'notes': {
        const trimmed = val.trim();
        if (!trimmed) return '';
        if (trimmed.length < 3) return 'Special instructions must be at least 3 characters if provided.';
        if (trimmed.length > 500) return 'Special instructions cannot exceed 500 characters.';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldsToValidate = ['test_id', 'guest_name', 'guest_phone', 'guest_email', 'notes'];
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
        notes: form.notes.trim() || null,
        priority: 'Normal'
      };
      const res = await API.post('/nurse/lab-requests', payload);
      setBookedPatientId(res.data?.patient_id || resolvedPatient?.patient_id || null);
      // Refresh registered patients list in case a new guest patient was registered
      API.get('/appointments/public/patients')
        .then(r => setRegisteredPatients(r.data.data || []))
        .catch(() => {});
      setSuccess(true);
      toast.success('Diagnostic request logged! Our laboratory desk will contact you.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lab test order failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTest = tests.find(t => String(t.test_id) === String(form.test_id));
  const categories = [...new Set(tests.map(t => t.category))];

  if (success) {
    return (
      <div className="book-page">
        <Navbar />
        <div className="book-container animate-slide-up confirmation-container">
          <div className="confirmation-header">
            <div className="confirmation-icon-box">
              <FlaskConical size={48} className="text-primary" />
            </div>
            <h2>Lab Diagnostic Order Received</h2>
            <p>Your sample collection or lab visit request has been queued with our pathology desk.</p>
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
              <span className="voucher-label">Selected Test</span>
              <span className="voucher-val">{selectedTest?.test_name || 'Diagnostic Panel'}</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Estimated Turnaround</span>
              <span className="voucher-val highlight">{selectedTest?.turnaround_hours || 24} Hours</span>
            </div>
            <div className="voucher-row">
              <span className="voucher-label">Contact Phone</span>
              <span className="voucher-val">{form.guest_phone}</span>
            </div>
          </div>

          <div className="confirmation-actions">
            <button
              onClick={() => {
                setSuccess(false);
                setErrors({});
                setTouched({});
                setBookedPatientId(null);
                setForm({
                  test_id: '',
                  guest_name: '',
                  guest_phone: '',
                  guest_email: '',
                  notes: ''
                });
              }}
              className="btn btn-outline"
            >
              Order Another Test
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
            <FlaskConical size={14} />
            <span>Pathology & Diagnostic Laboratory</span>
          </div>
          <h2>Diagnostic Lab Test Requisition</h2>
          <p>Certified clinical pathology tests with expedited digital report delivery.</p>
        </div>

        <div className="book-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="test-select">Select Diagnostic Panel / Test *</label>
              <select
                id="test-select"
                className={`form-control ${errors.test_id ? 'input-error' : ''}`}
                value={form.test_id}
                onChange={e => set('test_id', e.target.value)}
                onBlur={() => handleBlur('test_id')}
                required
              >
                <option value="">-- Choose Laboratory Test --</option>
                {categories.map(cat => (
                  <optgroup key={cat} label={`Division: ${cat}`}>
                    {tests.filter(t => t.category === cat).map(t => (
                      <option key={t.test_id} value={t.test_id}>
                        {t.test_name} — Rs. {Number(t.price).toLocaleString()} ({t.turnaround_hours}h TAT)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.test_id && (
                <div className="field-error-msg">
                  <AlertCircle size={13} />
                  <span>{errors.test_id}</span>
                </div>
              )}
            </div>

            {selectedTest && (
              <div className="lab-test-detail-card animate-fade-in">
                <div className="detail-card-header">
                  <Activity size={16} className="text-teal" />
                  <h4>{selectedTest.test_name} — Specifications</h4>
                </div>
                <p className="detail-desc">{selectedTest.description}</p>
                <div className="detail-meta-grid">
                  <div className="meta-item">
                    <CreditCard size={14} className="meta-icon" />
                    <span>Price: <strong>Rs. {Number(selectedTest.price).toLocaleString()}</strong></span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} className="meta-icon" />
                    <span>Turnaround: <strong>{selectedTest.turnaround_hours} hrs</strong></span>
                  </div>
                  <div className="meta-item">
                    <ShieldCheck size={14} className="meta-icon" />
                    <span>Reference: <strong>{selectedTest.normal_range || 'Standard'}</strong></span>
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-name">Patient Full Name *</label>
                <div className="input-with-icon">
                  <User size={16} className="input-left-icon" />
                  <input
                    id="patient-name"
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
                <label className="form-label" htmlFor="patient-phone">Primary Contact Number *</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-left-icon" />
                  <input
                    id="patient-phone"
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
              <label className="form-label" htmlFor="patient-email">Email Address (For Secure Digital Report Delivery)</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-left-icon" />
                <input
                  id="patient-email"
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
                <label className="form-label" htmlFor="notes-area" style={{ marginBottom: 0 }}>Special Instructions or Clinical History</label>
                <span className="form-hint">{form.notes.trim().length}/500</span>
              </div>
              <textarea
                id="notes-area"
                className={`form-control ${errors.notes ? 'input-error' : ''}`}
                rows={2}
                maxLength={500}
                placeholder="Fasting status, medications, or referring doctor details..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                onBlur={() => handleBlur('notes')}
              />
              {errors.notes && (
                <div className="field-error-msg">
                  <AlertCircle size={13} />
                  <span>{errors.notes}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: 12 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Submitting Requisition...</span>
                </>
              ) : (
                <>
                  <FlaskConical size={16} />
                  <span>Confirm Laboratory Requisition</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookLabTest;
