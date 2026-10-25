import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  FileWarning,
  CreditCard,
  Building2,
  UserPlus,
  Receipt,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Bed,
  ShieldCheck,
  Stethoscope,
  DollarSign
} from 'lucide-react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import DoctorAdmissionOrderAlert from '../../components/DoctorAdmissionOrderAlert';

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await API.get('/receptionist/dashboard');
      setData(res.data?.data || {});
    } catch (err) {
      console.error('Error loading receptionist dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const totalBeds = data.total_beds || 0;
  const availableBeds = data.available_beds || 0;
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <DashboardLayout
      title="Front Desk & Reception Station"
      subtitle="Central command for patient check-in, doctor appointments, cashier desk, and ward admissions"
    >
      {/* Doctor Admission Order Floating Alert */}
      <DoctorAdmissionOrderAlert />
      {loading ? (
        <div className="loading-page">
          <span className="spinner-large" />
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* 1. FRONT DESK SHIFT & WELCOME BANNER                              */}
          {/* ================================================================= */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              padding: '18px 24px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(126, 34, 206, 0.25)'
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    Receptionist Counter Desk
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#dcfce7',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                    Live Active Shift
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Today is <strong>{todayDateStr}</strong> · Outpatient clinic services & admissions running normally
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchDashboardData}
                disabled={refreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '8px'
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                {refreshing ? 'Updating...' : 'Sync Station'}
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. QUICK WORKFLOW SHORTCUT ACTION CARDS                           */}
          {/* ================================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px',
              marginBottom: '22px'
            }}
          >
            <div
              className="card"
              onClick={() => navigate('/receptionist/patients')}
              style={{
                padding: '16px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#ffffff'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#93c5fd';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <UserPlus size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Patient Intake
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Register walk-in & view directory
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/receptionist/appointments')}
              style={{
                padding: '16px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#ffffff'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#d8b4fe';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#f3e8ff',
                  color: '#7e22ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <CalendarDays size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Appointments Desk
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Doctor schedules & 30m slots
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/receptionist/billing')}
              style={{
                padding: '16px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#ffffff'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#fde68a';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Receipt size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Billing & Invoices
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Generate bills & collect payments
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/receptionist/admissions')}
              style={{
                padding: '16px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#ffffff'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#a7f3d0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Ward Admissions
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Bed matrix & clinical orders
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8' }} />
            </div>
          </div>

          {/* ================================================================= */}
          {/* 3. EXECUTIVE KPI METRICS ROW                                      */}
          {/* ================================================================= */}
          <div
            className="stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Today's Registrations
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {data.today_registrations ?? 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px', fontWeight: 500 }}>
                    New patient files created
                  </div>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}
                >
                  <UserPlus size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Doctor Appointments
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {data.today_appointments ?? 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '4px', fontWeight: 500 }}>
                    {data.today_confirmed_appointments ?? 0} Confirmed visits today
                  </div>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#faf5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7e22ce'
                  }}
                >
                  <Calendar size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Pending Invoices
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: Number(data.pending_bills) > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
                    {data.pending_bills ?? 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
                    Unsettled cashier balances
                  </div>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706'
                  }}
                >
                  <FileWarning size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Payments Processed
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                    Rs. {Number(data.today_total_payments || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
                    Today's counter collections
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
                  <CreditCard size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Inpatient Bed Census
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {data.active_admissions ?? 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                    {availableBeds} beds available ({occupancyRate}% full)
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
                  <Bed size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. MAIN OPERATIONAL DESK GRIDS                                   */}
          {/* ================================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}
          >
            {/* COLUMN 1: RECENT PATIENT REGISTRATIONS */}
            <div className="card" style={{ borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: '#2563eb' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Recent Patient Intake Queue
                  </h3>
                </div>
                <Link
                  to="/receptionist/patients"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Directory →
                </Link>
              </div>

              <div className="card-body" style={{ padding: '14px 20px', flex: 1 }}>
                {(data.recent_patients || []).map((p, idx) => (
                  <div
                    key={p.patient_id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx < (data.recent_patients || []).length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b' }}>
                          {p.first_name} {p.last_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                          <span style={{ fontWeight: 600 }}>{p.patient_code}</span> · {p.phone || 'No phone'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="badge badge-danger"
                        style={{ fontSize: '10.5px', padding: '2px 6px', fontWeight: 700 }}
                      >
                        {p.blood_group || 'O+'}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/receptionist/appointments?patient_id=${p.patient_id}`)}
                        className="btn btn-outline"
                        style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
                        title="Book consultation"
                      >
                        + Book
                      </button>
                    </div>
                  </div>
                ))}

                {!(data.recent_patients || []).length && (
                  <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                    <h4 style={{ margin: 0, color: '#475569', fontSize: '14px' }}>No Registrations Today</h4>
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                      Walk-in patients will populate here upon registration.
                    </p>
                    <Link to="/receptionist/patients" className="btn btn-primary btn-sm">
                      + Register Patient
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: TODAY'S CONSULTATION SCHEDULE */}
            <div className="card" style={{ borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={18} style={{ color: '#7e22ce' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Today's Doctor Visits ({data.today_appointments ?? 0})
                  </h3>
                </div>
                <Link
                  to="/receptionist/appointments"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Schedule Desk →
                </Link>
              </div>

              <div className="card-body" style={{ padding: '14px 20px', flex: 1 }}>
                {(data.today_appointments_list || []).map((a, idx) => (
                  <div
                    key={a.appointment_id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx < (data.today_appointments_list || []).length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          background: '#faf5ff',
                          color: '#7e22ce',
                          fontWeight: 700,
                          fontSize: '11px',
                          textAlign: 'center',
                          border: '1px solid #f3e8ff'
                        }}
                      >
                        <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        {String(a.appointment_time || '').slice(0, 5)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          {a.patient_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          Dr. {a.doctor_name} · <span style={{ color: '#2563eb' }}>{a.specialization}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className={`badge ${
                          a.status === 'Confirmed'
                            ? 'badge-success'
                            : a.status === 'Completed'
                            ? 'badge-primary'
                            : 'badge-gray'
                        }`}
                        style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      >
                        {a.status}
                      </span>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                        {a.appointment_type || 'Walk-in'}
                      </div>
                    </div>
                  </div>
                ))}

                {!(data.today_appointments_list || []).length && (
                  <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Calendar size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                    <h4 style={{ margin: 0, color: '#475569', fontSize: '14px' }}>No Consultations Today</h4>
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                      Doctors have no active outpatient bookings for today.
                    </p>
                    <Link to="/receptionist/appointments" className="btn btn-primary btn-sm">
                      + Book Consultation
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: PENDING INVOICE BALANCES */}
            <div className="card" style={{ borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={18} style={{ color: '#d97706' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Pending Invoice Balances
                  </h3>
                </div>
                <Link
                  to="/receptionist/billing"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Cashier Desk →
                </Link>
              </div>

              <div className="card-body" style={{ padding: '14px 20px', flex: 1 }}>
                {(data.pending_bills_list || []).map((b, idx) => (
                  <div
                    key={b.bill_id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx < (data.pending_bills_list || []).length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b' }}>
                        {b.patient_name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                        Invoice {b.bill_id} · {new Date(b.bill_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '13.5px' }}>
                        Rs. {Number(b.balance_amount).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/receptionist/billing?bill_id=${b.bill_id}&patient_id=${b.patient_id}`)}
                        className="btn btn-outline"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          marginTop: '4px',
                          color: '#d97706',
                          borderColor: '#fde68a'
                        }}
                      >
                        Collect →
                      </button>
                    </div>
                  </div>
                ))}

                {!(data.pending_bills_list || []).length && (
                  <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: '#16a34a' }} />
                    <h4 style={{ margin: 0, color: '#166534', fontSize: '14px' }}>All Invoices Settled</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                      There are zero outstanding patient invoice balances.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 5. LIVE HOSPITAL INPATIENT & WARD OCCUPANCY BAR                   */}
          {/* ================================================================= */}
          <div
            className="card"
            style={{
              padding: '18px 22px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={18} style={{ color: '#0284c7' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Live Inpatient Census & Ward Bed Capacity
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                <strong>{occupiedBeds}</strong> of <strong>{totalBeds}</strong> beds occupied ({availableBeds} beds available)
              </div>
            </div>

            {/* Occupancy Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  width: `${Math.min(100, occupancyRate)}%`,
                  height: '100%',
                  background: occupancyRate > 85 ? '#ef4444' : occupancyRate > 65 ? '#f59e0b' : '#10b981',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>Occupancy Rate: <strong style={{ color: '#0f172a' }}>{occupancyRate}%</strong></span>
              <Link to="/receptionist/admissions" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                Open Admissions Bed Matrix →
              </Link>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistDashboard;
