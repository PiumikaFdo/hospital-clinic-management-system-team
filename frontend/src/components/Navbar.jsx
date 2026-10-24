import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  CalendarCheck, 
  FlaskConical, 
  LogIn, 
  LayoutDashboard, 
  LogOut, 
  PhoneCall, 
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">
            <Activity className="brand-svg-icon" size={22} strokeWidth={2.4} />
          </div>
          <div className="navbar-brand-text">
            <div className="brand-title">
              <span>MediCare</span>
              <span className="brand-tag">HMS</span>
            </div>
            <p className="brand-sub">Clinical Enterprise Health</p>
          </div>
        </Link>

        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${isActive('/') ? 'active' : ''}`}
          >
            <span>Home</span>
          </Link>
          <Link 
            to="/book-appointment" 
            className={`navbar-link ${isActive('/book-appointment') ? 'active' : ''}`}
          >
            <CalendarCheck size={16} />
            <span>Book Doctor</span>
          </Link>
          <Link 
            to="/book-lab-test" 
            className={`navbar-link ${isActive('/book-lab-test') ? 'active' : ''}`}
          >
            <FlaskConical size={16} />
            <span>Lab Diagnostics</span>
          </Link>
        </div>

        <div className="navbar-right">
          <div className="emergency-badge" title="24/7 Clinical Emergency Line">
            <PhoneCall size={14} className="emergency-icon-pulse" />
            <span className="emergency-text">Emergency: <strong>1990</strong></span>
          </div>

          {user ? (
            <div className="navbar-user-actions">
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sign out">
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={15} />
              <span>Portal Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
