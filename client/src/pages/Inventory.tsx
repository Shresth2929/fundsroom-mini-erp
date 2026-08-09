import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../services/api';
import Pagination from '../components/Pagination';
import type {
  InventoryMovement,
  PaginatedInventoryMovementResponse,
  PaginatedProductResponse,
  Product,
} from '../types';

const SUMMARY_LIMIT = 100;
const MOVEMENT_PAGE_LIMIT = 10;

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isLowStock(product: Product): boolean {
  return product.minimumStock > 0 && product.currentStock <= product.minimumStock;
}

function parseApiError(err: unknown): string {
  const e = err as { responseBody?: { message?: string }; message?: string };
  if (e?.responseBody?.message) return e.responseBody.message;
  if (e?.message) return e.message;
  return 'Unable to load inventory data right now.';
}

const Inventory: React.FC = () => {
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<InventoryMovement['movementType'] | ''>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [movementPage, setMovementPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setMovementPage(1);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementTypeFilter]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);

    try {
      const [productsRes, lowStockRes] = await Promise.all([
        apiFetch<PaginatedProductResponse>(`/products?limit=${SUMMARY_LIMIT}`),
        apiFetch<PaginatedProductResponse>(`/inventory/low-stock?limit=${SUMMARY_LIMIT}`),
      ]);

      setProducts(productsRes.products);
      setLowStockProducts(lowStockRes.products);
    } catch (err: unknown) {
      const msg = parseApiError(err);
      setError(msg);
      addToast('error', msg);
    } finally {
      setSummaryLoading(false);
    }
  }, [addToast]);

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);

    try {
      const res = await apiFetch<PaginatedInventoryMovementResponse>('/inventory/movements?limit=100');
      setMovements(res.movements);
    } catch (err: unknown) {
      const msg = parseApiError(err);
      setError(msg);
      addToast('error', msg);
    } finally {
      setMovementsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchSummary();
    void fetchMovements();
  }, [fetchSummary, fetchMovements]);

  const lowStockLookup = useMemo(() => new Set(lowStockProducts.map((product) => product.id)), [lowStockProducts]);

  const latestMovementByProduct = useMemo(() => {
    const map = new Map<string, InventoryMovement>();

    movements.forEach((movement) => {
      const current = map.get(movement.productId);
      if (!current || new Date(movement.createdAt) > new Date(current.createdAt)) {
        map.set(movement.productId, movement);
      }
    });

    return map;
  }, [movements]);

  const inventoryRows = useMemo(() => {
    return products.map((product) => {
      const latestMovement = latestMovementByProduct.get(product.id);
      const lowStock = lowStockLookup.has(product.id) || isLowStock(product);

      return {
        ...product,
        lowStock,
        latestMovement,
      };
    });
  }, [products, latestMovementByProduct, lowStockLookup]);

  const filteredInventoryRows = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return inventoryRows.filter((row) => {
      if (showLowStockOnly && !row.lowStock) return false;
      if (!query) return true;
      return row.productName.toLowerCase().includes(query) || row.sku.toLowerCase().includes(query);
    });
  }, [inventoryRows, debouncedSearch, showLowStockOnly]);

  const filteredMovements = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return movements.filter((movement) => {
      const productName = movement.product?.productName?.toLowerCase() || '';
      const sku = movement.product?.sku?.toLowerCase() || '';
      const reason = movement.reason?.toLowerCase() || '';

      if (movementTypeFilter && movement.movementType !== movementTypeFilter) {
        return false;
      }

      if (!query) return true;
      return productName.includes(query) || sku.includes(query) || reason.includes(query);
    });
  }, [movements, debouncedSearch, movementTypeFilter]);

  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENT_PAGE_LIMIT));
  const pagedMovements = filteredMovements.slice((movementPage - 1) * MOVEMENT_PAGE_LIMIT, movementPage * MOVEMENT_PAGE_LIMIT);

  useEffect(() => {
    if (movementPage > movementTotalPages) {
      setMovementPage(1);
    }
  }, [movementPage, movementTotalPages]);

  const totalUnitsInStock = products.reduce((sum, product) => sum + product.currentStock, 0);

  const renderSkeletonRows = (count: number) => (
    <tbody>
      {Array.from({ length: count }).map((_, index) => (
        <tr key={index} className="skeleton-row">
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <td key={colIndex}><span className="skeleton-line" style={{ width: `${55 + (colIndex * 10) % 30}%` }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Track stock health, movement history, and low-stock alerts in one view.</p>
        </div>
        <div className="page-header-actions">
          <span className="total-count-badge">
            {summaryLoading ? '—' : `${lowStockProducts.length} low stock item${lowStockProducts.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="inventory-overview-grid">
        <div className="metric-card card-blue">
          <div className="metric-header">
            <span className="metric-label">Active Products</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="metric-value">
            {summaryLoading ? <span className="skeleton-line mini" /> : products.length}
          </div>
          <p className="metric-desc">Catalog SKUs currently in the system</p>
        </div>

        <div className="metric-card card-purple">
          <div className="metric-header">
            <span className="metric-label">Low Stock</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="metric-value text-danger-val">
            {summaryLoading ? <span className="skeleton-line mini" /> : lowStockProducts.length}
          </div>
          <p className="metric-desc">Products at or below minimum threshold</p>
        </div>

        <div className="metric-card card-emerald">
          <div className="metric-header">
            <span className="metric-label">Stock Units</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="metric-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z" />
            </svg>
          </div>
          <div className="metric-value">
            {summaryLoading ? <span className="skeleton-line mini" /> : totalUnitsInStock}
          </div>
          <p className="metric-desc">Current total stock across all products</p>
        </div>
      </div>

      <div className="table-card">
        <div className="inventory-card-header">
          <div>
            <h2 className="section-title">Inventory Snapshot</h2>
            <p className="section-subtitle">Current stock levels with low-stock warnings and latest movement context.</p>
          </div>
          <div className="filter-group">
            <button className={`btn btn-ghost btn-sm ${showLowStockOnly ? 'btn-active' : ''}`} onClick={() => setShowLowStockOnly((value) => !value)}>
              {showLowStockOnly ? 'Showing Low Stock Only' : 'Show Low Stock Only'}
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search by product or SKU…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search inventory"
            />
            {searchInput && (
              <button className="search-clear-btn" onClick={() => setSearchInput('')} aria-label="Clear search">×</button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" aria-label="Inventory snapshot">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">SKU</th>
                <th scope="col">Current Stock</th>
                <th scope="col">Stock Status</th>
                <th scope="col">Last Movement</th>
                <th scope="col">Movement Type</th>
                <th scope="col">Movement Date</th>
              </tr>
            </thead>
            {summaryLoading
              ? renderSkeletonRows(6)
              : filteredInventoryRows.length === 0
                ? (
                  <tbody>
                    <tr>
                      <td colSpan={7}>
                        <div className="table-empty-state">
                          <div className="empty-icon">📦</div>
                          <h3 className="empty-title">No matching inventory items</h3>
                          <p className="empty-subtitle">Try adjusting your search or switching back to all products.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )
                : (
                  <tbody>
                    {filteredInventoryRows.map((row) => (
                      <tr key={row.id} className="data-row">
                        <td>
                          <div className="inventory-product-cell">
                            <span className="product-name">{row.productName}</span>
                            <span className="product-sku">{row.location}</span>
                          </div>
                        </td>
                        <td><span className="inventory-sku-cell">{row.sku}</span></td>
                        <td><span className={`stock-qty ${row.lowStock ? 'stock-low' : ''}`}>{row.currentStock}</span></td>
                        <td>
                          <span className={`stock-badge ${row.lowStock ? 'stock-badge-low' : 'stock-badge-ok'}`}>
                            {row.lowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td><span className="inventory-reason-cell">{row.latestMovement?.reason || '—'}</span></td>
                        <td>
                          {row.latestMovement ? (
                            <span className={`movement-type-pill ${row.latestMovement.movementType === 'OUT' ? 'movement-out' : 'movement-in'}`}>
                              {row.latestMovement.movementType}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="text-muted-cell">{formatDateTime(row.latestMovement?.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
          </table>
        </div>
      </div>

      <div className="table-card">
        <div className="inventory-card-header">
          <div>
            <h2 className="section-title">Stock Movement History</h2>
            <p className="section-subtitle">Audit trail of stock movements and delivery outcomes.</p>
          </div>
          <div className="filter-group">
            <select
              className="filter-select"
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value as InventoryMovement['movementType'] | '')}
              aria-label="Filter movement type"
            >
              <option value="">All Movement Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search movement history…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search stock movements"
            />
            {searchInput && (
              <button className="search-clear-btn" onClick={() => setSearchInput('')} aria-label="Clear movement search">×</button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" aria-label="Inventory movement history">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Quantity</th>
                <th scope="col">Movement Type</th>
                <th scope="col">Reason</th>
                <th scope="col">Updated By</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            {movementsLoading
              ? renderSkeletonRows(5)
              : filteredMovements.length === 0
                ? (
                  <tbody>
                    <tr>
                      <td colSpan={6}>
                        <div className="table-empty-state">
                          <div className="empty-icon">🧾</div>
                          <h3 className="empty-title">No stock movements found</h3>
                          <p className="empty-subtitle">Try changing the movement filter or search query.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )
                : (
                  <tbody>
                    {pagedMovements.map((movement) => (
                      <tr key={movement.id} className="data-row">
                        <td>
                          <div className="inventory-product-cell">
                            <span className="product-name">{movement.product?.productName || 'Unknown product'}</span>
                            <span className="product-sku">{movement.product?.sku || '—'}</span>
                          </div>
                        </td>
                        <td><span className="inventory-quantity-cell">{movement.quantity}</span></td>
                        <td>
                          <span className={`movement-type-pill ${movement.movementType === 'OUT' ? 'movement-out' : 'movement-in'}`}>
                            {movement.movementType}
                          </span>
                        </td>
                        <td><span className="inventory-reason-cell">{movement.reason}</span></td>
                        <td className="text-muted-cell">{movement.createdBy?.name || '—'}</td>
                        <td className="text-muted-cell">{formatDateTime(movement.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
          </table>
        </div>

        {!movementsLoading && filteredMovements.length > 0 && (
          <div className="table-footer">
            <Pagination
              page={movementPage}
              totalPages={movementTotalPages}
              total={filteredMovements.length}
              limit={MOVEMENT_PAGE_LIMIT}
              isLoading={movementsLoading}
              onPageChange={setMovementPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
