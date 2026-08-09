import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  isLoading = false,
  onPageChange,
}) => {
  if (totalPages <= 1 && total === 0) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong> results
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || isLoading}
          aria-label="First page"
        >
          «
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          aria-label="Previous page"
        >
          ‹
        </button>

        {buildPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
              disabled={isLoading}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          aria-label="Next page"
        >
          ›
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || isLoading}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
};

/** Build a compact array of page numbers with ellipsis */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}

export default Pagination;
