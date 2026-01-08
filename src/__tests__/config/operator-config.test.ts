/**
 * @jest-environment node
 */

// Tests for operator configuration
// Covers: SERVICE_TYPES, PAYMENT_STATUSES, HISTORY_ACTIONS, DEFAULT_VAT_RATE

import {
  SERVICE_TYPES,
  SERVICE_TYPE_KEYS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_KEYS,
  HISTORY_ACTIONS,
  DEFAULT_VAT_RATE,
} from '@/config/operator-config';

describe('SERVICE_TYPES configuration', () => {
  it('should have 9 service types', () => {
    expect(SERVICE_TYPE_KEYS).toHaveLength(9);
  });

  it('should include all expected types', () => {
    expect(SERVICE_TYPE_KEYS).toContain('HOTEL');
    expect(SERVICE_TYPE_KEYS).toContain('RESTAURANT');
    expect(SERVICE_TYPE_KEYS).toContain('TRANSPORT');
    expect(SERVICE_TYPE_KEYS).toContain('GUIDE');
    expect(SERVICE_TYPE_KEYS).toContain('VISA');
    expect(SERVICE_TYPE_KEYS).toContain('VMB');
    expect(SERVICE_TYPE_KEYS).toContain('CRUISE');
    expect(SERVICE_TYPE_KEYS).toContain('ACTIVITY');
    expect(SERVICE_TYPE_KEYS).toContain('OTHER');
  });

  it('should have labels and icons for all types', () => {
    SERVICE_TYPE_KEYS.forEach((key) => {
      expect(SERVICE_TYPES[key].label).toBeDefined();
      expect(SERVICE_TYPES[key].icon).toBeDefined();
    });
  });

  it('should have correct Vietnamese labels', () => {
    expect(SERVICE_TYPES.HOTEL.label).toBe('Khách sạn');
    expect(SERVICE_TYPES.RESTAURANT.label).toBe('Nhà hàng');
    expect(SERVICE_TYPES.TRANSPORT.label).toBe('Vận chuyển');
    expect(SERVICE_TYPES.GUIDE.label).toBe('Hướng dẫn viên');
    expect(SERVICE_TYPES.VMB.label).toBe('Vé máy bay');
    expect(SERVICE_TYPES.CRUISE.label).toBe('Du thuyền');
    expect(SERVICE_TYPES.ACTIVITY.label).toBe('Hoạt động/Tour');
  });

  it('should have valid Lucide icon names', () => {
    const validIcons = [
      'Building2', 'UtensilsCrossed', 'Car', 'User',
      'FileText', 'Plane', 'Ship', 'Camera', 'MoreHorizontal'
    ];
    SERVICE_TYPE_KEYS.forEach((key) => {
      expect(validIcons).toContain(SERVICE_TYPES[key].icon);
    });
  });
});

describe('PAYMENT_STATUSES configuration', () => {
  it('should have 3 payment statuses', () => {
    expect(PAYMENT_STATUS_KEYS).toHaveLength(3);
  });

  it('should include all expected statuses', () => {
    expect(PAYMENT_STATUS_KEYS).toContain('PENDING');
    expect(PAYMENT_STATUS_KEYS).toContain('PARTIAL');
    expect(PAYMENT_STATUS_KEYS).toContain('PAID');
  });

  it('should have labels and colors for all statuses', () => {
    PAYMENT_STATUS_KEYS.forEach((key) => {
      expect(PAYMENT_STATUSES[key].label).toBeDefined();
      expect(PAYMENT_STATUSES[key].color).toBeDefined();
    });
  });

  it('should have correct Vietnamese labels', () => {
    expect(PAYMENT_STATUSES.PENDING.label).toBe('Chờ thanh toán');
    expect(PAYMENT_STATUSES.PARTIAL.label).toBe('Thanh toán một phần');
    expect(PAYMENT_STATUSES.PAID.label).toBe('Đã thanh toán');
  });

  it('should have appropriate colors', () => {
    expect(PAYMENT_STATUSES.PENDING.color).toBe('yellow');
    expect(PAYMENT_STATUSES.PARTIAL.color).toBe('orange');
    expect(PAYMENT_STATUSES.PAID.color).toBe('green');
  });
});

describe('HISTORY_ACTIONS configuration', () => {
  it('should have 12 history action types (including 3-tier locks)', () => {
    // 6 base actions + 6 tier-specific lock actions
    expect(Object.keys(HISTORY_ACTIONS)).toHaveLength(12);
  });

  it('should include all expected base action types', () => {
    expect(HISTORY_ACTIONS).toHaveProperty('CREATE');
    expect(HISTORY_ACTIONS).toHaveProperty('UPDATE');
    expect(HISTORY_ACTIONS).toHaveProperty('DELETE');
    expect(HISTORY_ACTIONS).toHaveProperty('LOCK');
    expect(HISTORY_ACTIONS).toHaveProperty('UNLOCK');
    expect(HISTORY_ACTIONS).toHaveProperty('APPROVE');
  });

  it('should include 3-tier lock action types', () => {
    expect(HISTORY_ACTIONS).toHaveProperty('LOCK_KT');
    expect(HISTORY_ACTIONS).toHaveProperty('UNLOCK_KT');
    expect(HISTORY_ACTIONS).toHaveProperty('LOCK_ADMIN');
    expect(HISTORY_ACTIONS).toHaveProperty('UNLOCK_ADMIN');
    expect(HISTORY_ACTIONS).toHaveProperty('LOCK_FINAL');
    expect(HISTORY_ACTIONS).toHaveProperty('UNLOCK_FINAL');
  });

  it('should have labels and colors for all actions', () => {
    Object.values(HISTORY_ACTIONS).forEach((action) => {
      expect(action.label).toBeDefined();
      expect(action.color).toBeDefined();
    });
  });

  it('should have correct Vietnamese labels for base actions', () => {
    expect(HISTORY_ACTIONS.CREATE.label).toBe('Tạo mới');
    expect(HISTORY_ACTIONS.UPDATE.label).toBe('Cập nhật');
    expect(HISTORY_ACTIONS.DELETE.label).toBe('Xóa');
    expect(HISTORY_ACTIONS.LOCK.label).toBe('Khóa');
    expect(HISTORY_ACTIONS.UNLOCK.label).toBe('Mở khóa');
    expect(HISTORY_ACTIONS.APPROVE.label).toBe('Duyệt TT');
  });

  it('should have correct Vietnamese labels for 3-tier lock actions', () => {
    expect(HISTORY_ACTIONS.LOCK_KT.label).toBe('Khóa KT');
    expect(HISTORY_ACTIONS.UNLOCK_KT.label).toBe('Mở khóa KT');
    expect(HISTORY_ACTIONS.LOCK_ADMIN.label).toBe('Khóa Admin');
    expect(HISTORY_ACTIONS.UNLOCK_ADMIN.label).toBe('Mở khóa Admin');
    expect(HISTORY_ACTIONS.LOCK_FINAL.label).toBe('Khóa Cuối');
    expect(HISTORY_ACTIONS.UNLOCK_FINAL.label).toBe('Mở khóa Cuối');
  });

  it('should have appropriate colors for base actions', () => {
    expect(HISTORY_ACTIONS.CREATE.color).toBe('green');
    expect(HISTORY_ACTIONS.UPDATE.color).toBe('blue');
    expect(HISTORY_ACTIONS.DELETE.color).toBe('red');
    expect(HISTORY_ACTIONS.LOCK.color).toBe('amber');
    expect(HISTORY_ACTIONS.UNLOCK.color).toBe('purple');
    expect(HISTORY_ACTIONS.APPROVE.color).toBe('emerald');
  });

  it('should have appropriate colors for 3-tier lock actions', () => {
    expect(HISTORY_ACTIONS.LOCK_KT.color).toBe('amber');
    expect(HISTORY_ACTIONS.UNLOCK_KT.color).toBe('purple');
    expect(HISTORY_ACTIONS.LOCK_ADMIN.color).toBe('orange');
    expect(HISTORY_ACTIONS.UNLOCK_ADMIN.color).toBe('purple');
    expect(HISTORY_ACTIONS.LOCK_FINAL.color).toBe('red');
    expect(HISTORY_ACTIONS.UNLOCK_FINAL.color).toBe('purple');
  });
});

describe('DEFAULT_VAT_RATE constant', () => {
  it('should be 10 (percent)', () => {
    expect(DEFAULT_VAT_RATE).toBe(10);
  });

  it('should be a positive number', () => {
    expect(DEFAULT_VAT_RATE).toBeGreaterThan(0);
  });

  it('should be less than 100 (reasonable VAT rate)', () => {
    expect(DEFAULT_VAT_RATE).toBeLessThan(100);
  });
});

describe('Service types alignment with Supplier types', () => {
  // This test ensures operator service types match supplier types
  const expectedAlignedTypes = [
    'HOTEL',
    'RESTAURANT',
    'TRANSPORT',
    'GUIDE',
    'VISA',
    'VMB',
    'CRUISE',
    'ACTIVITY',
    'OTHER',
  ];

  it('should have matching service types with supplier types', () => {
    expectedAlignedTypes.forEach((type) => {
      expect(SERVICE_TYPE_KEYS).toContain(type);
    });
  });
});
