import React from 'react';
import type { Customer } from '../types';
import { StatusBadge, TypeBadge } from './StatusBadge';

interface CustomerDetailModalProps {
  customer: Customer | null;
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

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  if (!isOpen || !customer) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="modal-panel modal-panel-lg">
        <div className="modal-header">
          <h2 id="detail-modal-title" className="modal-title">Customer Details</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">×</button>
        </div>

        <div className="detail-section">
          <div className="detail-header-row">
            <div>
              <h3 className="detail-customer-name">{customer.customerName}</h3>
              <p className="detail-business-name">{customer.businessName}</p>
            </div>
            <div className="detail-badges">
              <StatusBadge status={customer.status} />
              <TypeBadge type={customer.customerType} />
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Email</span>
            <span className="detail-value">
              <a href={`mailto:${customer.email}`} className="detail-link">{customer.email}</a>
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Mobile</span>
            <span className="detail-value">
              <a href={`tel:${customer.mobile}`} className="detail-link">{customer.mobile}</a>
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">GST Number</span>
            <span className="detail-value detail-mono">{customer.gstNumber || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Follow-up Date</span>
            <span className={`detail-value ${isOverdue(customer.followUpDate) ? 'text-danger-val' : ''}`}>
              {formatDate(customer.followUpDate)}
              {isOverdue(customer.followUpDate) && <span className="overdue-tag">Overdue</span>}
            </span>
          </div>
          <div className="detail-field detail-field-full">
            <span className="detail-label">Address</span>
            <span className="detail-value">{customer.address}</span>
          </div>
          {customer.notes && (
            <div className="detail-field detail-field-full">
              <span className="detail-label">Notes</span>
              <span className="detail-value detail-notes">{customer.notes}</span>
            </div>
          )}
          <div className="detail-field">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(customer.createdAt)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Last Updated</span>
            <span className="detail-value">{formatDate(customer.updatedAt)}</span>
          </div>
        </div>

        {canEdit && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={onEdit}>Edit Customer</button>
          </div>
        )}
        {!canEdit && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default CustomerDetailModal;
