import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import { Shield, Search, RefreshCw, Calendar, Filter } from 'lucide-react';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter && actionFilter !== 'ALL') params.append('action', actionFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (searchTerm) params.append('search', searchTerm);
    params.append('limit', '150');

    API.get(`/admin/audit-logs?${params.toString()}`)
      .then(res => setLogs(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, startDate, endDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'STATUS_CHANGE':
        return <span className="badge badge-info">Status Change</span>;
      case 'LOW_STOCK_ALERT':
        return <span className="badge badge-danger">⚠️ Low Stock Alert</span>;
      case 'STAFF_REGISTER':
        return <span className="badge badge-success">Staff Registered</span>;
      default:
        return <span className="badge badge-purple">{action}</span>;
    }
  };

  const renderStateValue = (val, isNew = false) => {
    if (!val && val !== 0) return '—';

    let parsed = val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          parsed = JSON.parse(trimmed);
        } catch (e) {
          parsed = val;
        }
      }
    }

    if (typeof parsed === 'object' && parsed !== null) {
      // If object has a status property, display clean status label/badge
      if (parsed.status && Object.keys(parsed).length === 1) {
        const statusMap = {
          Confirmed: 'badge-success',
          Pending: 'badge-warning',
          Completed: 'badge-primary',
          Cancelled: 'badge-danger',
          No_Show: 'badge-gray',
          Active: 'badge-success',
          Inactive: 'badge-danger',
          On_Leave: 'badge-warning',
        };
        return (
          <span className={`badge ${statusMap[parsed.status] || (isNew ? 'badge-success' : 'badge-gray')}`}>
            <span className="badge-dot" />
            <span>{parsed.status}</span>
          </span>
        );
      }

      // If object has other properties, render clean key-value tags
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.entries(parsed).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                background: isNew ? '#ecfdf5' : 'var(--gray-100)',
                color: isNew ? '#065f46' : 'var(--gray-700)',
                fontWeight: 500,
              }}
            >
              {k === 'status' ? (
                <strong>{String(v)}</strong>
              ) : (
                <>{k}: <strong>{String(v)}</strong></>
              )}
            </span>
          ))}
        </div>
      );
    }

    return (
      <code
        style={{
          fontSize: 11,
          padding: '2px 6px',
          background: isNew ? '#ecfdf5' : 'var(--gray-100)',
          color: isNew ? '#065f46' : 'var(--gray-700)',
          borderRadius: 4,
        }}
      >
        {String(parsed)}
      </code>
    );
  };

  return (
    <DashboardLayout title="System Audit Logs">
      {/* FILTER CONTROLS */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontSize: 12 }}>Filter by Action</label>
            <select
              className="form-control"
              style={{ width: 180 }}
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="ALL">All Actions</option>
              <option value="STATUS_CHANGE">Status Changes</option>
              <option value="LOW_STOCK_ALERT">Low Stock Alerts</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 12 }}>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 12 }}>End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Search Details / User / Table</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search table, actor name, or keywords..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <Search size={14} style={{ marginRight: 6 }} /> Search
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setActionFilter('ALL');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              style={{ padding: '8px 14px' }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="var(--primary-600)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              System Activity & Audit Trail ({logs.length})
            </h3>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Action</th>
                  <th>Affected Table</th>
                  <th>Record ID</th>
                  <th>Actor / User</th>
                  <th>Old State</th>
                  <th>New State</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{log.log_id}</td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontFamily: 'monospace' }}>
                        {log.table_name || 'system'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.record_id || '—'}</td>
                    <td>
                      {log.user_name ? (
                        <div>
                          <strong>{log.user_name}</strong>
                          <br />
                          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{log.role}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>System Auto</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--gray-600)' }}>
                      {renderStateValue(log.old_value, false)}
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>
                      {renderStateValue(log.new_value, true)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !logs.length && (
              <div className="empty-state">
                <span className="empty-state-icon">🛡️</span>
                <h4>No audit records found</h4>
                <p>Try adjusting your search criteria or date filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAuditLogs;
