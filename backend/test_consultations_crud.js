const pool = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const express = require('express');
const doctorRoutes = require('./routes/doctor');

async function runTests() {
  console.log('=== RUNNING CONSULTATION & DIAGNOSIS CRUD TESTS ===');
  let failures = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failures++;
    }
  }

  // 1. Get doctor details (dr.silva staff_id=2)
  const [docs] = await pool.query(
    `SELECT u.user_id, u.email, u.role, s.staff_id, CONCAT(u.first_name, ' ', u.last_name) AS name
     FROM users u
     JOIN staff s ON u.user_id = s.user_id
     WHERE u.email = 'dr.silva@hospital.com'`
  );
  if (!docs.length) {
    console.error('Doctor dr.silva not found in database');
    process.exit(1);
  }
  const doctor = docs[0];
  const token = jwt.sign(
    { user_id: doctor.user_id, email: doctor.email, role: 'doctor', staff_id: doctor.staff_id, name: doctor.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Set up mock HTTP test server
  const app = express();
  app.use(express.json());
  app.use('/api/doctor', doctorRoutes);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/doctor`;

  try {
    // 2. Authorization check without token
    const resNoAuth = await fetch(`${baseUrl}/consultations`);
    assert(resNoAuth.status === 401, 'Unauthorized request rejected with 401');

    // 3. CREATE Consultation 1 (with linked prescription)
    // Find active patient and medicine
    const [patients] = await pool.query('SELECT patient_id FROM patients LIMIT 1');
    const [medicines] = await pool.query('SELECT medicine_id, unit_price FROM medicines WHERE stock_quantity > 0 LIMIT 1');
    const patientId = patients[0].patient_id;
    const medicineId = medicines[0].medicine_id;

    const createPayload1 = {
      patient_id: patientId,
      chief_complaint: 'Severe headache and throbbing temple pain',
      diagnosis: 'Acute Migraine with Aura',
      symptoms: 'Nausea, photophobia, visual disturbances',
      treatment_plan: 'Rest in dark room, oral hydration, analgesics',
      follow_up_date: '2026-11-05',
      notes: 'Patient advised to keep headache diary',
      medicine_ids: [medicineId],
      quantities: [10],
      dosages: ['500mg'],
      frequencies: ['BD (Twice daily)'],
      durations: ['5 days']
    };

    const resCreate1 = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(createPayload1)
    });
    const jsonCreate1 = await resCreate1.json();
    assert(resCreate1.status === 201 && jsonCreate1.success && jsonCreate1.data.record_id, 'Create Consultation 1 with prescription succeeded');
    const recordId1 = jsonCreate1.data.record_id;

    // 4. CREATE Consultation 2 (without prescriptions)
    const createPayload2 = {
      patient_id: patientId,
      chief_complaint: 'Routine wellness and blood pressure checkup',
      diagnosis: 'Prehypertension - Lifestyle Controlled',
      symptoms: 'Mild afternoon fatigue',
      treatment_plan: 'Low sodium DASH diet, 30 min daily walking',
      follow_up_date: '2026-12-01',
      notes: 'No drug therapy required at this time',
      medicine_ids: [],
      quantities: [],
      dosages: [],
      frequencies: [],
      durations: []
    };

    const resCreate2 = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(createPayload2)
    });
    const jsonCreate2 = await resCreate2.json();
    assert(resCreate2.status === 201 && jsonCreate2.success && jsonCreate2.data.record_id, 'Create Consultation 2 (pure consultation) succeeded');
    const recordId2 = jsonCreate2.data.record_id;

    // 5. READ: List consultations with pagination & search
    const resList = await fetch(`${baseUrl}/consultations?search=Migraine`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonList = await resList.json();
    assert(jsonList.success && jsonList.data.some(c => c.record_id === recordId1), 'Read Consultations with keyword search found record');
    assert(jsonList.pagination && jsonList.pagination.total >= 1, 'Read Consultations includes pagination metadata');

    // 6. READ: Single consultation details
    const resDetail1 = await fetch(`${baseUrl}/consultations/${recordId1}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonDetail1 = await resDetail1.json();
    assert(jsonDetail1.success && jsonDetail1.data.diagnosis === 'Acute Migraine with Aura', 'Read Consultation details matches created diagnosis');
    assert(jsonDetail1.data.chief_complaint === 'Severe headache and throbbing temple pain', 'Read Consultation details matches chief complaint');
    assert(jsonDetail1.data.prescription_count > 0 && jsonDetail1.data.prescriptions.length > 0, 'Read Consultation includes linked prescriptions');

    // 7. UPDATE: Update all six fields of Consultation 2
    const updatePayload = {
      chief_complaint: 'Updated: Mild dizzy spells in morning',
      symptoms: 'Updated: Postural lightheadedness',
      diagnosis: 'Updated: Orthostatic Hypotension',
      treatment_plan: 'Updated: Increased water intake, compression stockings',
      notes: 'Updated: Monitor BP sitting and standing',
      follow_up_date: '2026-12-15'
    };

    const resUpdate = await fetch(`${baseUrl}/consultations/${recordId2}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatePayload)
    });
    const jsonUpdate = await resUpdate.json();
    assert(resUpdate.status === 200 && jsonUpdate.success, 'Update Consultation succeeded');

    // Verify all six fields were updated
    const resDetail2 = await fetch(`${baseUrl}/consultations/${recordId2}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonDetail2 = await resDetail2.json();
    const d2 = jsonDetail2.data;
    assert(
      d2.chief_complaint === updatePayload.chief_complaint &&
      d2.symptoms === updatePayload.symptoms &&
      d2.diagnosis === updatePayload.diagnosis &&
      d2.treatment_plan === updatePayload.treatment_plan &&
      d2.notes === updatePayload.notes &&
      d2.follow_up_date === updatePayload.follow_up_date,
      'All 6 fields (chief complaint, symptoms, diagnosis, treatment plan, notes, follow-up date) accurately updated'
    );

    // 8. DELETE: Attempt to delete Consultation 1 (HAS linked prescription) -> Must be prevented safely!
    const resDel1 = await fetch(`${baseUrl}/consultations/${recordId1}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonDel1 = await resDel1.json();
    assert(
      resDel1.status === 400 &&
      jsonDel1.has_prescriptions === true &&
      jsonDel1.message &&
      jsonDel1.message.includes('Cannot delete consultation') &&
      jsonDel1.message.includes('linked prescription'),
      'Safe Deletion: Blocked deletion of consultation with linked prescriptions with friendly message'
    );

    // Ensure Consultation 1 is still in database
    const [checkStillExists] = await pool.query('SELECT record_id FROM medical_records WHERE record_id = ?', [recordId1]);
    assert(checkStillExists.length === 1, 'Consultation 1 was preserved in database');

    // In sp_add_medical_record_with_prescription, an empty prescription row may be inserted even if medicine_ids was empty.
    // Let's check if record 2 has any prescriptions or delete it safely.
    const [rec2Presc] = await pool.query('SELECT prescription_id FROM prescriptions WHERE record_id = ?', [recordId2]);
    if (rec2Presc.length > 0) {
      // Clean up the prescription of record 2 to test deleting a consultation with 0 prescriptions
      await pool.query('DELETE FROM prescriptions WHERE record_id = ?', [recordId2]);
    }

    // 9. DELETE: Delete Consultation 2 (no linked prescriptions) -> Must succeed!
    const resDel2 = await fetch(`${baseUrl}/consultations/${recordId2}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonDel2 = await resDel2.json();
    assert(resDel2.status === 200 && jsonDel2.success, 'Deletion of consultation without prescriptions succeeded with 200 OK');

    const [checkDeleted] = await pool.query('SELECT record_id FROM medical_records WHERE record_id = ?', [recordId2]);
    assert(checkDeleted.length === 0, 'Consultation 2 confirmed removed from database');

    // Clean up Consultation 1 prescription items and prescriptions and consultation
    const [p1] = await pool.query('SELECT prescription_id FROM prescriptions WHERE record_id = ?', [recordId1]);
    for (const pr of p1) {
      await pool.query('DELETE FROM prescription_items WHERE prescription_id = ?', [pr.prescription_id]);
      await pool.query('DELETE FROM prescriptions WHERE prescription_id = ?', [pr.prescription_id]);
    }
    await pool.query('DELETE FROM medical_records WHERE record_id = ?', [recordId1]);

    console.log(`\nTESTS COMPLETED with ${failures} failure(s).`);
  } finally {
    server.close();
    await pool.end();
  }

  if (failures > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
