import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ReceptionistPagination = ({ page, pageSize, total, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 4px 0', color: '#64748b', fontSize: 12 }}>
      <span>Showing {firstItem}-{lastItem} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} /> Previous
        </button>
        <span style={{ minWidth: 72, textAlign: 'center', fontWeight: 600 }}>Page {page} of {pageCount}</span>
        <button type="button" className="btn btn-outline btn-sm" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ReceptionistPagination;
