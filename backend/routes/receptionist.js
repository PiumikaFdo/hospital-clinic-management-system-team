const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/receptionist/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const [[{ today_reg }]] = await pool.query('SELECT fn_today_registrations() AS today_reg');
    const [[{ pending_bills }]] = await pool.query("SELECT COUNT(*) AS pending_bills FROM bills WHERE payment_status='Pending'");
    const [[{ today_payments }]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS today_payments FROM payments WHERE DATE(payment_date)=CURDATE()');
    const [[{ active_admissions }]] = await pool.query("SELECT COUNT(*) AS active_admissions FROM admissions WHERE status='Active'");
    const [recent_patients] = await pool.query('SELECT * FROM vw_registered_patients ORDER BY registered_at DESC LIMIT 5');
    const [pending_bills_list] = await pool.query('SELECT * FROM vw_patient_bills WHERE payment_status=\'Pending\' ORDER BY bill_date DESC LIMIT 5');
    res.json({
      success: true,
      data: { today_registrations: today_reg, pending_bills, today_total_payments: today_payments, active_admissions, recent_patients, pending_bills_list }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/patients (utilizes idx_reception_patients_reg_date)
router.get('/patients', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { search, date, start_date, end_date } = req.query;
    let q = 'SELECT * FROM vw_registered_patients WHERE 1=1';
    const params = [];
    if (date) { q += ' AND DATE(registered_at) = ?'; params.push(date); }
    if (start_date) { q += ' AND DATE(registered_at) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(registered_at) <= ?'; params.push(end_date); }
    if (search) {
      q += ' AND (first_name LIKE ? OR last_name LIKE ? OR patient_code LIKE ? OR phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s,s,s,s);
    }
    q += ' ORDER BY registered_at DESC';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/patients (Register patient + book appointment)
router.post('/patients', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, gender, date_of_birth, blood_group, address, doctor_id, appt_date, appt_time, reason } = req.body;

    // Convert empty strings to null for optional integer/date fields
    const doctorId   = (doctor_id   && doctor_id   !== '') ? parseInt(doctor_id, 10) : null;
    const apptDate   = (appt_date   && appt_date   !== '') ? appt_date   : null;
    const apptTime   = (appt_time   && appt_time   !== '') ? appt_time   : null;
    const apptReason = (reason      && reason      !== '') ? reason      : null;

    await pool.query('CALL sp_register_patient_appointment(?,?,?,?,?,?,?,?,?,?,?,?,@pid,@aid)',
      [first_name, last_name, email, phone, gender, date_of_birth || null, blood_group, address, doctorId, apptDate, apptTime, apptReason]);
    const [[ids]] = await pool.query('SELECT @pid AS patient_id, @aid AS appointment_id');
    res.status(201).json({ success: true, message: 'Patient registered and appointment booked', data: ids });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Registration failed' });
  }
});

// POST /api/receptionist/bills  (Generate bill)
router.post('/bills', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { patient_id, appointment_id, admission_id, doctor_fees, hospital_fees, discount, tax_rate } = req.body;
    await pool.query('CALL sp_generate_bill(?,?,?,?,?,?,?,?,@bid)',
      [patient_id, req.user.staff_id, appointment_id || null, admission_id || null, doctor_fees, hospital_fees, discount || 0, tax_rate || 0]);
    const [[{ bid }]] = await pool.query('SELECT @bid AS bid');
    res.status(201).json({ success: true, message: 'Bill generated', bill_id: bid });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || 'Bill generation failed' });
  }
});

// GET /api/receptionist/bills (utilizes idx_reception_bills_patient_status and idx_reception_bills_status_date)
router.get('/bills', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { status, patient_id, start_date, end_date, search } = req.query;
    let q = 'SELECT * FROM vw_patient_bills WHERE 1=1';
    const params = [];
    if (status && status !== 'ALL') { q += ' AND payment_status=?'; params.push(status); }
    if (patient_id) { q += ' AND patient_id=?'; params.push(patient_id); }
    if (start_date) { q += ' AND DATE(bill_date) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(bill_date) <= ?'; params.push(end_date); }
    if (search) {
      q += ' AND (patient_name LIKE ? OR patient_code LIKE ? OR phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    q += ' ORDER BY bill_date DESC';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/bills/:id
router.get('/bills/:id', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const [bills] = await pool.query('SELECT * FROM vw_patient_bills WHERE bill_id=?', [req.params.id]);
    const [payments] = await pool.query('SELECT * FROM payments WHERE bill_id=? ORDER BY payment_date', [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: { bill: bills[0], payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/payments  (Process payment)
router.post('/payments', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { bill_id, amount, payment_method, transaction_reference } = req.body;
    await pool.query('CALL sp_process_payment(?,?,?,?,?)',
      [bill_id, amount, payment_method, transaction_reference || null, req.user.staff_id]);
    res.json({ success: true, message: 'Payment processed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || 'Payment failed' });
  }
});

// GET /api/receptionist/payments (utilizes idx_reception_payments_date_method)
router.get('/payments', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { payment_method, date, start_date, end_date, limit } = req.query;
    let q = `
      SELECT p.*, b.total_amount, b.balance_amount, b.payment_status,
             CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pat.patient_code,
             CONCAT(ru.first_name,' ',ru.last_name) AS received_by_name
      FROM payments p
      JOIN bills b ON p.bill_id = b.bill_id
      JOIN patients pat ON b.patient_id = pat.patient_id
      JOIN users pu ON pat.user_id = pu.user_id
      LEFT JOIN staff rs ON p.received_by = rs.staff_id
      LEFT JOIN users ru ON rs.user_id = ru.user_id
      WHERE 1=1
    `;
    const params = [];
    if (payment_method && payment_method !== 'ALL') { q += ' AND p.payment_method = ?'; params.push(payment_method); }
    if (date) { q += ' AND DATE(p.payment_date) = ?'; params.push(date); }
    if (start_date) { q += ' AND DATE(p.payment_date) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(p.payment_date) <= ?'; params.push(end_date); }
    q += ' ORDER BY p.payment_date DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/payments/today
router.get('/payments/today', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_today_payments ORDER BY payment_date DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/nurses (Fetch active nurses for duty assignment)
router.get('/nurses', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.staff_id, CONCAT(u.first_name, ' ', u.last_name) AS nurse_name, u.phone
      FROM staff s
      JOIN users u ON s.user_id = u.user_id
      WHERE u.role = 'nurse' AND s.status = 'Active' AND u.is_active = 1
      ORDER BY u.first_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/admissions  (Admit patient from receptionist)
router.post('/admissions', authenticateToken, authorizeRoles('receptionist','nurse'), async (req, res) => {
  try {
    const { patient_id, ward_id, doctor_id, nurse_id, reason } = req.body;
    const pid = patient_id ? parseInt(patient_id, 10) : null;
    const wid = ward_id ? parseInt(ward_id, 10) : null;
    const did = doctor_id ? parseInt(doctor_id, 10) : null;
    const nid = (nurse_id !== undefined && nurse_id !== null && nurse_id !== '') ? parseInt(nurse_id, 10) : null;

    if (!pid || !wid || !did) {
      return res.status(400).json({ success: false, message: 'Patient, ward, and doctor are required' });
    }

    await pool.query('CALL sp_admit_patient(?,?,?,?,?,@aid,@bid)',
      [pid, wid, did, nid, reason || '']);
    const [[ids]] = await pool.query('SELECT @aid AS admission_id, @bid AS bed_id');
    res.status(201).json({ success: true, message: 'Patient admitted successfully', data: ids });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Admission failed' });
  }
});

// GET /api/receptionist/wards
router.get('/wards', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM wards ORDER BY ward_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
