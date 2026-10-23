const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/appointments/public/doctors?dept_id=3  (PUBLIC - for booking form)
router.get('/public/doctors', async (req, res) => {
  try {
    const { dept_id } = req.query;
    let q = `SELECT s.staff_id, s.specialization, s.experience_years,
             CONCAT(u.first_name,' ',u.last_name) AS doctor_name,
             d.dept_name, d.dept_id
             FROM staff s
             JOIN users u ON s.user_id=u.user_id
             JOIN departments d ON s.dept_id=d.dept_id
             WHERE u.role='doctor' AND s.status='Active' AND u.is_active=1`;
    const params = [];
    if (dept_id) { q += ' AND s.dept_id=?'; params.push(dept_id); }
    q += ' ORDER BY u.first_name';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/public/departments  (PUBLIC)
router.get('/public/departments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(DISTINCT s.staff_id) AS doctor_count
       FROM departments d LEFT JOIN staff s ON d.dept_id=s.dept_id
       JOIN users u ON s.user_id=u.user_id AND u.role='doctor'
       GROUP BY d.dept_id ORDER BY d.dept_name`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/public/slots?doctor_id=2&date=2024-01-15  (PUBLIC)
router.get('/public/slots', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    if (!doctor_id || !date) return res.status(400).json({ success: false, message: 'doctor_id and date required' });

    const d = new Date(date);
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = dayNames[d.getDay()];

    const [schedule] = await pool.query(
      'SELECT * FROM doctor_schedules WHERE doctor_id=? AND day_of_week=? AND is_available=1',
      [doctor_id, dayName]
    );
    if (schedule.length === 0) {
      return res.json({ success: true, data: [], message: 'Doctor not available on this day' });
    }

    const [booked] = await pool.query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id=? AND appointment_date=? AND status NOT IN ('Cancelled','No_Show')`,
      [doctor_id, date]
    );
    const bookedTimes = booked.map(b => b.appointment_time);

    // Generate 30-min slots
    const slots = [];
    const sch = schedule[0];
    let [sh, sm] = sch.start_time.split(':').map(Number);
    const [eh, em] = sch.end_time.split(':').map(Number);
    while (sh < eh || (sh === eh && sm < em)) {
      const timeStr = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}:00`;
      slots.push({ time: timeStr, available: !bookedTimes.includes(timeStr) });
      sm += 30;
      if (sm >= 60) { sm -= 60; sh++; }
    }
    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/appointments/public/book  (PUBLIC - guest booking without login)
router.post('/public/book', async (req, res) => {
  try {
    const { guest_name, guest_phone, guest_email, doctor_id, appointment_date, appointment_time, reason } = req.body;
    const [result] = await pool.query(
      `INSERT INTO appointments (doctor_id, appointment_date, appointment_time, reason, status, appointment_type, guest_name, guest_phone, guest_email)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [doctor_id, appointment_date, appointment_time, reason, 'Confirmed', 'Online', guest_name, guest_phone, guest_email]
    );
    res.status(201).json({ success: true, message: 'Appointment booked successfully!', appointment_id: result.insertId });
  } catch (err) {
    const msg = err.sqlMessage || 'Could not book appointment';
    res.status(400).json({ success: false, message: msg });
  }
});

// GET /api/appointments  (authenticated - role based)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, user_id, staff_id } = req.user;
    let rows;
    if (role === 'doctor') {
      [rows] = await pool.query('CALL sp_doctor_appointments(?,NULL)', [staff_id]);
      rows = rows[0];
    } else if (role === 'patient') {
      const [pat] = await pool.query('SELECT patient_id FROM patients WHERE user_id=?', [user_id]);
      if (!pat.length) return res.json({ success: true, data: [] });
      [rows] = await pool.query(
        `SELECT a.*, CONCAT(u.first_name,' ',u.last_name) AS doctor_name, d.dept_name
         FROM appointments a
         JOIN staff s ON a.doctor_id=s.staff_id
         JOIN users u ON s.user_id=u.user_id
         JOIN departments d ON s.dept_id=d.dept_id
         WHERE a.patient_id=? ORDER BY a.appointment_date DESC`, [pat[0].patient_id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT a.*, COALESCE(CONCAT(u.first_name,' ',u.last_name),a.guest_name) AS patient_name,
         CONCAT(du.first_name,' ',du.last_name) AS doctor_name, d.dept_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id=p.patient_id
         LEFT JOIN users u ON p.user_id=u.user_id
         JOIN staff s ON a.doctor_id=s.staff_id
         JOIN users du ON s.user_id=du.user_id
         JOIN departments d ON s.dept_id=d.dept_id
         ORDER BY a.appointment_date DESC LIMIT 100`
      );
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/appointments/:id/status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE appointments SET status=? WHERE appointment_id=?', [status, req.params.id]);
    if (req.user && req.user.user_id) {
      await pool.query(
        'UPDATE audit_logs SET user_id=?, ip_address=? WHERE table_name="appointments" AND record_id=? AND user_id IS NULL ORDER BY log_id DESC LIMIT 1',
        [req.user.user_id, req.ip || null, req.params.id]
      );
    }
    res.json({ success: true, message: 'Appointment status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
