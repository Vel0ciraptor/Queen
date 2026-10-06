// Shared types between frontend and backend

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  PROMOTORA = 'PROMOTORA',
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  order: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: Category;
  costPrice: string;
  salePrice: string;
  stockMin: number;
  stockMax?: number;
  status: ProductStatus;
  images: ProductImage[];
  stock?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export enum MovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  LOSS = 'LOSS',
  DAMAGE = 'DAMAGE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum StockStatus {
  NORMAL = 'NORMAL',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export interface InventoryItem {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  stockMin: number;
  stockMax?: number;
  status: StockStatus;
  recommendation?: string;
}

export interface InventoryMovement {
  id: string;
  type: MovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

// ─── SALES ────────────────────────────────────────────────────────────────────

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  QR = 'QR',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
  OTRO = 'OTRO',
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  subtotal: string;
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'images'>;
}

export interface Sale {
  id: string;
  userId: string;
  customerId?: string;
  status: SaleStatus;
  subtotal: string;
  total: string;
  discount: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: SaleItem[];
  customer?: Customer;
  createdAt: string;
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'images'>;
}

export interface Order {
  id: string;
  customerId?: string;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  total: string;
  address?: string;
  notes?: string;
  items: OrderItem[];
  customer?: Customer;
  createdAt: string;
}

// ─── API RESPONSE ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  SALE_COMPLETED = 'SALE_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  WEEKLY_REPORT = 'WEEKLY_REPORT',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
