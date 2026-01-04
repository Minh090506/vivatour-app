---
phase: 3
title: "UI Components"
status: pending
effort: 1.5d
---

# Phase 3: UI Components

## Context

- **Parent Plan:** [plan.md](plan.md)
- **Dependencies:** Phase 2 (API Routes)
- **Patterns:** [operator-patterns-report](research/operator-patterns-report.md)

---

## Overview

Create reusable Request UI components following Operator module patterns: form, table, filters, status badge.

---

## Requirements

### 3.1 Create request-status-badge.tsx

Display color-coded status with stage indicator.

```typescript
interface RequestStatusBadgeProps {
  status: RequestStatus;
  showStage?: boolean;
}

export function RequestStatusBadge({ status, showStage = false }: RequestStatusBadgeProps) {
  const config = REQUEST_STATUSES[status];
  const stageConfig = REQUEST_STAGES[config.stage as RequestStage];

  return (
    <div className="flex items-center gap-1">
      {showStage && (
        <span className={`text-xs text-${stageConfig.color}-600`}>
          {stageConfig.label}:
        </span>
      )}
      <Badge variant="outline" className={`bg-${config.color}-100 text-${config.color}-700`}>
        {config.label}
      </Badge>
    </div>
  );
}
```

### 3.2 Create request-filters.tsx

Filter controls for stage, status, seller, date range.

```typescript
interface RequestFiltersProps {
  filters: RequestFilters;
  onChange: (filters: RequestFilters) => void;
  sellers?: User[];
  showSellerFilter?: boolean;
}

export function RequestFilters({ filters, onChange, sellers, showSellerFilter }: RequestFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Stage select */}
      <Select value={filters.stage} onValueChange={(v) => onChange({ ...filters, stage: v })}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Giai đoạn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Tất cả</SelectItem>
          {REQUEST_STAGE_KEYS.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {REQUEST_STAGES[stage].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status select - grouped by stage */}
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Tất cả</SelectItem>
          {REQUEST_STAGE_KEYS.map((stage) => (
            <SelectGroup key={stage}>
              <SelectLabel>{REQUEST_STAGES[stage].label}</SelectLabel>
              {getStatusesByStage(stage).map((status) => (
                <SelectItem key={status} value={status}>
                  {REQUEST_STATUSES[status].label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Seller select (if permitted) */}
      {showSellerFilter && sellers && (
        <Select value={filters.sellerId} onValueChange={(v) => onChange({ ...filters, sellerId: v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Seller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Search input */}
      <Input
        placeholder="Tìm theo tên, mã..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-[200px]"
      />

      {/* Date range */}
      <div className="flex gap-2 items-center">
        <Input
          type="date"
          value={filters.fromDate}
          onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
          className="w-[140px]"
        />
        <span>-</span>
        <Input
          type="date"
          value={filters.toDate}
          onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
          className="w-[140px]"
        />
      </div>
    </div>
  );
}
```

### 3.3 Create request-table.tsx

Data table with sortable columns.

```typescript
interface RequestTableProps {
  requests: Request[];
  onRowClick?: (request: Request) => void;
  isLoading?: boolean;
}

export function RequestTable({ requests, onRowClick, isLoading }: RequestTableProps) {
  if (isLoading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RQID</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Pax</TableHead>
          <TableHead>Quốc gia</TableHead>
          <TableHead>Nguồn</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Follow-up</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Ngày nhận</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Không có yêu cầu nào
            </TableCell>
          </TableRow>
        ) : (
          requests.map((req) => (
            <TableRow
              key={req.id}
              onClick={() => onRowClick?.(req)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-mono">{req.rqid}</TableCell>
              <TableCell className="font-medium">{req.customerName}</TableCell>
              <TableCell>{req.pax}</TableCell>
              <TableCell>{req.country}</TableCell>
              <TableCell>{req.source}</TableCell>
              <TableCell>
                <RequestStatusBadge status={req.status as RequestStatus} />
              </TableCell>
              <TableCell>
                <FollowUpIndicator date={req.nextFollowUp} />
              </TableCell>
              <TableCell>{req.seller?.name || '-'}</TableCell>
              <TableCell>{formatDate(req.receivedDate)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// Helper component for follow-up indicator
function FollowUpIndicator({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;

  const now = new Date();
  const followUp = new Date(date);
  const diffDays = Math.ceil((followUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let color = 'green';
  let label = formatDate(date);

  if (diffDays < 0) {
    color = 'red';
    label = `Quá hạn ${Math.abs(diffDays)} ngày`;
  } else if (diffDays === 0) {
    color = 'yellow';
    label = 'Hôm nay';
  } else if (diffDays <= 3) {
    color = 'orange';
  }

  return (
    <span className={`text-${color}-600 text-sm`}>
      {label}
    </span>
  );
}
```

### 3.4 Create request-form.tsx

Form for create/edit with auto-calculations.

```typescript
interface RequestFormProps {
  initialData?: Partial<Request>;
  onSubmit: (data: RequestFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function RequestForm({ initialData, onSubmit, onCancel, isEditing }: RequestFormProps) {
  const [formData, setFormData] = useState<RequestFormData>({
    customerName: initialData?.customerName || '',
    contact: initialData?.contact || '',
    whatsapp: initialData?.whatsapp || '',
    pax: initialData?.pax?.toString() || '1',
    country: initialData?.country || '',
    source: initialData?.source || '',
    status: initialData?.status || 'DANG_LL_CHUA_TL',
    tourDays: initialData?.tourDays?.toString() || '',
    startDate: initialData?.startDate ? formatDateInput(initialData.startDate) : '',
    expectedRevenue: initialData?.expectedRevenue?.toString() || '',
    expectedCost: initialData?.expectedCost?.toString() || '',
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate endDate display
  const calculatedEndDate = useMemo(() => {
    if (formData.startDate && formData.tourDays) {
      const end = calculateEndDate(new Date(formData.startDate), parseInt(formData.tourDays));
      return formatDateInput(end);
    }
    return '';
  }, [formData.startDate, formData.tourDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.customerName || !formData.contact || !formData.country || !formData.source) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
      )}

      {/* Customer Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Tên khách *" required>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Nguyen Van A"
            />
          </FormField>
          <FormField label="Liên hệ *" required>
            <Input
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="email@example.com hoặc SĐT"
            />
          </FormField>
          <FormField label="WhatsApp">
            <Input
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="+84..."
            />
          </FormField>
          <FormField label="Số khách (Pax) *">
            <Input
              type="number"
              min="1"
              value={formData.pax}
              onChange={(e) => setFormData({ ...formData, pax: e.target.value })}
            />
          </FormField>
          <FormField label="Quốc gia *" required>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="USA, UK, France..."
            />
          </FormField>
          <FormField label="Nguồn *" required>
            <Input
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="TripAdvisor, Zalo, Email..."
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Tour Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Tour</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Số ngày">
            <Input
              type="number"
              min="1"
              value={formData.tourDays}
              onChange={(e) => setFormData({ ...formData, tourDays: e.target.value })}
            />
          </FormField>
          <FormField label="Ngày bắt đầu">
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </FormField>
          <FormField label="Ngày kết thúc (tự động)">
            <Input type="date" value={calculatedEndDate} disabled />
          </FormField>
          <FormField label="Doanh thu dự kiến">
            <Input
              type="number"
              value={formData.expectedRevenue}
              onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
              placeholder="VND"
            />
          </FormField>
          <FormField label="Chi phí dự kiến">
            <Input
              type="number"
              value={formData.expectedCost}
              onChange={(e) => setFormData({ ...formData, expectedCost: e.target.value })}
              placeholder="VND"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as RequestStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_STAGE_KEYS.map((stage) => (
                <SelectGroup key={stage}>
                  <SelectLabel>{REQUEST_STAGES[stage].label}</SelectLabel>
                  {getStatusesByStage(stage).map((status) => (
                    <SelectItem key={status} value={status}>
                      {REQUEST_STATUSES[status].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ghi chú thêm..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}
```

---

## Implementation Steps

- [ ] 3.1 Create src/components/requests/request-status-badge.tsx
- [ ] 3.2 Create src/components/requests/request-filters.tsx
- [ ] 3.3 Create src/components/requests/request-table.tsx
- [ ] 3.4 Create src/components/requests/request-form.tsx
- [ ] 3.5 Create index.ts to export all components
- [ ] 3.6 Test components in isolation

---

## Success Criteria

- [ ] Status badge shows correct colors per status
- [ ] Filters update parent state correctly
- [ ] Table renders requests with click handler
- [ ] Form validates required fields
- [ ] EndDate auto-calculates from startDate + days
- [ ] Build passes

---

## Related Files

| File | Action |
|------|--------|
| src/components/requests/request-status-badge.tsx | Create |
| src/components/requests/request-filters.tsx | Create |
| src/components/requests/request-table.tsx | Create |
| src/components/requests/request-form.tsx | Create |
| src/components/requests/index.ts | Create |
