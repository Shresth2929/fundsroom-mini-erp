import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../services/api';
import type {
  Customer,
  CustomerCreateRequest,
  CustomerStatus,
  CustomerType,
  PaginatedCustomerResponse,
} from '../types';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

// ── Utility ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const PAGE_LIMIT = 10;

// ── Component ─────────────────────────────────────────────────────────────────

const Customers: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // ── Permissions (matching backend RBAC) ──────────────────────────────────
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canEdit   = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canDelete  = user?.role === 'ADMIN';

  // ── Data state ────────────────────────────────────────────────────────────
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  // ── Filter / search state ─────────────────────────────────────────────────
  const [searchInput, setSearchInput]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter]       = useState<CustomerStatus | ''>('');
  const [typeFilter, setTypeFilter]           = useState<CustomerType | ''>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<Customer | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [showDetail, setShowDetail]         = useState(false);

  const [deleteTarget, setDeleteTarget]     = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // ── Debounce search input (500ms) ─────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // reset to page 1 on new search
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  // ── Fetch customers ────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_LIMIT));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter)    params.set('status', statusFilter);
    if (typeFilter)      params.set('type', typeFilter);

    try {
      const res = await apiFetch<PaginatedCustomerResponse>(`/customers?${params.toString()}`);
      setCustomers(res.customers);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load customers.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ── Handlers: open modals ────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setFormServerError(null);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setFormServerError(null);
    setShowDetail(false);
    setShowForm(true);
  };

  const openDetail = (c: Customer) => {
    setDetailCustomer(c);
    setShowDetail(true);
  };

  const openDelete = (c: Customer) => {
    setDeleteTarget(c);
  };

  // ── Handlers: form submit (create / update) ───────────────────────────────
  const handleFormSubmit = async (data: CustomerCreateRequest) => {
    setFormSubmitting(true);
    setFormServerError(null);

    try {
      if (editTarget) {
        // UPDATE
        await apiFetch<Customer>(`/customers/${editTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        addToast('success', `"${data.customerName}" updated successfully.`);
      } else {
        // CREATE
        await apiFetch<Customer>('/customers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        addToast('success', `"${data.customerName}" added to CRM.`);
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      const msg = parseApiError(err);
      setFormServerError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Handlers: delete ─────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      await apiFetch(`/customers/${deleteTarget.id}`, { method: 'DELETE' });
      addToast('success', `"${deleteTarget.customerName}" deleted.`);
      setDeleteTarget(null);

      // If deleting last item on this page, go back one page
      if (customers.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchCustomers();
      }
    } catch (err: any) {
      const msg = parseApiError(err);
      addToast('error', msg);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const hasActiveFilters = !!debouncedSearch || !!statusFilter || !!typeFilter;

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderSkeleton = () => (
    <tbody>
      {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j}><span className="skeleton-line" style={{ width: `${60 + (j * 15) % 40}%` }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const renderEmpty = () => (
    <tbody>
      <tr>
        <td colSpan={7}>
          <div className="table-empty-state">
            <div className="empty-icon">👥</div>
            <h3 className="empty-title">
              {hasActiveFilters ? 'No customers match your filters' : 'No customers yet'}
            </h3>
            <p className="empty-subtitle">
              {hasActiveFilters
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Start building your CRM by adding your first customer.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-ghost" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
            {!hasActiveFilters && canCreate && (
              <button className="btn btn-primary" onClick={openAdd}>
                Add First Customer
              </button>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Manage customer relationships, contact information and account status.
          </p>
        </div>
        <div className="page-header-actions">
          <span className="total-count-badge">
            {isLoading ? '—' : `${total} customer${total !== 1 ? 's' : ''}`}
          </span>
          {canCreate && (
            <button id="add-customer-btn" className="btn btn-primary" onClick={openAdd}>
              + Add Customer
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search + Filters ── */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            id="customer-search-input"
            type="search"
            className="search-input"
            placeholder="Search by name, email, mobile or business…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search customers"
          />
          {searchInput && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-group">
          <select
            id="status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            id="type-filter"
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CustomerType | '')}
            aria-label="Filter by type"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>

          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} id="clear-filters-btn">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Fetch Error ── */}
      {fetchError && !isLoading && (
        <div className="alert alert-danger" role="alert">
          {fetchError} &nbsp;
          <button className="btn-link" onClick={fetchCustomers}>Retry</button>
        </div>
      )}

      {/* ── Customer Table ── */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table" aria-label="Customers">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Contact</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Follow-up</th>
                <th scope="col">Created</th>
                <th scope="col" className="th-actions">Actions</th>
              </tr>
            </thead>

            {isLoading
              ? renderSkeleton()
              : customers.length === 0
                ? renderEmpty()
                : (
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="data-row">
                        {/* Customer name + business */}
                        <td>
                          <button
                            className="customer-name-btn"
                            onClick={() => openDetail(c)}
                            aria-label={`View details for ${c.customerName}`}
                          >
                            <span className="customer-name">{c.customerName}</span>
                            <span className="customer-business">{c.businessName}</span>
                          </button>
                        </td>

                        {/* Contact */}
                        <td className="contact-cell">
                          <a href={`mailto:${c.email}`} className="contact-link">{c.email}</a>
                          <span className="contact-mobile">{c.mobile}</span>
                        </td>

                        {/* Type */}
                        <td><TypeBadge type={c.customerType} /></td>

                        {/* Status */}
                        <td><StatusBadge status={c.status} /></td>

                        {/* Follow-up Date */}
                        <td>
                          <span className={isOverdue(c.followUpDate) ? 'text-danger-val' : ''}>
                            {formatDate(c.followUpDate)}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="text-muted-cell">{formatDate(c.createdAt)}</td>

                        {/* Actions */}
                        <td className="actions-cell">
                          <button
                            className="action-btn action-view"
                            onClick={() => openDetail(c)}
                            aria-label={`View ${c.customerName}`}
                            title="View Details"
                          >
                            👁
                          </button>
                          {canEdit && (
                            <button
                              className="action-btn action-edit"
                              onClick={() => openEdit(c)}
                              aria-label={`Edit ${c.customerName}`}
                              title="Edit"
                            >
                              ✏
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="action-btn action-delete"
                              onClick={() => openDelete(c)}
                              aria-label={`Delete ${c.customerName}`}
                              title="Delete"
                            >
                              🗑
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )
            }
          </table>
        </div>

        {/* ── Pagination ── */}
        {!isLoading && customers.length > 0 && (
          <div className="table-footer">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_LIMIT}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CustomerFormModal
        isOpen={showForm}
        editCustomer={editTarget}
        isSubmitting={formSubmitting}
        serverError={formServerError}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
      />

      <CustomerDetailModal
        isOpen={showDetail}
        customer={detailCustomer}
        canEdit={canEdit}
        onClose={() => setShowDetail(false)}
        onEdit={() => detailCustomer && openEdit(detailCustomer)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.customerName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDangerous
        isLoading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

// ── API Error Parser ──────────────────────────────────────────────────────────

function parseApiError(err: any): string {
  const body = err?.responseBody;
  if (body?.errors && Array.isArray(body.errors)) {
    return body.errors.map((e: any) => e.message || e).join(', ');
  }
  if (body?.message) return body.message;
  if (err?.message) return err.message;
  return 'An unexpected error occurred. Please try again.';
}

export default Customers;
