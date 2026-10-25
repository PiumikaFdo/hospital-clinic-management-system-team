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
    const [[{ today_appts }]] = await pool.query("SELECT COUNT(*) AS today_appts FROM appointments WHERE appointment_date=CURDATE()");
    const [[{ today_confirmed_appts }]] = await pool.query("SELECT COUNT(*) AS today_confirmed_appts FROM appointments WHERE appointment_date=CURDATE() AND status='Confirmed'");
    const [[{ total_beds }]] = await pool.query("SELECT COUNT(*) AS total_beds FROM beds");
    const [[{ available_beds }]] = await pool.query("SELECT COUNT(*) AS available_beds FROM beds WHERE status='Available'");
    const [recent_patients] = await pool.query('SELECT * FROM vw_registered_patients ORDER BY registered_at DESC LIMIT 6');
    const [pending_bills_list] = await pool.query('SELECT * FROM vw_patient_bills WHERE payment_status=\'Pending\' ORDER BY bill_date DESC LIMIT 6');
    const [today_appts_list] = await pool.query(`
      SELECT a.appointment_id, a.appointment_time, a.status, a.appointment_type, a.reason,
             COALESCE(CONCAT(pu.first_name, ' ', pu.last_name), a.guest_name) AS patient_name,
             p.patient_code,
             CONCAT(du.first_name, ' ', du.last_name) AS doctor_name,
             ds.specialization
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users pu ON p.user_id = pu.user_id
      JOIN staff ds ON a.doctor_id = ds.staff_id
      JOIN users du ON ds.user_id = du.user_id
      WHERE a.appointment_date = CURDATE()
      ORDER BY a.appointment_time ASC LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        today_registrations: today_reg,
        pending_bills,
        today_total_payments: today_payments,
        active_admissions,
        today_appointments: today_appts,
        today_confirmed_appointments: today_confirmed_appts,
        total_beds,
        available_beds,
        recent_patients,
        pending_bills_list,
        today_appointments_list: today_appts_list
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/patients (utilizes idx_reception_patients_reg_date)
router.get('/patients', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { search, date, start_date, end_date, blood_group } = req.query;
    let q = `
      SELECT
        p.patient_id, p.user_id, p.patient_code, p.blood_group, p.registered_at,
        p.emergency_contact, p.emergency_contact_name, p.allergies, p.medical_history,
        p.insurance_provider, p.insurance_number,
        u.first_name, u.last_name, u.email, u.phone, u.gender, u.date_of_birth, u.address,
        COALESCE(u.is_active, 1) AS is_active,
        TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) AS age,
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.patient_id) AS total_appointments,
        (SELECT ad.admission_id FROM admissions ad WHERE ad.patient_id = p.patient_id AND ad.status = 'Active' LIMIT 1) AS active_admission_id,
        (SELECT CONCAT(w.ward_name, ' (Bed ', b.bed_number, ')') FROM admissions ad JOIN wards w ON ad.ward_id = w.ward_id JOIN beds b ON ad.bed_id = b.bed_id WHERE ad.patient_id = p.patient_id AND ad.status = 'Active' LIMIT 1) AS active_ward_bed,
        (SELECT COUNT(*) FROM bills bl WHERE bl.patient_id = p.patient_id AND bl.payment_status = 'Pending') AS pending_bills_count
      FROM patients p
      JOIN users u ON p.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    if (date) { q += ' AND DATE(p.registered_at) = ?'; params.push(date); }
    if (start_date) { q += ' AND DATE(p.registered_at) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(p.registered_at) <= ?'; params.push(end_date); }
    if (blood_group) { q += ' AND p.blood_group = ?'; params.push(blood_group); }
    if (search) {
      q += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR p.patient_code LIKE ? OR u.phone LIKE ? OR p.emergency_contact LIKE ? OR p.emergency_contact_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s,s,s,s,s,s);
    }
    q += ' ORDER BY p.registered_at DESC';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch patients error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/patients/:id (Detailed intake dossier)
router.get('/patients/:id', authenticateToken, authorizeRoles('receptionist','admin','doctor','nurse'), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT
        p.patient_id, p.user_id, p.patient_code, p.blood_group, p.registered_at,
        p.emergency_contact, p.emergency_contact_name, p.allergies, p.medical_history,
        p.insurance_provider, p.insurance_number,
        u.first_name, u.last_name, u.email, u.phone, u.gender, u.date_of_birth, u.address,
        COALESCE(u.is_active, 1) AS is_active,
        TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) AS age
      FROM patients p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.patient_id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patient = rows[0];

    // Recent appointments
    const [appointments] = await pool.query(`
      SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.reason,
             CONCAT(du.first_name, ' ', du.last_name) AS doctor_name, d.dept_name
      FROM appointments a
      JOIN staff ds ON a.doctor_id = ds.staff_id
      JOIN users du ON ds.user_id = du.user_id
      LEFT JOIN departments d ON ds.dept_id = d.dept_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 5
    `, [id]);

    // Recent admissions
    const [admissions] = await pool.query(`
      SELECT ad.admission_id, ad.admission_date, ad.discharge_date, ad.status,
             w.ward_name, w.ward_type, b.bed_number,
             GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) AS stay_days
      FROM admissions ad
      LEFT JOIN wards w ON ad.ward_id = w.ward_id
      LEFT JOIN beds b ON ad.bed_id = b.bed_id
      WHERE ad.patient_id = ?
      ORDER BY ad.admission_date DESC
      LIMIT 5
    `, [id]);

    // Recent bills
    const [bills] = await pool.query(`
      SELECT b.bill_id, b.bill_date, b.total_amount, b.paid_amount, b.payment_status
      FROM bills b
      WHERE b.patient_id = ?
      ORDER BY b.bill_date DESC
      LIMIT 5
    `, [id]);

    res.json({
      success: true,
      data: {
        ...patient,
        appointments,
        admissions,
        bills
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/patients (Register patient + emergency contact + clinical intake)
router.post('/patients', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      first_name, last_name, email, phone, gender, date_of_birth, blood_group, address,
      emergency_contact, emergency_contact_name, allergies, medical_history, insurance_provider, insurance_number,
      doctor_id, appt_date, appt_time, reason
    } = req.body;

    if (!first_name || !last_name || !email || !phone) {
      connection.release();
      return res.status(400).json({ success: false, message: 'First name, last name, email, and phone are required' });
    }

    const doctorId   = (doctor_id   && doctor_id   !== '') ? parseInt(doctor_id, 10) : null;
    const apptDate   = (appt_date   && appt_date   !== '') ? appt_date   : null;
    const apptTime   = (appt_time   && appt_time   !== '') ? appt_time   : null;
    const apptReason = (reason      && reason      !== '') ? reason      : null;

    let patientId = null;
    let appointmentId = null;
    let patientCode = null;

    await connection.beginTransaction();

    if (doctorId && apptDate && apptTime) {
      // Register with appointment using procedure sp_register_patient_appointment
      await connection.query(
        'CALL sp_register_patient_appointment(?,?,?,?,?,?,?,?,?,?,?,?,@pid,@aid)',
        [first_name, last_name, email, phone, gender || 'Male', date_of_birth || null, blood_group || 'O+', address || null, doctorId, apptDate, apptTime, apptReason]
      );
      const [[ids]] = await connection.query('SELECT @pid AS patient_id, @aid AS appointment_id');
      patientId = ids.patient_id;
      appointmentId = ids.appointment_id;

      // Update emergency contact and clinical intake fields
      await connection.query(
        `UPDATE patients SET 
          emergency_contact = ?, 
          emergency_contact_name = ?, 
          allergies = ?, 
          medical_history = ?, 
          insurance_provider = ?, 
          insurance_number = ? 
        WHERE patient_id = ?`,
        [
          emergency_contact || null,
          emergency_contact_name || null,
          allergies || null,
          medical_history || null,
          insurance_provider || null,
          insurance_number || null,
          patientId
        ]
      );

      const [[codeRow]] = await connection.query('SELECT patient_code FROM patients WHERE patient_id = ?', [patientId]);
      patientCode = codeRow?.patient_code;
    } else {
      // Pure Intake / Registration without immediate doctor appointment
      const username = `${first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${last_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
      const [userResult] = await connection.query(
        `INSERT INTO users(username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth, address)
         VALUES(?, ?, '$2a$10$placeholder', 'patient', ?, ?, ?, ?, ?, ?)`,
        [username, email, first_name, last_name, phone, gender || 'Male', date_of_birth || null, address || null]
      );
      const userId = userResult.insertId;
      patientCode = `PAT${String(userId).padStart(6, '0')}`;

      const [patientResult] = await connection.query(
        `INSERT INTO patients(user_id, patient_code, blood_group, emergency_contact, emergency_contact_name, allergies, medical_history, insurance_provider, insurance_number)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          patientCode,
          blood_group || 'O+',
          emergency_contact || null,
          emergency_contact_name || null,
          allergies || null,
          medical_history || null,
          insurance_provider || null,
          insurance_number || null
        ]
      );
      patientId = patientResult.insertId;
    }

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: appointmentId ? 'Patient registered and initial appointment confirmed' : 'Patient registered and intake file created successfully',
      data: {
        patient_id: patientId,
        patient_code: patientCode,
        appointment_id: appointmentId
      }
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Registration error:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Registration failed' });
  }
});

// PUT /api/receptionist/patients/:id (Update patient profile & emergency contact)
router.put('/patients/:id', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, gender, date_of_birth, address,
      blood_group, emergency_contact, emergency_contact_name, allergies, medical_history,
      insurance_provider, insurance_number
    } = req.body;

    const [rows] = await connection.query('SELECT user_id FROM patients WHERE patient_id = ?', [id]);
    if (!rows.length) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const userId = rows[0].user_id;

    await connection.beginTransaction();

    if (userId) {
      await connection.query(
        `UPDATE users SET 
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          gender = COALESCE(?, gender),
          date_of_birth = ?,
          address = ?
        WHERE user_id = ?`,
        [first_name, last_name, email, phone, gender, date_of_birth || null, address || null, userId]
      );
    }

    await connection.query(
      `UPDATE patients SET 
        blood_group = COALESCE(?, blood_group),
        emergency_contact = ?,
        emergency_contact_name = ?,
        allergies = ?,
        medical_history = ?,
        insurance_provider = ?,
        insurance_number = ?
      WHERE patient_id = ?`,
      [
        blood_group,
        emergency_contact || null,
        emergency_contact_name || null,
        allergies || null,
        medical_history || null,
        insurance_provider || null,
        insurance_number || null,
        id
      ]
    );

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Patient intake profile and emergency contacts updated successfully' });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Update patient error:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Update failed' });
  }
});

// PATCH /api/receptionist/patients/:id/status (Toggle patient active status)
router.patch('/patients/:id/status', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [rows] = await pool.query('SELECT user_id FROM patients WHERE patient_id = ?', [id]);
    if (!rows.length || !rows[0].user_id) {
      return res.status(404).json({ success: false, message: 'Patient user account not found' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [is_active ? 1 : 0, rows[0].user_id]);
    res.json({ success: true, message: `Patient account ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/receptionist/patients/:id (Safe delete or deactivate)
router.delete('/patients/:id', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [[{ apptCount }]] = await pool.query('SELECT COUNT(*) AS apptCount FROM appointments WHERE patient_id = ?', [id]);
    const [[{ admCount }]] = await pool.query('SELECT COUNT(*) AS admCount FROM admissions WHERE patient_id = ?', [id]);
    const [[{ billCount }]] = await pool.query('SELECT COUNT(*) AS billCount FROM bills WHERE patient_id = ?', [id]);

    const [patientRows] = await pool.query('SELECT user_id FROM patients WHERE patient_id = ?', [id]);
    if (!patientRows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const userId = patientRows[0].user_id;

    if (apptCount > 0 || admCount > 0 || billCount > 0) {
      // Soft-deactivate for medical record retention & legal compliance
      if (userId) {
        await pool.query('UPDATE users SET is_active = 0 WHERE user_id = ?', [userId]);
      }
      return res.json({
        success: true,
        deactivated: true,
        message: 'Patient has linked hospital records (appointments/bills). Profile has been safely deactivated to preserve audit trails.'
      });
    }

    // Clean delete if newly added without clinical history
    await pool.query('DELETE FROM patients WHERE patient_id = ?', [id]);
    if (userId) {
      await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
    }

    res.json({ success: true, message: 'Patient record removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Failed to delete patient' });
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
    let q = `
      SELECT
        b.bill_id, b.bill_date, b.patient_id, b.admission_id, b.appointment_id,
        b.doctor_fees, b.medicine_cost, b.lab_cost, b.ward_cost, b.hospital_fees,
        b.discount, b.tax, b.total_amount,
        COALESCE(payment_totals.paid_amount, 0) AS paid_amount,
        GREATEST(0, b.total_amount - COALESCE(payment_totals.paid_amount, 0)) AS balance_amount,
        CASE
          WHEN b.payment_status = 'Cancelled' THEN 'Cancelled'
          WHEN COALESCE(payment_totals.paid_amount, 0) >= b.total_amount THEN 'Paid'
          WHEN COALESCE(payment_totals.paid_amount, 0) > 0 THEN 'Partial'
          ELSE 'Pending'
        END AS payment_status,
        CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
        pat.patient_code, pu.phone,
        CONCAT(ru.first_name,' ',ru.last_name) AS receptionist_name,
        w.ward_name, bed.bed_number
      FROM bills b
      JOIN patients pat ON b.patient_id = pat.patient_id
      JOIN users pu ON pat.user_id = pu.user_id
      LEFT JOIN staff rs ON b.receptionist_id = rs.staff_id
      LEFT JOIN users ru ON rs.user_id = ru.user_id
      LEFT JOIN (
        SELECT bill_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY bill_id
      ) payment_totals ON payment_totals.bill_id = b.bill_id
      LEFT JOIN admissions ad ON b.admission_id = ad.admission_id
      LEFT JOIN wards w ON ad.ward_id = w.ward_id
      LEFT JOIN beds bed ON ad.bed_id = bed.bed_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'ALL') { q += ' AND b.payment_status=?'; params.push(status); }
    if (patient_id) { q += ' AND b.patient_id=?'; params.push(patient_id); }
    if (start_date) { q += ' AND DATE(b.bill_date) >= ?'; params.push(start_date); }
    if (end_date) { q += ' AND DATE(b.bill_date) <= ?'; params.push(end_date); }
    if (search) {
      q += ' AND (CONCAT(pu.first_name," ",pu.last_name) LIKE ? OR pat.patient_code LIKE ? OR pu.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    q += ' ORDER BY b.bill_date DESC';
    const [rows] = await pool.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/bills/:id (Complete patient demographic and hospital stay details)
router.get('/bills/:id', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const [bills] = await pool.query(`
      SELECT
        b.bill_id, b.bill_date, b.patient_id, b.receptionist_id, b.appointment_id, b.admission_id,
        b.doctor_fees, b.medicine_cost, b.lab_cost, b.ward_cost, b.hospital_fees,
        b.discount, b.tax, b.total_amount,
        COALESCE(payment_totals.paid_amount, 0) AS paid_amount,
        GREATEST(0, b.total_amount - COALESCE(payment_totals.paid_amount, 0)) AS balance_amount,
        CASE
          WHEN b.payment_status = 'Cancelled' THEN 'Cancelled'
          WHEN COALESCE(payment_totals.paid_amount, 0) >= b.total_amount THEN 'Paid'
          WHEN COALESCE(payment_totals.paid_amount, 0) > 0 THEN 'Partial'
          ELSE 'Pending'
        END AS payment_status,
        CONCAT(pu.first_name,' ',pu.last_name) AS patient_name,
        pat.patient_code, pat.blood_group, pu.phone, pu.gender, pu.address,
        TIMESTAMPDIFF(YEAR, pu.date_of_birth, CURDATE()) AS patient_age,
        CONCAT(ru.first_name,' ',ru.last_name) AS receptionist_name,
        ad.admission_date, ad.discharge_date, ad.reason_for_admission, ad.status AS admission_status,
        GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) AS admission_days,
        w.ward_name, w.ward_type, w.floor_number, w.daily_rate,
        bed.bed_number,
        CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
        ds.specialization AS doctor_specialization
      FROM bills b
      JOIN patients pat ON b.patient_id = pat.patient_id
      JOIN users pu ON pat.user_id = pu.user_id
      LEFT JOIN staff rs ON b.receptionist_id = rs.staff_id
      LEFT JOIN users ru ON rs.user_id = ru.user_id
      LEFT JOIN (
        SELECT bill_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY bill_id
      ) payment_totals ON payment_totals.bill_id = b.bill_id
      LEFT JOIN admissions ad ON b.admission_id = ad.admission_id
      LEFT JOIN wards w ON ad.ward_id = w.ward_id
      LEFT JOIN beds bed ON ad.bed_id = bed.bed_id
      LEFT JOIN appointments app ON b.appointment_id = app.appointment_id
      LEFT JOIN staff ds ON COALESCE(ad.doctor_id, app.doctor_id) = ds.staff_id
      LEFT JOIN users du ON ds.user_id = du.user_id
      WHERE b.bill_id = ?
    `, [req.params.id]);

    const [payments] = await pool.query('SELECT * FROM payments WHERE bill_id=? ORDER BY payment_date', [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: { bill: bills[0], payments } });
  } catch (err) {
    console.error('Error fetching bill details:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/payments  (Process payment)
router.post('/payments', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  let connection;
  let transactionStarted = false;
  try {
    const { bill_id, amount, payment_method, transaction_reference } = req.body;
<<<<<<< Updated upstream
    await pool.query('CALL sp_process_payment(?,?,?,?,?)',
      [bill_id, amount, payment_method, transaction_reference || null, req.user.staff_id]);
=======
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const [billRows] = await connection.query(
      `SELECT bills.total_amount,
              GREATEST(0, bills.total_amount - COALESCE(payment_totals.paid_amount, 0)) AS balance_amount,
              bills.payment_status
       FROM bills
       LEFT JOIN (
         SELECT bill_id, SUM(amount) AS paid_amount
         FROM payments
         GROUP BY bill_id
       ) payment_totals ON payment_totals.bill_id = bills.bill_id
       WHERE bills.bill_id = ? FOR UPDATE`,
      [bill_id]
    );
    if (!billRows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (billRows[0].payment_status === 'Cancelled' || Number(billRows[0].balance_amount) <= 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'This invoice is already fully settled' });
    }
    if (paymentAmount > Number(billRows[0].balance_amount)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero and cannot exceed the outstanding balance' });
    }
    await connection.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_reference, received_by)
       VALUES (?, ?, ?, ?, ?)`,
      [bill_id, paymentAmount, payment_method, transaction_reference || null, req.user.staff_id]
    );
    const [[paymentTotals]] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payments WHERE bill_id = ?',
      [bill_id]
    );
    await connection.query(
      `UPDATE bills
       SET paid_amount = ?,
           balance_amount = GREATEST(0, total_amount - ?),
           payment_status = CASE
             WHEN payment_status = 'Cancelled' THEN 'Cancelled'
             WHEN ? >= total_amount THEN 'Paid'
             WHEN ? > 0 THEN 'Partial'
             ELSE 'Pending'
           END
       WHERE bill_id = ?`,
      [paymentTotals.paid_amount, paymentTotals.paid_amount, paymentTotals.paid_amount, paymentTotals.paid_amount, bill_id]
    );
    await connection.commit();
    transactionStarted = false;
>>>>>>> Stashed changes
    res.json({ success: true, message: 'Payment processed successfully' });
  } catch (err) {
    if (transactionStarted) {
      await connection.rollback();
    }
    console.error('Error processing payment:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || 'Payment failed' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/receptionist/payments (utilizes idx_reception_payments_date_method)
router.get('/payments', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { payment_method, patient_id, date, start_date, end_date, limit } = req.query;
    let q = `
      SELECT p.*, b.total_amount,
             GREATEST(0, b.total_amount - COALESCE(payment_totals.paid_amount, 0)) AS balance_amount,
             CASE
               WHEN b.payment_status = 'Cancelled' THEN 'Cancelled'
               WHEN COALESCE(payment_totals.paid_amount, 0) >= b.total_amount THEN 'Paid'
               WHEN COALESCE(payment_totals.paid_amount, 0) > 0 THEN 'Partial'
               ELSE 'Pending'
             END AS payment_status,
             CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pat.patient_code,
             CONCAT(ru.first_name,' ',ru.last_name) AS received_by_name
      FROM payments p
      JOIN bills b ON p.bill_id = b.bill_id
      LEFT JOIN (
        SELECT bill_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY bill_id
      ) payment_totals ON payment_totals.bill_id = b.bill_id
      JOIN patients pat ON b.patient_id = pat.patient_id
      JOIN users pu ON pat.user_id = pu.user_id
      LEFT JOIN staff rs ON p.received_by = rs.staff_id
      LEFT JOIN users ru ON rs.user_id = ru.user_id
      WHERE 1=1
    `;
    const params = [];
    if (payment_method && payment_method !== 'ALL') { q += ' AND p.payment_method = ?'; params.push(payment_method); }
    if (patient_id) { q += ' AND b.patient_id = ?'; params.push(patient_id); }
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

// GET /api/receptionist/doctors/:id/schedule (Doctor weekly available working days)
router.get('/doctors/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [schedules] = await pool.query(`
      SELECT schedule_id, day_of_week, start_time, end_time, is_available
      FROM doctor_schedules
      WHERE doctor_id = ? AND is_available = 1
      ORDER BY FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
    `, [id]);
    res.json({ success: true, data: schedules });
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

// GET /api/receptionist/admissions (utilizes idx_nurse_admissions_status_date)
router.get('/admissions', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const { status, ward_id, search, start_date, end_date } = req.query;
    let query = `
      SELECT
        ad.admission_id, ad.admission_date, ad.discharge_date, ad.reason_for_admission,
        ad.diagnosis_at_discharge, ad.status, ad.notes,
        GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) AS days_admitted,
        ROUND(GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) * COALESCE(w.daily_rate, 0), 2) AS accrued_ward_cost,
        p.patient_id, p.patient_code, p.blood_group,
        CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pu.phone, pu.gender,
        w.ward_id, w.ward_name, w.ward_type, w.floor_number, w.daily_rate,
        b.bed_id, b.bed_number,
        ds.staff_id AS doctor_staff_id,
        CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
        ds.specialization AS doctor_specialization,
        ns.staff_id AS nurse_staff_id,
        CONCAT(nu.first_name,' ',nu.last_name) AS nurse_name,
        bi.bill_id, bi.total_amount AS bill_total, bi.paid_amount AS bill_paid,
        GREATEST(0, bi.total_amount - bi.paid_amount) AS bill_balance,
        bi.payment_status AS bill_status
      FROM admissions ad
      JOIN patients p ON ad.patient_id = p.patient_id
      JOIN users pu ON p.user_id = pu.user_id
      LEFT JOIN wards w ON ad.ward_id = w.ward_id
      LEFT JOIN beds b ON ad.bed_id = b.bed_id
      LEFT JOIN staff ds ON ad.doctor_id = ds.staff_id
      LEFT JOIN users du ON ds.user_id = du.user_id
      LEFT JOIN staff ns ON ad.nurse_id = ns.staff_id
      LEFT JOIN users nu ON ns.user_id = nu.user_id
      LEFT JOIN bills bi ON bi.admission_id = ad.admission_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'All' && status !== 'ALL') {
      query += ' AND ad.status = ?';
      params.push(status);
    }
    if (ward_id && ward_id !== 'All' && ward_id !== 'ALL') {
      query += ' AND ad.ward_id = ?';
      params.push(ward_id);
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
      query += ' AND (pu.first_name LIKE ? OR pu.last_name LIKE ? OR p.patient_code LIKE ? OR w.ward_name LIKE ? OR b.bed_number LIKE ? OR du.first_name LIKE ? OR du.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s);
    }
    query += ' ORDER BY ad.admission_date DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching receptionist admissions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/admissions/stats (Admissions & Bed Census metrics)
router.get('/admissions/stats', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const [[{ active_admissions }]] = await pool.query("SELECT COUNT(*) AS active_admissions FROM admissions WHERE status='Active'");
    const [[{ discharged_admissions }]] = await pool.query("SELECT COUNT(*) AS discharged_admissions FROM admissions WHERE status='Discharged'");
    const [[{ total_beds, available_beds }]] = await pool.query("SELECT COALESCE(SUM(total_beds),0) AS total_beds, COALESCE(SUM(available_beds),0) AS available_beds FROM wards");
    const occupied_beds = total_beds - available_beds;
    const occupancy_rate = total_beds > 0 ? Math.round((occupied_beds / total_beds) * 100) : 0;
    const [[{ avg_stay }]] = await pool.query("SELECT ROUND(COALESCE(AVG(GREATEST(1, DATEDIFF(COALESCE(discharge_date, NOW()), admission_date))), 0), 1) AS avg_stay FROM admissions WHERE status='Active'");
    const [[{ total_accrued }]] = await pool.query(`
      SELECT COALESCE(SUM(GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) * w.daily_rate), 0) AS total_accrued
      FROM admissions ad
      JOIN wards w ON ad.ward_id = w.ward_id
      WHERE ad.status = 'Active'
    `);

    res.json({
      success: true,
      data: {
        active_admissions,
        discharged_admissions,
        total_beds,
        available_beds,
        occupied_beds,
        occupancy_rate,
        avg_stay,
        total_accrued
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/admissions/bed-matrix (Interactive Visual Bed Map)
router.get('/admissions/bed-matrix', authenticateToken, authorizeRoles('receptionist','admin','nurse'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        w.ward_id, w.ward_name, w.ward_type, w.total_beds, w.available_beds,
        w.floor_number, w.daily_rate,
        (w.total_beds - w.available_beds) AS occupied_beds,
        b.bed_id, b.bed_number, b.status AS bed_status,
        ad.admission_id, ad.admission_date,
        GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) AS days_admitted,
        ROUND(GREATEST(1, DATEDIFF(COALESCE(ad.discharge_date, NOW()), ad.admission_date)) * COALESCE(w.daily_rate, 0), 2) AS accrued_cost,
        p.patient_id, p.patient_code, p.blood_group,
        CONCAT(pu.first_name, ' ', pu.last_name) AS patient_name, pu.phone,
        CONCAT(du.first_name, ' ', du.last_name) AS doctor_name,
        ds.specialization AS doctor_specialization,
        CONCAT(nu.first_name, ' ', nu.last_name) AS nurse_name
      FROM wards w
      JOIN beds b ON w.ward_id = b.ward_id
      LEFT JOIN admissions ad ON b.bed_id = ad.bed_id AND ad.status = 'Active'
      LEFT JOIN patients p ON ad.patient_id = p.patient_id
      LEFT JOIN users pu ON p.user_id = pu.user_id
      LEFT JOIN staff ds ON ad.doctor_id = ds.staff_id
      LEFT JOIN users du ON ds.user_id = du.user_id
      LEFT JOIN staff ns ON ad.nurse_id = ns.staff_id
      LEFT JOIN users nu ON ns.user_id = nu.user_id
      ORDER BY w.ward_id, b.bed_number
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching bed matrix:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/patients/:id/recent-consultation (Auto-fill doctor recommendation)
router.get('/patients/:id/recent-consultation', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const [rows] = await pool.query(`
      SELECT
        a.appointment_id, a.appointment_date, a.appointment_time, a.reason,
        a.appointment_type, a.status, a.doctor_id,
        CONCAT(du.first_name, ' ', du.last_name) AS doctor_name,
        ds.specialization, ds.dept_id
      FROM appointments a
      JOIN staff ds ON a.doctor_id = ds.staff_id
      JOIN users du ON ds.user_id = du.user_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 1
    `, [patientId]);

    if (rows.length > 0) {
      return res.json({ success: true, data: rows[0] });
    }

    // Fallback: check if patient has recorded medical history or allergy notes to populate clinical reason
    const [pRows] = await pool.query(
      `SELECT medical_history, allergies FROM patients WHERE patient_id = ?`,
      [patientId]
    );
    if (pRows.length > 0 && (pRows[0].medical_history || pRows[0].allergies)) {
      const summary = [
        pRows[0].medical_history ? `Clinical History: ${pRows[0].medical_history}` : null,
        pRows[0].allergies ? `Allergies: ${pRows[0].allergies}` : null
      ].filter(Boolean).join(' | ');

      return res.json({
        success: true,
        data: {
          appointment_id: null,
          doctor_id: null,
          doctor_name: null,
          reason: summary,
          specialization: null
        }
      });
    }

    res.json({ success: true, data: null });
  } catch (err) {
    console.error('Error fetching patient recent consultation:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/receptionist/pending-admission-orders
// Returns all doctor-placed admission orders (appointments with [ADMISSION ORDER] reason)
// where the patient does NOT currently have an active admission — so receptionist can act on them.
router.get('/pending-admission-orders', authenticateToken, authorizeRoles('receptionist', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.reason,
        a.appointment_type,
        a.status,
        a.doctor_id,
        a.patient_id,
        CONCAT(du.first_name, ' ', du.last_name) AS doctor_name,
        ds.specialization,
        CONCAT(pu.first_name, ' ', pu.last_name) AS patient_name,
        p.patient_code,
        p.blood_group,
        pu.phone AS patient_phone,
        pu.gender
      FROM appointments a
      JOIN staff ds ON a.doctor_id = ds.staff_id
      JOIN users du ON ds.user_id = du.user_id
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN users pu ON p.user_id = pu.user_id
      WHERE a.reason LIKE '%[ADMISSION ORDER%'
        AND NOT EXISTS (
          SELECT 1 FROM admissions ad
          WHERE ad.patient_id = a.patient_id
            AND (
              ad.status = 'Active'
              OR ad.admission_date >= a.created_at
            )
        )
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching pending admission orders:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/receptionist/admissions  (Admit patient from receptionist via sp_admit_patient)
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

    // Check if patient already has an active admission in any bed
    const [activeCheck] = await pool.query(
      `SELECT ad.admission_id, b.bed_number, w.ward_name
       FROM admissions ad
       LEFT JOIN beds b ON ad.bed_id = b.bed_id
       LEFT JOIN wards w ON ad.ward_id = w.ward_id
       WHERE ad.patient_id = ? AND ad.status = 'Active'
       LIMIT 1`,
      [pid]
    );

    if (activeCheck.length > 0) {
      const activeAdm = activeCheck[0];
      return res.status(400).json({
        success: false,
        message: `Patient is already actively admitted in ${activeAdm.ward_name || 'Ward'} (Bed ${activeAdm.bed_number || 'N/A'}). A patient cannot be admitted to multiple beds.`
      });
    }

    await pool.query('CALL sp_admit_patient(?,?,?,?,?,@aid,@bid)',
      [pid, wid, did, nid, reason || '']);
    const [[ids]] = await pool.query('SELECT @aid AS admission_id, @bid AS bed_id');

    // Fetch newly allocated bed and ward info for response message
    let bedDetails = null;
    if (ids && ids.bed_id) {
      const [[bRow]] = await pool.query(`
        SELECT b.bed_number, w.ward_name, w.ward_type, w.floor_number, w.daily_rate
        FROM beds b
        JOIN wards w ON b.ward_id = w.ward_id
        WHERE b.bed_id = ?
      `, [ids.bed_id]);
      bedDetails = bRow;
    }

    res.status(201).json({
      success: true,
      message: `Patient successfully admitted to ${bedDetails?.ward_name || 'Ward'} (Bed ${bedDetails?.bed_number || ''})`,
      data: {
        admission_id: ids.admission_id,
        bed_id: ids.bed_id,
        bed_number: bedDetails?.bed_number,
        ward_name: bedDetails?.ward_name,
        ward_type: bedDetails?.ward_type,
        floor_number: bedDetails?.floor_number,
        daily_rate: bedDetails?.daily_rate
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Admission failed' });
  }
});

// GET /api/receptionist/wards (with live occupancy)
router.get('/wards', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        w.ward_id, w.ward_name, w.ward_type,
        COALESCE(b_total.cnt, w.total_beds, 0) AS total_beds,
        COALESCE(b_avail.cnt, w.available_beds, 0) AS available_beds,
        w.floor_number, w.daily_rate,
        (COALESCE(b_total.cnt, w.total_beds, 0) - COALESCE(b_avail.cnt, w.available_beds, 0)) AS occupied_beds,
        IF(COALESCE(b_total.cnt, w.total_beds, 0) > 0,
          ROUND(((COALESCE(b_total.cnt, w.total_beds, 0) - COALESCE(b_avail.cnt, w.available_beds, 0)) / COALESCE(b_total.cnt, w.total_beds, 0)) * 100, 1),
          0
        ) AS occupancy_rate,
        CONCAT(nu.first_name, ' ', nu.last_name) AS nurse_in_charge_name
      FROM wards w
      LEFT JOIN (
        SELECT ward_id, COUNT(*) AS cnt
        FROM beds
        GROUP BY ward_id
      ) b_total ON w.ward_id = b_total.ward_id
      LEFT JOIN (
        SELECT ward_id, COUNT(*) AS cnt
        FROM beds
        WHERE status = 'Available'
        GROUP BY ward_id
      ) b_avail ON w.ward_id = b_avail.ward_id
      LEFT JOIN staff ns ON w.nurse_in_charge = ns.staff_id
      LEFT JOIN users nu ON ns.user_id = nu.user_id
      ORDER BY w.ward_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/receptionist/admissions/:id/discharge (Discharge patient and trigger bed release + final billing)
router.put('/admissions/:id/discharge', authenticateToken, authorizeRoles('receptionist','admin'), async (req, res) => {
  try {
    const {
      diagnosis_at_discharge,
      notes,
      generate_bill = true,
      doctor_fees = 0,
      hospital_fees = 0,
      discount = 0,
      tax_rate = 0
    } = req.body;
    const admissionId = parseInt(req.params.id, 10);

    const [existing] = await pool.query(
      `SELECT ad.admission_id, ad.status, ad.bed_id, ad.ward_id, ad.patient_id, ad.doctor_id,
              ad.admission_date,
              w.daily_rate
       FROM admissions ad
       LEFT JOIN wards w ON ad.ward_id = w.ward_id
       WHERE ad.admission_id = ?`,
      [admissionId]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }

    if (existing[0].status === 'Discharged') {
      return res.status(400).json({ success: false, message: 'Patient is already discharged' });
    }

    // 1. Updating status to 'Discharged' and discharge_date to NOW() fires database trigger trg_after_admission_update
    // which frees the bed (status = 'Available') and increments ward available beds
    await pool.query(
      "UPDATE admissions SET status='Discharged', discharge_date=NOW(), diagnosis_at_discharge=?, notes=? WHERE admission_id=?",
      [diagnosis_at_discharge || 'Discharged clinically stable', notes || '', admissionId]
    );

    let billId = null;
    let billDetails = null;

    // 2. Handle bill creation or finalization upon discharge
    if (generate_bill) {
      const [existingBills] = await pool.query(
        'SELECT bill_id FROM bills WHERE admission_id = ?',
        [admissionId]
      );

      if (existingBills.length === 0) {
        // Generate new final inpatient discharge invoice
        const staffId = req.user.staff_id || 4;
        await pool.query('CALL sp_generate_bill(?,?,?,?,?,?,?,?,@bid)', [
          existing[0].patient_id,
          staffId,
          null, // appointment_id
          admissionId,
          parseFloat(doctor_fees) || 0,
          Number(hospital_fees) || 0,
          parseFloat(discount) || 0,
          parseFloat(tax_rate) || 0
        ]);
        const [[{ bid }]] = await pool.query('SELECT @bid AS bid');
        billId = bid;
      } else {
        billId = existingBills[0].bill_id;
      }

      const [[stayDetails]] = await pool.query(
        `SELECT
           GREATEST(1, DATEDIFF(DATE(COALESCE(discharge_date, NOW())), DATE(admission_date))) AS billable_days,
           ROUND(
             GREATEST(1, DATEDIFF(DATE(COALESCE(discharge_date, NOW())), DATE(admission_date))) *
             COALESCE(w.daily_rate, 0),
             2
           ) AS ward_cost
         FROM admissions ad
         LEFT JOIN wards w ON w.ward_id = ad.ward_id
         WHERE ad.admission_id = ?`,
        [admissionId]
      );
      const hospitalFeeAmount = Math.max(0, Number(hospital_fees) || 0);
      const [[billAmounts]] = await pool.query(
        `SELECT doctor_fees, medicine_cost, lab_cost, discount, tax
         FROM bills WHERE bill_id = ?`,
        [billId]
      );
      const [[paymentTotals]] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payments WHERE bill_id = ?',
        [billId]
      );
      const totalAmount = Math.max(
        0,
        Number(billAmounts.doctor_fees || 0) +
          Number(billAmounts.medicine_cost || 0) +
          Number(billAmounts.lab_cost || 0) +
          Number(stayDetails.ward_cost || 0) +
          hospitalFeeAmount -
          Number(billAmounts.discount || 0) +
          Number(billAmounts.tax || 0)
      );
      const roundedTotal = Math.round((totalAmount + Number.EPSILON) * 100) / 100;
      const paidAmount = Number(paymentTotals.paid_amount || 0);
      const balanceAmount = Math.max(0, Math.round((roundedTotal - paidAmount + Number.EPSILON) * 100) / 100);
      const paymentStatus = paidAmount >= roundedTotal ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending';

      await pool.query(
        `UPDATE bills
         SET ward_cost = ?, hospital_fees = ?, total_amount = ?, paid_amount = ?,
             balance_amount = ?, payment_status = CASE
               WHEN payment_status = 'Cancelled' THEN 'Cancelled'
               ELSE ?
             END
         WHERE bill_id = ?`,
        [stayDetails.ward_cost, hospitalFeeAmount, roundedTotal, paidAmount, balanceAmount, paymentStatus, billId]
      );
      const [[finalBill]] = await pool.query(
        'SELECT bill_id, total_amount, ward_cost, balance_amount, payment_status FROM bills WHERE bill_id = ?',
        [billId]
      );
      billDetails = finalBill;
    }

    res.json({
      success: true,
      message: billDetails
        ? `Patient discharged! Bed freed. Final Discharge Bill #${billId} ready (Total: Rs. ${Number(billDetails.total_amount).toLocaleString()}).`
        : 'Patient successfully discharged. Bed has been freed and marked Available.',
      bill_id: billId,
      bill: billDetails
    });
  } catch (err) {
    console.error('Error discharging patient:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Discharge failed' });
  }
});

// ============================================================================
// APPOINTMENTS MANAGEMENT (FULL CRUD & BILLING INTEGRATION)
// ============================================================================

// GET /api/receptionist/appointments (with live patient, doctor, and billing details)
router.get('/appointments', authenticateToken, authorizeRoles('receptionist', 'admin'), async (req, res) => {
  try {
    const { search, doctor_id, status, date, start_date, end_date, billing_status } = req.query;

    let q = `
      SELECT 
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
        a.appointment_time,
        a.reason,
        a.status,
        a.appointment_type,
        a.guest_name,
        a.guest_phone,
        a.guest_email,
        a.notes,
        a.created_at,
        p.patient_code,
        p.blood_group,
        p.emergency_contact,
        p.emergency_contact_name,
        p.allergies,
        COALESCE(pu.first_name, a.guest_name) AS first_name,
        COALESCE(pu.last_name, '') AS last_name,
        COALESCE(CONCAT(pu.first_name, ' ', pu.last_name), a.guest_name) AS patient_name,
        COALESCE(pu.phone, a.guest_phone) AS patient_phone,
        COALESCE(pu.email, a.guest_email) AS patient_email,
        pu.gender AS patient_gender,
        TIMESTAMPDIFF(YEAR, pu.date_of_birth, CURDATE()) AS patient_age,
        CONCAT(du.first_name, ' ', du.last_name) AS doctor_name,
        ds.specialization AS doctor_specialization,
        d.dept_name,
        d.dept_id,
        b.bill_id,
        b.total_amount AS bill_total,
        b.paid_amount AS bill_paid,
        GREATEST(0, b.total_amount - b.paid_amount) AS bill_balance,
        b.payment_status AS bill_payment_status,
        DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users pu ON p.user_id = pu.user_id
      JOIN staff ds ON a.doctor_id = ds.staff_id
      JOIN users du ON ds.user_id = du.user_id
      JOIN departments d ON ds.dept_id = d.dept_id
      LEFT JOIN bills b ON b.appointment_id = a.appointment_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      q += ` AND (
        CONCAT(COALESCE(pu.first_name,''), ' ', COALESCE(pu.last_name,'')) LIKE ?
        OR a.guest_name LIKE ?
        OR p.patient_code LIKE ?
        OR pu.phone LIKE ?
        OR a.guest_phone LIKE ?
        OR CONCAT(du.first_name, ' ', du.last_name) LIKE ?
        OR a.appointment_id = ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, isNaN(search) ? -1 : Number(search));
    }

    if (doctor_id) {
      q += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    if (status && status !== 'ALL') {
      q += ' AND a.status = ?';
      params.push(status);
    }

    if (date) {
      q += ' AND a.appointment_date = ?';
      params.push(date);
    } else if (start_date && end_date) {
      q += ' AND a.appointment_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (billing_status && billing_status !== 'ALL') {
      if (billing_status === 'Paid') {
        q += " AND b.payment_status = 'Paid'";
      } else if (billing_status === 'Pending') {
        q += " AND b.payment_status = 'Pending'";
      } else if (billing_status === 'Unbilled') {
        q += ' AND b.bill_id IS NULL';
      }
    }

    q += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 250';

    const [rows] = await pool.query(q, params);

    // Compute receptionist appointment desk stats
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(CASE WHEN a.appointment_date = CURDATE() THEN 1 END) AS today_total,
        COUNT(CASE WHEN a.appointment_date = CURDATE() AND a.status = 'Confirmed' THEN 1 END) AS today_confirmed,
        COUNT(CASE WHEN a.appointment_date = CURDATE() AND a.status = 'Completed' THEN 1 END) AS today_completed,
        COUNT(CASE WHEN a.appointment_date = CURDATE() AND b.payment_status = 'Paid' THEN 1 END) AS today_billed,
        COALESCE(SUM(CASE WHEN a.appointment_date = CURDATE() THEN b.paid_amount ELSE 0 END), 0) AS today_revenue,
        COUNT(CASE WHEN b.bill_id IS NULL AND a.status IN ('Confirmed', 'Completed') THEN 1 END) AS total_unbilled
      FROM appointments a
      LEFT JOIN bills b ON b.appointment_id = a.appointment_id
    `);

    res.json({
      success: true,
      data: rows,
      stats: {
        today_total: Number(stats?.today_total || 0),
        today_confirmed: Number(stats?.today_confirmed || 0),
        today_completed: Number(stats?.today_completed || 0),
        today_billed: Number(stats?.today_billed || 0),
        today_revenue: Number(stats?.today_revenue || 0),
        total_unbilled: Number(stats?.total_unbilled || 0)
      }
    });
  } catch (err) {
    console.error('Error fetching receptionist appointments:', err);
    res.status(500).json({ success: false, message: 'Server error fetching appointments' });
  }
});

// POST /api/receptionist/appointments (Create appointment with existing/new patient + optional instant billing)
router.post('/appointments', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      patient_mode = 'existing',
      patient_id,
      // For new walk-in patient quick creation:
      first_name,
      last_name,
      email,
      phone,
      gender = 'Male',
      date_of_birth,
      blood_group = 'O+',
      address,
      emergency_contact,
      emergency_contact_name,
      allergies,
      // Appointment fields:
      doctor_id,
      appointment_date,
      appointment_time,
      appointment_type = 'Walk-in',
      reason = 'Clinical Consultation',
      notes,
      // Billing & payment options:
      generate_bill = false,
      doctor_fees = 2000,
      hospital_fees = 500,
      discount = 0,
      tax_rate = 0,
      is_paid = false,
      payment_method = 'Cash',
      transaction_reference = ''
    } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Doctor, Date, and Time slot are required.' });
    }

    // Verify receptionist staff ID
    let receptionistStaffId = req.user.staff_id;
    if (!receptionistStaffId) {
      const [staffRow] = await connection.query('SELECT staff_id FROM staff WHERE user_id = ?', [req.user.user_id]);
      if (staffRow.length) receptionistStaffId = staffRow[0].staff_id;
    }

    await connection.beginTransaction();

    let resolvedPatientId = patient_id;
    let patientName = '';

    if (patient_mode === 'new') {
      if (!first_name || !phone) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'First name and phone number are required for new patient registration.' });
      }

      // Check if user with phone or email already exists
      const patientEmail = email || `${first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Math.floor(1000 + Math.random() * 9000)}@clinic.com`;
      const username = `${first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;

      const [userResult] = await connection.query(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, gender, date_of_birth, address)
         VALUES (?, ?, '$2a$10$placeholder', 'patient', ?, ?, ?, ?, ?, ?)`,
        [username, patientEmail, first_name, last_name || '', phone, gender, date_of_birth || null, address || null]
      );
      const newUserId = userResult.insertId;
      const patientCode = `PAT${String(newUserId).padStart(6, '0')}`;

      const [patResult] = await connection.query(
        `INSERT INTO patients (user_id, patient_code, blood_group, emergency_contact, emergency_contact_name, allergies)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUserId, patientCode, blood_group, emergency_contact || null, emergency_contact_name || null, allergies || null]
      );
      resolvedPatientId = patResult.insertId;
      patientName = `${first_name} ${last_name || ''}`.trim();
    } else {
      if (!resolvedPatientId) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'Please select an existing patient.' });
      }

      const [pRows] = await connection.query(
        `SELECT p.patient_id, CONCAT(u.first_name, ' ', u.last_name) AS patient_name
         FROM patients p JOIN users u ON p.user_id = u.user_id
         WHERE p.patient_id = ?`,
        [resolvedPatientId]
      );
      if (!pRows.length) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ success: false, message: 'Selected patient not found.' });
      }
      patientName = pRows[0].patient_name;
    }

    // Check slot collision
    const [conflict] = await connection.query(
      `SELECT appointment_id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (conflict.length) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked for the selected doctor. Please select an available slot.'
      });
    }

    // Normalize appointment type
    const normalizedType = ['Online', 'Walk-in', 'Emergency'].includes(appointment_type)
      ? appointment_type
      : 'Walk-in';

    // Insert Appointment
    const [apptResult] = await connection.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, appointment_type, notes)
       VALUES (?, ?, ?, ?, ?, 'Confirmed', ?, ?)`,
      [resolvedPatientId, doctor_id, appointment_date, appointment_time, reason, normalizedType, notes || null]
    );
    const newAppointmentId = apptResult.insertId;

    // Optional Billing Integration
    let generatedBillId = null;
    let paymentProcessed = false;

    if (generate_bill && receptionistStaffId) {
      await connection.query(
        'CALL sp_generate_bill(?, ?, ?, NULL, ?, ?, ?, ?, @bid)',
        [resolvedPatientId, receptionistStaffId, newAppointmentId, doctor_fees, hospital_fees, discount || 0, tax_rate || 0]
      );
      const [[bidRow]] = await connection.query('SELECT @bid AS bid');
      generatedBillId = bidRow?.bid;

      if (generatedBillId && is_paid) {
        const [[billRow]] = await connection.query('SELECT total_amount FROM bills WHERE bill_id = ?', [generatedBillId]);
        const totalAmount = billRow?.total_amount || (Number(doctor_fees) + Number(hospital_fees));

        await connection.query(
          'CALL sp_process_payment(?, ?, ?, ?, ?)',
          [generatedBillId, totalAmount, payment_method || 'Cash', transaction_reference || `OPD-APPT-${newAppointmentId}`, receptionistStaffId]
        );
        paymentProcessed = true;
      }
    }

    await connection.commit();
    connection.release();

    let successMsg = `Appointment #${newAppointmentId} confirmed for ${patientName}!`;
    if (generatedBillId) {
      successMsg += paymentProcessed
        ? ` Consultation Invoice #${generatedBillId} generated and marked Paid (${payment_method}).`
        : ` Consultation Invoice #${generatedBillId} created (Pending in Billing).`;
    }

    res.status(201).json({
      success: true,
      message: successMsg,
      data: {
        appointment_id: newAppointmentId,
        patient_id: resolvedPatientId,
        bill_id: generatedBillId,
        is_paid: paymentProcessed
      }
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Error in receptionist create appointment:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Failed to create appointment' });
  }
});

// PUT /api/receptionist/appointments/:id (Reschedule / update appointment)
router.put('/appointments/:id', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id, appointment_date, appointment_time, appointment_type, reason, status, notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM appointments WHERE appointment_id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const current = existing[0];
    const targetDoctor = doctor_id || current.doctor_id;
    const targetDate = appointment_date || current.appointment_date;
    const targetTime = appointment_time || current.appointment_time;
    const targetStatus = status || current.status;
    const targetReason = reason !== undefined ? reason : current.reason;
    const targetNotes = notes !== undefined ? notes : current.notes;
    const targetType = ['Online', 'Walk-in', 'Emergency'].includes(appointment_type)
      ? appointment_type
      : current.appointment_type;

    // Check slot collision if rescheduling date/time/doctor
    if (
      (targetDoctor !== current.doctor_id || targetDate !== current.appointment_date || targetTime !== current.appointment_time) &&
      targetStatus !== 'Cancelled'
    ) {
      const [conflict] = await pool.query(
        `SELECT appointment_id FROM appointments
         WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND appointment_id != ? AND status != 'Cancelled'`,
        [targetDoctor, targetDate, targetTime, id]
      );
      if (conflict.length) {
        return res.status(409).json({
          success: false,
          message: 'The selected doctor is already booked at that date and time slot.'
        });
      }
    }

    await pool.query(
      `UPDATE appointments
       SET doctor_id = ?, appointment_date = ?, appointment_time = ?, reason = ?, status = ?, appointment_type = ?, notes = ?
       WHERE appointment_id = ?`,
      [targetDoctor, targetDate, targetTime, targetReason, targetStatus, targetType, targetNotes, id]
    );

    res.json({
      success: true,
      message: `Appointment #${id} updated successfully!`
    });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Failed to update appointment' });
  }
});

// DELETE /api/receptionist/appointments/:id (Safe cancellation or removal)
router.delete('/appointments/:id', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { id } = req.params;

    const [appts] = await pool.query('SELECT * FROM appointments WHERE appointment_id = ?', [id]);
    if (!appts.length) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check dependent records
    const [[{ records_count }]] = await pool.query(
      'SELECT COUNT(*) AS records_count FROM medical_records WHERE appointment_id = ?',
      [id]
    );
    const [[{ bills_count }]] = await pool.query(
      'SELECT COUNT(*) AS bills_count FROM bills WHERE appointment_id = ?',
      [id]
    );

    if (records_count > 0 || bills_count > 0) {
      // Compliance protection: safely cancel status
      await pool.query("UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = ?", [id]);
      return res.json({
        success: true,
        action: 'cancelled',
        message: `Appointment #${id} has associated clinical records or invoices. It has been safely marked as Cancelled to preserve audit history.`
      });
    }

    // Completely unlinked fresh record: safely delete
    await pool.query('DELETE FROM appointments WHERE appointment_id = ?', [id]);
    res.json({
      success: true,
      action: 'deleted',
      message: `Appointment #${id} removed successfully.`
    });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Failed to remove appointment' });
  }
});

// POST /api/receptionist/appointments/:id/bill (Instant OPD Consultation Billing & Payment)
router.post('/appointments/:id/bill', authenticateToken, authorizeRoles('receptionist'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      doctor_fees = 2000,
      hospital_fees = 500,
      discount = 0,
      tax_rate = 0,
      is_paid = false,
      payment_method = 'Cash',
      transaction_reference = ''
    } = req.body;

    const [appts] = await pool.query(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS patient_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.patient_id
       LEFT JOIN users u ON p.user_id = u.user_id
       WHERE a.appointment_id = ?`,
      [id]
    );
    if (!appts.length) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const appt = appts[0];

    // Check if bill already exists for this appointment
    const [existingBills] = await pool.query(
      'SELECT bill_id, total_amount, paid_amount, balance_amount, payment_status FROM bills WHERE appointment_id = ?',
      [id]
    );
    if (existingBills.length) {
      return res.status(400).json({
        success: false,
        message: `Invoice #${existingBills[0].bill_id} already exists for Appointment #${id}.`,
        bill: existingBills[0]
      });
    }

    // Resolve receptionist staff id
    let receptionistStaffId = req.user.staff_id;
    if (!receptionistStaffId) {
      const [staffRow] = await pool.query('SELECT staff_id FROM staff WHERE user_id = ?', [req.user.user_id]);
      if (staffRow.length) receptionistStaffId = staffRow[0].staff_id;
    }

    await pool.query(
      'CALL sp_generate_bill(?, ?, ?, NULL, ?, ?, ?, ?, @bid)',
      [appt.patient_id, receptionistStaffId, id, doctor_fees, hospital_fees, discount || 0, tax_rate || 0]
    );
    const [[bidRow]] = await pool.query('SELECT @bid AS bid');
    const billId = bidRow?.bid;

    let paymentDone = false;
    if (billId && is_paid) {
      const [[billRow]] = await pool.query('SELECT total_amount FROM bills WHERE bill_id = ?', [billId]);
      const totalAmount = billRow?.total_amount || (Number(doctor_fees) + Number(hospital_fees));

      await pool.query(
        'CALL sp_process_payment(?, ?, ?, ?, ?)',
        [billId, totalAmount, payment_method || 'Cash', transaction_reference || `OPD-APPT-${id}`, receptionistStaffId]
      );
      paymentDone = true;
    }

    res.status(201).json({
      success: true,
      message: paymentDone
        ? `Consultation Invoice #${billId} generated and marked Paid via ${payment_method}!`
        : `Consultation Invoice #${billId} generated and queued in Billing Desk!`,
      bill_id: billId,
      is_paid: paymentDone
    });
  } catch (err) {
    console.error('Error generating appointment bill:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || err.message || 'Failed to generate bill' });
  }
});

module.exports = router;

