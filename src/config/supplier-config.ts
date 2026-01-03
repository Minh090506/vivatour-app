// Supplier configuration - centralized constants for easy modification
// NCC = Nhà Cung Cấp (Supplier)

// Supplier types with display labels and code prefixes
export const SUPPLIER_TYPES = {
  HOTEL: { label: 'Khách sạn', prefix: 'HOT' },
  RESTAURANT: { label: 'Nhà hàng', prefix: 'RES' },
  TRANSPORT: { label: 'Vận chuyển', prefix: 'TRA' },
  GUIDE: { label: 'Hướng dẫn viên', prefix: 'GUI' },
  VISA: { label: 'Visa', prefix: 'VIS' },
  VMB: { label: 'Vé máy bay', prefix: 'VMB' },
  CRUISE: { label: 'Du thuyền', prefix: 'CRU' },
  ACTIVITY: { label: 'Hoạt động/Tour', prefix: 'ACT' },
  OTHER: { label: 'Khác', prefix: 'OTH' },
} as const;

export type SupplierTypeKey = keyof typeof SUPPLIER_TYPES;

// Get array of type keys for iteration
export const SUPPLIER_TYPE_KEYS = Object.keys(SUPPLIER_TYPES) as SupplierTypeKey[];

// Locations with code prefixes (2 characters)
export const SUPPLIER_LOCATIONS = {
  'HA_NOI': { label: 'Hà Nội', prefix: 'HN' },
  'HA_LONG': { label: 'Hạ Long', prefix: 'HL' },
  'NINH_BINH': { label: 'Ninh Bình', prefix: 'NB' },
  'HUE': { label: 'Huế', prefix: 'HU' },
  'DA_NANG': { label: 'Đà Nẵng', prefix: 'DN' },
  'HOI_AN': { label: 'Hội An', prefix: 'HA' },
  'NHA_TRANG': { label: 'Nha Trang', prefix: 'NT' },
  'PHAN_THIET': { label: 'Phan Thiết', prefix: 'PT' },
  'TUY_HOA': { label: 'Tuy Hòa', prefix: 'TH' },
  'PHAN_RANG': { label: 'Phan Rang', prefix: 'PR' },
  'HO_CHI_MINH': { label: 'Hồ Chí Minh', prefix: 'HCM' },
  'CU_CHI': { label: 'Củ Chi', prefix: 'CC' },
  'MIEN_TAY': { label: 'Miền Tây', prefix: 'MT' },
  'PHU_QUOC': { label: 'Phú Quốc', prefix: 'PQ' },
  'CAN_THO': { label: 'Cần Thơ', prefix: 'CT' },
  'THAI_LAN': { label: 'Thái Lan', prefix: 'TL' },
  'CAMBODIA': { label: 'Cambodia', prefix: 'CB' },
  'LAO': { label: 'Lào', prefix: 'LA' },
} as const;

export type SupplierLocationKey = keyof typeof SUPPLIER_LOCATIONS;

// Get array of location keys for iteration
export const SUPPLIER_LOCATION_KEYS = Object.keys(SUPPLIER_LOCATIONS) as SupplierLocationKey[];

// Special value for custom location input
export const CUSTOM_LOCATION = 'OTHER';

// Payment model options
export const PAYMENT_MODELS = {
  PREPAID: { label: 'Trả trước (Deposit pool)', description: 'Nạp tiền trước, trừ dần theo đơn' },
  PAY_PER_USE: { label: 'Thanh toán theo đơn', description: 'Thanh toán riêng từng đơn' },
  CREDIT: { label: 'Công nợ', description: 'Ghi nợ, thanh toán theo kỳ' },
} as const;

export type PaymentModelKey = keyof typeof PAYMENT_MODELS;

// Helper: Generate supplier code
// Format: [3 chữ Loại]-[2 chữ ĐịaPhương]-[3 chữ Tên]-[4 số thứ tự]
// Example: HOT-DN-ANK-0002
export function generateSupplierCode(
  type: SupplierTypeKey,
  name: string,
  location?: SupplierLocationKey | null,
  sequenceNumber: number = 1
): string {
  // Get type prefix (3 chars)
  const typePrefix = SUPPLIER_TYPES[type]?.prefix || 'OTH';

  // Get location prefix (2 chars) or XX if no location
  const locationPrefix = location && SUPPLIER_LOCATIONS[location]
    ? SUPPLIER_LOCATIONS[location].prefix
    : 'XX';

  // Get name prefix (3 chars from first word, uppercase, remove diacritics)
  const namePrefix = getNamePrefix(name);

  // Format sequence number (4 digits)
  const sequence = sequenceNumber.toString().padStart(4, '0');

  return `${typePrefix}-${locationPrefix}-${namePrefix}-${sequence}`;
}

// Helper: Extract 3-char prefix from supplier name
function getNamePrefix(name: string): string {
  if (!name) return 'XXX';

  // Remove Vietnamese diacritics
  const normalized = removeDiacritics(name.trim().toUpperCase());

  // Get first word and take first 3 chars
  const firstWord = normalized.split(/\s+/)[0] || '';
  return firstWord.substring(0, 3).padEnd(3, 'X');
}

// Helper: Remove Vietnamese diacritics
function removeDiacritics(str: string): string {
  const diacriticsMap: Record<string, string> = {
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D',
  };

  return str.split('').map(char => diacriticsMap[char] || char).join('');
}

// Export for API use
export { removeDiacritics, getNamePrefix };
