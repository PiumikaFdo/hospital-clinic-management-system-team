const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/patient/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const [pat] = await pool.query('SELECT patient_id FROM patients WHERE user_id=?', [req.user.user_id]);
    if (!pat.length) return res.status(404).json({ success: false, message: 'Patient profile not found' });
    const pid = pat[0].patient_id;

    const [appointments] = await pool.query(
      `SELECT a.*, CONCAT(u.first_name,' ',u.last_name) AS doctor_name, d.dept_name
       FROM appointments a JOIN staff s ON a.doctor_id=s.staff_id
       JOIN users u ON s.user_id=u.user_id JOIN departments d ON s.dept_id=d.dept_id
       WHERE a.patient_id=? ORDER BY a.appointment_date DESC LIMIT 5`, [pid]
    );
    const [bills] = await pool.query('SELECT * FROM vw_patient_bills WHERE patient_id=? LIMIT 5', [pid]);
    const [labs] = await pool.query('SELECT * FROM vw_lab_tests_status WHERE patient_id=? ORDER BY request_date DESC LIMIT 5', [pid]);
    const [[{ balance }]] = await pool.query('SELECT fn_patient_balance(?) AS balance', [pid]);
    res.json({ success: true, data: { recent_appointments: appointments, recent_bills: bills, recent_labs: labs, outstanding_balance: balance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patient/appointments (utilizes idx_patient_appointments_pat_date)
router.get('/appointments', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const [pat] = await pool.query('SELECT patient_id FROM patients WHERE user_id=?', [req.user.user_id]);
    if (!pat.length) return res.json({ success: true, data: [] });
    const { status, date, start_date, end_date } = req.query;
    let query = `
      SELECT a.*, CONCAT(u.first_name,' ',u.last_name) AS doctor_name, d.dept_name
      FROM appointments a JOIN staff s ON a.doctor_id=s.staff_id
      JOIN users u ON s.user_id=u.user_id JOIN departments d ON s.dept_id=d.dept_id
      WHERE a.patient_id=?
    `;
    const params = [pat[0].patient_id];
    if (status && status !== 'All' && status !== 'ALL') { query += ' AND a.status = ?'; params.push(status); }
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    if (start_date) { query += ' AND a.appointment_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.appointment_date <= ?'; params.push(end_date); }
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patient/reports (utilizes idx_patient_prescriptions_pat_date and idx_patient_lab_requests_pat_date)
router.get('/reports', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const [pat] = await pool.query('SELECT patient_id FROM patients WHERE user_id=?', [req.user.user_id]);
    if (!pat.length) return res.json({ success: true, data: {} });
    const pid = pat[0].patient_id;
    const { start_date, end_date } = req.query;

    let recQuery = 'SELECT * FROM vw_medical_records_full WHERE patient_id=?';
    const recParams = [pid];
    if (start_date) { recQuery += ' AND DATE(created_at) >= ?'; recParams.push(start_date); }
    if (end_date) { recQuery += ' AND DATE(created_at) <= ?'; recParams.push(end_date); }
    recQuery += ' ORDER BY created_at DESC';

    let labQuery = 'SELECT * FROM vw_lab_tests_status WHERE patient_id=?';
    const labParams = [pid];
    if (start_date) { labQuery += ' AND DATE(request_date) >= ?'; labParams.push(start_date); }
    if (end_date) { labQuery += ' AND DATE(request_date) <= ?'; labParams.push(end_date); }
    labQuery += ' ORDER BY request_date DESC';

    let billQuery = 'SELECT * FROM vw_patient_bills WHERE patient_id=?';
    const billParams = [pid];
    if (start_date) { billQuery += ' AND DATE(bill_date) >= ?'; billParams.push(start_date); }
    if (end_date) { billQuery += ' AND DATE(bill_date) <= ?'; billParams.push(end_date); }
    billQuery += ' ORDER BY bill_date DESC';

    let prescQuery = 'SELECT * FROM vw_prescription_details WHERE patient_id=?';
    const prescParams = [pid];
    if (start_date) { prescQuery += ' AND prescription_date >= ?'; prescParams.push(start_date); }
    if (end_date) { prescQuery += ' AND prescription_date <= ?'; prescParams.push(end_date); }
    prescQuery += ' ORDER BY prescription_date DESC';

    const [records] = await pool.query(recQuery, recParams);
    const [labs] = await pool.query(labQuery, labParams);
    const [bills] = await pool.query(billQuery, billParams);
    const [prescriptions] = await pool.query(prescQuery, prescParams);

    res.json({ success: true, data: { medical_records: records, lab_results: labs, bills, prescriptions } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
