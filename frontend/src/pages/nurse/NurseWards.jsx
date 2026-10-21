import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';

const NurseWards = () => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [wardFilter, setWardFilter] = useState('All');

  useEffect(() => {
    API.get('/nurse/wards')
      .then(res => setBeds(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group beds by ward
  const wardsMap = beds.reduce((acc, b) => {
    if (!acc[b.ward_id]) {
      acc[b.ward_id] = {
        ward_id: b.ward_id,
        ward_name: b.ward_name,
        ward_type: b.ward_type,
        floor_number: b.floor_number,
        total_beds: b.total_beds,
        available_beds: b.available_beds,
        daily_rate: b.daily_rate,
        beds: []
      };
    }
    acc[b.ward_id].beds.push(b);
    return acc;
  }, {});

  const wardsList = Object.values(wardsMap);

  // Overall Stats
  const totalBedsCount = beds.length;
  const availableBedsCount = beds.filter(b => b.bed_status === 'Available').length;
  const occupiedBedsCount = beds.filter(b => b.bed_status === 'Occupied').length;
  const maintenanceCount = beds.filter(b => b.bed_status === 'Maintenance').length;
  const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  return (
    <DashboardLayout title="Ward & Bed Management">
      {/* OVERALL STATS CARDS */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">🏥</div>
          <div>
            <div className="stat-label">Total Beds</div>
            <div className="stat-value">{totalBedsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Across {wardsList.length} wards</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-emerald">🟢</div>
          <div>
            <div className="stat-label">Available Beds</div>
            <div className="stat-value">{availableBedsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Ready for admission</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-rose">🔴</div>
          <div>
            <div className="stat-label">Occupied Beds</div>
            <div className="stat-value">{occupiedBedsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Currently in use</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">📊</div>
          <div>
            <div className="stat-label">Occupancy Rate</div>
            <div className="stat-value">{occupancyRate}%</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {maintenanceCount > 0 ? `${maintenanceCount} in maintenance` : 'Optimal load'}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>Filter by Status:</span>
            {['All', 'Available', 'Occupied', 'Maintenance'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>Ward:</span>
            <select
              className="form-control"
              style={{ width: 200, fontSize: 13, padding: '6px 12px' }}
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value)}
            >
              <option value="All">All Wards</option>
              {wardsList.map(w => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.ward_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* WARDS SECTION */}
      {loading ? (
        <p style={{ color: 'var(--gray-400)', padding: 20 }}>Loading ward layout and bed allocations...</p>
      ) : wardsList.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', padding: 20 }}>No ward data available.</p>
      ) : (
        wardsList
          .filter(w => wardFilter === 'All' || String(w.ward_id) === String(wardFilter))
          .map(ward => {
            const wardBeds = ward.beds.filter(
              b => statusFilter === 'All' || b.bed_status === statusFilter
            );
            const occupied = ward.beds.filter(b => b.bed_status === 'Occupied').length;
            const wardOccPercent = ward.beds.length > 0 ? Math.round((occupied / ward.beds.length) * 100) : 0;

            return (
              <div key={ward.ward_id} className="card" style={{ marginBottom: 24 }}>
                <div
                  className="card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
                      🏥 {ward.ward_name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      Floor: {ward.floor_number} • Type: <span className="badge badge-purple" style={{ fontSize: 11 }}>{ward.ward_type}</span> • Daily Rate: ${ward.daily_rate}/day
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
                        {occupied} / {ward.beds.length} Beds Occupied ({wardOccPercent}%)
                      </div>
                      <div style={{ width: 140, height: 6, background: 'var(--gray-200)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${wardOccPercent}%`,
                            height: '100%',
                            background: wardOccPercent > 80 ? 'var(--danger)' : 'var(--primary)',
                            borderRadius: 3
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  {wardBeds.length === 0 ? (
                    <p style={{ color: 'var(--gray-400)', fontSize: 13, margin: 0 }}>
                      No beds in this ward match the "{statusFilter}" status filter.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 14
                      }}
                    >
                      {wardBeds.map(bed => {
                        const isAvailable = bed.bed_status === 'Available';
                        const isOccupied = bed.bed_status === 'Occupied';
                        const isMaintenance = bed.bed_status === 'Maintenance';

                        const borderColor = isAvailable
                          ? 'var(--emerald-500)'
                          : isOccupied
                          ? '#f43f5e'
                          : '#f59e0b';
                        const bgColor = isAvailable
                          ? 'rgba(16, 185, 129, 0.05)'
                          : isOccupied
                          ? 'rgba(244, 63, 94, 0.05)'
                          : 'rgba(245, 158, 11, 0.05)';

                        return (
                          <div
                            key={bed.bed_id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 12,
                              border: `1.5px solid ${borderColor}`,
                              background: bgColor,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {bed.bed_type}
                                </span>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-800)', marginTop: 2 }}>
                                  Bed {bed.bed_number}
                                </div>
                              </div>
                              <span
                                className={`badge ${
                                  isAvailable ? 'badge-success' : isOccupied ? 'badge-danger' : 'badge-warning'
                                }`}
                                style={{ fontSize: 10, padding: '3px 8px' }}
                              >
                                {bed.bed_status}
                              </span>
                            </div>

                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                              {isOccupied ? (
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>
                                    👤 {bed.patient_name}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                                    Code: {bed.patient_code}
                                  </div>
                                  {bed.admission_date && (
                                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                                      Since: {new Date(bed.admission_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : isAvailable ? (
                                <div style={{ fontSize: 12, color: 'var(--emerald-600)', fontWeight: 600 }}>
                                  ✓ Ready for Admission
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                                  ⚠️ Under Service / Clean
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
      )}
    </DashboardLayout>
  );
};

export default NurseWards;
