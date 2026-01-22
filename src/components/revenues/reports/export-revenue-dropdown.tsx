'use client';

import { memo, useCallback } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  exportRevenueByType,
  exportRevenueBySource,
  exportRevenueByCurrency,
} from '@/lib/export/csv-generator';

interface TypeData {
  type: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface SourceData {
  source: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface CurrencyData {
  currency: string;
  foreignAmount: number;
  amountVND: number;
  count: number;
  percentage: number;
}

interface RevenueReportData {
  summary: {
    totalRevenue: number;
    transactionCount: number;
    avgTransaction: number;
  };
  byType?: TypeData[];
  bySource?: SourceData[];
  byCurrency?: CurrencyData[];
}

interface Props {
  data: RevenueReportData | null;
  loading?: boolean;
}

export const ExportRevenueDropdown = memo(function ExportRevenueDropdown({
  data,
  loading,
}: Props) {
  const handleTypeExport = useCallback(() => {
    if (!data?.byType) return;
    const exportData = data.byType.map((item) => ({
      type: item.label || item.type,
      amount: item.amount,
      count: item.count,
      percentage: item.percentage,
    }));
    exportRevenueByType(exportData);
  }, [data]);

  const handleSourceExport = useCallback(() => {
    if (!data?.bySource) return;
    const exportData = data.bySource.map((item) => ({
      source: item.label || item.source,
      amount: item.amount,
      count: item.count,
      percentage: item.percentage,
    }));
    exportRevenueBySource(exportData);
  }, [data]);

  const handleCurrencyExport = useCallback(() => {
    if (!data?.byCurrency) return;
    const exportData = data.byCurrency.map((item) => ({
      currency: item.currency,
      originalAmount: item.foreignAmount,
      amountVND: item.amountVND,
      avgRate: item.foreignAmount > 0 ? item.amountVND / item.foreignAmount : 0,
      count: item.count,
    }));
    exportRevenueByCurrency(exportData);
  }, [data]);

  const hasData = data?.byType || data?.bySource || data?.byCurrency;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading || !hasData}>
          <Download className="h-4 w-4 mr-2" />
          Xuat CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleTypeExport} disabled={!data?.byType}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Theo loai thanh toan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSourceExport} disabled={!data?.bySource}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Theo nguon
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCurrencyExport} disabled={!data?.byCurrency}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Theo tien te
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
