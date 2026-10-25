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
  X, 
  Trash2, 
  RotateCcw, 
  Info, 
  Archive, 
  AlertOctagon, 
  TrendingDown, 
  Calendar,
  Layers,
  Sparkles,
  Clock,
  Check
} from 'lucide-react';

const PharmacyInventory = () => {
  const [allMeds, setAllMeds] = useState([]);
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [showStock, setShowStock] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Deactivate & Restore Modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Disposal Modal state
  const [showDisposeModal, setShowDisposeModal] = useState(null);
  const [disposeForm, setDisposeForm] = useState({
    quantity: '',
    reason: 'EXPIRED',
    notes: ''
  });
  const [disposing, setDisposing] = useState(false);

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
    manufacturer: '',
    description: ''
  });

  const [editForm, setEditForm] = useState({
    medicine_name: '',
    generic_name: '',
    brand: '',
    category: '',
    dosage_form: 'Tablet',
    strength: '',
    unit_price: '',
    reorder_level: 10,
    expiry_date: '',
    manufacturer: '',
    description: ''
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
        setShowProfileModal(null);
        setShowDeactivateModal(null);
        setShowDisposeModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch medicines based on active / archived tab
  const load = (tab = activeTab) => {
    setLoading(true);
    API.get(`/pharmacy/medicines?active_filter=${tab}`)
      .then(r => setAllMeds(r.data.data || []))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load medicines');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  // Distinct categories
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

  // Open Medicine Full Profile
  const openProfileModal = async (med) => {
    setShowProfileModal(med);
    setLoadingProfile(true);
    setProfileData(null);
    try {
      const res = await API.get(`/pharmacy/medicines/${med.medicine_id}`);
      setProfileData(res.data);
    } catch (err) {
      toast.error('Failed to load medicine details');
    } finally {
      setLoadingProfile(false);
    }
  };

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

  // Open Edit Modal with full fields
  const openEditModal = (med) => {
    setShowEdit(med);
    setEditForm({
      medicine_name: med.medicine_name || '',
      generic_name: med.generic_name || '',
      brand: med.brand || '',
      category: med.category || '',
      dosage_form: med.dosage_form || 'Tablet',
      strength: med.strength || '',
      unit_price: med.unit_price || '',
      reorder_level: med.reorder_level ?? 10,
      expiry_date: med.expiry_date ? med.expiry_date.split('T')[0] : '',
      manufacturer: med.manufacturer || '',
      description: med.description || ''
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
        reorder_level: 10, expiry_date: '', manufacturer: '', description: ''
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

  // Submit Deactivate / Soft Delete
  const handleDeactivateMedicine = async () => {
    if (!showDeactivateModal) return;
    setDeactivating(true);
    try {
      const res = await API.delete(`/pharmacy/medicines/${showDeactivateModal.medicine_id}`);
      toast.success(res.data.message || 'Medicine deactivated and archived.');
      setShowDeactivateModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate medicine');
    } finally {
      setDeactivating(false);
    }
  };

  // Submit Restore
  const handleRestoreMedicine = async (med) => {
    try {
      const res = await API.patch(`/pharmacy/medicines/${med.medicine_id}/restore`);
      toast.success(res.data.message || 'Medicine restored to active catalog.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore medicine');
    }
  };

  // Submit Disposal / Waste Write-off
  const handleDisposeSubmit = async (e) => {
    e.preventDefault();
    if (!showDisposeModal) return;
    setDisposing(true);
    try {
      const res = await API.post(`/pharmacy/medicines/${showDisposeModal.medicine_id}/dispose`, disposeForm);
      toast.success(res.data.message || 'Disposal recorded successfully.');
      setShowDisposeModal(null);
      setDisposeForm({ quantity: '', reason: 'EXPIRED', notes: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record disposal');
    } finally {
      setDisposing(false);
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

  const renderStockStatusBadge = (status, daysToExpiry) => {
    if (status === 'Available') {
      return (
        <span className="badge badge-success" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
          Available
        </span>
      );
    }
    if (status === 'Low Stock') {
      return (
        <span className="badge badge-warning" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }}></span>
          Low Stock
        </span>
      );
    }
    if (status === 'Out of Stock') {
      return (
        <span className="badge badge-danger" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}></span>
          Out of Stock
        </span>
      );
    }
    return (
      <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Clock size={11} />
        Expiring Soon
      </span>
    );
  };

  return (
    <DashboardLayout 
      title="Medicine Inventory & Stock Control"
      subtitle="Comprehensive pharmaceutical registry, threshold alerts, and batch audits"
    >
      {/* FILTER & ACTIONS BAR */}
      <div className="card" style={{ marginBottom: 18, padding: '16px 20px', borderRadius: 12 }}>
        {/* ROW 1: View Switcher Tabs + Search + Add / Report Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Active vs Archived Segmented Tabs */}
          <div style={{ display: 'inline-flex', background: 'var(--slate-100)', padding: 3, borderRadius: 9, border: '1px solid var(--slate-200)' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 7,
                fontWeight: 600,
                fontSize: 12.5,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              onClick={() => setActiveTab('active')}
            >
              <Package size={14} />
              <span>Active Catalog ({counts.all})</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'archived' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 7,
                fontWeight: 600,
                fontSize: 12.5,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              onClick={() => setActiveTab('archived')}
            >
              <Archive size={14} />
              <span>Archived / Inactive</span>
            </button>
          </div>

          {/* Search, Category Filter & Action Buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              style={{ width: 160, height: 36, fontSize: 13, borderRadius: 8 }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                style={{ width: 220, height: 36, fontSize: 13, borderRadius: 8, paddingLeft: 32 }}
                placeholder="Search medicines..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
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

            <button 
              type="button" 
              className="btn btn-outline btn-sm" 
              onClick={openReportModal}
              style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
            >
              <FileText size={15} />
              <span>Inventory Report</span>
            </button>

            {activeTab === 'active' && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => setShowAdd(true)}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}
              >
                <Plus size={16} />
                <span>Add Medicine</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Filter Status Pills (for active catalog) */}
        {activeTab === 'active' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--slate-100)', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginRight: 4 }}>Filter Status:</span>
            
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
              onClick={() => setStockStatusFilter('ALL')}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Available' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
              onClick={() => setStockStatusFilter('Available')}
            >
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: 5 }}></span>
              Available ({counts.available})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Low Stock' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
              onClick={() => setStockStatusFilter('Low Stock')}
            >
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginRight: 5 }}></span>
              Low Stock ({counts.lowStock})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Out of Stock' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
              onClick={() => setStockStatusFilter('Out of Stock')}
            >
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginRight: 5 }}></span>
              Out of Stock ({counts.outOfStock})
            </button>
            <button
              type="button"
              className={`btn ${stockStatusFilter === 'Expiring Soon' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
              onClick={() => setStockStatusFilter('Expiring Soon')}
            >
              <Clock size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
              Expiring Soon ({counts.expiringSoon})
            </button>
          </div>
        )}
      </div>

      {/* MEDICINE CATALOG TABLE CARD */}
      <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--slate-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>💊</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--slate-800)' }}>
              {activeTab === 'active' ? 'Active Medicine Catalog' : 'Archived / Discontinued Medicines'}
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 12 }}>
                {filteredMeds.length} items
              </span>
            </h3>
          </div>

          {(stockStatusFilter !== 'ALL' || categoryFilter !== 'ALL' || search) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ borderRadius: 6, fontSize: 12 }}
              onClick={() => { setStockStatusFilter('ALL'); setCategoryFilter('ALL'); setSearch(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ padding: 0 }}>
          <div className="table-container" style={{ margin: 0, overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '22%', minWidth: 180, paddingLeft: 20 }}>MEDICINE</th>
                  <th style={{ width: '13%', minWidth: 120 }}>CATEGORY</th>
                  <th style={{ width: '14%', minWidth: 130 }}>FORM & STRENGTH</th>
                  <th style={{ width: '10%', minWidth: 95, whiteSpace: 'nowrap' }}>PRICE</th>
                  <th style={{ width: '8%', minWidth: 70, textAlign: 'center', whiteSpace: 'nowrap' }}>STOCK</th>
                  <th style={{ width: '7%', minWidth: 65, textAlign: 'center', whiteSpace: 'nowrap' }}>REORDER</th>
                  <th style={{ width: '11%', minWidth: 105, whiteSpace: 'nowrap' }}>EXPIRY</th>
                  <th style={{ width: '10%', minWidth: 105, whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ width: '5%', minWidth: 180, textAlign: 'right', paddingRight: 20, whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => (
                  <tr key={m.medicine_id} style={{ height: 58 }}>
                    {/* MEDICINE */}
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span 
                          style={{ 
                            fontWeight: 600, 
                            color: 'var(--primary-600)', 
                            cursor: 'pointer',
                            fontSize: 13.5
                          }}
                          onClick={() => openProfileModal(m)}
                          title="Click to view full specifications"
                        >
                          {m.medicine_name}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 1 }}>
                          {m.generic_name} {m.brand ? `(${m.brand})` : ''}
                        </span>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '3px 8px', 
                        borderRadius: 6, 
                        fontSize: 11.5, 
                        background: 'var(--slate-100)', 
                        color: 'var(--slate-600)',
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        {m.category || 'General'}
                      </span>
                    </td>

                    {/* FORM & STRENGTH */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--slate-700)' }}>
                        {m.dosage_form}
                      </span>
                      {m.strength && (
                        <span style={{ fontSize: 11.5, color: 'var(--slate-500)', marginLeft: 4 }}>
                          · {m.strength}
                        </span>
                      )}
                    </td>

                    {/* PRICE */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: 13 }}>
                        Rs. {Number(m.unit_price).toLocaleString()}
                      </span>
                    </td>

                    {/* STOCK */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: 13.5, 
                        color: m.stock_quantity <= 0 ? '#ef4444' : m.stock_quantity <= m.reorder_level ? '#f59e0b' : '#10b981' 
                      }}>
                        {m.stock_quantity}
                      </span>
                    </td>

                    {/* REORDER */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', color: 'var(--slate-500)', fontSize: 12 }}>
                      {m.reorder_level}
                    </td>

                    {/* EXPIRY */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--slate-600)' }}>
                      {m.expiry_date ? m.expiry_date.split('T')[0] : '—'}
                    </td>

                    {/* STATUS */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {renderStockStatusBadge(m.stock_status, m.days_to_expiry)}
                    </td>

                    {/* COMPACT UNIFIED ACTIONS TOOLBAR */}
                    <td style={{ textAlign: 'right', paddingRight: 20, whiteSpace: 'nowrap' }}>
                      <div className="table-action-group" style={{ display: 'inline-flex', gap: 5 }}>
                        {/* View Profile */}
                        <button
                          type="button"
                          className="table-action-btn btn-view"
                          onClick={() => openProfileModal(m)}
                          title="View Full Medicine Specifications"
                        >
                          <Info size={14} />
                        </button>

                        {activeTab === 'active' ? (
                          <>
                            {/* Stock Adjustment / Restock */}
                            <button
                              type="button"
                              className="table-action-btn btn-stock"
                              onClick={() => {
                                setShowStock(m);
                                setStockForm({ quantity_change: '', change_type: 'IN', notes: '' });
                              }}
                              title="Restock / Adjust Inventory Units"
                            >
                              <Package size={14} />
                            </button>

                            {/* Edit Medicine */}
                            <button
                              type="button"
                              className="table-action-btn btn-edit"
                              onClick={() => openEditModal(m)}
                              title="Edit Medicine Details"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Dispose Damaged / Expired */}
                            <button
                              type="button"
                              className="table-action-btn btn-waste"
                              onClick={() => {
                                setShowDisposeModal(m);
                                setDisposeForm({ quantity: '', reason: 'EXPIRED', notes: '' });
                              }}
                              title="Dispose Damaged or Expired Stock"
                            >
                              <TrendingDown size={14} />
                            </button>

                            {/* History Logs */}
                            <button
                              type="button"
                              className="table-action-btn btn-history"
                              onClick={() => openHistoryModal(m)}
                              title="View Stock Movement Audit Trail"
                            >
                              <History size={14} />
                            </button>

                            {/* Deactivate / Soft Delete */}
                            <button
                              type="button"
                              className="table-action-btn btn-delete"
                              onClick={() => setShowDeactivateModal(m)}
                              title="Deactivate / Archive Medicine"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="table-action-btn btn-stock"
                            onClick={() => handleRestoreMedicine(m)}
                            title="Restore Medicine to Active Inventory"
                            style={{ color: '#16a34a' }}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !filteredMeds.length && (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <span className="empty-state-icon" style={{ fontSize: 32 }}>💊</span>
                <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 600 }}>No medicines found</h4>
                <p style={{ color: 'var(--slate-500)', fontSize: 13 }}>Try clearing filters or adjusting your search term.</p>
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
          <div className="modal" style={{ maxWidth: 640 }}>
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
                    <label className="form-label">
                      Medicine Name <span className="text-danger">*</span>
                    </label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Amoxicillin" 
                      required
                      value={form.medicine_name}
                      onChange={e => setForm({ ...form, medicine_name: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Generic Name</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Amoxicillin Trihydrate" 
                      value={form.generic_name}
                      onChange={e => setForm({ ...form, generic_name: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Moxatag / Glaxo" 
                      value={form.brand}
                      onChange={e => setForm({ ...form, brand: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. Antibiotic, Analgesic..." 
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dosage Form</label>
                    <select 
                      className="form-control"
                      value={form.dosage_form}
                      onChange={e => setForm({ ...form, dosage_form: e.target.value })}
                    >
                      {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Other'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Strength</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. 500mg / 10ml" 
                      value={form.strength}
                      onChange={e => setForm({ ...form, strength: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Unit Price (Rs.) <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="0.00" 
                      required
                      value={form.unit_price}
                      onChange={e => setForm({ ...form, unit_price: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="0" 
                      value={form.stock_quantity}
                      onChange={e => setForm({ ...form, stock_quantity: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reorder Level Threshold</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={form.reorder_level}
                      onChange={e => setForm({ ...form, reorder_level: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Batch Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={form.expiry_date}
                      onChange={e => setForm({ ...form, expiry_date: e.target.value })} 
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Manufacturer</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. State Pharmaceuticals Manufacturing" 
                      value={form.manufacturer}
                      onChange={e => setForm({ ...form, manufacturer: e.target.value })} 
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Description / Clinical Notes</label>
                    <textarea 
                      className="form-control" 
                      rows={2}
                      placeholder="Storage conditions, special instructions..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: FULL EDIT MEDICINE */}
      {showEdit && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowEdit(null)}
        >
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 className="text-primary" size={20} />
                <span>Edit Medicine: {showEdit.medicine_name}</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowEdit(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Medicine Name <span className="text-danger">*</span>
                    </label>
                    <input 
                      className="form-control" 
                      required
                      value={editForm.medicine_name}
                      onChange={e => setEditForm({ ...editForm, medicine_name: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Generic Name</label>
                    <input 
                      className="form-control" 
                      value={editForm.generic_name}
                      onChange={e => setEditForm({ ...editForm, generic_name: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      className="form-control" 
                      value={editForm.brand}
                      onChange={e => setEditForm({ ...editForm, brand: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      className="form-control" 
                      value={editForm.category}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dosage Form</label>
                    <select 
                      className="form-control"
                      value={editForm.dosage_form}
                      onChange={e => setEditForm({ ...editForm, dosage_form: e.target.value })}
                    >
                      {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Other'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Strength</label>
                    <input 
                      className="form-control" 
                      value={editForm.strength}
                      onChange={e => setEditForm({ ...editForm, strength: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Unit Price (Rs.) <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      required
                      value={editForm.unit_price}
                      onChange={e => setEditForm({ ...editForm, unit_price: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reorder Level Threshold</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={editForm.reorder_level}
                      onChange={e => setEditForm({ ...editForm, reorder_level: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Batch Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={editForm.expiry_date}
                      onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input 
                      className="form-control" 
                      value={editForm.manufacturer}
                      onChange={e => setEditForm({ ...editForm, manufacturer: e.target.value })} 
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Description / Storage Notes</label>
                    <textarea 
                      className="form-control" 
                      rows={2}
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEdit(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: UPDATE / RESTOCK INVENTORY (sp_update_medicine_stock) */}
      {showStock && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowStock(null)}
        >
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package className="text-primary" size={20} />
                <span>Adjust Stock: {showStock.medicine_name}</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowStock(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={updateStock}>
              <div className="modal-body">
                <div style={{ marginBottom: 14, padding: 12, background: 'var(--slate-50)', borderRadius: 6, fontSize: 13 }}>
                  <div>Current Stock: <strong>{showStock.stock_quantity} units</strong></div>
                  <div>Reorder Threshold: <strong>{showStock.reorder_level} units</strong></div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Operation Type</label>
                  <select 
                    className="form-control"
                    value={stockForm.change_type}
                    onChange={e => setStockForm({ ...stockForm, change_type: e.target.value })}
                  >
                    <option value="IN">Stock IN (New Shipment / Restock)</option>
                    <option value="OUT">Stock OUT (Manual Deduction)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Audit Reconciliation)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">
                    Quantity ({stockForm.change_type === 'ADJUSTMENT' ? 'New Target Total' : 'Units to Change'}) <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="Enter units" 
                    required
                    value={stockForm.quantity_change}
                    onChange={e => setStockForm({ ...stockForm, quantity_change: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Reason Notes</label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Invoice #PO-941, periodic audit..." 
                    value={stockForm.notes}
                    onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowStock(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: DISPOSAL & WASTE (Damage / Expired) */}
      {showDisposeModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowDisposeModal(null)}
        >
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309' }}>
                <AlertOctagon size={20} />
                <span>Write-off / Dispose Stock</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowDisposeModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleDisposeSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 14, padding: 12, background: '#fef3c7', borderRadius: 6, fontSize: 13, color: '#92400e' }}>
                  <div>Medicine: <strong>{showDisposeModal.medicine_name}</strong></div>
                  <div>Available Stock: <strong>{showDisposeModal.stock_quantity} units</strong></div>
                  <div>Expiry Date: <strong>{showDisposeModal.expiry_date ? showDisposeModal.expiry_date.split('T')[0] : 'N/A'}</strong></div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Disposal Reason <span className="text-danger">*</span></label>
                  <select 
                    className="form-control"
                    value={disposeForm.reason}
                    onChange={e => setDisposeForm({ ...disposeForm, reason: e.target.value })}
                  >
                    <option value="EXPIRED">Batch Expired / Shelf-Life Reached</option>
                    <option value="DAMAGED_PACKAGE">Broken Container / Damaged Seal</option>
                    <option value="CONTAMINATED">Contamination / Compromised Storage</option>
                    <option value="RECALLED">Manufacturer Recall / Defect</option>
                    <option value="OTHER">Other Pharmacy Write-off</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">
                    Quantity to Dispose <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="Enter units to discard" 
                    max={showDisposeModal.stock_quantity}
                    min="1"
                    required
                    value={disposeForm.quantity}
                    onChange={e => setDisposeForm({ ...disposeForm, quantity: e.target.value })} 
                  />
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    Cannot exceed current stock ({showDisposeModal.stock_quantity} units).
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Disposal Audit Note</label>
                  <textarea 
                    className="form-control" 
                    rows={2}
                    placeholder="Disposal certificate #, incinerator batch, witness name..." 
                    value={disposeForm.notes}
                    onChange={e => setDisposeForm({ ...disposeForm, notes: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDisposeModal(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger" 
                  disabled={disposing}
                  style={{ background: '#b45309', borderColor: '#b45309' }}
                >
                  {disposing ? 'Recording...' : 'Confirm Stock Write-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: DEACTIVATE / SOFT DELETE CONFIRMATION */}
      {showDeactivateModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowDeactivateModal(null)}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                <Trash2 size={20} />
                <span>Deactivate Medicine</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowDeactivateModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14 }}>
                Are you sure you want to deactivate <strong>{showDeactivateModal.medicine_name}</strong>?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
                ℹ️ This performs a safe soft-delete. The medicine will be moved to the <strong>Archived Catalog</strong> and hidden from doctor prescribing, while maintaining full history in medical records.
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowDeactivateModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleDeactivateMedicine}
                disabled={deactivating}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: SINGLE MEDICINE FULL PROFILE */}
      {showProfileModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowProfileModal(null)}
        >
          <div className="modal" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info className="text-primary" size={20} />
                <span>Medicine Profile: {showProfileModal.medicine_name}</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowProfileModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingProfile ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <span className="spinner-large" />
                  <p style={{ marginTop: 10, color: 'var(--gray-500)' }}>Loading full specifications...</p>
                </div>
              ) : profileData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: 10, background: 'var(--slate-50)', borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Current Stock</div>
                      <strong style={{ fontSize: 18, color: profileData.data.stock_quantity <= profileData.data.reorder_level ? '#dc2626' : '#16a34a' }}>
                        {profileData.data.stock_quantity}
                      </strong>
                    </div>
                    <div style={{ padding: 10, background: 'var(--slate-50)', borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Unit Price</div>
                      <strong style={{ fontSize: 18, color: 'var(--primary-700)' }}>
                        Rs. {Number(profileData.data.unit_price).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ padding: 10, background: 'var(--slate-50)', borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Total Dispensed</div>
                      <strong style={{ fontSize: 18, color: 'var(--slate-800)' }}>
                        {profileData.statistics?.total_dispensed_qty || 0} units
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 16 }}>
                    <div><strong>Generic Name:</strong> {profileData.data.generic_name || '—'}</div>
                    <div><strong>Brand:</strong> {profileData.data.brand || '—'}</div>
                    <div><strong>Category:</strong> {profileData.data.category || '—'}</div>
                    <div><strong>Dosage Form:</strong> {profileData.data.dosage_form || '—'}</div>
                    <div><strong>Strength:</strong> {profileData.data.strength || '—'}</div>
                    <div><strong>Reorder Level:</strong> {profileData.data.reorder_level} units</div>
                    <div><strong>Batch Expiry:</strong> {profileData.data.expiry_date ? profileData.data.expiry_date.split('T')[0] : '—'}</div>
                    <div><strong>Days to Expiry:</strong> {profileData.data.days_to_expiry ?? 'N/A'} days</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Manufacturer:</strong> {profileData.data.manufacturer || '—'}</div>
                    {profileData.data.description && (
                      <div style={{ gridColumn: 'span 2', background: 'var(--slate-50)', padding: 10, borderRadius: 6 }}>
                        <strong>Description:</strong> {profileData.data.description}
                      </div>
                    )}
                  </div>

                  {/* Recent movements snippet */}
                  <h4 style={{ fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <History size={14} />
                    <span>Recent Inventory Movement Log</span>
                  </h4>
                  <div className="table-container" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Qty Changed</th>
                          <th>Before / After</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(profileData.stock_history || []).map(h => (
                          <tr key={h.log_id}>
                            <td>{h.logged_at ? h.logged_at.split('T')[0] : '—'}</td>
                            <td><span className={`badge ${h.change_type === 'IN' ? 'badge-success' : 'badge-warning'}`}>{h.change_type}</span></td>
                            <td><strong>{h.quantity_changed}</strong></td>
                            <td>{h.quantity_before} → {h.quantity_after}</td>
                            <td style={{ fontSize: 11 }}>{h.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowProfileModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: STOCK HISTORY AUDIT TRAIL */}
      {showHistoryModal && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowHistoryModal(null)}
        >
          <div className="modal" style={{ maxWidth: 780 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History className="text-primary" size={20} />
                <span>Audit Trail: {showHistoryModal.medicine_name}</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowHistoryModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <span className="spinner-large" />
                  <p style={{ marginTop: 10, color: 'var(--gray-500)' }}>Retrieving audit ledger...</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 350, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Qty Delta</th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Reference</th>
                        <th>Notes / Pharmacist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLogs.map(log => (
                        <tr key={log.log_id}>
                          <td style={{ fontSize: 12 }}>
                            {log.logged_at ? new Date(log.logged_at).toLocaleString() : '—'}
                          </td>
                          <td>
                            <span className={`badge ${
                              log.change_type === 'IN' ? 'badge-success' : 
                              log.change_type === 'OUT' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {log.change_type}
                            </span>
                          </td>
                          <td><strong>{log.quantity_changed}</strong></td>
                          <td>{log.quantity_before}</td>
                          <td>{log.quantity_after}</td>
                          <td style={{ fontSize: 11 }}>{log.reference_type || 'MANUAL'}</td>
                          <td style={{ fontSize: 11, maxWidth: 200 }}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!historyLogs.length && (
                    <div className="empty-state">
                      <p>No logged stock changes found for this medicine.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowHistoryModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: INVENTORY REPORT (CALLS sp_medicine_inventory_report) */}
      {showReport && (
        <div 
          className="modal-overlay" 
          onClick={e => e.target === e.currentTarget && setShowReport(false)}
        >
          <div className="modal" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText className="text-primary" size={20} />
                <span>Inventory Valuation & Health Report</span>
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowReport(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Filter Category:</label>
                <select 
                  className="form-control"
                  style={{ width: 200 }}
                  value={reportCategory}
                  onChange={e => {
                    setReportCategory(e.target.value);
                    fetchReport(e.target.value);
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} style={{ marginRight: 4 }} />
                  <span>Print Report</span>
                </button>
              </div>

              {loadingReport ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <span className="spinner-large" />
                  <p style={{ marginTop: 10, color: 'var(--gray-500)' }}>Computing stored procedure report...</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Medicine</th>
                        <th>Strength</th>
                        <th>Stock Qty</th>
                        <th>Unit Price</th>
                        <th>Total Value (Rs.)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.category}</td>
                          <td><strong>{row.medicine_name}</strong></td>
                          <td>{row.strength || '—'}</td>
                          <td>{row.stock_quantity}</td>
                          <td>Rs. {Number(row.unit_price).toFixed(2)}</td>
                          <td>
                            <strong>
                              Rs. {Number(row.total_value || (row.stock_quantity * row.unit_price)).toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            <span className={`badge ${
                              row.stock_status === 'Available' ? 'badge-success' :
                              row.stock_status === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {row.stock_status || 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!reportData.length && (
                    <div className="empty-state">
                      <p>No inventory records found for this category.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowReport(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PharmacyInventory;
