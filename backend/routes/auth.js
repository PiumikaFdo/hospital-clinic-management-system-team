const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await pool.query(
      `SELECT u.user_id, u.email, u.password_hash, u.role, u.first_name, u.last_name,
              u.phone, u.is_active, s.staff_id
       FROM users u
       LEFT JOIN staff s ON u.user_id = s.user_id
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      staff_id: user.staff_id || null,
      name: `${user.first_name} ${user.last_name}`
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        staff_id: user.staff_id || null,
        name: `${user.first_name} ${user.last_name}`
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/register-patient (public - patient self-registration)
router.post('/register-patient', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, gender, date_of_birth, blood_group, address } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query('SELECT user_id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        await conn.rollback();
        conn.release();
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password, 10);
      const username = `${first_name.toLowerCase()}${Math.floor(Math.random() * 9000 + 1000)}`;

      const [userResult] = await conn.query(
        'INSERT INTO users (username,email,password_hash,role,first_name,last_name,phone,gender,date_of_birth,address) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [username, email, hash, 'patient', first_name, last_name, phone, gender, date_of_birth, address]
      );
      const userId = userResult.insertId;
      const patientCode = `PAT${String(userId).padStart(6, '0')}`;

      await conn.query(
        'INSERT INTO patients (user_id, patient_code, blood_group) VALUES (?,?,?)',
        [userId, patientCode, blood_group]
      );

      await conn.commit();
      conn.release();
      res.status(201).json({ success: true, message: 'Patient registered successfully' });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.first_name, u.last_name,
              u.phone, u.gender, u.date_of_birth, u.address, u.profile_image,
              s.staff_id, s.employee_id, s.dept_id, s.specialization,
              d.dept_name, p.patient_id, p.patient_code, p.blood_group
       FROM users u
       LEFT JOIN staff s ON u.user_id = s.user_id
       LEFT JOIN departments d ON s.dept_id = d.dept_id
       LEFT JOIN patients p ON u.user_id = p.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (typeof current_password !== 'string' || typeof new_password !== 'string') {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }
    if (new_password.length < 8 || Buffer.byteLength(new_password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters and no more than 72 bytes' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current password' });
    }

    const [users] = await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const isValid = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, req.user.user_id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
