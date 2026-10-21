const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/admin/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [stats] = await pool.query('SELECT * FROM vw_admin_dashboard_stats');
    const [deptStats] = await pool.query('SELECT * FROM vw_dept_patient_stats');
    const [recentAppts] = await pool.query(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
              COALESCE(CONCAT(u.first_name,' ',u.last_name), a.guest_name) AS patient_name,
              CONCAT(du.first_name,' ',du.last_name) AS doctor_name, d.dept_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.patient_id
       LEFT JOIN users u ON p.user_id = u.user_id
       JOIN staff s ON a.doctor_id = s.staff_id
       JOIN users du ON s.user_id = du.user_id
       JOIN departments d ON s.dept_id = d.dept_id
       ORDER BY a.created_at DESC LIMIT 10`
    );
    res.json({ success: true, data: { stats: stats[0], deptStats, recentAppointments: recentAppts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/staff (utilizes idx_admin_staff_dept_status and idx_admin_users_role_status)
router.get('/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role, dept_id, status, is_active, search } = req.query;
    let query = 'SELECT * FROM vw_staff_overview WHERE 1=1';
    const params = [];
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (dept_id) { query += ' AND dept_id = ?'; params.push(dept_id); }
    if (status && status !== 'ALL') { query += ' AND status = ?'; params.push(status); }
    if (is_active !== undefined && is_active !== '') { query += ' AND is_active = ?'; params.push(is_active === 'true' || is_active === '1' ? 1 : 0); }
    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR employee_id LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    query += ' ORDER BY role, last_name';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/staff (Register new staff)
router.post('/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      username, email, password, role, first_name, last_name, phone,
      gender, date_of_birth, dept_id, qualification, specialization,
      experience_years, joining_date, salary
    } = req.body;

    const hash = await bcrypt.hash(password || 'Admin@123', 10);
    const [result] = await pool.query(
      'CALL sp_register_staff(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@uid,@sid)',
      [
        username,
        email,
        hash,
        role,
        first_name,
        last_name,
        phone || null,
        gender || 'Male',
        date_of_birth || null,
        dept_id || null,
        qualification || null,
        specialization || null,
        parseInt(experience_years, 10) || 0,
        joining_date || new Date().toISOString().split('T')[0],
        salary || 0.00
      ]
    );
    const [[ids]] = await pool.query('SELECT @uid AS user_id, @sid AS staff_id');
    res.status(201).json({ success: true, message: 'Staff registered successfully', data: ids });
  } catch (err) {
    console.error(err);
    const msg = err.sqlMessage || 'Server error';
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/admin/staff/:id
router.put('/staff/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { dept_id, qualification, specialization, experience_years, salary, shift, status } = req.body;
    await pool.query(
      'UPDATE staff SET dept_id=?, qualification=?, specialization=?, experience_years=?, salary=?, shift=?, status=? WHERE staff_id=?',
      [dept_id, qualification, specialization, parseInt(experience_years, 10) || 0, salary, shift, status, req.params.id]
    );
    res.json({ success: true, message: 'Staff updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/staff/:id/status (quick status / active toggle)
router.put('/staff/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, is_active } = req.body;
    if (status) {
      await pool.query('UPDATE staff SET status=? WHERE staff_id=?', [status, req.params.id]);
    }
    if (is_active !== undefined) {
      const [s] = await pool.query('SELECT user_id FROM staff WHERE staff_id=?', [req.params.id]);
      if (s.length) {
        await pool.query('UPDATE users SET is_active=? WHERE user_id=?', [is_active ? 1 : 0, s[0].user_id]);
      }
    }
    res.json({ success: true, message: 'Staff status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/appointments
router.get('/appointments', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { doctor_id, start_date, end_date, status } = req.query;
    if (doctor_id && start_date && end_date) {
      await pool.query('CALL sp_appointments_by_doctor(?,?,?,?)',
        [doctor_id, start_date, end_date, status || 'ALL']);
    }
    const sDate = start_date || new Date().toISOString().split('T')[0];
    const eDate = end_date || new Date().toISOString().split('T')[0];
    let q = `SELECT a.*, COALESCE(CONCAT(u.first_name,' ',u.last_name),a.guest_name) AS patient_name,
             CONCAT(du.first_name,' ',du.last_name) AS doctor_name, d.dept_name
             FROM appointments a
             LEFT JOIN patients p ON a.patient_id=p.patient_id
             LEFT JOIN users u ON p.user_id=u.user_id
             JOIN staff s ON a.doctor_id=s.staff_id
             JOIN users du ON s.user_id=du.user_id
             JOIN departments d ON s.dept_id=d.dept_id
             WHERE a.appointment_date BETWEEN ? AND ?`;
    const params = [sDate, eDate];
    if (doctor_id) { q += ' AND a.doctor_id=?'; params.push(doctor_id); }
    if (status && status !== 'ALL') { q += ' AND a.status=?'; params.push(status); }
    q += ' ORDER BY a.appointment_date, a.appointment_time';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/schedules
router.get('/schedules', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { dept_id } = req.query;
    await pool.query('CALL sp_get_doctor_schedules(?)', [dept_id || 0]);
    const [rows] = await pool.query('CALL sp_get_doctor_schedules(?)', [dept_id || 0]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/schedules (Add schedule for a doctor)
router.post('/schedules', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { doctor_id, day_of_week, start_time, end_time, max_appointments, is_available } = req.body;

    if (!doctor_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Doctor, day of week, start time, and end time are required'
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Check if schedule already exists for this doctor on this day
    const [existing] = await pool.query(
      'SELECT schedule_id FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?',
      [doctor_id, day_of_week]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A schedule already exists for this doctor on ${day_of_week}`
      });
    }

    const [result] = await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_appointments, is_available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        parseInt(max_appointments, 10) || 20,
        is_available === undefined || is_available === true || is_available === 'true' || is_available === 1 ? 1 : 0
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Doctor schedule added successfully',
      data: { schedule_id: result.insertId }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/patients
router.get('/patients', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_registered_patients ORDER BY registered_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/departments
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY dept_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/revenue
router.get('/revenue', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const [[{ revenue }]] = await pool.query(
      'SELECT fn_monthly_revenue(?,?) AS revenue', [year || new Date().getFullYear(), month || (new Date().getMonth() + 1)]
    );
    const [monthly] = await pool.query(
      `SELECT MONTH(bill_date) AS month, SUM(paid_amount) AS revenue, COUNT(*) AS bills
       FROM bills WHERE YEAR(bill_date)=? AND payment_status IN ('Paid','Partial')
       GROUP BY MONTH(bill_date) ORDER BY month`,
      [year || new Date().getFullYear()]
    );
    res.json({ success: true, data: { currentMonthRevenue: revenue, monthlyBreakdown: monthly } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/audit-logs (utilizes idx_admin_audit_action_date)
router.get('/audit-logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { action, start_date, end_date, search, limit } = req.query;
    let query = `
      SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.role, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    if (action && action !== 'ALL') {
      query += ' AND al.action = ?';
      params.push(action);
    }
    if (start_date) {
      query += ' AND DATE(al.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(al.created_at) <= ?';
      params.push(end_date);
    }
    if (search) {
      query += ' AND (al.table_name LIKE ? OR al.action LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
