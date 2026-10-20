import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const NurseLabTests = () => {
  const [requests, setRequests] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // New Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    patient_id: '',
    test_id: '',
    priority: 'Normal',
    notes: ''
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  // Enter Result Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resultForm, setResultForm] = useState({
    result_value: '',
    remarks: '',
    is_abnormal: false
  });
  const [submittingResult, setSubmittingResult] = useState(false);

  // View Details Modal
  const [viewDetails, setViewDetails] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (priorityFilter !== 'All') params.append('priority', priorityFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    API.get(`/nurse/lab-requests?${params.toString()}`)
      .then(res => setRequests(res.data.data || []))
      .catch(err => toast.error('Failed to load lab requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter, startDate, endDate]);

  useEffect(() => {
    API.get('/nurse/lab-tests').then(r => setLabTests(r.data.data || [])).catch(() => {});
    API.get('/receptionist/patients').then(r => setPatients(r.data.data || [])).catch(() => {});
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.patient_id || !requestForm.test_id) {
      return toast.warning('Please select both patient and lab test');
    }
    setSubmittingReq(true);
    try {
      await API.post('/nurse/lab-requests', requestForm);
      toast.success('Lab test order created successfully!');
      setShowRequestModal(false);
      setRequestForm({ patient_id: '', test_id: '', priority: 'Normal', notes: '' });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await API.put(`/nurse/lab-requests/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleEnterResult = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmittingResult(true);
    try {
      await API.post(`/nurse/lab-requests/${selectedRequest.lab_request_id}/result`, resultForm);
      toast.success('Lab result recorded and marked completed!');
      setShowResultModal(false);
      setSelectedRequest(null);
      setResultForm({ result_value: '', remarks: '', is_abnormal: false });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit result');
    } finally {
      setSubmittingResult(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const name = (r.patient_name || r.guest_name || '').toLowerCase();
    const test = (r.test_name || '').toLowerCase();
    const code = (r.patient_code || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || test.includes(term) || code.includes(term);
  });

  return (
    <DashboardLayout title="Laboratory Services">
      {/* HEADER ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search patient, guest, or test..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 280 }}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Requested', 'Sample_Collected', 'Processing', 'Completed'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>Priority:</span>
            {['All', 'Critical', 'Urgent', 'Normal'].map(prio => (
              <button
                key={prio}
                type="button"
                className={`btn ${priorityFilter === prio ? (prio === 'Critical' ? 'btn-danger' : prio === 'Urgent' ? 'btn-warning' : 'btn-primary') : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={() => setPriorityFilter(prio)}
              >
                {prio}
              </button>
            ))}
            <input
              type="date"
              className="form-control"
              style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Request Start Date"
            />
            <input
              type="date"
              className="form-control"
              style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="Request End Date"
            />
            {(startDate || endDate) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
          + Order Lab Test
        </button>
      </div>

      {/* REQUESTS TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            🔬 Lab Orders & Status ({filteredRequests.length})
          </h3>
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
            Track sample collection, testing, and reports
          </span>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {loading ? (
            <p style={{ color: 'var(--gray-400)', padding: 20 }}>Loading lab requests...</p>
          ) : filteredRequests.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', padding: 20 }}>No lab orders match the current criteria.</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Patient / Guest</th>
                    <th>Test Details</th>
                    <th>Priority</th>
                    <th>Ordered Date</th>
                    <th>Status</th>
                    <th>Result Info</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r.lab_request_id}>
                      <td><strong>#{r.lab_request_id}</strong></td>
                      <td>
                        <strong>{r.patient_name || r.guest_name}</strong>
                        {r.patient_code ? (
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{r.patient_code}</div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--primary)' }}>Guest: {r.guest_phone || 'Walk-in'}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.test_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                          {r.category} • Range: {r.normal_range || 'N/A'} {r.unit || ''}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.priority === 'Critical' ? 'badge-danger' :
                          r.priority === 'Urgent' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(r.request_date).toLocaleDateString()}
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {new Date(r.request_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === 'Completed' ? 'badge-success' :
                          r.status === 'Processing' ? 'badge-purple' :
                          r.status === 'Sample_Collected' ? 'badge-info' : 'badge-gray'
                        }`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {r.status === 'Completed' ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                              {r.result_value || 'Report Available'}
                            </div>
                            {r.is_abnormal ? (
                              <span className="badge badge-danger" style={{ fontSize: 10 }}>⚠️ Abnormal</span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Normal</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {r.status === 'Requested' && (
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                              onClick={() => updateStatus(r.lab_request_id, 'Sample_Collected')}
                            >
                              Collect Sample
                            </button>
                          )}
                          {r.status === 'Sample_Collected' && (
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--purple-600)', borderColor: 'var(--purple-600)' }}
                              onClick={() => updateStatus(r.lab_request_id, 'Processing')}
                            >
                              Process
                            </button>
                          )}
                          {(r.status === 'Sample_Collected' || r.status === 'Processing') && (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: 11, padding: '4px 10px' }}
                              onClick={() => {
                                setSelectedRequest(r);
                                setShowResultModal(true);
                              }}
                            >
                              Enter Result
                            </button>
                          )}
                          {r.status === 'Completed' && (
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 11, padding: '4px 10px' }}
                              onClick={() => setViewDetails(r)}
                            >
                              View Report
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* NEW LAB REQUEST MODAL */}
      {showRequestModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog animate-slide-up" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>🔬 Order Laboratory Test</h3>
              <button
                className="btn-close"
                onClick={() => setShowRequestModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Registered Patient *</label>
                  <select
                    className="form-control"
                    required
                    value={requestForm.patient_id}
                    onChange={e => setRequestForm({ ...requestForm, patient_id: e.target.value })}
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.first_name} {p.last_name} ({p.patient_code || p.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lab Test *</label>
                  <select
                    className="form-control"
                    required
                    value={requestForm.test_id}
                    onChange={e => setRequestForm({ ...requestForm, test_id: e.target.value })}
                  >
                    <option value="">-- Choose Test --</option>
                    {labTests.map(t => (
                      <option key={t.test_id} value={t.test_id}>
                        {t.test_name} [{t.category}] - ${t.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    className="form-control"
                    value={requestForm.priority}
                    onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical (Immediate STAT)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Indication / Specimen Instructions</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Fast for 12 hours prior, venous blood draw, check electrolyte levels..."
                    value={requestForm.notes}
                    onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingReq}>
                  {submittingReq ? 'Creating...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTER RESULTS MODAL */}
      {showResultModal && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-dialog animate-slide-up" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>📝 Enter Diagnostic Results</h3>
              <button
                className="btn-close"
                onClick={() => setShowResultModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEnterResult}>
              <div className="modal-body">
                <div style={{ background: 'var(--gray-50)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedRequest.test_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>
                    Patient: {selectedRequest.patient_name || selectedRequest.guest_name} • Category: {selectedRequest.category}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    Reference Range: <strong>{selectedRequest.normal_range || 'N/A'} {selectedRequest.unit || ''}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Result Value / Measurement *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="E.g., 14.5 g/dL, Negative, 110 mg/dL"
                    value={resultForm.result_value}
                    onChange={e => setResultForm({ ...resultForm, result_value: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Remarks / Pathologist Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Findings within normal clinical parameters, no hemolysis observed..."
                    value={resultForm.remarks}
                    onChange={e => setResultForm({ ...resultForm, remarks: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <input
                    type="checkbox"
                    id="is_abnormal"
                    checked={resultForm.is_abnormal}
                    onChange={e => setResultForm({ ...resultForm, is_abnormal: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="is_abnormal" style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', cursor: 'pointer' }}>
                    Mark as Abnormal / Out-of-Range Finding
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowResultModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingResult}>
                  {submittingResult ? 'Saving...' : 'Finalize & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW REPORT MODAL */}
      {viewDetails && (
        <div className="modal-backdrop">
          <div className="modal-dialog animate-slide-up" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>📑 Lab Test Report</h3>
              <button
                className="btn-close"
                onClick={() => setViewDetails(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)' }}>{viewDetails.test_name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Category: {viewDetails.category}</div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>PATIENT</div>
                  <div style={{ fontWeight: 700 }}>{viewDetails.patient_name || viewDetails.guest_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>TEST PRICE</div>
                  <div style={{ fontWeight: 700 }}>${viewDetails.price}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>RESULT VALUE</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: viewDetails.is_abnormal ? 'var(--danger)' : 'var(--emerald-600)' }}>
                    {viewDetails.result_value}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>NORMAL RANGE</div>
                  <div style={{ fontWeight: 600 }}>{viewDetails.normal_range} {viewDetails.unit}</div>
                </div>
              </div>

              {viewDetails.remarks && (
                <div style={{ background: 'var(--gray-50)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 4 }}>REMARKS</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-800)' }}>{viewDetails.remarks}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)' }}>
                <span>Ordered: {new Date(viewDetails.request_date).toLocaleDateString()}</span>
                <span>Completed: {viewDetails.completed_at ? new Date(viewDetails.completed_at).toLocaleDateString() : 'Yes'}</span>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={() => setViewDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NurseLabTests;
