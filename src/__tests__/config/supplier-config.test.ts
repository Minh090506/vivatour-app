/**
 * @jest-environment node
 */

// Tests for supplier configuration and code generation
// Covers: generateSupplierCode, getNamePrefix, removeDiacritics

import {
  SUPPLIER_TYPES,
  SUPPLIER_LOCATIONS,
  PAYMENT_MODELS,
  SUPPLIER_TYPE_KEYS,
  SUPPLIER_LOCATION_KEYS,
  generateSupplierCode,
  removeDiacritics,
  getNamePrefix,
} from '@/config/supplier-config';

describe('SUPPLIER_TYPES configuration', () => {
  it('should have 9 supplier types', () => {
    expect(SUPPLIER_TYPE_KEYS).toHaveLength(9);
  });

  it('should have 3-character prefixes for all types', () => {
    SUPPLIER_TYPE_KEYS.forEach((key) => {
      expect(SUPPLIER_TYPES[key].prefix).toHaveLength(3);
    });
  });

  it('should include all expected types', () => {
    expect(SUPPLIER_TYPE_KEYS).toContain('HOTEL');
    expect(SUPPLIER_TYPE_KEYS).toContain('RESTAURANT');
    expect(SUPPLIER_TYPE_KEYS).toContain('TRANSPORT');
    expect(SUPPLIER_TYPE_KEYS).toContain('GUIDE');
    expect(SUPPLIER_TYPE_KEYS).toContain('VISA');
    expect(SUPPLIER_TYPE_KEYS).toContain('VMB');
    expect(SUPPLIER_TYPE_KEYS).toContain('CRUISE');
    expect(SUPPLIER_TYPE_KEYS).toContain('ACTIVITY');
    expect(SUPPLIER_TYPE_KEYS).toContain('OTHER');
  });

  it('should have correct prefix mappings', () => {
    expect(SUPPLIER_TYPES.HOTEL.prefix).toBe('HOT');
    expect(SUPPLIER_TYPES.RESTAURANT.prefix).toBe('RES');
    expect(SUPPLIER_TYPES.TRANSPORT.prefix).toBe('TRA');
    expect(SUPPLIER_TYPES.VMB.prefix).toBe('VMB');
    expect(SUPPLIER_TYPES.OTHER.prefix).toBe('OTH');
  });
});

describe('SUPPLIER_LOCATIONS configuration', () => {
  it('should have 18 locations', () => {
    expect(SUPPLIER_LOCATION_KEYS).toHaveLength(18);
  });

  it('should have 2-3 character prefixes for all locations', () => {
    SUPPLIER_LOCATION_KEYS.forEach((key) => {
      const prefix = SUPPLIER_LOCATIONS[key].prefix;
      expect(prefix.length).toBeGreaterThanOrEqual(2);
      expect(prefix.length).toBeLessThanOrEqual(3);
    });
  });

  it('should include key Vietnam locations', () => {
    expect(SUPPLIER_LOCATION_KEYS).toContain('HA_NOI');
    expect(SUPPLIER_LOCATION_KEYS).toContain('HO_CHI_MINH');
    expect(SUPPLIER_LOCATION_KEYS).toContain('DA_NANG');
    expect(SUPPLIER_LOCATION_KEYS).toContain('HA_LONG');
  });

  it('should include international locations', () => {
    expect(SUPPLIER_LOCATION_KEYS).toContain('THAI_LAN');
    expect(SUPPLIER_LOCATION_KEYS).toContain('CAMBODIA');
    expect(SUPPLIER_LOCATION_KEYS).toContain('LAO');
  });
});

describe('PAYMENT_MODELS configuration', () => {
  it('should have 3 payment models', () => {
    expect(Object.keys(PAYMENT_MODELS)).toHaveLength(3);
  });

  it('should include all expected models', () => {
    expect(PAYMENT_MODELS).toHaveProperty('PREPAID');
    expect(PAYMENT_MODELS).toHaveProperty('PAY_PER_USE');
    expect(PAYMENT_MODELS).toHaveProperty('CREDIT');
  });

  it('should have labels and descriptions', () => {
    Object.values(PAYMENT_MODELS).forEach((model) => {
      expect(model.label).toBeDefined();
      expect(model.description).toBeDefined();
    });
  });
});

describe('removeDiacritics', () => {
  it('should remove Vietnamese diacritics from A variants', () => {
    expect(removeDiacritics('ÀÁẢÃẠ')).toBe('AAAAA');
    expect(removeDiacritics('ẰẮẲẴẶ')).toBe('AAAAA');
    expect(removeDiacritics('ẦẤẨẪẬ')).toBe('AAAAA');
  });

  it('should remove Vietnamese diacritics from E variants', () => {
    expect(removeDiacritics('ÈÉẺẼẸ')).toBe('EEEEE');
    expect(removeDiacritics('ỀẾỂỄỆ')).toBe('EEEEE');
  });

  it('should remove Vietnamese diacritics from I variants', () => {
    expect(removeDiacritics('ÌÍỈĨỊ')).toBe('IIIII');
  });

  it('should remove Vietnamese diacritics from O variants', () => {
    expect(removeDiacritics('ÒÓỎÕỌ')).toBe('OOOOO');
    expect(removeDiacritics('ỒỐỔỖỘ')).toBe('OOOOO');
    expect(removeDiacritics('ỜỚỞỠỢ')).toBe('OOOOO');
  });

  it('should remove Vietnamese diacritics from U variants', () => {
    expect(removeDiacritics('ÙÚỦŨỤ')).toBe('UUUUU');
    expect(removeDiacritics('ỪỨỬỮỰ')).toBe('UUUUU');
  });

  it('should remove Vietnamese diacritics from Y variants', () => {
    expect(removeDiacritics('ỲÝỶỸỴ')).toBe('YYYYY');
  });

  it('should convert Đ to D', () => {
    expect(removeDiacritics('Đ')).toBe('D');
    expect(removeDiacritics('ĐÀ NẴNG')).toBe('DA NANG');
  });

  it('should preserve non-diacritic characters', () => {
    expect(removeDiacritics('ABC123')).toBe('ABC123');
    expect(removeDiacritics('HELLO')).toBe('HELLO');
  });

  it('should handle mixed strings', () => {
    expect(removeDiacritics('HÀ NỘI')).toBe('HA NOI');
    expect(removeDiacritics('HỒ CHÍ MINH')).toBe('HO CHI MINH');
    expect(removeDiacritics('PHÚ QUỐC')).toBe('PHU QUOC');
  });

  it('should handle empty string', () => {
    expect(removeDiacritics('')).toBe('');
  });
});

describe('getNamePrefix', () => {
  it('should extract first 3 characters from simple name', () => {
    expect(getNamePrefix('HOTEL')).toBe('HOT');
    expect(getNamePrefix('RESTAURANT')).toBe('RES');
  });

  it('should use first word only', () => {
    expect(getNamePrefix('GRAND HOTEL SAIGON')).toBe('GRA');
    expect(getNamePrefix('MY LINH TOURS')).toBe('MYX'); // 2 chars + X padding
  });

  it('should handle Vietnamese names with diacritics', () => {
    expect(getNamePrefix('Đại Việt')).toBe('DAI');
    expect(getNamePrefix('Hồng Hà')).toBe('HON');
    expect(getNamePrefix('Phú Quốc Resort')).toBe('PHU');
  });

  it('should pad short names with X', () => {
    expect(getNamePrefix('AB')).toBe('ABX');
    expect(getNamePrefix('A')).toBe('AXX');
  });

  it('should return XXX for empty name', () => {
    expect(getNamePrefix('')).toBe('XXX');
  });

  it('should return XXX for null/undefined', () => {
    expect(getNamePrefix(null as unknown as string)).toBe('XXX');
    expect(getNamePrefix(undefined as unknown as string)).toBe('XXX');
  });

  it('should trim whitespace', () => {
    expect(getNamePrefix('  HOTEL ABC  ')).toBe('HOT');
  });

  it('should convert to uppercase', () => {
    expect(getNamePrefix('hotel')).toBe('HOT');
    expect(getNamePrefix('Hotel Saigon')).toBe('HOT');
  });
});

describe('generateSupplierCode', () => {
  it('should generate correct code format: TYPE-LOCATION-NAME-SEQUENCE', () => {
    const code = generateSupplierCode('HOTEL', 'Ankora Hotel', 'DA_NANG', 2);
    expect(code).toBe('HOT-DN-ANK-0002');
  });

  it('should use XX for missing location', () => {
    const code = generateSupplierCode('HOTEL', 'Ankora Hotel', null, 1);
    expect(code).toBe('HOT-XX-ANK-0001');
  });

  it('should use XX for undefined location', () => {
    const code = generateSupplierCode('HOTEL', 'Ankora Hotel', undefined, 1);
    expect(code).toBe('HOT-XX-ANK-0001');
  });

  it('should pad sequence to 4 digits', () => {
    expect(generateSupplierCode('HOTEL', 'Test', 'HA_NOI', 1)).toContain('-0001');
    expect(generateSupplierCode('HOTEL', 'Test', 'HA_NOI', 99)).toContain('-0099');
    expect(generateSupplierCode('HOTEL', 'Test', 'HA_NOI', 999)).toContain('-0999');
    expect(generateSupplierCode('HOTEL', 'Test', 'HA_NOI', 9999)).toContain('-9999');
  });

  it('should default sequence to 1', () => {
    const code = generateSupplierCode('HOTEL', 'Test Hotel', 'HA_NOI');
    expect(code).toBe('HOT-HN-TES-0001');
  });

  describe('for each supplier type', () => {
    const testCases: Array<{ type: keyof typeof SUPPLIER_TYPES; expectedPrefix: string }> = [
      { type: 'HOTEL', expectedPrefix: 'HOT' },
      { type: 'RESTAURANT', expectedPrefix: 'RES' },
      { type: 'TRANSPORT', expectedPrefix: 'TRA' },
      { type: 'GUIDE', expectedPrefix: 'GUI' },
      { type: 'VISA', expectedPrefix: 'VIS' },
      { type: 'VMB', expectedPrefix: 'VMB' },
      { type: 'CRUISE', expectedPrefix: 'CRU' },
      { type: 'ACTIVITY', expectedPrefix: 'ACT' },
      { type: 'OTHER', expectedPrefix: 'OTH' },
    ];

    testCases.forEach(({ type, expectedPrefix }) => {
      it(`should use ${expectedPrefix} for ${type}`, () => {
        const code = generateSupplierCode(type, 'Test', 'HA_NOI', 1);
        expect(code.startsWith(expectedPrefix)).toBe(true);
      });
    });
  });

  describe('for each location', () => {
    const locationTests: Array<{ location: keyof typeof SUPPLIER_LOCATIONS; expectedPrefix: string }> = [
      { location: 'HA_NOI', expectedPrefix: 'HN' },
      { location: 'DA_NANG', expectedPrefix: 'DN' },
      { location: 'HO_CHI_MINH', expectedPrefix: 'HCM' },
      { location: 'HA_LONG', expectedPrefix: 'HL' },
      { location: 'PHU_QUOC', expectedPrefix: 'PQ' },
      { location: 'THAI_LAN', expectedPrefix: 'TL' },
      { location: 'CAMBODIA', expectedPrefix: 'CB' },
    ];

    locationTests.forEach(({ location, expectedPrefix }) => {
      it(`should use ${expectedPrefix} for ${location}`, () => {
        const code = generateSupplierCode('HOTEL', 'Test', location, 1);
        expect(code).toContain(`-${expectedPrefix}-`);
      });
    });
  });

  it('should handle Vietnamese names correctly', () => {
    const code = generateSupplierCode('HOTEL', 'Đại Việt Hotel', 'DA_NANG', 5);
    expect(code).toBe('HOT-DN-DAI-0005');
  });

  it('should handle single character name', () => {
    const code = generateSupplierCode('HOTEL', 'A', 'HA_NOI', 1);
    expect(code).toBe('HOT-HN-AXX-0001');
  });

  it('should handle empty name', () => {
    const code = generateSupplierCode('HOTEL', '', 'HA_NOI', 1);
    expect(code).toBe('HOT-HN-XXX-0001');
  });

  it('should handle name with only spaces', () => {
    const code = generateSupplierCode('HOTEL', '   ', 'HA_NOI', 1);
    expect(code).toBe('HOT-HN-XXX-0001');
  });

  it('should handle multi-word names (use first word only)', () => {
    const code = generateSupplierCode('RESTAURANT', 'PHO 24 RESTAURANT', 'HO_CHI_MINH', 3);
    expect(code).toBe('RES-HCM-PHO-0003');
  });
});
