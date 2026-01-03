// ============================================
// Type Definitions for MyVivaTour Platform
// ============================================

// User types
export type Role = 'ADMIN' | 'SELLER' | 'ACCOUNTANT';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  avatar: string | null;
}

// Request types
export type RequestStatus = 'F1' | 'F2' | 'F3' | 'F4' | 'F5';

export interface Request {
  id: string;
  code: string;
  customerName: string;
  contact: string;
  whatsapp: string | null;
  pax: number;
  country: string;
  source: string;
  status: RequestStatus;
  tourDays: number | null;
  expectedDate: Date | null;
  expectedRevenue: number | null;
  expectedCost: number | null;
  requestDate: Date;
  nextFollowUp: Date | null;
  notes: string | null;
  sellerId: string;
  seller?: User;
  sheetRowIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestFormData {
  customerName: string;
  contact: string;
  whatsapp?: string;
  pax: number;
  country: string;
  source: string;
  status: RequestStatus;
  tourDays?: number;
  expectedDate?: string;
  expectedRevenue?: number;
  expectedCost?: number;
  notes?: string;
}

// Operator types
export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export interface Operator {
  id: string;
  requestId: string;
  request?: Request;
  supplierId: string | null;
  supplierRef?: Supplier;
  serviceDate: Date;
  serviceType: string;
  serviceName: string;
  supplier: string | null; // Legacy field - supplier name text
  costBeforeTax: number;
  vat: number | null;
  totalCost: number;
  paymentDeadline: Date | null;
  paymentStatus: PaymentStatus;
  paymentDate: Date | null;
  bankAccount: string | null;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  notes: string | null;
  userId: string;
  sheetRowIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatorFormData {
  requestId: string;
  supplierId?: string;
  serviceDate: string;
  serviceType: string;
  serviceName: string;
  supplier?: string;
  costBeforeTax: number;
  vat?: number;
  totalCost: number;
  paymentDeadline?: string;
  bankAccount?: string;
  notes?: string;
}

// Revenue types
export interface Revenue {
  id: string;
  revenueId: string | null;
  requestId: string;
  request?: Request;
  paymentDate: Date;
  paymentType: string;
  foreignAmount: number | null;
  currency: string | null;
  exchangeRate: number | null;
  amountVND: number;
  paymentSource: string;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  notes: string | null;
  userId: string;
  sheetRowIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueFormData {
  requestId: string;
  paymentDate: string;
  paymentType: string;
  foreignAmount?: number;
  currency?: string;
  exchangeRate?: number;
  amountVND: number;
  paymentSource: string;
  notes?: string;
}

// Email types
export interface Email {
  id: string;
  gmailId: string;
  requestId: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  isRead: boolean;
  isReplied: boolean;
  aiSummary: string | null;
  aiSuggestedReply: string | null;
}

// Knowledge Base types
export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  isActive: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalRevenue: number;
  totalCost: number;
  newRequests: number;
  activeBookings: number;
  revenueChange: number;
  costChange: number;
  requestChange: number;
  bookingChange: number;
}

export interface FollowUpItem {
  id: string;
  customerName: string;
  country: string;
  overdueDays: number;
  status: RequestStatus;
  contact: string;
}

export interface RecentEmail {
  id: string;
  from: string;
  subject: string;
  date: Date;
  isRead: boolean;
  requestCode: string | null;
}

// Filter types
export interface RequestFilters {
  search?: string;
  seller?: string;
  status?: RequestStatus;
  source?: string;
  country?: string;
  fromDate?: string;
  toDate?: string;
}

export interface BookingFilters {
  search?: string;
  seller?: string;
  startMonth?: string;
  endMonth?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Dropdown options
export interface DropdownOptions {
  countries: string[];
  sources: string[];
  statuses: string[];
  serviceTypes: string[];
  paymentTypes: string[];
  paymentSources: string[];
  currencies: string[];
  sellers: string[];
}

// ============================================
// SUPPLIER TYPES (NCC - Nhà Cung Cấp)
// ============================================

export type PaymentModel = 'PREPAID' | 'PAY_PER_USE' | 'CREDIT';
export type TransactionType = 'DEPOSIT' | 'REFUND' | 'ADJUSTMENT' | 'FEE';

export const SUPPLIER_TYPES = [
  'VMB',        // Ve May Bay (Airline)
  'HOTEL',      // Hotels
  'TRANSPORT',  // Cars, buses
  'GUIDE',      // Tour guides
  'RESTAURANT', // Restaurants
  'CRUISE',     // Cruise/boats
  'ACTIVITY',   // Activities, tours
  'OTHER'       // Other services
] as const;

export type SupplierType = typeof SUPPLIER_TYPES[number];

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
  paymentModel: PaymentModel;
  creditLimit: number | null;
  paymentTermDays: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  bankAccount: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed (from API)
  balance?: number;
  transactions?: SupplierTransaction[];
  operators?: Operator[];
}

export interface SupplierFormData {
  code: string;
  name: string;
  type: string;
  paymentModel: PaymentModel;
  creditLimit?: number;
  paymentTermDays?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  bankAccount?: string;
  isActive?: boolean;
  notes?: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  type: TransactionType;
  amount: number;
  transactionDate: Date;
  description: string | null;
  proofLink: string | null;
  relatedBookingCode: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface SupplierTransactionFormData {
  supplierId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description?: string;
  proofLink?: string;
  relatedBookingCode?: string;
}

// Balance & Reports
export interface SupplierBalance {
  deposits: number;
  refunds: number;
  adjustments: number;
  fees: number;
  costs: number;
  balance: number;
}

export interface SupplierBalanceSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  paymentModel: PaymentModel;
  totalDeposits: number;
  totalCosts: number;
  totalRefunds: number;
  balance: number;
  isActive: boolean;
}

export interface SupplierFilters {
  search?: string;
  type?: string;
  paymentModel?: PaymentModel;
  isActive?: boolean;
}
