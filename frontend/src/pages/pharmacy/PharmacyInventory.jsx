import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const PharmacyInventory = () => {
  const [meds, setMeds]   = useState([]);
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAdd, setShowAdd]   = useState(false);
  const [showStock, setShowStock] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [form, setForm] = useState({ medicine_name:'',generic_name:'',brand:'',category:'',dosage_form:'Tablet',strength:'',unit_price:'',stock_quantity:'',reorder_level:10,expiry_date:'',manufacturer:'' });
  const [stockForm, setStockForm] = useState({ quantity_change:'', change_type:'IN', notes:'' });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stockStatusFilter && stockStatusFilter !== 'ALL') params.append('stock_status', stockStatusFilter);
    if (categoryFilter && categoryFilter !== 'ALL') params.append('category', categoryFilter);
    if (search) params.append('search', search);

    API.get(`/pharmacy/medicines?${params.toString()}`)
      .then(r => setMeds(r.data.data||[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [stockStatusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const openHistoryModal = async (med) => {
    setShowHistoryModal(med);
    setLoadingHistory(true);
    try {
      const res = await API.get(`/pharmacy/stock-history?medicine_id=${med.medicine_id}`);
      setHistoryLogs(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load stock history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const addMed = async (e) => {
    e.preventDefault();
    try { await API.post('/pharmacy/medicines', form); toast.success('Medicine added!'); setShowAdd(false); load(); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const updateStock = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/pharmacy/medicines/${showStock.medicine_id}/stock`, stockForm);
      toast.success('Stock updated!');
      setShowStock(null);
      load();
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const STOCK_STATUS_BADGE = { 'Available':'badge-success','Low Stock':'badge-warning','Out of Stock':'badge-danger','Expiring Soon':'badge-amber' };

  const categories = Array.from(new Set(meds.map(m => m.category).filter(Boolean)));

  return (
    <DashboardLayout title="Medicine Inventory & Stock Control">
      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['ALL', 'Available', 'Low Stock', 'Out of Stock', 'Expiring Soon'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${stockStatusFilter === status ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setStockStatusFilter(status)}
              >
                {status === 'ALL' ? 'All Inventory' : status}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <select
              className="form-control"
              style={{ width: 160 }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              className="form-control"
              style={{ width: 200 }}
              placeholder="🔍 Search medicines..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Medicine</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>💊 Medicine Catalog ({meds.length})</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Medicine</th><th>Category</th><th>Form</th><th>Price</th><th>Stock</th><th>Reorder</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {meds.map(m => (
                  <tr key={m.medicine_id}>
                    <td><strong>{m.medicine_name}</strong><br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{m.generic_name}</span></td>
                    <td>{m.category}</td>
                    <td>{m.dosage_form}</td>
                    <td>Rs.{Number(m.unit_price).toLocaleString()}</td>
                    <td><strong style={{color:m.stock_quantity<=m.reorder_level?'var(--danger)':'var(--success)'}}>{m.stock_quantity}</strong></td>
                    <td>{m.reorder_level}</td>
                    <td style={{fontSize:12}}>{m.expiry_date?.split('T')[0]}</td>
                    <td><span className={`badge ${STOCK_STATUS_BADGE[m.stock_status]||'badge-gray'}`}>{m.stock_status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setShowStock(m); setStockForm({ quantity_change:'', change_type:'IN', notes:'' }); }}>
                          Update Stock
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openHistoryModal(m)} title="View Stock Movement Audit Trail">
                          📜 Logs
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !meds.length && <div className="empty-state"><span className="empty-state-icon">💊</span><h4>No medicines found</h4></div>}
          </div>
        </div>
      </div>

      {/* Stock Movement Log Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHistoryModal(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>📜 Stock Movement Audit: {showHistoryModal.medicine_name}</h3>
              <button className="modal-close" onClick={() => setShowHistoryModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
                Full chronological ledger of stock movements and audit records.
              </p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Qty Changed</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Logged By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map(log => (
                      <tr key={log.log_id}>
                        <td style={{ fontSize: 12 }}>{new Date(log.logged_at).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${log.change_type === 'IN' ? 'badge-success' : log.change_type === 'OUT' ? 'badge-danger' : 'badge-warning'}`}>
                            {log.change_type}
                          </span>
                        </td>
                        <td><strong>{log.quantity_changed}</strong></td>
                        <td>{log.quantity_before}</td>
                        <td><strong>{log.quantity_after}</strong></td>
                        <td>{log.logged_by_name || 'System'}</td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loadingHistory && !historyLogs.length && (
                  <div className="empty-state">
                    <p>No logged stock changes yet for this item.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header"><h3>➕ Add New Medicine</h3><button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button></div>
            <div className="modal-body">
              <form onSubmit={addMed}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Medicine Name *</label><input className="form-control" value={form.medicine_name} onChange={e=>setForm(f=>({...f,medicine_name:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Generic Name</label><input className="form-control" value={form.generic_name} onChange={e=>setForm(f=>({...f,generic_name:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Brand</label><input className="form-control" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Dosage Form</label>
                    <select className="form-control" value={form.dosage_form} onChange={e=>setForm(f=>({...f,dosage_form:e.target.value}))}>
                      {['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Other'].map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Strength</label><input className="form-control" placeholder="e.g. 500mg" value={form.strength} onChange={e=>setForm(f=>({...f,strength:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Unit Price (Rs.) *</label><input className="form-control" type="number" value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Initial Stock *</label><input className="form-control" type="number" value={form.stock_quantity} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Reorder Level</label><input className="form-control" type="number" value={form.reorder_level} onChange={e=>setForm(f=>({...f,reorder_level:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Expiry Date</label><input type="date" className="form-control" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Manufacturer</label><input className="form-control" value={form.manufacturer} onChange={e=>setForm(f=>({...f,manufacturer:e.target.value}))} /></div>
                </div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:8}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Medicine</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      {showStock && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowStock(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header"><h3>📦 Update Stock — {showStock.medicine_name}</h3><button className="modal-close" onClick={()=>setShowStock(null)}>✕</button></div>
            <div className="modal-body">
              <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:16}}>Current Stock: <strong>{showStock.stock_quantity}</strong> units</p>
              <form onSubmit={updateStock}>
                <div className="form-group"><label className="form-label">Change Type</label>
                  <select className="form-control" value={stockForm.change_type} onChange={e=>setStockForm(f=>({...f,change_type:e.target.value}))}>
                    <option value="IN">IN (Restock)</option>
                    <option value="OUT">OUT (Manual Remove)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Set to exact)</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Quantity *</label><input className="form-control" type="number" min={1} value={stockForm.quantity_change} onChange={e=>setStockForm(f=>({...f,quantity_change:e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Notes</label><input className="form-control" placeholder="Reason for change..." value={stockForm.notes} onChange={e=>setStockForm(f=>({...f,notes:e.target.value}))} /></div>
                <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowStock(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Update Stock</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
export default PharmacyInventory;
