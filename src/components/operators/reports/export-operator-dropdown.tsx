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
  exportOperatorCostReport,
  exportOperatorSupplierCost,
  exportOperatorMonthlyTrend,
  exportProfitReport,
  exportOperatorRevenueByService,
  exportOperatorRevenueBySupplier,
  exportCostBreakdownReport,
} from '@/lib/export/csv-generator';
import type {
  OperatorCostReport,
  ProfitReport,
  OperatorRevenueReport,
  CostBreakdownReport,
} from '@/types';

type ReportTab = 'cost' | 'profit' | 'revenue' | 'breakdown';

interface Props {
  activeTab: ReportTab;
  costReport: OperatorCostReport | null;
  profitReport: ProfitReport | null;
  revenueReport: OperatorRevenueReport | null;
  breakdownReport: CostBreakdownReport | null;
  loading?: boolean;
}

export const ExportOperatorDropdown = memo(function ExportOperatorDropdown({
  activeTab,
  costReport,
  profitReport,
  revenueReport,
  breakdownReport,
  loading,
}: Props) {
  // Cost tab exports
  const handleCostByServiceExport = useCallback(() => {
    if (!costReport?.byServiceType) return;
    const data = costReport.byServiceType.map((item) => ({
      serviceType: item.label || item.type,
      totalCost: item.total,
      count: item.count,
      avgCost: item.count > 0 ? item.total / item.count : 0,
      percentage: costReport.summary.totalCost > 0
        ? (item.total / costReport.summary.totalCost) * 100
        : 0,
    }));
    exportOperatorCostReport(data);
  }, [costReport]);

  const handleCostBySupplierExport = useCallback(() => {
    if (!costReport?.bySupplier) return;
    const data = costReport.bySupplier.map((item) => ({
      supplierName: item.supplierName,
      supplierCode: item.supplierId || undefined,
      totalCost: item.total,
      count: item.count,
      avgCost: item.count > 0 ? item.total / item.count : 0,
    }));
    exportOperatorSupplierCost(data);
  }, [costReport]);

  const handleCostByMonthExport = useCallback(() => {
    if (!costReport?.byMonth) return;
    const data = costReport.byMonth.map((item) => ({
      month: item.month,
      totalCost: item.total,
      count: item.count,
    }));
    exportOperatorMonthlyTrend(data);
  }, [costReport]);

  // Profit tab export
  const handleProfitExport = useCallback(() => {
    if (!profitReport?.bookings) return;
    const data = profitReport.bookings.map((item) => ({
      bookingCode: item.bookingCode,
      customerName: item.customerName,
      startDate: undefined, // Not in ProfitByBooking type
      pax: 0, // Not in ProfitByBooking type
      revenue: item.totalRevenue,
      cost: item.totalCost,
      profit: item.profit,
      margin: item.profitMargin,
    }));
    exportProfitReport(data);
  }, [profitReport]);

  // Revenue tab exports
  const handleRevenueByServiceExport = useCallback(() => {
    if (!revenueReport?.byServiceType) return;
    const data = revenueReport.byServiceType.map((item) => ({
      serviceType: item.label || item.type,
      totalCost: item.totalCost,
      paidAmount: item.paidAmount,
      debt: item.debt,
      count: item.count,
    }));
    exportOperatorRevenueByService(data);
  }, [revenueReport]);

  const handleRevenueBySupplierExport = useCallback(() => {
    if (!revenueReport?.bySupplier) return;
    const data = revenueReport.bySupplier.map((item) => ({
      supplierName: item.supplierName,
      supplierCode: item.supplierId || undefined,
      totalCost: item.totalCost,
      paidAmount: item.paidAmount,
      debt: item.debt,
      count: item.count,
    }));
    exportOperatorRevenueBySupplier(data);
  }, [revenueReport]);

  // Breakdown tab export
  const handleBreakdownExport = useCallback(() => {
    if (!breakdownReport?.byBooking) return;
    const data = breakdownReport.byBooking.map((item) => ({
      bookingCode: item.bookingCode,
      customerName: item.customerName,
      startDate: undefined, // Not in CostBreakdownByBooking type
      expectedCost: item.expectedCost,
      actualCost: item.actualCost,
      variance: item.variance,
      variancePercent: item.variancePercent,
    }));
    exportCostBreakdownReport(data);
  }, [breakdownReport]);

  const hasData =
    (activeTab === 'cost' && costReport) ||
    (activeTab === 'profit' && profitReport?.bookings?.length) ||
    (activeTab === 'revenue' && revenueReport) ||
    (activeTab === 'breakdown' && breakdownReport);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading || !hasData}>
          <Download className="h-4 w-4 mr-2" />
          Xuat CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {activeTab === 'cost' && (
          <>
            <DropdownMenuItem
              onClick={handleCostByServiceExport}
              disabled={!costReport?.byServiceType}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Chi phi theo loai DV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCostBySupplierExport}
              disabled={!costReport?.bySupplier}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Chi phi theo NCC
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCostByMonthExport}
              disabled={!costReport?.byMonth}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Chi phi theo thang
            </DropdownMenuItem>
          </>
        )}

        {activeTab === 'profit' && (
          <DropdownMenuItem
            onClick={handleProfitExport}
            disabled={!profitReport?.bookings?.length}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Bao cao loi nhuan
          </DropdownMenuItem>
        )}

        {activeTab === 'revenue' && (
          <>
            <DropdownMenuItem
              onClick={handleRevenueByServiceExport}
              disabled={!revenueReport?.byServiceType}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Thanh toan theo loai DV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRevenueBySupplierExport}
              disabled={!revenueReport?.bySupplier}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Thanh toan theo NCC
            </DropdownMenuItem>
          </>
        )}

        {activeTab === 'breakdown' && (
          <DropdownMenuItem
            onClick={handleBreakdownExport}
            disabled={!breakdownReport?.byBooking}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Phan tich chi phi
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
