'use client';

import { memo, useCallback } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCsv, type CsvColumn, formatVND, formatDate } from '@/lib/export/csv-export';
import { exportToPdf } from '@/lib/export/pdf-export';
import type {
  DashboardResponse,
  RevenueTrendResponse,
  CostBreakdownResponse,
  FunnelResponse
} from '@/lib/report-utils';

interface Props {
  dashboard: DashboardResponse | null;
  trend: RevenueTrendResponse | null;
  costBreakdown: CostBreakdownResponse | null;
  funnel: FunnelResponse | null;
  loading?: boolean;
}

type TrendRow = {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
};

type CostRow = {
  type: string;
  amount: number;
  percentage: number;
};

type FunnelRow = {
  stage: string;
  count: number;
  percentage: number;
};

export const ExportDropdown = memo(function ExportDropdown({
  dashboard,
  trend,
  costBreakdown,
  funnel,
  loading,
}: Props) {
  const handleCsvExport = useCallback(() => {
    if (!trend?.data) return;

    const columns: CsvColumn<TrendRow>[] = [
      { header: 'Thang', accessor: 'period' },
      { header: 'Doanh thu (VND)', accessor: (r) => formatVND(r.revenue) },
      { header: 'Chi phi (VND)', accessor: (r) => formatVND(r.cost) },
      { header: 'Loi nhuan (VND)', accessor: (r) => formatVND(r.profit) },
    ];

    const filename = `bao-cao-doanh-thu-${formatDate(new Date(), 'iso')}`;
    exportToCsv(trend.data, columns, filename);
  }, [trend]);

  const handleCostCsvExport = useCallback(() => {
    if (!costBreakdown?.byServiceType) return;

    const columns: CsvColumn<CostRow>[] = [
      { header: 'Loai dich vu', accessor: 'type' },
      { header: 'Chi phi (VND)', accessor: (r) => formatVND(r.amount) },
      { header: 'Ty le (%)', accessor: (r) => `${r.percentage}%` },
    ];

    const filename = `bao-cao-chi-phi-${formatDate(new Date(), 'iso')}`;
    exportToCsv(costBreakdown.byServiceType, columns, filename);
  }, [costBreakdown]);

  const handleFunnelCsvExport = useCallback(() => {
    if (!funnel?.stages) return;

    const columns: CsvColumn<FunnelRow>[] = [
      { header: 'Giai doan', accessor: 'stage' },
      { header: 'So luong', accessor: 'count' },
      { header: 'Ty le (%)', accessor: (r) => `${r.percentage}%` },
    ];

    const filename = `bao-cao-pheu-chuyen-doi-${formatDate(new Date(), 'iso')}`;
    exportToCsv(funnel.stages, columns, filename);
  }, [funnel]);

  const handlePdfExport = useCallback(() => {
    const dateLabel = dashboard?.dateRange?.label || '';
    exportToPdf({
      title: 'Bao cao Tong quan',
      subtitle: 'Phan tich hieu suat kinh doanh',
      dateRange: dateLabel,
      orientation: 'landscape',
    });
  }, [dashboard]);

  const hasData = trend?.data || costBreakdown?.byServiceType || funnel?.stages;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading || !hasData} data-no-print>
          <Download className="h-4 w-4 mr-2" />
          Xuat
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsvExport} disabled={!trend?.data}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuat CSV - Doanh thu
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCostCsvExport} disabled={!costBreakdown?.byServiceType}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuat CSV - Chi phi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFunnelCsvExport} disabled={!funnel?.stages}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuat CSV - Pheu chuyen doi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdfExport}>
          <Printer className="h-4 w-4 mr-2" />
          In / Xuat PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
