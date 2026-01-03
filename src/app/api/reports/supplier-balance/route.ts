import { NextRequest, NextResponse } from 'next/server';
import { getSupplierBalanceSummary } from '@/lib/supplier-balance';

// GET /api/reports/supplier-balance - Get balance summary for all suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;

    const result = await getSupplierBalanceSummary(type);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching supplier balance report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance report' },
      { status: 500 }
    );
  }
}
