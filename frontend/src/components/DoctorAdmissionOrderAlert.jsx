import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  AlertTriangle,
  X,
  ChevronRight,
  User,
  Stethoscope,
  Clock,
  Bell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import API from '../api/axios';

/**
 * DoctorAdmissionOrderAlert
 * Polls every 30 seconds for doctor-placed admission orders
 * that haven't been actioned (no active admission for that patient).
 * Shows a beautiful floating popup to the receptionist.
 */
const DoctorAdmissionOrderAlert = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const prevCountRef = useRef(0);

  const fetchPendingOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/receptionist/pending-admission-orders');
      const newOrders = res.data?.data || [];

      if (newOrders.length > prevCountRef.current) {
        setDismissed(false);
        setVisible(true);
        setExpanded(true);
        setAnimateIn(false);
        setTimeout(() => setAnimateIn(true), 50);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch (_) {}
      } else if (newOrders.length > 0 && !dismissed) {
        setVisible(true);
        setTimeout(() => setAnimateIn(true), 50);
      }

      prevCountRef.current = newOrders.length;
      setOrders(newOrders);
      setSelectedOrderIndex((i) => Math.min(i, Math.max(0, newOrders.length - 1)));
    } catch (err) {
      console.warn('Pending admission orders fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [dismissed]);

  useEffect(() => {
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingOrders]);

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      setDismissed(true);
    }, 300);
  };

  const handleAdmitNow = (order) => {
    navigate(`/receptionist/admissions?patient_id=${order.patient_id}`);
    handleDismiss();
  };

  const parsePriority = (reason) => {
    const match = reason?.match(/\[ADMISSION ORDER\s*-\s*([^\]]+)\]/i);
    return match ? match[1].trim().toUpperCase() : 'ROUTINE';
  };

  const parseIndication = (reason) => {
    const match = reason?.match(/Indication:\s*([^|]+)/i);
    return match ? match[1].trim() : reason || 'Doctor-ordered admission';
  };

  const parseWardCategory = (reason) => {
    const match = reason?.match(/Ward Category:\s*([^|]+)/i);
    return match ? match[1].trim() : 'General';
  };

  const priorityConfig = {
    EMERGENCY: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: '🚨 EMERGENCY', pulse: true },
    URGENT:    { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: '⚡ URGENT',    pulse: false },
    ROUTINE:   { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', label: '📋 ROUTINE',   pulse: false },
  };

  if (!visible || orders.length === 0) return null;

  const currentOrder = orders[selectedOrderIndex] || orders[0];
  const priority = parsePriority(currentOrder?.reason);
  const cfg = priorityConfig[priority] || priorityConfig.ROUTINE;
  const indication = parseIndication(currentOrder?.reason);
  const wardCategory = parseWardCategory(currentOrder?.reason);
  const isEmergency = priority === 'EMERGENCY';

  return (
    <>
      {isEmergency && expanded && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(220,38,38,0.05)',
            zIndex: 9998, pointerEvents: 'none',
          }}
        />
      )}

      <div
        id="doctor-admission-order-alert"
        style={{
          position: 'fixed',
          bottom: 24, right: 24,
          zIndex: 9999,
          width: expanded ? 400 : 280,
          maxWidth: 'calc(100vw - 48px)',
          borderRadius: 16,
          boxShadow: isEmergency
            ? `0 0 0 3px ${cfg.border}, 0 20px 60px rgba(220,38,38,0.25), 0 8px 24px rgba(0,0,0,0.12)`
            : `0 20px 60px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)`,
          border: `1.5px solid ${cfg.border}`,
          background: '#ffffff',
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.94)',
          opacity: animateIn ? 1 : 0,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Priority accent bar */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${cfg.color}, ${cfg.border})`,
          animation: cfg.pulse ? 'alertPulseBar 1.2s ease-in-out infinite alternate' : 'none',
        }} />

        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: cfg.bg,
            borderBottom: expanded ? `1px solid ${cfg.border}` : 'none',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded((p) => !p)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: cfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
              animation: isEmergency ? 'alertBellShake 0.7s ease-in-out infinite' : 'none',
              boxShadow: `0 0 0 4px ${cfg.border}`,
            }}>
              {isEmergency ? <AlertTriangle size={17} /> : <Bell size={17} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color, lineHeight: 1.3 }}>
                {isEmergency ? '🚨 Emergency Admission' : '🔔 Doctor Admission Order'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 1 }}>
                {orders.length} order{orders.length !== 1 ? 's' : ''} awaiting bed allocation
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {expanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronUp size={14} color="#94a3b8" />}
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                borderRadius: '50%', padding: 5,
                display: 'flex', alignItems: 'center', color: '#94a3b8',
                marginLeft: 2,
              }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div style={{ padding: '14px 16px' }}>

            {/* Priority + Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                letterSpacing: '0.04em',
              }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {currentOrder?.appointment_date
                  ? new Date(currentOrder.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Today'}
              </span>
            </div>

            {/* Patient + Doctor card */}
            <div style={{
              background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
              marginBottom: 10, border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <User size={13} color="#64748b" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  {currentOrder?.patient_name}
                </span>
                <span style={{
                  fontSize: 10, color: '#7c3aed', background: '#f5f3ff',
                  padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                }}>
                  {currentOrder?.patient_code}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Stethoscope size={12} color="#64748b" />
                <span style={{ fontSize: 12, color: '#475569' }}>
                  Dr. {currentOrder?.doctor_name}
                  {currentOrder?.specialization && (
                    <span style={{ color: '#94a3b8' }}> · {currentOrder.specialization}</span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <BedDouble size={13} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
                    {wardCategory} Ward
                  </span>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.45 }}>
                    {indication.length > 72 ? indication.substring(0, 72) + '…' : indication}
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-order tabs */}
            {orders.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                {orders.map((o, idx) => {
                  const p = parsePriority(o.reason);
                  const c = priorityConfig[p] || priorityConfig.ROUTINE;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedOrderIndex(idx)}
                      title={o.patient_name}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: `2px solid ${idx === selectedOrderIndex ? c.color : '#e2e8f0'}`,
                        background: idx === selectedOrderIndex ? c.color : '#ffffff',
                        color: idx === selectedOrderIndex ? '#fff' : '#64748b',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 3 }}>
                  {selectedOrderIndex + 1} / {orders.length}
                </span>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="btn-admit-patient-now"
                onClick={() => handleAdmitNow(currentOrder)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 14px', borderRadius: 9, border: 'none',
                  background: cfg.color, color: '#ffffff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 4px 12px ${cfg.color}40`,
                  transition: 'opacity 0.15s',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <BedDouble size={14} />
                Admit Patient Now
                <ChevronRight size={14} />
              </button>
              <button
                id="btn-dismiss-admission-alert"
                onClick={handleDismiss}
                style={{
                  padding: '10px 14px', borderRadius: 9,
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
              >
                Later
              </button>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9',
            }}>
              <Clock size={10} color="#94a3b8" />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Auto-refreshes every 30 s</span>
              {loading && (
                <span style={{
                  marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%',
                  border: '2px solid #e2e8f0', borderTopColor: cfg.color,
                  display: 'inline-block', animation: 'alertSpin 0.6s linear infinite',
                }} />
              )}
            </div>
          </div>
        )}

        {/* Minimized view */}
        {!expanded && (
          <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
              {orders.length} pending
            </span>
            <button
              onClick={() => handleAdmitNow(currentOrder)}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: cfg.color, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Open <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes alertBellShake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-14deg); }
          40% { transform: rotate(11deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(5deg); }
        }
        @keyframes alertPulseBar {
          from { opacity: 1; }
          to   { opacity: 0.45; }
        }
        @keyframes alertSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default DoctorAdmissionOrderAlert;
