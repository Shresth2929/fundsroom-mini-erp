import React from 'react';
import type { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  if (!isOpen || !product) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const lowStock = isLowStock(product);

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div className="modal-panel modal-panel-lg">
        <div className="modal-header">
          <h2 id="product-detail-title" className="modal-title">Product Details</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">×</button>
        </div>

        <div className="detail-section">
          <div className="detail-header-row">
            <div>
              <h3 className="detail-product-name">{product.productName}</h3>
              <p className="detail-product-sku">{product.sku}</p>
            </div>
            <div className="detail-badges">
              <span className="category-tag">{product.category}</span>
              <span className={`stock-badge ${lowStock ? 'stock-badge-low' : 'stock-badge-ok'}`}>
                {lowStock ? 'Low Stock' : 'In Stock'}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Unit Price</span>
            <span className="detail-value">{formatPrice(product.unitPrice)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Current Stock</span>
            <span className={`detail-value ${lowStock ? 'text-danger-val' : ''}`}>
              {product.currentStock} units
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Minimum Stock Alert</span>
            <span className="detail-value">{product.minimumStock} units</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Warehouse Location</span>
            <span className="detail-value">{product.location}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(product.createdAt)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Last Updated</span>
            <span className="detail-value">{formatDate(product.updatedAt)}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={onEdit}>Edit Product</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
