'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  RequestListPanel,
  RequestDetailPanel,
  RequestFilters,
} from '@/components/requests';
import type { Request, RequestFilters as FiltersType, Operator, User } from '@/types';

// Extended request type with relations
interface RequestWithDetails extends Request {
  operators?: Operator[];
  seller?: User;
  _count?: { operators?: number; revenues?: number };
}

/**
 * Main requests page content with 2-panel layout.
 * Left panel: search + list, Right panel: selected request details.
 */
function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  // List state
  const [requests, setRequests] = useState<Request[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // Local search input for debouncing
  const [filters, setFilters] = useState<FiltersType>({
    search: '',
    stage: '',
    status: '',
    seller: '',
    fromDate: '',
    toDate: '',
  });

  // Detail state
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Permission state
  const [canViewAll, setCanViewAll] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);

  // Fetch requests list with filters
  const fetchRequests = useCallback(async () => {
    setListLoading(true);
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
      setListLoading(false);
    }
  }, [filters]);

  // Fetch selected request details
  const fetchRequestDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(data.data);
      } else {
        // Request not found - clear selection
        setSelectedRequest(null);
        router.replace('/requests');
      }
    } catch (err) {
      console.error('Error fetching request detail:', err);
      setSelectedRequest(null);
    } finally {
      setDetailLoading(false);
    }
  }, [router]);

  // Init: check permissions and fetch sellers
  useEffect(() => {
    async function init() {
      try {
        const configRes = await fetch('/api/config/user/me');
        const configData = await configRes.json();
        if (configData.success && configData.data?.canViewAll) {
          setCanViewAll(true);
          const sellersRes = await fetch('/api/users?role=SELLER');
          const sellersData = await sellersRes.json();
          if (sellersData.success) setSellers(sellersData.data);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      }
    }
    init();
  }, []);

  // Debounced search: update filters.search after 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch list on filter change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Fetch detail when selection changes
  useEffect(() => {
    if (selectedId) {
      fetchRequestDetail(selectedId);
    } else {
      setSelectedRequest(null);
    }
  }, [selectedId, fetchRequestDetail]);

  // Handle request selection - update URL
  const handleSelect = (id: string) => {
    router.push(`/requests?id=${id}`, { scroll: false });
  };

  // Handle search change from list panel - update local state for debouncing
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  // Handle edit button click - navigate to edit page
  const handleEditClick = () => {
    if (selectedId) {
      router.push(`/requests/${selectedId}/edit`);
    }
  };

  // Handle refresh - reload current request details
  const handleRefresh = () => {
    if (selectedId) {
      fetchRequestDetail(selectedId);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
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
      <div className="border-b">
        <RequestFilters
          filters={filters}
          onChange={setFilters}
          sellers={sellers}
          showSellerFilter={canViewAll}
        />
      </div>

      {/* 2-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        <RequestListPanel
          requests={requests}
          selectedId={selectedId}
          onSelect={handleSelect}
          isLoading={listLoading}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
        />
        <RequestDetailPanel
          request={selectedRequest}
          isLoading={detailLoading}
          onEditClick={handleEditClick}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}

/**
 * Requests page with Suspense boundary for useSearchParams
 */
export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="p-4">Đang tải...</div>}>
      <RequestsPageContent />
    </Suspense>
  );
}
