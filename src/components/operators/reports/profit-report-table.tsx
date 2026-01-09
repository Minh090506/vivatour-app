'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProfitByBooking, ProfitReportSummary } from '@/types';

interface Props {
  data: ProfitByBooking[];
  summary: ProfitReportSummary;
}

type SortField = 'profit' | 'profitMargin' | 'totalCost' | 'totalRevenue';
type SortOrder = 'asc' | 'desc';

// Sort icon component - defined outside to avoid re-creation during render
function SortIcon({ field, currentField }: { field: SortField; currentField: SortField }) {
  return (
    <ArrowUpDown
      className={`h-3 w-3 ml-1 inline ${currentField === field ? 'text-primary' : 'text-muted-foreground'}`}
    />
  );
}

export function ProfitReportTable({ data, summary }: Props) {
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Memoized sorted data for performance
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [data, sortField, sortOrder]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;

    // CSV headers
    const headers = ['Mã Booking', 'Khách hàng', 'Chi phí (VND)', 'Doanh thu (VND)', 'Lợi nhuận (VND)', 'Tỷ suất (%)'];

    // Data rows
    const rows = sortedData.map((item) => [
      item.bookingCode,
      `"${item.customerName}"`, // Wrap in quotes in case of commas
      item.totalCost,
      item.totalRevenue,
      item.profit,
      item.profitMargin.toFixed(1),
    ]);

    // Summary row
    const summaryRow = [
      'TỔNG CỘNG',
      `${summary.bookingCount} bookings`,
      summary.totalCost,
      summary.totalRevenue,
      summary.totalProfit,
      summary.avgProfitMargin.toFixed(1),
    ];

    // Build CSV content with BOM for Excel UTF-8
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-loi-nhuan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Chi tiết lợi nhuận theo Booking
        </CardTitle>
        {data.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Summary Row */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Số booking</p>
            <p className="text-lg font-semibold">{summary.bookingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tổng chi phí</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(summary.totalCost)} ₫
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatCurrency(summary.totalRevenue)} ₫
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tổng lợi nhuận</p>
            <p className={`text-lg font-semibold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalProfit)} ₫
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tỷ suất TB</p>
            <p className={`text-lg font-semibold ${summary.avgProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.avgProfitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Table */}
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Không có dữ liệu lợi nhuận trong khoảng thời gian đã chọn
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Booking</th>
                  <th className="text-left py-3 px-2 font-medium">Khách hàng</th>
                  <th className="text-right py-3 px-2 font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('totalCost')}
                    >
                      Chi phí <SortIcon field="totalCost" currentField={sortField} />
                    </Button>
                  </th>
                  <th className="text-right py-3 px-2 font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      Doanh thu <SortIcon field="totalRevenue" currentField={sortField} />
                    </Button>
                  </th>
                  <th className="text-right py-3 px-2 font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('profit')}
                    >
                      Lợi nhuận <SortIcon field="profit" currentField={sortField} />
                    </Button>
                  </th>
                  <th className="text-right py-3 px-2 font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('profitMargin')}
                    >
                      Tỷ suất <SortIcon field="profitMargin" currentField={sortField} />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr
                    key={item.bookingCode}
                    className={`border-b hover:bg-muted/30 ${
                      item.profit > 0
                        ? 'bg-green-50/50'
                        : item.profit < 0
                        ? 'bg-red-50/50'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-2 font-mono text-xs">
                      {item.bookingCode}
                    </td>
                    <td className="py-3 px-2">{item.customerName}</td>
                    <td className="py-3 px-2 text-right text-red-600">
                      {formatCurrency(item.totalCost)} ₫
                    </td>
                    <td className="py-3 px-2 text-right text-blue-600">
                      {formatCurrency(item.totalRevenue)} ₫
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          item.profit > 0 ? 'text-green-600' : item.profit < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {item.profit > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : item.profit < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {formatCurrency(item.profit)} ₫
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.profitMargin > 20
                            ? 'bg-green-100 text-green-700'
                            : item.profitMargin > 0
                            ? 'bg-green-50 text-green-600'
                            : item.profitMargin < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
