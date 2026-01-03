'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import type { TransactionType } from '@/types';

interface TransactionFormProps {
  supplierId: string;
  onSuccess: () => void;
  defaultType?: TransactionType;
}

export function TransactionForm({ supplierId, onSuccess, defaultType = 'DEPOSIT' }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: defaultType,
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    proofLink: '',
    relatedBookingCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/supplier-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          ...formData,
          amount: parseInt(formData.amount),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      // Reset form and close
      setFormData({
        type: defaultType,
        amount: '',
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        proofLink: '',
        relatedBookingCode: '',
      });
      setOpen(false);
      onSuccess();
    } catch {
      setError('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'Nạp tiền';
      case 'REFUND': return 'Hoàn tiền';
      case 'ADJUSTMENT': return 'Điều chỉnh';
      case 'FEE': return 'Phí dịch vụ';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Thêm giao dịch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm giao dịch mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Loại giao dịch *</Label>
              <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSIT">{getTypeLabel('DEPOSIT')}</SelectItem>
                  <SelectItem value="REFUND">{getTypeLabel('REFUND')}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{getTypeLabel('ADJUSTMENT')}</SelectItem>
                  <SelectItem value="FEE">{getTypeLabel('FEE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Số tiền (VND) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="10000000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Ngày giao dịch *</Label>
            <Input
              id="transactionDate"
              type="date"
              value={formData.transactionDate}
              onChange={(e) => updateField('transactionDate', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Nạp tiền tháng 1/2026..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proofLink">Link chứng từ</Label>
              <Input
                id="proofLink"
                value={formData.proofLink}
                onChange={(e) => updateField('proofLink', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relatedBookingCode">Mã booking (nếu có)</Label>
              <Input
                id="relatedBookingCode"
                value={formData.relatedBookingCode}
                onChange={(e) => updateField('relatedBookingCode', e.target.value)}
                placeholder="260101-JOHN"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu giao dịch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
