import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PharmacyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (date) params.append('date', date);
    if (search) params.append('search', search);

    API.get(`/pharmacy/prescriptions?${params.toString()}`)
      .then(r => setPrescriptions(r.data.data||[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const viewItems = async (id) => {
    const r = await API.get(`/pharmacy/prescriptions/${id}`);
    setItems(r.data.data||[]);
    setSelected(id);
    setShowModal(true);
  };

  const dispense = async (id) => {
    try {
      await API.post(`/pharmacy/prescriptions/${id}/dispense`);
      toast.success('Dispensed successfully!');
      setShowModal(false);
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const StatusBadge = ({ s }) => {
    const m = { Pending:'badge-warning', Dispensed:'badge-success', Cancelled:'badge-danger' };
    return <span className={`badge ${m[s]||'badge-gray'}`}>{s}</span>;
  };

  return (
    <DashboardLayout title="Prescriptions Dispensing Queue">
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['Pending', 'Dispensed', 'Cancelled', 'ALL'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All Statuses' : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input
              type="date"
              className="form-control"
              style={{ width: 160 }}
              value={date}
              onChange={e => setDate(e.target.value)}
              title="Filter by Prescription Date"
            />
            {date && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDate('')}>
                Clear
              </button>
            )}
            <input
              type="text"
              className="form-control"
              style={{ width: 220 }}
              placeholder="Search patient / doctor / Rx ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Items</th><th>Total Cost</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {prescriptions.map(p=>(
                <tr key={p.prescription_id}>
                  <td>#{p.prescription_id}</td>
                  <td><strong>{p.patient_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{p.patient_code}</span></td>
                  <td>Dr. {p.doctor_name}</td>
                  <td>{p.prescription_date}</td>
                  <td>{p.total_items}</td>
                  <td><strong style={{color:'var(--primary-600)'}}>Rs. {Number(p.total_cost).toLocaleString()}</strong></td>
                  <td><StatusBadge s={p.status}/></td>
                  <td><button className="btn btn-outline btn-sm" onClick={()=>viewItems(p.prescription_id)}>View Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading&&!prescriptions.length&&<div className="empty-state"><span className="empty-state-icon">💊</span><h4>No {statusFilter} prescriptions</h4></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <h3>💊 Prescription #{selected} Details</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Medicine</th><th>Form</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Price</th></tr></thead>
                  <tbody>
                    {items.map((item,i)=>(
                      <tr key={i}>
                        <td><strong>{item.medicine_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{item.strength}</span></td>
                        <td>{item.dosage_form}</td>
                        <td>{item.dosage}</td>
                        <td>{item.frequency}</td>
                        <td>{item.duration}</td>
                        <td>{item.quantity}</td>
                        <td>Rs.{Number(item.total_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {items[0]?.status==='Pending' && (
                <div style={{marginTop:20,textAlign:'right'}}>
                  <button className="btn btn-success" onClick={()=>dispense(selected)}>✅ Dispense Prescription</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default PharmacyPrescriptions;
