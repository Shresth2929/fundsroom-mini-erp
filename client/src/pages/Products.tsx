import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../services/api';
import type {
  Product,
  ProductCreateRequest,
  PaginatedProductResponse,
} from '../types';
import ProductFormModal from '../components/ProductFormModal';
import ProductDetailModal from '../components/ProductDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function isLowStock(product: Product): boolean {
  return product.minimumStock > 0 && product.currentStock <= product.minimumStock;
}

function parseApiError(err: unknown): string {
  const e = err as { responseBody?: { errors?: Array<{ message?: string } | string>; message?: string }; message?: string };
  const body = e?.responseBody;
  if (body?.errors && Array.isArray(body.errors)) {
    return body.errors.map((item) => (typeof item === 'string' ? item : item.message || String(item))).join(', ');
  }
  if (body?.message) return body.message;
  if (e?.message) return e.message;
  return 'An unexpected error occurred. Please try again.';
}

const PAGE_LIMIT = 10;

const Products: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const canCreate = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';
  const canDelete = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_LIMIT));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryFilter) params.set('category', categoryFilter);

    try {
      const res = await apiFetch<PaginatedProductResponse>(`/products?${params.toString()}`);
      setProducts(res.products);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      setCategories((prev) => {
        const fromPage = res.products.map((p) => p.category);
        const merged = new Set([...prev, ...fromPage]);
        return Array.from(merged).sort((a, b) => a.localeCompare(b));
      });
    } catch (err: unknown) {
      const msg = parseApiError(err);
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdd = () => {
    setEditTarget(null);
    setFormServerError(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setFormServerError(null);
    setShowDetail(false);
    setShowForm(true);
  };

  const openDetail = (p: Product) => {
    setDetailProduct(p);
    setShowDetail(true);
  };

  const openDelete = (p: Product) => {
    setDeleteTarget(p);
  };

  const handleFormSubmit = async (data: ProductCreateRequest) => {
    setFormSubmitting(true);
    setFormServerError(null);

    try {
      if (editTarget) {
        await apiFetch<Product>(`/products/${editTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        addToast('success', `"${data.productName}" updated successfully.`);
      } else {
        await apiFetch<Product>('/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        addToast('success', `"${data.productName}" added to catalog.`);
      }
      setShowForm(false);
      fetchProducts();
    } catch (err: unknown) {
      setFormServerError(parseApiError(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: 'DELETE' });
      addToast('success', `"${deleteTarget.productName}" deleted.`);
      setDeleteTarget(null);

      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchProducts();
      }
    } catch (err: unknown) {
      addToast('error', parseApiError(err));
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setPage(1);
  };

  const hasActiveFilters = !!debouncedSearch || !!categoryFilter;

  const renderSkeleton = () => (
    <tbody>
      {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j}>
              <span className="skeleton-line" style={{ width: `${60 + (j * 15) % 40}%` }} />
            </td>
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
            <div className="empty-icon">📦</div>
            <h3 className="empty-title">
              {hasActiveFilters ? 'No products match your filters' : 'No products yet'}
            </h3>
            <p className="empty-subtitle">
              {hasActiveFilters
                ? 'Try adjusting your search or category filter.'
                : 'Start building your catalog by adding your first product.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-ghost" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
            {!hasActiveFilters && canCreate && (
              <button className="btn btn-primary" onClick={openAdd}>
                Add First Product
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
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">
            Manage product listings, pricing, stock levels and warehouse locations.
          </p>
        </div>
        <div className="page-header-actions">
          <span className="total-count-badge">
            {isLoading ? '—' : `${total} product${total !== 1 ? 's' : ''}`}
          </span>
          {canCreate && (
            <button id="add-product-btn" className="btn btn-primary" onClick={openAdd}>
              + Add Product
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            id="product-search-input"
            type="search"
            className="search-input"
            placeholder="Search by product name or SKU…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search products"
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
            id="category-filter"
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} id="clear-filters-btn">
              Clear
            </button>
          )}
        </div>
      </div>

      {fetchError && !isLoading && (
        <div className="alert alert-danger" role="alert">
          {fetchError} &nbsp;
          <button className="btn-link" onClick={fetchProducts}>Retry</button>
        </div>
      )}

      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table" aria-label="Products">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Unit Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
                <th scope="col" className="th-actions">Actions</th>
              </tr>
            </thead>

            {isLoading
              ? renderSkeleton()
              : products.length === 0
                ? renderEmpty()
                : (
                  <tbody>
                    {products.map((p) => {
                      const lowStock = isLowStock(p);
                      return (
                        <tr key={p.id} className="data-row">
                          <td>
                            <button
                              className="product-name-btn"
                              onClick={() => openDetail(p)}
                              aria-label={`View details for ${p.productName}`}
                            >
                              <span className="product-name">{p.productName}</span>
                              <span className="product-sku">{p.sku}</span>
                            </button>
                          </td>

                          <td><span className="category-tag">{p.category}</span></td>

                          <td className="price-cell">{formatPrice(p.unitPrice)}</td>

                          <td>
                            <div className="stock-cell">
                              <span className={`stock-qty ${lowStock ? 'stock-low' : ''}`}>
                                {p.currentStock}
                              </span>
                              <span className="stock-min-label">Min: {p.minimumStock}</span>
                            </div>
                          </td>

                          <td className="location-cell">{p.location}</td>

                          <td>
                            <span className={`stock-badge ${lowStock ? 'stock-badge-low' : 'stock-badge-ok'}`}>
                              {lowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>

                          <td className="actions-cell">
                            <button
                              className="action-btn action-view"
                              onClick={() => openDetail(p)}
                              aria-label={`View ${p.productName}`}
                              title="View Details"
                            >
                              👁
                            </button>
                            {canEdit && (
                              <button
                                className="action-btn action-edit"
                                onClick={() => openEdit(p)}
                                aria-label={`Edit ${p.productName}`}
                                title="Edit"
                              >
                                ✏
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="action-btn action-delete"
                                onClick={() => openDelete(p)}
                                aria-label={`Delete ${p.productName}`}
                                title="Delete"
                              >
                                🗑
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )
            }
          </table>
        </div>

        {!isLoading && products.length > 0 && (
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

      <ProductFormModal
        isOpen={showForm}
        editProduct={editTarget}
        isSubmitting={formSubmitting}
        serverError={formServerError}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
      />

      <ProductDetailModal
        isOpen={showDetail}
        product={detailProduct}
        canEdit={canEdit}
        onClose={() => setShowDetail(false)}
        onEdit={() => detailProduct && openEdit(detailProduct)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.productName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDangerous
        isLoading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Products;
