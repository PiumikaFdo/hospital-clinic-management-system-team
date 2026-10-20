import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Calendar, Clock, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ title, subtitle, children }) => {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState('checking'); // 'connected', 'error', 'checking'

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

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
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
          </div>
        </header>

        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
