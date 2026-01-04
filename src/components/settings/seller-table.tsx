'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { SellerFormModal, type Seller } from './seller-form-modal';

interface SellerTableProps {
  refreshKey?: number;
}

export function SellerTable({ refreshKey = 0 }: SellerTableProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSeller, setDeletingSeller] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/config/sellers?${params}`);
      const data = await res.json();

      if (data.success) {
        setSellers(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } else {
        toast.error(data.error || 'Lỗi tải danh sách');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers, refreshKey]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = () => {
    setEditingSeller(null);
    setModalOpen(true);
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setModalOpen(true);
  };

  const handleDeleteClick = (seller: Seller) => {
    setDeletingSeller(seller);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSeller) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/config/sellers/${deletingSeller.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Đã xóa seller thành công');
        fetchSellers();
      } else {
        toast.error(data.error || 'Lỗi xóa seller');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingSeller(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm Seller
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Telegram ID</TableHead>
              <TableHead className="w-[150px]">Tên Seller</TableHead>
              <TableHead className="w-[150px]">Tên Sheet</TableHead>
              <TableHead className="w-[180px]">Email</TableHead>
              <TableHead className="w-[80px]">Giới tính</TableHead>
              <TableHead className="w-[60px]">Mã</TableHead>
              <TableHead className="w-[100px]">Trạng thái</TableHead>
              <TableHead className="w-[100px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Không có seller nào
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-mono text-sm">
                    {seller.telegramId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {seller.sellerName}
                  </TableCell>
                  <TableCell>{seller.sheetName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {seller.email || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        seller.gender === 'MALE'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-pink-50 text-pink-700 border-pink-200'
                      }
                    >
                      {seller.gender === 'MALE' ? 'Nam' : 'Nữ'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {seller.sellerCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={seller.isActive ? 'default' : 'secondary'}
                      className={
                        seller.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {seller.isActive ? 'Hoạt động' : 'Ngừng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(seller)}
                        title="Sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(seller)}
                        title="Xóa"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total} seller
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <SellerFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        seller={editingSeller}
        onSuccess={fetchSellers}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa seller &quot;{deletingSeller?.sellerName}&quot;?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
