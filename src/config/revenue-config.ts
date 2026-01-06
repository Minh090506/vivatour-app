// Revenue configuration - centralized constants

// Payment types
export const PAYMENT_TYPES = {
  DEPOSIT: { label: 'Đặt cọc', color: 'blue' },
  FULL_PAYMENT: { label: 'Thanh toán đủ', color: 'green' },
  PARTIAL: { label: 'Thanh toán một phần', color: 'yellow' },
  REFUND: { label: 'Hoàn tiền', color: 'red' },
} as const;

export type PaymentTypeKey = keyof typeof PAYMENT_TYPES;
export const PAYMENT_TYPE_KEYS = Object.keys(PAYMENT_TYPES) as PaymentTypeKey[];

// Payment sources
export const PAYMENT_SOURCES = {
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: 'Building' },
  CASH: { label: 'Tiền mặt', icon: 'Banknote' },
  CARD: { label: 'Thẻ tín dụng', icon: 'CreditCard' },
  PAYPAL: { label: 'PayPal', icon: 'Globe' },
  WISE: { label: 'Wise', icon: 'Globe' },
  OTHER: { label: 'Khác', icon: 'MoreHorizontal' },
} as const;

export type PaymentSourceKey = keyof typeof PAYMENT_SOURCES;
export const PAYMENT_SOURCE_KEYS = Object.keys(PAYMENT_SOURCES) as PaymentSourceKey[];

// Supported currencies
export const CURRENCIES = {
  VND: { label: 'VND', symbol: '₫', decimals: 0 },
  USD: { label: 'USD', symbol: '$', decimals: 2 },
  EUR: { label: 'EUR', symbol: '€', decimals: 2 },
  GBP: { label: 'GBP', symbol: '£', decimals: 2 },
  AUD: { label: 'AUD', symbol: 'A$', decimals: 2 },
  JPY: { label: 'JPY', symbol: '¥', decimals: 0 },
  SGD: { label: 'SGD', symbol: 'S$', decimals: 2 },
  THB: { label: 'THB', symbol: '฿', decimals: 2 },
} as const;

export type CurrencyKey = keyof typeof CURRENCIES;
export const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

// Default exchange rates (fallback, user should input actual rate)
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
  VND: 1,
  USD: 25000,
  EUR: 27000,
  GBP: 32000,
  AUD: 16500,
  JPY: 165,
  SGD: 18500,
  THB: 700,
};
