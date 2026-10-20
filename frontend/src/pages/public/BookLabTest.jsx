import React, { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';

const BookLabTest = () => {
  const [tests, setTests]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    test_id: '', guest_name: '', guest_phone: '', guest_email: '', notes: ''
  });

  useEffect(() => {
    API.get('/nurse/lab-tests')
      .then(r => setTests(r.data.data || []))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/nurse/lab-requests', { ...form, patient_id: null, priority: 'Normal' });
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
            <div className="voucher-row">
              <span className="voucher-label">Patient Name</span>
              <span className="voucher-val">{form.guest_name}</span>
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
                setForm({ test_id: '', guest_name: '', guest_phone: '', guest_email: '', notes: '' });
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
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="test-select">Select Diagnostic Panel / Test *</label>
              <select
                id="test-select"
                className="form-control"
                value={form.test_id}
                onChange={e => set('test_id', e.target.value)}
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
                    className="form-control with-icon"
                    placeholder="e.g. John Doe"
                    value={form.guest_name}
                    onChange={e => set('guest_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="patient-phone">Primary Contact Number *</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-left-icon" />
                  <input
                    id="patient-phone"
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
              <label className="form-label" htmlFor="patient-email">Email Address (For Secure Digital Report Delivery)</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-left-icon" />
                <input
                  id="patient-email"
                  className="form-control with-icon"
                  type="email"
                  placeholder="patient@example.com"
                  value={form.guest_email}
                  onChange={e => set('guest_email', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes-area">Special Instructions or Clinical History</label>
              <textarea
                id="notes-area"
                className="form-control"
                rows={2}
                placeholder="Fasting status, medications, or referring doctor details..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
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
