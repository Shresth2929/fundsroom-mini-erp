// ── Customer domain types (aligned with actual backend schema) ────────────────

export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';

export interface Customer {
  id: string;
  customerName: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null; // ISO datetime string
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backend uses `mobileNumber` in request body (maps to `mobile` in DB)
export interface CustomerCreateRequest {
  customerName: string;
  mobileNumber: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: CustomerType;
  address: string;
  status?: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
}

export type CustomerUpdateRequest = Partial<CustomerCreateRequest>;

export interface PaginatedCustomerResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  customers: Customer[];
}

// ── Product domain types (aligned with backend schema) ────────────────────────

export interface Product {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateRequest {
  productName: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlertQty: number;
  locationWarehouse: string;
}

export type ProductUpdateRequest = Partial<ProductCreateRequest>;

export interface PaginatedProductResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  products: Product[];
}

// ── Inventory domain types ──────────────────────────────────────────────────

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdAt: string;
  product?: {
    productName: string;
    sku: string;
  } | null;
  createdBy?: {
    name: string;
    email: string;
  } | null;
}

export interface PaginatedInventoryMovementResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  movements: InventoryMovement[];
}

// ── Auth / shared types ───────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}
