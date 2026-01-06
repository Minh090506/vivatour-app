'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStats {
  sheetName: string;
  status: string;
  _count: number;
}

interface LastSync {
  sheetName: string;
  lastSync: string | null;
  lastRow: number | null;
}

interface SyncStatusData {
  configured: boolean;
  stats: SyncStats[];
  lastSyncs: LastSync[];
}

const SHEETS = [
  { name: 'Request', label: 'Requests', description: 'Sync customer requests from sheet' },
  { name: 'Operator', label: 'Operators', description: 'Sync operator costs from sheet' },
  { name: 'Revenue', label: 'Revenues', description: 'Sync revenue entries from sheet' },
] as const;

export function GoogleSheetsSync() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/sheets');
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async (sheetName: string) => {
    setSyncing(sheetName);
    try {
      const res = await fetch('/api/sync/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.synced > 0 || data.errors > 0) {
          toast.success(`Synced ${data.synced} rows${data.errors > 0 ? `, ${data.errors} errors` : ''}`);
        } else {
          toast.info('No new rows to sync');
        }
        // Refresh status
        fetchStatus();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed. Check console for details.');
    } finally {
      setSyncing(null);
    }
  };

  const getSheetStats = (sheetName: string) => {
    if (!status) return { success: 0, failed: 0, lastSync: null, lastRow: null };

    const success = status.stats.find(s => s.sheetName === sheetName && s.status === 'SUCCESS')?._count || 0;
    const failed = status.stats.find(s => s.sheetName === sheetName && s.status === 'FAILED')?._count || 0;
    const lastSyncData = status.lastSyncs.find(s => s.sheetName === sheetName);

    return {
      success,
      failed,
      lastSync: lastSyncData?.lastSync,
      lastRow: lastSyncData?.lastRow,
    };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Google Sheets Not Configured</AlertTitle>
        <AlertDescription>
          Set the following environment variables to enable Google Sheets sync:
          <ul className="mt-2 list-disc list-inside text-sm">
            <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
            <li>GOOGLE_PRIVATE_KEY</li>
            <li>GOOGLE_SHEET_ID</li>
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Google Sheets Sync</h3>
          <p className="text-sm text-muted-foreground">
            One-way sync from Google Sheets to database (append-only)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SHEETS.map((sheet) => {
          const stats = getSheetStats(sheet.name);
          const isSyncing = syncing === sheet.name;

          return (
            <Card key={sheet.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    {sheet.label}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => handleSync(sheet.name)}
                    disabled={isSyncing || syncing !== null}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>{sheet.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {stats.success} synced
                  </Badge>
                  {stats.failed > 0 && (
                    <Badge variant="outline" className="text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      {stats.failed} failed
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Last sync: {formatDate(stats.lastSync ?? null)}</p>
                  {stats.lastRow && <p>Last row: {stats.lastRow}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 text-sm space-y-1">
            <li>1. Click &quot;Sync&quot; to import new rows from Google Sheet</li>
            <li>2. Only rows after the last synced row are imported</li>
            <li>3. Existing records are updated by unique code/ID</li>
            <li>4. Sync logs track all operations for audit</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
