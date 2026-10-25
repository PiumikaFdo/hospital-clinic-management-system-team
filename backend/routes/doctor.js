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

// Helper to safely find an unbooked time slot on CURDATE() for a doctor
async function getAvailableSlotForDoctor(doctorId) {
  const [existing] = await pool.query(
    'SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = CURDATE() AND status NOT IN ("Cancelled","No_Show")',
    [doctorId]
  );
  const taken = new Set(existing.map(e => String(e.appointment_time).slice(0, 5)));
  for (let h = 8; h <= 23; h++) {
    for (let m = 0; m < 60; m += 5) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!taken.has(timeStr)) {
        return `${timeStr}:00`;
      }
    }
  }
  return '23:59:00';
}

// POST /api/doctor/records  (add medical record + prescription)
router.post('/records', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const {
      patient_id, appointment_id, diagnosis, symptoms, treatment_plan,
      follow_up_date, record_notes, presc_notes, chief_complaint,
      medicine_ids, quantities, dosages, frequencies, durations
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }
    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: 'Clinical Diagnosis is required' });
    }

    let linkedAppointmentId = appointment_id || null;

    // If chief complaint is provided and appointment is linked, update appointment reason
    if (chief_complaint && linkedAppointmentId) {
      await pool.query(
        'UPDATE appointments SET reason = ? WHERE appointment_id = ? AND doctor_id = ?',
        [chief_complaint.trim(), linkedAppointmentId, req.user.staff_id]
      );
    } else if (chief_complaint && !linkedAppointmentId) {
      // Check if unlinked existing appointment exists for patient today
      const [existingAppt] = await pool.query(
        'SELECT appointment_id FROM appointments a WHERE a.patient_id = ? AND a.doctor_id = ? AND a.appointment_date = CURDATE() AND a.appointment_id NOT IN (SELECT appointment_id FROM medical_records WHERE appointment_id IS NOT NULL) ORDER BY a.appointment_id DESC LIMIT 1',
        [patient_id, req.user.staff_id]
      );
      if (existingAppt.length > 0) {
        linkedAppointmentId = existingAppt[0].appointment_id;
        await pool.query(
          'UPDATE appointments SET reason = ?, status = "Completed" WHERE appointment_id = ? AND doctor_id = ?',
          [chief_complaint.trim(), linkedAppointmentId, req.user.staff_id]
        );
      } else {
        const slot = await getAvailableSlotForDoctor(req.user.staff_id);
        const [newAppt] = await pool.query(
          `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, notes)
           VALUES (?, ?, CURDATE(), ?, ?, 'Completed', 'Consultation linked appointment')`,
          [patient_id, req.user.staff_id, slot, chief_complaint.trim()]
        );
        linkedAppointmentId = newAppt.insertId;
      }
    }

    const formattedFollowUpDate = follow_up_date && String(follow_up_date).trim() ? String(follow_up_date).trim() : null;

    await pool.query(
      'CALL sp_add_medical_record_with_prescription(?,?,?,?,?,?,?,?,?,?,?,?,?,?,@rid,@pid)',
      [
        patient_id, req.user.staff_id, linkedAppointmentId, diagnosis.trim(), symptoms || null,
        treatment_plan || null, formattedFollowUpDate, record_notes || null, presc_notes || null,
        JSON.stringify(medicine_ids || []), JSON.stringify(quantities || []),
        JSON.stringify(dosages || []), JSON.stringify(frequencies || []),
        JSON.stringify(durations || [])
      ]
    );
    const [[ids]] = await pool.query('SELECT @rid AS record_id, @pid AS prescription_id');
    res.status(201).json({ success: true, message: 'Medical record and consultation saved', data: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// POST /api/doctor/consultations (alias for creating consultations)
router.post('/consultations', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const {
      patient_id, appointment_id, diagnosis, symptoms, treatment_plan,
      follow_up_date, notes, record_notes, presc_notes, chief_complaint,
      medicine_ids, quantities, dosages, frequencies, durations
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }
    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: 'Clinical Diagnosis is required' });
    }

    let linkedAppointmentId = appointment_id || null;

    if (chief_complaint && linkedAppointmentId) {
      await pool.query(
        'UPDATE appointments SET reason = ? WHERE appointment_id = ? AND doctor_id = ?',
        [chief_complaint.trim(), linkedAppointmentId, req.user.staff_id]
      );
    } else if (chief_complaint && !linkedAppointmentId) {
      const [existingAppt] = await pool.query(
        'SELECT appointment_id FROM appointments a WHERE a.patient_id = ? AND a.doctor_id = ? AND a.appointment_date = CURDATE() AND a.appointment_id NOT IN (SELECT appointment_id FROM medical_records WHERE appointment_id IS NOT NULL) ORDER BY a.appointment_id DESC LIMIT 1',
        [patient_id, req.user.staff_id]
      );
      if (existingAppt.length > 0) {
        linkedAppointmentId = existingAppt[0].appointment_id;
        await pool.query(
          'UPDATE appointments SET reason = ?, status = "Completed" WHERE appointment_id = ? AND doctor_id = ?',
          [chief_complaint.trim(), linkedAppointmentId, req.user.staff_id]
        );
      } else {
        const slot = await getAvailableSlotForDoctor(req.user.staff_id);
        const [newAppt] = await pool.query(
          `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, notes)
           VALUES (?, ?, CURDATE(), ?, ?, 'Completed', 'Consultation linked appointment')`,
          [patient_id, req.user.staff_id, slot, chief_complaint.trim()]
        );
        linkedAppointmentId = newAppt.insertId;
      }
    }

    const noteText = notes || record_notes || null;
    const formattedFollowUpDate = follow_up_date && String(follow_up_date).trim() ? String(follow_up_date).trim() : null;

    await pool.query(
      'CALL sp_add_medical_record_with_prescription(?,?,?,?,?,?,?,?,?,?,?,?,?,?,@rid,@pid)',
      [
        patient_id, req.user.staff_id, linkedAppointmentId, diagnosis.trim(), symptoms || null,
        treatment_plan || null, formattedFollowUpDate, noteText, presc_notes || noteText,
        JSON.stringify(medicine_ids || []), JSON.stringify(quantities || []),
        JSON.stringify(dosages || []), JSON.stringify(frequencies || []),
        JSON.stringify(durations || [])
      ]
    );
    const [[ids]] = await pool.query('SELECT @rid AS record_id, @pid AS prescription_id');
    res.status(201).json({ success: true, message: 'Consultation saved successfully', data: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// GET /api/doctor/consultations (searchable, filterable, paginated consultation list with patient details)
router.get('/consultations', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const staff_id = req.user.staff_id;
    const { search, date, start_date, end_date, patient_id, page = 1, limit = 10, all } = req.query;

    let baseQuery = `
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.patient_id
      JOIN users pu ON p.user_id = pu.user_id
      LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.doctor_id = ?
    `;
    const params = [staff_id];

    if (patient_id) {
      baseQuery += ' AND mr.patient_id = ?';
      params.push(patient_id);
    }
    if (date) {
      baseQuery += ' AND (DATE(mr.created_at) = ? OR a.appointment_date = ?)';
      params.push(date, date);
    }
    if (start_date) {
      baseQuery += ' AND DATE(mr.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      baseQuery += ' AND DATE(mr.created_at) <= ?';
      params.push(end_date);
    }
    if (search) {
      baseQuery += ` AND (
        pu.first_name LIKE ? OR 
        pu.last_name LIKE ? OR 
        CONCAT(pu.first_name, ' ', pu.last_name) LIKE ? OR 
        p.patient_code LIKE ? OR 
        pu.phone LIKE ? OR 
        mr.diagnosis LIKE ? OR 
        mr.symptoms LIKE ? OR 
        a.reason LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    // Count matching records for pagination
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);

    // Fetch records
    let selectQuery = `
      SELECT 
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.appointment_id,
        mr.diagnosis,
        mr.symptoms,
        mr.treatment_plan,
        DATE_FORMAT(mr.follow_up_date, '%Y-%m-%d') AS follow_up_date,
        mr.notes,
        mr.created_at,
        p.patient_code,
        p.blood_group,
        p.allergies,
        CONCAT(pu.first_name, ' ', pu.last_name) AS patient_name,
        pu.phone,
        pu.gender,
        pu.date_of_birth,
        fn_get_patient_age(p.patient_id) AS age,
        a.appointment_date,
        a.appointment_time,
        COALESCE(a.reason, '') AS chief_complaint,
        (SELECT COUNT(*) FROM prescriptions pr WHERE pr.record_id = mr.record_id) AS prescription_count
      ${baseQuery}
      ORDER BY mr.created_at DESC, mr.record_id DESC
    `;

    if (all === 'true') {
      const [rows] = await pool.query(selectQuery, params);
      return res.json({
        success: true,
        data: rows,
        pagination: { total, page: 1, limit: total, totalPages: 1 }
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    selectQuery += ' LIMIT ? OFFSET ?';
    const [rows] = await pool.query(selectQuery, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctor/follow-ups (consultations with follow_up_date and status filters: all, today, upcoming, overdue)
router.get('/follow-ups', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const staff_id = req.user.staff_id;
    const { status = 'all', search, page = 1, limit = 10 } = req.query;

    let statusCondition = 'mr.follow_up_date IS NOT NULL';
    if (status === 'today') {
      statusCondition += ' AND mr.follow_up_date = CURDATE()';
    } else if (status === 'upcoming') {
      statusCondition += ' AND mr.follow_up_date > CURDATE()';
    } else if (status === 'overdue') {
      statusCondition += ' AND mr.follow_up_date < CURDATE()';
    }

    let baseQuery = `
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.patient_id
      JOIN users pu ON p.user_id = pu.user_id
      LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.doctor_id = ? AND ${statusCondition}
    `;
    const params = [staff_id];

    if (search) {
      baseQuery += ` AND (
        pu.first_name LIKE ? OR 
        pu.last_name LIKE ? OR 
        CONCAT(pu.first_name, ' ', pu.last_name) LIKE ? OR 
        p.patient_code LIKE ? OR 
        pu.phone LIKE ? OR 
        mr.diagnosis LIKE ? OR 
        mr.symptoms LIKE ? OR 
        a.reason LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    // Live counts for All, Today, Upcoming, and Overdue
    const [countsResult] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN follow_up_date IS NOT NULL THEN 1 END) AS \`all\`,
        COUNT(CASE WHEN follow_up_date = CURDATE() THEN 1 END) AS \`today\`,
        COUNT(CASE WHEN follow_up_date > CURDATE() THEN 1 END) AS \`upcoming\`,
        COUNT(CASE WHEN follow_up_date < CURDATE() THEN 1 END) AS \`overdue\`
      FROM medical_records
      WHERE doctor_id = ?
    `, [staff_id]);

    const counts = {
      all: countsResult[0]?.all || 0,
      today: countsResult[0]?.today || 0,
      upcoming: countsResult[0]?.upcoming || 0,
      overdue: countsResult[0]?.overdue || 0
    };

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const selectQuery = `
      SELECT 
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.appointment_id,
        mr.diagnosis,
        mr.symptoms,
        mr.treatment_plan,
        DATE_FORMAT(mr.follow_up_date, '%Y-%m-%d') AS follow_up_date,
        mr.notes,
        mr.created_at,
        p.patient_code,
        p.blood_group,
        p.allergies,
        CONCAT(pu.first_name, ' ', pu.last_name) AS patient_name,
        pu.phone,
        pu.gender,
        pu.date_of_birth,
        fn_get_patient_age(p.patient_id) AS age,
        a.appointment_date,
        a.appointment_time,
        COALESCE(a.reason, '') AS chief_complaint,
        DATEDIFF(mr.follow_up_date, CURDATE()) AS days_diff,
        CASE
          WHEN mr.follow_up_date = CURDATE() THEN 'Today'
          WHEN mr.follow_up_date > CURDATE() THEN 'Upcoming'
          WHEN mr.follow_up_date < CURDATE() THEN 'Overdue'
          ELSE 'None'
        END AS follow_up_category,
        (SELECT COUNT(*) FROM prescriptions pr WHERE pr.record_id = mr.record_id) AS prescription_count
      ${baseQuery}
      ORDER BY 
        CASE 
          WHEN mr.follow_up_date = CURDATE() THEN 1
          WHEN mr.follow_up_date < CURDATE() THEN 2
          ELSE 3
        END,
        mr.follow_up_date ASC,
        mr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(selectQuery, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: rows,
      counts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctor/consultations/:id (single consultation details with patient info and linked prescriptions)
router.get('/consultations/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { staff_id } = req.user;
    const [rows] = await pool.query(`
      SELECT 
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.appointment_id,
        mr.diagnosis,
        mr.symptoms,
        mr.treatment_plan,
        DATE_FORMAT(mr.follow_up_date, '%Y-%m-%d') AS follow_up_date,
        mr.notes,
        mr.created_at,
        p.patient_code,
        p.blood_group,
        p.allergies,
        CONCAT(pu.first_name, ' ', pu.last_name) AS patient_name,
        pu.phone,
        pu.gender,
        pu.date_of_birth,
        fn_get_patient_age(p.patient_id) AS age,
        a.appointment_date,
        a.appointment_time,
        COALESCE(a.reason, '') AS chief_complaint
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.patient_id
      JOIN users pu ON p.user_id = pu.user_id
      LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.record_id = ? AND mr.doctor_id = ?
    `, [req.params.id, staff_id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Consultation record not found or access denied' });
    }

    const consultation = rows[0];

    // Fetch linked prescriptions and items
    const [prescriptions] = await pool.query(`
      SELECT 
        pr.prescription_id,
        pr.prescription_date,
        pr.status,
        pr.total_cost,
        pr.notes AS presc_notes,
        pi.item_id,
        pi.medicine_id,
        pi.dosage,
        pi.frequency,
        pi.duration,
        pi.quantity,
        pi.unit_price,
        m.medicine_name,
        m.dosage_form,
        m.strength
      FROM prescriptions pr
      LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
      LEFT JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pr.record_id = ?
    `, [req.params.id]);

    const groupedPrescriptions = {};
    for (const row of prescriptions) {
      if (!groupedPrescriptions[row.prescription_id]) {
        groupedPrescriptions[row.prescription_id] = {
          prescription_id: row.prescription_id,
          prescription_date: row.prescription_date,
          status: row.status,
          total_cost: row.total_cost,
          notes: row.presc_notes,
          items: []
        };
      }
      if (row.item_id) {
        groupedPrescriptions[row.prescription_id].items.push({
          item_id: row.item_id,
          medicine_id: row.medicine_id,
          medicine_name: row.medicine_name,
          dosage_form: row.dosage_form,
          strength: row.strength,
          dosage: row.dosage,
          frequency: row.frequency,
          duration: row.duration,
          quantity: row.quantity,
          unit_price: row.unit_price
        });
      }
    }

    consultation.prescriptions = Object.values(groupedPrescriptions);
    consultation.prescription_count = consultation.prescriptions.length;

    res.json({ success: true, data: consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/doctor/consultations/:id (edit all six fields: chief complaint, symptoms, diagnosis, treatment plan, notes, follow-up date)
router.put('/consultations/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { staff_id } = req.user;
    const { id } = req.params;
    const {
      chief_complaint,
      symptoms,
      diagnosis,
      treatment_plan,
      notes,
      follow_up_date
    } = req.body;

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: 'Clinical Diagnosis is required' });
    }

    // Verify record exists and belongs to this doctor
    const [existing] = await pool.query(
      'SELECT record_id, patient_id, appointment_id FROM medical_records WHERE record_id = ? AND doctor_id = ?',
      [id, staff_id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Consultation record not found or access denied' });
    }

    const currentRecord = existing[0];
    const validFollowUpDate = follow_up_date && String(follow_up_date).trim() ? String(follow_up_date).trim() : null;

    // Update medical_records
    await pool.query(
      `UPDATE medical_records 
       SET diagnosis = ?,
           symptoms = ?,
           treatment_plan = ?,
           notes = ?,
           follow_up_date = ?
       WHERE record_id = ? AND doctor_id = ?`,
      [
        diagnosis.trim(),
        symptoms !== undefined ? (symptoms ? String(symptoms).trim() : '') : null,
        treatment_plan !== undefined ? (treatment_plan ? String(treatment_plan).trim() : '') : null,
        notes !== undefined ? (notes ? String(notes).trim() : '') : null,
        validFollowUpDate,
        id,
        staff_id
      ]
    );

    // Update or link chief complaint
    if (chief_complaint !== undefined) {
      const cleanComplaint = chief_complaint ? String(chief_complaint).trim() : '';
      if (currentRecord.appointment_id) {
        await pool.query(
          'UPDATE appointments SET reason = ? WHERE appointment_id = ? AND doctor_id = ?',
          [cleanComplaint, currentRecord.appointment_id, staff_id]
        );
      } else if (cleanComplaint) {
        const slot = await getAvailableSlotForDoctor(staff_id);
        const [apptRes] = await pool.query(
          `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, notes)
           VALUES (?, ?, CURDATE(), ?, ?, 'Completed', 'Consultation linked appointment')`,
          [currentRecord.patient_id, staff_id, slot, cleanComplaint]
        );
        await pool.query(
          'UPDATE medical_records SET appointment_id = ? WHERE record_id = ?',
          [apptRes.insertId, id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Consultation updated successfully',
      data: {
        record_id: parseInt(id, 10),
        diagnosis: diagnosis.trim(),
        symptoms: symptoms ? String(symptoms).trim() : '',
        treatment_plan: treatment_plan ? String(treatment_plan).trim() : '',
        notes: notes ? String(notes).trim() : '',
        follow_up_date: validFollowUpDate,
        chief_complaint: chief_complaint ? String(chief_complaint).trim() : ''
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/doctor/consultations/:id (safe delete with prescription check and friendly error message)
router.delete('/consultations/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { staff_id } = req.user;
    const { id } = req.params;

    // Check if record exists and belongs to this doctor
    const [records] = await pool.query(
      'SELECT record_id, patient_id, appointment_id FROM medical_records WHERE record_id = ? AND doctor_id = ?',
      [id, staff_id]
    );

    if (!records.length) {
      return res.status(404).json({ success: false, message: 'Consultation record not found or access denied' });
    }

    // Safely check for linked prescriptions before deleting
    const [prescriptions] = await pool.query(
      'SELECT prescription_id, status FROM prescriptions WHERE record_id = ?',
      [id]
    );

    if (prescriptions.length > 0) {
      return res.status(400).json({
        success: false,
        has_prescriptions: true,
        prescription_count: prescriptions.length,
        message: `Cannot delete consultation: This consultation has ${prescriptions.length} linked prescription(s). To preserve pharmaceutical dispensing records and clinical audit integrity, consultations with linked prescriptions cannot be deleted.`
      });
    }

    // Delete consultation safely
    await pool.query(
      'DELETE FROM medical_records WHERE record_id = ? AND doctor_id = ?',
      [id, staff_id]
    );

    res.json({
      success: true,
      message: 'Consultation record deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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

// POST /api/doctor/admission-order (Create doctor's inpatient admission order)
router.post('/admission-order', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      patient_id,
      ward_category, // 'General', 'ICU', 'Pediatric', 'Maternity', 'Private'
      priority,      // 'Routine', 'Urgent', 'Emergency'
      reason,        // Clinical admission reason / diagnosis
      instructions   // Initial instructions for ward staff
    } = req.body;

    const doctor_id = req.user.staff_id;

    if (!patient_id || !ward_category || !priority || !reason?.trim()) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Patient, ward category, priority, and clinical admission reason are required.'
      });
    }

    const validWardCategories = ['General', 'ICU', 'Pediatric', 'Maternity', 'Private'];
    if (!validWardCategories.includes(ward_category)) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid ward category selected.'
      });
    }

    const validPriorities = ['Routine', 'Urgent', 'Emergency'];
    if (!validPriorities.includes(priority)) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid admission priority selected.'
      });
    }

    // Build standardized clinical reason string that integrates directly into Receptionist Auto-fill
    const formattedReason = `[ADMISSION ORDER - ${priority.toUpperCase()}] Ward Category: ${ward_category} | Indication: ${reason.trim()}${instructions?.trim() ? ` | Staff Instructions: ${instructions.trim()}` : ''}`;

    const apptType = priority === 'Emergency' ? 'Emergency' : 'Walk-in';

    // Query top appointment date for this patient to ensure ranking first in receptionist recent consultation query
    const [[maxRow]] = await connection.query(`
      SELECT GREATEST(CURDATE(), COALESCE(MAX(appointment_date), CURDATE())) AS top_date
      FROM appointments
      WHERE patient_id = ?
    `, [patient_id]);
    const orderDate = maxRow?.top_date;

    // 1. Insert appointment record (guarantees GET /receptionist/patients/:id/recent-consultation selects this as the most recent order)
    const [apptResult] = await connection.query(`
      INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time,
        reason, status, appointment_type, notes
      ) VALUES (?, ?, ?, '23:59:59', ?, 'Confirmed', ?, ?)
    `, [
      patient_id,
      doctor_id,
      orderDate,
      formattedReason,
      apptType,
      `DOCTOR ADMISSION ORDER\nPriority: ${priority}\nWard Category: ${ward_category}\nDiagnosis: ${reason.trim()}\nStaff Instructions: ${instructions?.trim() || 'Standard ward observation and care'}`
    ]);

    const appointment_id = apptResult.insertId;

    // 2. Insert into medical_records for permanent clinical history
    await connection.query(`
      INSERT INTO medical_records (
        patient_id, doctor_id, appointment_id,
        diagnosis, symptoms, treatment_plan, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      doctor_id,
      appointment_id,
      `Inpatient Admission Order (${priority}): ${reason.trim()}`,
      `Clinical indication for ${ward_category} Ward admission`,
      `Admission Ward: ${ward_category} | Priority: ${priority} | Staff Orders: ${instructions?.trim() || 'Standard monitoring'}`,
      `Admission order placed by attending doctor (Staff #${doctor_id}).`
    ]);

    // 3. Update patient's medical history summary
    await connection.query(`
      UPDATE patients
      SET medical_history = CONCAT(
        IF(medical_history IS NULL OR medical_history = '', '', CONCAT(medical_history, ' | ')),
        ?
      )
      WHERE patient_id = ?
    `, [
      `[Admission Order - ${new Date().toISOString().split('T')[0]}: ${ward_category} Ward (${priority})]`,
      patient_id
    ]);

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: `Doctor's Inpatient Admission Order for ${ward_category} Ward (${priority}) placed successfully! Ready for Receptionist Bed Allocation.`,
      data: {
        appointment_id,
        patient_id,
        doctor_id,
        ward_category,
        priority,
        reason: formattedReason
      }
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Error creating doctor admission order:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Failed to create admission order' });
  }
});

module.exports = router;

