import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_REDIRECTS = {
  admin:        '/admin/dashboard',
  doctor:       '/doctor/dashboard',
  pharmacist:   '/pharmacy/dashboard',
  receptionist: '/receptionist/dashboard',
  nurse:        '/nurse/dashboard',
  patient:      '/patient/dashboard',
};

export const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_REDIRECTS[user.role] || '/'} replace />;
  return children;
};

export const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_REDIRECTS[user.role] || '/'} replace />;
};
