import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  FileText, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  Plus, 
  Package, 
  Search,
  History,
  X
} from 'lucide-react';

const PharmacyInventory = () => {
  const [allMeds, setAllMeds] = useState([]);
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [showStock, setShowStock] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);

  // Forms state
  const [form, setForm] = useState({
    medicine_name: '',
    generic_name: '',
    brand: '',
    category: '',
    dosage_form: 'Tablet',
    strength: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: 10,
    expiry_date: '',
    manufacturer: ''
  });

  const [editForm, setEditForm] = useState({
    medicine_name: '',
    generic_name: '',
    brand: '',
    category: '',
    unit_price: '',
    reorder_level: 10,
    expiry_date: ''
  });

  const [stockForm, setStockForm] = useState({
    quantity_change: '',
    change_type: 'IN',
    notes: ''
  });

  // History state
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Report state (calls sp_medicine_inventory_report via GET /api/pharmacy/report)
  const [reportCategory, setReportCategory] = useState('ALL');
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAdd(false);
        setShowStock(null);
        setShowEdit(null);
        setShowReport(false);
        setShowHistoryModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all medicines
  const load = () => {
    setLoading(true);
    API.get('/pharmacy/medicines')
      .then(r => setAllMeds(r.data.data || []))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load medicines');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Distinct categories preserved regardless of active status filter
  const categories = useMemo(() => {
    return Array.from(new Set(allMeds.map(m => m.category).filter(Boolean))).sort();
  }, [allMeds]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: allMeds.length,
      available: allMeds.filter(m => m.stock_status === 'Available').length,
      lowStock: allMeds.filter(m => m.stock_quantity <= m.reorder_level).length,
      outOfStock: allMeds.filter(m => m.stock_quantity === 0).length,
      expiringSoon: allMeds.filter(m => m.stock_status === 'Expiring Soon' || (m.days_to_expiry !== null && m.days_to_expiry <= 30)).length
    };
  }, [allMeds]);

  // Active filtered medicines list
  const filteredMeds = useMemo(() => {
    return allMeds.filter(m => {
      // 1. Stock Status Filter
      if (stockStatusFilter === 'Available' && m.stock_status !== 'Available') return false;
      if (stockStatusFilter === 'Low Stock' && m.stock_quantity > m.reorder_level) return false;
      if (stockStatusFilter === 'Out of Stock' && m.stock_quantity > 0) return false;
      if (stockStatusFilter === 'Expiring Soon' && m.stock_status !== 'Expiring Soon' && (m.days_to_expiry === null || m.days_to_expiry > 30)) return false;

      // 2. Category Filter
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = m.medicine_name?.toLowerCase().includes(q);
        const genericMatch = m.generic_name?.toLowerCase().includes(q);
        const brandMatch = m.brand?.toLowerCase().includes(q);
        if (!nameMatch && !genericMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [allMeds, stockStatusFilter, categoryFilter, search]);

  // Open Stock History
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

  // Open Edit Modal
  const openEditModal = (med) => {
    setShowEdit(med);
    setEditForm({
      medicine_name: med.medicine_name || '',
      generic_name: med.generic_name || '',
      brand: med.brand || '',
      category: med.category || '',
      unit_price: med.unit_price || '',
      reorder_level: med.reorder_level ?? 10,
      expiry_date: med.expiry_date ? med.expiry_date.split('T')[0] : ''
    });
  };

  // Submit Edit Medicine
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/pharmacy/medicines/${showEdit.medicine_id}`, editForm);
      toast.success('Medicine updated successfully!');
      setShowEdit(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update medicine');
    }
  };

  // Submit Add Medicine
  const addMed = async (e) => {
    e.preventDefault();
    try {
      await API.post('/pharmacy/medicines', form);
      toast.success('Medicine added successfully!');
      setShowAdd(false);
      setForm({
        medicine_name: '', generic_name: '', brand: '', category: '',
        dosage_form: 'Tablet', strength: '', unit_price: '', stock_quantity: '',
        reorder_level: 10, expiry_date: '', manufacturer: ''
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add medicine');
    }
  };

  // Submit Update Stock
  const updateStock = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/pharmacy/medicines/${showStock.medicine_id}/stock`, stockForm);
      toast.success('Stock updated successfully!');
      setShowStock(null);
      setStockForm({ quantity_change: '', change_type: 'IN', notes: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  // Fetch Inventory Report from procedure sp_medicine_inventory_report
  const fetchReport = async (cat = reportCategory) => {
    setLoadingReport(true);
    try {
      const res = await API.get(`/pharmacy/report?category=${cat}`);
      setReportData(res.data.data || []);
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  const openReportModal = () => {
    setShowReport(true);
    fetchReport('ALL');
  };

  const STOCK_STATUS_BADGE = {
    'Available': 'badge-success',
    'Low Stock': 'badge-warning',
    'Out of Stock': 'badge-danger',
    'Expiring Soon': 'badge-amber'
  };

  return (
    <DashboardLayout 
      title="Medicine Inventory & Stock Control"
      subtitle="Comprehensive pharmaceutical registry, threshold alerts, and batch audits"
    >
      {/* FILTER & ACTIONS BAR */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Status Tabs with Live Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setStockStatusFilter('ALL')}
            >
              All Inventory ({counts.all})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Available' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setStockStatusFilter('Available')}
            >
              Available ({counts.available})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Low Stock' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setStockStatusFilter('Low Stock')}
            >
              Low Stock ({counts.lowStock})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Out of Stock' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setStockStatusFilter('Out of Stock')}
            >
              Out of Stock ({counts.outOfStock})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Expiring Soon' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setStockStatusFilter('Expiring Soon')}
            >
              Expiring Soon ({counts.expiringSoon})
            </button>
          </div>

          {/* Search, Category Filter & Action Buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              style={{ width: 160 }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                style={{ width: 200 }}
                placeholder="Search medicines..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={openReportModal}>
              <FileText size={15} />
              <span>Inventory Report</span>
            </button>

            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <Plus size={15} />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>
      </div>

      {/* MEDICINE CATALOG TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>💊 Medicine Catalog ({filteredMeds.length})</h3>
          {(stockStatusFilter !== 'ALL' || categoryFilter !== 'ALL' || search) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setStockStatusFilter('ALL'); setCategoryFilter('ALL'); setSearch(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Form</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => (
                  <tr key={m.medicine_id}>
                    <td>
                      <strong>{m.medicine_name}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {m.generic_name} {m.brand ? `(${m.brand})` : ''}
                      </span>
                    </td>
                    <td>{m.category || '—'}</td>
                    <td>{m.dosage_form}</td>
                    <td>Rs. {Number(m.unit_price).toLocaleString()}</td>
                    <td>
                      <strong style={{ color: m.stock_quantity <= m.reorder_level ? 'var(--danger)' : 'var(--success)' }}>
                        {m.stock_quantity}
                      </strong>
                    </td>
                    <td>{m.reorder_level}</td>
                    <td style={{ fontSize: 12 }}>{m.expiry_date ? m.expiry_date.split('T')[0] : '—'}</td>
                    <td>
                      <span className={`badge ${STOCK_STATUS_BADGE[m.stock_status] || 'badge-gray'}`}>
                        {m.stock_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setShowStock(m);
                            setStockForm({ quantity_change: '', change_type: 'IN', notes: '' });
                          }}
                          title="Restock or Adjust Units"
                        >
                          Stock
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(m)}
                          title="Edit Medicine Details"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openHistoryModal(m)}
                          title="View Stock Movement Audit Trail"
                        >
                          <History size={13} />
                          <span>Logs</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !filteredMeds.length && (
              <div className="empty-state">
                <span className="empty-state-icon">💊</span>
                <h4>No medicines found</h4>
                <p>Try clearing filters or search query.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POP-UP MODAL: ADD NEW MEDICINE */}
      {showAdd && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus className="text-primary" size={20} />
                <span>Add New Medicine</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowAdd(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={addMed}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Medicine Name *</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Paracetamol 500mg"
                      value={form.medicine_name} 
                      onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Generic Name</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Acetaminophen"
                      value={form.generic_name} 
                      onChange={e => setForm(f => ({ ...f, generic_name: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Panadol"
                      value={form.brand} 
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Analgesic"
                      value={form.category} 
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage Form</label>
                    <select 
                      className="form-control" 
                      value={form.dosage_form} 
                      onChange={e => setForm(f => ({ ...f, dosage_form: e.target.value }))}
                    >
                      {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Other'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Strength</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. 500mg or 10ml" 
                      value={form.strength} 
                      onChange={e => setForm(f => ({ ...f, strength: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (Rs.) *</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      value={form.unit_price} 
                      onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock *</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      placeholder="0"
                      value={form.stock_quantity} 
                      onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Level Threshold</label>
                    <input 
                      className="form-control" 
                      type="number" 
                      value={form.reorder_level} 
                      onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={form.expiry_date} 
                      onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Manufacturer / Supplier</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. GlaxoSmithKline"
                      value={form.manufacturer} 
                      onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Save & Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: EDIT MEDICINE */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEdit(null)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 className="text-primary" size={18} />
                <span>Edit Medicine: {showEdit.medicine_name}</span>
              </h3>
              <button className="modal-close" onClick={() => setShowEdit(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Medicine Name *</label>
                    <input
                      className="form-control"
                      value={editForm.medicine_name}
                      onChange={e => setEditForm(f => ({ ...f, medicine_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Generic Name</label>
                    <input
                      className="form-control"
                      value={editForm.generic_name}
                      onChange={e => setEditForm(f => ({ ...f, generic_name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input
                      className="form-control"
                      value={editForm.brand}
                      onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      className="form-control"
                      value={editForm.category}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (Rs.) *</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      value={editForm.unit_price}
                      onChange={e => setEditForm(f => ({ ...f, unit_price: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Level *</label>
                    <input
                      className="form-control"
                      type="number"
                      value={editForm.reorder_level}
                      onChange={e => setEditForm(f => ({ ...f, reorder_level: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.expiry_date}
                      onChange={e => setEditForm(f => ({ ...f, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: MEDICINE INVENTORY REPORT */}
      {showReport && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReport(false)}>
          <div className="modal" style={{ maxWidth: 900, maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText className="text-primary" size={20} />
                  <span>Medicine Inventory Report</span>
                </h3>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '4px 0 0' }}>
                  Generated via Stored Procedure <code>sp_medicine_inventory_report</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button className="modal-close" onClick={() => setShowReport(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Category Filter for Report */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Filter by Category:</label>
                  <select
                    className="form-control"
                    style={{ width: 180 }}
                    value={reportCategory}
                    onChange={e => {
                      setReportCategory(e.target.value);
                      fetchReport(e.target.value);
                    }}
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <span className="badge badge-info">{reportData.length} Items Listed</span>
              </div>

              {/* Report Table */}
              <div className="table-container">
                <table className="table" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Category</th>
                      <th>Form / Strength</th>
                      <th>Unit Price</th>
                      <th>Stock Qty</th>
                      <th>Reorder Lvl</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r.medicine_id}>
                        <td>
                          <strong>{r.medicine_name}</strong>
                          <br />
                          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{r.generic_name}</span>
                        </td>
                        <td>{r.category || '—'}</td>
                        <td>{r.dosage_form} ({r.strength || 'N/A'})</td>
                        <td>Rs. {Number(r.unit_price).toLocaleString()}</td>
                        <td>
                          <strong>{r.stock_quantity}</strong>
                        </td>
                        <td>{r.reorder_level}</td>
                        <td>
                          {r.expiry_date ? r.expiry_date.split('T')[0] : '—'}
                          {r.days_to_expiry !== null && (
                            <span style={{ display: 'block', fontSize: 10, color: r.days_to_expiry <= 30 ? 'var(--danger)' : 'var(--gray-400)' }}>
                              ({r.days_to_expiry} days left)
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            r.stock_status === 'OUT OF STOCK' ? 'badge-danger' :
                            r.stock_status === 'LOW STOCK' ? 'badge-warning' :
                            r.stock_status === 'EXPIRING SOON' ? 'badge-amber' :
                            'badge-success'
                          }`}>
                            {r.stock_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loadingReport && (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <span className="spinner-large" />
                    <p style={{ marginTop: 8, fontSize: 13, color: 'var(--gray-500)' }}>Executing procedure...</p>
                  </div>
                )}
                {!loadingReport && !reportData.length && (
                  <div className="empty-state">
                    <p>No records found for this category.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: STOCK MOVEMENT AUDIT (vw_medicine_stock_history) */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHistoryModal(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>📜 Stock Movement Audit: {showHistoryModal.medicine_name}</h3>
              <button className="modal-close" onClick={() => setShowHistoryModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
                Full chronological ledger from view <code>vw_medicine_stock_history</code>.
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

      {/* POP-UP MODAL: UPDATE STOCK */}
      {showStock && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowStock(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>📦 Update Stock — {showStock.medicine_name}</h3>
              <button className="modal-close" onClick={() => setShowStock(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={updateStock}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                  Current Stock: <strong>{showStock.stock_quantity}</strong> units
                </p>
                <div className="form-group">
                  <label className="form-label">Change Type</label>
                  <select
                    className="form-control"
                    value={stockForm.change_type}
                    onChange={e => setStockForm(f => ({ ...f, change_type: e.target.value }))}
                  >
                    <option value="IN">IN (Restock / Arrival)</option>
                    <option value="OUT">OUT (Manual Removal / Disposal)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    className="form-control"
                    type="number"
                    min={1}
                    value={stockForm.quantity_change}
                    onChange={e => setStockForm(f => ({ ...f, quantity_change: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-control"
                    placeholder="Reason for change..."
                    value={stockForm.notes}
                    onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStock(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PharmacyInventory;
