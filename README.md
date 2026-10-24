# 🏥 MediCare Plus — Enterprise Hospital Management System (HMS)

> A full-stack Hospital Management System built with **React**, **Express.js**, **Node.js**, and **MySQL**.
> Specifically architected for a **5-Member Group Academic Project** satisfying rigorous database criteria:
> - **6 User Roles**: Admin, Doctor, Pharmacist, Receptionist, Nurse, Patient
> - **23 Role-Based Indexes** (Minimum 3-4 per role for high query performance)
> - **15 Views** (3 per member)
> - **15 Stored Procedures** (3 per member with transactions)
> - **15 Stored Functions** (3 per member)
> - **8 Triggers** (automated auditing, inventory control, bed management)
> - **ACID Transactions** with error rollback handlers (`DECLARE EXIT HANDLER FOR SQLEXCEPTION`)
> - **Public Portals**: Walk-in appointment booking & diagnostic laboratory test booking (no login required)

---

## 👥 5-Member Group Allocation & Academic Database Matrix

| Member | Assigned Role & Module | Views (3) | Stored Procedures (3) | Stored Functions (3) | Triggers & Transactions | Indexes (3+ per role) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Member 1** | **Admin & Management** | `vw_staff_overview`<br>`vw_admin_dashboard_stats`<br>`vw_dept_patient_stats` | `sp_register_staff`<br>`sp_appointments_by_doctor`<br>`sp_get_doctor_schedules` | `fn_monthly_revenue`<br>`fn_doctor_appointment_count`<br>`fn_dept_occupancy_rate` | `trg_users_audit`<br>`trg_staff_audit`<br>Staff registration transaction | `idx_admin_users_role_status`<br>`idx_admin_staff_dept_status`<br>`idx_admin_audit_action_date`<br>`idx_admin_appointments_date_status` |
| **Member 2** | **Doctor & Clinical** | `vw_doctor_today_appointments`<br>`vw_prescription_details`<br>`vw_medical_records_full` | `sp_doctor_appointments`<br>`sp_add_medical_record_with_prescription`<br>`sp_patient_medical_history` | `fn_get_patient_age`<br>`fn_is_slot_available`<br>`fn_doctor_prescription_count` | `trg_appointment_status_audit`<br>Multi-item Rx consultation transaction | `idx_doctor_appointments_doc_date_status`<br>`idx_doctor_medical_records_patient_date`<br>`idx_doctor_prescriptions_doc_date`<br>`idx_doctor_schedules_doc_day` |
| **Member 3** | **Pharmacist & Inventory** | `vw_pending_prescriptions`<br>`vw_medicine_inventory`<br>`vw_medicine_stock_history` | `sp_dispense_prescription`<br>`sp_update_medicine_stock`<br>`sp_medicine_inventory_report` | `fn_prescription_total`<br>`fn_is_medicine_in_stock`<br>`fn_low_stock_count` | `trg_medicine_stock_alert`<br>`trg_prescription_dispensed_audit`<br>Inventory atomic decrement transaction | `idx_pharmacy_prescriptions_status_date`<br>`idx_pharmacy_medicines_stock_reorder`<br>`idx_pharmacy_stock_log_med_date`<br>`idx_pharmacy_presc_items_presc_med` |
| **Member 4** | **Receptionist & Billing** | `vw_patient_bills`<br>`vw_today_payments`<br>`vw_registered_patients` | `sp_register_patient_appointment`<br>`sp_generate_bill`<br>`sp_process_payment` | `fn_calculate_bill_total`<br>`fn_patient_balance`<br>`fn_today_registrations` | `trg_bill_payment_audit`<br>`trg_after_payment_insert`<br>Atomic billing & payment transactions | `idx_reception_bills_patient_status`<br>`idx_reception_bills_status_date`<br>`idx_reception_payments_date_method`<br>`idx_reception_patients_reg_date` |
| **Member 5** | **Nurse & In-Patients** | `vw_current_admissions`<br>`vw_lab_tests_status`<br>`vw_ward_bed_status` | `sp_admit_patient`<br>`sp_request_lab_test`<br>`sp_enter_lab_result` | `fn_ward_available_beds`<br>`fn_admission_days`<br>`fn_pending_lab_tests` | `trg_bed_status_update`<br>`trg_after_admission_insert`<br>Bed reservation & admission transaction | `idx_nurse_admissions_status_date`<br>`idx_nurse_beds_ward_status`<br>`idx_nurse_lab_requests_status_prio_date`<br>`idx_nurse_lab_requests_patient_status` |
| **Role 6** | **Patient (Self-Service)** | `vw_patient_bills`<br>`vw_medical_records_full`<br>`vw_lab_tests_status` | Direct Portal Access | `fn_patient_balance`<br>`fn_get_patient_age` | Automated Patient Code Generation | `idx_patient_appointments_pat_date`<br>`idx_patient_prescriptions_pat_date`<br>`idx_patient_lab_requests_pat_date` |

---

## 🚀 Quick Start Guide

### 1. Database Setup (MySQL)

1. Ensure MySQL Server is running on your machine (e.g., via MySQL Workbench, XAMPP, or CLI).
2. Open terminal and run:
   ```bash
   mysql -u root -p < database/hospital_db.sql
   ```
   *Or open `database/hospital_db.sql` in MySQL Workbench / phpMyAdmin and execute all statements.*
3. This creates the database `hospital_db` complete with all 20+ relational tables, 15 views, 15 procedures, 15 functions, 8 triggers, and seed demo accounts.

---

### 2. Backend Setup (Node.js & Express)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Verify or update the `.env` file credentials:
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=hospital_db
   JWT_SECRET=hms_super_secret_jwt_key_2025_medical_system
   JWT_EXPIRES_IN=24h
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   Backend will start on `http://localhost:3001`.

---

### 3. Frontend Setup (React + Vite)

1. Open a second terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The Vite dev server will start on `http://localhost:3000` with instant Hot Module Replacement (HMR).

---

## 🔑 Default Login Credentials

All seeded accounts share the default password: **`password`**

| Role | Email Address | Password | Landing Dashboard |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hospital.com` | `password` | `/admin/dashboard` |
| **Doctor** | `dr.silva@hospital.com` | `password` | `/doctor/dashboard` |
| **Pharmacist** | `pharmacist@hospital.com` | `password` | `/pharmacy/dashboard` |
| **Receptionist** | `receptionist@hospital.com` | `password` | `/receptionist/dashboard` |
| **Nurse** | `nurse@hospital.com` | `password` | `/nurse/dashboard` |
| **Patient** | `john@email.com` | `password` | `/patient/dashboard` |

> *Tip: The Login page includes one-click demo quick-fill buttons for each role for instant testing.*

---

## 🌐 Public Portals (No Login Required)

- **Home Page (`/`)**: Hospital hero presentation, department showcase, medical team, patient testimonials, contact info.
- **Book Appointment (`/book-appointment`)**: 3-step walk-in appointment booking:
  1. Department selection & dynamic doctor filtering
  2. Date & slot availability picker
  3. Patient contact details & confirmation
- **Book Lab Test (`/book-lab-test`)**: Public diagnostic laboratory test booking with categorized test catalog and home collection options.

---

## 📁 System Architecture & Directory Structure

```
hospital-management-system/
├── database/
│   └── hospital_db.sql        # Full database script (Tables, Views, SPs, Functions, Triggers, Seed)
├── backend/
│   ├── config/
│   │   └── db.js              # MySQL2 connection pool
│   ├── middleware/
│   │   └── auth.js            # JWT verification & role-based guard middleware
│   ├── routes/
│   │   ├── auth.js            # Login, registration, token verification
│   │   ├── admin.js           # Staff CRUD, schedules, revenue, reports
│   │   ├── doctor.js          # Consultation, medical history, e-prescriptions
│   │   ├── pharmacy.js        # Medicine dispensing, stock maintenance
│   │   ├── receptionist.js    # Patient registration, billing, payment processing
│   │   ├── nurse.js           # Ward bed allocations, in-patient admissions, lab tests
│   │   ├── patient.js         # Patient portal, appointments, clinical reports
│   │   └── appointments.js    # Public & authenticated appointment scheduling
│   ├── .env                   # Environment configurations
│   ├── package.json
│   └── server.js              # Express app entrypoint
└── frontend/
    ├── public/
    │   └── index.html         # HTML5 root with Google Fonts (Inter & Outfit)
    └── src/
        ├── api/
        │   └── axios.js       # Centralized Axios client with JWT interceptor
        ├── context/
        │   └── AuthContext.js # Auth state, role redirection, and session persistence
        ├── components/
        │   ├── Navbar.js      # Public navigation bar
        │   ├── Sidebar.js     # Role-aware navigation sidebar
        │   ├── DashboardLayout.js # Topbar + Sidebar wrapper
        │   └── ProtectedRoute.js  # Role-based route authorization
        ├── pages/
        │   ├── public/        # HomePage, LoginPage, BookAppointment, BookLabTest
        │   ├── admin/         # AdminDashboard, AdminStaff, AdminAppointments, AdminSchedules, AdminPatients
        │   ├── doctor/        # DoctorDashboard, DoctorAppointments, DoctorPatients, DoctorPrescriptions
        │   ├── pharmacy/      # PharmacyDashboard, PharmacyPrescriptions, PharmacyInventory
        │   ├── receptionist/  # ReceptionistDashboard, ReceptionistPatients, ReceptionistBilling, ReceptionistAdmissions
        │   ├── nurse/         # NurseDashboard, NurseAdmissions, NurseWards, NurseLabTests
        │   └── patient/       # PatientDashboard, PatientAppointments, PatientReports
        ├── App.js             # Route declarations for all 6 roles
        ├── index.css          # Modern Blue & White medical design system
        └── index.js           # React root
```

---

## 🛡️ Key Database Triggers & Stored Procedures

### Triggers
1. `trg_users_audit`: Tracks user creation and role changes in `audit_logs`.
2. `trg_staff_audit`: Captures department transfers and salary adjustments.
3. `trg_appointment_status_audit`: Logs transitions across Scheduled, Confirmed, Completed, and Cancelled states.
4. `trg_medicine_stock_alert`: Alerts when medicine inventory drops below reorder thresholds.
5. `trg_prescription_dispensed_audit`: Automatically audits prescription fulfillment.
6. `trg_bill_payment_audit`: Records payment settlement events against patient invoices.
7. `trg_bed_status_update`: Synchronizes ward `available_beds` count when bed occupancy toggles.
8. `trg_lab_result_completed`: Automatically completes lab requests upon entry of diagnostic findings.

### Complex Transactions
- `sp_complete_consultation`: Atomically writes the medical record, inserts multi-item prescription rows, calculates total medicine costs, and marks the appointment completed.
- `sp_dispense_prescription`: Verifies inventory levels, decrements medicine stock atomically, and updates prescription status to `Dispensed`.
- `sp_generate_bill`: Aggregates doctor fees, dispensed medicine costs, completed lab test prices, and ward daily rates into a unified invoice.
- `sp_process_payment`: Processes payments, calculates remaining balance, and updates invoice status (`Paid`/`Partial`).
- `sp_admit_patient`: Reserves the first available bed in the selected ward, decrements available bed count, and logs the admission record.

---

## 🎨 Design System
- **Theme**: Clean Medical Blue (`#2563eb`), Sky Blue (`#0ea5e9`), and Pure White.
- **Typography**: Google Fonts Inter and Outfit.
- **UI Elements**: Glassmorphism cards, responsive tables, badge indicators, modal dialogs, and smooth micro-animations.
- **Zero Tailwind Dependency**: Built with pure, maintainable vanilla CSS custom properties.

---

## 📝 License
Academic project submission for Hospital Management Information Systems. All rights reserved.
