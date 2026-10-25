-- ============================================================
--  HOSPITAL MANAGEMENT SYSTEM - FULL DATABASE SCRIPT
--  Database: hospital_db
--  Members: 5 (Admin, Doctor, Pharmacist, Receptionist, Nurse)
--  Default Password for all seeded accounts: Admin@123
--  Features: 23 Role-Based Indexes (Minimum 3-4 per role),
--             15 Views, 15 Stored Procedures, 15 Functions,
--             9 Triggers, Full Transactions, Seed Data
-- ============================================================

DROP DATABASE IF EXISTS hospital_db;
CREATE DATABASE hospital_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_db;

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','doctor','pharmacist','receptionist','nurse','patient') NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    gender ENUM('Male','Female','Other'),
    date_of_birth DATE,
    address TEXT,
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    dept_id INT,
    employee_id VARCHAR(20) UNIQUE,
    qualification VARCHAR(200),
    specialization VARCHAR(100),
    experience_years INT DEFAULT 0,
    joining_date DATE,
    salary DECIMAL(10,2),
    shift ENUM('Morning','Afternoon','Night','Flexible') DEFAULT 'Morning',
    status ENUM('Active','Inactive','On_Leave') DEFAULT 'Active',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    patient_code VARCHAR(20) UNIQUE,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
    emergency_contact VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    allergies TEXT,
    medical_history TEXT,
    insurance_provider VARCHAR(100),
    insurance_number VARCHAR(50),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE doctor_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_appointments INT DEFAULT 20,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT,
    status ENUM('Pending','Confirmed','Completed','Cancelled','No_Show') DEFAULT 'Confirmed',
    appointment_type ENUM('Online','Walk-in','Emergency') DEFAULT 'Online',
    guest_name VARCHAR(100),
    guest_phone VARCHAR(20),
    guest_email VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

CREATE TABLE medical_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT,
    diagnosis TEXT NOT NULL,
    symptoms TEXT,
    treatment_plan TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    prescription_date DATE NOT NULL,
    status ENUM('Pending','Dispensed','Cancelled') DEFAULT 'Pending',
    notes TEXT,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id)
);

CREATE TABLE medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    brand VARCHAR(100),
    category VARCHAR(50),
    dosage_form ENUM('Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Other'),
    strength VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    expiry_date DATE,
    manufacturer VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE prescription_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_id INT NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(50),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);

CREATE TABLE wards (
    ward_id INT AUTO_INCREMENT PRIMARY KEY,
    ward_name VARCHAR(100) NOT NULL,
    ward_type ENUM('General','ICU','Emergency','Maternity','Pediatric','Private','Semi-Private'),
    total_beds INT NOT NULL,
    available_beds INT NOT NULL,
    floor_number INT,
    nurse_in_charge INT,
    daily_rate DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (nurse_in_charge) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE beds (
    bed_id INT AUTO_INCREMENT PRIMARY KEY,
    ward_id INT NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    status ENUM('Available','Occupied','Maintenance') DEFAULT 'Available',
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id) ON DELETE CASCADE,
    UNIQUE(ward_id, bed_number)
);

CREATE TABLE admissions (
    admission_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    bed_id INT,
    ward_id INT,
    doctor_id INT NOT NULL,
    nurse_id INT,
    admission_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharge_date DATETIME,
    reason_for_admission TEXT,
    diagnosis_at_discharge TEXT,
    status ENUM('Active','Discharged','Transferred') DEFAULT 'Active',
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE SET NULL,
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id),
    FOREIGN KEY (nurse_id) REFERENCES staff(staff_id)
);

CREATE TABLE lab_tests (
    test_id INT AUTO_INCREMENT PRIMARY KEY,
    test_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100),
    description TEXT,
    normal_range VARCHAR(100),
    unit VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    turnaround_hours INT DEFAULT 24,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE lab_requests (
    lab_request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    nurse_id INT,
    test_id INT NOT NULL,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Requested','Sample_Collected','Processing','Completed','Cancelled') DEFAULT 'Requested',
    priority ENUM('Normal','Urgent','Critical') DEFAULT 'Normal',
    sample_collected_at DATETIME,
    completed_at DATETIME,
    notes TEXT,
    guest_name VARCHAR(100),
    guest_phone VARCHAR(20),
    guest_email VARCHAR(100),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (nurse_id) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (test_id) REFERENCES lab_tests(test_id)
);

CREATE TABLE lab_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_request_id INT NOT NULL UNIQUE,
    result_value TEXT,
    remarks TEXT,
    is_abnormal BOOLEAN DEFAULT FALSE,
    report_file VARCHAR(255),
    reported_by INT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_request_id) REFERENCES lab_requests(lab_request_id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    receptionist_id INT,
    appointment_id INT,
    admission_id INT,
    bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    doctor_fees DECIMAL(10,2) DEFAULT 0.00,
    medicine_cost DECIMAL(10,2) DEFAULT 0.00,
    lab_cost DECIMAL(10,2) DEFAULT 0.00,
    ward_cost DECIMAL(10,2) DEFAULT 0.00,
    hospital_fees DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    tax DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_status ENUM('Pending','Partial','Paid','Cancelled') DEFAULT 'Pending',
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (receptionist_id) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id) ON DELETE SET NULL
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Cash','Card','UPI','Insurance','Bank_Transfer') NOT NULL,
    transaction_reference VARCHAR(100),
    received_by INT,
    notes TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (received_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE medicine_stock_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT NOT NULL,
    change_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
    quantity_changed INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    notes TEXT,
    logged_by INT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
    FOREIGN KEY (logged_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- 2. ROLE-BASED PERFORMANCE INDEXES (Minimum 3 per role)
-- ============================================================

-- ---- ADMIN INDEXES (4) ----
-- 1. Accelerates admin user directory, role filtering, and active staff authentication
CREATE INDEX idx_admin_users_role_status ON users(role, is_active);

-- 2. Speeds up staff department allocation, shift monitoring, and active staff lookups
CREATE INDEX idx_admin_staff_dept_status ON staff(dept_id, status);

-- 3. Optimizes security auditing, activity tracking, and compliance review by action and date
CREATE INDEX idx_admin_audit_action_date ON audit_logs(action, created_at);

-- 4. Optimizes system-wide workload analysis, appointment date-range filters, and status reports
CREATE INDEX idx_admin_appointments_date_status ON appointments(appointment_date, status);


-- ---- DOCTOR INDEXES (4) ----
-- 1. Accelerates daily appointment queue retrieval, schedule filtering, and slot conflict checks
CREATE INDEX idx_doctor_appointments_doc_date_status ON appointments(doctor_id, appointment_date, status);

-- 2. Optimizes patient electronic medical record retrieval and consultation chronological history
CREATE INDEX idx_doctor_medical_records_patient_date ON medical_records(patient_id, created_at);

-- 3. Speeds up doctor prescription tracking, consultation counts, and clinical audits
CREATE INDEX idx_doctor_prescriptions_doc_date ON prescriptions(doctor_id, prescription_date);

-- 4. Optimizes doctor weekly availability and schedule lookup for slot booking
CREATE INDEX idx_doctor_schedules_doc_day ON doctor_schedules(doctor_id, day_of_week, is_available);


-- ---- PHARMACIST INDEXES (4) ----
-- 1. Optimizes pending prescription dispensing queue and turnaround monitoring
CREATE INDEX idx_pharmacy_prescriptions_status_date ON prescriptions(status, prescription_date);

-- 2. Accelerates low stock detection, reorder threshold alerts, and active medicine inventory scans
CREATE INDEX idx_pharmacy_medicines_stock_reorder ON medicines(is_active, stock_quantity, reorder_level);

-- 3. Speeds up stock movement audits, batch logs, and inventory adjustment history
CREATE INDEX idx_pharmacy_stock_log_med_date ON medicine_stock_log(medicine_id, logged_at);

-- 4. Optimizes prescription item lookups, pricing calculations, and automated dispensing stock deductions
CREATE INDEX idx_pharmacy_presc_items_presc_med ON prescription_items(prescription_id, medicine_id);


-- ---- RECEPTIONIST INDEXES (4) ----
-- 1. Speeds up patient billing balance inquiries, outstanding invoice alerts, and checkout workflows
CREATE INDEX idx_reception_bills_patient_status ON bills(patient_id, payment_status);

-- 2. Accelerates pending invoice collections, billing date range reporting, and revenue calculations
CREATE INDEX idx_reception_bills_status_date ON bills(payment_status, bill_date);

-- 3. Optimizes daily payment register reconciliation, cashier shifts, and payment method summaries
CREATE INDEX idx_reception_payments_date_method ON payments(payment_date, payment_method);

-- 4. Accelerates daily front-desk patient intake tracking and new patient registration audits
CREATE INDEX idx_reception_patients_reg_date ON patients(registered_at);


-- ---- NURSE INDEXES (4) ----
-- 1. Accelerates active in-patient tracking, admission duration metrics, and ward census management
CREATE INDEX idx_nurse_admissions_status_date ON admissions(status, admission_date);

-- 2. Optimizes bed availability lookups in specific wards for instant emergency patient bed allocation
CREATE INDEX idx_nurse_beds_ward_status ON beds(ward_id, status);

-- 3. Speeds up lab diagnostic request prioritization (Critical/Urgent/Normal) and pending sample collection
CREATE INDEX idx_nurse_lab_requests_status_prio_date ON lab_requests(status, priority, request_date);

-- 4. Accelerates patient lab diagnostic tracking and pending test checks during in-patient care
CREATE INDEX idx_nurse_lab_requests_patient_status ON lab_requests(patient_id, status);


-- ---- PATIENT INDEXES (3) ----
-- 1. Accelerates patient portal appointment history, upcoming visits, and schedule displays
CREATE INDEX idx_patient_appointments_pat_date ON appointments(patient_id, appointment_date);

-- 2. Speeds up patient personal prescription history and electronic prescription reviews
CREATE INDEX idx_patient_prescriptions_pat_date ON prescriptions(patient_id, prescription_date);

-- 3. Optimizes patient diagnostic lab report history and test result retrieval
CREATE INDEX idx_patient_lab_requests_pat_date ON lab_requests(patient_id, request_date);

-- ============================================================
-- 3. STORED FUNCTIONS (3 per role = 15 total)
-- ============================================================

DELIMITER $$

-- ---- ADMIN FUNCTIONS (3) ----

-- FUNCTION 1: Calculate monthly revenue
CREATE FUNCTION fn_monthly_revenue(p_year INT, p_month INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(12,2);
    SELECT COALESCE(SUM(paid_amount), 0) INTO total
    FROM bills
    WHERE YEAR(bill_date) = p_year AND MONTH(bill_date) = p_month
    AND payment_status IN ('Paid','Partial');
    RETURN total;
END$$

-- FUNCTION 2: Get doctor appointment count by status
CREATE FUNCTION fn_doctor_appointment_count(p_doctor_id INT, p_status VARCHAR(20))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt
    FROM appointments
    WHERE doctor_id = p_doctor_id AND (p_status = 'ALL' OR status = p_status);
    RETURN cnt;
END$$

-- FUNCTION 3: Get department occupancy rate (%)
CREATE FUNCTION fn_dept_occupancy_rate(p_dept_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_beds INT DEFAULT 0;
    DECLARE occupied INT DEFAULT 0;
    SELECT
        COALESCE(SUM(w.total_beds),0),
        COALESCE(SUM(w.total_beds - w.available_beds),0)
    INTO total_beds, occupied
    FROM wards w
    JOIN staff s ON w.nurse_in_charge = s.staff_id
    WHERE s.dept_id = p_dept_id;
    IF total_beds = 0 THEN RETURN 0; END IF;
    RETURN ROUND((occupied / total_beds) * 100, 2);
END$$

-- ---- DOCTOR FUNCTIONS (3) ----

-- FUNCTION 4: Get patient age from DOB
CREATE FUNCTION fn_get_patient_age(p_patient_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE dob DATE;
    SELECT u.date_of_birth INTO dob
    FROM patients p JOIN users u ON p.user_id = u.user_id
    WHERE p.patient_id = p_patient_id;
    RETURN TIMESTAMPDIFF(YEAR, dob, CURDATE());
END$$

-- FUNCTION 5: Check if an appointment slot is available
CREATE FUNCTION fn_is_slot_available(p_doctor_id INT, p_date DATE, p_time TIME)
RETURNS TINYINT(1)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_date
      AND appointment_time = p_time
      AND status NOT IN ('Cancelled','No_Show');
    RETURN cnt = 0;
END$$

-- FUNCTION 6: Count prescriptions written by a doctor
CREATE FUNCTION fn_doctor_prescription_count(p_doctor_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM prescriptions WHERE doctor_id = p_doctor_id;
    RETURN cnt;
END$$

-- ---- PHARMACIST FUNCTIONS (3) ----

-- FUNCTION 7: Calculate total cost of a prescription
CREATE FUNCTION fn_prescription_total(p_prescription_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT COALESCE(SUM(total_price), 0) INTO total
    FROM prescription_items WHERE prescription_id = p_prescription_id;
    RETURN total;
END$$

-- FUNCTION 8: Check if medicine has enough stock
CREATE FUNCTION fn_is_medicine_in_stock(p_medicine_id INT, p_required_qty INT)
RETURNS TINYINT(1)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE available INT DEFAULT 0;
    SELECT stock_quantity INTO available FROM medicines WHERE medicine_id = p_medicine_id;
    RETURN available >= p_required_qty;
END$$

-- FUNCTION 9: Count medicines with low/critical stock
CREATE FUNCTION fn_low_stock_count()
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM medicines
    WHERE stock_quantity <= reorder_level AND is_active = TRUE;
    RETURN cnt;
END$$

-- ---- RECEPTIONIST FUNCTIONS (3) ----

-- FUNCTION 10: Calculate bill total with tax
CREATE FUNCTION fn_calculate_bill_total(
    p_doctor_fees DECIMAL(10,2),
    p_medicine_cost DECIMAL(10,2),
    p_lab_cost DECIMAL(10,2),
    p_ward_cost DECIMAL(10,2),
    p_hospital_fees DECIMAL(10,2),
    p_discount DECIMAL(10,2),
    p_tax_rate DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE subtotal DECIMAL(10,2);
    SET subtotal = p_doctor_fees + p_medicine_cost + p_lab_cost + p_ward_cost + p_hospital_fees - p_discount;
    RETURN ROUND(subtotal + (subtotal * p_tax_rate / 100), 2);
END$$

-- FUNCTION 11: Get total outstanding balance for a patient
CREATE FUNCTION fn_patient_balance(p_patient_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE balance DECIMAL(10,2);
    SELECT COALESCE(SUM(balance_amount), 0) INTO balance
    FROM bills WHERE patient_id = p_patient_id AND payment_status IN ('Pending','Partial');
    RETURN balance;
END$$

-- FUNCTION 12: Count today's new patient registrations
CREATE FUNCTION fn_today_registrations()
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM patients WHERE DATE(registered_at) = CURDATE();
    RETURN cnt;
END$$

-- ---- NURSE FUNCTIONS (3) ----

-- FUNCTION 13: Count available beds in a ward
CREATE FUNCTION fn_ward_available_beds(p_ward_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM beds WHERE ward_id = p_ward_id AND status = 'Available';
    RETURN cnt;
END$$

-- FUNCTION 14: Get days a patient has been admitted
CREATE FUNCTION fn_admission_days(p_admission_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE admit_date DATETIME;
    DECLARE discharge DATETIME;
    SELECT admission_date, COALESCE(discharge_date, NOW())
    INTO admit_date, discharge
    FROM admissions WHERE admission_id = p_admission_id;
    RETURN GREATEST(1, DATEDIFF(discharge, admit_date));
END$$

-- FUNCTION 15: Count pending lab tests for a patient
CREATE FUNCTION fn_pending_lab_tests(p_patient_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM lab_requests
    WHERE patient_id = p_patient_id AND status NOT IN ('Completed','Cancelled');
    RETURN cnt;
END$$

-- ============================================================
-- 4. STORED PROCEDURES (3 per role = 15 total, with TRANSACTIONS)
-- ============================================================

-- ---- ADMIN PROCEDURES (3) ----

-- PROCEDURE 1: Register a new staff member (TRANSACTION)
CREATE PROCEDURE sp_register_staff(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_role ENUM('doctor','pharmacist','receptionist','nurse'),
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_phone VARCHAR(20),
    IN p_gender ENUM('Male','Female','Other'),
    IN p_dob DATE,
    IN p_dept_id INT,
    IN p_qualification VARCHAR(200),
    IN p_specialization VARCHAR(100),
    IN p_experience_years INT,
    IN p_joining_date DATE,
    IN p_salary DECIMAL(10,2),
    OUT p_new_user_id INT,
    OUT p_new_staff_id INT
)
BEGIN
    DECLARE v_emp_id VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    INSERT INTO users(username,email,password_hash,role,first_name,last_name,phone,gender,date_of_birth)
    VALUES(p_username,p_email,p_password_hash,p_role,p_first_name,p_last_name,p_phone,p_gender,p_dob);
    SET p_new_user_id = LAST_INSERT_ID();
    SET v_emp_id = CONCAT(UPPER(LEFT(p_role,3)), LPAD(p_new_user_id, 5, '0'));
    INSERT INTO staff(user_id,dept_id,employee_id,qualification,specialization,experience_years,joining_date,salary)
    VALUES(p_new_user_id,p_dept_id,v_emp_id,p_qualification,p_specialization,COALESCE(p_experience_years, 0),p_joining_date,p_salary);
    SET p_new_staff_id = LAST_INSERT_ID();
    COMMIT;
END$$

-- PROCEDURE 2: Get appointments for a doctor (date range + status filter)
CREATE PROCEDURE sp_appointments_by_doctor(
    IN p_doctor_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_status VARCHAR(20)
)
BEGIN
    SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        COALESCE(CONCAT(u.first_name,' ',u.last_name), a.guest_name) AS patient_name,
        COALESCE(u.phone, a.guest_phone) AS patient_phone,
        a.reason, a.status, a.appointment_type, a.notes
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN users u ON p.user_id = u.user_id
    WHERE a.doctor_id = p_doctor_id
      AND a.appointment_date BETWEEN p_start_date AND p_end_date
      AND (p_status = 'ALL' OR a.status = p_status)
    ORDER BY a.appointment_date, a.appointment_time;
END$$

-- PROCEDURE 3: Get all doctor schedules (optionally filtered by dept)
CREATE PROCEDURE sp_get_doctor_schedules(IN p_dept_id INT)
BEGIN
    SELECT
        s.staff_id AS doctor_id,
        CONCAT(u.first_name,' ',u.last_name) AS doctor_name,
        d.dept_name, s.specialization,
        ds.day_of_week, ds.start_time, ds.end_time,
        ds.max_appointments, ds.is_available,
        fn_doctor_appointment_count(s.staff_id, 'ALL') AS total_appointments
    FROM staff s
    JOIN users u ON s.user_id = u.user_id
    JOIN departments d ON s.dept_id = d.dept_id
    LEFT JOIN doctor_schedules ds ON s.staff_id = ds.doctor_id
    WHERE u.role = 'doctor' AND (p_dept_id = 0 OR s.dept_id = p_dept_id)
    ORDER BY d.dept_name, u.last_name;
END$$

-- ---- DOCTOR PROCEDURES (3) ----

-- PROCEDURE 4: Get doctor's own appointments
CREATE PROCEDURE sp_doctor_appointments(IN p_doctor_id INT, IN p_date DATE)
BEGIN
    SELECT
        a.appointment_id, a.appointment_date, a.appointment_time,
        a.status, a.reason,
        COALESCE(CONCAT(u.first_name,' ',u.last_name), a.guest_name) AS patient_name,
        COALESCE(u.phone, a.guest_phone) AS phone,
        p.patient_id, p.blood_group,
        fn_get_patient_age(p.patient_id) AS age
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN users u ON p.user_id = u.user_id
    WHERE a.doctor_id = p_doctor_id
      AND (p_date IS NULL OR a.appointment_date = p_date)
    ORDER BY a.appointment_date, a.appointment_time;
END$$

-- PROCEDURE 5: Add medical record + prescription (TRANSACTION)
CREATE PROCEDURE sp_add_medical_record_with_prescription(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_appointment_id INT,
    IN p_diagnosis TEXT,
    IN p_symptoms TEXT,
    IN p_treatment_plan TEXT,
    IN p_follow_up_date DATE,
    IN p_record_notes TEXT,
    IN p_presc_notes TEXT,
    IN p_medicine_ids JSON,
    IN p_quantities JSON,
    IN p_dosages JSON,
    IN p_frequencies JSON,
    IN p_durations JSON,
    OUT p_record_id INT,
    OUT p_prescription_id INT
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE v_count INT;
    DECLARE v_med_id INT;
    DECLARE v_qty INT;
    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert medical record
    INSERT INTO medical_records(patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_plan, follow_up_date, notes)
    VALUES(p_patient_id, p_doctor_id, p_appointment_id, p_diagnosis, p_symptoms, p_treatment_plan, p_follow_up_date, p_record_notes);
    SET p_record_id = LAST_INSERT_ID();

    -- Insert prescription
    INSERT INTO prescriptions(record_id, patient_id, doctor_id, prescription_date, notes)
    VALUES(p_record_id, p_patient_id, p_doctor_id, CURDATE(), p_presc_notes);
    SET p_prescription_id = LAST_INSERT_ID();

    -- Insert prescription items
    IF p_medicine_ids IS NOT NULL AND JSON_LENGTH(p_medicine_ids) > 0 THEN
        SET v_count = JSON_LENGTH(p_medicine_ids);
        WHILE i < v_count DO
            SET v_med_id = JSON_EXTRACT(p_medicine_ids, CONCAT('$[', i, ']'));
            SET v_qty = JSON_EXTRACT(p_quantities, CONCAT('$[', i, ']'));
            SELECT unit_price INTO v_unit_price FROM medicines WHERE medicine_id = v_med_id;
            INSERT INTO prescription_items(prescription_id, medicine_id, dosage, frequency, duration, quantity, unit_price)
            VALUES(
                p_prescription_id, v_med_id,
                JSON_UNQUOTE(JSON_EXTRACT(p_dosages, CONCAT('$[', i, ']'))),
                JSON_UNQUOTE(JSON_EXTRACT(p_frequencies, CONCAT('$[', i, ']'))),
                JSON_UNQUOTE(JSON_EXTRACT(p_durations, CONCAT('$[', i, ']'))),
                v_qty, v_unit_price
            );
            SET i = i + 1;
        END WHILE;
        SET v_total = fn_prescription_total(p_prescription_id);
        UPDATE prescriptions SET total_cost = v_total WHERE prescription_id = p_prescription_id;
    END IF;

    -- Update appointment status
    UPDATE appointments SET status = 'Completed' WHERE appointment_id = p_appointment_id;
    COMMIT;
END$$

-- PROCEDURE 6: Get complete patient medical history (multiple result sets)
CREATE PROCEDURE sp_patient_medical_history(IN p_patient_id INT)
BEGIN
    -- Patient basic info
    SELECT p.patient_id, p.patient_code, p.blood_group, p.allergies, p.medical_history,
           p.emergency_contact, p.emergency_contact_name,
           u.first_name, u.last_name, u.email, u.phone, u.gender, u.date_of_birth, u.address,
           fn_get_patient_age(p.patient_id) AS age
    FROM patients p JOIN users u ON p.user_id = u.user_id
    WHERE p.patient_id = p_patient_id;

    -- Medical records
    SELECT mr.*, CONCAT(u.first_name,' ',u.last_name) AS doctor_name, d.dept_name
    FROM medical_records mr
    JOIN staff s ON mr.doctor_id = s.staff_id
    JOIN users u ON s.user_id = u.user_id
    JOIN departments d ON s.dept_id = d.dept_id
    WHERE mr.patient_id = p_patient_id ORDER BY mr.created_at DESC;

    -- Prescriptions with items
    SELECT pres.prescription_id, pres.prescription_date, pres.status, pres.total_cost,
           pi.quantity, pi.dosage, pi.frequency, pi.duration,
           m.medicine_name, m.strength, m.dosage_form,
           CONCAT(u.first_name,' ',u.last_name) AS doctor_name
    FROM prescriptions pres
    JOIN prescription_items pi ON pres.prescription_id = pi.prescription_id
    JOIN medicines m ON pi.medicine_id = m.medicine_id
    JOIN staff s ON pres.doctor_id = s.staff_id
    JOIN users u ON s.user_id = u.user_id
    WHERE pres.patient_id = p_patient_id ORDER BY pres.prescription_date DESC;

    -- Lab results
    SELECT lr.lab_request_id, lr.request_date, lr.status, lr.priority,
           lt.test_name, lt.category, lt.price,
           res.result_value, res.remarks, res.is_abnormal, res.reported_at
    FROM lab_requests lr
    JOIN lab_tests lt ON lr.test_id = lt.test_id
    LEFT JOIN lab_results res ON lr.lab_request_id = res.lab_request_id
    WHERE lr.patient_id = p_patient_id ORDER BY lr.request_date DESC;
END$$

-- ---- PHARMACIST PROCEDURES (3) ----

-- PROCEDURE 7: Dispense prescription (deduct stock, TRANSACTION)
CREATE PROCEDURE sp_dispense_prescription(
    IN p_prescription_id INT,
    IN p_pharmacist_user_id INT
)
BEGIN
    DECLARE v_med_id INT;
    DECLARE v_qty INT;
    DECLARE v_stock INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR
        SELECT medicine_id, quantity FROM prescription_items WHERE prescription_id = p_prescription_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_med_id, v_qty;
        IF done THEN LEAVE read_loop; END IF;
        SELECT stock_quantity INTO v_stock FROM medicines WHERE medicine_id = v_med_id FOR UPDATE;
        IF v_stock < v_qty THEN
            CLOSE cur;
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for one or more medicines';
        END IF;
        UPDATE medicines SET stock_quantity = stock_quantity - v_qty WHERE medicine_id = v_med_id;
        INSERT INTO medicine_stock_log(medicine_id, change_type, quantity_changed, quantity_before, quantity_after, reference_type, reference_id, logged_by)
        VALUES(v_med_id, 'OUT', v_qty, v_stock, v_stock - v_qty, 'PRESCRIPTION', p_prescription_id, p_pharmacist_user_id);
    END LOOP;
    CLOSE cur;
    UPDATE prescriptions SET status = 'Dispensed' WHERE prescription_id = p_prescription_id;
    COMMIT;
END$$

-- PROCEDURE 8: Update medicine stock (IN/OUT/ADJUSTMENT, TRANSACTION)
CREATE PROCEDURE sp_update_medicine_stock(
    IN p_medicine_id INT,
    IN p_quantity_change INT,
    IN p_change_type ENUM('IN','OUT','ADJUSTMENT'),
    IN p_notes TEXT,
    IN p_logged_by INT
)
BEGIN
    DECLARE v_current_stock INT;
    DECLARE v_new_stock INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT stock_quantity INTO v_current_stock FROM medicines WHERE medicine_id = p_medicine_id FOR UPDATE;

    SET v_new_stock = CASE p_change_type
        WHEN 'IN'  THEN v_current_stock + p_quantity_change
        WHEN 'OUT' THEN v_current_stock - p_quantity_change
        ELSE p_quantity_change
    END;

    IF v_new_stock < 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
    END IF;

    UPDATE medicines SET stock_quantity = v_new_stock WHERE medicine_id = p_medicine_id;
    INSERT INTO medicine_stock_log(medicine_id, change_type, quantity_changed, quantity_before, quantity_after, notes, logged_by)
    VALUES(p_medicine_id, p_change_type, p_quantity_change, v_current_stock, v_new_stock, p_notes, p_logged_by);
    COMMIT;
END$$

-- PROCEDURE 9: Medicine inventory report by category
CREATE PROCEDURE sp_medicine_inventory_report(IN p_category VARCHAR(50))
BEGIN
    SELECT
        m.medicine_id, m.medicine_name, m.generic_name, m.category,
        m.dosage_form, m.strength, m.unit_price, m.stock_quantity, m.reorder_level,
        m.expiry_date, m.manufacturer,
        CASE
            WHEN m.stock_quantity = 0 THEN 'OUT OF STOCK'
            WHEN m.stock_quantity <= m.reorder_level THEN 'LOW STOCK'
            WHEN DATEDIFF(m.expiry_date, CURDATE()) <= 30 THEN 'EXPIRING SOON'
            ELSE 'SUFFICIENT'
        END AS stock_status,
        DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry
    FROM medicines m
    WHERE m.is_active = TRUE AND (p_category = 'ALL' OR m.category = p_category)
    ORDER BY m.stock_quantity ASC;
END$$

-- ---- RECEPTIONIST PROCEDURES (3) ----

-- PROCEDURE 10: Register patient and book appointment (TRANSACTION)
CREATE PROCEDURE sp_register_patient_appointment(
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_gender ENUM('Male','Female','Other'),
    IN p_dob DATE,
    IN p_blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
    IN p_address TEXT,
    IN p_doctor_id INT,
    IN p_appt_date DATE,
    IN p_appt_time TIME,
    IN p_reason TEXT,
    OUT p_patient_id INT,
    OUT p_appointment_id INT
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_patient_code VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO users(username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth, address)
    VALUES(
        CONCAT(LOWER(p_first_name), LOWER(p_last_name), FLOOR(RAND()*9000+1000)),
        p_email, '$2a$10$placeholder', 'patient',
        p_first_name, p_last_name, p_phone, p_gender, p_dob, p_address
    );
    SET v_user_id = LAST_INSERT_ID();
    SET v_patient_code = CONCAT('PAT', LPAD(v_user_id, 6, '0'));

    INSERT INTO patients(user_id, patient_code, blood_group)
    VALUES(v_user_id, v_patient_code, p_blood_group);
    SET p_patient_id = LAST_INSERT_ID();

    INSERT INTO appointments(patient_id, doctor_id, appointment_date, appointment_time, reason, status, appointment_type)
    VALUES(p_patient_id, p_doctor_id, p_appt_date, p_appt_time, p_reason, 'Confirmed', 'Walk-in');
    SET p_appointment_id = LAST_INSERT_ID();
    COMMIT;
END$$

-- PROCEDURE 11: Generate full bill for patient (TRANSACTION)
CREATE PROCEDURE sp_generate_bill(
    IN p_patient_id INT,
    IN p_receptionist_staff_id INT,
    IN p_appointment_id INT,
    IN p_admission_id INT,
    IN p_doctor_fees DECIMAL(10,2),
    IN p_hospital_fees DECIMAL(10,2),
    IN p_discount DECIMAL(10,2),
    IN p_tax_rate DECIMAL(5,2),
    OUT p_bill_id INT
)
BEGIN
    DECLARE v_medicine_cost DECIMAL(10,2) DEFAULT 0;
    DECLARE v_lab_cost DECIMAL(10,2) DEFAULT 0;
    DECLARE v_ward_cost DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF p_appointment_id IS NOT NULL THEN
        SELECT COALESCE(SUM(pres.total_cost), 0) INTO v_medicine_cost
        FROM prescriptions pres
        JOIN medical_records mr ON pres.record_id = mr.record_id
        WHERE mr.appointment_id = p_appointment_id AND pres.status = 'Dispensed';

        SELECT COALESCE(SUM(lt.price), 0) INTO v_lab_cost
        FROM lab_requests lr
        JOIN lab_tests lt ON lr.test_id = lt.test_id
        WHERE lr.patient_id = p_patient_id AND lr.status = 'Completed';
    END IF;

    IF p_admission_id IS NOT NULL THEN
        SELECT COALESCE(w.daily_rate * fn_admission_days(p_admission_id), 0) INTO v_ward_cost
        FROM admissions a JOIN wards w ON a.ward_id = w.ward_id
        WHERE a.admission_id = p_admission_id;
    END IF;

    SET v_total = fn_calculate_bill_total(p_doctor_fees, v_medicine_cost, v_lab_cost, v_ward_cost, p_hospital_fees, p_discount, p_tax_rate);

    INSERT INTO bills(patient_id, receptionist_id, appointment_id, admission_id,
                      doctor_fees, medicine_cost, lab_cost, ward_cost, hospital_fees,
                      discount, tax, total_amount, balance_amount)
    VALUES(p_patient_id, p_receptionist_staff_id, p_appointment_id, p_admission_id,
           p_doctor_fees, v_medicine_cost, v_lab_cost, v_ward_cost, p_hospital_fees,
           p_discount, ROUND(v_total - (p_doctor_fees + v_medicine_cost + v_lab_cost + v_ward_cost + p_hospital_fees - p_discount), 2),
           v_total, v_total);
    SET p_bill_id = LAST_INSERT_ID();
    COMMIT;
END$$

-- PROCEDURE 12: Process payment (TRANSACTION)
CREATE PROCEDURE sp_process_payment(
    IN p_bill_id INT,
    IN p_amount DECIMAL(10,2),
    IN p_payment_method ENUM('Cash','Card','UPI','Insurance','Bank_Transfer'),
    IN p_transaction_ref VARCHAR(100),
    IN p_received_by INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO payments(bill_id, amount, payment_method, transaction_reference, received_by)
    VALUES(p_bill_id, p_amount, p_payment_method, p_transaction_ref, p_received_by);
    COMMIT;
END$$

-- ---- NURSE PROCEDURES (3) ----

-- PROCEDURE 13: Admit patient and assign bed (TRANSACTION)
CREATE PROCEDURE sp_admit_patient(
    IN p_patient_id INT,
    IN p_ward_id INT,
    IN p_doctor_id INT,
    IN p_nurse_id INT,
    IN p_reason TEXT,
    OUT p_admission_id INT,
    OUT p_bed_id INT
)
BEGIN
    DECLARE v_bed_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT bed_id INTO v_bed_id FROM beds
    WHERE ward_id = p_ward_id AND status = 'Available' LIMIT 1 FOR UPDATE;

    IF v_bed_id IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available beds in the specified ward';
    END IF;

    UPDATE beds SET status = 'Occupied' WHERE bed_id = v_bed_id;
    UPDATE wards SET available_beds = available_beds - 1 WHERE ward_id = p_ward_id;

    INSERT INTO admissions(patient_id, bed_id, ward_id, doctor_id, nurse_id, reason_for_admission)
    VALUES(p_patient_id, v_bed_id, p_ward_id, p_doctor_id, p_nurse_id, p_reason);
    SET p_admission_id = LAST_INSERT_ID();
    SET p_bed_id = v_bed_id;
    COMMIT;
END$$

-- PROCEDURE 14: Request lab test for patient
CREATE PROCEDURE sp_request_lab_test(
    IN p_patient_id INT,
    IN p_nurse_id INT,
    IN p_test_id INT,
    IN p_priority ENUM('Normal','Urgent','Critical'),
    IN p_notes TEXT,
    OUT p_request_id INT
)
BEGIN
    INSERT INTO lab_requests(patient_id, nurse_id, test_id, priority, notes)
    VALUES(p_patient_id, p_nurse_id, p_test_id, p_priority, p_notes);
    SET p_request_id = LAST_INSERT_ID();
END$$

-- PROCEDURE 15: Enter lab test results (TRANSACTION)
CREATE PROCEDURE sp_enter_lab_result(
    IN p_lab_request_id INT,
    IN p_result_value TEXT,
    IN p_remarks TEXT,
    IN p_is_abnormal BOOLEAN,
    IN p_reported_by INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO lab_results(lab_request_id, result_value, remarks, is_abnormal, reported_by)
    VALUES(p_lab_request_id, p_result_value, p_remarks, p_is_abnormal, p_reported_by)
    ON DUPLICATE KEY UPDATE
        result_value = p_result_value, remarks = p_remarks,
        is_abnormal = p_is_abnormal, reported_by = p_reported_by, reported_at = NOW();

    UPDATE lab_requests SET status = 'Completed', completed_at = NOW()
    WHERE lab_request_id = p_lab_request_id;
    COMMIT;
END$$

-- PROCEDURE 16: Appointment analytics grouped by weekdays (Monday to Sunday)
CREATE PROCEDURE sp_appointments_by_weekday()
BEGIN
    SELECT 
        d.day_index,
        d.day_name,
        d.short_name,
        COUNT(a.appointment_id) AS total_appointments,
        SUM(CASE WHEN a.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN a.appointment_type = 'Online' THEN 1 ELSE 0 END) AS online_count,
        SUM(CASE WHEN a.appointment_type = 'Walk-in' THEN 1 ELSE 0 END) AS walkin_count,
        SUM(CASE WHEN a.appointment_type = 'Emergency' THEN 1 ELSE 0 END) AS emergency_count
    FROM (
        SELECT 1 AS day_index, 'Monday' AS day_name, 'Mon' AS short_name UNION ALL
        SELECT 2, 'Tuesday', 'Tue' UNION ALL
        SELECT 3, 'Wednesday', 'Wed' UNION ALL
        SELECT 4, 'Thursday', 'Thu' UNION ALL
        SELECT 5, 'Friday', 'Fri' UNION ALL
        SELECT 6, 'Saturday', 'Sat' UNION ALL
        SELECT 7, 'Sunday', 'Sun'
    ) d
    LEFT JOIN appointments a ON DAYNAME(a.appointment_date) = d.day_name
    GROUP BY d.day_index, d.day_name, d.short_name
    ORDER BY d.day_index;
END$$

-- PROCEDURE 17: Summary of appointments for each doctor separately
CREATE PROCEDURE sp_appointment_summary_by_doctor()
BEGIN
    SELECT 
        s.staff_id AS doctor_id,
        CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
        u.email AS doctor_email,
        u.phone AS doctor_phone,
        d.dept_name,
        s.specialization,
        COUNT(a.appointment_id) AS total_appointments,
        SUM(CASE WHEN a.appointment_date = CURDATE() THEN 1 ELSE 0 END) AS today_appointments,
        SUM(CASE WHEN a.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_appointments,
        SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed_appointments,
        ROUND(
            COALESCE(
                SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.appointment_id), 0),
                0
            ), 1
        ) AS completion_rate
    FROM staff s
    JOIN users u ON s.user_id = u.user_id
    LEFT JOIN departments d ON s.dept_id = d.dept_id
    LEFT JOIN appointments a ON s.staff_id = a.doctor_id
    WHERE u.role = 'Doctor'
    GROUP BY s.staff_id, u.first_name, u.last_name, u.email, u.phone, d.dept_name, s.specialization
    ORDER BY total_appointments DESC, doctor_name ASC;
END$$

-- PROCEDURE 18: Overall summary of appointments across all doctors
CREATE PROCEDURE sp_appointment_summary_overall()
BEGIN
    SELECT 
        COUNT(*) AS total_appointments,
        SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) AS today_appointments,
        SUM(CASE WHEN appointment_date > CURDATE() THEN 1 ELSE 0 END) AS future_appointments,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_appointments,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_appointments,
        COUNT(DISTINCT doctor_id) AS total_doctors_scheduled,
        COUNT(DISTINCT patient_id) AS total_patients_scheduled,
        ROUND(
            COALESCE(
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
                0
            ), 1
        ) AS overall_completion_rate
    FROM appointments;
END$$

-- ============================================================
-- 5. VIEWS (3 per role = 15 total)
-- ============================================================

-- ---- ADMIN VIEWS (3) ----

CREATE VIEW vw_staff_overview AS
SELECT s.staff_id, s.employee_id, s.specialization, s.experience_years,
       s.joining_date, s.shift, s.status, s.salary,
       u.user_id, u.first_name, u.last_name, u.email, u.phone, u.role, u.gender, u.is_active,
       d.dept_name, d.dept_id
FROM staff s
JOIN users u ON s.user_id = u.user_id
LEFT JOIN departments d ON s.dept_id = d.dept_id$$

CREATE VIEW vw_admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM patients)                                             AS total_patients,
    (SELECT COUNT(*) FROM staff WHERE status='Active')                          AS total_active_staff,
    (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE())      AS today_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status='Pending')                  AS pending_appointments,
    (SELECT COUNT(*) FROM admissions WHERE status='Active')                     AS current_admissions,
    (SELECT fn_monthly_revenue(YEAR(NOW()), MONTH(NOW())))                      AS current_month_revenue,
    (SELECT fn_low_stock_count())                                               AS low_stock_medicines,
    (SELECT COUNT(*) FROM bills WHERE payment_status='Pending')                 AS unpaid_bills$$

CREATE VIEW vw_dept_patient_stats AS
SELECT
    d.dept_id, d.dept_name,
    COUNT(DISTINCT a.patient_id)                                                AS unique_patients,
    COUNT(a.appointment_id)                                                     AS total_appointments,
    SUM(CASE WHEN a.status='Completed' THEN 1 ELSE 0 END)                      AS completed,
    SUM(CASE WHEN a.status='Pending'   THEN 1 ELSE 0 END)                      AS pending,
    SUM(CASE WHEN a.status='Cancelled' THEN 1 ELSE 0 END)                      AS cancelled
    SUM(CASE WHEN a.status='Confirmed' THEN 1 ELSE 0 END)                      AS confirmed
FROM departments d
LEFT JOIN staff s ON d.dept_id = s.dept_id
LEFT JOIN appointments a ON s.staff_id = a.doctor_id
GROUP BY d.dept_id, d.dept_name$$

-- ---- DOCTOR VIEWS (3) ----

CREATE VIEW vw_doctor_today_appointments AS
SELECT
    a.appointment_id, a.doctor_id, a.appointment_date, a.appointment_time,
    a.reason, a.status, a.appointment_type, a.notes,
    COALESCE(CONCAT(u.first_name,' ',u.last_name), a.guest_name) AS patient_name,
    COALESCE(u.phone, a.guest_phone)                              AS phone,
    p.patient_id, p.blood_group, p.allergies
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.patient_id
LEFT JOIN users u ON p.user_id = u.user_id
WHERE a.appointment_date = CURDATE()$$

CREATE VIEW vw_prescription_details AS
SELECT
    pr.prescription_id, pr.prescription_date, pr.status, pr.total_cost, pr.notes,
    pr.patient_id, pr.doctor_id,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
    CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
    pi.item_id, pi.dosage, pi.frequency, pi.duration, pi.quantity,
    m.medicine_name, m.dosage_form, m.strength, pi.unit_price, pi.total_price
FROM prescriptions pr
JOIN patients pat ON pr.patient_id = pat.patient_id
JOIN users pu ON pat.user_id = pu.user_id
JOIN staff s ON pr.doctor_id = s.staff_id
JOIN users du ON s.user_id = du.user_id
JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
JOIN medicines m ON pi.medicine_id = m.medicine_id$$

CREATE VIEW vw_medical_records_full AS
SELECT
    mr.record_id, mr.diagnosis, mr.symptoms, mr.treatment_plan,
    mr.follow_up_date, mr.notes, mr.created_at,
    p.patient_id, p.patient_code, p.blood_group,
    CONCAT(pu.first_name,' ',pu.last_name)               AS patient_name,
    pu.gender, pu.date_of_birth,
    TIMESTAMPDIFF(YEAR, pu.date_of_birth, CURDATE())     AS age,
    s.staff_id AS doctor_id,
    CONCAT(du.first_name,' ',du.last_name)               AS doctor_name,
    d.dept_name
FROM medical_records mr
JOIN patients p ON mr.patient_id = p.patient_id
JOIN users pu ON p.user_id = pu.user_id
JOIN staff s ON mr.doctor_id = s.staff_id
JOIN users du ON s.user_id = du.user_id
JOIN departments d ON s.dept_id = d.dept_id$$

-- ---- PHARMACIST VIEWS (3) ----

CREATE VIEW vw_pending_prescriptions AS
SELECT
    pr.prescription_id, pr.prescription_date, pr.total_cost, pr.notes,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
    CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
    COUNT(pi.item_id) AS total_items
FROM prescriptions pr
JOIN patients pat ON pr.patient_id = pat.patient_id
JOIN users pu ON pat.user_id = pu.user_id
JOIN staff s ON pr.doctor_id = s.staff_id
JOIN users du ON s.user_id = du.user_id
JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
WHERE pr.status = 'Pending'
GROUP BY pr.prescription_id, pr.prescription_date, pr.total_cost, pr.notes,
         pu.first_name, pu.last_name, du.first_name, du.last_name$$

CREATE VIEW vw_medicine_inventory AS
SELECT
    m.medicine_id, m.medicine_name, m.generic_name, m.brand,
    m.category, m.dosage_form, m.strength, m.unit_price,
    m.stock_quantity, m.reorder_level, m.expiry_date, m.manufacturer,
    CASE
        WHEN m.stock_quantity = 0                          THEN 'Out of Stock'
        WHEN m.stock_quantity <= m.reorder_level           THEN 'Low Stock'
        WHEN DATEDIFF(m.expiry_date, CURDATE()) <= 30      THEN 'Expiring Soon'
        ELSE 'Available'
    END AS stock_status,
    DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry
FROM medicines m WHERE m.is_active = TRUE$$

CREATE VIEW vw_medicine_stock_history AS
SELECT
    msl.log_id, msl.change_type, msl.quantity_changed,
    msl.quantity_before, msl.quantity_after, msl.reference_type,
    msl.reference_id, msl.notes, msl.logged_at,
    m.medicine_name, m.dosage_form,
    CONCAT(u.first_name,' ',u.last_name) AS logged_by_name
FROM medicine_stock_log msl
JOIN medicines m ON msl.medicine_id = m.medicine_id
LEFT JOIN users u ON msl.logged_by = u.user_id
ORDER BY msl.logged_at DESC$$

-- ---- RECEPTIONIST VIEWS (3) ----

CREATE VIEW vw_patient_bills AS
SELECT
    b.bill_id, b.bill_date, b.doctor_fees, b.medicine_cost, b.lab_cost,
    b.ward_cost, b.hospital_fees, b.discount, b.tax, b.total_amount,
    b.paid_amount, b.balance_amount, b.payment_status,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
    pat.patient_code, pu.phone,
    CONCAT(ru.first_name,' ',ru.last_name) AS receptionist_name
FROM bills b
JOIN patients pat ON b.patient_id = pat.patient_id
JOIN users pu ON pat.user_id = pu.user_id
LEFT JOIN staff rs ON b.receptionist_id = rs.staff_id
LEFT JOIN users ru ON rs.user_id = ru.user_id$$

CREATE VIEW vw_today_payments AS
SELECT
    p.payment_id, p.payment_date, p.amount, p.payment_method, p.transaction_reference,
    b.bill_id, b.total_amount, b.payment_status,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
    CONCAT(ru.first_name,' ',ru.last_name) AS received_by_name
FROM payments p
JOIN bills b ON p.bill_id = b.bill_id
JOIN patients pat ON b.patient_id = pat.patient_id
JOIN users pu ON pat.user_id = pu.user_id
LEFT JOIN staff rs ON p.received_by = rs.staff_id
LEFT JOIN users ru ON rs.user_id = ru.user_id
WHERE DATE(p.payment_date) = CURDATE()$$

CREATE VIEW vw_registered_patients AS
SELECT
    p.patient_id, p.patient_code, p.blood_group, p.registered_at,
    p.emergency_contact, p.emergency_contact_name, p.insurance_provider,
    u.first_name, u.last_name, u.email, u.phone, u.gender, u.date_of_birth, u.address,
    TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) AS age
FROM patients p JOIN users u ON p.user_id = u.user_id$$

-- ---- NURSE VIEWS (3) ----

CREATE VIEW vw_current_admissions AS
SELECT
    ad.admission_id, ad.admission_date, ad.reason_for_admission, ad.status,
    GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) AS days_admitted,
    p.patient_id, p.patient_code, p.blood_group,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pu.phone,
    w.ward_name, w.ward_type, b.bed_number,
    CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
    CONCAT(nu.first_name,' ',nu.last_name) AS nurse_name
FROM admissions ad
JOIN patients p ON ad.patient_id = p.patient_id
JOIN users pu ON p.user_id = pu.user_id
LEFT JOIN wards w ON ad.ward_id = w.ward_id
LEFT JOIN beds b ON ad.bed_id = b.bed_id
LEFT JOIN staff ds ON ad.doctor_id = ds.staff_id
LEFT JOIN users du ON ds.user_id = du.user_id
LEFT JOIN staff ns ON ad.nurse_id = ns.staff_id
LEFT JOIN users nu ON ns.user_id = nu.user_id
WHERE ad.status = 'Active'$$

CREATE VIEW vw_lab_tests_status AS
SELECT
    lr.lab_request_id, lr.request_date, lr.status, lr.priority,
    lr.sample_collected_at, lr.completed_at,
    CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
    p.patient_code,
    lt.test_name, lt.category, lt.price,
    res.result_value, res.remarks, res.is_abnormal, res.reported_at
FROM lab_requests lr
JOIN patients p ON lr.patient_id = p.patient_id
JOIN users pu ON p.user_id = pu.user_id
JOIN lab_tests lt ON lr.test_id = lt.test_id
LEFT JOIN lab_results res ON lr.lab_request_id = res.lab_request_id$$

CREATE VIEW vw_ward_bed_status AS
SELECT
    w.ward_id, w.ward_name, w.ward_type, w.total_beds, w.available_beds,
    w.floor_number, w.daily_rate,
    (w.total_beds - w.available_beds)                              AS occupied_beds,
    ROUND(((w.total_beds - w.available_beds)/w.total_beds)*100, 2) AS occupancy_rate,
    b.bed_id, b.bed_number, b.status AS bed_status,
    CONCAT(nu.first_name,' ',nu.last_name)                         AS nurse_in_charge_name
FROM wards w
LEFT JOIN beds b ON w.ward_id = b.ward_id
LEFT JOIN staff ns ON w.nurse_in_charge = ns.staff_id
LEFT JOIN users nu ON ns.user_id = nu.user_id$$

-- ============================================================
-- 6. TRIGGERS (9 total)
-- ============================================================

-- TRIGGER 1: Prevent double-booking (BEFORE INSERT on appointments)
CREATE TRIGGER trg_before_appointment_insert
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM appointments
    WHERE doctor_id = NEW.doctor_id
      AND appointment_date = NEW.appointment_date
      AND appointment_time = NEW.appointment_time
      AND status NOT IN ('Cancelled','No_Show');
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This time slot is already booked for this doctor';
    END IF;
END$$

-- TRIGGER 2: Auto-generate patient code (BEFORE INSERT on patients)
CREATE TRIGGER trg_before_patient_insert
BEFORE INSERT ON patients
FOR EACH ROW
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        SET NEW.patient_code = CONCAT('PAT', DATE_FORMAT(NOW(),'%Y%m'), LPAD(FLOOR(RAND()*99999),5,'0'));
    END IF;
END$$

-- TRIGGER 3: Mark bed occupied on new admission (AFTER INSERT on admissions)
CREATE TRIGGER trg_after_admission_insert
AFTER INSERT ON admissions
FOR EACH ROW
BEGIN
    IF NEW.bed_id IS NOT NULL THEN
        UPDATE beds SET status = 'Occupied' WHERE bed_id = NEW.bed_id;
        UPDATE wards SET available_beds = available_beds - 1 WHERE ward_id = NEW.ward_id;
    END IF;
END$$

-- TRIGGER 4: Free bed on discharge (AFTER UPDATE on admissions)
CREATE TRIGGER trg_after_admission_update
AFTER UPDATE ON admissions
FOR EACH ROW
BEGIN
    IF OLD.status = 'Active' AND NEW.status = 'Discharged' AND NEW.bed_id IS NOT NULL THEN
        UPDATE beds SET status = 'Available' WHERE bed_id = NEW.bed_id;
        UPDATE wards SET available_beds = available_beds + 1 WHERE ward_id = NEW.ward_id;
    END IF;
END$$

-- TRIGGER 5: Update prescription total when item added (AFTER INSERT on prescription_items)
CREATE TRIGGER trg_after_prescription_item_insert
AFTER INSERT ON prescription_items
FOR EACH ROW
BEGIN
    UPDATE prescriptions
    SET total_cost = (SELECT COALESCE(SUM(total_price),0) FROM prescription_items WHERE prescription_id = NEW.prescription_id)
    WHERE prescription_id = NEW.prescription_id;
END$$

-- TRIGGER 6: Auto-update bill balance after payment (AFTER INSERT on payments)
CREATE TRIGGER trg_after_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_total_paid DECIMAL(10,2);
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE bill_id = NEW.bill_id;

    UPDATE bills SET
        paid_amount    = v_total_paid,
        balance_amount = GREATEST(0, total_amount - v_total_paid),
        payment_status = CASE
            WHEN total_amount <= v_total_paid THEN 'Paid'
            WHEN v_total_paid > 0             THEN 'Partial'
            ELSE 'Pending'
        END
    WHERE bill_id = NEW.bill_id;
END$$

-- TRIGGER 7: Log appointment status changes (AFTER UPDATE on appointments)
CREATE TRIGGER trg_after_appointment_update
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs(action, table_name, record_id, old_value, new_value)
        VALUES('STATUS_CHANGE','appointments', NEW.appointment_id,
               JSON_OBJECT('status', OLD.status),
               JSON_OBJECT('status', NEW.status));
    END IF;
END$$

-- TRIGGER 8: Alert when medicine stock falls below reorder level (AFTER UPDATE on medicines)
CREATE TRIGGER trg_after_medicine_stock_update
AFTER UPDATE ON medicines
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity <= NEW.reorder_level AND OLD.stock_quantity > OLD.reorder_level THEN
        INSERT INTO audit_logs(action, table_name, record_id, old_value, new_value)
        VALUES('LOW_STOCK_ALERT','medicines', NEW.medicine_id,
               JSON_OBJECT('stock', OLD.stock_quantity),
               JSON_OBJECT('stock', NEW.stock_quantity, 'reorder_level', NEW.reorder_level));
    END IF;
END$$

-- TRIGGER 9: Set staff salary based on role (BEFORE INSERT on staff)
CREATE TRIGGER trg_before_staff_insert
BEFORE INSERT ON staff
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(20);
    SELECT role INTO v_role FROM users WHERE user_id = NEW.user_id;
    SET NEW.salary = CASE v_role
        WHEN 'doctor' THEN 150000
        WHEN 'nurse' THEN 75000
        WHEN 'receptionist' THEN 65000
        WHEN 'pharmacist' THEN 100000
        ELSE NEW.salary
    END;
END$$

DELIMITER ;

-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- Departments
INSERT INTO departments (dept_name, description) VALUES
('General Medicine',  'General medical treatment and consultation'),
('Cardiology',        'Heart and cardiovascular diseases'),
('Dermatology',       'Skin, hair, and nail disorders'),
('Neurology',         'Brain and nervous system disorders'),
('Orthopedics',       'Bone, joint, and muscle conditions'),
('Pediatrics',        'Medical care for children'),
('Gynecology',        'Women health and reproductive system'),
('Ophthalmology',     'Eye care and vision disorders'),
('Dentistry',         'Dental care and oral health'),
('Pharmacy',          'Medicine dispensing and management'),
('Laboratory',        'Diagnostic lab tests and analysis'),
('Administration',    'Hospital administration');

-- ---- ADMIN USER ----
-- Password: Admin@123  (bcrypt hash)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth) VALUES
('admin', 'admin@hospital.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'admin', 'Super', 'Admin', '0771234567', 'Male', '1980-01-15');

INSERT INTO staff (user_id, dept_id, employee_id, qualification, joining_date, salary, shift)
VALUES (1, 12, 'ADM00001', 'MBA Healthcare Management', '2020-01-01', 150000.00, 'Flexible');

-- ---- DOCTOR USERS ----
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth) VALUES
('dr_silva',       'dr.silva@hospital.com',       '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Rajiv',  'Silva',       '0777890123', 'Male',   '1978-03-22'),
('dr_perera',      'dr.perera@hospital.com',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Amara',  'Perera',      '0778901234', 'Female', '1982-07-15'),
('dr_fernando',    'dr.fernando@hospital.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Nimal',  'Fernando',    '0779012345', 'Male',   '1975-11-05'),
('dr_jayawardena', 'dr.jayawardena@hospital.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Dilani', 'Jayawardena', '0771123456', 'Female', '1985-05-18'),
('dr_bandara',     'dr.bandara@hospital.com',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Suresh', 'Bandara',     '0772234567', 'Male',   '1979-09-30');

INSERT INTO staff (user_id, dept_id, employee_id, qualification, specialization, experience_years, joining_date, salary) VALUES
(2, 2, 'DOC00002', 'MBBS, MD Cardiology',      'Cardiologist',         15, '2010-03-01', 200000.00),
(3, 3, 'DOC00003', 'MBBS, MD Dermatology',     'Dermatologist',        12, '2012-06-01', 180000.00),
(4, 4, 'DOC00004', 'MBBS, MD Neurology',       'Neurologist',          18, '2008-01-15', 220000.00),
(5, 5, 'DOC00005', 'MBBS, MS Orthopedics',     'Orthopedic Surgeon',   14, '2011-08-01', 210000.00),
(6, 1, 'DOC00006', 'MBBS, MD General Medicine','General Physician',    10, '2014-01-01', 170000.00);

-- ---- PHARMACIST ----
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth) VALUES
('pharm_kumar', 'pharmacist@hospital.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'pharmacist', 'Kamal', 'Kumar', '0773345678', 'Male', '1990-04-12');

INSERT INTO staff (user_id, dept_id, employee_id, qualification, specialization, experience_years, joining_date, salary)
VALUES (7, 10, 'PHA00007', 'B.Pharm', 'Clinical Pharmacist', 8, '2016-02-01', 100000.00);

-- ---- RECEPTIONIST ----
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth) VALUES
('recep_saman', 'receptionist@hospital.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'receptionist', 'Saman', 'Wickrama', '0774456789', 'Male', '1995-08-20');

INSERT INTO staff (user_id, dept_id, employee_id, qualification, joining_date, salary)
VALUES (8, 12, 'REC00008', 'Diploma in Hospital Administration', '2018-05-01', 80000.00);

-- ---- NURSE ----
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth) VALUES
('nurse_mala', 'nurse@hospital.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'nurse', 'Mala', 'Ranasinghe', '0775567890', 'Female', '1993-12-08');

INSERT INTO staff (user_id, dept_id, employee_id, qualification, joining_date, salary)
VALUES (9, 1, 'NUR00009', 'BSc Nursing', '2019-03-01', 90000.00);

-- ---- PATIENT USERS ----
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth, address) VALUES
('patient_john',  'john@email.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'patient', 'John',  'Doe',     '0776678901', 'Male',   '1990-06-15', '123 Main St, Colombo'),
('patient_mary',  'mary@email.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'patient', 'Mary',  'Smith',   '0777789012', 'Female', '1985-09-22', '456 Park Ave, Kandy'),
('patient_david', 'david@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'patient', 'David', 'Johnson', '0778890123', 'Male',   '1975-03-10', '789 Lake Rd, Galle');

INSERT INTO patients (user_id, patient_code, blood_group, emergency_contact, emergency_contact_name, allergies) VALUES
(10, 'PAT000001', 'O+', '0776000001', 'Jane Doe',   'Penicillin'),
(11, 'PAT000002', 'A+', '0776000002', 'Tom Smith',  NULL),
(12, 'PAT000003', 'B-', '0776000003', 'Lisa Johnson','Aspirin, Sulfa drugs');

-- Wards
INSERT INTO wards (ward_name, ward_type, total_beds, available_beds, floor_number, nurse_in_charge, daily_rate) VALUES
('Ward A - General',  'General',     20, 20, 1, 9, 5000.00),
('ICU',               'ICU',         10, 10, 2, 9, 25000.00),
('Ward B - Pediatric','Pediatric',   15, 15, 1, 9, 8000.00),
('Ward C - Private',  'Private',     10, 10, 3, 9, 15000.00),
('Maternity Ward',    'Maternity',   12, 12, 2, 9, 10000.00);

-- Beds (Ward A - General)
INSERT INTO beds (ward_id, bed_number, status) VALUES
(1,'A-01','Available'),(1,'A-02','Available'),(1,'A-03','Available'),(1,'A-04','Available'),
(1,'A-05','Available'),(1,'A-06','Available'),(1,'A-07','Available'),(1,'A-08','Available'),
(1,'A-09','Available'),(1,'A-10','Available'),
-- ICU
(2,'ICU-01','Available'),(2,'ICU-02','Available'),(2,'ICU-03','Available'),(2,'ICU-04','Available'),(2,'ICU-05','Available'),
-- Private
(4,'PVT-01','Available'),(4,'PVT-02','Available'),(4,'PVT-03','Available'),(4,'PVT-04','Available'),(4,'PVT-05','Available');

-- Doctor Schedules
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_appointments) VALUES
-- Dr. Silva (Cardiologist, staff_id=2)
(2,'Monday',   '09:00:00','17:00:00',20),
(2,'Wednesday','09:00:00','17:00:00',20),
(2,'Friday',   '09:00:00','13:00:00',10),
-- Dr. Perera (Dermatologist, staff_id=3)
(3,'Tuesday',  '08:00:00','16:00:00',20),
(3,'Thursday', '08:00:00','16:00:00',20),
(3,'Saturday', '09:00:00','13:00:00',10),
-- Dr. Fernando (Neurologist, staff_id=4)
(4,'Monday',   '10:00:00','18:00:00',15),
(4,'Thursday', '10:00:00','18:00:00',15),
-- Dr. Jayawardena (Orthopedic, staff_id=5)
(5,'Tuesday',  '09:00:00','17:00:00',20),
(5,'Friday',   '09:00:00','17:00:00',20),
-- Dr. Bandara (General, staff_id=6)
(6,'Monday',   '08:00:00','20:00:00',30),
(6,'Tuesday',  '08:00:00','20:00:00',30),
(6,'Wednesday','08:00:00','20:00:00',30),
(6,'Thursday', '08:00:00','20:00:00',30),
(6,'Friday',   '08:00:00','20:00:00',30);

-- Medicines
INSERT INTO medicines (medicine_name, generic_name, brand, category, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, manufacturer) VALUES
('Paracetamol 500mg',   'Paracetamol',     'Calpol',      'Analgesic',        'Tablet',  '500mg',     5.00,   1000,  100, '2027-12-31', 'GSK'),
('Amoxicillin 250mg',   'Amoxicillin',     'Amoxil',      'Antibiotic',       'Capsule', '250mg',    15.00,    500,   50, '2026-06-30', 'Pfizer'),
('Metformin 500mg',     'Metformin HCl',   'Glucophage',  'Antidiabetic',     'Tablet',  '500mg',    12.00,    800,   80, '2027-03-31', 'Merck'),
('Amlodipine 5mg',      'Amlodipine',      'Norvasc',     'Antihypertensive', 'Tablet',  '5mg',      20.00,    600,   60, '2027-08-31', 'Pfizer'),
('Atorvastatin 10mg',   'Atorvastatin',    'Lipitor',     'Statin',           'Tablet',  '10mg',     25.00,    400,   40, '2027-01-31', 'Pfizer'),
('Omeprazole 20mg',     'Omeprazole',      'Prilosec',    'PPI',              'Capsule', '20mg',     18.00,    700,   70, '2026-09-30', 'AstraZeneca'),
('Cetirizine 10mg',     'Cetirizine HCl',  'Zyrtec',      'Antihistamine',    'Tablet',  '10mg',      8.00,    900,   90, '2027-05-31', 'UCB'),
('Ibuprofen 400mg',     'Ibuprofen',       'Brufen',      'NSAID',            'Tablet',  '400mg',    10.00,    750,   75, '2026-12-31', 'Abbott'),
('Salbutamol Inhaler',  'Salbutamol',      'Ventolin',    'Bronchodilator',   'Inhaler', '100mcg',  350.00,    200,   20, '2026-08-31', 'GSK'),
('Insulin Regular',     'Human Insulin',   'Humulin R',   'Antidiabetic',     'Injection','100IU/mL',800.00,   100,   20, '2026-04-30', 'Lilly'),
('Diclofenac Gel',      'Diclofenac',      'Voltaren',    'Topical NSAID',    'Cream',   '1%',      150.00,    300,   30, '2027-07-31', 'Novartis'),
('Azithromycin 500mg',  'Azithromycin',    'Zithromax',   'Antibiotic',       'Tablet',  '500mg',    45.00,    250,   25, '2026-11-30', 'Pfizer'),
('Hydrocortisone Cream','Hydrocortisone',  'Cortaid',     'Corticosteroid',   'Cream',   '1%',      120.00,    200,   20, '2027-02-28', 'J&J'),
('Vitamin D3 1000IU',   'Cholecalciferol', 'D-Vita',      'Supplement',       'Tablet',  '1000IU',   30.00,    500,   50, '2027-10-31', 'HealthMark'),
('Pantoprazole 40mg',   'Pantoprazole',    'Protonix',    'PPI',              'Tablet',  '40mg',     22.00,    400,   40, '2027-04-30', 'Wyeth');

-- Lab Tests
INSERT INTO lab_tests (test_name, category, description, normal_range, unit, price, turnaround_hours) VALUES
('Complete Blood Count (CBC)', 'Hematology',    'Full blood count analysis',             'Various',              'cells/μL', 800.00,  4),
('Blood Sugar Fasting',         'Biochemistry',  'Fasting blood glucose level',           '70-100',               'mg/dL',    300.00,  2),
('Lipid Profile',               'Biochemistry',  'Cholesterol and triglycerides',         'Various',              'mg/dL',   1200.00,  6),
('Liver Function Test',         'Biochemistry',  'Liver enzyme levels',                   'Various',              'U/L',     1500.00,  6),
('Kidney Function Test',        'Biochemistry',  'Renal function assessment',             'Various',              'mg/dL',   1400.00,  6),
('Thyroid Function Test',       'Endocrinology', 'Thyroid hormone levels',                'Various',              'mIU/L',   1800.00,  8),
('Urine Analysis',              'Microbiology',  'Complete urine examination',            'Various',              '-',        400.00,  3),
('ECG',                         'Cardiology',    'Heart electrical activity',             'Normal sinus rhythm',  '-',       1000.00,  1),
('Chest X-Ray',                 'Radiology',     'Chest imaging for lung and heart',      'Clear lungs',          '-',       1500.00,  2),
('HbA1c',                       'Biochemistry',  'Average blood sugar over 3 months',     '<5.7%',                '%',       1600.00,  4),
('COVID-19 PCR',                'Microbiology',  'SARS-CoV-2 detection',                  'Negative',             '-',       3500.00, 24),
('Blood Culture',               'Microbiology',  'Detect bacteria in blood',              'No growth',            '-',       2500.00, 48),
('Dengue NS1 Antigen',          'Serology',      'Dengue fever early detection',          'Negative',             '-',       2000.00,  4),
('Urine Culture',               'Microbiology',  'Detect urinary tract infection',        'No growth',            '-',       1800.00, 48),
('Vitamin B12',                 'Biochemistry',  'B12 deficiency screening',              '200-900',              'pg/mL',   2200.00,  8);

-- Sample Appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, appointment_type) VALUES
(1, 2, CURDATE(), '09:00:00', 'Chest pain and shortness of breath', 'Confirmed', 'Online'),
(2, 3, CURDATE(), '08:00:00', 'Skin rash and itching',              'Confirmed', 'Walk-in'),
(3, 6, CURDATE(), '10:00:00', 'Fever and headache',                 'Confirmed', 'Online'),
(1, 6, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00', 'Follow-up visit',       'Confirmed', 'Online'),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', 'Hypertension checkup',  'Confirmed','Online');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
SELECT 'Hospital Management System Database Created Successfully!' AS Status;
SELECT COUNT(*) AS total_users        FROM users;
SELECT COUNT(*) AS total_staff        FROM staff;
SELECT COUNT(*) AS total_patients     FROM patients;
SELECT COUNT(*) AS total_departments  FROM departments;
SELECT COUNT(*) AS total_medicines    FROM medicines;
SELECT COUNT(*) AS total_lab_tests    FROM lab_tests;
SELECT COUNT(*) AS total_appointments FROM appointments;

-- Verification of Role-Based Performance Indexes
SELECT 'Role-Based Indexes Created:' AS Index_Verification;
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'hospital_db' AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
