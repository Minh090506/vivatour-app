import { SupplierForm } from '@/components/suppliers/supplier-form';
import { Building2 } from 'lucide-react';

export default function CreateSupplierPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Thêm NCC mới
        </h1>
        <p className="text-muted-foreground">Tạo nhà cung cấp mới</p>
      </div>

      <SupplierForm />
    </div>
  );
}
