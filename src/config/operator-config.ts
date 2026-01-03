// Operator configuration - centralized constants
// Service types aligned with Supplier types for consistency

export const SERVICE_TYPES = {
  HOTEL: { label: 'Khách sạn', icon: 'Building2' },
  RESTAURANT: { label: 'Nhà hàng', icon: 'UtensilsCrossed' },
  TRANSPORT: { label: 'Vận chuyển', icon: 'Car' },
  GUIDE: { label: 'Hướng dẫn viên', icon: 'User' },
  VISA: { label: 'Visa', icon: 'FileText' },
  VMB: { label: 'Vé máy bay', icon: 'Plane' },
  CRUISE: { label: 'Du thuyền', icon: 'Ship' },
  ACTIVITY: { label: 'Hoạt động/Tour', icon: 'Camera' },
  OTHER: { label: 'Khác', icon: 'MoreHorizontal' },
} as const;

export type ServiceTypeKey = keyof typeof SERVICE_TYPES;
export const SERVICE_TYPE_KEYS = Object.keys(SERVICE_TYPES) as ServiceTypeKey[];

// Payment status options
export const PAYMENT_STATUSES = {
  PENDING: { label: 'Chờ thanh toán', color: 'yellow' },
  PARTIAL: { label: 'Thanh toán một phần', color: 'orange' },
  PAID: { label: 'Đã thanh toán', color: 'green' },
} as const;

export type PaymentStatusKey = keyof typeof PAYMENT_STATUSES;
export const PAYMENT_STATUS_KEYS = Object.keys(PAYMENT_STATUSES) as PaymentStatusKey[];

// Default VAT rate (%)
export const DEFAULT_VAT_RATE = 10;

// History action types
export const HISTORY_ACTIONS = {
  CREATE: { label: 'Tạo mới', color: 'green' },
  UPDATE: { label: 'Cập nhật', color: 'blue' },
  DELETE: { label: 'Xóa', color: 'red' },
  LOCK: { label: 'Khóa', color: 'amber' },
  UNLOCK: { label: 'Mở khóa', color: 'purple' },
  APPROVE: { label: 'Duyệt TT', color: 'emerald' },
} as const;

export type HistoryActionKey = keyof typeof HISTORY_ACTIONS;
