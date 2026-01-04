'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_TYPES } from '@/config/operator-config';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Operator } from '@/types';

interface RequestServicesTableProps {
  requestId: string;
  operators: Operator[];
  onUpdate?: () => void;
}

interface EditingRow {
  id: string | null; // null = new row
  serviceDate: string;
  serviceType: string;
  serviceName: string;
  supplier: string;
  totalCost: string;
}

const emptyRow: EditingRow = {
  id: null,
  serviceDate: '',
  serviceType: '',
  serviceName: '',
  supplier: '',
  totalCost: '',
};

export function RequestServicesTable({
  requestId,
  operators,
  onUpdate,
}: RequestServicesTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (op: Operator) => {
    setEditingRow({
      id: op.id,
      serviceDate: new Date(op.serviceDate).toISOString().split('T')[0],
      serviceType: op.serviceType,
      serviceName: op.serviceName,
      supplier: op.supplier || '',
      totalCost: String(op.totalCost),
    });
  };

  const handleAddNew = () => {
    setEditingRow({ ...emptyRow });
  };

  const handleCancel = () => {
    setEditingRow(null);
  };

  const handleSave = async () => {
    if (!editingRow) return;

    setSaving(true);
    try {
      const payload = {
        requestId,
        serviceDate: new Date(editingRow.serviceDate).toISOString(),
        serviceType: editingRow.serviceType,
        serviceName: editingRow.serviceName,
        supplier: editingRow.supplier,
        costBeforeTax: parseFloat(editingRow.totalCost) || 0,
        vat: 0,
        totalCost: parseFloat(editingRow.totalCost) || 0,
      };

      const url = editingRow.id
        ? `/api/operators/${editingRow.id}`
        : '/api/operators';
      const method = editingRow.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setEditingRow(null);
        onUpdate?.();
        toast.success('Đã lưu thành công');
      } else {
        toast.error(result.error || 'Lỗi khi lưu');
      }
    } catch (err) {
      console.error('Error saving operator:', err);
      toast.error('Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận xóa dịch vụ này?')) return;

    try {
      const res = await fetch(`/api/operators/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        onUpdate?.();
        toast.success('Đã xóa dịch vụ');
      } else {
        toast.error(result.error || 'Lỗi khi xóa');
      }
    } catch (err) {
      console.error('Error deleting operator:', err);
      toast.error('Lỗi khi xóa');
    }
  };

  const handleChange = (field: keyof EditingRow, value: string) => {
    if (!editingRow) return;
    setEditingRow({ ...editingRow, [field]: value });
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Ngày</TableHead>
            <TableHead className="w-[120px]">Loại</TableHead>
            <TableHead>Tên dịch vụ</TableHead>
            <TableHead>NCC</TableHead>
            <TableHead className="w-[120px] text-right">Chi phí</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operators.map((op) =>
            editingRow?.id === op.id ? (
              <EditableRow
                key={op.id}
                row={editingRow}
                onChange={handleChange}
                onSave={handleSave}
                onCancel={handleCancel}
                saving={saving}
              />
            ) : (
              <TableRow key={op.id}>
                <TableCell>{formatDate(op.serviceDate)}</TableCell>
                <TableCell>
                  {SERVICE_TYPES[op.serviceType as keyof typeof SERVICE_TYPES]?.label || op.serviceType}
                </TableCell>
                <TableCell>{op.serviceName}</TableCell>
                <TableCell>{op.supplierRef?.name || op.supplier || '-'}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(op.totalCost)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(op)}
                      disabled={op.isLocked}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(op.id)}
                      disabled={op.isLocked}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          )}

          {/* New row */}
          {editingRow && editingRow.id === null && (
            <EditableRow
              row={editingRow}
              onChange={handleChange}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          )}

          {/* Add button row */}
          {!editingRow && (
            <TableRow>
              <TableCell colSpan={6}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  onClick={handleAddNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm dịch vụ
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {operators.length === 0 && !editingRow && (
        <p className="text-center text-muted-foreground py-4">
          Chưa có dịch vụ nào
        </p>
      )}
    </div>
  );
}

// Editable row component
function EditableRow({
  row,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  row: EditingRow;
  onChange: (field: keyof EditingRow, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <TableRow className="bg-muted/50">
      <TableCell>
        <Input
          type="date"
          value={row.serviceDate}
          onChange={(e) => onChange('serviceDate', e.target.value)}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select
          value={row.serviceType}
          onValueChange={(v) => onChange('serviceType', v)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Chọn" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SERVICE_TYPES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={row.serviceName}
          onChange={(e) => onChange('serviceName', e.target.value)}
          placeholder="Tên dịch vụ"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={row.supplier}
          onChange={(e) => onChange('supplier', e.target.value)}
          placeholder="NCC"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={row.totalCost}
          onChange={(e) => onChange('totalCost', e.target.value)}
          placeholder="0"
          className="h-8 text-right"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            disabled={saving}
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
