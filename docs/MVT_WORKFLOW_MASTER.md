# MVT WORKFLOW MASTER DOCUMENT
## MyVivaTour Tourism Operations System

> **Version:** 2.1
> **Cập nhật:** 08/01/2026
> **Changelog:** Bổ sung chi tiết logic sinh ID (RequestID, ServiceID, RevenueID) từ code thực tế
> **Mục đích:** Source of Truth cho WebAppMVT và các quy trình tự động hóa

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc & Entity Relationship](#2-kiến-trúc--entity-relationship)
3. [ID System & Naming Convention](#3-id-system--naming-convention)
4. [Chi tiết File REQUEST](#4-chi-tiết-file-request)
5. [Chi tiết File OPERATOR](#5-chi-tiết-file-operator)
6. [Chi tiết File REVENUE](#6-chi-tiết-file-revenue)
7. [Data Flow & Business Logic](#7-data-flow--business-logic)
8. [Trigger Events & Automation](#8-trigger-events--automation)
9. [Permission & Security](#9-permission--security)
10. [WebApp Integration Endpoints](#10-webapp-integration-endpoints)
11. [Automation Checklist](#11-automation-checklist)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả Business Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MYVIVATOUR OPERATIONS SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │   REQUEST    │      │   OPERATOR   │      │   REVENUE    │              │
│  │    FILE      │ ───► │    FILE      │ ◄─── │    FILE      │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│        │                      │                      │                      │
│        ▼                      ▼                      ▼                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │    Sales     │      │   Điều hành  │      │   Kế toán    │              │
│  │   (Seller)   │      │  (Operator)  │      │  (Accountant)│              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Vai trò trong hệ thống

| Vai trò | File chính | Chức năng |
|---------|------------|-----------|
| **Seller** | Request | Nhận request từ khách, cập nhật thông tin, chốt booking |
| **Điều hành** | Operator | Tạo & quản lý dịch vụ cho từng booking, theo dõi chi phí |
| **Kế toán** | Operator + Revenue | Xác nhận thanh toán NCC, ghi nhận doanh thu từ khách |
| **Admin** | Tất cả | Toàn quyền truy cập và quản lý |

### 1.3 Lifecycle của một Booking

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BOOKING LIFECYCLE                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. REQUEST PHASE                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ Khách liên hệ → Seller nhập Request → Sinh Request ID (AR)          │     │
│  │ → Cập nhật thông tin → Chốt deal → Status = "Booking"               │     │
│  │ → Sinh Booking Code (T) → Chuyển Điều hành                          │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  2. OPERATOR PHASE                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ Điều hành nhận Booking Code → Tạo các dịch vụ (Service)             │     │
│  │ → Mỗi Service có Service ID (AN) → Nhập chi phí, NCC                │     │
│  │ → Theo dõi hạn thanh toán → Kế toán thanh toán NCC                  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  3. REVENUE PHASE                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ Khách thanh toán → Kế toán ghi Revenue → Sinh Revenue ID (AN)       │     │
│  │ → Tổng hợp vào Sale → Báo cáo Show → Tính lợi nhuận                 │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. KIẾN TRÚC & ENTITY RELATIONSHIP

### 2.1 Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐                                                     │
│  │   SELLER_SHEET    │──────┐                                              │
│  │ (Bảo, Lan, Nhi..) │      │ N:1 (sync via RQID)                          │
│  │ ─────────────────  │      │                                              │
│  │ • Request ID (AR)  │      ▼                                              │
│  │ • Tên khách        │  ┌───────────────────┐                              │
│  │ • Contact          │  │  REQUEST_MASTER   │                              │
│  │ • Status           │  │ ─────────────────  │                              │
│  │ • Booking Code (T) │  │ • Request ID (AR) │──┐                           │
│  └───────────────────┘  │ • Booking Code (T) │  │                           │
│                          │ • Seller, Name..   │  │                           │
│                          └───────────────────┘  │                           │
│                                    │             │                           │
│                                    │ 1:1 sync    │ 1:N (1 Booking            │
│                                    ▼             │     N Services)           │
│  ┌───────────────────┐  ┌───────────────────┐  │                           │
│  │ BK_REQUEST_CODE   │◄─│ BK_REQUEST_CODE   │  │                           │
│  │ (File Operator)   │  │ _REVENUE          │  │                           │
│  │ ─────────────────  │  │ (File Revenue)    │  │                           │
│  │ • Booking Code (T) │  │ ─────────────────  │  │                           │
│  │ • Customer Info   │  │ • Booking Code (T) │  │                           │
│  └───────────────────┘  │ • Revenue Plan    │  │                           │
│           │              └───────────────────┘  │                           │
│           │ 1:N                    │             │                           │
│           ▼                        │ 1:N         ▼                           │
│  ┌───────────────────┐            │    ┌───────────────────┐                │
│  │    OPERATOR       │            │    │     REVENUE       │                │
│  │ ─────────────────  │            │    │ ─────────────────  │                │
│  │ • Booking Code (A) │            │    │ • Booking Code (A) │                │
│  │ • Service ID (AN)  │            │    │ • Revenue ID (AN)  │                │
│  │ • Service Type     │            │    │ • Amount           │                │
│  │ • Cost, Payment..  │            ▼    │ • Payment Date     │                │
│  └───────────────────┘  ┌───────────────────┐ └───────────────────┘         │
│           │              │      SALE        │         │                      │
│           │              │ ─────────────────  │         │                      │
│           │ Archive      │ • Booking Code (A) │         │ Aggregate           │
│           ▼              │ • Total Revenue   │◄────────┘                      │
│  ┌───────────────────┐  │ • Customer Info   │                               │
│  │  OPERATOR_STORE   │  └───────────────────┘                               │
│  │ ─────────────────  │            │                                         │
│  │ • Archived records │            │ Generate                                │
│  │ • Completed BK     │            ▼                                         │
│  └───────────────────┘  ┌───────────────────┐                               │
│                          │      SHOW         │                               │
│                          │ ─────────────────  │                               │
│                          │ • Profit Report   │                               │
│                          │ • Summary by BK   │                               │
│                          └───────────────────┘                               │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 File-Sheet Mapping

| File | Sheet | Mục đích | Header Row |
|------|-------|----------|------------|
| **Request** | `{Seller}` | Dữ liệu của từng seller | 1 |
| **Request** | `Request` | Master tổng hợp | 1 |
| **Request** | `Tour` | Config danh sách seller | 1 |
| **Request** | `Config_user` | Phân quyền user | 1 |
| **Operator** | `Operator` | Dịch vụ đang active | 2 |
| **Operator** | `Operator_Store` | Dịch vụ đã archive | 3 |
| **Operator** | `BK_Request_code` | Booking master | 1 |
| **Operator** | `Report` | Báo cáo thanh toán | 26 |
| **Operator** | `Guide` | Config & permission | 1 |
| **Revenue** | `Revenue` | Ghi nhận doanh thu | 2 |
| **Revenue** | `Sale` | Tổng hợp theo BK | 1 |
| **Revenue** | `BK_Request_code_Revenue` | Booking master | 1 |
| **Revenue** | `Show` | Báo cáo tổng hợp | 4 |

---

## 3. ID SYSTEM & NAMING CONVENTION

### 3.1 Các loại ID trong hệ thống

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            ID SYSTEM OVERVIEW                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ REQUEST ID (RQID)                                                   │   │
│  │ ────────────────────────────────────────────────────────────────── │   │
│  │ Format: {SalerName}{yyyyMMddHHmmssSSS}                             │   │
│  │ Ví dụ:  Bao - Kevin20250630032020626                               │   │
│  │ Cột:    AR (index 43/44)                                           │   │
│  │ Dùng để: Link dữ liệu giữa sheet Seller và sheet Request           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BOOKING CODE                                                        │   │
│  │ ────────────────────────────────────────────────────────────────── │   │
│  │ Format: {yyyyMMdd}{3-char}                                         │   │
│  │ Ví dụ:  20250308KIK, 20250418ABK                                   │   │
│  │ Cột:    T (index 19/20)                                            │   │
│  │ Dùng để: Định danh duy nhất cho mỗi Booking, link giữa 3 files     │   │
│  │ Sinh khi: Status chuyển thành "Booking"                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SERVICE ID                                                          │   │
│  │ ────────────────────────────────────────────────────────────────── │   │
│  │ Format: {BookingCode}-{yyyyMMddHHmmssSSS}                          │   │
│  │ Ví dụ:  20250308KIK-20250310143022123                              │   │
│  │ Cột:    AN (index 40)                                              │   │
│  │ Dùng để: Định danh duy nhất cho mỗi dịch vụ trong Operator         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ REVENUE ID                                                          │   │
│  │ ────────────────────────────────────────────────────────────────── │   │
│  │ Format: {BookingCode}-{yyyyMMddHHmmss}-{rowNum}                     │   │
│  │ Ví dụ:  20250308KIK-20250315091530-42                              │   │
│  │ Cột:    AN (index 40)                                              │   │
│  │ Dùng để: Định danh duy nhất cho mỗi khoản thu trong Revenue        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 ID Generation Rules - Chi tiết từ Code thực tế

#### 3.2.1 REQUEST ID (RQID) - File Request

**Format:** `{SalerName}{yyyyMMddHHmmssSSS}[_{suffix}]`

**Ví dụ:**
- `Bao20250710152345123` (chuẩn)
- `Lan20250710152345123_1` (khi có trùng)

**Logic sinh ID (từ Request_code.txt):**

```javascript
/**
 * Sinh RQID timestamp-based (độ phân giải ms) và bảo đảm unique.
 * @param {String} salerName   prefix RQID = tên sheet Saler
 * @param {Set}    uniqSet     Tập RQID đã tồn tại để kiểm tra trùng
 * @return {String}            RQID mới bảo đảm duy nhất
 */
function generateTimestampBasedRQID_(salerName, uniqSet) {
  // Tạo timestamp tới mili-giây
  const tz        = Session.getScriptTimeZone() || 'Asia/Bangkok';
  const baseStamp = Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmssSSS');
  let   candidate = salerName + baseStamp;
  let   suffix    = 0;

  // Bảo đảm duy nhất - thêm suffix nếu trùng
  while (uniqSet.has(candidate)) {
    suffix++;
    candidate = `${salerName}${baseStamp}_${suffix}`;
  }
  uniqSet.add(candidate);
  return candidate;
}
```

**Validation RQID:**

```javascript
/**
 * Validate RQID timestamp-based
 * Format: salerName + yyyyMMddHHmm[ss][SSS] (14–17 số) + optional _suffix
 */
function isValidTimestampRQID_(rqid, expectedSaler) {
  const re = new RegExp(`^${expectedSaler}(\\d{14,17})(?:_\\d+)?`);
  const m  = rqid.match(re);
  if (!m) return false;

  const ts = m[1];                 // yyyyMMddHHmmssSSS…
  const year   = +ts.substr(0,4);
  const month  = +ts.substr(4,2);
  const day    = +ts.substr(6,2);
  const hour   = +ts.substr(8,2);
  const minute = +ts.substr(10,2);

  return year  >= 2020 && year <= 2035 &&
         month >= 1    && month <= 12  &&
         day   >= 1    && day   <= 31  &&
         hour  >= 0    && hour  <= 23  &&
         minute>= 0    && minute<= 59;
}
```

**Khi nào sinh RQID:**
- Khi nhập tên khách (cột B) trên sheet Saler
- Khi paste nhiều dòng có cột NAME
- Tự động qua `autoFillRow_()` khi có thay đổi quan trọng

**Cột lưu trữ:**
- Sheet Saler: cột AR (index 43, 0-based)
- Sheet Request: cột AR (index 44, 1-based)

---

#### 3.2.2 BOOKING CODE - File Request

**Format:** `{yyyyMMdd}{2-char-name}{tourShort}`

**Ví dụ:**
- `20250308KIK` (20250308 + KI từ tên "Kim" + K từ tourShort)
- `20250418ABB` (20250418 + AB từ tên "Abby" + B từ tourShort)

**Logic sinh Booking Code (từ Request_code.txt):**

```javascript
/**
 * Sinh Booking Code khi Status = "Booking"
 * Điều kiện: STATUS='Booking', đủ dữ liệu (Name, StartDate, Saler, DT_DU_KIEN)
 */
function generateBookingCode_(row, tourMap) {
  const name    = row[COL.NAME].toString().trim();
  const start   = row[COL.START_DATE];  // Date object
  const saler   = row[COL.SALER];

  // Format ngày: yyyyMMdd
  const ymd = Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyyMMdd');

  // Lấy 2 ký tự đầu từ tên khách (viết hoa)
  const nameInit = name.toUpperCase().substring(0, 2);

  // Lấy tourShort từ mapping Saler → TourCode (sheet Tour!R:S)
  const tourShort = tourMap[saler] || '';

  // Ghép: yyyyMMdd + 2char + tourShort = 11 ký tự
  const rawCode = ymd + nameInit + tourShort;

  // Kiểm tra trùng và xử lý
  if (codeMap[rawCode] !== undefined) {
    // Nếu trùng: thay ký tự đầu bằng '9'
    return '9' + rawCode.substring(1);
  }

  return rawCode;  // Độ dài chuẩn: 11 ký tự
}
```

**Chống trùng Booking (Double-layer):**

```javascript
// Layer 1: Chống trùng theo Booking Code
if (codeMap[rawCode] !== undefined) {
  finalCd = '9' + rawCode.substring(1);  // 20250308KIK → 90250308KIK
}

// Layer 2: Chống trùng theo Key composite (Name+Saler+Country+StartDate)
const makeBookingKey_ = (row) => {
  const name   = normKeyPart(row[COL.NAME]);
  const saler  = normKeyPart(row[COL.SALER]);
  const ctry   = normKeyPart(row[COUNTRY_COL]);
  const ymd    = fmtYmd(row[COL.START_DATE]);
  return `${name}|${saler}|${ctry}|${ymd}`;  // "kim|bao|vietnam|20250308"
};
```

**Khi nào sinh Booking Code:**
- Khi Status chuyển thành "Booking"
- Ô CODE (cột T) đang trống
- Đủ dữ liệu bắt buộc: Name, StartDate, Saler, DT_DU_KIEN

**Cột lưu trữ:**
- Cột S: Lưu code khách (backup - màu xám)
- Cột T: Mã khách chính (màu xanh lá) - **KEY chính liên kết 3 files**

---

#### 3.2.3 SERVICE ID (Operator ID) - File Operator

**Format:** `{BookingCode}-{yyyyMMddHHmmssSSS}`

**Ví dụ:**
- `20250308KIK-20250310143022123`
- `20250418ABB-20250420091530456`

**Logic sinh Service ID (từ Operator_code.txt):**

```javascript
/**
 * Định dạng ID: <CODE>-yyyyMMddHHmmssSSS
 * @param {String} code   Booking Code (từ cột A)
 * @param {Date}   d      Timestamp
 */
function generateServiceId_(code, d) {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const stamp = Utilities.formatDate(d, tz, 'yyyyMMddHHmmssSSS');
  return `${code}-${stamp}`;
}

/**
 * Tạo mã cho 1 dòng (chỉ khi AN trống) với đảm bảo duy nhất.
 */
function ensureServiceIdForRowUnique(opSh, row, usedSet) {
  const cur = opSh.getRange(row, OP_COL.SERVICE_ID).getDisplayValue().trim();
  if (cur) return cur; // đã có mã → không làm gì

  const code = opSh.getRange(row, OP_COL.CODE).getDisplayValue().trim();
  if (!code) return ''; // thiếu mã KH → không sinh

  // Base time dùng chung, tăng +1ms tới khi duy nhất
  let base = new Date();
  let candidate = generateServiceId_(code, base);
  let guard = 0;
  while (usedSet.has(candidate)) {
    base = new Date(base.getTime() + 1);  // +1ms phá va chạm
    candidate = generateServiceId_(code, base);
    if (++guard > 2000) throw new Error('Không thể tạo mã dịch vụ duy nhất');
  }

  opSh.getRange(row, OP_COL.SERVICE_ID).setValue(candidate);
  usedSet.add(candidate);
  return candidate;
}
```

**Đảm bảo Uniqueness:**
- Dùng Set để track các ID đã tồn tại
- Nếu trùng: tăng timestamp +1ms và thử lại
- Guard loop tối đa 2000 lần (2 giây)

**Khi nào sinh Service ID:**
- Khi thêm dịch vụ mới qua WebApp/Form
- Khi chạy hàm `fillMissingServiceIdsOperatorSafe()`
- Điều kiện: Có Booking Code (cột A), chưa có Service ID (cột AN)

**Cột lưu trữ:**
- Cột AN (index 40, 1-based) trong sheet Operator

---

#### 3.2.4 REVENUE ID - File Revenue

**Format:** `{BookingCode}-{yyyyMMddHHmmss}-{rowNum}`

**Ví dụ:**
- `20250308KIK-20250315091530-42`
- `20250418ABB-20250420103045-156`

**Logic sinh Revenue ID (từ Revenue_code.txt):**

```javascript
/**
 * Sinh Revenue ID cho tất cả dòng còn thiếu
 * Format: <BookingCode>-<yyyyMMddHHmmss>-<rowNum>
 */
function generateRevenueIDForAll() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Revenue');
  if (!sh) throw new Error('Không tìm thấy sheet Revenue');

  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  var range = sh.getRange(2, 1, lastRow - 1, 40);
  var data = range.getValues();

  // Timestamp chung cho batch này (14 ký tự: yyyyMMddHHmmss)
  var ts = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMddHHmmss'
  );

  var count = 0;

  data.forEach(function(r, i) {
    var booking = r[0];           // Cột A: Booking Code
    var revenueId = r[39];        // Cột AN: Revenue ID
    var rowNum = i + 2;           // Số dòng thực tế (1-based, bỏ header)

    // Chỉ sinh nếu có Booking Code và chưa có Revenue ID
    if (booking && !revenueId) {
      r[39] = booking + '-' + ts + '-' + rowNum;
      count++;
    }
  });

  range.setValues(data);
}
```

**Đặc điểm:**
- Timestamp dùng chung cho cả batch (14 ký tự, không có ms)
- Row number đảm bảo unique trong cùng batch
- Idempotent: chỉ sinh khi chưa có ID

**Khi nào sinh Revenue ID:**
- Khi ghi khoản thu mới vào sheet Revenue
- Khi chạy hàm `generateRevenueIDForAll()`

**Cột lưu trữ:**
- Cột AN (index 40, 1-based) trong sheet Revenue

---

### 3.3 ID Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ID RELATIONSHIP FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        REQUEST ID (RQID)                             │    │
│  │  ─────────────────────────────────────────────────────────────────   │    │
│  │  Format: {SalerName}{yyyyMMddHHmmssSSS}[_{suffix}]                   │    │
│  │  Ví dụ:  Bao20250710152345123                                        │    │
│  │  Sinh khi: Nhập tên khách (cột B)                                    │    │
│  │  Dùng để: Sync dữ liệu giữa Sheet Saler ↔ Sheet Request              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              │ Status = "Booking"                           │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        BOOKING CODE                                   │    │
│  │  ─────────────────────────────────────────────────────────────────   │    │
│  │  Format: {yyyyMMdd}{2-char}{tourShort} (11 chars)                    │    │
│  │  Ví dụ:  20250308KIK                                                 │    │
│  │  Sinh khi: Status → "Booking" và đủ dữ liệu                          │    │
│  │  Dùng để: ★ KEY CHÍNH liên kết 3 files (Request, Operator, Revenue)  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│               ┌──────────────┴──────────────┐                               │
│               ▼                              ▼                               │
│  ┌────────────────────────────┐  ┌────────────────────────────┐             │
│  │       SERVICE ID            │  │       REVENUE ID            │             │
│  │  ────────────────────────   │  │  ────────────────────────   │             │
│  │  Format: {BK}-{yyyyMMdd     │  │  Format: {BK}-{yyyyMMdd     │             │
│  │          HHmmssSSS}         │  │          HHmmss}-{row}      │             │
│  │  Ví dụ:  20250308KIK-       │  │  Ví dụ:  20250308KIK-       │             │
│  │          20250310143022123  │  │          20250315091530-42  │             │
│  │  Sinh khi: Thêm dịch vụ     │  │  Sinh khi: Ghi khoản thu    │             │
│  │  File: Operator (cột AN)    │  │  File: Revenue (cột AN)     │             │
│  └────────────────────────────┘  └────────────────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 ID Summary Table

| ID Type | Format | Length | Trigger | Location | Uniqueness |
|---------|--------|--------|---------|----------|------------|
| **Request ID** | `{Saler}{yyyyMMddHHmmssSSS}[_n]` | 17-22+ chars | Nhập tên khách | Request!AR, Saler!AR | Set + suffix |
| **Booking Code** | `{yyyyMMdd}{2char}{tour}` | 11 chars | Status="Booking" | Request!T | Key composite |
| **Service ID** | `{BK}-{yyyyMMddHHmmssSSS}` | 28+ chars | Thêm dịch vụ | Operator!AN | Set + ms offset |
| **Revenue ID** | `{BK}-{yyyyMMddHHmmss}-{row}` | 27+ chars | Ghi khoản thu | Revenue!AN | Batch + rowNum |

---

## 4. CHI TIẾT FILE REQUEST

### 4.1 Sheet Structure - Seller Sheet

| Cột | Index (0) | Key | Header | Type | Auto/Manual |
|-----|-----------|-----|--------|------|-------------|
| A | 0 | SALER | Seller | Text | Auto |
| B | 1 | NAME | Tên khách | Text | Manual |
| C | 2 | CONTACT | Contact/Email | Text | Manual |
| D | 3 | WHATSAPP | WhatsApp | Text | Manual |
| E | 4 | PAX | Số người | Number | Manual |
| F | 5 | COUNTRY | Quốc gia | Text | Manual |
| G | 6 | SOURCE | Nguồn | Text | Manual |
| H | 7 | STATUS | Trạng thái | Text | Manual |
| I | 8 | RECEIVED_DATE | Ngày nhận RQ | Date | Auto |
| J | 9 | DAYS | Số ngày tour | Number | Manual |
| K | 10 | START_DATE | Ngày dự kiến đi | Date | Manual |
| L | 11 | DT_DU_KIEN | Doanh thu dự kiến | Number | Manual |
| M | 12 | CHI_PHI | Chi phí dự kiến | Number | Manual |
| N | 13 | NOTE | Ghi chú | Text | Manual |
| O | 14 | WARNING | Cảnh báo | Text | Auto |
| P | 15 | LAST_EDIT | Ngày chỉnh sửa | Date | Auto |
| ... | ... | ... | ... | ... | ... |
| T | 19 | CODE | Mã Booking | Text | Auto |
| V | 21 | BOOKING_TIME | Ngày chốt BK | Date | Auto |
| AR | 43 | RQID | Request ID | Text | Auto |

### 4.2 Sheet Structure - Request (Master)

| Cột | Index (1) | Key | Header | Mô tả |
|-----|-----------|-----|--------|-------|
| A | 1 | SALER | Seller | Nhân viên phụ trách |
| B | 2 | NAME | Tên khách | Tên khách hàng |
| C | 3 | CONTACT | Contact | Email liên hệ |
| D | 4 | WHATSAPP | WhatsApp | Số WhatsApp |
| E | 5 | PAX | Pax | Số người đi tour |
| F | 6 | COUNTRY | Quốc gia | Quốc gia khách |
| G | 7 | SOURCE | Nguồn | Facebook, Form, Booking |
| H | 8 | STATUS | Trạng thái | F2, F3, Booking, Đã kết thúc |
| I | 9 | RECEIVED_DATE | Ngày nhận RQ | Ngày tiếp nhận request |
| J | 10 | DAYS | Số ngày tour | Số ngày dự kiến |
| K | 11 | START_DATE | Ngày đi | Ngày dự kiến đi |
| L | 12 | DT_DU_KIEN | DT dự kiến | Doanh thu dự kiến |
| M | 13 | CHI_PHI | Chi phí DK | Chi phí dự kiến |
| N | 14 | NOTE | Ghi chú | Ghi chú về request |
| S | 19 | CODE_BACKUP | Lưu code KH | Mã code lưu lần đầu |
| **T** | **20** | **CODE** | **Mã khách** | **BOOKING CODE CHÍNH** |
| V | 22 | BOOKING_TIME | Ngày chốt BK | Ngày chốt Booking |
| W | 23 | DT_SALER | DT dự kiến (saler) | Doanh thu từ saler |
| X | 24 | CP_SALER | CP dự kiến (saler) | Chi phí từ saler |
| Y | 25 | START_BK | Ngày đi (booking) | Ngày đi khi booking |
| Z | 26 | END_BK | Ngày kết thúc | Ngày kết thúc tour |
| AB | 28 | MONTH_RECV | Tháng nhận | Tháng nhận request |
| AC | 29 | YEAR_RECV | Năm nhận | Năm nhận request |
| AH | 34 | CLOSE_MONTH | Tháng chốt | Tháng chốt booking |
| **AR** | **44** | **RQID** | **Request ID** | **ID duy nhất request** |

### 4.3 Status Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       REQUEST STATUS FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐                                                       │
│   │  (New)   │──────┐                                                │
│   └──────────┘      │                                                │
│                     ▼                                                │
│              ┌──────────┐     ┌──────────┐     ┌──────────┐         │
│              │    F2    │────►│    F3    │────►│ Khách    │         │
│              │(Follow 2)│     │(Follow 3)│     │  Hoãn    │         │
│              └──────────┘     └──────────┘     └──────────┘         │
│                     │               │               │                │
│                     │               │               │                │
│                     ▼               ▼               ▼                │
│              ┌─────────────────────────────────────────┐            │
│              │              BOOKING                    │◄───────┐   │
│              │  • Sinh Booking Code (T)                │        │   │
│              │  • Ghi Ngày chốt (V)                    │        │   │
│              │  • Chuyển sang Operator                 │        │   │
│              └─────────────────────────────────────────┘        │   │
│                              │                                   │   │
│                              ▼                                   │   │
│              ┌──────────────────────────────┐                   │   │
│              │        Đã kết thúc           │                   │   │
│              │  • Tour completed            │                   │   │
│              └──────────────────────────────┘                   │   │
│                                                                  │   │
│   Legend:  ─► Transition   ◄─ Back possible                     │   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 OnEdit Triggers (Request)

```javascript
// Trigger khi sửa trên sheet Seller
function onEditMain(e) {
  // 1. Kiểm tra quyền truy cập
  // 2. Auto-fill A (Saler), I (Received Date), K (Start Date)
  // 3. Sinh RQID nếu chưa có (khi có Name)
  // 4. Sync sang sheet Request
  // 5. Khi Status = "Booking":
  //    - Ghi V (Booking Time) = now
  //    - Sinh Booking Code (T)
  //    - Tính Z (End Date) = K + J - 1
  //    - Ghi AE, AF (tháng/năm kết thúc)
}

// Các cột trigger sync
const WATCH_COLS = [3,4,5,6,7,9,10,11,12,13,14]; // C→N
```

---

## 5. CHI TIẾT FILE OPERATOR

### 5.1 Sheet Structure - Operator

| Cột | Index (1) | Key | Header | Type | Auto/Manual |
|-----|-----------|-----|--------|------|-------------|
| A | 1 | CODE | Mã Booking | Text | Manual* |
| B | 2 | NAME | Tên Khách | Text | Auto |
| C | 3 | CONTACT | SĐT/Contact | Text | Auto |
| D | 4 | WHATSAPP | WhatsApp | Text | Auto |
| E | 5 | PAX | Số khách | Number | Auto |
| F | 6 | START_DATE | Ngày bắt đầu | Date | Auto |
| G | 7 | END_DATE | Ngày kết thúc | Date | Auto |
| H | 8 | COUNTRY | Quốc gia | Text | Auto |
| I | 9 | SALER | Seller | Text | Auto |
| **J** | **10** | **SVC_DATE** | **Ngày dùng DV** | Date | **Manual** |
| **K** | **11** | **SVC_TYPE** | **Loại dịch vụ** | Text | **Manual** |
| O | 15 | COST_BEFORE_TAX | Chi phí trước thuế | Number | Manual |
| P | 16 | VAT | Thuế VAT | Number | Manual |
| **Q** | **17** | **COST_PLAN** | **Chi phí dự kiến** | Number | **Manual** |
| **R** | **18** | **PAY_DUE** | **Hạn thanh toán** | Date | **Manual** |
| S | 19 | PAY_ACCOUNT | TK thanh toán | Text | Manual |
| T | 20 | NOTE | Ghi chú | Text | Manual |
| U | 21 | PAY_DATE | Ngày thanh toán | Date | Manual |
| **V** | **22** | **PAY_AMT** | **Số tiền đã TT** | Number | Manual |
| **W** | **23** | **DEBT** | **Dư nợ** | Number | Formula |
| Y | 25 | PROOF_LINK | Link chứng từ | URL | Manual |
| Z | 26 | MONTH | Tháng | Number | Auto |
| AA | 27 | YEAR | Năm | Number | Auto |
| **AB** | **28** | **TICK_KT** | **Lock KT** | Boolean | Manual |
| **AC** | **29** | **TICK_ADMIN** | **Lock Admin** | Boolean | Manual |
| **AD** | **30** | **TICK_FINAL** | **Lock Final** | Boolean | Manual |
| **AN** | **40** | **SERVICE_ID** | **Mã dịch vụ** | Text | Auto |

### 5.2 Sheet Structure - BK_Request_code (Source)

| Cột | Index (1) | Key | Header |
|-----|-----------|-----|--------|
| A | 1 | SALER | Seller |
| B | 2 | NAME | Tên khách |
| C | 3 | CONTACT | Contact |
| D | 4 | WHATSAPP | WhatsApp |
| E | 5 | PAX | Pax |
| F | 6 | COUNTRY | Quốc gia |
| **T** | **20** | **CODE** | **Mã Booking** |
| W | 23 | DT_DU_KIEN | Doanh thu DK |
| X | 24 | CHI_PHI | Chi phí DK |
| Y | 25 | START | Ngày bắt đầu |
| Z | 26 | END | Ngày kết thúc |

### 5.3 Operator Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          OPERATOR WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. NHẬN BOOKING                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Điều hành chọn Booking Code từ BK_Request_code               │     │
│  │ • Auto-fill: Name, Contact, Pax, Country, Start/End, Saler     │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  2. TẠO DỊCH VỤ                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Nhập J (Ngày dùng DV), K (Loại DV)                           │     │
│  │ • Nhập O, P, Q (Chi phí)                                        │     │
│  │ • Nhập R (Hạn thanh toán), S (TK thanh toán)                   │     │
│  │ • Sinh Service ID (AN) = CODE + timestamp                       │     │
│  │ • Auto-calc: Z (tháng), AA (năm) từ J                          │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  3. THANH TOÁN NCC                                                       │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Kế toán check Report: dịch vụ nào đến hạn (R <= today)       │     │
│  │ • Thanh toán → Nhập U (Ngày TT), V (Số tiền TT)                │     │
│  │ • W (Dư nợ) = Q - V (tự động tính)                             │     │
│  │ • Upload chứng từ → Y (Link)                                    │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  4. LOCK & ARCHIVE                                                       │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Tick AB (Lock KT) → Khóa dòng level 1                        │     │
│  │ • Tick AC (Lock Admin) → Khóa dòng level 2                     │     │
│  │ • Tick AD (Lock Final) → Khóa vĩnh viễn                        │     │
│  │ • Khi G <= cutoff && Q == V → Chuyển Operator_Store            │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 3-Tier Lock System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         3-TIER LOCK SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TIER 1: LOCK KT (Kế toán) - Column AB                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Ai có thể khóa: Kế toán, Admin                                       │
│  • Ai có thể mở: Kế toán, Admin                                         │
│  • Mục đích: Xác nhận thanh toán đã hoàn tất                            │
│  • Hiệu ứng: Dòng chuyển màu vàng, không sửa được cost/payment          │
│                                                                          │
│  TIER 2: LOCK ADMIN - Column AC                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Ai có thể khóa: Admin                                                │
│  • Ai có thể mở: Admin                                                  │
│  • Điều kiện: Phải có Lock KT trước                                     │
│  • Mục đích: Xác nhận kiểm tra của quản lý                              │
│  • Hiệu ứng: Dòng chuyển màu cam, chỉ Admin mới sửa được                │
│                                                                          │
│  TIER 3: LOCK FINAL - Column AD                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Ai có thể khóa: Admin                                                │
│  • Ai có thể mở: Admin (cần xác nhận đặc biệt)                          │
│  • Điều kiện: Phải có Lock Admin trước                                  │
│  • Mục đích: Đóng sổ kế toán, không cho sửa                             │
│  • Hiệu ứng: Dòng chuyển màu đỏ, sẵn sàng archive                       │
│                                                                          │
│  LOCK FLOW:                                                              │
│  ┌──────┐    ┌───────────┐    ┌────────────┐    ┌────────────┐          │
│  │ Open │ ─► │ Lock KT   │ ─► │ Lock Admin │ ─► │ Lock Final │          │
│  │      │    │ (AB=true) │    │ (AC=true)  │    │ (AD=true)  │          │
│  └──────┘    └───────────┘    └────────────┘    └────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Archive Logic (TongHopOperator)

```javascript
// Điều kiện chuyển sang Operator_Store:
// 1. G (End Date) <= cutoff (ngày cuối tháng trước)
// 2. Q (Chi phí DK) == V (Đã thanh toán)

function shouldArchive(row) {
  const endDate = row[6];      // G
  const planned = row[16];     // Q
  const paid = row[21];        // V
  const cutoff = getLastDayOfPreviousMonth();

  const endOk = (endDate instanceof Date) && (endDate <= cutoff);
  const payableDone = (planned === paid);

  return endOk && payableDone;
}
```

---

## 6. CHI TIẾT FILE REVENUE

### 6.1 Sheet Structure - Revenue

| Cột | Index (1) | Key | Header | Type |
|-----|-----------|-----|--------|------|
| A | 1 | CODE | Mã Booking | Text |
| B | 2 | NAME | Tên khách | Text |
| C | 3 | CONTACT | Contact | Text |
| D | 4 | WHATSAPP | WhatsApp | Text |
| E | 5 | PAX | Pax | Number |
| F | 6 | START | Ngày bắt đầu | Date |
| G | 7 | END | Ngày kết thúc | Date |
| H | 8 | COUNTRY | Quốc gia | Text |
| I | 9 | SALER | Seller | Text |
| **K** | **11** | **AMOUNT** | **Số tiền thu** | Number |
| AN | 40 | REVENUE_ID | RevenueID | Text |

### 6.2 Sheet Structure - Sale

| Cột | Index (1) | Key | Header | Type |
|-----|-----------|-----|--------|------|
| A | 1 | CODE | Mã Booking | Text |
| B | 2 | NAME | Tên khách | Text |
| C | 3 | CONTACT | Contact | Text |
| D | 4 | WHATSAPP | WhatsApp | Text |
| E | 5 | PAX | Pax | Number |
| F | 6 | START | Ngày bắt đầu | Date |
| G | 7 | END | Ngày kết thúc | Date |
| H | 8 | COUNTRY | Quốc gia | Text |
| I | 9 | SALER | Seller | Text |
| **K** | **11** | **REVENUE** | **Tổng doanh thu** | Number |
| R | 18 | COST_PLAN | Tổng chi phí DK | Number |

### 6.3 Revenue Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REVENUE WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. GHI NHẬN DOANH THU                                                   │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Khách thanh toán → Kế toán nhập vào sheet Revenue            │     │
│  │ • Nhập: Booking Code (A), Số tiền (K)                          │     │
│  │ • Auto-fill từ BK_Request_code_Revenue: B→I                    │     │
│  │ • Sinh Revenue ID (AN)                                          │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  2. TỔNG HỢP VÀO SALE (BookingCalculate)                                │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Đọc tất cả Booking Code từ Revenue                           │     │
│  │ • Nếu chưa có trong Sale → Thêm mới                            │     │
│  │ • Tính K (Sale) = Tổng K (Revenue) theo Booking Code           │     │
│  │ • Đọc R (Cost Plan) từ BK_Request_code_Revenue                 │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  3. BÁO CÁO SHOW                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ • Tổng hợp theo Booking                                         │     │
│  │ • Profit = Tổng Revenue - Tổng Chi phí DK                      │     │
│  │ • Báo cáo theo tháng/năm                                        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Profit Calculation

```javascript
// Profit Logic
Profit = Tổng Doanh thu thực tế (Sale.K) - Tổng Chi phí DK điều hành (Operator)

// AutoSynCustomerInfo - Đồng bộ từ BK_Request_code_Revenue
function syncCustomerInfo(bookingCode) {
  // Tìm trong BK_Request_code_Revenue theo CODE (cột T)
  // Copy: A→I sang Sale và Revenue
  // Mapping:
  //   A = CODE (T)
  //   B = Name (B)
  //   C = Contact (C)
  //   D = WhatsApp (D)
  //   E = Pax (E)
  //   F = Start (Y)
  //   G = End (Z)
  //   H = Country (F)
  //   I = Saler (A)
}
```

---

## 7. DATA FLOW & BUSINESS LOGIC

### 7.1 Cross-File Data Synchronization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CROSS-FILE DATA SYNCHRONIZATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FILE REQUEST                                                                │
│  ┌───────────────┐                                                          │
│  │ Sheet Request │                                                          │
│  │   Booking     │                                                          │
│  │   Code (T)    │────────────────────────────────────────┐                 │
│  └───────────────┘                                        │                 │
│         │                                                  │                 │
│         │ ImportRange hoặc Copy                            │                 │
│         ▼                                                  ▼                 │
│  ┌─────────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │     FILE OPERATOR                   │   │     FILE REVENUE            │  │
│  │ ┌─────────────────────────────────┐ │   │ ┌─────────────────────────┐ │  │
│  │ │  BK_Request_code                │ │   │ │ BK_Request_code_Revenue │ │  │
│  │ │  • Booking Code (T)             │ │   │ │ • Booking Code (T)      │ │  │
│  │ │  • Customer Info                │ │   │ │ • Customer Info         │ │  │
│  │ └───────────────┬─────────────────┘ │   │ └───────────┬─────────────┘ │  │
│  │                 │                   │   │             │               │  │
│  │                 │ Lookup            │   │             │ Lookup        │  │
│  │                 ▼                   │   │             ▼               │  │
│  │ ┌─────────────────────────────────┐ │   │ ┌─────────────────────────┐ │  │
│  │ │     Operator                    │ │   │ │      Revenue            │ │  │
│  │ │  • Booking Code (A)             │ │   │ │ • Booking Code (A)      │ │  │
│  │ │  • Service ID (AN)              │ │   │ │ • Revenue ID (AN)       │ │  │
│  │ │  • Chi phí, Thanh toán          │ │   │ │ • Số tiền thu           │ │  │
│  │ └─────────────────────────────────┘ │   │ └───────────┬─────────────┘ │  │
│  │                                     │   │             │               │  │
│  │                                     │   │             │ Aggregate     │  │
│  │                                     │   │             ▼               │  │
│  │                                     │   │ ┌─────────────────────────┐ │  │
│  │                                     │   │ │        Sale             │ │  │
│  │                                     │   │ │ • Booking Code (A)      │ │  │
│  │                                     │   │ │ • Tổng Revenue (K)      │ │  │
│  │                                     │   │ └─────────────────────────┘ │  │
│  └─────────────────────────────────────┘   └─────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Key Relationship Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KEY RELATIONSHIP RULES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  RULE 1: Request ID (RQID) - Internal Link                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Unique per request row                                                │
│  • Links: Seller Sheet ↔ Request Master                                  │
│  • Format: {SalerName}{timestamp}                                        │
│  • Scope: Within Request file only                                       │
│                                                                          │
│  RULE 2: Booking Code - Cross-File Link                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Unique per booking                                                    │
│  • Links: Request ↔ Operator ↔ Revenue                                   │
│  • Format: {yyyyMMdd}{3-char}                                            │
│  • Generated when: Status = "Booking"                                    │
│  • Scope: Across all 3 files                                             │
│                                                                          │
│  RULE 3: Service ID - Operator Internal                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Unique per service row                                                │
│  • Links: Operator ↔ Operator_Store ↔ Operator_Mix                       │
│  • Format: {BookingCode}-{timestamp}                                     │
│  • Scope: Within Operator file only                                      │
│                                                                          │
│  RULE 4: Revenue ID - Revenue Internal                                   │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Unique per revenue row                                                │
│  • Links: Revenue records                                                │
│  • Format: {BookingCode}-{timestamp}-{row}                               │
│  • Scope: Within Revenue file only                                       │
│                                                                          │
│  CARDINALITY:                                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  • 1 Request : 1 Booking Code                                            │
│  • 1 Booking Code : N Services (Operator)                                │
│  • 1 Booking Code : N Revenue records                                    │
│  • 1 Booking Code : 1 Sale summary                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. TRIGGER EVENTS & AUTOMATION

### 8.1 OnEdit Triggers Summary

| File | Event | Trigger Actions |
|------|-------|-----------------|
| **Request** | Sửa cột B (Name) | Sinh RQID, Sync Request |
| **Request** | Sửa cột H (Status) | Nếu "Booking" → Sinh CODE, Ghi V |
| **Request** | Sửa cột J, K (Days, Start) | Tính Z (End), Sync |
| **Request** | Sửa cột L, M (DT, CP) | Chuẩn hóa số, Sync |
| **Operator** | Sửa cột A (Code) | Validate vs BK_Request_code |
| **Operator** | Sửa cột J, K (SVC) | Sinh Service ID nếu chưa có |
| **Operator** | Sửa cột V (Pay Amt) | Tính W (Debt) |

### 8.2 Scheduled Functions

| File | Function | Trigger | Mô tả |
|------|----------|---------|-------|
| **Request** | `SynNrow` | Manual/Daily | Sync 100 rows gần nhất |
| **Request** | `generateCustomerCodes` | Manual | Sinh Booking Code |
| **Request** | `dailyFixMissingBookingTimeFromLastEdit` | Daily | Fix missing V |
| **Operator** | `TongHopOperator` | Manual | Tổng hợp & Archive |
| **Operator** | `createReport` | Manual | Tạo báo cáo thanh toán |
| **Revenue** | `BookingCalculate` | Manual | Tổng hợp vào Sale |
| **Revenue** | `AutoSynCustomerInfo` | Manual | Đồng bộ customer info |

### 8.3 Automation Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTOMATION TRIGGER FLOWCHART                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER ACTION                    │              SYSTEM RESPONSE               │
│  ─────────────────────────────  │  ─────────────────────────────────────────│
│                                 │                                            │
│  [Seller nhập Name]             │  → generateSingleRQID_()                   │
│                                 │  → autoFillRow_() - fill A, I              │
│                                 │                                            │
│  [Seller chọn Status="Booking"] │  → setBookingTime(now)                     │
│                                 │  → highlightMissing_()                     │
│                                 │  → safeSyncRequest_()                      │
│                                 │  → maybeGenerateCodes_()                   │
│                                 │  → recalcEndOnRequest_()                   │
│                                 │                                            │
│  [Seller sửa các cột data]      │  → updateWarning_()                        │
│                                 │  → checkAndWarn_()                         │
│                                 │  → safeSyncRequest_()                      │
│                                 │                                            │
│  [Điều hành nhập Booking Code]  │  → Validate vs BK_Request_code             │
│                                 │  → markRowRed() if invalid                 │
│                                 │  → Auto-fill customer info                 │
│                                 │                                            │
│  [Điều hành nhập Service]       │  → generateServiceID()                     │
│                                 │  → Calculate Z (month), AA (year)          │
│                                 │                                            │
│  [Kế toán nhập Payment]         │  → Calculate W (debt) = Q - V              │
│                                 │                                            │
│  [Kế toán nhập Revenue]         │  → generateRevenueID()                     │
│                                 │  → BookingCalculate() → Update Sale        │
│                                 │                                            │
│  [Admin chạy TongHopOperator]   │  → Group by Booking Code                   │
│                                 │  → Archive completed to Store              │
│                                 │  → Remove duplicates                       │
│                                 │  → Draw borders                            │
│                                 │                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. PERMISSION & SECURITY

### 9.1 User Roles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER ROLES & ACCESS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ADMIN (Full Access)                                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│  Emails:                                                                 │
│  • nguyenducminh85bk@gmail.com                                          │
│  • booking@myvivatour.com                                                │
│  • info@myvivatour.com                                                   │
│  • davidtranbk@gmail.com                                                 │
│  • lynguyen071190@gmail.com                                              │
│  Access: Tất cả sheets, tất cả actions                                  │
│                                                                          │
│  SELLER (Limited Access)                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  Config: Sheet Config_user (email → sheet name)                          │
│  Access:                                                                 │
│  • CHỈ sheet của mình (Bảo, Lan, Nhi...)                                │
│  • KHÔNG được sửa trực tiếp sheet Request                               │
│  • KHÔNG được sửa sheet của seller khác                                 │
│                                                                          │
│  ACCOUNTANT (Operator + Revenue)                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Emails:                                                                 │
│  • accountant@myvivatour.com                                             │
│  Access:                                                                 │
│  • Sheet Operator: thanh toán (U, V, Y)                                  │
│  • Sheet Revenue: nhập doanh thu                                         │
│  • Sheet Report: xem báo cáo                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Lock Mechanism

```javascript
// Operator Lock Logic (cột AB, AC, AD)
const LOCK_COLS = {
  TICK_KT: 28,      // AB - Lock Kế toán
  TICK_ADMIN: 29,   // AC - Lock Admin
  TICK_FINAL: 30    // AD - Lock Final
};

function isRowLocked(row) {
  const tickKT = row[LOCK_COLS.TICK_KT - 1];
  return tickKT === true || tickKT === 'TRUE';
}

function canEditLockedRow(userInfo, row) {
  if (isRowLocked(row) && !userInfo.isAdmin) {
    return { error: 'Dòng đã bị khóa bởi Kế toán' };
  }
  return { success: true };
}
```

### 9.3 Permission Check Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PERMISSION CHECK FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Edit Event                                                         │
│        │                                                                 │
│        ▼                                                                 │
│  ┌─────────────────────┐                                                │
│  │ Get User Email      │                                                │
│  └─────────┬───────────┘                                                │
│            │                                                             │
│            ▼                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐                   │
│  │ Is Admin Email?     │──Y─►│ ALLOW - Full Access │                   │
│  └─────────┬───────────┘     └─────────────────────┘                   │
│            │ N                                                           │
│            ▼                                                             │
│  ┌─────────────────────┐                                                │
│  │ Is Request Sheet?   │──Y──┐                                          │
│  └─────────┬───────────┘     │                                          │
│            │ N               ▼                                          │
│            │      ┌─────────────────────┐                               │
│            │      │ DENY - Sửa Request  │                               │
│            │      └─────────────────────┘                               │
│            ▼                                                             │
│  ┌─────────────────────┐                                                │
│  │ Is Seller Sheet?    │                                                │
│  └─────────┬───────────┘                                                │
│            │ Y                                                           │
│            ▼                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐                   │
│  │ User owns this      │──Y─►│ ALLOW - Edit Own    │                   │
│  │ Seller Sheet?       │     └─────────────────────┘                   │
│  └─────────┬───────────┘                                                │
│            │ N                                                           │
│            ▼                                                             │
│  ┌─────────────────────┐                                                │
│  │ DENY - Edit Others  │                                                │
│  └─────────────────────┘                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. WEBAPP INTEGRATION ENDPOINTS

### 10.1 Suggested API Endpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBAPP INTEGRATION ENDPOINTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REQUEST MODULE                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  GET  /api/requests                    - List requests (filtered by seller) │
│  GET  /api/requests/:rqid              - Get request by RQID                │
│  POST /api/requests                    - Create new request                 │
│  PUT  /api/requests/:rqid              - Update request                     │
│  POST /api/requests/:rqid/book         - Convert to Booking                 │
│                                                                              │
│  OPERATOR MODULE                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  GET  /api/bookings                    - List bookings from BK_Request_code │
│  GET  /api/bookings/:code              - Get booking info                   │
│  GET  /api/services                    - List services (filtered)           │
│  GET  /api/services/:serviceId         - Get service by Service ID          │
│  POST /api/services                    - Create new service                 │
│  PUT  /api/services/:serviceId         - Update service                     │
│  PUT  /api/services/:serviceId/pay     - Record payment                     │
│  PUT  /api/services/:serviceId/lock    - Lock service row                   │
│                                                                              │
│  REVENUE MODULE                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  GET  /api/revenue                     - List revenue records               │
│  GET  /api/revenue/:revenueId          - Get revenue by Revenue ID          │
│  POST /api/revenue                     - Record new revenue                 │
│  GET  /api/sales                       - List sales summary                 │
│  GET  /api/sales/:code                 - Get sale by Booking Code           │
│                                                                              │
│  REPORT MODULE                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  GET  /api/reports/due-payments        - Services due for payment           │
│  GET  /api/reports/profit/:month       - Profit report by month             │
│  GET  /api/reports/booking-summary     - Booking summary                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Data Transfer Objects (DTO)

```typescript
// Request DTO
interface RequestDTO {
  rqid: string;              // AR - Request ID
  code?: string;             // T - Booking Code (if booked)
  seller: string;            // A
  name: string;              // B
  contact: string;           // C
  whatsapp?: string;         // D
  pax: number;               // E
  country: string;           // F
  source: string;            // G
  status: 'F2' | 'F3' | 'Khách Hoãn' | 'Booking' | 'Đã kết thúc';  // H
  receivedDate: Date;        // I
  days: number;              // J
  startDate: Date;           // K
  revenuePlan?: number;      // L
  costPlan?: number;         // M
  note?: string;             // N
  bookingTime?: Date;        // V
}

// Service DTO
interface ServiceDTO {
  serviceId: string;         // AN - Service ID
  code: string;              // A - Booking Code
  name: string;              // B
  contact: string;           // C
  pax: number;               // E
  startDate: Date;           // F
  endDate: Date;             // G
  country: string;           // H
  seller: string;            // I
  serviceDate: Date;         // J
  serviceType: string;       // K
  costBeforeTax?: number;    // O
  vat?: number;              // P
  costPlan: number;          // Q
  payDue: Date;              // R
  payAccount?: string;       // S
  note?: string;             // T
  payDate?: Date;            // U
  payAmount?: number;        // V
  debt?: number;             // W (calculated)
  proofLink?: string;        // Y
  lockKT?: boolean;          // AB
  lockAdmin?: boolean;       // AC
  lockFinal?: boolean;       // AD
}

// Revenue DTO
interface RevenueDTO {
  revenueId: string;         // AN - Revenue ID
  code: string;              // A - Booking Code
  name: string;              // B
  contact: string;           // C
  pax: number;               // E
  startDate: Date;           // F
  endDate: Date;             // G
  country: string;           // H
  seller: string;            // I
  amount: number;            // K
}

// Sale Summary DTO
interface SaleDTO {
  code: string;              // A - Booking Code
  name: string;              // B
  contact: string;           // C
  pax: number;               // E
  startDate: Date;           // F
  endDate: Date;             // G
  country: string;           // H
  seller: string;            // I
  totalRevenue: number;      // K
  totalCostPlan: number;     // R
  profit: number;            // Calculated
}
```

### 10.3 WebApp Form Fields Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEBAPP FORM FIELDS MAPPING                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  REQUEST FORM                                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  | Field Label      | Column | Type        | Required | Validation     │
│  |------------------|--------|-------------|----------|----------------|│
│  | Tên khách        | B      | text        | ✓        | min 2 chars    │
│  | Email/Contact    | C      | email       | ✓        | email format   │
│  | WhatsApp         | D      | tel         |          | phone format   │
│  | Số người         | E      | number      | ✓        | min 1          │
│  | Quốc gia         | F      | select      | ✓        | dropdown       │
│  | Nguồn            | G      | select      | ✓        | dropdown       │
│  | Trạng thái       | H      | select      | ✓        | status list    │
│  | Số ngày tour     | J      | number      |          | min 1          │
│  | Ngày đi          | K      | date        | ✓        | future date    │
│  | DT dự kiến       | L      | currency    |          | >= 0           │
│  | Chi phí DK       | M      | currency    |          | >= 0           │
│  | Ghi chú          | N      | textarea    |          |                │
│                                                                          │
│  SERVICE FORM (Operator)                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  | Field Label      | Column | Type        | Required | Validation     │
│  |------------------|--------|-------------|----------|----------------|│
│  | Mã Booking       | A      | select      | ✓        | from BK_Req    │
│  | Ngày dùng DV     | J      | date        | ✓        |                │
│  | Loại dịch vụ     | K      | select      | ✓        | from Guide!O   │
│  | Chi phí trước thuế| O     | currency    |          | >= 0           │
│  | Thuế VAT         | P      | currency    |          | >= 0           │
│  | Chi phí dự kiến  | Q      | currency    | ✓        | >= 0           │
│  | Hạn thanh toán   | R      | date        | ✓        |                │
│  | TK thanh toán    | S      | text        |          |                │
│  | Ghi chú          | T      | textarea    |          |                │
│                                                                          │
│  PAYMENT FORM (Operator)                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  | Field Label      | Column | Type        | Required | Validation     │
│  |------------------|--------|-------------|----------|----------------|│
│  | Ngày thanh toán  | U      | date        | ✓        |                │
│  | Số tiền đã TT    | V      | currency    | ✓        | <= Q           │
│  | Link chứng từ    | Y      | url         |          | valid URL      │
│                                                                          │
│  REVENUE FORM                                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  | Field Label      | Column | Type        | Required | Validation     │
│  |------------------|--------|-------------|----------|----------------|│
│  | Mã Booking       | A      | select      | ✓        | from BK_Req    │
│  | Số tiền thu      | K      | currency    | ✓        | > 0            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. AUTOMATION CHECKLIST

### 11.1 Daily Automation Tasks

| Task | File | Function | Time | Priority |
|------|------|----------|------|----------|
| Sync Request 100 rows | Request | `SynNrow` | 06:00 | High |
| Fix missing Booking Time | Request | `dailyFixMissingBookingTimeFromLastEdit` | 07:00 | Medium |
| Backup all files | All | `backupSheet` | 23:00 | High |

### 11.2 Weekly Automation Tasks

| Task | File | Function | Day | Priority |
|------|------|----------|-----|----------|
| Generate missing RQID | Request | `fillMissingRequestRQIDs_safe` | Monday | Medium |
| Sync missing requests | Request | `syncMissingRequestsByRQID` | Monday | Medium |
| Tổng hợp Operator | Operator | `TongHopOperator` | Friday | High |
| Booking Calculate | Revenue | `BookingCalculate` | Friday | High |
| Sync Customer Info | Revenue | `AutoSynCustomerInfo` | Friday | Medium |

### 11.3 Event-Driven Automation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN AUTOMATION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TRIGGER: Status changed to "Booking"                                    │
│  ─────────────────────────────────────────────────────────────────────  │
│  Actions:                                                                │
│  1. Generate Booking Code (T)                                            │
│  2. Set Booking Time (V) = now                                           │
│  3. Calculate End Date (Z) = K + J - 1                                   │
│  4. Sync to Request Master                                               │
│  5. Notify Điều hành (optional - Telegram/Email)                         │
│                                                                          │
│  TRIGGER: Payment Due Date reached (R <= today)                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  Actions:                                                                │
│  1. Generate Report of due payments                                      │
│  2. Highlight in Report sheet                                            │
│  3. Send reminder notification                                           │
│                                                                          │
│  TRIGGER: Payment completed (V > 0)                                      │
│  ─────────────────────────────────────────────────────────────────────  │
│  Actions:                                                                │
│  1. Calculate Debt (W) = Q - V                                           │
│  2. If W = 0 → Mark as fully paid                                        │
│  3. Update Report status                                                 │
│                                                                          │
│  TRIGGER: Revenue recorded                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  Actions:                                                                │
│  1. Generate Revenue ID (AN)                                             │
│  2. Auto-fill customer info from BK_Request_code_Revenue                 │
│  3. Update Sale summary                                                  │
│  4. Refresh Show report                                                  │
│                                                                          │
│  TRIGGER: Service completed (G <= cutoff && Q == V)                      │
│  ─────────────────────────────────────────────────────────────────────  │
│  Actions:                                                                │
│  1. Archive to Operator_Store                                            │
│  2. Remove from Operator (via TongHopOperator)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.4 n8n Workflow Integration Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   n8n WORKFLOW INTEGRATION POINTS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. REQUEST NOTIFICATION WORKFLOW                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  Trigger: New request created (RQID generated)                           │
│  Actions:                                                                │
│  • Send Telegram notification to Seller                                  │
│  • Log to Google Analytics                                               │
│  • Create task in Asana (optional)                                       │
│                                                                          │
│  2. BOOKING CONFIRMATION WORKFLOW                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  Trigger: Status changed to "Booking"                                    │
│  Actions:                                                                │
│  • Send confirmation email to customer                                   │
│  • Notify Điều hành team via Telegram                                    │
│  • Create calendar event                                                 │
│  • Update CRM (if any)                                                   │
│                                                                          │
│  3. PAYMENT REMINDER WORKFLOW                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  Trigger: Daily at 08:00                                                 │
│  Actions:                                                                │
│  • Query Operator for R <= today + 3 days                                │
│  • Send reminder to Kế toán via Telegram                                 │
│  • Generate payment list report                                          │
│                                                                          │
│  4. REVENUE RECORDING WORKFLOW                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  Trigger: Bank statement imported (sheet Bank)                           │
│  Actions:                                                                │
│  • Extract booking code from transaction                                 │
│  • Match with existing bookings                                          │
│  • Auto-create Revenue record                                            │
│  • Notify admin for review                                               │
│                                                                          │
│  5. WEEKLY REPORT WORKFLOW                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  Trigger: Every Friday at 17:00                                          │
│  Actions:                                                                │
│  • Run TongHopOperator                                                   │
│  • Run BookingCalculate                                                  │
│  • Generate weekly summary                                               │
│  • Send report to management                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## APPENDIX

### A. Date Formats

| Context | Format | Example |
|---------|--------|---------|
| Display | dd/MM/yyyy | 25/12/2024 |
| HTML input | yyyy-MM-dd | 2024-12-25 |
| Filter value | YYYY-M | 2024-12 |
| ID timestamp | yyyyMMddHHmmssSSS | 20241225143022123 |

### B. Number Formats

| Field | Format | Parse |
|-------|--------|-------|
| Currency (VND) | 1,500,000 | Remove commas |
| Pax | 4 | Integer |
| Percentage | 10% | Divide by 100 |

### C. Status Values

| Status | Meaning | Next Actions |
|--------|---------|--------------|
| F2 | Follow up 2 | Contact customer |
| F3 | Follow up 3 | Final follow up |
| Khách Hoãn | Customer postponed | Wait for update |
| Booking | Deal closed | Transfer to Operator |
| Đã kết thúc | Tour completed | Archive |
| Đang LL | Contacting | Continue follow up |

### D. Service Types (Guide!O)

| Type | Description |
|------|-------------|
| Khách sạn | Hotel |
| Tour | Tour package |
| Xe | Transportation |
| Vé máy bay | Flight tickets |
| Visa | Visa service |
| Guide | Tour guide |
| Ăn uống | F&B |
| Khác | Others |
