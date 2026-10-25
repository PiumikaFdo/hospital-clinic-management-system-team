const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/nurse/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('nurse'), async (req, res) => {
  try {
    const [[{ active_admissions }]] = await pool.query("SELECT COUNT(*) AS active_admissions FROM admissions WHERE status='Active'");
    const [[{ pending_labs }]] = await pool.query("SELECT COUNT(*) AS pending_labs FROM lab_requests WHERE status NOT IN ('Completed','Cancelled')");
    const [[{ available_beds }]] = await pool.query("SELECT SUM(available_beds) AS available_beds FROM wards");
    const [admissions] = await pool.query('SELECT * FROM vw_current_admissions LIMIT 10');
    const [labs] = await pool.query(`
      SELECT
        lr.lab_request_id, lr.patient_id, lr.request_date, lr.status, lr.priority,
        lr.sample_collected_at, lr.completed_at, lr.notes,
        lr.guest_name, lr.guest_phone, lr.guest_email,
        COALESCE(NULLIF(CONCAT_WS(' ', pu.first_name, pu.last_name), ''), lr.guest_name, 'Walk-in Patient') AS patient_name,
        p.patient_code,
        lt.test_name, lt.category, lt.price, lt.normal_range, lt.unit
      FROM lab_requests lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users pu ON p.user_id = pu.user_id
      JOIN lab_tests lt ON lr.test_id = lt.test_id
      WHERE lr.status NOT IN ('Completed', 'Cancelled')
      ORDER BY lr.request_date DESC
      LIMIT 10
    `);
    const [beds] = await pool.query('SELECT * FROM vw_ward_bed_status WHERE bed_status=\'Available\'');
    res.json({
      success: true,
      data: { active_admissions, pending_labs, available_beds, recent_admissions: admissions, pending_lab_tests: labs, available_beds_list: beds }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/nurse/admissions (utilizes idx_nurse_admissions_status_date)
router.get('/admissions', authenticateToken, authorizeRoles('nurse','admin'), async (req, res) => {
  try {
    const { status, start_date, end_date, search } = req.query;
    let query = `
      SELECT
        ad.admission_id, ad.admission_date, ad.discharge_date, ad.reason_for_admission,
        ad.diagnosis_at_discharge, ad.status, ad.notes,
        DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date) AS days_admitted,
        p.patient_id, p.patient_code, p.blood_group,
        CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pu.phone,
        w.ward_id, w.ward_name, w.ward_type, b.bed_id, b.bed_number,
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
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'All' && status !== 'ALL') {
      query += ' AND ad.status = ?';
      params.push(status);
    }
    if (start_date) {
      query += ' AND DATE(ad.admission_date) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(ad.admission_date) <= ?';
      params.push(end_date);
    }
    if (search) {
      query += ' AND (pu.first_name LIKE ? OR pu.last_name LIKE ? OR p.patient_code LIKE ? OR w.ward_name LIKE ? OR b.bed_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    query += ' ORDER BY ad.admission_date DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/nurse/admissions  (Admit patient and reserve bed)
router.post('/admissions', authenticateToken, authorizeRoles('nurse','receptionist'), async (req, res) => {
  try {
    const { patient_id, ward_id, doctor_id, nurse_id, reason } = req.body;
    const pid = patient_id ? parseInt(patient_id, 10) : null;
    const wid = ward_id ? parseInt(ward_id, 10) : null;
    const did = doctor_id ? parseInt(doctor_id, 10) : null;
    const nid = (nurse_id !== undefined && nurse_id !== null && nurse_id !== '')
      ? parseInt(nurse_id, 10)
      : (req.user.staff_id ? parseInt(req.user.staff_id, 10) : null);

    if (!pid || !wid || !did) {
      return res.status(400).json({ success: false, message: 'Patient, ward, and doctor are required' });
    }

    await pool.query('CALL sp_admit_patient(?,?,?,?,?,@aid,@bid)',
      [pid, wid, did, nid, reason || '']);
    const [[ids]] = await pool.query('SELECT @aid AS admission_id, @bid AS bed_id');
    res.status(201).json({ success: true, message: 'Patient admitted and bed reserved', data: ids });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Admission failed' });
  }
});

// PUT /api/nurse/admissions/:id/discharge
router.put('/admissions/:id/discharge', authenticateToken, authorizeRoles('nurse','admin'), async (req, res) => {
  try {
    const { diagnosis_at_discharge, notes } = req.body;
    await pool.query(
      "UPDATE admissions SET status='Discharged', discharge_date=NOW(), diagnosis_at_discharge=?, notes=? WHERE admission_id=?",
      [diagnosis_at_discharge, notes, req.params.id]
    );
    res.json({ success: true, message: 'Patient discharged successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/nurse/wards (utilizes idx_nurse_beds_ward_status)
router.get('/wards', authenticateToken, authorizeRoles('nurse','admin','receptionist'), async (req, res) => {
  try {
    const { ward_id, status } = req.query;
    let query = 'SELECT * FROM vw_ward_bed_status WHERE 1=1';
    const params = [];
    if (ward_id && ward_id !== 'All' && ward_id !== 'ALL') { query += ' AND ward_id = ?'; params.push(ward_id); }
    if (status && status !== 'All' && status !== 'ALL') { query += ' AND bed_status = ?'; params.push(status); }
    query += ' ORDER BY ward_name, bed_number';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/nurse/beds/:id/status (update bed status)
router.put('/beds/:id/status', authenticateToken, authorizeRoles('nurse','admin'), async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE beds SET status=? WHERE bed_id=?', [status, req.params.id]);
    res.json({ success: true, message: 'Bed status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/nurse/lab-tests (available tests list - public)
router.get('/lab-tests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lab_tests WHERE is_active=1 ORDER BY category, test_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/nurse/lab-requests (utilizes idx_nurse_lab_requests_status_prio_date and idx_nurse_lab_requests_patient_status)
router.get('/lab-requests', authenticateToken, authorizeRoles('nurse','admin','doctor'), async (req, res) => {
  try {
    const { status, priority, patient_id, start_date, end_date, search } = req.query;
    let q = 'SELECT * FROM vw_lab_tests_status WHERE 1=1';
    const params = [];
    if (status && status !== 'All' && status !== 'ALL') { q += ' AND status=?'; params.push(status); }
    if (priority && priority !== 'All' && priority !== 'ALL') { q += ' AND priority=?'; params.push(priority); }
    if (patient_id) { q += ' AND patient_id=?'; params.push(patient_id); }
    if (start_date) { q += ' AND DATE(request_date) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(request_date) <= ?'; params.push(end_date); }
    if (search) {
      q += ' AND (patient_name LIKE ? OR test_name LIKE ? OR patient_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    q += ' ORDER BY request_date DESC';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/nurse/lab-requests (Request lab test - supports both staff and guest/public bookings)
router.post('/lab-requests', async (req, res, next) => {
  // Public bookings can still carry a JWT when the visitor is already signed in.
  if (req.body.guest_name !== undefined) {
    try {
      const { patient_id, test_id, guest_name, guest_phone, guest_email, notes } = req.body;

      const cleanName  = String(guest_name || '').trim().replace(/\s+/g, ' ');
      const cleanPhone = String(guest_phone || '').replace(/[\s-]/g, '');
      const cleanEmail = String(guest_email || '').trim();
      const cleanNotes = String(notes || '').trim();

      if (!test_id) {
        return res.status(400).json({ success: false, message: 'Please select a diagnostic laboratory test.' });
      }
      if (!cleanName || cleanName.length < 3 || cleanName.length > 100 || !/^[A-Za-z\s.'-]+$/.test(cleanName)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid patient full name (3–100 letters).' });
      }
      if (!/^(?:07\d{8}|\+947\d{8})$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Sri Lankan mobile number (e.g. 0771234567).' });
      }
      if (cleanEmail && (cleanEmail.length > 100 || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail))) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }
      if (cleanNotes && (cleanNotes.length < 3 || cleanNotes.length > 500)) {
        return res.status(400).json({ success: false, message: 'Special instructions must be between 3 and 500 characters if provided.' });
      }

      // Check if patient already exists in patients table
      const [patients] = await pool.query(
        `SELECT p.patient_id, p.patient_code,
                TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS full_name,
                u.email, u.phone
         FROM patients p
         JOIN users u ON p.user_id = u.user_id`
      );

      const byId    = patient_id ? patients.find(p => Number(p.patient_id) === Number(patient_id)) : null;
      const byEmail = cleanEmail ? patients.find(p => (p.email || '').toLowerCase() === cleanEmail.toLowerCase()) : null;
      const byPhone = patients.find(p => (p.phone || '').replace(/[\s-]/g, '') === cleanPhone);
      const byName  = patients.find(p => (p.full_name || '').toLowerCase() === cleanName.toLowerCase());

      // If email or phone matches an existing patient_id, ensure the entered name belongs to that patient_id
      if (byEmail && byEmail.full_name.toLowerCase() !== cleanName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Patient name "${cleanName}" does not match the registered name "${byEmail.full_name}" for Patient ID #${byEmail.patient_id} (${byEmail.email}).`
        });
      }
      if (byPhone && byPhone.full_name.toLowerCase() !== cleanName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Patient name "${cleanName}" does not match the registered name "${byPhone.full_name}" for Patient ID #${byPhone.patient_id}.`
        });
      }
      if (byId && byId.full_name.toLowerCase() !== cleanName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Patient name "${cleanName}" does not match the registered name "${byId.full_name}" for Patient ID #${byId.patient_id}.`
        });
      }

      let matchedPatient = byId || byEmail || byPhone || byName;

      // If the patient was not registered beforehand, automatically create a patient record so patient_id is populated
      if (!matchedPatient) {
        const nameParts = cleanName.split(' ');
        const firstName = nameParts[0];
        const lastName  = nameParts.slice(1).join(' ') || '';
        const suffix    = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
        const username  = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'patient'}_${suffix}`;
        const emailToUse = cleanEmail || `${username}@guest.medicare.local`;
        const defaultHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

        const [userRes] = await pool.query(
          `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone)
           VALUES (?, ?, ?, 'patient', ?, ?, ?)`,
          [username, emailToUse, defaultHash, firstName, lastName, cleanPhone]
        );
        const newUserId = userRes.insertId;
        const patientCode = `PAT${String(newUserId).padStart(6, '0')}`;
        const [patRes] = await pool.query(
          `INSERT INTO patients (user_id, patient_code) VALUES (?, ?)`,
          [newUserId, patientCode]
        );

        matchedPatient = {
          patient_id: patRes.insertId,
          patient_code: patientCode,
          full_name: cleanName,
          email: cleanEmail || null,
          phone: cleanPhone
        };
      }

      const [result] = await pool.query(
        'INSERT INTO lab_requests (patient_id, test_id, guest_name, guest_phone, guest_email, notes, priority) VALUES (?, ?, ?, ?, ?, ?, "Normal")',
        [
          matchedPatient.patient_id,
          test_id,
          matchedPatient.full_name,
          cleanPhone,
          cleanEmail || matchedPatient.email || null,
          cleanNotes || null
        ]
      );
      return res.status(201).json({
        success: true,
        message: 'Lab test booked successfully',
        request_id: result.insertId,
        patient_id: matchedPatient.patient_id,
        patient_name: matchedPatient.full_name
      });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ success: false, message: err.sqlMessage || 'Booking failed' });
    }
  }
  // Otherwise, use authenticateToken and authorizeRoles
  authenticateToken(req, res, () => {
    authorizeRoles('nurse', 'doctor', 'admin')(req, res, async () => {
      try {
        const { patient_id, test_id, priority, notes } = req.body;
        await pool.query('CALL sp_request_lab_test(?,?,?,?,?,@rid)',
          [patient_id, req.user.staff_id || null, test_id, priority || 'Normal', notes || null]);
        const [[{ rid }]] = await pool.query('SELECT @rid AS rid');
        res.status(201).json({ success: true, message: 'Lab test requested', request_id: rid });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
  });
});

// POST /api/nurse/lab-requests/:id/result  (Enter lab results)
router.post('/lab-requests/:id/result', authenticateToken, authorizeRoles('nurse'), async (req, res) => {
  try {
    const { result_value, remarks, is_abnormal } = req.body;
    await pool.query('CALL sp_enter_lab_result(?,?,?,?,?)',
      [req.params.id, result_value, remarks, is_abnormal || false, req.user.staff_id]);
    res.json({ success: true, message: 'Lab result entered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// PUT /api/nurse/lab-requests/:id/status
router.put('/lab-requests/:id/status', authenticateToken, authorizeRoles('nurse'), async (req, res) => {
  try {
    const { status } = req.body;
    let q = 'UPDATE lab_requests SET status=?';
    const params = [status];
    if (status === 'Sample_Collected') { q += ', sample_collected_at=NOW()'; }
    q += ' WHERE lab_request_id=?';
    params.push(req.params.id);
    await pool.query(q, params);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/nurse/patients/:id/pending-labs
router.get('/patients/:id/pending-labs', authenticateToken, authorizeRoles('nurse'), async (req, res) => {
  try {
    const [[{ count }]] = await pool.query('SELECT fn_pending_lab_tests(?) AS count', [req.params.id]);
    const [rows] = await pool.query('SELECT * FROM vw_lab_tests_status WHERE patient_id=? AND status NOT IN (\'Completed\',\'Cancelled\')', [req.params.id]);
    res.json({ success: true, data: { pending_count: count, tests: rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
