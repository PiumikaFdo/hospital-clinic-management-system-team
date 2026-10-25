import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  CalendarDays,
  FileText,
  ClipboardList,
  Pill,
  CreditCard,
  Building2,
  Bed,
  FlaskConical,
  Home,
  LogOut,
  Activity,
  Shield,
  Stethoscope,
  HeartPulse,
  CalendarClock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_CONFIGS = {
  admin: [
    { 
      section: 'Overview', 
      items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
      ] 
    },
    { 
      section: 'Hospital Administration', 
      items: [
        { to: '/admin/staff',        icon: Users,        label: 'Staff Directory' },
        { to: '/admin/patients',     icon: UserCheck,    label: 'Patient Records' },
        { to: '/admin/appointments', icon: CalendarCheck,label: 'Appointments' },
        { to: '/admin/schedules',    icon: CalendarDays, label: 'Doctor Schedules' },
        { to: '/admin/audit-logs',   icon: Shield,       label: 'Security Audit Logs' },
      ]
    },
  ],
  doctor: [
    { 
      section: 'Overview', 
      items: [
        { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Doctor Hub' }
      ] 
    },
    { 
      section: 'Clinical Care', 
      items: [
        { to: '/doctor/consultations',  icon: Stethoscope,     label: 'Consultations' },
        { to: '/doctor/follow-ups',     icon: CalendarClock,   label: 'Follow-up Management' },
        { to: '/doctor/appointments',   icon: CalendarCheck,   label: 'Appointments Queue' },
        { to: '/doctor/patients',       icon: Users,           label: 'Assigned Patients' },
        { to: '/doctor/prescriptions',  icon: FileText,        label: 'e-Prescriptions' },
      ]
    },
  ],
  pharmacist: [
    { 
      section: 'Overview', 
      items: [
        { to: '/pharmacy/dashboard', icon: LayoutDashboard, label: 'Dispensary Hub' }
      ] 
    },
    { 
      section: 'Pharmaceuticals', 
      items: [
        { to: '/pharmacy/prescriptions', icon: ClipboardList, label: 'Dispense Queue' },
        { to: '/pharmacy/inventory',     icon: Pill,          label: 'Inventory & Stock' },
      ]
    },
  ],
  receptionist: [
    { 
      section: 'Overview', 
      items: [
        { to: '/receptionist/dashboard', icon: LayoutDashboard, label: 'Front Desk' }
      ] 
    },
    { 
      section: 'Operations', 
      items: [
        { to: '/receptionist/patients',   icon: Users,      label: 'Patient Intake' },
        { to: '/receptionist/billing',    icon: CreditCard, label: 'Invoices & Billing' },
        { to: '/receptionist/admissions', icon: Building2,  label: 'Patient Admissions' },
      ]
    },
  ],
  nurse: [
    { 
      section: 'Overview', 
      items: [
        { to: '/nurse/dashboard', icon: LayoutDashboard, label: 'Nurse Station' }
      ] 
    },
    { 
      section: 'Inpatient Care', 
      items: [
        { to: '/nurse/admissions', icon: Building2,    label: 'Ward Admissions' },
        { to: '/nurse/wards',      icon: Bed,          label: 'Beds & Occupancy' },
        { to: '/nurse/lab-tests',  icon: FlaskConical, label: 'Diagnostic Orders' },
      ]
    },
  ],
  patient: [
    { 
      section: 'My Health Portal', 
      items: [
        { to: '/patient/dashboard',    icon: LayoutDashboard, label: 'Overview' },
        { to: '/patient/appointments', icon: CalendarCheck,   label: 'My Appointments' },
        { to: '/patient/reports',      icon: FileText,        label: 'Lab & Diagnostic Reports' },
      ]
    },
  ],
};

const ROLE_LABEL_MAP = {
  admin: 'Administrator',
  doctor: 'Medical Doctor',
  pharmacist: 'Pharmacist',
  receptionist: 'Front Desk',
  nurse: 'Nursing Staff',
  patient: 'Patient Portal',
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const navItems = NAV_CONFIGS[user.role] || [];
  const initials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Activity size={20} className="brand-svg-icon" strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">
            <span>MediCare</span>
            <span className="brand-tag">HMS</span>
          </div>
          <p>Enterprise Healthcare</p>
        </div>
      </div>

      <div className="sidebar-system-status">
        <span className="status-indicator-dot" />
        <span className="status-indicator-text">System Live • Encrypted</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section-wrapper">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={18} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className="sidebar-nav-bottom">
          <NavLink to="/" className="nav-link public-portal-link">
            <Home size={18} className="nav-icon" />
            <span className="nav-label">Public Hospital Site</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="name" title={user.name}>{user.name}</div>
            <div className="role-pill">
              <span className="role-dot" />
              <span>{ROLE_LABEL_MAP[user.role] || user.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title="Sign out of system"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
