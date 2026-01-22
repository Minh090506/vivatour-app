'use client';

import { useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { ReportDateProvider, useReportDate } from '@/contexts/report-date-context';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ReportSectionErrorBoundary,
  OverviewTabContent,
  OperatorTabContent,
  RevenueTabContent,
  SupplierTabContent,
} from '@/components/reports/unified-dashboard';
import { BarChart3, TrendingUp, Wallet, Building2, LayoutDashboard } from 'lucide-react';

type DashboardTab = 'overview' | 'operator' | 'revenue' | 'supplier';

/**
 * Header component with date range selector.
 * Uses shared date context for consistent filtering across tabs.
 */
function DashboardHeader() {
  const { dateRange, customDates, setDateRange, setCustomDates } = useReportDate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" />
          Báo cáo Tổng hợp
        </h1>
        <p className="text-muted-foreground">Phân tích hiệu suất kinh doanh toàn diện</p>
      </div>
      <DateRangeSelector
        value={dateRange}
        onChange={setDateRange}
        customDates={customDates}
        onCustomDatesChange={setCustomDates}
      />
    </div>
  );
}

/**
 * Main dashboard content with tab navigation.
 */
function DashboardContent() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Main Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Tổng quan</span>
          </TabsTrigger>
          <TabsTrigger value="operator" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Điều hành</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Doanh thu</span>
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">NCC</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <ReportSectionErrorBoundary sectionName="Tổng quan">
            <OverviewTabContent />
          </ReportSectionErrorBoundary>
        </TabsContent>

        {/* Operator Tab */}
        <TabsContent value="operator" className="mt-6">
          <ReportSectionErrorBoundary sectionName="Điều hành">
            <OperatorTabContent />
          </ReportSectionErrorBoundary>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6">
          <ReportSectionErrorBoundary sectionName="Doanh thu">
            <RevenueTabContent />
          </ReportSectionErrorBoundary>
        </TabsContent>

        {/* Supplier Tab */}
        <TabsContent value="supplier" className="mt-6">
          <ReportSectionErrorBoundary sectionName="Nhà cung cấp">
            <SupplierTabContent />
          </ReportSectionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Unified Reports Dashboard Page.
 * Integrates Overview, Operator, Revenue, and Supplier reports
 * with shared date range filtering and tab navigation.
 */
export default function ReportsPage() {
  const { isAdmin, isAccountant, isLoading: authLoading } = usePermission();

  // Permission check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isAccountant) {
    return (
      <ErrorFallback
        title="Không có quyền truy cập"
        message="Bạn cần quyền Admin hoặc Kế toán để xem báo cáo."
      />
    );
  }

  return (
    <ReportDateProvider defaultRange="last6Months">
      <DashboardContent />
    </ReportDateProvider>
  );
}
