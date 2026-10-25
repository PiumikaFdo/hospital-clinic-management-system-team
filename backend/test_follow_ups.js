const pool = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const express = require('express');
const doctorRoutes = require('./routes/doctor');

async function runFollowUpTests() {
  console.log('=== RUNNING FOLLOW-UP MANAGEMENT TESTS ===\n');
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
  const doctorToken = jwt.sign(
    { user_id: doctor.user_id, email: doctor.email, role: 'doctor', staff_id: doctor.staff_id, name: doctor.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Non-doctor user token (e.g. receptionist)
  const nonDoctorToken = jwt.sign(
    { user_id: 999, email: 'receptionist@hospital.com', role: 'receptionist', staff_id: 999, name: 'Staff User' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Mock server
  const app = express();
  app.use(express.json());
  app.use('/api/doctor', doctorRoutes);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/doctor`;

  const createdRecordIds = [];

  try {
    // 2. Auth: Unauthorized access without token rejected with 401
    const resNoAuth = await fetch(`${baseUrl}/follow-ups`);
    assert(resNoAuth.status === 401, 'Unauthorized request rejected with 401');

    // 3. Auth: Non-doctor access rejected with 403 Forbidden
    const resForbidden = await fetch(`${baseUrl}/follow-ups`, {
      headers: { Authorization: `Bearer ${nonDoctorToken}` }
    });
    assert(resForbidden.status === 403, 'Non-doctor role access rejected with 403 Forbidden');

    // 4. Set up sample patient and create consultations with today, upcoming, and overdue follow-up dates
    const [patients] = await pool.query('SELECT patient_id FROM patients LIMIT 1');
    const patientId = patients[0].patient_id;

    const todayDate = new Date().toISOString().split('T')[0];
    
    // Future date: +7 days
    const upcomingDateObj = new Date();
    upcomingDateObj.setDate(upcomingDateObj.getDate() + 7);
    const upcomingDate = upcomingDateObj.toISOString().split('T')[0];

    // Past date: -7 days
    const overdueDateObj = new Date();
    overdueDateObj.setDate(overdueDateObj.getDate() - 7);
    const overdueDate = overdueDateObj.toISOString().split('T')[0];

    // Create 3 consultations
    // 1: Due Today
    const res1 = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patient_id: patientId,
        chief_complaint: 'Follow-up Test Case: Fever Review',
        diagnosis: 'Test Follow-Up Today Infection',
        symptoms: 'Chills and low fever',
        treatment_plan: 'Check complete blood count',
        follow_up_date: todayDate,
        notes: 'Review in clinic today'
      })
    });
    const json1 = await res1.json();
    assert(res1.status === 201 && json1.success, 'Created follow-up consultation due Today');
    if (json1.data?.record_id) createdRecordIds.push(json1.data.record_id);

    // 2: Upcoming
    const res2 = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patient_id: patientId,
        chief_complaint: 'Follow-up Test Case: Hypertension Management',
        diagnosis: 'Test Follow-Up Upcoming Hypertension',
        symptoms: 'Occasional morning dizziness',
        treatment_plan: 'Continue low salt regimen',
        follow_up_date: upcomingDate,
        notes: 'Review in 1 week'
      })
    });
    const json2 = await res2.json();
    assert(res2.status === 201 && json2.success, 'Created follow-up consultation Upcoming (+7d)');
    if (json2.data?.record_id) createdRecordIds.push(json2.data.record_id);

    // 3: Overdue
    const res3 = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patient_id: patientId,
        chief_complaint: 'Follow-up Test Case: Diabetic Wound Care',
        diagnosis: 'Test Follow-Up Overdue Ulcer',
        symptoms: 'Slow healing ulcer on heel',
        treatment_plan: 'Daily dressing and glucose control',
        follow_up_date: overdueDate,
        notes: 'Urgent checkup required'
      })
    });
    const json3 = await res3.json();
    assert(res3.status === 201 && json3.success, 'Created follow-up consultation Overdue (-7d)');
    if (json3.data?.record_id) createdRecordIds.push(json3.data.record_id);

    // 5. Query GET /api/doctor/follow-ups?status=all
    const resAll = await fetch(`${baseUrl}/follow-ups?status=all`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonAll = await resAll.json();
    assert(resAll.status === 200 && jsonAll.success, 'GET /follow-ups?status=all returned 200 OK');
    assert(jsonAll.counts && jsonAll.counts.all >= 3, 'Counts object contains accurate `all` metric');
    assert(jsonAll.counts.today >= 1, 'Counts object contains accurate `today` metric');
    assert(jsonAll.counts.upcoming >= 1, 'Counts object contains accurate `upcoming` metric');
    assert(jsonAll.counts.overdue >= 1, 'Counts object contains accurate `overdue` metric');
    assert(Array.isArray(jsonAll.data) && jsonAll.data.length > 0, 'Follow-up records array returned');

    // 6. Verify required fields on follow-up record
    const sampleRecord = jsonAll.data.find(r => r.record_id === json1.data.record_id);
    assert(sampleRecord !== undefined, 'Found test record in follow-ups list');
    assert(sampleRecord?.patient_name && sampleRecord?.patient_code, 'Follow-up record has patient name and code');
    assert(sampleRecord?.follow_up_date === todayDate, 'Follow-up date matches ISO YYYY-MM-DD');
    assert(sampleRecord?.follow_up_category === 'Today', 'Category is correctly classified as Today');
    assert(sampleRecord?.days_diff === 0, 'days_diff is 0 for Today');

    // 7. Query GET /api/doctor/follow-ups?status=today
    const resToday = await fetch(`${baseUrl}/follow-ups?status=today`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonToday = await resToday.json();
    assert(resToday.status === 200 && jsonToday.success, 'GET /follow-ups?status=today returned 200 OK');
    assert(
      jsonToday.data.some(r => r.record_id === json1.data.record_id),
      'Today filter includes the consultation due today'
    );
    assert(
      !jsonToday.data.some(r => r.record_id === json2.data.record_id || r.record_id === json3.data.record_id),
      'Today filter excludes upcoming and overdue records'
    );

    // 8. Query GET /api/doctor/follow-ups?status=upcoming
    const resUpcoming = await fetch(`${baseUrl}/follow-ups?status=upcoming`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonUpcoming = await resUpcoming.json();
    assert(resUpcoming.status === 200 && jsonUpcoming.success, 'GET /follow-ups?status=upcoming returned 200 OK');
    assert(
      jsonUpcoming.data.some(r => r.record_id === json2.data.record_id),
      'Upcoming filter includes the upcoming consultation'
    );
    const upcomingRec = jsonUpcoming.data.find(r => r.record_id === json2.data.record_id);
    assert(upcomingRec?.follow_up_category === 'Upcoming', 'Upcoming record classified as Upcoming');
    assert(upcomingRec?.days_diff > 0, 'days_diff is positive for upcoming record');

    // 9. Query GET /api/doctor/follow-ups?status=overdue
    const resOverdue = await fetch(`${baseUrl}/follow-ups?status=overdue`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonOverdue = await resOverdue.json();
    assert(resOverdue.status === 200 && jsonOverdue.success, 'GET /follow-ups?status=overdue returned 200 OK');
    assert(
      jsonOverdue.data.some(r => r.record_id === json3.data.record_id),
      'Overdue filter includes the overdue consultation'
    );
    const overdueRec = jsonOverdue.data.find(r => r.record_id === json3.data.record_id);
    assert(overdueRec?.follow_up_category === 'Overdue', 'Overdue record classified as Overdue');
    assert(overdueRec?.days_diff < 0, 'days_diff is negative for overdue record');

    // 10. Search filter
    const resSearch = await fetch(`${baseUrl}/follow-ups?search=Diabetic+Wound`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonSearch = await resSearch.json();
    assert(
      jsonSearch.data.some(r => r.record_id === json3.data.record_id),
      'Search query matches diagnosis / chief complaint correctly'
    );

    // 11. Detail view: GET /api/doctor/consultations/:id
    const resDetail = await fetch(`${baseUrl}/consultations/${json1.data.record_id}`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const jsonDetail = await resDetail.json();
    assert(resDetail.status === 200 && jsonDetail.success, 'Consultation detail view succeeded with 200 OK');
    assert(jsonDetail.data.diagnosis === 'Test Follow-Up Today Infection', 'Consultation detail matches diagnosis');
    assert(jsonDetail.data.follow_up_date === todayDate, 'Consultation detail contains follow_up_date');

    console.log(`\nALL FOLLOW-UP TESTS COMPLETED with ${failures} failure(s).`);
  } finally {
    // Clean up created medical records and prescriptions if any
    for (const recId of createdRecordIds) {
      try {
        const [prescs] = await pool.query('SELECT prescription_id FROM prescriptions WHERE record_id = ?', [recId]);
        for (const pr of prescs) {
          await pool.query('DELETE FROM prescription_items WHERE prescription_id = ?', [pr.prescription_id]);
          await pool.query('DELETE FROM prescriptions WHERE prescription_id = ?', [pr.prescription_id]);
        }
        await pool.query('DELETE FROM medical_records WHERE record_id = ?', [recId]);
      } catch (cleanErr) {
        console.error('Cleanup error for recId', recId, cleanErr);
      }
    }

    server.close();
    await pool.end();
  }

  if (failures > 0) {
    process.exit(1);
  }
}

runFollowUpTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
