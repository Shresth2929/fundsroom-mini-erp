import React, { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerCreateRequest, CustomerType } from '../types';

// ── Validation ─────────────────────────────────────────────────────────────────

interface FormErrors {
  customerName?: string;
  mobileNumber?: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType?: string;
  address?: string;
  status?: string;
}

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_REGEX = /^\+?[1-9]\d{1,14}$/;

function validate(values: CustomerCreateRequest): FormErrors {
  const errors: FormErrors = {};

  if (!values.customerName.trim() || values.customerName.trim().length < 2)
    errors.customerName = 'Customer name must be at least 2 characters.';

  if (!values.mobileNumber.trim() || !MOBILE_REGEX.test(values.mobileNumber.trim()))
    errors.mobileNumber = 'Invalid mobile number (E.164 format or 10–15 digits).';

  if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Invalid email address.';

  if (!values.businessName.trim() || values.businessName.trim().length < 2)
    errors.businessName = 'Business name must be at least 2 characters.';

  if (values.gstNumber && values.gstNumber.trim() && !GST_REGEX.test(values.gstNumber.trim()))
    errors.gstNumber = 'Invalid GST format (e.g. 07AAAAA1111A1Z1).';

  if (!values.customerType)
    errors.customerType = 'Please select a customer type.';

  if (!values.address.trim() || values.address.trim().length < 5)
    errors.address = 'Address must be at least 5 characters.';

  if (!values.status)
    errors.status = 'Please select a status.';

  return errors;
}

// ── Empty form factory ─────────────────────────────────────────────────────────

function emptyForm(): CustomerCreateRequest {
  return {
    customerName: '',
    mobileNumber: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: '' as CustomerType,
    address: '',
    status: 'ACTIVE',
    followUpDate: '',
    notes: '',
  };
}

function customerToForm(c: Customer): CustomerCreateRequest {
  return {
    customerName: c.customerName,
    mobileNumber: c.mobile,
    email: c.email,
    businessName: c.businessName,
    gstNumber: c.gstNumber ?? '',
    customerType: c.customerType,
    address: c.address,
    status: c.status,
    followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
    notes: c.notes ?? '',
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface CustomerFormModalProps {
  isOpen: boolean;
  editCustomer?: Customer | null;   // if set → edit mode
  isSubmitting: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (data: CustomerCreateRequest) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  editCustomer,
  isSubmitting,
  serverError,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<CustomerCreateRequest>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Re-populate form when switching between add/edit
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setTouched({});
      return;
    }
    setValues(editCustomer ? customerToForm(editCustomer) : emptyForm());
    setErrors({});
    setTouched({});
  }, [isOpen, editCustomer]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      Object.keys(values).map((k) => [k, true])
    );
    setTouched(allTouched);

    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Build clean payload — strip empty optional strings to null
    const payload: CustomerCreateRequest = {
      ...values,
      gstNumber: values.gstNumber?.trim() || null,
      followUpDate: values.followUpDate?.trim()
        ? new Date(values.followUpDate).toISOString()
        : null,
      notes: values.notes?.trim() || null,
    };

    onSubmit(payload);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) onClose();
  };

  if (!isOpen) return null;

  const mode = editCustomer ? 'Edit' : 'Add';

  const fieldError = (name: keyof FormErrors) =>
    touched[name] && errors[name] ? (
      <span className="field-error" role="alert">{errors[name]}</span>
    ) : null;

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <div className="modal-panel modal-panel-lg">
        {/* Header */}
        <div className="modal-header">
          <h2 id="customer-modal-title" className="modal-title">
            {mode} Customer
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Server-level error */}
        {serverError && (
          <div className="alert alert-danger" role="alert">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="customer-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerName">Customer Name *</label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                className={`form-control ${touched.customerName && errors.customerName ? 'input-error' : ''}`}
                value={values.customerName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
              />
              {fieldError('customerName')}
            </div>

            <div className="form-group">
              <label htmlFor="businessName">Business Name *</label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                className={`form-control ${touched.businessName && errors.businessName ? 'input-error' : ''}`}
                value={values.businessName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Sharma Enterprises"
              />
              {fieldError('businessName')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-control ${touched.email && errors.email ? 'input-error' : ''}`}
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="contact@business.com"
                autoComplete="email"
              />
              {fieldError('email')}
            </div>

            <div className="form-group">
              <label htmlFor="mobileNumber">Mobile Number *</label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                className={`form-control ${touched.mobileNumber && errors.mobileNumber ? 'input-error' : ''}`}
                value={values.mobileNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="+919876543210"
                autoComplete="tel"
              />
              {fieldError('mobileNumber')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerType">Customer Type *</label>
              <select
                id="customerType"
                name="customerType"
                className={`form-control ${touched.customerType && errors.customerType ? 'input-error' : ''}`}
                value={values.customerType}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select type…</option>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
              {fieldError('customerType')}
            </div>

            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                name="status"
                className={`form-control ${touched.status && errors.status ? 'input-error' : ''}`}
                value={values.status}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {fieldError('status')}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <input
              id="address"
              name="address"
              type="text"
              className={`form-control ${touched.address && errors.address ? 'input-error' : ''}`}
              value={values.address}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Full business address"
              autoComplete="street-address"
            />
            {fieldError('address')}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gstNumber">GST Number <span className="label-optional">(optional)</span></label>
              <input
                id="gstNumber"
                name="gstNumber"
                type="text"
                className={`form-control ${touched.gstNumber && errors.gstNumber ? 'input-error' : ''}`}
                value={values.gstNumber ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="07AAAAA1111A1Z1"
                maxLength={15}
              />
              {fieldError('gstNumber')}
            </div>

            <div className="form-group">
              <label htmlFor="followUpDate">Follow-up Date <span className="label-optional">(optional)</span></label>
              <input
                id="followUpDate"
                name="followUpDate"
                type="date"
                className="form-control"
                value={values.followUpDate ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes <span className="label-optional">(optional)</span></label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={values.notes ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
              placeholder="Any additional notes about this customer…"
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : `${mode} Customer`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
