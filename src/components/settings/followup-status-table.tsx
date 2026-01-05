'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { GripVertical, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { FollowUpStatus } from '@/types';

interface FollowUpStatusTableProps {
  onEdit: (status: FollowUpStatus) => void;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

interface SortableRowProps {
  status: FollowUpStatus;
  onEdit: (status: FollowUpStatus) => void;
  onDeleteClick: (status: FollowUpStatus) => void;
}

function getDaysBadgeClass(days: number): string {
  if (days === 0) return 'bg-gray-100 text-gray-800 border-gray-200';
  if (days <= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function SortableRow({ status, onEdit, onDeleteClick }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag Handle */}
      <TableCell className="w-[40px]">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>

      {/* Status Name */}
      <TableCell className="w-[200px] font-medium">{status.status}</TableCell>

      {/* Aliases */}
      <TableCell className="w-[250px]">
        <div className="flex flex-wrap gap-1">
          {status.aliases.length === 0 ? (
            <span className="text-sm text-muted-foreground">-</span>
          ) : (
            status.aliases.map((alias, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
              >
                {alias}
              </Badge>
            ))
          )}
        </div>
      </TableCell>

      {/* Days to Follow-up */}
      <TableCell className="w-[80px]">
        <Badge variant="outline" className={getDaysBadgeClass(status.daysToFollowup)}>
          {status.daysToFollowup} ngày
        </Badge>
      </TableCell>

      {/* Active Status */}
      <TableCell className="w-[100px]">
        <Badge
          variant={status.isActive ? 'default' : 'secondary'}
          className={
            status.isActive
              ? 'bg-green-100 text-green-800 hover:bg-green-100'
              : 'bg-gray-100 text-gray-600'
          }
        >
          {status.isActive ? 'Hoạt động' : 'Ngừng'}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-[80px] text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(status)} title="Sửa">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteClick(status)}
            title="Xóa"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function FollowUpStatusTable({ onEdit, onDelete, onAdd }: FollowUpStatusTableProps) {
  const [statuses, setStatuses] = useState<FollowUpStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState<FollowUpStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/follow-up-statuses');
      const data = await res.json();

      if (data.success) {
        setStatuses(data.data);
      } else {
        toast.error(data.error || 'Lỗi tải danh sách trạng thái');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = statuses.findIndex((s) => s.id === active.id);
    const newIndex = statuses.findIndex((s) => s.id === over.id);

    // Optimistic UI update
    const reorderedStatuses = arrayMove(statuses, oldIndex, newIndex);
    setStatuses(reorderedStatuses);

    // Calculate new sortOrder values
    const updates = reorderedStatuses.map((status, index) => ({
      id: status.id,
      sortOrder: index,
    }));

    try {
      const res = await fetch('/api/config/follow-up-statuses/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });

      const data = await res.json();

      if (!data.success) {
        // Revert on error
        setStatuses(statuses);
        toast.error(data.error || 'Lỗi sắp xếp lại trạng thái');
      } else {
        toast.success('Đã cập nhật thứ tự trạng thái');
      }
    } catch {
      // Revert on error
      setStatuses(statuses);
      toast.error('Lỗi kết nối server');
    }
  };

  const handleDeleteClick = (status: FollowUpStatus) => {
    setDeletingStatus(status);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStatus) return;

    setDeleting(true);
    try {
      await onDelete(deletingStatus.id);
      toast.success('Đã xóa trạng thái thành công');
      fetchStatuses(); // Refresh list
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi xóa trạng thái';
      toast.error(message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingStatus(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trạng thái Follow-up</h3>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm trạng thái
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[200px]">Trạng thái</TableHead>
              <TableHead className="w-[250px]">Aliases</TableHead>
              <TableHead className="w-[80px]">Số ngày</TableHead>
              <TableHead className="w-[100px]">Trạng thái</TableHead>
              <TableHead className="w-[80px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : statuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có trạng thái nào
                </TableCell>
              </TableRow>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {statuses.map((status) => (
                    <SortableRow
                      key={status.id}
                      status={status}
                      onEdit={onEdit}
                      onDeleteClick={handleDeleteClick}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa trạng thái &quot;{deletingStatus?.status}&quot;? Hành động này
              không thể hoàn tác.
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
