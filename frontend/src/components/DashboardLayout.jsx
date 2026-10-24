import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Calendar, AlertCircle, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DashboardLayout = ({ title, subtitle, children }) => {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState('checking'); // 'connected', 'error', 'checking'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    let isMounted = true;
    API.get('/health')
      .then(() => {
        if (isMounted) setApiStatus('connected');
      })
      .catch(() => {
        if (isMounted) setApiStatus('error');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await API.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordVisibility({ current: false, new: false, confirm: false });
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    setPasswordVisibility({ current: false, new: false, confirm: false });
    setShowPasswordModal(false);
  };

  const renderPasswordVisibilityButton = (field, label) => (
    <button
      type="button"
      className="input-eye-btn"
      onClick={() => setPasswordVisibility(v => ({ ...v, [field]: !v[field] }))}
      title={`${passwordVisibility[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      aria-label={`${passwordVisibility[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
    >
      {passwordVisibility[field] ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div className="dashboard-layout h-screen w-screen overflow-hidden flex bg-slate-50">
      <Sidebar />
      <div className="main-content flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-slate-50">
        <header className="topbar sticky top-0 z-50 shrink-0">
          <div className="topbar-left">
            <h1 className="topbar-title">{title}</h1>
            {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
          </div>

          <div className="topbar-right">
            {/* Server connection warning if offline */}
            {apiStatus === 'error' && (
              <div className="api-health-pill error" title="Cannot connect to hospital server">
                <AlertCircle size={13} className="api-icon" />
                <span>Connection Lost</span>
              </div>
            )}

            {/* Date display */}
            <div className="topbar-date">
              <Calendar size={14} />
              <span>{todayStr}</span>
            </div>

            {/* User chip */}
            {user && (
              <div className="topbar-user-pill">
                <Shield size={13} className="user-role-icon" />
                <span className="user-role-label">{user.role}</span>
              </div>
            )}
            {user && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowPasswordModal(true)}
              >
                <KeyRound size={14} />
                <span>Change Password</span>
              </button>
            )}
          </div>
        </header>

        <main className="page-content flex-1 p-6 md:p-8 animate-fade-in w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      {showPasswordModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closePasswordModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closePasswordModal}
                disabled={passwordSaving}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="input-with-icon">
                    <input
                      className="form-control with-right-btn"
                      type={passwordVisibility.current ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                      required
                    />
                    {renderPasswordVisibilityButton('current', 'Current password')}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-with-icon">
                    <input
                      className="form-control with-right-btn"
                      type={passwordVisibility.new ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                      required
                    />
                    {renderPasswordVisibilityButton('new', 'New password')}
                  </div>
                  <small>Use at least 8 characters.</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="input-with-icon">
                    <input
                      className="form-control with-right-btn"
                      type={passwordVisibility.confirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                      required
                    />
                    {renderPasswordVisibilityButton('confirm', 'Confirm password')}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closePasswordModal}
                    disabled={passwordSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
