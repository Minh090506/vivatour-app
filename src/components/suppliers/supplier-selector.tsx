'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface SupplierSelectorProps {
  value?: string;
  onChange: (supplierId: string) => void;
  filterByType?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SupplierSelector({
  value,
  onChange,
  filterByType,
  placeholder = 'Chọn NCC',
  disabled = false,
}: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, [filterByType]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('isActive', 'true');
    if (filterByType) params.set('type', filterByType);

    const res = await fetch(`/api/suppliers?${params}`);
    const data = await res.json();
    if (data.success) {
      setSuppliers(data.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Đang tải..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {suppliers.length === 0 ? (
          <div className="py-2 px-3 text-sm text-muted-foreground">
            Không có NCC
          </div>
        ) : (
          suppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              {supplier.code} - {supplier.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
