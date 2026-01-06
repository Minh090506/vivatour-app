# Phase 6 Request Module Research Report
**Date**: 2026-01-06 | **Status**: Complete | **Lines**: 149

---

## Executive Summary

Phase 6 implements Customer Request CRUD with 14-status funnel workflow across 4 stages (LEAD→QUOTE→FOLLOWUP→OUTCOME). Booking code auto-generation follows `YYYYMMDDL0001` pattern with seller-specific char. MasterDetailLayout already exists; forms use React Hook Form + Zod validation.

---

## 1. Status Workflow Patterns (14 Statuses)

**Database**: Prisma schema defines `status` as String field (default: `"DANG_LL_CHUA_TL"`), indexed for query performance.

**4 Funnel Stages**:
- `LEAD`: Initial inquiry
- `QUOTE`: Quotation sent
- `FOLLOWUP`: Awaiting response
- `OUTCOME`: Deal closed/lost

**14 Statuses** (Vietnamese funnel codes F1-F5 + outcome variants):
```
Stage: LEAD
├─ DANG_LL_CHUA_TL (F1 - đang lên lịch, chưa tìm lời)
├─ DANG_CHO_KH_TL (chờ khách hàng tìm lời)
├─ DA_LIEN_HE_KH (F2 - đã liên hệ khách hàng)

Stage: QUOTE
├─ CHO_KH_PHE_DUYET (chờ khách phê duyệt)
├─ KH_HUI_Y (F3 - khách từ chối)

Stage: FOLLOWUP
├─ CHO_DIEU_CHINH (chờ điều chỉnh giá)
├─ KH_YEU_CAU_DIEU_CHINH (khách yêu cầu điều chỉnh)
├─ DUNG (F4 - dừng)

Stage: OUTCOME
├─ BOOKING (F4.5 - chuyển sang booking, auto-generates bookingCode)
├─ DA_HUY_MANG (hủy mang)
├─ DA_CONFIRM (F5 - đã xác nhận)
├─ DA_THANH_TOAN_FULL (thanh toán full)
├─ DA_DUOC_TINH_TIEN (tính tiền)
```

**Status Change Tracking**: Fields `statusChangedAt`, `statusChangedBy` (FK to User) enable audit trail.

---

## 2. Booking Code Generation Pattern

**Format**: `YYYYMMDD` + seller code char (1) + zero-padded sequence (4 digits)

**Example**: `20260201L0005` (Feb 1, 2026, seller 'L', sequence 5)

**Trigger**: Status change to `BOOKING` with `startDate` required

**Implementation Flow** (from schema docs):

1. Lookup `ConfigUser` by seller `userId`
2. Get `sellerCode` (single char: L, N, T, etc.) or fallback to first letter of `user.name`
3. Generate date prefix: `format(startDate, "yyyyMMdd")`
4. Query existing codes: `SELECT COUNT WHERE bookingCode LIKE '20260201L%'`
5. Increment sequence: `String(nextSeq).padStart(4, '0')`
6. Return complete code: `${datePrefix}${saleCode}${seqStr}`

**Database**: Field `bookingCode` is unique indexed for lookup performance.

---

## 3. React Hook Form Best Practices for Complex Forms

**Current Pattern** (from supplier module):
- Form validation via Zod schema
- `useForm<T>` hook with resolver
- Nested field groups for logical sections
- Custom error display with validation feedback
- Sonner toast for success/error notifications

**Request Form Complexity**:
- Multi-section: Customer info, tour details, source, notes
- Conditional fields: `expectedDate` depends on `tourDays`
- Date picker integration: `startDate`, `endDate`, `nextFollowUp`
- Decimal fields: `expectedRevenue`, `expectedCost`
- Status transition logic: Validate state before allowing transitions

**Recommended Structure**:
```typescript
// Zod schema with refinements
const requestSchema = z.object({
  customerName: z.string().min(2),
  contact: z.string().email(),
  country: z.string(),
  source: z.enum(["TripAdvisor", "Zalo", "Email", "Agent"]),
  pax: z.number().int().min(1),

  // Tour details (optional until QUOTE stage)
  tourDays: z.number().int().positive().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  expectedRevenue: z.number().decimal().nonnegative().optional(),
  expectedCost: z.number().decimal().nonnegative().optional(),

  status: z.string().default("DANG_LL_CHUA_TL"),
  nextFollowUp: z.date().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => !data.tourDays || (data.startDate && data.endDate),
  { message: "Start/end dates required when tour days specified", path: ["startDate"] }
);

// Form usage
const { control, handleSubmit, watch } = useForm<Request>({
  resolver: zodResolver(requestSchema),
  defaultValues: defaultRequest,
});

// Watch status for conditional rendering
const status = watch("status");
```

---

## 4. MasterDetailLayout Usage Patterns

**Location**: `src/components/layouts/master-detail-layout.tsx`

**Current Implementation** (responsive 2-panel):

**Desktop (md+)**: Resizable panels
- Master (list): 40% default, min 25%, max 60%
- Separator: 1.5px draggable divider
- Detail (right): 60% default, min 40%
- Panel sizes persist via `localStorage` (key: `storageKey` prop)

**Mobile (<md)**: Full list + Sheet overlay
- Master (list): Full height scrollable
- Detail: Right-side sheet via `SlideInPanel` component
- Trigger: When `selectedId` is set (non-null)

**Props Interface**:
```typescript
interface MasterDetailLayoutProps {
  master: React.ReactNode;          // List component
  detail: React.ReactNode;          // Detail/form component
  selectedId?: string | null;       // Current selection
  onClose?: () => void;             // Mobile sheet close handler
  storageKey?: string;              // localStorage key (default: "master-detail-layout")
  detailTitle?: string;             // Mobile sheet header title
  detailDescription?: string;       // Mobile sheet header description
  emptyText?: string;               // Placeholder when no selection
}
```

**Request Module Integration**:
```typescript
// Parent component state
const [selectedId, setSelectedId] = useState<string | null>(null);

<MasterDetailLayout
  storageKey="requests-layout"
  selectedId={selectedId}
  onClose={() => setSelectedId(null)}
  detailTitle="Chi tiết yêu cầu"
  master={<RequestList onSelect={setSelectedId} />}
  detail={selectedId && <RequestDetail id={selectedId} onSave={() => setSelectedId(null)} />}
/>
```

**Empty State**: Displays `emptyText` when no selection (Vietnamese: "Chọn một mục để xem chi tiết")

---

## 5. Code Patterns Found in Codebase

**API Route Pattern** (from supplier routes):
```typescript
// src/app/api/requests/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const requests = await prisma.request.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return Response.json({ success: true, data: requests });
}

export async function POST(request: Request) {
  const body = await request.json();
  const created = await prisma.request.create({ data: body });
  return Response.json({ success: true, data: created }, { status: 201 });
}
```

**Booking Code Generation Utility**:
```typescript
// src/lib/booking-code.ts
export async function generateBookingCode(startDate: Date, sellerId: string) {
  const datePrefix = format(startDate, "yyyyMMdd");

  const config = await prisma.configUser.findUnique({
    where: { userId: sellerId }
  });

  const saleCode = config?.sellerCode || startDate.getFullYear().toString()[3];

  const existing = await prisma.request.findMany({
    where: { bookingCode: { startsWith: `${datePrefix}${saleCode}` } }
  });

  const nextSeq = existing.length + 1;
  return `${datePrefix}${saleCode}${String(nextSeq).padStart(4, '0')}`;
}
```

**Form Component Pattern**:
```typescript
// src/components/requests/request-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export function RequestForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="customerName" render={({ field }) => (
          <FormItem>
            <FormLabel>Tên khách hàng</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
}
```

---

## Key Findings

1. **Status Schema**: 14 Vietnamese-named statuses stored as strings, indexed for filtering; stage derived from status logic
2. **Booking Code**: Auto-generated on BOOKING status with seller-specific prefix; unique indexed field
3. **Forms**: React Hook Form + Zod with nested validation; Sonner toasts for UX
4. **Layout**: MasterDetailLayout handles mobile responsiveness; already available at `src/components/layouts/`
5. **Audit Trail**: `statusChangedAt`, `statusChangedBy` fields ready for implementation

---

## Unresolved Questions

- Should status transitions have server-side validation (e.g., prevent BOOKING→LEAD)?
- Is seller code lookup mandatory or optional fallback sufficient?
- Do we need status-specific field requirements (e.g., expectedRevenue required for QUOTE)?
