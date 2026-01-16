import { prisma } from './db';
import type { SupplierBalance } from '@/types';

/**
 * Calculate balance for a single supplier
 * Balance = deposits + refunds + adjustments - fees - operator costs
 */
export async function calculateSupplierBalance(supplierId: string): Promise<SupplierBalance> {
  // Get transaction totals by type
  const transactionSums = await prisma.supplierTransaction.groupBy({
    by: ['type'],
    where: { supplierId },
    _sum: { amount: true },
  });

  // Get total operator costs linked to this supplier
  const costSum = await prisma.operator.aggregate({
    where: { supplierId },
    _sum: { totalCost: true },
  });

  // Extract amounts by type
  const deposits = Number(transactionSums.find(t => t.type === 'DEPOSIT')?._sum.amount ?? 0);
  const refunds = Number(transactionSums.find(t => t.type === 'REFUND')?._sum.amount ?? 0);
  const adjustments = Number(transactionSums.find(t => t.type === 'ADJUSTMENT')?._sum.amount ?? 0);
  const fees = Number(transactionSums.find(t => t.type === 'FEE')?._sum.amount ?? 0);
  const costs = Number(costSum._sum.totalCost ?? 0);

  // Calculate balance: deposits + refunds + adjustments - fees - costs
  const balance = deposits + refunds + adjustments - fees - costs;

  return {
    deposits,
    refunds,
    adjustments,
    fees,
    costs,
    balance,
  };
}

/**
 * Get balance summary for all suppliers with optional type filter
 */
export async function getSupplierBalanceSummary(typeFilter?: string) {
  // Get all active suppliers
  const whereClause: Record<string, unknown> = { isActive: true };
  if (typeFilter) {
    whereClause.type = typeFilter;
  }

  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      paymentModel: true,
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Calculate balance for each supplier
  const results = await Promise.all(
    suppliers.map(async (supplier) => {
      const balance = await calculateSupplierBalance(supplier.id);
      return {
        ...supplier,
        deposits: balance.deposits,
        costs: balance.costs,
        refunds: balance.refunds,
        balance: balance.balance,
      };
    })
  );

  // Calculate summary totals
  const summary = {
    supplierCount: results.length,
    totalDeposits: results.reduce((sum, s) => sum + s.deposits, 0),
    totalCosts: results.reduce((sum, s) => sum + s.costs, 0),
    totalRefunds: results.reduce((sum, s) => sum + s.refunds, 0),
    totalBalance: results.reduce((sum, s) => sum + s.balance, 0),
    positiveBalance: results.filter(s => s.balance > 0).length,
    negativeBalance: results.filter(s => s.balance < 0).length,
  };

  // Payment model distribution
  const paymentModelMap = new Map<string, { count: number; totalBalance: number }>();
  for (const s of results) {
    const model = s.paymentModel || 'PREPAID';
    const entry = paymentModelMap.get(model) || { count: 0, totalBalance: 0 };
    entry.count += 1;
    entry.totalBalance += s.balance;
    paymentModelMap.set(model, entry);
  }
  const byPaymentModel = Array.from(paymentModelMap.entries()).map(([model, data]) => ({
    model,
    count: data.count,
    totalBalance: data.totalBalance,
  }));

  return { data: results, summary, byPaymentModel };
}

/**
 * Get balance trend by month (last 6 months)
 */
export async function getBalanceTrend() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Get transactions grouped by month
  const transactions = await prisma.supplierTransaction.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      type: true,
      amount: true,
      createdAt: true,
    },
  });

  // Get operator costs grouped by month
  const operators = await prisma.operator.findMany({
    where: {
      serviceDate: { gte: sixMonthsAgo },
      supplierId: { not: null },
    },
    select: {
      totalCost: true,
      serviceDate: true,
    },
  });

  // Group by month
  const monthMap = new Map<string, { deposits: number; costs: number }>();

  // Initialize 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { deposits: 0, costs: 0 });
  }

  // Add transaction deposits
  for (const t of transactions) {
    if (t.type === 'DEPOSIT') {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.deposits += Number(t.amount);
      }
    }
  }

  // Add operator costs
  for (const op of operators) {
    const d = new Date(op.serviceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.costs += Number(op.totalCost);
    }
  }

  // Convert to array with running balance
  let runningBalance = 0;
  const trend = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => {
      runningBalance += data.deposits - data.costs;
      return {
        month,
        deposits: data.deposits,
        costs: data.costs,
        balance: runningBalance,
      };
    });

  return trend;
}
