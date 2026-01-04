'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  RequestTable,
  RequestFilters,
} from '@/components/requests';
import type { Request, RequestFilters as Filters } from '@/types';

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stage: '',
    status: '',
    seller: '',
    fromDate: '',
    toDate: '',
  });
  const [canViewAll, setCanViewAll] = useState(false);
  const [sellers, setSellers] = useState([]);

  // Fetch requests with filters
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.status) params.set('status', filters.status);
      if (filters.seller) params.set('sellerId', filters.seller);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Check permissions and fetch sellers
  useEffect(() => {
    async function init() {
      // Check if user can view all
      const configRes = await fetch('/api/config/user/me');
      const configData = await configRes.json();
      if (configData.success && configData.data?.canViewAll) {
        setCanViewAll(true);
        // Fetch sellers list for filter
        const sellersRes = await fetch('/api/users?role=SELLER');
        const sellersData = await sellersRes.json();
        if (sellersData.success) setSellers(sellersData.data);
      }
    }
    init();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Yêu cầu</h1>
          <p className="text-muted-foreground">Quản lý yêu cầu khách hàng</p>
        </div>
        <Button onClick={() => router.push('/requests/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm yêu cầu
        </Button>
      </div>

      {/* Filters */}
      <RequestFilters
        filters={filters}
        onChange={setFilters}
        sellers={sellers}
        showSellerFilter={canViewAll}
      />

      {/* Table */}
      <RequestTable
        requests={requests}
        isLoading={loading}
        onRowClick={(req) => router.push(`/requests/${req.id}`)}
      />
    </div>
  );
}
