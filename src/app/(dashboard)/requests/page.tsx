'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  RequestListPanel,
  RequestDetailPanel,
  RequestFilters,
} from '@/components/requests';
import { safeFetch } from '@/lib/api/fetch-utils';
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

  // Pagination state
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const LIMIT = 50;

  // Detail state
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // List error state
  const [listError, setListError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // Permission state
  const [canViewAll, setCanViewAll] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);

  // AbortController refs for race condition prevention
  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  // Build query params for requests API
  const buildQueryParams = useCallback((offset = 0) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.stage) params.set('stage', filters.stage);
    if (filters.status) params.set('status', filters.status);
    if (filters.seller) params.set('sellerId', filters.seller);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    params.set('limit', String(LIMIT));
    params.set('offset', String(offset));
    return params;
  }, [filters]);

  // API response type for list
  interface ListResponse {
    data: Request[];
    total: number;
    hasMore: boolean;
  }

  // Fetch requests list with filters (initial load / filter change)
  const fetchRequests = useCallback(async (signal?: AbortSignal) => {
    setListLoading(true);
    setListError(null);

    const params = buildQueryParams(0);
    const { data, error } = await safeFetch<ListResponse>(`/api/requests?${params}`, { signal });

    // Ignore if aborted
    if (signal?.aborted) return;

    if (error) {
      setListError(error);
      setRequests([]);
    } else if (data) {
      setRequests(data.data || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    }

    setListLoading(false);
  }, [buildQueryParams]);

  // Load more requests (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const newOffset = requests.length;
    const params = buildQueryParams(newOffset);
    const { data, error } = await safeFetch<ListResponse>(`/api/requests?${params}`);

    if (error) {
      setLoadMoreError(error);
    } else if (data) {
      setRequests((prev) => [...prev, ...(data.data || [])]);
      setHasMore(data.hasMore || false);
    }

    setIsLoadingMore(false);
  }, [buildQueryParams, hasMore, isLoadingMore, requests.length]);

  // Fetch selected request details
  const fetchRequestDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setDetailLoading(true);
    setDetailError(null);

    const { data, error, status } = await safeFetch<RequestWithDetails>(`/api/requests/${id}`, { signal });

    // Ignore if aborted
    if (signal?.aborted) return;

    if (error) {
      // For 404, redirect to list; for others, show error
      if (status === 404) {
        setSelectedRequest(null);
        router.replace('/requests');
      } else {
        setDetailError(error);
        setSelectedRequest(null);
      }
    } else if (data) {
      setSelectedRequest(data);
    }

    setDetailLoading(false);
  }, [router]);

  // Init: check permissions and fetch sellers
  useEffect(() => {
    async function init() {
      const { data: configData } = await safeFetch<{ canViewAll: boolean }>('/api/config/user/me');
      if (configData?.canViewAll) {
        setCanViewAll(true);
        const { data: sellersData } = await safeFetch<User[]>('/api/users?role=SELLER');
        if (sellersData) setSellers(sellersData);
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
    // Cancel previous request
    listAbortRef.current?.abort();
    listAbortRef.current = new AbortController();

    fetchRequests(listAbortRef.current.signal);

    return () => {
      listAbortRef.current?.abort();
    };
  }, [fetchRequests]);

  // Fetch detail when selection changes
  useEffect(() => {
    // Cancel previous request
    detailAbortRef.current?.abort();

    if (selectedId) {
      detailAbortRef.current = new AbortController();
      fetchRequestDetail(selectedId, detailAbortRef.current.signal);
    } else {
      setSelectedRequest(null);
    }

    return () => {
      detailAbortRef.current?.abort();
    };
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
          error={listError}
          onRetry={fetchRequests}
          total={total}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          loadMoreError={loadMoreError}
          onLoadMore={loadMore}
        />
        <RequestDetailPanel
          request={selectedRequest}
          isLoading={detailLoading}
          error={detailError}
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
