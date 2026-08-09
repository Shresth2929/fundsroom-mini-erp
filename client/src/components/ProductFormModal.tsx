import React, { useState, useEffect, useCallback } from 'react';
import type { Product, ProductCreateRequest } from '../types';

interface FormErrors {
  productName?: string;
  sku?: string;
  category?: string;
  unitPrice?: string;
  currentStock?: string;
  minStockAlertQty?: string;
  locationWarehouse?: string;
}

function validate(values: ProductCreateRequest): FormErrors {
  const errors: FormErrors = {};

  if (!values.productName.trim() || values.productName.trim().length < 2)
    errors.productName = 'Product name must be at least 2 characters.';

  if (!values.sku.trim() || values.sku.trim().length < 3)
    errors.sku = 'SKU must be at least 3 characters.';

  if (!values.category.trim() || values.category.trim().length < 2)
    errors.category = 'Category must be at least 2 characters.';

  if (values.unitPrice === undefined || values.unitPrice === null || values.unitPrice < 0)
    errors.unitPrice = 'Unit price must be 0 or greater.';

  if (values.currentStock === undefined || values.currentStock === null || !Number.isInteger(values.currentStock) || values.currentStock < 0)
    errors.currentStock = 'Current stock must be a non-negative integer.';

  if (values.minStockAlertQty === undefined || values.minStockAlertQty === null || !Number.isInteger(values.minStockAlertQty) || values.minStockAlertQty < 0)
    errors.minStockAlertQty = 'Minimum stock must be a non-negative integer.';

  if (!values.locationWarehouse.trim() || values.locationWarehouse.trim().length < 2)
    errors.locationWarehouse = 'Warehouse location must be at least 2 characters.';

  return errors;
}

function emptyForm(): ProductCreateRequest {
  return {
    productName: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlertQty: 0,
    locationWarehouse: '',
  };
}

function productToForm(p: Product): ProductCreateRequest {
  return {
    productName: p.productName,
    sku: p.sku,
    category: p.category,
    unitPrice: p.unitPrice,
    currentStock: p.currentStock,
    minStockAlertQty: p.minimumStock,
    locationWarehouse: p.location,
  };
}

interface ProductFormModalProps {
  isOpen: boolean;
  editProduct?: Product | null;
  isSubmitting: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (data: ProductCreateRequest) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  editProduct,
  isSubmitting,
  serverError,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<ProductCreateRequest>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setTouched({});
      return;
    }
    setValues(editProduct ? productToForm(editProduct) : emptyForm());
    setErrors({});
    setTouched({});
  }, [isOpen, editProduct]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      setValues((prev) => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
      }));
    },
    []
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(values).map((k) => [k, true]));
    setTouched(allTouched);

    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSubmit({
      ...values,
      productName: values.productName.trim(),
      sku: values.sku.trim(),
      category: values.category.trim(),
      locationWarehouse: values.locationWarehouse.trim(),
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) onClose();
  };

  if (!isOpen) return null;

  const mode = editProduct ? 'Edit' : 'Add';

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
      aria-labelledby="product-modal-title"
    >
      <div className="modal-panel modal-panel-lg">
        <div className="modal-header">
          <h2 id="product-modal-title" className="modal-title">
            {mode} Product
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

        {serverError && (
          <div className="alert alert-danger" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="product-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="productName">Product Name *</label>
              <input
                id="productName"
                name="productName"
                type="text"
                className={`form-control ${touched.productName && errors.productName ? 'input-error' : ''}`}
                value={values.productName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Dell Inspiron 15 Laptop"
              />
              {fieldError('productName')}
            </div>

            <div className="form-group">
              <label htmlFor="sku">SKU *</label>
              <input
                id="sku"
                name="sku"
                type="text"
                className={`form-control ${touched.sku && errors.sku ? 'input-error' : ''}`}
                value={values.sku}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. DELL-INS15-001"
                style={{ fontFamily: 'monospace' }}
              />
              {fieldError('sku')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <input
                id="category"
                name="category"
                type="text"
                className={`form-control ${touched.category && errors.category ? 'input-error' : ''}`}
                value={values.category}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Electronics"
              />
              {fieldError('category')}
            </div>

            <div className="form-group">
              <label htmlFor="unitPrice">Unit Price (₹) *</label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                step="0.01"
                className={`form-control ${touched.unitPrice && errors.unitPrice ? 'input-error' : ''}`}
                value={values.unitPrice}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {fieldError('unitPrice')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="currentStock">Current Stock *</label>
              <input
                id="currentStock"
                name="currentStock"
                type="number"
                min="0"
                step="1"
                className={`form-control ${touched.currentStock && errors.currentStock ? 'input-error' : ''}`}
                value={values.currentStock}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {fieldError('currentStock')}
            </div>

            <div className="form-group">
              <label htmlFor="minStockAlertQty">Min Stock Alert *</label>
              <input
                id="minStockAlertQty"
                name="minStockAlertQty"
                type="number"
                min="0"
                step="1"
                className={`form-control ${touched.minStockAlertQty && errors.minStockAlertQty ? 'input-error' : ''}`}
                value={values.minStockAlertQty}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {fieldError('minStockAlertQty')}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="locationWarehouse">Warehouse Location *</label>
            <input
              id="locationWarehouse"
              name="locationWarehouse"
              type="text"
              className={`form-control ${touched.locationWarehouse && errors.locationWarehouse ? 'input-error' : ''}`}
              value={values.locationWarehouse}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Warehouse A - Shelf 3"
            />
            {fieldError('locationWarehouse')}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : `${mode} Product`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
