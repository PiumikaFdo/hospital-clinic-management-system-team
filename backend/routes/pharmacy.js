const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ============================================================
// 1. PHARMACY DASHBOARD
// ============================================================
// GET /api/pharmacy/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const [[{ low_stock }]] = await pool.query('SELECT fn_low_stock_count() AS low_stock');
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM prescriptions WHERE status='Pending'");
    const [[{ dispensed_today }]] = await pool.query(
      "SELECT COUNT(*) AS dispensed_today FROM prescriptions WHERE status='Dispensed' AND DATE(created_at)=CURDATE()"
    );
    const [[{ total_active_medicines }]] = await pool.query(
      "SELECT COUNT(*) AS total_active_medicines FROM medicines WHERE is_active = TRUE"
    );
    const [[{ out_of_stock }]] = await pool.query(
      "SELECT COUNT(*) AS out_of_stock FROM medicines WHERE is_active = TRUE AND stock_quantity = 0"
    );

    const [low_meds] = await pool.query(
      'SELECT * FROM vw_medicine_inventory WHERE stock_status IN ("Low Stock","Out of Stock") LIMIT 10'
    );
    const [pending_presc] = await pool.query(
      'SELECT * FROM vw_pending_prescriptions LIMIT 10'
    );

    res.json({
      success: true,
      data: {
        low_stock_count: low_stock,
        pending_prescriptions: pending,
        dispensed_today,
        total_active_medicines,
        out_of_stock_count: out_of_stock,
        low_stock_medicines: low_meds,
        recent_pending: pending_presc
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// 2. PRESCRIPTIONS CRUD & MANAGEMENT
// ============================================================

// GET /api/pharmacy/prescriptions (List with filters)
router.get('/prescriptions', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { status, date, start_date, end_date, search } = req.query;
    let query = `
      SELECT p.prescription_id, p.prescription_date, p.status, p.total_cost, p.notes,
             CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pat.patient_code,
             pat.allergies, pat.blood_group,
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
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/prescriptions/:id (Get prescription details & items)
router.get('/prescriptions/:id', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const [header] = await pool.query(
      `SELECT p.prescription_id, p.prescription_date, p.status, p.total_cost, p.notes, p.created_at,
              CONCAT(pu.first_name,' ',pu.last_name) AS patient_name, pat.patient_id, pat.patient_code,
              pat.blood_group, pat.allergies, pu.phone AS patient_phone,
              CONCAT(du.first_name,' ',du.last_name) AS doctor_name, s.specialization
       FROM prescriptions p
       JOIN patients pat ON p.patient_id = pat.patient_id
       JOIN users pu ON pat.user_id = pu.user_id
       JOIN staff s ON p.doctor_id = s.staff_id
       JOIN users du ON s.user_id = du.user_id
       WHERE p.prescription_id = ?`,
      [req.params.id]
    );

    if (header.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const [items] = await pool.query(
      `SELECT vd.*, 
              m.medicine_id,
              m.stock_quantity,
              m.category,
              m.dosage_form,
              m.strength,
              fn_is_medicine_in_stock(m.medicine_id, vd.quantity) AS in_stock,
              pat.patient_code,
              pat.blood_group,
              pat.allergies
       FROM vw_prescription_details vd
       JOIN prescription_items pi ON vd.item_id = pi.item_id
       JOIN medicines m ON pi.medicine_id = m.medicine_id
       JOIN patients pat ON vd.patient_id = pat.patient_id
       WHERE vd.prescription_id = ?`,
      [req.params.id]
    );

    // Compute total using stored function fn_prescription_total
    let computed_total = 0;
    try {
      const [[calc]] = await pool.query('SELECT fn_prescription_total(?) AS total', [req.params.id]);
      computed_total = calc?.total ?? header[0].total_cost;
    } catch (e) {
      computed_total = header[0].total_cost;
    }

    res.json({
      success: true,
      prescription: header[0],
      data: items,
      computed_total
    });
  } catch (err) {
    console.error('Error fetching prescription items:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/prescriptions/:id/dispense (Dispense prescription with atomic procedure)
router.post('/prescriptions/:id/dispense', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const { notes } = req.body;

    // 1. Check current status
    const [prescriptions] = await pool.query(
      'SELECT prescription_id, status FROM prescriptions WHERE prescription_id = ?',
      [prescriptionId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const prescription = prescriptions[0];
    if (prescription.status === 'Dispensed') {
      return res.status(400).json({ success: false, message: 'Prescription is already dispensed' });
    }
    if (prescription.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot dispense a cancelled prescription' });
    }

    // 2. Validate inventory using stored function fn_is_medicine_in_stock
    const [items] = await pool.query(
      `SELECT pi.medicine_id, pi.quantity, m.medicine_name, m.stock_quantity,
              fn_is_medicine_in_stock(pi.medicine_id, pi.quantity) AS in_stock
       FROM prescription_items pi
       JOIN medicines m ON pi.medicine_id = m.medicine_id
       WHERE pi.prescription_id = ?`,
      [prescriptionId]
    );

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Prescription has no items to dispense' });
    }

    const outOfStock = items.filter(item => !item.in_stock);
    if (outOfStock.length > 0) {
      const details = outOfStock
        .map(i => `${i.medicine_name} (Requested: ${i.quantity}, In Stock: ${i.stock_quantity})`)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for: ${details}`
      });
    }

    // 3. Execute atomic stored procedure to deduct stock and update status
    await pool.query('CALL sp_dispense_prescription(?,?)', [prescriptionId, req.user.user_id]);

    // 4. Optionally record pharmacist dispensing notes in stock log
    if (notes && notes.trim()) {
      await pool.query(
        "UPDATE medicine_stock_log SET notes = ? WHERE reference_type = 'PRESCRIPTION' AND reference_id = ?",
        [notes.trim(), prescriptionId]
      );
    }

    res.json({ success: true, message: 'Prescription dispensed successfully' });
  } catch (err) {
    console.error('Error dispensing prescription:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || 'Failed to dispense' });
  }
});

// PUT /api/pharmacy/prescriptions/:id/cancel (Cancel / Reject Prescription with Reason)
router.put('/prescriptions/:id/cancel', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const { reason } = req.body;

    const [prescriptions] = await pool.query(
      'SELECT prescription_id, status, notes FROM prescriptions WHERE prescription_id = ?',
      [prescriptionId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const prescription = prescriptions[0];
    if (prescription.status === 'Dispensed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already dispensed prescription' });
    }
    if (prescription.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Prescription is already cancelled' });
    }

    const cancelReasonText = reason ? reason.trim() : 'Cancelled by pharmacist';
    const appendNote = `[CANCELLED by Pharmacist: ${cancelReasonText}]`;
    const finalNotes = prescription.notes ? `${prescription.notes}\n${appendNote}` : appendNote;

    await pool.query(
      'UPDATE prescriptions SET status = "Cancelled", notes = ? WHERE prescription_id = ?',
      [finalNotes, prescriptionId]
    );

    res.json({ success: true, message: 'Prescription cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling prescription:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ============================================================
// 3. MEDICINES INVENTORY CRUD
// ============================================================

// GET /api/pharmacy/medicines (List medicines with filters & active/archived toggle)
router.get('/medicines', authenticateToken, authorizeRoles('pharmacist', 'admin', 'doctor'), async (req, res) => {
  try {
    const { stock_status, category, search, active_filter } = req.query;
    
    // If user wants archived or all, query medicines directly; otherwise use view vw_medicine_inventory
    let query = '';
    const params = [];

    if (active_filter === 'archived') {
      query = `
        SELECT m.medicine_id, m.medicine_name, m.generic_name, m.brand,
               m.category, m.dosage_form, m.strength, m.unit_price,
               m.stock_quantity, m.reorder_level, m.expiry_date, m.manufacturer,
               m.is_active,
               CASE
                   WHEN m.stock_quantity = 0 THEN 'Out of Stock'
                   WHEN m.stock_quantity <= m.reorder_level THEN 'Low Stock'
                   WHEN DATEDIFF(m.expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                   ELSE 'Available'
               END AS stock_status,
               DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry
        FROM medicines m
        WHERE m.is_active = FALSE
      `;
    } else if (active_filter === 'all') {
      query = `
        SELECT m.medicine_id, m.medicine_name, m.generic_name, m.brand,
               m.category, m.dosage_form, m.strength, m.unit_price,
               m.stock_quantity, m.reorder_level, m.expiry_date, m.manufacturer,
               m.is_active,
               CASE
                   WHEN m.stock_quantity = 0 THEN 'Out of Stock'
                   WHEN m.stock_quantity <= m.reorder_level THEN 'Low Stock'
                   WHEN DATEDIFF(m.expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                   ELSE 'Available'
               END AS stock_status,
               DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry
        FROM medicines m
        WHERE 1=1
      `;
    } else {
      // Default: Active medicines via vw_medicine_inventory
      query = 'SELECT *, 1 AS is_active FROM vw_medicine_inventory WHERE 1=1';
    }

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
    console.error('Error fetching medicines:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/medicines/:id (Single medicine full profile + stock history + availability)
router.get('/medicines/:id', authenticateToken, authorizeRoles('pharmacist', 'admin', 'doctor'), async (req, res) => {
  try {
    const medicineId = req.params.id;
    const [meds] = await pool.query(
      `SELECT m.*,
              CASE
                  WHEN m.stock_quantity = 0 THEN 'Out of Stock'
                  WHEN m.stock_quantity <= m.reorder_level THEN 'Low Stock'
                  WHEN DATEDIFF(m.expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                  ELSE 'Available'
              END AS stock_status,
              DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry,
              fn_is_medicine_in_stock(m.medicine_id, 1) AS has_stock
       FROM medicines m
       WHERE m.medicine_id = ?`,
      [medicineId]
    );

    if (meds.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    // Fetch recent stock movements from view
    const [history] = await pool.query(
      `SELECT * FROM vw_medicine_stock_history WHERE medicine_id = ? ORDER BY logged_at DESC LIMIT 10`,
      [medicineId]
    );

    // Fetch total dispensed statistics
    const [[stats]] = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total_dispensed_qty,
              COUNT(DISTINCT prescription_id) AS total_prescriptions_count
       FROM prescription_items
       WHERE medicine_id = ?`,
      [medicineId]
    );

    res.json({
      success: true,
      data: meds[0],
      stock_history: history,
      statistics: stats
    });
  } catch (err) {
    console.error('Error fetching single medicine:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pharmacy/medicines (Add new medicine)
router.post('/medicines', authenticateToken, authorizeRoles('pharmacist', 'admin'), async (req, res) => {
  try {
    const {
      medicine_name,
      generic_name,
      brand,
      category,
      dosage_form,
      strength,
      unit_price,
      stock_quantity,
      reorder_level,
      expiry_date,
      manufacturer,
      description
    } = req.body;

    if (!medicine_name || !unit_price) {
      return res.status(400).json({ success: false, message: 'Medicine name and unit price are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO medicines 
       (medicine_name, generic_name, brand, category, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, manufacturer, description, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
      [
        medicine_name,
        generic_name || null,
        brand || null,
        category || null,
        dosage_form || 'Tablet',
        strength || null,
        unit_price,
        stock_quantity || 0,
        reorder_level || 10,
        expiry_date || null,
        manufacturer || null,
        description || null
      ]
    );

    // If initial stock > 0, log to stock audit using stored procedure sp_update_medicine_stock
    if (stock_quantity && Number(stock_quantity) > 0) {
      try {
        await pool.query('CALL sp_update_medicine_stock(?,?,?,?,?)', [
          result.insertId,
          Number(stock_quantity),
          'IN',
          'Initial opening stock',
          req.user.user_id
        ]);
      } catch (logErr) {
        console.warn('Initial stock log warning:', logErr);
      }
    }

    res.status(201).json({ success: true, message: 'Medicine added successfully', medicine_id: result.insertId });
  } catch (err) {
    console.error('Error adding medicine:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// PUT /api/pharmacy/medicines/:id (Full medicine update)
router.put('/medicines/:id', authenticateToken, authorizeRoles('pharmacist', 'admin'), async (req, res) => {
  try {
    const {
      medicine_name,
      generic_name,
      brand,
      category,
      dosage_form,
      strength,
      unit_price,
      reorder_level,
      expiry_date,
      manufacturer,
      description
    } = req.body;

    if (!medicine_name || unit_price === undefined) {
      return res.status(400).json({ success: false, message: 'Medicine name and unit price are required' });
    }

    await pool.query(
      `UPDATE medicines 
       SET medicine_name = ?,
           generic_name = ?,
           brand = ?,
           category = ?,
           dosage_form = ?,
           strength = ?,
           unit_price = ?,
           reorder_level = ?,
           expiry_date = ?,
           manufacturer = ?,
           description = ?
       WHERE medicine_id = ?`,
      [
        medicine_name,
        generic_name || null,
        brand || null,
        category || null,
        dosage_form || 'Tablet',
        strength || null,
        unit_price,
        reorder_level || 10,
        expiry_date || null,
        manufacturer || null,
        description || null,
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Medicine updated successfully' });
  } catch (err) {
    console.error('Error updating medicine:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Server error' });
  }
});

// DELETE /api/pharmacy/medicines/:id (Soft delete / Deactivate medicine)
router.delete('/medicines/:id', authenticateToken, authorizeRoles('pharmacist', 'admin'), async (req, res) => {
  try {
    const medicineId = req.params.id;
    
    // Check if medicine exists
    const [rows] = await pool.query('SELECT medicine_id, medicine_name, is_active FROM medicines WHERE medicine_id = ?', [medicineId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    // Soft delete by setting is_active = FALSE
    await pool.query('UPDATE medicines SET is_active = FALSE WHERE medicine_id = ?', [medicineId]);

    res.json({
      success: true,
      message: `Medicine "${rows[0].medicine_name}" has been deactivated and archived successfully.`
    });
  } catch (err) {
    console.error('Error deactivating medicine:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/pharmacy/medicines/:id/restore (Restore deactivated medicine)
router.patch('/medicines/:id/restore', authenticateToken, authorizeRoles('pharmacist', 'admin'), async (req, res) => {
  try {
    const medicineId = req.params.id;

    const [rows] = await pool.query('SELECT medicine_id, medicine_name FROM medicines WHERE medicine_id = ?', [medicineId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    await pool.query('UPDATE medicines SET is_active = TRUE WHERE medicine_id = ?', [medicineId]);

    res.json({
      success: true,
      message: `Medicine "${rows[0].medicine_name}" restored to active inventory successfully.`
    });
  } catch (err) {
    console.error('Error restoring medicine:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// 4. STOCK LOGS & DISPOSAL MANAGEMENT
// ============================================================

// POST /api/pharmacy/medicines/:id/stock (Stock IN / ADJUSTMENT using stored procedure)
router.post('/medicines/:id/stock', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { quantity_change, change_type, notes } = req.body;
    await pool.query('CALL sp_update_medicine_stock(?,?,?,?,?)', [
      req.params.id,
      quantity_change,
      change_type,
      notes,
      req.user.user_id
    ]);
    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || 'Stock update failed' });
  }
});

// POST /api/pharmacy/medicines/:id/dispose (Dedicated Damaged/Expired Stock Disposal)
router.post('/medicines/:id/dispose', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const medicineId = req.params.id;
    const { quantity, reason, notes } = req.body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid quantity greater than 0' });
    }

    // 1. Check stock using stored function fn_is_medicine_in_stock
    const [[check]] = await pool.query('SELECT fn_is_medicine_in_stock(?, ?) AS in_stock', [medicineId, qty]);
    if (!check || !check.in_stock) {
      return res.status(400).json({
        success: false,
        message: 'Disposal quantity exceeds current available stock in inventory.'
      });
    }

    // 2. Call stored procedure sp_update_medicine_stock with 'OUT'
    const disposalReason = reason || 'DAMAGED/EXPIRED';
    const logNote = `DISPOSAL [${disposalReason}]: ${notes ? notes.trim() : 'Stock written off by pharmacy'}`;

    await pool.query('CALL sp_update_medicine_stock(?,?,?,?,?)', [
      medicineId,
      qty,
      'OUT',
      logNote,
      req.user.user_id
    ]);

    res.json({ success: true, message: `Successfully recorded disposal of ${qty} units (${disposalReason}).` });
  } catch (err) {
    console.error('Error recording disposal:', err);
    res.status(400).json({ success: false, message: err.sqlMessage || 'Failed to record disposal' });
  }
});

// GET /api/pharmacy/stock-history (Stock audit trail via vw_medicine_stock_history)
router.get('/stock-history', authenticateToken, authorizeRoles('pharmacist', 'admin'), async (req, res) => {
  try {
    const { medicine_id, change_type, start_date, end_date, limit } = req.query;
    let query = 'SELECT * FROM vw_medicine_stock_history WHERE 1=1';
    const params = [];
    if (medicine_id) { query += ' AND medicine_id = ?'; params.push(medicine_id); }
    if (change_type && change_type !== 'ALL') { query += ' AND change_type = ?'; params.push(change_type); }
    if (start_date) { query += ' AND DATE(logged_at) >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND DATE(logged_at) <= ?'; params.push(end_date); }
    query += ' ORDER BY logged_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching stock history:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pharmacy/report (Category report via sp_medicine_inventory_report)
router.get('/report', authenticateToken, authorizeRoles('pharmacist'), async (req, res) => {
  try {
    const { category } = req.query;
    const [result] = await pool.query('CALL sp_medicine_inventory_report(?)', [category || 'ALL']);
    res.json({ success: true, data: result[0] });
  } catch (err) {
    console.error('Error running inventory report:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
