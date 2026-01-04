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

// Seller types
export type Gender = 'MALE' | 'FEMALE';

export interface Seller {
  id: string;
  telegramId: string;
  sellerName: string;
  sheetName: string;
  metaName: string | null;
  email: string | null;
  gender: Gender;
  sellerCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request types - Re-export from config
export {
  REQUEST_STAGES,
  REQUEST_STATUSES,
  REQUEST_STAGE_KEYS,
  REQUEST_STATUS_KEYS,
  FOLLOWUP_STATUSES,
  getStatusesByStage,
  getStageFromStatus,
  isFollowUpStatus,
  getStatusLabel,
  getStageLabel,
  getStatusColor,
  getStatusesGroupedByStage,
  type RequestStage,
  type RequestStatus,
} from '@/config/request-config';

export interface Request {
  id: string;
  code: string;
  rqid: string | null;
  bookingCode: string | null;
  customerName: string;
  contact: string;
  whatsapp: string | null;
  pax: number;
  country: string;
  source: string;
  status: string;
  stage: string;
  tourDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  expectedDate: Date | null;
  expectedRevenue: number | null;
  expectedCost: number | null;
  requestDate: Date;
  receivedDate: Date;
  lastContactDate: Date | null;
  nextFollowUp: Date | null;
  statusChangedAt: Date | null;
  statusChangedBy: string | null;
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
  status: string;
  tourDays?: number;
  startDate?: string;
  expectedDate?: string;
  expectedRevenue?: number;
  expectedCost?: number;
  lastContactDate?: string;
  notes?: string;
}

// Config types
export interface ConfigFollowUp {
  id: string;
  stage: string;
  daysToWait: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigUser {
  id: string;
  userId: string;
  user?: User;
  sellerCode: string;
  canViewAll: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  rqid: string | null;
  customerName: string;
  country: string;
  overdueDays: number;
  status: string;
  stage: string;
  contact: string;
  nextFollowUp: Date | null;
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
  status?: string;
  stage?: string;
  source?: string;
  country?: string;
  fromDate?: string;
  toDate?: string;
  followup?: 'overdue' | 'today' | 'upcoming';
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

// Re-export from config for backward compatibility
export {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_KEYS,
  SUPPLIER_LOCATIONS,
  SUPPLIER_LOCATION_KEYS,
  PAYMENT_MODELS,
  generateSupplierCode,
  CUSTOM_LOCATION,
  type SupplierTypeKey,
  type SupplierLocationKey,
  type PaymentModelKey,
} from '@/config/supplier-config';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string | null;  // Location key or custom value
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
  location?: string;
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

// ============================================
// OPERATOR TYPES (Dịch vụ/Chi phí)
// ============================================

// Re-export from config for consistency
export {
  SERVICE_TYPES,
  SERVICE_TYPE_KEYS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_KEYS,
  HISTORY_ACTIONS,
  DEFAULT_VAT_RATE,
  type ServiceTypeKey,
  type PaymentStatusKey,
  type HistoryActionKey,
} from '@/config/operator-config';

// Operator filters
export interface OperatorFilters {
  search?: string;
  requestId?: string;
  supplierId?: string;
  serviceType?: string;
  paymentStatus?: string;  // Relaxed to string for form state
  fromDate?: string;
  toDate?: string;
  isLocked?: boolean;
}

// Operator history entry
export interface OperatorHistoryEntry {
  id: string;
  operatorId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK' | 'UNLOCK' | 'APPROVE';
  changes: Record<string, { before: unknown; after: unknown }>;
  userId: string;
  createdAt: Date;
}

// Approval queue item (for Phase 2)
export interface ApprovalQueueItem {
  id: string;
  requestCode: string;
  customerName: string;
  serviceDate: Date;
  serviceType: string;
  serviceName: string;
  supplierName: string | null;
  totalCost: number;
  paymentDeadline: Date | null;
  daysOverdue: number;
  isLocked: boolean;
}

// ============================================
// OPERATOR REPORT TYPES (Phase 4)
// ============================================

// Cost by service type
export interface CostByServiceType {
  type: string;
  label: string;
  total: number;
  count: number;
}

// Cost by supplier
export interface CostBySupplier {
  supplierId: string | null;
  supplierName: string;
  total: number;
  count: number;
}

// Cost by month
export interface CostByMonth {
  month: string; // YYYY-MM format
  total: number;
  count: number;
}

// Cost report summary
export interface CostReportSummary {
  totalCost: number;
  totalCount: number;
  avgCost: number;
}

// Full operator cost report
export interface OperatorCostReport {
  byServiceType: CostByServiceType[];
  bySupplier: CostBySupplier[];
  byMonth: CostByMonth[];
  summary: CostReportSummary;
}

// Payment status report
export interface PaymentStatusReport {
  pending: { count: number; total: number };
  dueThisWeek: { count: number; total: number };
  overdue: { count: number; total: number };
  paidThisMonth: { count: number; total: number };
}
