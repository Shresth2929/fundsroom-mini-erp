import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import type {
  Challan,
  Customer,
  PaginatedChallanResponse,
  PaginatedCustomerResponse,
  PaginatedProductResponse,
  Product,
} from '../types';

interface ChallanFormItem {
  productId: string;
  quantity: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function parseApiError(err: unknown): string {
  const e = err as { responseBody?: { message?: string; errors?: Array<{ message?: string } | string> }; message?: string };
  const body = e?.responseBody;
  if (body?.errors && Array.isArray(body.errors)) {
    return body.errors.map((item) => (typeof item === 'string' ? item : item.message || String(item))).join(', ');
  }
  if (body?.message) return body.message;
  if (e?.message) return e.message;
  return 'An unexpected error occurred. Please try again.';
}

const Challans: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailChallan, setDetailChallan] = useState<Challan | null>(null);
  const [editingChallan, setEditingChallan] = useState<Challan | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<ChallanFormItem[]>([{ productId: '', quantity: '1' }]);

  const [confirmTarget, setConfirmTarget] = useState<Challan | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Challan | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const resetForm = useCallback(() => {
    setCustomerId('');
    setItems([{ productId: '', quantity: '1' }]);
    setFormError(null);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const [challansRes, customersRes, productsRes] = await Promise.all([
        apiFetch<PaginatedChallanResponse>('/challans?limit=100'),
        apiFetch<PaginatedCustomerResponse>('/customers?limit=200'),
        apiFetch<PaginatedProductResponse>('/products?limit=200'),
      ]);

      setChallans(challansRes.challans || []);
      setCustomers(customersRes.customers || []);
      setProducts(productsRes.products || []);
    } catch (err: unknown) {
      const msg = parseApiError(err);
      setFetchError(msg);
      addToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingChallan(null);
    setDetailChallan(null);
    setShowDetail(false);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (challan: Challan) => {
    if (challan.status !== 'DRAFT') return;
    setEditingChallan(challan);
    setDetailChallan(null);
    setShowDetail(false);
    setCustomerId(challan.customerId || '');
    setItems(
      (challan.items || []).map((item) => ({
        productId: item.productId,
        quantity: String(item.quantity),
      }))
    );
    setShowForm(true);
    setFormError(null);
  };

  const openDetail = async (challan: Challan) => {
    try {
      const detail = await apiFetch<Challan>(`/challans/${challan.id}`);
      setDetailChallan(detail);
      setShowDetail(true);
    } catch (err: unknown) {
      addToast('error', parseApiError(err));
    }
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: '', quantity: '1' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: 'productId' | 'quantity', value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (!product || !item.quantity) return acc;
        const qty = Number(item.quantity);
        const lineTotal = qty * product.unitPrice;
        acc.totalQuantity += qty;
        acc.totalAmount += lineTotal;
        return acc;
      },
      { totalQuantity: 0, totalAmount: 0 }
    );
  }, [items, products]);

  const validateForm = () => {
    if (!customerId) return 'Please select a customer.';
    if (!items.length) return 'Add at least one product row.';

    const seenProducts = new Set<string>();
    for (const item of items) {
      if (!item.productId) return 'Each product row must select a product.';
      if (!item.quantity || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
        return 'Quantity must be a positive whole number.';
      }
      if (seenProducts.has(item.productId)) return 'Duplicate products are not allowed in a challan.';
      seenProducts.add(item.productId);
    }

    return null;
  };

  const submitForm = async (mode: 'draft' | 'confirm') => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        customerId,
        status: mode === 'confirm' ? 'CONFIRMED' : 'DRAFT',
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      };

      if (editingChallan) {
        await apiFetch<Challan>(`/challans/${editingChallan.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        addToast('success', 'Draft challan updated successfully.');
      } else {
        await apiFetch<Challan>('/challans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addToast('success', 'Challan created successfully.');
      }

      setShowForm(false);
      setEditingChallan(null);
      resetForm();
      await fetchData();
    } catch (err: unknown) {
      setFormError(parseApiError(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);

    try {
      await apiFetch<Challan>(`/challans/${confirmTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      addToast('success', 'Challan confirmed successfully.');
      setConfirmTarget(null);
      await fetchData();
    } catch (err: unknown) {
      addToast('error', parseApiError(err));
      setConfirmTarget(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);

    try {
      await apiFetch<Challan>(`/challans/${cancelTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      addToast('success', 'Challan cancelled successfully.');
      setCancelTarget(null);
      await fetchData();
    } catch (err: unknown) {
      addToast('error', parseApiError(err));
      setCancelTarget(null);
    } finally {
      setCancelLoading(false);
    }
  };

  const renderSkeleton = () => (
    <tbody>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="skeleton-row">
          {Array.from({ length: 6 }).map((_, colIndex) => (
            <td key={colIndex}><span className="skeleton-line" style={{ width: `${55 + (colIndex * 10) % 25}%` }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const renderEmpty = () => (
    <tbody>
      <tr>
        <td colSpan={6}>
          <div className="table-empty-state">
            <div className="empty-icon">🧾</div>
            <h3 className="empty-title">No challans yet</h3>
            <p className="empty-subtitle">Create your first sales challan to start tracking the dispatch workflow.</p>
            {canManage && (
              <button className="btn btn-primary" onClick={openCreate}>
                Create First Challan
              </button>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Sales Challans</h1>
          <p className="page-subtitle">Track draft challans, confirm dispatches, and review customer deliveries.</p>
        </div>
        <div className="page-header-actions">
          <span className="total-count-badge">
            {isLoading ? '—' : `${challans.length} challan${challans.length === 1 ? '' : 's'}`}
          </span>
          {canManage && (
            <button className="btn btn-primary" onClick={openCreate}>
              + Create Challan
            </button>
          )}
        </div>
      </div>

      {fetchError && !isLoading && (
        <div className="alert alert-danger" role="alert">
          {fetchError}
        </div>
      )}

      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table" aria-label="Sales challans">
            <thead>
              <tr>
                <th scope="col">Challan</th>
                <th scope="col">Customer</th>
                <th scope="col">Date</th>
                <th scope="col">Qty</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col" className="th-actions">Actions</th>
              </tr>
            </thead>
            {isLoading ? renderSkeleton() : challans.length === 0 ? renderEmpty() : (
              <tbody>
                {challans.map((challan) => (
                  <tr key={challan.id} className="data-row">
                    <td>
                      <button className="challan-name-btn" onClick={() => void openDetail(challan)}>
                        <span className="challan-number">{challan.challanNumber}</span>
                        <span className="challan-subtext">{challan.items?.length || 0} item{(challan.items?.length || 0) === 1 ? '' : 's'}</span>
                      </button>
                    </td>
                    <td>
                      <div className="challan-customer-cell">
                        <span className="challan-customer-name">{challan.customer?.customerName || '—'}</span>
                        <span className="challan-subtext">{challan.customer?.businessName || '—'}</span>
                      </div>
                    </td>
                    <td className="text-muted-cell">{formatDateTime(challan.createdAt)}</td>
                    <td className="price-cell">{challan.totalQuantity}</td>
                    <td className="price-cell">{formatPrice(challan.totalPrice)}</td>
                    <td>
                      <span className={`status-pill status-${(challan.status || 'DRAFT').toLowerCase()}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn" onClick={() => void openDetail(challan)} title="View details">👁</button>
                      {canManage && challan.status === 'DRAFT' && (
                        <button className="action-btn" onClick={() => openEdit(challan)} title="Edit draft">✏</button>
                      )}
                      {canManage && challan.status === 'DRAFT' && (
                        <button className="action-btn" onClick={() => setConfirmTarget(challan)} title="Confirm challan">✓</button>
                      )}
                      {canManage && challan.status !== 'CANCELLED' && (
                        <button className="action-btn" onClick={() => setCancelTarget(challan)} title="Cancel challan">⛔</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingChallan ? 'Edit Challan' : 'Create Challan'}</h3>
              <button className="modal-close-btn" onClick={() => setShowForm(false)} aria-label="Close form">×</button>
            </div>

            {formError && (
              <div className="alert alert-danger" role="alert">
                {formError}
              </div>
            )}

            <div className="customer-form">
              <div className="form-group">
                <label htmlFor="customer-select">Customer</label>
                <select id="customer-select" className="form-control" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName} — {customer.businessName || customer.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="challan-items-section">
                <div className="challan-section-heading">
                  <h4>Products</h4>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={addItemRow}>+ Add Product</button>
                </div>

                {items.map((item, index) => {
                  const selectedProduct = products.find((product) => product.id === item.productId);
                  return (
                    <div key={`${item.productId}-${index}`} className="challan-item-row">
                      <div className="form-group">
                        <label>Product</label>
                        <select className="form-control" value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)}>
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.productName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input className="form-control" type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                      </div>
                      <div className="challan-product-meta">
                        {selectedProduct ? (
                          <>
                            <span className="challan-subtext">SKU: {selectedProduct.sku}</span>
                            <span className="challan-subtext">Unit price: {formatPrice(selectedProduct.unitPrice)}</span>
                            <span className="challan-subtext">Stock: {selectedProduct.currentStock}</span>
                          </>
                        ) : (
                          <span className="challan-subtext">Select a product to see details</span>
                        )}
                      </div>
                      <button className="remove-item-btn" type="button" onClick={() => removeItemRow(index)} disabled={items.length === 1}>Remove</button>
                    </div>
                  );
                })}
              </div>

              <div className="challan-summary-card">
                <div className="challan-summary-row">
                  <span>Total quantity</span>
                  <strong>{totals.totalQuantity}</strong>
                </div>
                <div className="challan-summary-row">
                  <span>Grand total</span>
                  <strong>{formatPrice(totals.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => void submitForm('draft')} disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void submitForm('confirm')} disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : 'Create / Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && detailChallan && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{detailChallan.challanNumber}</h3>
                <p className="challan-subtext">{detailChallan.customer?.businessName || detailChallan.customer?.customerName || 'Customer'}</p>
              </div>
              <div className="modal-actions-inline">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.print()}>Print</button>
                <button className="modal-close-btn" onClick={() => setShowDetail(false)} aria-label="Close details">×</button>
              </div>
            </div>

            <div className="challan-detail-grid">
              <div className="challan-detail-card">
                <div className="challan-summary-row">
                  <span>Status</span>
                  <strong><span className={`status-pill status-${detailChallan.status.toLowerCase()}`}>{detailChallan.status}</span></strong>
                </div>
                <div className="challan-summary-row">
                  <span>Created</span>
                  <strong>{formatDateTime(detailChallan.createdAt)}</strong>
                </div>
                <div className="challan-summary-row">
                  <span>Created by</span>
                  <strong>{detailChallan.createdBy?.name || '—'}</strong>
                </div>
              </div>
              <div className="challan-detail-card">
                <div className="challan-summary-row">
                  <span>Customer</span>
                  <strong>{detailChallan.customer?.customerName || '—'}</strong>
                </div>
                <div className="challan-summary-row">
                  <span>Contact</span>
                  <strong>{detailChallan.customer?.email || '—'}</strong>
                </div>
                <div className="challan-summary-row">
                  <span>Address</span>
                  <strong>{detailChallan.customer?.address || '—'}</strong>
                </div>
              </div>
            </div>

            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table" aria-label="Challan details">
                  <thead>
                    <tr>
                      <th scope="col">SKU</th>
                      <th scope="col">Product</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Unit Price</th>
                      <th scope="col">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailChallan.items?.map((item) => (
                      <tr key={item.id || `${item.productId}-${item.quantity}`}>
                        <td>{item.product?.sku || '—'}</td>
                        <td>{item.productNameSnapshot}</td>
                        <td>{item.quantity}</td>
                        <td>{formatPrice(item.unitPriceSnapshot)}</td>
                        <td>{formatPrice(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="challan-summary-card">
              <div className="challan-summary-row">
                <span>Total quantity</span>
                <strong>{detailChallan.totalQuantity}</strong>
              </div>
              <div className="challan-summary-row">
                <span>Grand total</span>
                <strong>{formatPrice(detailChallan.totalPrice)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmTarget}
        title="Confirm challan"
        message={`Confirm ${confirmTarget?.challanNumber || 'this challan'}? Stock validation and stock deduction will be handled by the backend.`}
        confirmLabel="Confirm"
        isLoading={confirmLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel challan"
        message={`Cancel ${cancelTarget?.challanNumber || 'this challan'}?`}
        confirmLabel="Cancel"
        isDangerous
        isLoading={cancelLoading}
        onConfirm={() => void handleCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default Challans;
