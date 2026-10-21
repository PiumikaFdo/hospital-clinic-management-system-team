import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PatientReports = () => {
  const [data, setData] = useState({
    medical_records: [],
    lab_results: [],
    bills: [],
    prescriptions: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'labs' | 'bills' | 'prescriptions'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    API.get(`/patient/reports?${params.toString()}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  return (
    <DashboardLayout title="Medical Records & Health Reports">
      {/* CONTROLS & TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('records')}
          >
            📋 Clinical Records ({data.medical_records?.length || 0})
          </button>
          <button
            className={`btn ${activeTab === 'prescriptions' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            💊 e-Prescriptions ({data.prescriptions?.length || 0})
          </button>
          <button
            className={`btn ${activeTab === 'labs' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('labs')}
          >
            🔬 Lab Results ({data.lab_results?.length || 0})
          </button>
          <button
            className={`btn ${activeTab === 'bills' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('bills')}
          >
            💳 Invoices ({data.bills?.length || 0})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Date Range:</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="form-control"
            style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          {(startDate || endDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
          Loading your medical history and reports...
        </div>
      ) : (
        <>
          {/* TAB 1: MEDICAL CLINICAL RECORDS */}
          {activeTab === 'records' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Physician Notes & Diagnoses</h3>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                {(!data.medical_records || data.medical_records.length === 0) ? (
                  <p style={{ color: 'var(--gray-400)', padding: 20 }}>No clinical examination records on file yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {data.medical_records.map(rec => (
                      <div
                        key={rec.record_id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 20,
                          background: 'var(--gray-50)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <div>
                            <span className="badge badge-purple" style={{ marginBottom: 4, display: 'inline-block' }}>
                              {rec.dept_name}
                            </span>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>
                              Dr. {rec.doctor_name}
                            </div>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--gray-500)', background: '#fff', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            📅 {new Date(rec.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="grid-2" style={{ gap: 16, marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>PRIMARY DIAGNOSIS</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-dark)', marginTop: 2 }}>
                              {rec.diagnosis}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>REPORTED SYMPTOMS</div>
                            <div style={{ fontSize: 13, color: 'var(--gray-700)', marginTop: 2 }}>
                              {rec.symptoms || 'None recorded'}
                            </div>
                          </div>
                        </div>

                        {rec.examination_notes && (
                          <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, marginBottom: 4 }}>EXAMINATION FINDINGS</div>
                            <div style={{ fontSize: 13, color: 'var(--gray-800)' }}>{rec.examination_notes}</div>
                          </div>
                        )}

                        {rec.treatment_plan && (
                          <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, marginBottom: 4 }}>RECOMMENDED TREATMENT PLAN</div>
                            <div style={{ fontSize: 13, color: 'var(--gray-800)' }}>{rec.treatment_plan}</div>
                          </div>
                        )}

                        {rec.follow_up_date && (
                          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                            🗓️ Follow-up scheduled on: {new Date(rec.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LAB RESULTS */}
          {activeTab === 'labs' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>🔬 Diagnostic Lab Reports</h3>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                {(!data.lab_results || data.lab_results.length === 0) ? (
                  <p style={{ color: 'var(--gray-400)', padding: 20 }}>No laboratory tests recorded.</p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Test Name</th>
                          <th>Category</th>
                          <th>Standard Range</th>
                          <th>Measured Value</th>
                          <th>Remarks</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lab_results.map(lab => (
                          <tr key={lab.lab_request_id}>
                            <td>
                              <strong>{lab.test_name}</strong>
                            </td>
                            <td>
                              <span className="badge badge-purple">{lab.category}</span>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {lab.normal_range ? `${lab.normal_range} ${lab.unit || ''}` : 'N/A'}
                            </td>
                            <td>
                              {lab.status === 'Completed' ? (
                                <div>
                                  <span style={{ fontSize: 14, fontWeight: 800, color: lab.is_abnormal ? 'var(--danger)' : 'var(--emerald-600)' }}>
                                    {lab.result_value || 'Complete'}
                                  </span>
                                  {lab.is_abnormal && (
                                    <span className="badge badge-danger" style={{ fontSize: 10, marginLeft: 6 }}>Abnormal</span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>In Progress</span>
                              )}
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--gray-600)', maxWidth: 220 }}>
                              {lab.remarks || '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {new Date(lab.request_date).toLocaleDateString()}
                            </td>
                            <td>
                              <span className={`badge ${lab.status === 'Completed' ? 'badge-success' : 'badge-gray'}`}>
                                {lab.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: E-PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>💊 Prescriptions & Medications History</h3>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                {(!data.prescriptions || data.prescriptions.length === 0) ? (
                  <p style={{ color: 'var(--gray-400)', padding: 20 }}>No prescriptions on record.</p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Rx #</th>
                          <th>Date</th>
                          <th>Doctor</th>
                          <th>Medicine</th>
                          <th>Dosage & Frequency</th>
                          <th>Duration</th>
                          <th>Quantity</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.prescriptions.map((p, idx) => (
                          <tr key={idx}>
                            <td><strong>#{p.prescription_id}</strong></td>
                            <td style={{ fontSize: 12 }}>{p.prescription_date}</td>
                            <td>Dr. {p.doctor_name}</td>
                            <td>
                              <strong>{p.medicine_name}</strong>
                              <br />
                              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.strength} · {p.dosage_form}</span>
                            </td>
                            <td>{p.dosage} — {p.frequency}</td>
                            <td>{p.duration}</td>
                            <td style={{ fontWeight: 600 }}>×{p.quantity}</td>
                            <td>
                              <span className={`badge ${p.status === 'Dispensed' ? 'badge-success' : p.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BILLS & INVOICES */}
          {activeTab === 'bills' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>💳 Invoices & Hospital Bills</h3>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                {(!data.bills || data.bills.length === 0) ? (
                  <p style={{ color: 'var(--gray-400)', padding: 20 }}>No bills issued for your account.</p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Doctor Fees</th>
                          <th>Medicines</th>
                          <th>Lab Tests</th>
                          <th>Ward</th>
                          <th>Total Amount</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bills.map(b => (
                          <tr key={b.bill_id}>
                            <td>
                              <strong>{b.bill_number}</strong>
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {new Date(b.bill_date).toLocaleDateString()}
                            </td>
                            <td>${b.doctor_fees || '0.00'}</td>
                            <td>${b.medicine_cost || '0.00'}</td>
                            <td>${b.lab_cost || '0.00'}</td>
                            <td>${b.ward_cost || '0.00'}</td>
                            <td>
                              <strong style={{ fontSize: 14 }}>${b.total_amount}</strong>
                            </td>
                            <td style={{ color: 'var(--emerald-600)', fontWeight: 600 }}>
                              ${b.paid_amount}
                            </td>
                            <td style={{ color: Number(b.balance_amount) > 0 ? 'var(--danger)' : 'var(--gray-600)', fontWeight: 700 }}>
                              ${b.balance_amount}
                            </td>
                            <td>
                              <span className={`badge ${
                                b.payment_status === 'Paid' ? 'badge-success' :
                                b.payment_status === 'Partial' ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {b.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientReports;
