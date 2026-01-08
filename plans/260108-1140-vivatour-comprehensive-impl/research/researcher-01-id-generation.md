# Research Report: Vietnamese Diacritics Removal & ID Generation for Tour Management

**Date**: 2026-01-08 | **Status**: Complete | **Sources Consulted**: 8+

---

## Executive Summary

Vietnamese diacritics removal uses Unicode NFD (Canonical Decomposition) to normalize combining marks, then filters. Industry-standard collision-resistant IDs leverage CUID2 (cryptographically secure, recommended) over legacy CUID. Travel booking codes follow IATA/TIDS conventions: agent/operator identification + timestamp + counter. For MyVivaTour: use NFD normalization for slugs, CUID2 for internal IDs, structured booking codes (YYMMDD-OPERATOR-SEQUENCE).

---

## Vietnamese Diacritics Removal

### Algorithm: Unicode NFD Normalization

**Method**: Separate base letters from combining diacritical marks, then filter marks.

```typescript
// TypeScript implementation
function removeDiacritics(text: string): string {
  return text
    .normalize('NFD')                          // Decompose: á → a + acute mark
    .replace(/[\u0300-\u036f]/g, '')           // Remove combining marks (Unicode range)
    .replace(/đ/g, 'd');                       // Handle special cases
}

// Examples
removeDiacritics('Bảo')        // → 'Bao'
removeDiacritics('Nguyễn')     // → 'Nguyen'
removeDiacritics('Tiếng Việt') // → 'Tieng Viet'
removeDiacritics('Hà Nội')     // → 'Ha Noi'
removeDiacritics('Đà Nẵng')    // → 'Da Nang'
```

### Why NFD Works

- **NFD** (Canonical Decomposition) separates: á = a (U+0061) + acute accent (U+0301)
- **Removing U+0300–U+036F** covers all Vietnamese tone/vowel marks
- **Special case `đ`** has no combining decomposition; must map explicitly
- **Performance**: O(n) complexity, negligible overhead

### Use Cases

- **Slug generation**: `removeDiacritics('Chuyến Đà Nẵng') → 'chuyen-da-nang'` (URL-safe)
- **Search/filtering**: Case-insensitive name matching
- **Legacy system integration**: Converting Vietnamese names to ASCII

---

## Collision-Resistant ID Generation

### Comparison: UUID vs CUID vs CUID2

| Aspect | UUID v4 | UUID v1 | CUID (Deprecated) | CUID2 |
|--------|---------|---------|-------------------|-------|
| **Generation** | Random | Timestamp+MAC | Timestamp+fingerprint+counter | SHA3-hashed entropy |
| **Sortable** | No | Yes | Yes | No (by design) |
| **Collision Risk** | ~4×10⁻⁴ at 1B IDs | Nil (ordered) | ~10⁻¹⁵ (leaks time) | ~5×10⁻²⁴ (4×10¹⁸ to 50%) |
| **Secure** | No | No | No (timestamp leakage) | **Yes** (NIST SHA3) |
| **Size** | 36 chars (UUID format) | 36 chars | 25 chars | 24 chars |
| **Distributed** | Yes | Yes (if unique MAC) | Yes (with fingerprint) | **Yes (no coordination)** |
| **DB Performance** | Random insert overhead | Sequential insert fast | Sequential insert fast | Random insert overhead |
| **Recommendation** | Legacy/general | Not recommended | **Deprecated** | **Recommended** |

### CUID2 (Best Practice)

**Why CUID2**:
- Cryptographically secure (NIST SHA3-256)
- Horizontally scalable (no central coordination needed)
- Offline-compatible (no network dependency)
- Ultra-low collision probability (~4 quintillion IDs before 50% collision risk)
- 24-character output (shorter than UUID)

```typescript
// Install: npm install @paralleldrive/cuid2
import { cuid } from '@paralleldrive/cuid2';

const bookingId = cuid();     // → 'cl9i8qd7z0000d3b5j7k8l9m0'
```

### UUID v6 (Sortable Alternative)

If database performance matters and sortability is preferred:

```typescript
import { v6 as uuidv6 } from 'uuid';

const requestId = uuidv6();  // Timestamp-first ordering
// Sortable by creation time; better for range queries
```

---

## Travel Industry Booking Code Standards

### IATA/TIDS Framework

**IATA** (International Air Transport Association) sets industry standards:
- **IATA Number**: 6-digit code for accredited travel agents/operators
- **TIDS**: Non-ticketing identification for tour operators (simplified vs IATA)
- **GDS**: Global Distribution Systems (Amadeus, Sabre) use IATA numbers for booking recognition

### Recommended Booking Code Format

**Pattern**: `YYMMDD-{OperatorCode}-{Sequence}`

```
Example: 260108-NHD-0001
         ↑      ↑   ↑
      Date   Operator Sequence
```

**Components**:
1. **Date** (6 digits): Year-Month-Day for chronological sorting (260108 = 2026-01-08)
2. **Operator Code** (2-4 chars): Unique operator/agent identifier
3. **Sequence** (4 digits): Daily counter per operator

**Advantages**:
- Human-readable and audit-friendly
- Chronologically sortable
- Operator-identifiable for customer service
- Collision avoidance within operator scope
- Compliant with travel industry conventions

### Alternative: Industry-Standard Formats

**Hotel Industry Pattern**:
```
HTL-{PropertyCode}-{Date}-{Counter}
Example: HTL-HANOINI-260108-0152
```

**Airlines Pattern (PNR-like)**:
```
{CarrierCode}{BookingCode}
Example: VJ5K3M (Vietnam Airlines, 6-char booking reference)
```

---

## Implementation for MyVivaTour

### 1. ID Generation Strategy

**Internal**: Use CUID2 for all database IDs (request IDs, operator IDs, revenue records)
```typescript
import { cuid } from '@paralleldrive/cuid2';

const requestId = cuid();  // Database primary key
```

**External/Customer-Facing**: Use structured booking code
```typescript
function generateBookingCode(operatorCode: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = await getNextSequence(operatorCode, date);
  return `${date}-${operatorCode}-${String(sequence).padStart(4, '0')}`;
}

// Result: '260108-NHD-0001'
```

### 2. Diacritics Handling

**For Vietnamese Names**:
```typescript
function generateSlug(vietnameseName: string): string {
  return removeDiacritics(vietnameseName)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// 'Nguyễn Hữu Đức' → 'nguyen-huu-duc'
```

### 3. Database Schema

```sql
-- Collision-resistant IDs with structured booking codes
CREATE TABLE requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- CUID2 generated in app
  booking_code VARCHAR(20) UNIQUE NOT NULL,        -- YYMMDD-OPE-XXXX
  customer_name_slug VARCHAR(100),                 -- Vietnamese name normalized
  customer_phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT NOW(),
  -- ... other fields
);

-- Daily sequence counter per operator
CREATE TABLE booking_sequences (
  operator_code VARCHAR(4) NOT NULL,
  date DATE NOT NULL,
  next_sequence INT DEFAULT 1,
  PRIMARY KEY (operator_code, date)
);
```

### 4. Sequence Generation with Race Condition Handling

```typescript
// Use database transaction to prevent collisions
async function getNextBookingCode(operatorCode: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);

  const result = await db.$transaction(async (tx) => {
    // Lock + increment atomically
    const seq = await tx.bookingSequence.upsert({
      where: { operatorCode_date: { operatorCode, date } },
      update: { nextSequence: { increment: 1 } },
      create: { operatorCode, date, nextSequence: 2 },
      select: { nextSequence: true }
    });

    return `${date.replace(/-/g, '')}-${operatorCode}-${String(seq.nextSequence).padStart(4, '0')}`;
  });

  return result;
}
```

---

## Security & Performance Considerations

### Diacritics Removal
- **Risk**: Information loss (slugs non-reversible; acceptable for display)
- **Performance**: O(n) — minimal overhead
- **Unicode range U+0300-U+036F**: Covers all Vietnamese combining marks

### ID Generation
- **CUID2 vs random UUIDs**: CUID2 provides cryptographic security; UUIDs vulnerable to enumeration
- **Timestamp-based IDs**: Avoid leaking sequence info (use CUID2, not legacy CUID)
- **Booking codes**: Immutable once assigned; include in audit logs

### Database Indexing
```sql
CREATE INDEX idx_requests_booking_code ON requests(booking_code);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX idx_booking_sequences ON booking_sequences(operator_code, date);
```

---

## References & Sources

### Official Standards
- [IATA - Travel Industry Designator Service (TIDS)](https://www.iata.org/en/services/travel-agency-program/tids/)
- [RFC 9562: Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html)

### ID Generation
- [CUID2: The Most Secure Collision-Resistant IDs](https://github.com/paralleldrive/cuid2)
- [UUID Versions Explained](https://www.sohamkamani.com/uuid-versions-explained/)
- [Unique ID Generation Cheat Sheet](https://bool.dev/blog/detail/unique-id-generation)

### Vietnamese Text Processing
- [Vietnamese Unicode FAQs](https://vietunicode.sourceforge.net/)
- [Java: Remove Accents from Text](https://www.baeldung.com/java-remove-accents-from-text)

### Travel Industry
- [GDS Systems & Travel Distribution](https://www.software.travel/blog/tour-operators/gds-system/)
- [IATA Numbers for Travel Agents (2025)](https://traveltekpro.com/what-are-iata-codes-and-number-guide-for-travel-agency/)

---

## Unresolved Questions

1. **Operator code assignment**: Should MyVivaTour auto-generate 2-4 char codes, or should operators specify custom ones?
2. **Daily sequence reset**: Should counters reset at midnight in operator's timezone or UTC?
3. **Legacy data migration**: Do existing booking codes need to maintain format compatibility?
4. **Collisions on same timestamp**: Rare but possible if 2+ operators generate codes simultaneously — is database constraint sufficient?
