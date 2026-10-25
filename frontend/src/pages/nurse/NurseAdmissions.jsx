import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const NurseAdmissions = () => {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Discharge modal
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis_at_discharge: '',
    notes: ''
  });
  const [discharging, setDischarging] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAdmissions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    API.get(`/nurse/admissions?${params.toString()}`)
      .then(res => setAdmissions(res.data.data || []))
      .catch(() => toast.error('Failed to load admissions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdmissions();
  }, [statusFilter, startDate, endDate]);

  const handleDischarge = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setDischarging(true);
    try {
      await API.put(`/nurse/admissions/${selectedAdmission.admission_id}/discharge`, dischargeForm);
      toast.success(`Patient ${selectedAdmission.patient_name} discharged successfully`);
      setShowDischargeModal(false);
      setSelectedAdmission(null);
      setDischargeForm({ diagnosis_at_discharge: '', notes: '' });
      fetchAdmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Discharge failed');
    } finally {
      setDischarging(false);
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const matchesSearch =
      (a.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.patient_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.ward_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.bed_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="In-Patient Admissions">
      {/* TOP CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search patient, ward, or bed..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 280 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Active', 'Discharged'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 140 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Admission Start Date"
            />
            <input
              type="date"
              className="form-control"
              style={{ width: 140 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="Admission End Date"
            />
            {(startDate || endDate) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ADMISSIONS TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            🏥 Patient Admissions List ({filteredAdmissions.length})
          </h3>
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
            Includes active in-patients and discharge history
          </span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          {loading ? (
            <p style={{ color: 'var(--gray-400)', padding: 20 }}>Loading admissions data...</p>
          ) : filteredAdmissions.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', padding: 20 }}>No admissions match the current filter.</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Ward</th>
                    <th>Bed</th>
                    <th>Doctor</th>
                    <th>Nurse</th>
                    <th>Admitted</th>
                    <th>Length of Stay</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmissions.map(a => (
                    <tr key={a.admission_id}>
                      <td>
                        <strong>{a.patient_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{a.patient_code}</div>
                      </td>
                      <td>
                        <strong>{a.ward_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{a.ward_type}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: 12 }}>
                          Bed {a.bed_number}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>Dr. {a.doctor_name}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{a.nurse_name || 'N/A'}</td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(a.admission_date).toLocaleDateString()}
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {new Date(a.admission_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{a.days_admitted} days</span>
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {a.status === 'Active' ? (
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: 12, padding: '5px 12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={() => {
                              setSelectedAdmission(a);
                              setShowDischargeModal(true);
                            }}
                          >
                            Discharge
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Discharged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DISCHARGE MODAL */}
      {showDischargeModal && selectedAdmission && (
        <div className="modal-backdrop">
          <div className="modal-dialog animate-slide-up" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Patient Discharge</h3>
              <button
                className="btn-close"
                onClick={() => setShowDischargeModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDischarge}>
              <div className="modal-body">
                <div style={{ background: 'var(--gray-50)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedAdmission.patient_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>
                    Ward: {selectedAdmission.ward_name} • Bed: {selectedAdmission.bed_number} • Attending: Dr. {selectedAdmission.doctor_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    Admitted: {new Date(selectedAdmission.admission_date).toLocaleDateString()} ({selectedAdmission.days_admitted} days)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Diagnosis at Discharge *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="E.g., Fully recovered from acute gastroenteritis"
                    value={dischargeForm.diagnosis_at_discharge}
                    onChange={e => setDischargeForm({ ...dischargeForm, diagnosis_at_discharge: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discharge Instructions & Nurse Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Take prescribed oral medication, follow up in 7 days, wound dressing clean..."
                    value={dischargeForm.notes}
                    onChange={e => setDischargeForm({ ...dischargeForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDischargeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={discharging}>
                  {discharging ? 'Discharging...' : 'Confirm Discharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NurseAdmissions;
