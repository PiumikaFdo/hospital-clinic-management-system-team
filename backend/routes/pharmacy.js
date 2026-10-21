const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/pharmacy/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const [[{ low_stock }]] = await pool.query('SELECT fn_low_stock_count() AS low_stock');
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM prescriptions WHERE status='Pending'");
    const [[{ dispensed_today }]] = await pool.query(
      "SELECT COUNT(*) AS dispensed_today FROM prescriptions WHERE status='Dispensed' AND DATE(created_at)=CURDATE()"
    );
    const [low_meds] = await pool.query('SELECT * FROM vw_medicine_inventory WHERE stock_status IN ("Low Stock","Out of Stock") LIMIT 10');
    const [pending_presc] = await pool.query('SELECT * FROM vw_pending_prescriptions LIMIT 10');
    res.json({ success: true, data: { low_stock_count: low_stock, pending_prescriptions: pending, dispensed_today, low_stock_medicines: low_meds, recent_pending: pending_presc } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/prescriptions (utilizes idx_pharmacy_prescriptions_status_date)
router.get('/prescriptions', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { status, date, start_date, end_date, search } = req.query;
    let query = `
      SELECT p.prescription_id, p.prescription_date, p.status, p.total_cost, p.notes,
             CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pat.patient_code,
             CONCAT(du.first_name,' ',du.last_name) AS doctor_name,
             (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id=p.prescription_id) AS total_items
      FROM prescriptions p
      JOIN patients pat ON p.patient_id=pat.patient_id
      JOIN users pu ON pat.user_id=pu.user_id
      JOIN staff s ON p.doctor_id=s.staff_id
      JOIN users du ON s.user_id=du.user_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'ALL') { query += ' AND p.status = ?'; params.push(status); }
    if (date) { query += ' AND p.prescription_date = ?'; params.push(date); }
    if (start_date) { query += ' AND p.prescription_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND p.prescription_date <= ?'; params.push(end_date); }
    if (search) {
      query += ' AND (pu.first_name LIKE ? OR pu.last_name LIKE ? OR pat.patient_code LIKE ? OR du.first_name LIKE ? OR du.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    query += ' ORDER BY p.prescription_date DESC, p.prescription_id DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/prescriptions/:id
router.get('/prescriptions/:id', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM vw_prescription_details WHERE prescription_id=?', [req.params.id]);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/prescriptions/:id/dispense
router.post('/prescriptions/:id/dispense', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    await pool.query('CALL sp_dispense_prescription(?,?)', [req.params.id, req.user.user_id]);
    res.json({ success: true, message: 'Prescription dispensed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || 'Failed to dispense' });
  }
});

// GET /api/pharmacy/medicines (utilizes idx_pharmacy_medicines_stock_reorder)
router.get('/medicines', authenticateToken, authorizeRoles('pharmacist','admin'), async (req, res) => {
  try {
    const { stock_status, category, search } = req.query;
    let query = 'SELECT * FROM vw_medicine_inventory WHERE 1=1';
    const params = [];
    if (stock_status && stock_status !== 'ALL') {
      query += ' AND stock_status = ?';
      params.push(stock_status);
    }
    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (medicine_name LIKE ? OR generic_name LIKE ? OR brand LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    query += ' ORDER BY medicine_name';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/medicines  (add new medicine)
router.post('/medicines', authenticateToken, authorizeRoles('pharmacist','admin'), async (req, res) => {
  try {
    const { medicine_name, generic_name, brand, category, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, manufacturer } = req.body;
    const [result] = await pool.query(
      'INSERT INTO medicines (medicine_name,generic_name,brand,category,dosage_form,strength,unit_price,stock_quantity,reorder_level,expiry_date,manufacturer) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [medicine_name, generic_name, brand, category, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, manufacturer]
    );
    res.status(201).json({ success: true, message: 'Medicine added', medicine_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/pharmacy/medicines/:id  (update medicine)
router.put('/medicines/:id', authenticateToken, authorizeRoles('pharmacist','admin'), async (req, res) => {
  try {
    const { medicine_name, generic_name, brand, category, unit_price, reorder_level, expiry_date } = req.body;
    await pool.query(
      'UPDATE medicines SET medicine_name=?,generic_name=?,brand=?,category=?,unit_price=?,reorder_level=?,expiry_date=? WHERE medicine_id=?',
      [medicine_name, generic_name, brand, category, unit_price, reorder_level, expiry_date, req.params.id]
    );
    res.json({ success: true, message: 'Medicine updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/medicines/:id/stock  (update stock)
router.post('/medicines/:id/stock', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { quantity_change, change_type, notes } = req.body;
    await pool.query('CALL sp_update_medicine_stock(?,?,?,?,?)',
      [req.params.id, quantity_change, change_type, notes, req.user.user_id]);
    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.sqlMessage || 'Stock update failed' });
  }
});

// GET /api/pharmacy/stock-history (utilizes idx_pharmacy_stock_log_med_date)
router.get('/stock-history', authenticateToken, authorizeRoles('pharmacist','admin'), async (req, res) => {
  try {
    const { medicine_id, change_type, start_date, end_date, limit } = req.query;
    let query = `
      SELECT msl.*, m.medicine_name, m.dosage_form,
             CONCAT(u.first_name,' ',u.last_name) AS logged_by_name
      FROM medicine_stock_log msl
      JOIN medicines m ON msl.medicine_id = m.medicine_id
      LEFT JOIN users u ON msl.logged_by = u.user_id
      WHERE 1=1
    `;
    const params = [];
    if (medicine_id) { query += ' AND msl.medicine_id = ?'; params.push(medicine_id); }
    if (change_type && change_type !== 'ALL') { query += ' AND msl.change_type = ?'; params.push(change_type); }
    if (start_date) { query += ' AND DATE(msl.logged_at) >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND DATE(msl.logged_at) <= ?'; params.push(end_date); }
    query += ' ORDER BY msl.logged_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/report
router.get('/report', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { category } = req.query;
    const [result] = await pool.query('CALL sp_medicine_inventory_report(?)', [category || 'ALL']);
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
