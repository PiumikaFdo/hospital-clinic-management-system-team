import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRedirect } from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import BookAppointment from './pages/public/BookAppointment';
import BookLabTest from './pages/public/BookLabTest';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStaff from './pages/admin/AdminStaff';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminSchedules from './pages/admin/AdminSchedules';
import AdminPatients from './pages/admin/AdminPatients';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorFollowUps from './pages/doctor/DoctorFollowUps';

// Pharmacist Pages
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import PharmacyPrescriptions from './pages/pharmacy/PharmacyPrescriptions';
import PharmacyInventory from './pages/pharmacy/PharmacyInventory';

// Receptionist Pages
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients';
import ReceptionistAppointments from './pages/receptionist/ReceptionistAppointments';
import ReceptionistBilling from './pages/receptionist/ReceptionistBilling';
import ReceptionistAdmissions from './pages/receptionist/ReceptionistAdmissions';

// Nurse Pages
import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseAdmissions from './pages/nurse/NurseAdmissions';
import NurseWards from './pages/nurse/NurseWards';
import NurseLabTests from './pages/nurse/NurseLabTests';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientReports from './pages/patient/PatientReports';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/"                    element={<HomePage />} />
          <Route path="/login"               element={<LoginPage />} />
          <Route path="/book-appointment"    element={<BookAppointment />} />
          <Route path="/book-lab-test"       element={<BookLabTest />} />
          <Route path="/dashboard"           element={<RoleRedirect />} />

          {/* ADMIN */}
          <Route path="/admin/dashboard"    element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/staff"        element={<ProtectedRoute roles={['admin']}><AdminStaff /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute roles={['admin']}><AdminAppointments /></ProtectedRoute>} />
          <Route path="/admin/schedules"    element={<ProtectedRoute roles={['admin']}><AdminSchedules /></ProtectedRoute>} />
          <Route path="/admin/patients"     element={<ProtectedRoute roles={['admin']}><AdminPatients /></ProtectedRoute>} />
          <Route path="/admin/audit-logs"   element={<ProtectedRoute roles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />

          {/* DOCTOR */}
          <Route path="/doctor/dashboard"     element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/consultations" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard initialTab="consultations" /></ProtectedRoute>} />
          <Route path="/doctor/follow-ups"    element={<ProtectedRoute roles={['doctor']}><DoctorFollowUps /></ProtectedRoute>} />
          <Route path="/doctor/appointments"  element={<ProtectedRoute roles={['doctor']}><DoctorAppointments /></ProtectedRoute>} />
          <Route path="/doctor/patients"      element={<ProtectedRoute roles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
          <Route path="/doctor/prescriptions" element={<ProtectedRoute roles={['doctor']}><DoctorPrescriptions /></ProtectedRoute>} />

          {/* PHARMACIST */}
          <Route path="/pharmacy/dashboard"     element={<ProtectedRoute roles={['pharmacist']}><PharmacyDashboard /></ProtectedRoute>} />
          <Route path="/pharmacy/prescriptions" element={<ProtectedRoute roles={['pharmacist']}><PharmacyPrescriptions /></ProtectedRoute>} />
          <Route path="/pharmacy/inventory"     element={<ProtectedRoute roles={['pharmacist']}><PharmacyInventory /></ProtectedRoute>} />

          {/* RECEPTIONIST */}
          <Route path="/receptionist/dashboard"    element={<ProtectedRoute roles={['receptionist']}><ReceptionistDashboard /></ProtectedRoute>} />
          <Route path="/receptionist/patients"     element={<ProtectedRoute roles={['receptionist']}><ReceptionistPatients /></ProtectedRoute>} />
          <Route path="/receptionist/appointments" element={<ProtectedRoute roles={['receptionist']}><ReceptionistAppointments /></ProtectedRoute>} />
          <Route path="/receptionist/billing"      element={<ProtectedRoute roles={['receptionist']}><ReceptionistBilling /></ProtectedRoute>} />
          <Route path="/receptionist/admissions"   element={<ProtectedRoute roles={['receptionist']}><ReceptionistAdmissions /></ProtectedRoute>} />

          {/* NURSE */}
          <Route path="/nurse/dashboard"   element={<ProtectedRoute roles={['nurse']}><NurseDashboard /></ProtectedRoute>} />
          <Route path="/nurse/admissions"  element={<ProtectedRoute roles={['nurse']}><NurseAdmissions /></ProtectedRoute>} />
          <Route path="/nurse/wards"       element={<ProtectedRoute roles={['nurse']}><NurseWards /></ProtectedRoute>} />
          <Route path="/nurse/lab-tests"   element={<ProtectedRoute roles={['nurse']}><NurseLabTests /></ProtectedRoute>} />

          {/* PATIENT */}
          <Route path="/patient/dashboard"    element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute roles={['patient']}><PatientAppointments /></ProtectedRoute>} />
          <Route path="/patient/reports"      element={<ProtectedRoute roles={['patient']}><PatientReports /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
