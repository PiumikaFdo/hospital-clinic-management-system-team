import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Activity,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  Stethoscope,
  Pill,
  HeartPulse,
  Building2,
  ArrowRight,
  Shield,
  FileCheck2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_REDIRECTS = {
  admin:        '/admin/dashboard',
  doctor:       '/doctor/dashboard',
  pharmacist:   '/pharmacy/dashboard',
  receptionist: '/receptionist/dashboard',
  nurse:        '/nurse/dashboard',
  patient:      '/patient/dashboard',
};

const DEMO_ACCOUNTS = [
  { role: 'Admin',        email: 'admin@hospital.com',        password: 'password', icon: Shield,       color: 'blue' },
  { role: 'Doctor',       email: 'dr.silva@hospital.com',     password: 'password', icon: Stethoscope,  color: 'teal' },
  { role: 'Pharmacist',   email: 'pharmacist@hospital.com',   password: 'password', icon: Pill,         color: 'amber' },
  { role: 'Receptionist', email: 'receptionist@hospital.com', password: 'password', icon: Building2,    color: 'purple' },
  { role: 'Nurse',        email: 'nurse@hospital.com',        password: 'password', icon: HeartPulse,   color: 'red' },
  { role: 'Patient',      email: 'john@email.com',            password: 'password', icon: Users,        color: 'emerald' },
];

const LoginPage = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [selectedDemo, setSelectedDemo] = useState(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result?.success) {
      toast.success(`Access Granted. Welcome back!`);
      const targetPath = ROLE_REDIRECTS[result.role] || '/dashboard';
      setTimeout(() => navigate(targetPath), 400);
    } else {
      setError(result?.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleSelectDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setSelectedDemo(acc.role);
    setError('');
  };

  return (
    <div className="login-page">
      {/* LEFT PANEL - Clinical Identity */}
      <div className="login-left">
        <div className="login-left-glow" />
        <div className="login-left-pattern" />

        <div className="login-left-content">
          <Link to="/" className="login-brand-link">
            <div className="login-left-icon">
              <Activity size={32} strokeWidth={2.4} />
            </div>
            <div className="login-brand-titles">
              <h2>MediCare HMS</h2>
              <span>Enterprise Clinical Portal</span>
            </div>
          </Link>

          <p className="login-left-desc">
            Secure, audited healthcare information gateway. Access electronic health records,
            inpatient management, diagnostic reports, and medical staff workflows with precision.
          </p>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="feature-check-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="feature-text">
                <strong>Role-Based Access Control</strong>
                <span>Granular authorization for physicians, nurses, and administrative staff</span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="feature-check-icon">
                <FileCheck2 size={16} />
              </div>
              <div className="feature-text">
                <strong>HIPAA & Clinical Audit Compliance</strong>
                <span>Real-time transaction tracking and encrypted patient chart security</span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="feature-check-icon">
                <Activity size={16} />
              </div>
              <div className="feature-text">
                <strong>Direct OPD & Ward Synchronisation</strong>
                <span>Real-time records synchronization across clinical departments</span>
              </div>
            </div>
          </div>

          <div className="login-left-status">
            <span className="live-dot" />
            <span>Secure Enterprise Clinical Portal</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="login-right">
        <div className="login-form-container animate-slide-up">
          <div className="login-header">
            <div className="login-header-badge">Clinical Authentication</div>
            <h3>Sign in to Workspace</h3>
            <p className="subtitle">Enter your hospital credentials to access the system</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Hospital Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-left-icon" />
                <input
                  id="email-input"
                  className="form-control with-icon"
                  type="email"
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="password-input">Password</label>
                <span className="form-hint">Default: password or Admin@123</span>
              </div>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-left-icon" />
                <input
                  id="password-input"
                  className="form-control with-icon with-right-btn"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Sign In to System</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Accounts Selection */}
          <div className="demo-accounts-box">
            <div className="demo-accounts-header">
              <span>Quick Role Access</span>
            </div>

            <div className="demo-buttons-grid">
              {DEMO_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                const isSelected = selectedDemo === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className={`demo-role-btn ${isSelected ? 'active' : ''}`}
                  >
                    <div className={`demo-role-icon ${acc.color}`}>
                      <IconComponent size={14} />
                    </div>
                    <div className="demo-role-text">
                      <span className="demo-role-name">{acc.role}</span>
                      <span className="demo-role-email">{acc.email.split('@')[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="login-footer-links">
            <Link to="/" className="link-back-home">
              ← Return to Hospital Home
            </Link>
            <span className="divider-dot">•</span>
            <Link to="/book-appointment" className="link-book">
              Public Appointment Booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
