'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SellerTable,
  SellerFormModal,
  FollowUpStatusTable,
  FollowUpStatusFormModal,
} from '@/components/settings';
import { Settings, Users, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { Seller, FollowUpStatus } from '@/types';

export default function SettingsPage() {
  // Seller state
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerRefreshKey, setSellerRefreshKey] = useState(0);

  // FollowUp state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpStatus | null>(null);
  const [followUpRefreshKey, setFollowUpRefreshKey] = useState(0);

  // Delete handlers
  const handleDeleteFollowUpStatus = async (id: string): Promise<void> => {
    const res = await fetch(`/api/config/follow-up-statuses/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Lỗi xóa trạng thái');
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Cài đặt</h1>
      </div>

      <Tabs defaultValue="sellers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="sellers" className="gap-2">
            <Users className="h-4 w-4" />
            Quản lý Seller
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Quản lý Trạng thái
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <div className="bg-white rounded-lg border p-6">
            <SellerTable key={sellerRefreshKey} />
          </div>
        </TabsContent>

        <TabsContent value="followup">
          <div className="bg-white rounded-lg border p-6">
            <FollowUpStatusTable
              key={followUpRefreshKey}
              onAdd={() => {
                setEditingFollowUp(null);
                setFollowUpModalOpen(true);
              }}
              onEdit={(status) => {
                setEditingFollowUp(status);
                setFollowUpModalOpen(true);
              }}
              onDelete={handleDeleteFollowUpStatus}
            />
            <FollowUpStatusFormModal
              open={followUpModalOpen}
              onOpenChange={setFollowUpModalOpen}
              status={editingFollowUp}
              onSuccess={() => {
                setFollowUpModalOpen(false);
                setFollowUpRefreshKey((k) => k + 1);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
