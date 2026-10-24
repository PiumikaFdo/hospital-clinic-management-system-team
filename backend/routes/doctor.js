const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/doctor/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { staff_id } = req.user;
    const [[{ total }]] = await pool.query('SELECT fn_doctor_appointment_count(?,?) AS total', [staff_id, 'ALL']);
    const [[{ today_count }]] = await pool.query(
      'SELECT COUNT(*) AS today_count FROM appointments WHERE doctor_id=? AND appointment_date=CURDATE()', [staff_id]
    );
    const [[{ presc_count }]] = await pool.query('SELECT fn_doctor_prescription_count(?) AS presc_count', [staff_id]);
    const [today_appts] = await pool.query('SELECT * FROM vw_doctor_today_appointments WHERE doctor_id=?', [staff_id]);
    res.json({ success: true, data: { total_appointments: total, today_appointments: today_count, prescriptions_written: presc_count, today_list: today_appts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctor/appointments (utilizes idx_doctor_appointments_doc_date_status)
router.get('/appointments', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { date, start_date, end_date, status, search } = req.query;
    let query = `
      SELECT
        a.appointment_id, a.appointment_date, a.appointment_time,
        a.status, a.reason, a.appointment_type, a.notes,
        COALESCE(CONCAT(u.first_name,' ',u.last_name), a.guest_name) AS patient_name,
        COALESCE(u.phone, a.guest_phone) AS phone,
        p.patient_id, p.blood_group,
        fn_get_patient_age(p.patient_id) AS age
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE a.doctor_id = ?
    `;
    const params = [req.user.staff_id];
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    if (start_date) { query += ' AND a.appointment_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.appointment_date <= ?'; params.push(end_date); }
    if (status && status !== 'ALL') { query += ' AND a.status = ?'; params.push(status); }
    if (search) {
      query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR a.guest_name LIKE ? OR u.phone LIKE ? OR a.reason LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    query += ' ORDER BY a.appointment_date, a.appointment_time';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctor/patients/:id/history
router.get('/patients/:id/history', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_patient_medical_history(?)', [req.params.id]);
    res.json({ success: true, data: { patient: result[0][0], records: result[1], prescriptions: result[2], labs: result[3] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/doctor/records  (add medical record + prescription)
router.post('/records', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const {
      patient_id, appointment_id, diagnosis, symptoms, treatment_plan,
      follow_up_date, record_notes, presc_notes,
      medicine_ids, quantities, dosages, frequencies, durations
    } = req.body;

    await pool.query(
      'CALL sp_add_medical_record_with_prescription(?,?,?,?,?,?,?,?,?,?,?,?,?,?,@rid,@pid)',
      [
        patient_id, req.user.staff_id, appointment_id, diagnosis, symptoms,
        treatment_plan, follow_up_date, record_notes, presc_notes,
        JSON.stringify(medicine_ids || []), JSON.stringify(quantities || []),
        JSON.stringify(dosages || []), JSON.stringify(frequencies || []),
        JSON.stringify(durations || [])
      ]
    );
    const [[ids]] = await pool.query('SELECT @rid AS record_id, @pid AS prescription_id');
    res.status(201).json({ success: true, message: 'Medical record saved', data: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// GET /api/doctor/prescriptions (utilizes idx_doctor_prescriptions_doc_date and tracks real-time dispensing status)
router.get('/prescriptions', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { date, start_date, end_date, status, search } = req.query;
    let query = `
      SELECT vd.*,
             pat.patient_code,
             pat.blood_group,
             pat.allergies,
             disp.dispensed_at,
             disp.dispensed_by_name,
             disp.pharmacist_notes
      FROM vw_prescription_details vd
      JOIN patients pat ON vd.patient_id = pat.patient_id
      LEFT JOIN (
        SELECT 
          msl.reference_id AS prescription_id,
          MAX(msl.logged_at) AS dispensed_at,
          MAX(CONCAT(u.first_name, ' ', u.last_name)) AS dispensed_by_name,
          MAX(msl.notes) AS pharmacist_notes
        FROM medicine_stock_log msl
        JOIN users u ON msl.logged_by = u.user_id
        WHERE msl.reference_type = 'PRESCRIPTION'
        GROUP BY msl.reference_id
      ) disp ON vd.prescription_id = disp.prescription_id
      WHERE vd.doctor_id = ?
    `;
    const params = [req.user.staff_id];
    if (date) { query += ' AND vd.prescription_date = ?'; params.push(date); }
    if (start_date) { query += ' AND vd.prescription_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND vd.prescription_date <= ?'; params.push(end_date); }
    if (status && status !== 'ALL') { query += ' AND vd.status = ?'; params.push(status); }
    if (search) {
      query += ' AND (vd.patient_name LIKE ? OR vd.medicine_name LIKE ? OR pat.patient_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    query += ' ORDER BY vd.prescription_date DESC, vd.prescription_id DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctor/schedule (utilizes idx_doctor_schedules_doc_day)
router.get('/schedule', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM doctor_schedules WHERE doctor_id=? ORDER BY FIELD(day_of_week,"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")',
      [req.user.staff_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/doctor/schedule/:id (toggle availability or update timings)
router.put('/schedule/:id', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  try {
    const { is_available, start_time, end_time, max_appointments } = req.body;
    let query = 'UPDATE doctor_schedules SET ';
    const updates = [];
    const params = [];
    if (is_available !== undefined) { updates.push('is_available=?'); params.push(is_available ? 1 : 0); }
    if (start_time) { updates.push('start_time=?'); params.push(start_time); }
    if (end_time) { updates.push('end_time=?'); params.push(end_time); }
    if (max_appointments) { updates.push('max_appointments=?'); params.push(max_appointments); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    query += updates.join(', ') + ' WHERE schedule_id=?';
    params.push(req.params.id);
    if (req.user.role === 'doctor') {
      query += ' AND doctor_id=?';
      params.push(req.user.staff_id);
    }
    await pool.query(query, params);
    res.json({ success: true, message: 'Schedule updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
