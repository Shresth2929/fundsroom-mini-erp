import React from 'react';
import type { CustomerStatus, CustomerType } from '../types';

// ── StatusBadge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: CustomerStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const map: Record<CustomerStatus, { label: string; cls: string }> = {
    ACTIVE:   { label: 'Active',   cls: 'badge-active' },
    INACTIVE: { label: 'Inactive', cls: 'badge-inactive' },
    LEAD:     { label: 'Lead',     cls: 'badge-lead' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: '' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
};

// ── CustomerTypeBadge ─────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: CustomerType;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const map: Record<CustomerType, { label: string; cls: string }> = {
    RETAIL:      { label: 'Retail',      cls: 'badge-retail' },
    WHOLESALE:   { label: 'Wholesale',   cls: 'badge-wholesale' },
    DISTRIBUTOR: { label: 'Distributor', cls: 'badge-distributor' },
  };
  const { label, cls } = map[type] ?? { label: type, cls: '' };
  return <span className={`type-badge ${cls}`}>{label}</span>;
};
