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

// ── Challan domain types ───────────────────────────────────────────────────

export interface ChallanItem {
  id?: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  totalPrice: number;
  product?: {
    sku?: string;
    category?: string;
    location?: string;
  } | null;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: {
    id: string;
    customerName: string;
    businessName?: string | null;
    email?: string | null;
    mobile?: string | null;
    address?: string | null;
  } | null;
  totalQuantity: number;
  totalPrice: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  items: ChallanItem[];
}

export interface PaginatedChallanResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  challans: Challan[];
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
