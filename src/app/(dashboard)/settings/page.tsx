'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellerTable } from '@/components/settings';
import { Settings, Users } from 'lucide-react';

export default function SettingsPage() {
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
        </TabsList>

        <TabsContent value="sellers">
          <div className="bg-white rounded-lg border p-6">
            <SellerTable />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
