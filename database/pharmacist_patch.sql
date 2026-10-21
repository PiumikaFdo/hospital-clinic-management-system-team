-- ============================================================
-- Pharmacist Minimal DB Patch: Urgent Fixes Only
-- Non-destructive: ALTER VIEW ONLY
-- ============================================================

USE hospital_db;

-- Fix: Add missing medicine_id to vw_medicine_stock_history
-- This allows the stock log queries to filter by medicine_id
ALTER VIEW vw_medicine_stock_history AS
SELECT
    msl.log_id,
    msl.medicine_id,
    msl.change_type,
    msl.quantity_changed,
    msl.quantity_before,
    msl.quantity_after,
    msl.reference_type,
    msl.reference_id,
    msl.notes,
    msl.logged_at,
    m.medicine_name,
    m.dosage_form,
    CONCAT(u.first_name, ' ', u.last_name) AS logged_by_name
FROM medicine_stock_log msl
JOIN medicines m ON msl.medicine_id = m.medicine_id
LEFT JOIN users u ON msl.logged_by = u.user_id
ORDER BY msl.logged_at DESC;
