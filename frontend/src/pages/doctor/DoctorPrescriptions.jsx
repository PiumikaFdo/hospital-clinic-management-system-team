import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  const loadPrescriptions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (date) params.append('date', date);
    if (search) params.append('search', search);

    API.get(`/doctor/prescriptions?${params.toString()}`).then(r => {
      const grouped = (r.data.data||[]).reduce((acc,p) => {
        if (!acc[p.prescription_id]) acc[p.prescription_id] = { ...p, items: [] };
        acc[p.prescription_id].items.push(p);
        return acc;
      }, {});
      setPrescriptions(Object.values(grouped));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrescriptions();
  }, [statusFilter, date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPrescriptions();
  };

  const StatusBadge = ({ s }) => {
    const m = { Pending:'badge-warning', Dispensed:'badge-success', Cancelled:'badge-danger' };
    return <span className={`badge ${m[s]||'badge-gray'}`}>{s}</span>;
  };

  return (
    <DashboardLayout title="My Prescriptions">
      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['ALL', 'Pending', 'Dispensed', 'Cancelled'].map(s => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All' : s}
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
              style={{ width: 200 }}
              placeholder="Search patient / medicine..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
        {loading && <div className="loading-page"><span className="spinner" style={{width:40,height:40,borderWidth:4,borderColor:'var(--primary-200)',borderTopColor:'var(--primary-600)'}}/></div>}
        {prescriptions.map(p => (
          <div className="card" key={p.prescription_id}>
            <div className="card-header">
              <div>
                <h3 style={{fontSize:14}}>Rx #{p.prescription_id} — {p.patient_name}</h3>
                <p style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{p.prescription_date}</p>
              </div>
              <StatusBadge s={p.status} />
            </div>
            <div className="card-body" style={{padding:'12px 20px 20px'}}>
              {p.items.map((item,i) => (
                <div key={i} style={{padding:'8px 0',borderBottom:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontWeight:600,fontSize:13,color:'var(--gray-800)'}}>{item.medicine_name} {item.strength}</p>
                    <p style={{fontSize:12,color:'var(--gray-500)'}}>{item.dosage} · {item.frequency} · {item.duration}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:13,fontWeight:700,color:'var(--primary-600)'}}>×{item.quantity}</p>
                    <p style={{fontSize:12,color:'var(--gray-400)'}}>Rs.{Number(item.total_price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}>
                <span style={{fontSize:13,color:'var(--gray-500)'}}>Total Cost</span>
                <strong style={{color:'var(--primary-700)'}}>Rs. {Number(p.total_cost).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        ))}
        {!loading && !prescriptions.length && <div className="empty-state"><span className="empty-state-icon">💊</span><h4>No prescriptions yet</h4></div>}
      </div>
    </DashboardLayout>
  );
};
export default DoctorPrescriptions;
